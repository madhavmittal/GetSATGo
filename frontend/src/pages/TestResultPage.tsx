import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowLeft, 
  RotateCcw, 
  HelpCircle,
  Lightbulb,
  Bookmark,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { TestAttemptResult } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useSettings } from '../context/SettingsContext';

interface TestResultPageProps {
  result?: TestAttemptResult;
  onBackToDashboard?: () => void;
  onRetake?: () => void;
  onDrillTopic?: (topic: string) => void;
}

export const TestResultPage: React.FC<TestResultPageProps> = ({
  result: propResult,
  onBackToDashboard,
  onRetake,
  onDrillTopic,
}) => {
  const params = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [result, setResult] = useState<TestAttemptResult | null>(propResult || null);
  const [isLoading, setIsLoading] = useState(!propResult);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<'all' | 'incorrect' | 'flagged'>('all');
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);

  const timeTrapThreshold = settings.time_trap_threshold_seconds || 90;

  useEffect(() => {
    if (propResult) {
      setResult(propResult);
      return;
    }

    if (params.attemptId) {
      loadAttempt(parseInt(params.attemptId, 10));
    }
  }, [params.attemptId, propResult]);

  const loadAttempt = async (attemptId: number) => {
    setIsLoading(true);
    try {
      const data = await api.getTestAttempt(attemptId);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load test attempt results.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!result) return;
    const acc = (result.raw_score / result.total_questions) * 100;
    if (acc >= 70 || result.scaled_score >= 600) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    }
  }, [result]);

  const handleBack = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
    } else {
      navigate('/dashboard');
    }
  };

  const handleRetakeExam = () => {
    if (onRetake) {
      onRetake();
    } else if (result) {
      navigate(`/tests/${result.mock_test_id}`);
    } else {
      navigate('/tests');
    }
  };

  const handleDrill = (topic: string) => {
    if (onDrillTopic) {
      onDrillTopic(topic);
    } else {
      navigate(`/drills?topic=${encodeURIComponent(topic)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm">Generating your score breakdown...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Score Report Not Found</h3>
          <p className="text-sm text-slate-500 mt-1">{error || 'Unable to locate this exam attempt.'}</p>
          <Button onClick={handleBack} className="mt-4">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const filteredQuestions = result.questions_review.filter((q) => {
    if (filter === 'incorrect') return !q.is_correct;
    if (filter === 'flagged') return q.is_flagged;
    return true;
  });

  const accuracyPct = Math.round((result.raw_score / result.total_questions) * 100);
  const totalMins = Math.floor(result.total_time_spent_seconds / 60);
  const totalSecsMod = result.total_time_spent_seconds % 60;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Dashboard
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleRetakeExam}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Retake Exam
          </Button>
        </div>
      </div>

      {/* Hero Score Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-8 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <Badge variant="primary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              Exam Complete • Official Score Report
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {result.mock_test_title}
            </h1>
            <p className="text-slate-300 text-sm max-w-lg">
              Detailed time pacing, section correctness, and answer key explanations.
            </p>
          </div>

          {/* Scaled Score Callout */}
          <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center min-w-[200px]">
            <span className="text-xs uppercase font-extrabold tracking-wider text-blue-300">
              Estimated Scaled Score
            </span>
            <div className="text-5xl font-black text-white my-1">
              {result.scaled_score}
            </div>
            <span className="text-xs text-slate-300 font-medium">
              out of 800 (Digital SAT scale)
            </span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Raw Correct</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">
            {result.raw_score} / {result.total_questions}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{accuracyPct}% Accuracy</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Total Duration</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">
            {totalMins}m {totalSecsMod}s
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Test session time</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Average Pace</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">
            {result.average_time_per_question}s
          </div>
          <div className="text-xs text-emerald-600 mt-0.5 font-medium">Standard pace: 75s-90s</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500">
            Time Traps (&gt;{timeTrapThreshold}s)
          </div>
          <div className="text-3xl font-extrabold text-amber-600 mt-1">
            {result.questions_review.filter((q) => q.time_spent_seconds > timeTrapThreshold).length}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Threshold: {timeTrapThreshold}s</div>
        </div>
      </div>

      {/* Section & Topic Breakdown Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Section-Wise Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Section</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Accuracy</th>
                  <th className="px-5 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {result.section_breakdown.map((sec) => (
                  <tr key={sec.section_name} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-semibold text-slate-900">{sec.section_name}</td>
                    <td className="px-4 py-3 font-mono">{sec.correct}/{sec.total}</td>
                    <td className="px-4 py-3">
                      <Badge variant={sec.percentage >= 70 ? 'success' : 'warning'}>
                        {sec.percentage}%
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-500">
                      {Math.floor(sec.time_seconds / 60)}m {sec.time_seconds % 60}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Topic Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Topic-Wise Mastery & Pace</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Topic</th>
                  <th className="px-4 py-3">Accuracy</th>
                  <th className="px-4 py-3">Avg Time</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {result.topic_breakdown.map((top) => (
                  <tr key={top.topic} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-semibold text-slate-900">{top.topic}</td>
                    <td className="px-4 py-3">
                      <Badge variant={top.percentage >= 70 ? 'success' : 'danger'}>
                        {top.percentage}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {top.avg_time_seconds}s
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDrill(top.topic)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800"
                      >
                        Drill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Question Review Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Per-Question Time & Answer Analysis</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review every answer with teacher step-by-step explanations and timing feedback.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({result.questions_review.length})
            </button>
            <button
              onClick={() => setFilter('incorrect')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                filter === 'incorrect' ? 'bg-white text-rose-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Incorrect ({result.questions_review.filter((q) => !q.is_correct).length})
            </button>
            <button
              onClick={() => setFilter('flagged')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                filter === 'flagged' ? 'bg-white text-amber-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Flagged ({result.questions_review.filter((q) => q.is_flagged).length})
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => {
            const isExpanded = expandedQuestionId === q.id;
            const isTimeTrap = q.time_spent_seconds > timeTrapThreshold;

            return (
              <div
                key={q.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  q.is_correct
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-rose-200 bg-rose-50/20'
                }`}
              >
                {/* Question Summary Bar */}
                <div
                  onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition select-none"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                        q.is_correct
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{q.topic}</span>
                        <Badge variant="outline" className="text-[10px]">{q.difficulty}</Badge>
                        {q.is_flagged && (
                          <Badge variant="warning" className="text-[10px] flex items-center gap-1">
                            <Bookmark className="w-2.5 h-2.5 fill-amber-500" />
                            Flagged
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-xl">
                        {q.prompt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Time Analysis Badge */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{q.time_spent_seconds}s</span>
                      </div>
                      {isTimeTrap && (
                        <span className="text-[10px] font-bold text-amber-600 block">
                          ⚠️ Time Trap (&gt;{timeTrapThreshold}s)
                        </span>
                      )}
                    </div>

                    {/* Result pill */}
                    {q.is_correct ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Correct
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                        <XCircle className="w-3.5 h-3.5" />
                        Incorrect
                      </span>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Question Review with Explanation */}
                {isExpanded && (
                  <div className="p-6 bg-white border-t border-slate-100 space-y-5 animate-fade-in">
                    {q.passage && (
                      <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-700 border border-slate-200 whitespace-pre-line font-serif">
                        <span className="font-sans font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Passage Excerpt:
                        </span>
                        {q.passage}
                      </div>
                    )}

                    <div className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-line">
                      {q.prompt}
                    </div>

                    {/* Answers Comparison */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Your Answer:
                        </span>
                        <span
                          className={`font-mono text-sm font-bold ${
                            q.is_correct ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {q.student_answer ? q.student_answer : '(No answer recorded)'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                        <span className="font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                          Correct Answer:
                        </span>
                        <span className="font-mono text-sm font-bold text-emerald-800">
                          {q.correct_answer}
                        </span>
                      </div>
                    </div>

                    {/* Step-by-Step Teacher Explanation */}
                    <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-slate-800 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900">
                        <HelpCircle className="w-4 h-4 text-blue-600" />
                        <span>Teacher Step-by-Step Explanation</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-line">{q.explanation}</p>
                    </div>

                    {/* Teacher Pro Tip */}
                    {q.tips && (
                      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                        <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">SAT Strategy Tip: </span>
                          <span>{q.tips}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
