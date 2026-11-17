import json
from datetime import datetime
from typing import List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.database import get_db
from app.models.models import User, TestAttempt, DrillAttempt, MockTest
from app.schemas.schemas import DashboardAnalyticsResponse, TopicStat, RecentActivity
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Student Analytics Dashboard"])

@router.get("/analytics", response_model=DashboardAnalyticsResponse)
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch all test attempts and drill attempts for this user
    test_attempts = db.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.id
    ).order_by(desc(TestAttempt.completed_at)).all()

    drill_attempts = db.query(DrillAttempt).filter(
        DrillAttempt.user_id == current_user.id
    ).order_by(desc(DrillAttempt.completed_at)).all()

    total_tests = len(test_attempts)
    total_drills = len(drill_attempts)

    # 2. Aggregate Questions Solved, Correct Answers, Time Spent
    total_q_solved = 0
    total_q_correct = 0
    total_time_seconds = 0

    # Topic aggregator: {topic_name: {"correct": int, "total": int, "time_seconds": int}}
    topic_map: Dict[str, Dict[str, int]] = {}

    for t in test_attempts:
        total_q_solved += t.total_questions
        total_q_correct += t.raw_score
        total_time_seconds += t.total_time_spent_seconds

        if t.topic_analysis_json:
            try:
                top_data = json.loads(t.topic_analysis_json)
                for topic, stats in top_data.items():
                    if topic not in topic_map:
                        topic_map[topic] = {"correct": 0, "total": 0, "time_seconds": 0}
                    topic_map[topic]["correct"] += stats.get("correct", 0)
                    topic_map[topic]["total"] += stats.get("total", 0)
                    topic_map[topic]["time_seconds"] += stats.get("time_seconds", 0)
            except Exception:
                pass

    for d in drill_attempts:
        total_q_solved += d.total_questions
        total_q_correct += d.correct_count
        total_time_seconds += d.total_time_spent_seconds

        topic = d.topic
        if topic not in topic_map:
            topic_map[topic] = {"correct": 0, "total": 0, "time_seconds": 0}
        topic_map[topic]["correct"] += d.correct_count
        topic_map[topic]["total"] += d.total_questions
        topic_map[topic]["time_seconds"] += d.total_time_spent_seconds

    # Overall accuracy
    overall_accuracy = round((total_q_correct / total_q_solved * 100), 1) if total_q_solved > 0 else 0.0
    avg_time_per_q = round((total_time_seconds / total_q_solved), 1) if total_q_solved > 0 else 0.0

    # Estimated current score based on recent mock tests or accuracy
    if test_attempts:
        # Average of recent test scaled scores
        current_score = int(sum(t.scaled_score for t in test_attempts[:3]) / min(3, len(test_attempts)))
    elif total_q_solved > 0:
        current_score = int(200 + round(overall_accuracy * 6))
    else:
        current_score = 450

    # Topic Mastery List
    topic_mastery: List[TopicStat] = []
    weak_areas: List[str] = []

    # Pre-populate key syllabus domains if not yet attempted
    all_standard_topics = [
        "Algebra", 
        "Advanced Math", 
        "Problem-Solving & Data Analysis", 
        "Geometry & Trigonometry",
        "Craft & Structure",
        "Information & Ideas"
    ]
    for topic in all_standard_topics:
        if topic not in topic_map:
            topic_map[topic] = {"correct": 0, "total": 0, "time_seconds": 0}

    for topic, s in topic_map.items():
        tot = s["total"]
        corr = s["correct"]
        pct = round((corr / tot * 100), 1) if tot > 0 else 0.0
        avg_t = round((s["time_seconds"] / tot), 1) if tot > 0 else 0.0
        topic_mastery.append(TopicStat(
            topic=topic,
            correct=corr,
            total=tot,
            percentage=pct,
            avg_time_seconds=avg_t
        ))

        # Flag as weak area if attempted and accuracy < 65% or if unpracticed
        if tot > 0 and pct < 65:
            weak_areas.append(f"{topic} (Accuracy: {pct}%)")
        elif tot == 0:
            weak_areas.append(f"{topic} (Needs Practice)")

    # Sort mastery by lowest accuracy first so student can see priority areas
    topic_mastery.sort(key=lambda x: x.percentage if x.total > 0 else -1)

    # Recent activity feed
    recent_activities: List[RecentActivity] = []
    for t in test_attempts[:5]:
        mock = db.query(MockTest).filter(MockTest.id == t.mock_test_id).first()
        title = mock.title if mock else "SAT Mock Test"
        mins = t.total_time_spent_seconds // 60
        secs = t.total_time_spent_seconds % 60
        acc = round((t.raw_score / t.total_questions * 100), 1) if t.total_questions > 0 else 0
        recent_activities.append(RecentActivity(
            id=t.id,
            type="mock_test",
            title=title,
            score_display=f"{t.scaled_score} / 800",
            accuracy_percentage=acc,
            time_spent_display=f"{mins}m {secs}s",
            date=t.completed_at or t.started_at
        ))

    for d in drill_attempts[:5]:
        mins = d.total_time_spent_seconds // 60
        secs = d.total_time_spent_seconds % 60
        acc = round((d.correct_count / d.total_questions * 100), 1) if d.total_questions > 0 else 0
        recent_activities.append(RecentActivity(
            id=d.id,
            type="drill",
            title=f"{d.topic} ({d.difficulty})",
            score_display=f"{d.correct_count}/{d.total_questions}",
            accuracy_percentage=acc,
            time_spent_display=f"{mins}m {secs}s",
            date=d.completed_at
        ))

    # Sort unified activity list by date
    recent_activities.sort(key=lambda x: x.date, reverse=True)

    return DashboardAnalyticsResponse(
        user_name=current_user.full_name,
        total_tests_completed=total_tests,
        total_drills_completed=total_drills,
        total_questions_solved=total_q_solved,
        overall_accuracy_percentage=overall_accuracy,
        current_estimated_score=current_score,
        target_score=1500,
        avg_time_per_question_seconds=avg_time_per_q,
        topic_mastery=topic_mastery,
        weak_areas=weak_areas[:3],  # top 3 priority areas
        recent_activities=recent_activities[:8]
    )

