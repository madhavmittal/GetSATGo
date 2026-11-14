import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.database import get_db
from app.models.models import User, TestAttempt, DrillAttempt, Question, MockTest, MockTestQuestion
from app.api.deps import require_teacher
from pydantic import BaseModel

router = APIRouter(prefix="/teacher", tags=["Teacher Management"])

class StudentSummary(BaseModel):
    id: int
    full_name: str
    email: str
    subscription_status: str
    tests_completed: int
    drills_completed: int
    avg_score: Optional[int] = None
    last_active: Optional[datetime] = None

class CohortOverview(BaseModel):
    total_students: int
    active_subscriptions: int
    total_mock_attempts: int
    cohort_avg_score: int
    students: List[StudentSummary]

class NewQuestionPayload(BaseModel):
    domain: str
    topic: str
    subtopic: Optional[str] = None
    difficulty: str  # Easy, Medium, Hard
    question_type: str  # mcq or spr
    prompt: str
    passage: Optional[str] = None
    options: Optional[List[dict]] = None
    correct_answer: str
    accepted_alternatives: Optional[List[str]] = None
    explanation: str
    tips: Optional[str] = None

@router.get("/cohort-overview", response_model=CohortOverview)
def get_cohort_overview(
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher)
):
    students = db.query(User).filter(User.role == "student").all()
    student_summaries = []

    total_attempts_count = 0
    all_scores = []

    for s in students:
        t_attempts = db.query(TestAttempt).filter(TestAttempt.user_id == s.id).all()
        d_attempts = db.query(DrillAttempt).filter(DrillAttempt.user_id == s.id).all()
        
        total_attempts_count += len(t_attempts)
        scores = [t.scaled_score for t in t_attempts]
        all_scores.extend(scores)

        avg_score = int(sum(scores) / len(scores)) if scores else None
        
        # Determine last active
        last_t = max([t.completed_at for t in t_attempts if t.completed_at], default=None)
        last_d = max([d.completed_at for d in d_attempts if d.completed_at], default=None)
        dates = [d for d in [last_t, last_d, s.created_at] if d]
        last_active = max(dates) if dates else s.created_at

        student_summaries.append(StudentSummary(
            id=s.id,
            full_name=s.full_name,
            email=s.email,
            subscription_status=s.subscription_status,
            tests_completed=len(t_attempts),
            drills_completed=len(d_attempts),
            avg_score=avg_score,
            last_active=last_active
        ))

    cohort_avg = int(sum(all_scores) / len(all_scores)) if all_scores else 520
    active_subs = sum(1 for s in students if s.subscription_status == "active")

    return CohortOverview(
        total_students=len(students),
        active_subscriptions=active_subs,
        total_mock_attempts=total_attempts_count,
        cohort_avg_score=cohort_avg,
        students=student_summaries
    )

@router.post("/questions")
def create_question(
    payload: NewQuestionPayload,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher)
):
    q = Question(
        domain=payload.domain,
        topic=payload.topic,
        subtopic=payload.subtopic,
        difficulty=payload.difficulty,
        question_type=payload.question_type,
        prompt=payload.prompt,
        passage=payload.passage,
        options_json=json.dumps(payload.options) if payload.options else None,
        correct_answer=payload.correct_answer,
        accepted_alternatives_json=json.dumps(payload.accepted_alternatives) if payload.accepted_alternatives else None,
        explanation=payload.explanation,
        tips=payload.tips
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return {"message": "Question created successfully", "question_id": q.id}

@router.get("/students/{student_id}")
def get_student_detail(
    student_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher)
):
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    test_attempts = db.query(TestAttempt).filter(TestAttempt.user_id == student_id).order_by(desc(TestAttempt.completed_at)).all()
    drill_attempts = db.query(DrillAttempt).filter(DrillAttempt.user_id == student_id).order_by(desc(DrillAttempt.completed_at)).all()

    attempts_data = []
    for t in test_attempts:
        mock = db.query(MockTest).filter(MockTest.id == t.mock_test_id).first()
        attempts_data.append({
            "id": t.id,
            "mock_test_title": mock.title if mock else "SAT Mock",
            "scaled_score": t.scaled_score,
            "raw_score": t.raw_score,
            "total_questions": t.total_questions,
            "time_spent_seconds": t.total_time_spent_seconds,
            "completed_at": t.completed_at
        })

    drills_data = []
    for d in drill_attempts:
        drills_data.append({
            "id": d.id,
            "topic": d.topic,
            "difficulty": d.difficulty,
            "correct_count": d.correct_count,
            "total_questions": d.total_questions,
            "time_spent_seconds": d.total_time_spent_seconds,
            "completed_at": d.completed_at
        })

    return {
        "student": {
            "id": student.id,
            "full_name": student.full_name,
            "email": student.email,
            "subscription_status": student.subscription_status,
            "subscription_plan": student.subscription_plan,
            "subscription_expires_at": student.subscription_expires_at,
            "created_at": student.created_at
        },
        "test_attempts": attempts_data,
        "drill_attempts": drills_data
    }

@router.post("/students/{student_id}/toggle-subscription")
def toggle_student_subscription(
    student_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher)
):
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    from datetime import timedelta
    if student.subscription_status == "active":
        student.subscription_status = "expired"
        student.subscription_expires_at = datetime.now(timezone.utc) - timedelta(days=1)
    else:
        student.subscription_status = "active"
        student.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=60)

    db.commit()
    db.refresh(student)
    return {
        "message": f"Updated subscription for {student.full_name}",
        "subscription_status": student.subscription_status
    }

