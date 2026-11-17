import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import MockTest, MockTestQuestion, Question, TestAttempt, TestAttemptAnswer, User
from app.schemas.schemas import (
    MockTestListItem, MockTestDetailResponse, QuestionTakingResponse, QuestionOption,
    TestSubmission, TestAttemptResultResponse, SectionStat, TopicStat, QuestionReviewResponse
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/tests", tags=["Mock Tests"])

def check_answer_correctness(question: Question, student_answer: Optional[str]) -> bool:
    if not student_answer or not str(student_answer).strip():
        return False
    
    clean_student = str(student_answer).strip()
    clean_correct = str(question.correct_answer).strip()

    # Exact string match (case-insensitive)
    if clean_student.upper() == clean_correct.upper():
        return True

    # Check accepted alternatives list if exists
    if question.accepted_alternatives:
        for alt in question.accepted_alternatives:
            if clean_student.upper() == str(alt).strip().upper():
                return True

    # Numeric / Float / Fraction evaluation for SPR (Student-Produced Responses)
    if question.question_type == "spr":
        try:
            # Parse student answer as Fraction or float
            def parse_num(val: str) -> float:
                val = val.strip()
                if "/" in val:
                    parts = val.split("/")
                    return float(parts[0]) / float(parts[1])
                return float(val)

            stud_val = parse_num(clean_student)
            corr_val = parse_num(clean_correct)
            if abs(stud_val - corr_val) < 1e-4:
                return True
                
            # Also check against alternatives
            for alt in question.accepted_alternatives:
                try:
                    alt_val = parse_num(str(alt))
                    if abs(stud_val - alt_val) < 1e-4:
                        return True
                except Exception:
                    continue
        except Exception:
            pass

    return False

@router.get("", response_model=List[MockTestListItem])
def list_mock_tests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tests = db.query(MockTest).filter(MockTest.is_active == True).all()
    results = []
    
    for t in tests:
        attempts = db.query(TestAttempt).filter(
            TestAttempt.mock_test_id == t.id,
            TestAttempt.user_id == current_user.id
        ).all()
        
        best_score = max([a.scaled_score for a in attempts]) if attempts else None
        
        # Count total questions
        q_count = db.query(MockTestQuestion).filter(MockTestQuestion.mock_test_id == t.id).count()

        results.append(MockTestListItem(
            id=t.id,
            title=t.title,
            description=t.description,
            time_limit_minutes=t.time_limit_minutes,
            total_questions=q_count,
            completed_attempts_count=len(attempts),
            best_score=best_score
        ))

    return results

@router.get(
    "/{test_id}",
    response_model=MockTestDetailResponse,
    dependencies=[Depends(get_current_user)],
)
def get_mock_test(
    test_id: int,
    db: Session = Depends(get_db),
):
    """
    Serves the selected mock test with sanitized questions (without exposing correct answers).
    """
    test = db.query(MockTest).filter(MockTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Mock test not found.")

    test_questions = db.query(MockTestQuestion).filter(
        MockTestQuestion.mock_test_id == test_id
    ).order_by(MockTestQuestion.order).all()

    questions_data = []
    for tq in test_questions:
        q = tq.question
        opts = [QuestionOption(id=opt.get("id"), text=opt.get("text")) for opt in q.options] if q.options else []
        questions_data.append(QuestionTakingResponse(
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
            section_name=tq.section_name,
            order=tq.order
        ))

    return MockTestDetailResponse(
        id=test.id,
        title=test.title,
        description=test.description,
        time_limit_minutes=test.time_limit_minutes,
        total_questions=len(questions_data),
        questions=questions_data
    )

@router.post("/{test_id}/submit", response_model=TestAttemptResultResponse)
def submit_mock_test(
    test_id: int,
    submission: TestSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    test = db.query(MockTest).filter(MockTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Mock test not found.")

    # Load questions for this test
    tq_records = db.query(MockTestQuestion).filter(
        MockTestQuestion.mock_test_id == test_id
    ).order_by(MockTestQuestion.order).all()

    submitted_answers_map = {ans.question_id: ans for ans in submission.answers}

    raw_score = 0
    total_questions = len(tq_records)
    section_stats = {}
    topic_stats = {}
    reviews = []

    # Create TestAttempt record
    now = datetime.now(timezone.utc)
    attempt = TestAttempt(
        user_id=current_user.id,
        mock_test_id=test.id,
        started_at=now,
        completed_at=now,
        total_questions=total_questions,
        total_time_spent_seconds=submission.total_time_spent_seconds
    )
    db.add(attempt)
    db.flush()

    for tq in tq_records:
        q = tq.question
        sub_ans = submitted_answers_map.get(q.id)
        student_ans_val = sub_ans.student_answer if sub_ans else None
        time_spent = sub_ans.time_spent_seconds if sub_ans else 0
        is_flagged = sub_ans.is_flagged if sub_ans else False

        is_corr = check_answer_correctness(q, student_ans_val)
        if is_corr:
            raw_score += 1

        # Section tracking
        sec_name = tq.section_name or "General"
        if sec_name not in section_stats:
            section_stats[sec_name] = {"correct": 0, "total": 0, "time_seconds": 0}
        section_stats[sec_name]["total"] += 1
        section_stats[sec_name]["time_seconds"] += time_spent
        if is_corr:
            section_stats[sec_name]["correct"] += 1

        # Topic tracking
        top_name = q.topic
        if top_name not in topic_stats:
            topic_stats[top_name] = {"correct": 0, "total": 0, "time_seconds": 0}
        topic_stats[top_name]["total"] += 1
        topic_stats[top_name]["time_seconds"] += time_spent
        if is_corr:
            topic_stats[top_name]["correct"] += 1

        # Save individual answer record
        attempt_answer = TestAttemptAnswer(
            attempt_id=attempt.id,
            question_id=q.id,
            student_answer=student_ans_val,
            is_correct=is_corr,
            time_spent_seconds=time_spent,
            is_flagged=is_flagged
        )
        db.add(attempt_answer)

        # Build review item
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
            student_answer=student_ans_val,
            is_correct=is_corr,
            time_spent_seconds=time_spent,
            is_flagged=is_flagged
        ))

    # Calculate SAT Scaled Score (Digital SAT format 200-800 scale or proportional 400-1600)
    # A single module/section test is typically 200 - 800 scale
    if total_questions > 0:
        ratio = raw_score / total_questions
        # Curve scaled between 200 and 800
        scaled_score = int(200 + round(ratio * 600 / 10) * 10)
    else:
        scaled_score = 200

    attempt.raw_score = raw_score
    attempt.scaled_score = scaled_score
    attempt.section_analysis_json = json.dumps(section_stats)
    attempt.topic_analysis_json = json.dumps(topic_stats)

    db.commit()
    db.refresh(attempt)

    # Format return breakdown
    section_breakdown = [
        SectionStat(
            section_name=sec,
            correct=d["correct"],
            total=d["total"],
            percentage=round((d["correct"] / d["total"] * 100), 1) if d["total"] > 0 else 0,
            time_seconds=d["time_seconds"]
        )
        for sec, d in section_stats.items()
    ]

    topic_breakdown = [
        TopicStat(
            topic=top,
            correct=d["correct"],
            total=d["total"],
            percentage=round((d["correct"] / d["total"] * 100), 1) if d["total"] > 0 else 0,
            avg_time_seconds=round(d["time_seconds"] / d["total"], 1) if d["total"] > 0 else 0
        )
        for top, d in topic_stats.items()
    ]

    avg_time = round(submission.total_time_spent_seconds / total_questions, 1) if total_questions > 0 else 0

    return TestAttemptResultResponse(
        attempt_id=attempt.id,
        mock_test_id=test.id,
        mock_test_title=test.title,
        completed_at=attempt.completed_at,
        raw_score=raw_score,
        total_questions=total_questions,
        scaled_score=scaled_score,
        total_time_spent_seconds=submission.total_time_spent_seconds,
        average_time_per_question=avg_time,
        section_breakdown=section_breakdown,
        topic_breakdown=topic_breakdown,
        questions_review=reviews
    )

@router.get("/attempts/{attempt_id}", response_model=TestAttemptResultResponse)
def get_attempt_detail(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found.")

    # Allow access if user is owner or teacher
    if attempt.user_id != current_user.id and current_user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this attempt.")

    test = db.query(MockTest).filter(MockTest.id == attempt.mock_test_id).first()
    test_title = test.title if test else "SAT Mock Test"

    answers = db.query(TestAttemptAnswer).filter(TestAttemptAnswer.attempt_id == attempt.id).all()
    reviews = []
    for a in answers:
        q = a.question
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
            student_answer=a.student_answer,
            is_correct=a.is_correct,
            time_spent_seconds=a.time_spent_seconds,
            is_flagged=a.is_flagged
        ))

    sec_json = json.loads(attempt.section_analysis_json) if attempt.section_analysis_json else {}
    top_json = json.loads(attempt.topic_analysis_json) if attempt.topic_analysis_json else {}

    section_breakdown = [
        SectionStat(
            section_name=sec,
            correct=d["correct"],
            total=d["total"],
            percentage=round((d["correct"] / d["total"] * 100), 1) if d["total"] > 0 else 0,
            time_seconds=d.get("time_seconds", 0)
        )
        for sec, d in sec_json.items()
    ]

    topic_breakdown = [
        TopicStat(
            topic=top,
            correct=d["correct"],
            total=d["total"],
            percentage=round((d["correct"] / d["total"] * 100), 1) if d["total"] > 0 else 0,
            avg_time_seconds=round(d.get("time_seconds", 0) / d["total"], 1) if d["total"] > 0 else 0
        )
        for top, d in top_json.items()
    ]

    avg_time = round(attempt.total_time_spent_seconds / attempt.total_questions, 1) if attempt.total_questions > 0 else 0

    return TestAttemptResultResponse(
        attempt_id=attempt.id,
        mock_test_id=attempt.mock_test_id,
        mock_test_title=test_title,
        completed_at=attempt.completed_at,
        raw_score=attempt.raw_score,
        total_questions=attempt.total_questions,
        scaled_score=attempt.scaled_score,
        total_time_spent_seconds=attempt.total_time_spent_seconds,
        average_time_per_question=avg_time,
        section_breakdown=section_breakdown,
        topic_breakdown=topic_breakdown,
        questions_review=reviews
    )

