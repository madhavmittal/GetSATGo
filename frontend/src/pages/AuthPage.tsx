import React, { useState } from 'react';
import { GraduationCap, ArrowRight, Sparkles, Clock, Calculator } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [teacherInviteCode, setTeacherInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLoginMode) {
        await login(email, password);
      } else {
        await register(email, password, fullName, role, teacherInviteCode || undefined);
        setRegistrationSubmitted(true);
        setPassword('');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600 items-center justify-center text-white shadow-xl shadow-blue-500/25 mb-4">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome to <span className="text-blue-600">GetSATGo</span>
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
          The ultimate digital SAT practice platform with live timer, embedded Desmos, and drill analytics.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-100">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
              {error}
            </div>
          )}

          {registrationSubmitted ? (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                Your request has been submitted. You can sign in once an administrator approves your account.
              </div>
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => {
                  setRegistrationSubmitted(false);
                  setIsLoginMode(true);
                }}
              >
                Return to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLoginMode && (
                <>
                  <Input
                    label="Full Name"
                    type="text"
                    placeholder="e.g. Alex Chen"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Account Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('student')}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                          role === 'student'
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('teacher')}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                          role === 'teacher'
                            ? 'border-purple-600 bg-purple-50 text-purple-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Teacher
                      </button>
                    </div>
                  </div>
                  {role === 'teacher' && (
                    <Input
                      label="Teacher invitation code"
                      type="password"
                      value={teacherInviteCode}
                      onChange={(e) => setTeacherInviteCode(e.target.value)}
                      required
                    />
                  )}
                </>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                size="lg"
                className="w-full mt-2"
                isLoading={isLoading}
              >
                {isLoginMode ? 'Sign In' : `Create ${role === 'teacher' ? 'Teacher' : 'Student'} Account`}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}

          {!registrationSubmitted && (
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setError(null);
                setTeacherInviteCode('');
                setRegistrationSubmitted(false);
              }}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
            >
              {isLoginMode
                ? "Don't have an account? Create one"
                : 'Already have an account? Sign in'}
            </button>
          </div>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <Clock className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <div className="text-[11px] font-bold text-slate-800">Timed Mocks</div>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <Calculator className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <div className="text-[11px] font-bold text-slate-800">Desmos Built-in</div>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <Sparkles className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <div className="text-[11px] font-bold text-slate-800">Syllabus Drills</div>
          </div>
        </div>
      </div>
    </div>
  );
};

