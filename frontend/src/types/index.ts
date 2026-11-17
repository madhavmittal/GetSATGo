export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'student' | 'teacher' | 'admin';
  is_approved: boolean;
  created_at: string;
}

export interface PendingRegistration {
  id: number;
  email: string;
  full_name: string;
  role: 'student' | 'teacher';
  created_at: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionTaking {
  id: number;
  domain: string;
  topic: string;
  subtopic?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question_type: 'mcq' | 'spr';
  prompt: string;
  passage?: string;
  options: QuestionOption[];
  image_url?: string;
  section_name?: string;
  order?: number;
}

export interface QuestionReview extends QuestionTaking {
  correct_answer: string;
  explanation: string;
  tips?: string;
  student_answer?: string;
  is_correct: boolean;
  time_spent_seconds: number;
  is_flagged?: boolean;
}

export interface MockTestListItem {
  id: number;
  title: string;
  description?: string;
  time_limit_minutes: number;
  total_questions: number;
  completed_attempts_count: number;
  best_score?: number;
}

export interface MockTestDetail {
  id: number;
  title: string;
  description?: string;
  time_limit_minutes: number;
  total_questions: number;
  questions: QuestionTaking[];
}

export interface QuestionSubmission {
  question_id: number;
  student_answer?: string;
  time_spent_seconds: number;
  is_flagged?: boolean;
}

export interface TestSubmission {
  mock_test_id: number;
  total_time_spent_seconds: number;
  answers: QuestionSubmission[];
}

export interface SectionStat {
  section_name: string;
  correct: int_stat;
  total: int_stat;
  percentage: number;
  time_seconds: number;
}
type int_stat = number;

export interface TopicStat {
  topic: string;
  correct: number;
  total: number;
  percentage: number;
  avg_time_seconds: number;
}

export interface TestAttemptResult {
  attempt_id: number;
  mock_test_id: number;
  mock_test_title: string;
  completed_at: string;
  raw_score: number;
  total_questions: number;
  scaled_score: number;
  total_time_spent_seconds: number;
  average_time_per_question: number;
  section_breakdown: SectionStat[];
  topic_breakdown: TopicStat[];
  questions_review: QuestionReview[];
}

export interface DrillSubmission {
  domain: string;
  topic: string;
  difficulty: string;
  total_time_spent_seconds: number;
  answers: QuestionSubmission[];
}

export interface DrillResult {
  drill_id: number;
  topic: string;
  difficulty: string;
  total_questions: number;
  correct_count: number;
  accuracy_percentage: number;
  total_time_spent_seconds: number;
  questions_review: QuestionReview[];
}

export interface RecentActivity {
  id: number;
  type: 'mock_test' | 'drill';
  title: string;
  score_display: string;
  accuracy_percentage: number;
  time_spent_display: string;
  date: string;
}

export interface DashboardAnalytics {
  user_name: string;
  total_tests_completed: number;
  total_drills_completed: number;
  total_questions_solved: number;
  overall_accuracy_percentage: number;
  current_estimated_score: number;
  target_score: number;
  avg_time_per_question_seconds: number;
  topic_mastery: TopicStat[];
  weak_areas: string[];
  recent_activities: RecentActivity[];
}

export interface StudentSummary {
  id: number;
  full_name: string;
  email: string;
  tests_completed: number;
  drills_completed: number;
  avg_score?: number;
  last_active?: string;
}

export interface CohortOverview {
  total_students: number;
  total_mock_attempts: number;
  cohort_avg_score: number;
  students: StudentSummary[];
}

export interface SettingItem {
  key: string;
  value: any;
  category: string;
  label: string;
  description?: string;
  setting_type: 'boolean' | 'number' | 'string' | 'select';
  updated_at?: string;
}

export interface PublicSettings {
  default_test_time_minutes: number;
  allow_timer_toggle: boolean;
  time_trap_threshold_seconds: number;
  allow_question_flagging: boolean;
  enable_option_strikethrough: boolean;
  target_score: number;
  enable_desmos_calculator: boolean;
  enable_math_reference_sheet: boolean;
  default_drill_question_count: number;
  [key: string]: any;
}

export interface StudentDetail {
  student: {
    id: number;
    full_name: string;
    email: string;
    created_at: string;
  };
  test_attempts: {
    id: number;
    mock_test_title: string;
    scaled_score: number;
    raw_score: number;
    total_questions: number;
    time_spent_seconds: number;
    completed_at: string;
  }[];
  drill_attempts: {
    id: number;
    topic: string;
    difficulty: string;
    correct_count: number;
    total_questions: number;
    time_spent_seconds: number;
    completed_at: string;
  }[];
}

