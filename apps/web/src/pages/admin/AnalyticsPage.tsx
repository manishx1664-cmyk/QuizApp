import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  Users,
  CheckCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { AnalyticsSummary } from '@quizforge/shared';
import { Badge } from '../../components/Badge';

export const AnalyticsPage: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await api.getAnalyticsSummary();
        setSummary(res);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const maxDistCount = summary?.scoreDistribution
    ? Math.max(...summary.scoreDistribution.map((d) => d.count), 1)
    : 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Performance & Question Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Deep diagnostic metrics, score distribution, and topic difficulty detection
        </p>
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Total Attempts</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {summary?.totalAttempts || 0}
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Pass Rate</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {summary?.passRate || 0}%
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Average Score</span>
          <div className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">
            {summary?.averageScore || 0}%
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Learners Evaluated</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {summary?.totalLearners || 0}
          </div>
        </div>
      </div>

      {/* Score Distribution Chart */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-600" /> Score Distribution (% Bracket)
        </h3>

        <div className="space-y-4">
          {summary?.scoreDistribution.map((d) => {
            const percentageWidth = Math.round((d.count / maxDistCount) * 100);
            return (
              <div key={d.range} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Score {d.range}</span>
                  <span>{d.count} attempt(s)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-brand-600 dark:bg-brand-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(percentageWidth, 3)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Most Difficult Questions Ranking Table */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Most Frequently Missed Questions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Identifies curriculum topics where learners struggle the most
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Question Prompt</th>
                <th className="py-3 px-4">Quiz Origin</th>
                <th className="py-3 px-4 text-center">Attempts</th>
                <th className="py-3 px-4 text-center">Accuracy Rate</th>
                <th className="py-3 px-4 text-center">Difficulty Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {summary?.difficultQuestions && summary.difficultQuestions.length > 0 ? (
                summary.difficultQuestions.map((dq) => (
                  <tr key={dq.questionId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 max-w-md">
                      {dq.questionText}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{dq.quizTitle}</td>
                    <td className="py-3.5 px-4 text-center font-medium">{dq.attempts}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`font-black ${
                          dq.correctRate < 50
                            ? 'text-rose-600'
                            : dq.correctRate < 75
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {dq.correctRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={dq.correctRate < 50 ? 'danger' : 'warning'}>
                        {dq.correctRate < 50 ? 'High Failure' : 'Moderate'}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Not enough attempt data to compute difficulty ranking yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
