import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, HelpCircle, Play, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { MockTestListItem } from '../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useSettings } from '../context/SettingsContext';

interface MockTestsListPageProps {
  onSelectTest?: (testId: number) => void;
}

export const MockTestsListPage: React.FC<MockTestsListPageProps> = ({ onSelectTest }) => {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [tests, setTests] = useState<MockTestListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMockTests();
      setTests(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load mock tests.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = (testId: number) => {
    if (onSelectTest) {
      onSelectTest(testId);
    } else {
      navigate(`/tests/${testId}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Full Mock Tests</h1>
          <p className="text-slate-500 text-sm mt-1">
            Official format Digital SAT adaptive simulation with built-in Desmos graphing calculator & live timer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="primary" className="text-xs px-3 py-1">
            Adaptive SAT Scoring (200-800 scale)
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm">Loading exam modules...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-slate-800">Mock Tests Unavailable</h3>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
          <Button onClick={loadTests} className="mt-4" size="sm">Retry</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <Card key={test.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <BookOpen className="w-5 h-5" />
                  </span>
                  {test.best_score ? (
                    <Badge variant="success">Best: {test.best_score} / 800</Badge>
                  ) : (
                    <Badge variant="secondary">Not Attempted</Badge>
                  )}
                </div>
                <CardTitle className="text-lg leading-snug">{test.title}</CardTitle>
                <CardDescription className="line-clamp-2 mt-2">
                  {test.description || 'Full-length Digital SAT practice exam.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{test.time_limit_minutes || settings.default_test_time_minutes} Minutes</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50">
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    <span>{test.total_questions} Questions</span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
                  <span>
                    {settings.enable_desmos_calculator ? 'Desmos Calculator Enabled' : 'No External Calculator'}
                  </span>
                  <span>{test.completed_attempts_count} Previous Attempts</span>
                </div>
              </CardContent>

              <CardFooter className="pt-3">
                <Button
                  onClick={() => handleStart(test.id)}
                  size="md"
                  className="w-full font-bold shadow-sm"
                >
                  <Play className="w-4 h-4 mr-1.5 fill-current" />
                  {test.completed_attempts_count > 0 ? 'Retake Exam' : 'Start Exam'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
