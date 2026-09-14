import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Award,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { Quiz, Attempt } from '@quizforge/shared';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/Badge';

export const LearnerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLearnerData() {
      try {
        const [quizRes, attemptRes] = await Promise.all([
          api.getQuizzes({ status: 'published' }),
          api.getMyAttempts()
        ]);
        setQuizzes(quizRes.quizzes);
        setAttempts(attemptRes.attempts);
      } catch (err) {
        console.error('Failed to load learner dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLearnerData();
  }, []);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const completedAttempts = attempts.filter(
    (a) => a.status === 'submitted' || a.status === 'auto_submitted'
  );
  const totalScorePercentage = completedAttempts.reduce(
    (acc, cur) => acc + (cur.percentage || 0),
    0
  );
  const avgScore =
    completedAttempts.length > 0
      ? Math.round(totalScorePercentage / completedAttempts.length)
      : 0;
  const bestScore =
    completedAttempts.length > 0
      ? Math.max(...completedAttempts.map((a) => a.percentage || 0))
      : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-4">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-brand-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Learner Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'Learner'}!
          </h1>
          <p className="text-xs sm:text-sm text-brand-100 max-w-lg">
            Ready to test your knowledge? Explore available quizzes or review your past attempts.
          </p>
        </div>

        <Link
          to="/learner/quizzes"
          className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-brand-600 font-extrabold text-sm shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          Browse Quizzes <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Available Quizzes</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {quizzes.length}
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Quizzes Attempted</span>
          <div className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">
            {completedAttempts.length}
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Average Score</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {avgScore}%
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Best Score</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {bestScore}%
          </div>
        </div>
      </div>

      {/* Two Column Section: Available Quizzes & Recent Attempts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Available Quizzes */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-600" /> Featured Quizzes
            </h3>
            <Link
              to="/learner/quizzes"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {quizzes.slice(0, 4).map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between transition-all"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{q.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span>{q.questionCount} Questions</span>
                    <span>•</span>
                    <span>{q.settings.timeLimitMinutes} mins</span>
                    <span>•</span>
                    <span className="capitalize">{q.difficulty}</span>
                  </div>
                </div>
                <Link
                  to={`/quiz/${q.id}`}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                >
                  Start <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Attempts History */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" /> Recent Attempts
            </h3>
            <Link
              to="/learner/history"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              View History <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {attempts.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                You haven't completed any quizzes yet. Pick a quiz to begin!
              </div>
            ) : (
              attempts.slice(0, 4).map((att) => (
                <div
                  key={att.id}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {att.quizTitle}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {new Date(att.startedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {att.score}/{att.maxScore} ({att.percentage}%)
                      </div>
                      <Badge variant={att.isPassed ? 'success' : 'danger'}>
                        {att.isPassed ? 'Passed' : 'Failed'}
                      </Badge>
                    </div>
                    <Link
                      to={`/results/${att.id}`}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
