from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Literal["student", "teacher"] = "student"
    teacher_invite_code: Optional[str] = None

class RegistrationRequestCreated(BaseModel):
    status: Literal["pending"] = "pending"
    message: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_approved: bool
    created_at: datetime

    class Config:
        from_attributes = True

class PendingRegistrationResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: Literal["student", "teacher"]
    created_at: datetime

# Question Schemas
class QuestionOption(BaseModel):
    id: str
    text: str

class QuestionTakingResponse(BaseModel):
    id: int
    domain: str
    topic: str
    subtopic: Optional[str] = None
    difficulty: str
    question_type: str  # "mcq" or "spr"
    prompt: str
    passage: Optional[str] = None
    options: List[QuestionOption] = []
    image_url: Optional[str] = None
    section_name: Optional[str] = None
    order: Optional[int] = None

class QuestionReviewResponse(BaseModel):
    id: int
    domain: str
    topic: str
    subtopic: Optional[str] = None
    difficulty: str
    question_type: str
    prompt: str
    passage: Optional[str] = None
    options: List[QuestionOption] = []
    correct_answer: str
    explanation: str
    tips: Optional[str] = None
    image_url: Optional[str] = None
    
    # Attempt-specific fields
    student_answer: Optional[str] = None
    is_correct: bool = False
    time_spent_seconds: int = 0
    is_flagged: bool = False

# Mock Test Schemas
class MockTestListItem(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    time_limit_minutes: int
    total_questions: int
    completed_attempts_count: Optional[int] = 0
    best_score: Optional[int] = None

class MockTestDetailResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    time_limit_minutes: int
    total_questions: int
    questions: List[QuestionTakingResponse]

# Submission Schemas
class QuestionSubmission(BaseModel):
    question_id: int
    student_answer: Optional[str] = None
    time_spent_seconds: int = 0
    is_flagged: bool = False

class TestSubmission(BaseModel):
    mock_test_id: int
    total_time_spent_seconds: int
    answers: List[QuestionSubmission]

class SectionStat(BaseModel):
    section_name: str
    correct: int
    total: int
    percentage: float
    time_seconds: int

class TopicStat(BaseModel):
    topic: str
    correct: int
    total: int
    percentage: float
    avg_time_seconds: float

class TestAttemptResultResponse(BaseModel):
    attempt_id: int
    mock_test_id: int
    mock_test_title: str
    completed_at: datetime
    raw_score: int
    total_questions: int
    scaled_score: int
    total_time_spent_seconds: int
    average_time_per_question: float
    section_breakdown: List[SectionStat]
    topic_breakdown: List[TopicStat]
    questions_review: List[QuestionReviewResponse]

# Drill Schemas
class DrillSubmission(BaseModel):
    domain: str
    topic: str
    difficulty: str
    total_time_spent_seconds: int
    answers: List[QuestionSubmission]

class DrillResultResponse(BaseModel):
    drill_id: int
    topic: str
    difficulty: str
    total_questions: int
    correct_count: int
    accuracy_percentage: float
    total_time_spent_seconds: int
    questions_review: List[QuestionReviewResponse]

# Dashboard Schemas
class RecentActivity(BaseModel):
    id: int
    type: str  # "mock_test" or "drill"
    title: str
    score_display: str
    accuracy_percentage: float
    time_spent_display: str
    date: datetime

class DashboardAnalyticsResponse(BaseModel):
    user_name: str
    total_tests_completed: int
    total_drills_completed: int
    total_questions_solved: int
    overall_accuracy_percentage: float
    current_estimated_score: int
    target_score: int
    avg_time_per_question_seconds: float
    topic_mastery: List[TopicStat]
    weak_areas: List[str]
    recent_activities: List[RecentActivity]

# Settings Schemas
class SettingItem(BaseModel):
    key: str
    value: Any
    category: str
    label: str
    description: Optional[str] = None
    setting_type: str
    updated_at: Optional[datetime] = None

class SettingUpdatePayload(BaseModel):
    settings: Dict[str, Any]

class PublicSettings(BaseModel):
    values: Dict[str, Any]

Token.model_rebuild()
