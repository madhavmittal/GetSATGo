import {
  User,
  MockTestListItem,
  MockTestDetail,
  TestSubmission,
  TestAttemptResult,
  DrillSubmission,
  DrillResult,
  DashboardAnalytics,
  CohortOverview,
  QuestionTaking,
  PublicSettings,
  SettingItem,
  StudentDetail
} from '../types';

const getApiBase = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // Local development: connect to FastAPI on port 8000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:8000/api`;
    }
    // Production (served via Railway / Render): same origin
    return `${window.location.origin}/api`;
  }
  return 'http://127.0.0.1:8000/api';
};

const API_BASE = getApiBase();

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('getsatgo_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = 'An unexpected error occurred';
      let errorData: any = {};
      try {
        errorData = await response.json();
        errorMsg = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch {
        const text = await response.text().catch(() => '');
        errorMsg = text || `Server error (${response.status})`;
      }
      const error: any = new Error(errorMsg);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, full_name: string, role = 'student'): Promise<{ access_token: string; user: User }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, role }),
    });
  }

  async getMe(): Promise<User> {
    return this.request('/auth/me');
  }

  async subscribe(plan = 'Pro SAT Pass', duration_months = 1): Promise<User> {
    return this.request('/auth/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan, duration_months }),
    });
  }

  async simulateExpireSubscription(): Promise<User> {
    return this.request('/auth/simulate-expire', {
      method: 'POST',
    });
  }

  // Mock Tests endpoints
  async getMockTests(): Promise<MockTestListItem[]> {
    return this.request('/tests');
  }

  async getMockTest(testId: number): Promise<MockTestDetail> {
    return this.request(`/tests/${testId}`);
  }

  async submitMockTest(testId: number, submission: TestSubmission): Promise<TestAttemptResult> {
    return this.request(`/tests/${testId}/submit`, {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  }

  async getTestAttempt(attemptId: number): Promise<TestAttemptResult> {
    return this.request(`/tests/attempts/${attemptId}`);
  }

  // Drill Practice endpoints
  async getDrillTopics(): Promise<Record<string, Record<string, { Easy: number; Medium: number; Hard: number; Total: number }>>> {
    return this.request('/drills/topics');
  }

  async getDrillQuestions(domain?: string, topic?: string, difficulty?: string, limit = 5): Promise<QuestionTaking[]> {
    const params = new URLSearchParams();
    if (domain) params.append('domain', domain);
    if (topic) params.append('topic', topic);
    if (difficulty) params.append('difficulty', difficulty);
    params.append('limit', limit.toString());

    return this.request(`/drills/questions?${params.toString()}`);
  }

  async submitDrill(submission: DrillSubmission): Promise<DrillResult> {
    return this.request('/drills/submit', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  }

  // Dashboard Analytics endpoint
  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    return this.request('/dashboard/analytics');
  }

  // Teacher Endpoints
  async getCohortOverview(): Promise<CohortOverview> {
    return this.request('/teacher/cohort-overview');
  }

  async createTeacherQuestion(data: any): Promise<any> {
    return this.request('/teacher/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getStudentDetail(studentId: number): Promise<StudentDetail> {
    return this.request(`/teacher/students/${studentId}`);
  }

  async toggleStudentSubscription(studentId: number): Promise<{ message: string; subscription_status: string }> {
    return this.request(`/teacher/students/${studentId}/toggle-subscription`, {
      method: 'POST',
    });
  }

  // System & Admin Settings endpoints
  async getPublicSettings(): Promise<PublicSettings> {
    return this.request('/settings/public');
  }

  async getAdminSettings(): Promise<SettingItem[]> {
    return this.request('/settings');
  }

  async updateAdminSettings(settings: Record<string, any>): Promise<{ message: string; keys: string[] }> {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
  }

  async resetAdminSettings(): Promise<{ message: string }> {
    return this.request('/settings/reset', {
      method: 'POST',
    });
  }
}

export const api = new ApiService();

