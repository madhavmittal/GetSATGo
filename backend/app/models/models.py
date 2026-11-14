import json
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="student")  # "student", "teacher", "admin"
    
    # Subscription status: active, expired, trial, inactive
    subscription_status = Column(String(50), default="active")
    subscription_plan = Column(String(50), default="Pro SAT Pass")
    subscription_expires_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    test_attempts = relationship("TestAttempt", back_populates="user", cascade="all, delete-orphan")
    drill_attempts = relationship("DrillAttempt", back_populates="user", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    # Domain: "Math" or "Reading & Writing"
    domain = Column(String(100), index=True, nullable=False)
    # Topic: e.g. "Algebra", "Advanced Math", "Problem-Solving & Data Analysis", "Geometry & Trigonometry", "Craft & Structure", "Information & Ideas"
    topic = Column(String(100), index=True, nullable=False)
    # Subtopic: e.g. "Linear Equations", "Quadratic Functions", "Right Triangles", "Circle Equations"
    subtopic = Column(String(100), nullable=True)
    # Difficulty: "Easy", "Medium", "Hard"
    difficulty = Column(String(50), index=True, nullable=False)
    # Question Type: "mcq" (Multiple Choice) or "spr" (Student-Produced Response / Float numeric)
    question_type = Column(String(20), default="mcq", nullable=False)
    
    prompt = Column(Text, nullable=False)
    passage = Column(Text, nullable=True)  # For Reading/Writing questions
    # JSON encoded list of options for MCQ e.g. [{"id": "A", "text": "4"}, {"id": "B", "text": "8"}, ...]
    options_json = Column(Text, nullable=True)
    # Correct answer: for MCQ it's "A", "B", "C", or "D". For SPR, numeric string e.g. "3.5" or "7/2"
    correct_answer = Column(String(100), nullable=False)
    # Accepted alternative answers for SPR (e.g. 3.5, 7/2, .5, 0.5)
    accepted_alternatives_json = Column(Text, nullable=True)
    
    explanation = Column(Text, nullable=False)
    tips = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)

    @property
    def options(self):
        if self.options_json:
            try:
                return json.loads(self.options_json)
            except Exception:
                return []
        return []

    @property
    def accepted_alternatives(self):
        if self.accepted_alternatives_json:
            try:
                return json.loads(self.accepted_alternatives_json)
            except Exception:
                return []
        return []

class MockTest(Base):
    __tablename__ = "mock_tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    time_limit_minutes = Column(Integer, default=64)  # Default SAT module or full test
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Questions association
    test_questions = relationship("MockTestQuestion", back_populates="mock_test", cascade="all, delete-orphan", order_by="MockTestQuestion.order")
    attempts = relationship("TestAttempt", back_populates="mock_test", cascade="all, delete-orphan")

class MockTestQuestion(Base):
    __tablename__ = "mock_test_questions"

    id = Column(Integer, primary_key=True, index=True)
    mock_test_id = Column(Integer, ForeignKey("mock_tests.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    section_name = Column(String(100), default="Math Module 1")  # "Reading & Writing Module 1", "Math Module 1", etc.
    order = Column(Integer, default=1)

    mock_test = relationship("MockTest", back_populates="test_questions")
    question = relationship("Question")

class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mock_test_id = Column(Integer, ForeignKey("mock_tests.id"), nullable=False)
    
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
    
    raw_score = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    scaled_score = Column(Integer, default=400) # SAT scaled score 200-800 or 400-1600
    
    total_time_spent_seconds = Column(Integer, default=0)
    # JSON containing section breakdowns: {"Math Module 1": {"correct": 18, "total": 22, "time_seconds": 1840}}
    section_analysis_json = Column(Text, nullable=True)
    # JSON containing topic breakdowns: {"Algebra": {"correct": 6, "total": 8}, "Geometry & Trigonometry": {"correct": 3, "total": 5}}
    topic_analysis_json = Column(Text, nullable=True)

    user = relationship("User", back_populates="test_attempts")
    mock_test = relationship("MockTest", back_populates="attempts")
    answers = relationship("TestAttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")

class TestAttemptAnswer(Base):
    __tablename__ = "test_attempt_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("test_attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    
    student_answer = Column(String(255), nullable=True)
    is_correct = Column(Boolean, default=False)
    time_spent_seconds = Column(Integer, default=0)
    is_flagged = Column(Boolean, default=False)

    attempt = relationship("TestAttempt", back_populates="answers")
    question = relationship("Question")

class DrillAttempt(Base):
    __tablename__ = "drill_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    domain = Column(String(100), nullable=False)
    topic = Column(String(100), nullable=False)
    difficulty = Column(String(50), nullable=False)
    
    total_questions = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    total_time_spent_seconds = Column(Integer, default=0)
    completed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="drill_attempts")
    answers = relationship("DrillAttemptAnswer", back_populates="drill", cascade="all, delete-orphan")

class DrillAttemptAnswer(Base):
    __tablename__ = "drill_attempt_answers"

    id = Column(Integer, primary_key=True, index=True)
    drill_id = Column(Integer, ForeignKey("drill_attempts.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    student_answer = Column(String(255), nullable=True)
    is_correct = Column(Boolean, default=False)
    time_spent_seconds = Column(Integer, default=0)

    drill = relationship("DrillAttempt", back_populates="answers")
    question = relationship("Question")

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value_json = Column(Text, nullable=False) # JSON encoded: bool, int, float, str
    category = Column(String(50), default="general") # "exam", "tools", "subscription", "drills"
    label = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    setting_type = Column(String(20), default="boolean") # "boolean", "number", "string", "select"
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    @property
    def value(self):
        try:
            return json.loads(self.value_json)
        except Exception:
            return self.value_json


