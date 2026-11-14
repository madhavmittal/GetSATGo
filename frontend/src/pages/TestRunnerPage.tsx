import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Eye, 
  EyeOff, 
  Calculator, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  FileText, 
  X, 
  Send,
  LogOut
} from 'lucide-react';
import { api } from '../services/api';
import { MockTestDetail, QuestionSubmission, TestSubmission, TestAttemptResult } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DesmosCalculatorModal } from '../components/DesmosCalculatorModal';
import { useSettings } from '../context/SettingsContext';

interface TestRunnerPageProps {
  testId?: number;
  onFinish?: (result: TestAttemptResult) => void;
  onCancel?: () => void;
}

export const TestRunnerPage: React.FC<TestRunnerPageProps> = ({ 
  testId: propTestId, 
  onFinish, 
  onCancel 
}) => {
  const params = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const activeId = propTestId || (params.testId ? parseInt(params.testId, 10) : 1);

  const [test, setTest] = useState<MockTestDetail | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});
  const [struckOptions, setStruckOptions] = useState<Record<number, Record<string, boolean>>>({});

  // Timers
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showTimer, setShowTimer] = useState(true);
  
  // UI modals
  const [isDesmosOpen, setIsDesmosOpen] = useState(false);
  const [isFormulaSheetOpen, setIsFormulaSheetOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentQStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    loadTest();
  }, [activeId]);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  const recordCurrentQuestionTime = () => {
    if (!test || !test.questions[currentIndex]) return;
    const now = Date.now();
    const durationSec = Math.round((now - currentQStartTimeRef.current) / 1000);
    const qId = test.questions[currentIndex].id;
    
    setQuestionTimes((prev) => ({
      ...prev,
      [qId]: (prev[qId] || 0) + durationSec,
    }));
    currentQStartTimeRef.current = now;
  };

  const handleSelectQuestion = (index: number) => {
    recordCurrentQuestionTime();
    setCurrentIndex(index);
  };

  const loadTest = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMockTest(activeId);
      setTest(data);
      currentQStartTimeRef.current = Date.now();
    } catch (err: any) {
      setError(err.message || 'Failed to load test questions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (val: string) => {
    if (!test) return;
    const qId = test.questions[currentIndex].id;
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const toggleFlag = () => {
    if (!test) return;
    const qId = test.questions[currentIndex].id;
    setFlagged((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const toggleStrikethrough = (e: React.MouseEvent, optId: string) => {
    e.stopPropagation();
    if (!test) return;
    const qId = test.questions[currentIndex].id;
    setStruckOptions((prev) => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || {}),
        [optId]: !prev[qId]?.[optId],
      },
    }));
  };

  const handleExit = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/tests');
    }
  };

  const handleFinalSubmit = async () => {
    if (!test) return;
    recordCurrentQuestionTime();
    setIsSubmitting(true);

    try {
      const answersPayload: QuestionSubmission[] = test.questions.map((q) => ({
        question_id: q.id,
        student_answer: answers[q.id] || undefined,
        time_spent_seconds: questionTimes[q.id] || 0,
        is_flagged: !!flagged[q.id],
      }));

      const submission: TestSubmission = {
        mock_test_id: test.id,
        total_time_spent_seconds: elapsedSeconds,
        answers: answersPayload,
      };

      const result = await api.submitMockTest(test.id, submission);
      if (onFinish) {
        onFinish(result);
      } else {
        navigate(`/results/${result.attempt_id}`);
      }
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-semibold text-lg">Launching Digital SAT Simulator...</p>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center max-w-md shadow-lg">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-800">Test Load Error</h2>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
          <Button onClick={handleExit} className="mt-4">Return to Mock Tests</Button>
        </div>
      </div>
    );
  }

  const currentQ = test.questions[currentIndex];
  const totalQuestions = test.questions.length;
  const answeredCount = Object.keys(answers).filter((k) => answers[Number(k)]?.trim()).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;

  const effectiveTimeLimitMinutes = test.time_limit_minutes || settings.default_test_time_minutes || 45;
  const totalTimeLimitSec = effectiveTimeLimitMinutes * 60;
  const remainingSec = Math.max(0, totalTimeLimitSec - elapsedSeconds);
  const elapsedMins = Math.floor(elapsedSeconds / 60);
  const elapsedSecsMod = elapsedSeconds % 60;
  const remMins = Math.floor(remainingSec / 60);
  const remSecsMod = remainingSec % 60;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col select-none">
      {/* Bluebook-style Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-md">
        {/* Left: Exit Exam & Section & Question Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExitModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-semibold"
            title="Exit Exam"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Exam</span>
          </button>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="font-extrabold text-sm sm:text-base tracking-wide flex items-center gap-2">
            <span className="text-blue-400">{currentQ.section_name || 'Section 1: Math'}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-200">Question {currentIndex + 1} of {totalQuestions}</span>
          </div>
          <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700 text-[10px] hidden md:inline-flex">
            {currentQ.topic}
          </Badge>
        </div>

        {/* Center: Live Timer with Toggle */}
        <div className="flex items-center gap-2 bg-slate-800/90 px-3.5 py-1 rounded-full border border-slate-700/80">
          <Clock className="w-4 h-4 text-blue-400" />
          {showTimer ? (
            <span className="font-mono text-sm font-bold tracking-wider text-white">
              {String(remMins).padStart(2, '0')}:{String(remSecsMod).padStart(2, '0')}{' '}
              <span className="text-[10px] text-slate-400 font-normal">
                (Elapsed: {String(elapsedMins).padStart(2, '0')}:{String(elapsedSecsMod).padStart(2, '0')})
              </span>
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-400">Timer Hidden</span>
          )}
          {settings.allow_timer_toggle && (
            <button
              onClick={() => setShowTimer(!showTimer)}
              className="p-1 text-slate-400 hover:text-white rounded transition ml-1"
              title={showTimer ? "Hide Timer" : "Show Timer"}
            >
              {showTimer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Right: Tools & Submit */}
        <div className="flex items-center gap-2">
          {/* Desmos Calculator Toggle Button */}
          {settings.enable_desmos_calculator && (
            <Button
              onClick={() => setIsDesmosOpen(!isDesmosOpen)}
              variant="secondary"
              size="sm"
              className="bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-bold"
            >
              <Calculator className="w-3.5 h-3.5 mr-1 text-blue-400" />
              <span className="hidden sm:inline">Desmos</span> Calculator
            </Button>
          )}

          {/* Reference formulas */}
          {settings.enable_math_reference_sheet && (
            <Button
              onClick={() => setIsFormulaSheetOpen(true)}
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs hidden md:inline-flex"
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              Reference
            </Button>
          )}

          {/* Submit Test Button */}
          <Button
            onClick={() => {
              recordCurrentQuestionTime();
              setIsSubmitModalOpen(true);
            }}
            variant="primary"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
          >
            Submit Test
          </Button>
        </div>
      </header>

      {/* Main Test View Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm flex-1 flex flex-col overflow-hidden">
          {/* Question Sub-header with Topic & Flag */}
          <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="font-bold text-slate-800">{currentQ.domain}</span>
              <span>•</span>
              <span>{currentQ.topic}</span>
              {currentQ.subtopic && (
                <>
                  <span>•</span>
                  <span>{currentQ.subtopic}</span>
                </>
              )}
            </div>

            {settings.allow_question_flagging && (
              <button
                onClick={toggleFlag}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                  flagged[currentQ.id]
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'text-slate-500 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${flagged[currentQ.id] ? 'fill-amber-600 text-amber-600' : ''}`} />
                <span>{flagged[currentQ.id] ? 'Flagged for Review' : 'Mark for Review'}</span>
              </button>
            )}
          </div>

          {/* Question Body */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
            <div className={`grid gap-8 ${currentQ.passage ? 'lg:grid-cols-2' : 'grid-cols-1 max-w-3xl mx-auto'}`}>
              {currentQ.passage && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm sm:text-base leading-relaxed space-y-3 font-serif">
                  <div className="text-xs font-sans font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Reading Passage
                  </div>
                  <p className="whitespace-pre-line">{currentQ.passage}</p>
                </div>
              )}

              <div className="space-y-6">
                <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed whitespace-pre-line">
                  {currentQ.prompt}
                </div>

                {currentQ.question_type === 'mcq' ? (
                  <div className="space-y-3">
                    {currentQ.options.map((opt) => {
                      const isSelected = answers[currentQ.id] === opt.id;
                      const isStruck = !!struckOptions[currentQ.id]?.[opt.id];

                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleAnswerChange(opt.id)}
                          className={`relative group flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                              : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                          } ${isStruck ? 'opacity-40 line-through' : ''}`}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl font-extrabold text-sm flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                            }`}
                          >
                            {opt.id}
                          </div>

                          <div className="flex-1 text-sm sm:text-base text-slate-800 font-medium pt-1">
                            {opt.text}
                          </div>

                          {settings.enable_option_strikethrough && (
                            <button
                              type="button"
                              onClick={(e) => toggleStrikethrough(e, opt.id)}
                              className="p-1 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-200/60 transition opacity-0 group-hover:opacity-100"
                              title="Eliminate choice (strike-through)"
                            >
                              <span className="text-[11px] font-bold line-through px-1">ABC</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                        Student-Produced Response (SPR)
                      </span>
                      <Badge variant="primary" className="text-[10px]">Float / Fraction Input</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Enter your calculated answer as a whole number, decimal (e.g.{' '}
                      <code className="text-blue-600 font-bold">3.5</code> or{' '}
                      <code className="text-blue-600 font-bold">0.75</code>), or simplified fraction (e.g.{' '}
                      <code className="text-blue-600 font-bold">7/2</code>).
                    </p>
                    <div className="max-w-xs">
                      <input
                        type="text"
                        placeholder="Enter numerical answer"
                        value={answers[currentQ.id] || ''}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        className="w-full text-xl font-bold font-mono px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-600 focus:outline-none bg-white text-slate-900"
                        autoFocus
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Bar: Navigator Grid & Back/Next */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
              {test.questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = !!answers[q.id]?.trim();
                const isQFlagged = !!flagged[q.id];

                return (
                  <button
                    key={q.id}
                    onClick={() => handleSelectQuestion(idx)}
                    className={`relative w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500 ring-offset-1'
                        : isAnswered
                        ? 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                        : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                    {isQFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-1 ring-white" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                disabled={currentIndex === 0}
                onClick={() => handleSelectQuestion(currentIndex - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>

              {currentIndex < totalQuestions - 1 ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleSelectQuestion(currentIndex + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                  onClick={() => {
                    recordCurrentQuestionTime();
                    setIsSubmitModalOpen(true);
                  }}
                >
                  Review & Submit
                  <Send className="w-4 h-4 ml-1.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Embedded Desmos Calculator Modal */}
      {settings.enable_desmos_calculator && (
        <DesmosCalculatorModal
          isOpen={isDesmosOpen}
          onClose={() => setIsDesmosOpen(false)}
        />
      )}

      {/* SAT Math Formula Sheet Modal */}
      {isFormulaSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">Official SAT Math Reference Sheet</h3>
              <button
                onClick={() => setIsFormulaSheetOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="font-bold text-blue-700">Circles & Area</div>
                <p>• Area of Circle: A = πr²</p>
                <p>• Circumference: C = 2πr</p>
                <p>• Area of Triangle: A = ½bh</p>
                <p>• Pythagorean Theorem: a² + b² = c²</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="font-bold text-blue-700">Special Right Triangles</div>
                <p>• 30°-60°-90°: x, x√3, 2x</p>
                <p>• 45°-45°-90°: s, s, s√2</p>
                <p>• Circle Degrees: 360°</p>
                <p>• Circle Radians: 2π radians</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 col-span-2">
                <div className="font-bold text-blue-700">Volume Formulas</div>
                <p>• Rectangular Prism: V = lwh &nbsp;|&nbsp; Cylinder: V = πr²h &nbsp;|&nbsp; Sphere: V = ⁴⁄₃πr³ &nbsp;|&nbsp; Cone: V = ⅓πr²h</p>
              </div>
            </div>
            <div className="text-right pt-2">
              <Button size="sm" onClick={() => setIsFormulaSheetOpen(false)}>Close Sheet</Button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Exam Confirmation Modal (Eliminates dead end!) */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Exit This Mock Exam?</h3>
              <p className="text-xs text-slate-500 mt-1">
                If you exit now without submitting, your answers for this session will not be graded or saved to your dashboard analytics.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                className="w-1/2"
                onClick={() => setIsExitModalOpen(false)}
              >
                Resume Exam
              </Button>
              <Button
                variant="danger"
                className="w-1/2 font-bold"
                onClick={handleExit}
              >
                Exit to Tests
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Submit Exam for Analysis?</h3>
              <p className="text-xs text-slate-500 mt-1">
                You will receive your scaled score, section-wise accuracy, and per-question time analysis.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="font-extrabold text-lg text-slate-900">{answeredCount} / {totalQuestions}</div>
                <div className="text-slate-500">Answered</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="font-extrabold text-lg text-amber-600">{flaggedCount}</div>
                <div className="text-slate-500">Flagged Questions</div>
              </div>
            </div>

            {totalQuestions - answeredCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>You have {totalQuestions - answeredCount} unanswered questions remaining.</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                className="w-1/2"
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={isSubmitting}
              >
                Back to Test
              </Button>
              <Button
                variant="primary"
                className="w-1/2 bg-emerald-600 hover:bg-emerald-700 font-bold"
                onClick={handleFinalSubmit}
                isLoading={isSubmitting}
              >
                Yes, Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
