from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.database import get_db
from app.models.models import Question, DrillAttempt, DrillAttemptAnswer, User
from app.schemas.schemas import (
    QuestionTakingResponse, QuestionOption, DrillSubmission, DrillResultResponse, QuestionReviewResponse
)
from app.api.deps import require_active_subscription
from app.api.tests import check_answer_correctness

router = APIRouter(prefix="/drills", tags=["Drill Practice Mode"])

@router.get("/topics")
def get_available_drill_topics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_subscription)
):
    """
    Returns available domains and topics with question counts across difficulty levels.
    """
    topics_query = db.query(
        Question.domain,
        Question.topic,
        Question.difficulty,
        func.count(Question.id).label("count")
    ).group_by(Question.domain, Question.topic, Question.difficulty).all()

    structure = {}
    for domain, topic, diff, count in topics_query:
        if domain not in structure:
            structure[domain] = {}
        if topic not in structure[domain]:
            structure[domain][topic] = {"Easy": 0, "Medium": 0, "Hard": 0, "Total": 0}
        structure[domain][topic][diff] = count
        structure[domain][topic]["Total"] += count

    return structure

@router.get("/questions", response_model=List[QuestionTakingResponse])
def get_drill_questions(
    domain: Optional[str] = Query(None, description="e.g. Math or Reading & Writing"),
    topic: Optional[str] = Query(None, description="e.g. Algebra, Geometry & Trigonometry"),
    difficulty: Optional[str] = Query(None, description="Easy, Medium, or Hard"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_subscription)
):
    """
    Fetches drill questions sorted by difficulty for the chosen syllabus section.
    """
    query = db.query(Question)
    if domain:
        query = query.filter(Question.domain.ilike(f"%{domain}%"))
    if topic:
        query = query.filter(Question.topic.ilike(f"%{topic}%"))
    if difficulty:
        query = query.filter(Question.difficulty.ilike(f"%{difficulty}%"))

    questions = query.limit(limit).all()

    results = []
    for q in questions:
        opts = [QuestionOption(id=opt.get("id"), text=opt.get("text")) for opt in q.options] if q.options else []
        results.append(QuestionTakingResponse(
            id=q.id,
            domain=q.domain,
            topic=q.topic,
            subtopic=q.subtopic,
            difficulty=q.difficulty,
            question_type=q.question_type,
            prompt=q.prompt,
            passage=q.passage,
            options=opts,
            image_url=q.image_url,
            section_name=f"{q.domain} Drill"
        ))

    return results

@router.post("/submit", response_model=DrillResultResponse)
def submit_drill(
    drill_in: DrillSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_subscription)
):
    question_ids = [ans.question_id for ans in drill_in.answers]
    questions = db.query(Question).filter(Question.id.in_(question_ids)).all()
    q_map = {q.id: q for q in questions}

    correct_count = 0
    total_q = len(drill_in.answers)

    drill = DrillAttempt(
        user_id=current_user.id,
        domain=drill_in.domain,
        topic=drill_in.topic,
        difficulty=drill_in.difficulty,
        total_questions=total_q,
        total_time_spent_seconds=drill_in.total_time_spent_seconds,
        completed_at=datetime.now(timezone.utc)
    )
    db.add(drill)
    db.flush()

    reviews = []
    for sub in drill_in.answers:
        q = q_map.get(sub.question_id)
        if not q:
            continue

        is_corr = check_answer_correctness(q, sub.student_answer)
        if is_corr:
            correct_count += 1

        drill_answer = DrillAttemptAnswer(
            drill_id=drill.id,
            question_id=q.id,
            student_answer=sub.student_answer,
            is_correct=is_corr,
            time_spent_seconds=sub.time_spent_seconds
        )
        db.add(drill_answer)

        opts = [QuestionOption(id=opt.get("id"), text=opt.get("text")) for opt in q.options] if q.options else []
        reviews.append(QuestionReviewResponse(
            id=q.id,
            domain=q.domain,
            topic=q.topic,
            subtopic=q.subtopic,
            difficulty=q.difficulty,
            question_type=q.question_type,
            prompt=q.prompt,
            passage=q.passage,
            options=opts,
            correct_answer=q.correct_answer,
            explanation=q.explanation,
            tips=q.tips,
            image_url=q.image_url,
            student_answer=sub.student_answer,
            is_correct=is_corr,
            time_spent_seconds=sub.time_spent_seconds,
            is_flagged=sub.is_flagged
        ))

    drill.correct_count = correct_count
    db.commit()

    accuracy = round((correct_count / total_q * 100), 1) if total_q > 0 else 0

    return DrillResultResponse(
        drill_id=drill.id,
        topic=drill_in.topic,
        difficulty=drill_in.difficulty,
        total_questions=total_q,
        correct_count=correct_count,
        accuracy_percentage=accuracy,
        total_time_spent_seconds=drill_in.total_time_spent_seconds,
        questions_review=reviews
    )

