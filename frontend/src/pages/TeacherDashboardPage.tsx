import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Award, 
  BookOpen, 
  PlusCircle, 
  CheckCircle, 
  Clock, 
  Search, 
  Sparkles,
  HelpCircle,
  FileCheck,
  Send,
  Sliders,
  RotateCcw,
  ShieldCheck,
  Check,
  X,
  Eye,
  Calendar,
  ChevronRight,
  TrendingUp,
  Target
} from 'lucide-react';
import { api } from '../services/api';
import { CohortOverview, StudentDetail, SettingItem, PendingRegistration } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

export const TeacherDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { adminSettings, loadAdminSettings, updateAdminSettings, resetAdminSettings } = useSettings();

  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'questions' | 'settings' | 'approvals'>('roster');
  const [cohort, setCohort] = useState<CohortOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [reviewingRegistrationId, setReviewingRegistrationId] = useState<number | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  // Selected student for deep inspection
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [isLoadingStudentDetail, setIsLoadingStudentDetail] = useState(false);

  // Settings modification state
  const [editedSettings, setEditedSettings] = useState<Record<string, any>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  // New question form state
  const [domain, setDomain] = useState('Math');
  const [topic, setTopic] = useState('Algebra');
  const [difficulty, setDifficulty] = useState('Medium');
  const [qType, setQType] = useState<'mcq' | 'spr'>('mcq');
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ]);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [explanation, setExplanation] = useState('');
  const [tips, setTips] = useState('');
  const [isSubmittingQ, setIsSubmittingQ] = useState(false);
  const [questionNotice, setQuestionNotice] = useState<string | null>(null);

  useEffect(() => {
    loadCohort();
    loadAdminSettings();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'approvals' && user?.role === 'admin') {
      loadPendingRegistrations();
    }
  }, [activeSubTab, user?.role]);

  const loadCohort = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCohortOverview();
      setCohort(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInspectStudent = async (studentId: number) => {
    setSelectedStudentId(studentId);
    setIsLoadingStudentDetail(true);
    try {
      const detail = await api.getStudentDetail(studentId);
      setStudentDetail(detail);
    } catch (err) {
      console.error("Failed to load student detail:", err);
    } finally {
      setIsLoadingStudentDetail(false);
    }
  };

  const loadPendingRegistrations = async () => {
    setIsLoadingRegistrations(true);
    setRegistrationError(null);
    try {
      setPendingRegistrations(await api.getPendingRegistrations());
    } catch (err) {
      setRegistrationError(err instanceof Error ? err.message : 'Failed to load registration requests.');
    } finally {
      setIsLoadingRegistrations(false);
    }
  };

  const handleReviewRegistration = async (registrationId: number, approve: boolean) => {
    setReviewingRegistrationId(registrationId);
    setRegistrationError(null);
    try {
      if (approve) {
        await api.approveRegistration(registrationId);
      } else {
        await api.rejectRegistration(registrationId);
      }
      await loadPendingRegistrations();
      await loadCohort();
    } catch (err) {
      setRegistrationError(err instanceof Error ? err.message : 'Failed to review registration.');
    } finally {
      setReviewingRegistrationId(null);
    }
  };

  // Setting edit handlers
  const handleSettingChange = (key: string, val: any) => {
    setEditedSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveAllSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateAdminSettings(editedSettings);
      setSettingsNotice('System settings successfully saved and applied site-wide!');
      setEditedSettings({});
      setTimeout(() => setSettingsNotice(null), 4000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleResetSettings = async () => {
    if (!window.confirm('Reset all feature settings to factory defaults?')) return;
    setIsSavingSettings(true);
    try {
      await resetAdminSettings();
      setEditedSettings({});
      setSettingsNotice('All system settings restored to default presets.');
      setTimeout(() => setSettingsNotice(null), 4000);
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingQ(true);
    try {
      await api.createTeacherQuestion({
        domain,
        topic,
        difficulty,
        question_type: qType,
        prompt,
        options: qType === 'mcq' ? options : undefined,
        correct_answer: correctAnswer,
        explanation,
        tips: tips || undefined,
      });

      setQuestionNotice(`Question successfully published to ${topic}!`);
      setTimeout(() => {
        setQuestionNotice(null);
        setPrompt('');
        setExplanation('');
        setTips('');
      }, 3000);
    } catch (err: any) {
      alert(`Error creating question: ${err.message}`);
    } finally {
      setIsSubmittingQ(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm">Loading educator command center...</p>
      </div>
    );
  }

  const filteredStudents = cohort?.students.filter((s) =>
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Group settings by category
  const settingsByCategory: Record<string, SettingItem[]> = {};
  adminSettings.forEach((item) => {
    if (!settingsByCategory[item.category]) {
      settingsByCategory[item.category] = [];
    }
    settingsByCategory[item.category].push(item);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Educator Control Center</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Instructor Management Hub</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Monitor student cohorts, author custom questions, and control all site features dynamically.
          </p>
        </div>

        {/* Sub-tab navigation bar */}
        <div className="flex items-center gap-1 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveSubTab('roster')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'roster'
                ? 'bg-white text-purple-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Student Roster
          </button>

          <button
            onClick={() => setActiveSubTab('questions')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'questions'
                ? 'bg-white text-purple-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Add Question
          </button>

          <button
            onClick={() => setActiveSubTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'settings'
                ? 'bg-white text-purple-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Feature Controls
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveSubTab('approvals')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeSubTab === 'approvals'
                  ? 'bg-white text-purple-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Approvals
              {pendingRegistrations.length > 0 && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-700">
                  {pendingRegistrations.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Cohort KPIs (Always visible across tabs for quick teacher reference) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-400">Total Enrolled</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{cohort?.total_students || 0}</div>
          <div className="text-xs text-slate-500 mt-0.5">Registered students</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-400">Mock Tests Taken</div>
          <div className="text-3xl font-extrabold text-blue-600 mt-1">{cohort?.total_mock_attempts || 0}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total completed exams</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-400">Cohort Avg Score</div>
          <div className="text-3xl font-extrabold text-purple-700 mt-1">{cohort?.cohort_avg_score || 520}</div>
          <div className="text-xs text-slate-500 mt-0.5">Out of 800 module scale</div>
        </div>
      </div>

      {/* SUB-TAB 1: STUDENT ROSTER & INSPECTION */}
      {activeSubTab === 'roster' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Student Roster & Performance</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any student row to inspect their mock test score progression & drill history.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search student by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Mocks</th>
                  <th className="px-4 py-3.5">Drills</th>
                  <th className="px-4 py-3.5">Avg Score</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStudents.map((s) => (
                  <tr 
                    key={s.id} 
                    onClick={() => handleInspectStudent(s.id)}
                    className="hover:bg-purple-50/40 cursor-pointer transition select-none"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{s.full_name}</div>
                      <div className="text-slate-400 text-[11px]">{s.email}</div>
                    </td>
                    <td className="px-4 py-4 font-mono font-semibold">{s.tests_completed}</td>
                    <td className="px-4 py-4 font-mono font-semibold">{s.drills_completed}</td>
                    <td className="px-4 py-4">
                      {s.avg_score ? (
                        <span className="font-bold text-sm text-purple-700">{s.avg_score} / 800</span>
                      ) : (
                        <span className="text-slate-400">None yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspectStudent(s.id);
                        }}
                        className="text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
                      >
                        Inspect
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {activeSubTab === 'approvals' && user?.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Account Requests</CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Approve accounts to grant access, or reject requests to remove them.
            </p>
          </CardHeader>
          <CardContent>
            {registrationError && (
              <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {registrationError}
              </div>
            )}
            {isLoadingRegistrations ? (
              <p className="py-8 text-center text-sm text-slate-500">Loading requests...</p>
            ) : pendingRegistrations.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">There are no pending account requests.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingRegistrations.map((registration) => (
                  <div key={registration.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{registration.full_name}</div>
                      <div className="text-sm text-slate-500">{registration.email}</div>
                      <div className="mt-1 text-xs capitalize text-slate-400">
                        {registration.role} · Requested {new Date(registration.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewRegistration(registration.id, false)}
                        disabled={reviewingRegistrationId !== null}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleReviewRegistration(registration.id, true)}
                        isLoading={reviewingRegistrationId === registration.id}
                        disabled={reviewingRegistrationId !== null}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SUB-TAB 2: QUESTION AUTHORING */}
      {activeSubTab === 'questions' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Add New SAT Practice Question</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Instantly author and publish high-yield questions to your students' mock exams and drill sessions.
            </p>
          </div>

          {questionNotice && (
            <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{questionNotice}</span>
            </div>
          )}

          <form onSubmit={handleCreateQuestion} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Domain</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Math">Math</option>
                  <option value="Reading & Writing">Reading & Writing</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Topic</label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Algebra">Algebra</option>
                  <option value="Advanced Math">Advanced Math</option>
                  <option value="Geometry & Trigonometry">Geometry & Trigonometry</option>
                  <option value="Problem-Solving & Data Analysis">Problem-Solving</option>
                  <option value="Craft & Structure">Craft & Structure</option>
                  <option value="Information & Ideas">Information & Ideas</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Question Type</label>
              <div className="flex gap-6 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="qtype"
                    checked={qType === 'mcq'}
                    onChange={() => setQType('mcq')}
                  />
                  <span className="font-semibold">Multiple Choice (MCQ - 4 Options)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="qtype"
                    checked={qType === 'spr'}
                    onChange={() => setQType('spr')}
                  />
                  <span className="font-semibold">Student-Produced Response (SPR - Float Numeric)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Question Prompt</label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. In right triangle ABC, angle C is 90 degrees..."
                className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {qType === 'mcq' ? (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-700 block">Answer Choices</label>
                {options.map((opt, i) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <span className="w-6 font-bold text-xs text-slate-500">{opt.id}:</span>
                    <input
                      type="text"
                      placeholder={`Option ${opt.id}`}
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[i].text = e.target.value;
                        setOptions(newOpts);
                      }}
                      className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                      required
                    />
                  </div>
                ))}
                <div className="pt-2 flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-700">Correct Choice:</label>
                  <select
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="text-xs p-2 rounded-lg border border-slate-200 bg-white font-bold text-blue-600"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <label className="text-xs font-bold text-blue-900 mb-1 block">
                  Correct Numeric Answer (e.g. 5, 3.5, or 7/2)
                </label>
                <input
                  type="text"
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  placeholder="e.g. 12"
                  className="w-full max-w-xs text-sm font-bold font-mono p-2.5 rounded-xl border border-slate-200 bg-white"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Teacher Step-by-Step Explanation</label>
              <textarea
                rows={2}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Step 1: Solve for x... Step 2: Substitute into..."
                className="w-full text-xs p-3.5 rounded-xl border border-slate-200"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Strategy Pro Tip (Optional)</label>
              <input
                type="text"
                value={tips}
                onChange={(e) => setTips(e.target.value)}
                placeholder="e.g. Use the Desmos calculator to graph both equations instantly."
                className="w-full text-xs p-3 rounded-xl border border-slate-200"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                type="submit"
                size="md"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                isLoading={isSubmittingQ}
              >
                <Send className="w-4 h-4 mr-2" />
                Publish Question to Bank
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 3: SYSTEM SETTINGS & FEATURE CONTROLS */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Administrator Feature Controls</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Modify exam timers, calculators, score thresholds, and drill defaults.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetSettings}
                disabled={isSavingSettings}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Restore Defaults
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 font-bold"
                onClick={handleSaveAllSettings}
                isLoading={isSavingSettings}
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Save Changes
              </Button>
            </div>
          </div>

          {settingsNotice && (
            <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{settingsNotice}</span>
            </div>
          )}

          {/* Grouped Category Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(settingsByCategory).map(([category, items]) => (
              <Card key={category}>
                <CardHeader className="bg-slate-50/70 border-b border-slate-100">
                  <CardTitle className="text-sm font-extrabold text-purple-900 uppercase tracking-wider">
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-slate-100 p-0">
                  {items.map((item) => {
                    const currentVal = editedSettings[item.key] !== undefined ? editedSettings[item.key] : item.value;

                    return (
                      <div key={item.key} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                        <div className="space-y-0.5 max-w-sm">
                          <div className="font-bold text-xs text-slate-900">{item.label}</div>
                          <div className="text-[11px] text-slate-400 leading-snug">{item.description}</div>
                        </div>

                        <div>
                          {item.setting_type === 'boolean' ? (
                            <button
                              type="button"
                              onClick={() => handleSettingChange(item.key, !currentVal)}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                currentVal ? 'bg-purple-600' : 'bg-slate-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  currentVal ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          ) : (
                            <input
                              type="number"
                              value={currentVal}
                              onChange={(e) => handleSettingChange(item.key, parseFloat(e.target.value))}
                              className="w-20 text-xs font-bold font-mono text-right p-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* STUDENT DETAIL INSPECTION DRAWER/MODAL (Eliminates dead end!) */}
      {selectedStudentId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {studentDetail?.student.full_name || 'Student Profile'}
                </h3>
                <p className="text-xs text-slate-400">{studentDetail?.student.email}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedStudentId(null);
                  setStudentDetail(null);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingStudentDetail ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Fetching student attempts and analytics...
              </div>
            ) : studentDetail ? (
              <div className="space-y-6">
                {/* Mock Tests Attempts History */}
                <div>
                  <h4 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    Mock Test Attempts ({studentDetail.test_attempts.length})
                  </h4>
                  {studentDetail.test_attempts.length === 0 ? (
                    <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl">No mock exams completed yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                      {studentDetail.test_attempts.map((t) => (
                        <div key={t.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                          <div>
                            <div className="font-bold text-slate-900">{t.mock_test_title}</div>
                            <div className="text-[11px] text-slate-400">{new Date(t.completed_at).toLocaleDateString()}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-purple-700 text-sm">{t.scaled_score} / 800</span>
                            <span className="text-[11px] text-slate-400 block font-mono">
                              {t.raw_score}/{t.total_questions} correct
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Drill Practice History */}
                <div>
                  <h4 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-emerald-600" />
                    Syllabus Drill Sessions ({studentDetail.drill_attempts.length})
                  </h4>
                  {studentDetail.drill_attempts.length === 0 ? (
                    <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl">No drill questions practiced yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                      {studentDetail.drill_attempts.map((d) => (
                        <div key={d.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                          <div>
                            <span className="font-bold text-slate-900">{d.topic}</span>
                            <Badge variant="outline" className="ml-2 text-[10px]">{d.difficulty}</Badge>
                          </div>
                          <div className="font-mono text-slate-700">
                            {d.correct_count} / {d.total_questions} correct ({d.time_spent_seconds}s)
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
