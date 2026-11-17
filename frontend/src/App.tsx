import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { MockTestsListPage } from './pages/MockTestsListPage';
import { TestRunnerPage } from './pages/TestRunnerPage';
import { TestResultPage } from './pages/TestResultPage';
import { DrillPracticePage } from './pages/DrillPracticePage';
import { TeacherDashboardPage } from './pages/TeacherDashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPage } from './pages/PrivacyPage';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-3">
        <img
          src="/getsatgo-logo.png"
          alt="GetSATGo"
          className="mb-2 w-52 max-w-[70vw] rounded-lg object-contain"
        />
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-semibold text-sm text-slate-300">Loading GetSATGo...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <Routes>
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/privacy" element={<PrivacyPage />} />

      {/* Dedicated full-screen exam simulation runner (No distraction, authentic Bluebook exam) */}
      <Route path="/tests/:testId" element={<TestRunnerPage />} />

      {/* Standard App Layout with Top Navbar */}
      <Route
        path="*"
        element={
          <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            <main className="flex-1 pb-16">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/tests" element={<MockTestsListPage />} />
                <Route path="/results/:attemptId" element={<TestResultPage />} />
                <Route path="/drills" element={<DrillPracticePage />} />
                <Route
                  path="/teacher"
                  element={
                    user.role === 'teacher' || user.role === 'admin' ? (
                      <TeacherDashboardPage />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
          </div>
        }
      />
    </Routes>
  );
};
