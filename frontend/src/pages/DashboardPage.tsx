import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Award, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  Play, 
  Sparkles,
  Zap,
  BookOpen,
  Clock,
  Target
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardAnalytics } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useSettings } from '../context/SettingsContext';

interface DashboardPageProps {
  onStartTest?: (testId?: number) => void;
  onStartDrill?: (topic?: string) => void;
  onReviewAttempt?: (attemptId: number) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onStartTest,
  onStartDrill,
  onReviewAttempt,
}) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDashboardAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      console.error("Dashboard error:", err);
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTest = (testId?: number) => {
    if (onStartTest) {
      onStartTest(testId);
    } else if (testId) {
      navigate(`/tests/${testId}`);
    } else {
      navigate('/tests');
    }
  };

  const handleStartDrill = (topic?: string) => {
    if (onStartDrill) {
      onStartDrill(topic);
    } else if (topic) {
      navigate(`/drills?topic=${encodeURIComponent(topic)}`);
    } else {
      navigate('/drills');
    }
  };

  const handleReviewAttempt = (attemptId: number) => {
    if (onReviewAttempt) {
      onReviewAttempt(attemptId);
    } else {
      navigate(`/results/${attemptId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Crunching your SAT test data & analytics...</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-800">Analytics Sync Needed</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            {error || 'Complete your first mock test or practice drill to populate your score insights.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => handleStartTest()}>Take First Mock Test</Button>
            <Button variant="outline" onClick={() => handleStartDrill()}>Practice Drills</Button>
          </div>
        </div>
      </div>
    );
  }

  const effectiveTarget = settings.target_score || analytics.target_score || 1500;
  const scoreProgressPct = Math.min(100, Math.round(((analytics.current_estimated_score - 400) / (effectiveTarget - 400)) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-8 sm:p-10 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Digital SAT Analytics Hub</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Keep pushing, {analytics.user_name.split(' ')[0]}! 🎯
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl">
              Targeting <span className="font-bold text-white">{effectiveTarget}+</span>. Your current estimated score is{' '}
              <span className="font-bold text-amber-400">{analytics.current_estimated_score}</span> based on your recent mocks & drills.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => handleStartTest()}
              size="lg"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30"
            >
              <Play className="w-4 h-4 mr-2 fill-current" />
              Take Full Mock Test
            </Button>
            <Button
              onClick={() => handleStartDrill()}
              variant="outline"
              size="lg"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Zap className="w-4 h-4 mr-2 text-amber-400" />
              Quick Drill Mode
            </Button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Estimated Score Card */}
        <div className="col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Predicted SAT Score</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Award className="w-5 h-5" />
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900 tracking-tight">
                {analytics.current_estimated_score}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 1600 Goal ({effectiveTarget})</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${scoreProgressPct}%` }}
              />
            </div>
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between font-medium">
            <span>Base 400</span>
            <span className="text-blue-600 font-bold">{scoreProgressPct}% to Target</span>
            <span>Target {effectiveTarget}+</span>
          </div>
        </div>

        {/* Tests Completed */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mocks Taken</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <BookOpen className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 my-1">{analytics.total_tests_completed}</div>
          <span className="text-xs text-slate-400 font-medium">Full module exams</span>
        </div>

        {/* Overall Accuracy */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Accuracy</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 my-1">
            {analytics.overall_accuracy_percentage}%
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Across {analytics.total_questions_solved} questions
          </span>
        </div>

        {/* Avg Time per Question */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Pace</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 my-1">
            {analytics.avg_time_per_question_seconds}s
          </div>
          <span className="text-xs text-emerald-600 font-medium">
            Target: ~75s per question
          </span>
        </div>
      </div>

      {/* Weak Areas Recommendation Card */}
      {analytics.weak_areas.length > 0 && (
        <div className="p-6 rounded-3xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20 flex-shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Recommended Focus for Score Gains</h4>
              <p className="text-sm text-slate-600 mt-0.5">
                Target your highest leverage topics:{' '}
                <span className="font-semibold text-amber-900">
                  {analytics.weak_areas.join(', ')}
                </span>
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleStartDrill()}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex-shrink-0"
          >
            Practice Weak Topics
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      )}

      {/* Middle Grid: Syllabus Topic Mastery & Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Topic Mastery breakdown (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Syllabus Topic Mastery</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed accuracy & timing analysis across Math & Reading sections
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartDrill()}
              >
                All Topics
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.topic_mastery.map((topicStat) => {
                const isHigh = topicStat.percentage >= 80;
                const isMid = topicStat.percentage >= 60 && topicStat.percentage < 80;
                const colorClass = isHigh
                  ? 'bg-emerald-500'
                  : isMid
                  ? 'bg-amber-500'
                  : 'bg-rose-500';

                return (
                  <div key={topicStat.topic} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">{topicStat.topic}</span>
                        {topicStat.total > 0 ? (
                          <Badge variant={isHigh ? 'success' : isMid ? 'warning' : 'danger'}>
                            {topicStat.percentage}% Accuracy
                          </Badge>
                        ) : (
                          <Badge variant="outline">Unpracticed</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-medium">
                          {topicStat.correct}/{topicStat.total} Qs • {topicStat.avg_time_seconds}s avg
                        </span>
                        <button
                          onClick={() => handleStartDrill(topicStat.topic)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                        >
                          Drill →
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                      <div
                        className={`${colorClass} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${topicStat.total > 0 ? topicStat.percentage : 5}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Sessionwise Activity Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Session History</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Recent mock exams & drill sessions
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {analytics.recent_activities.length} sessions
              </span>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0">
              {analytics.recent_activities.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No sessions recorded yet. Start a test or drill!
                </div>
              ) : (
                analytics.recent_activities.map((act) => (
                  <div key={`${act.type}-${act.id}`} className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${act.type === 'mock_test' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {act.type === 'mock_test' ? <BookOpen className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 leading-tight">{act.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="capitalize">{act.type.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>{act.time_spent_display}</span>
                          <span>•</span>
                          <span>{new Date(act.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">{act.score_display}</div>
                        <div className="text-[11px] font-semibold text-slate-500">{act.accuracy_percentage}% acc</div>
                      </div>
                      {act.type === 'mock_test' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReviewAttempt(act.id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Review
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartDrill(act.title.split(' ')[0])}
                          className="text-xs text-emerald-600 hover:text-emerald-800"
                        >
                          Drill
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
