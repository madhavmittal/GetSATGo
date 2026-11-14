import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Target, 
  Clock, 
  Calculator, 
  HelpCircle, 
  RotateCcw, 
  Play, 
  Send,
  ArrowLeft,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { QuestionTaking, DrillSubmission, DrillResult, QuestionSubmission } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DesmosCalculatorModal } from '../components/DesmosCalculatorModal';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface DrillPracticePageProps {
  initialTopic?: string;
  onFinishDrill?: () => void;
}

export const DrillPracticePage: React.FC<DrillPracticePageProps> = ({
  initialTopic,
  onFinishDrill,
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isSubscriptionActive, setShowSubModal } = useAuth();
  const { settings } = useSettings();

  const queryTopic = searchParams.get('topic');
  const queryDifficulty = searchParams.get('difficulty') as 'Easy' | 'Medium' | 'Hard' | null;

  // Available topics map
  const mathTopics = [
    'Algebra',
    'Advanced Math',
    'Problem-Solving & Data Analysis',
    'Geometry & Trigonometry',
  ];

  const rwTopics = [
    'Craft & Structure',
    'Information & Ideas',
  ];

  const initialDomainVal = queryTopic && rwTopics.includes(queryTopic) ? 'Reading & Writing' : 'Math';

  // Topic selection state
  const [selectedDomain, setSelectedDomain] = useState<'Math' | 'Reading & Writing'>(initialDomainVal);
  const [selectedTopic, setSelectedTopic] = useState<string>(queryTopic || initialTopic || 'Algebra');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>(queryDifficulty || 'Medium');
  const [questionCount] = useState<number>(settings.default_drill_question_count || 5);

  // Active drill state
  const [isDrillActive, setIsDrillActive] = useState(false);
  const [drillQuestions, setDrillQuestions] = useState<QuestionTaking[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [drillAnswers, setDrillAnswers] = useState<Record<number, string>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isDesmosOpen, setIsDesmosOpen] = useState(false);

  // Results state
  const [drillResult, setDrillResult] = useState<DrillResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (queryTopic) {
      setSelectedTopic(queryTopic);
      if (rwTopics.includes(queryTopic)) {
        setSelectedDomain('Reading & Writing');
      } else {
        setSelectedDomain('Math');
      }
    }
    if (queryDifficulty) {
      setSelectedDifficulty(queryDifficulty);
    }
  }, [queryTopic, queryDifficulty]);

  // Timer while drill is active
  useEffect(() => {
    let interval: any = null;
    if (isDrillActive && !drillResult) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isDrillActive, drillResult]);

  const handleStartDrill = async () => {
    const isGated = settings.require_subscription_for_drills === true;
    if (isGated && !isSubscriptionActive) {
      setShowSubModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const questions = await api.getDrillQuestions(
        selectedDomain,
        selectedTopic,
        selectedDifficulty,
        questionCount
      );

      if (questions.length === 0) {
        setError(`No ${selectedDifficulty} questions found for ${selectedTopic}. Try selecting another difficulty or topic.`);
        setIsLoading(false);
        return;
      }

      setDrillQuestions(questions);
      setCurrentIdx(0);
      setDrillAnswers({});
      setElapsedSeconds(0);
      setDrillResult(null);
      setIsDrillActive(true);
    } catch (err: any) {
      if (err.status === 402) {
        setShowSubModal(true);
      }
      setError(err.message || 'Failed to fetch drill questions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (val: string) => {
    const qId = drillQuestions[currentIdx].id;
    setDrillAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleSubmitDrill = async () => {
    setIsLoading(true);
    try {
      const answersPayload: QuestionSubmission[] = drillQuestions.map((q) => ({
        question_id: q.id,
        student_answer: drillAnswers[q.id] || undefined,
        time_spent_seconds: Math.round(elapsedSeconds / drillQuestions.length),
      }));

      const submission: DrillSubmission = {
        domain: selectedDomain,
        topic: selectedTopic,
        difficulty: selectedDifficulty,
        total_time_spent_seconds: elapsedSeconds,
        answers: answersPayload,
      };

      const result = await api.submitDrill(submission);
      setDrillResult(result);
    } catch (err: any) {
      alert(`Drill error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishDrill = () => {
    if (onFinishDrill) {
      onFinishDrill();
    } else {
      navigate('/dashboard');
    }
  };

  // 1. TOPIC & DIFFICULTY SELECTOR VIEW
  if (!isDrillActive) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
        <div className="pb-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Target className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Syllabus Drills</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Target specific SAT domains and topics sorted by difficulty to eliminate weak spots.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            {error}
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-8">
          {/* Step 1: Select Domain */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
              Step 1: Choose SAT Domain
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['Math', 'Reading & Writing'] as const).map((dom) => (
                <button
                  key={dom}
                  type="button"
                  onClick={() => {
                    setSelectedDomain(dom);
                    setSelectedTopic(dom === 'Math' ? mathTopics[0] : rwTopics[0]);
                  }}
                  className={`p-4 rounded-2xl border-2 font-bold text-sm text-left transition flex items-center justify-between ${
                    selectedDomain === dom
                      ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span>{dom}</span>
                  {selectedDomain === dom && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Select Syllabus Topic */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
              Step 2: Choose Syllabus Section
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(selectedDomain === 'Math' ? mathTopics : rwTopics).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTopic(t)}
                  className={`p-3.5 rounded-xl border-2 text-sm font-semibold text-left transition flex items-center justify-between ${
                    selectedTopic === t
                      ? 'border-blue-600 bg-blue-50/70 text-blue-800 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span>{t}</span>
                  {selectedTopic === t && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Difficulty Level */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
              Step 3: Choose Question Difficulty
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['Easy', 'Medium', 'Hard'] as const).map((diff) => {
                const isSelected = selectedDifficulty === diff;
                const colors = {
                  Easy: isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200',
                  Medium: isSelected ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-200',
                  Hard: isSelected ? 'border-rose-500 bg-rose-50 text-rose-800' : 'border-slate-200',
                };

                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm text-center transition ${colors[diff]}`}
                  >
                    {diff}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {settings.enable_desmos_calculator ? 'Desmos Graphing Calculator & live timer enabled' : 'Live timer enabled'}
            </div>
            <Button
              onClick={handleStartDrill}
              isLoading={isLoading}
              size="lg"
              className="font-bold shadow-md shadow-blue-500/25"
            >
              <Play className="w-4 h-4 mr-2 fill-current" />
              Launch {selectedTopic} Drill
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 2. DRILL RESULTS VIEW
  if (drillResult) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setIsDrillActive(false)}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Topics
          </Button>
          <Button variant="primary" size="sm" onClick={handleFinishDrill}>
            View in Dashboard →
          </Button>
        </div>

        {/* Result Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
          <Badge variant="primary">{drillResult.topic} • {drillResult.difficulty}</Badge>
          <h2 className="text-3xl font-extrabold text-slate-900">Drill Completed!</h2>
          <div className="flex items-center justify-center gap-6 my-4">
            <div>
              <div className="text-4xl font-black text-blue-600">
                {drillResult.correct_count} / {drillResult.total_questions}
              </div>
              <div className="text-xs text-slate-400 mt-1">Score ({drillResult.accuracy_percentage}%)</div>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div>
              <div className="text-4xl font-black text-slate-800">
                {drillResult.total_time_spent_seconds}s
              </div>
              <div className="text-xs text-slate-400 mt-1">Duration</div>
            </div>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <Button variant="secondary" onClick={handleStartDrill}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Try Again
            </Button>
          </div>
        </div>

        {/* Answer Explanations */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-slate-900">Step-by-Step Question Reviews</h3>
          {drillResult.questions_review.map((q, i) => (
            <div
              key={q.id}
              className={`p-6 rounded-2xl border bg-white space-y-3 ${
                q.is_correct ? 'border-emerald-200' : 'border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">Question {i + 1}</span>
                {q.is_correct ? (
                  <Badge variant="success">Correct</Badge>
                ) : (
                  <Badge variant="danger">Incorrect</Badge>
                )}
              </div>
              <p className="text-sm text-slate-800 leading-relaxed font-medium">{q.prompt}</p>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block">Your Answer:</span>
                  <span className={`font-mono font-bold ${q.is_correct ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {q.student_answer || '(Blank)'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-700 block">Correct Answer:</span>
                  <span className="font-mono font-bold text-emerald-800">{q.correct_answer}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-slate-800 space-y-1">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  Teacher Explanation:
                </div>
                <p className="leading-relaxed">{q.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. ACTIVE IN-DRILL RUNNER VIEW
  const activeQ = drillQuestions[currentIdx];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Badge variant="primary">{selectedTopic}</Badge>
          <span className="text-xs font-semibold text-slate-600">
            Question {currentIdx + 1} of {drillQuestions.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-700 px-3 py-1 bg-slate-100 rounded-full">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{elapsedSeconds}s</span>
          </div>

          {settings.enable_desmos_calculator && (
            <Button
              onClick={() => setIsDesmosOpen(!isDesmosOpen)}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              <Calculator className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Desmos
            </Button>
          )}

          <Button
            onClick={() => setIsDrillActive(false)}
            variant="ghost"
            size="sm"
            className="text-xs text-slate-400 hover:text-rose-600"
          >
            Quit Drill
          </Button>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed whitespace-pre-line">
          {activeQ.prompt}
        </div>

        {activeQ.question_type === 'mcq' ? (
          <div className="space-y-3">
            {activeQ.options.map((opt) => {
              const isSelected = drillAnswers[activeQ.id] === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleAnswer(opt.id)}
                  className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 transition cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {opt.id}
                  </div>
                  <div className="text-sm text-slate-800 font-medium pt-0.5">{opt.text}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
            <span className="text-xs font-bold uppercase text-blue-700 block">
              Student-Produced Response (SPR)
            </span>
            <input
              type="text"
              placeholder="e.g. 5, 3.5, or 7/2"
              value={drillAnswers[activeQ.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              className="w-full max-w-xs text-lg font-bold font-mono px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:outline-none bg-white text-slate-900"
              autoFocus
            />
          </div>
        )}

        {/* Navigation & Submit */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(currentIdx - 1)}
          >
            Previous
          </Button>

          {currentIdx < drillQuestions.length - 1 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCurrentIdx(currentIdx + 1)}
            >
              Next Question
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              className="bg-emerald-600 hover:bg-emerald-700 font-bold"
              onClick={handleSubmitDrill}
              isLoading={isLoading}
            >
              Submit Drill
              <Send className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>

      {settings.enable_desmos_calculator && (
        <DesmosCalculatorModal
          isOpen={isDesmosOpen}
          onClose={() => setIsDesmosOpen(false)}
        />
      )}
    </div>
  );
};
