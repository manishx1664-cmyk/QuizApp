import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Clock, ArrowRight, BookOpen, RotateCcw } from 'lucide-react';
import { api } from '../../services/api';
import { Attempt } from '@quizforge/shared';
import { Badge } from '../../components/Badge';

export const AttemptHistoryPage: React.FC = () => {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await api.getMyAttempts();
        setAttempts(res.attempts);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const formatDuration = (sec?: number) => {
    if (!sec) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Attempt History
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review your quiz performance records, scores, and detailed answer keys
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {attempts.length === 0 ? (
          <div className="text-center py-16 p-8">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No attempts recorded</h3>
            <p className="text-xs text-slate-500 mt-1">Take a quiz to see your score history here.</p>
            <Link
              to="/learner/quizzes"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold"
            >
              Browse Quizzes <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold bg-slate-50/50 dark:bg-slate-800/50">
                  <th className="py-3.5 px-4">Quiz Title</th>
                  <th className="py-3.5 px-4">Date Taken</th>
                  <th className="py-3.5 px-4">Time Spent</th>
                  <th className="py-3.5 px-4 text-center">Score</th>
                  <th className="py-3.5 px-4 text-center">Result</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {att.quizTitle}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(att.startedAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      {formatDuration(att.timeTakenSeconds)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-black text-slate-900 dark:text-white">
                        {att.score} / {att.maxScore}
                      </span>{' '}
                      <span className="text-slate-400 font-semibold">({att.percentage}%)</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={att.isPassed ? 'success' : 'danger'}>
                        {att.isPassed ? 'Passed' : 'Failed'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/results/${att.id}`}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
