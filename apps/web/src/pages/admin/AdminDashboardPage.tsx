import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileUp,
  BookOpen,
  Users,
  Award,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Plus,
  Eye,
  Download,
  Search,
  Check,
  X,
  HelpCircle,
  BarChart2
} from 'lucide-react';
import { api } from '../../services/api';
import { AnalyticsSummary, Quiz, Attempt, QuizResultResponse } from '@quizforge/shared';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';

export const AdminDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recentQuizzes, setRecentQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');

  // Response Sheet Modal State
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<QuizResultResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [sumRes, quizRes, attRes] = await Promise.all([
          api.getAnalyticsSummary(),
          api.getQuizzes(),
          api.getAdminAttempts({ limit: 50 })
        ]);
        setSummary(sumRes);
        setRecentQuizzes(quizRes.quizzes.slice(0, 6));
        setAttempts(attRes.attempts || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const handleOpenAttemptDetail = async (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setLoadingDetail(true);
    try {
      const res = await api.getAttemptResult(attemptId);
      setAttemptDetail(res);
    } catch (err) {
      console.error('Failed to fetch attempt details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredAttempts = attempts.filter((att) => {
    const nameMatch = (att.learnerName || att.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (att.quizTitle || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!nameMatch) return false;
    if (statusFilter === 'passed') return att.isPassed;
    if (statusFilter === 'failed') return !att.isPassed;
    return true;
  });

  const formatSeconds = (secs?: number | null) => {
    if (!secs) return '0s';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.round(secs % 60);
    if (mins === 0) return `${remainingSecs}s`;
    return `${mins}m ${remainingSecs}s`;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Administrator Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor quiz digitization, learner performance, and complete response sheets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/upload"
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all"
          >
            <FileUp className="w-4 h-4" /> Upload MCQ PDF
          </Link>
          <Link
            to="/admin/quizzes"
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Manually
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Quizzes</span>
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {summary?.totalQuizzes || 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({summary?.publishedQuizzes || 0} published)
            </span>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Learners</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {summary?.totalLearners || 0}
            </span>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Attempts</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {summary?.totalAttempts || 0}
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              {summary?.passRate || 0}% pass rate
            </span>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Average Score</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {summary?.averageScore || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Complete Learners' Performance Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-brand-600" /> Complete Learners' Performance & Exam Sheets
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live gradebook tracking all student submissions with interactive response inspection
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/api/attempts/admin/export"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export Gradebook (CSV)
            </a>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search learner name or quiz..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold text-slate-500">Filter:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              All ({attempts.length})
            </button>
            <button
              onClick={() => setStatusFilter('passed')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'passed'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Passed ({attempts.filter((a) => a.isPassed).length})
            </button>
            <button
              onClick={() => setStatusFilter('failed')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'failed'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Failed ({attempts.filter((a) => !a.isPassed).length})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-4">Learner Name</th>
                <th className="py-3 px-4">Quiz Title</th>
                <th className="py-3 px-4 text-center">Score / Total</th>
                <th className="py-3 px-4 text-center">Percentage</th>
                <th className="py-3 px-4 text-center">Time Spent</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Submitted At</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAttempts.length > 0 ? (
                filteredAttempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {att.learnerName || att.userName || 'Learner'}
                      </div>
                      {att.userEmail && (
                        <div className="text-[11px] text-slate-400">{att.userEmail}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300 max-w-xs truncate">
                      {att.quizTitle}
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-slate-900 dark:text-white text-sm">
                      {att.score} / {att.maxScore}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              att.isPassed ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(att.percentage ?? 0, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {att.percentage ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-500 font-medium">
                      {formatSeconds(att.timeTakenSeconds)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={att.isPassed ? 'success' : 'danger'}>
                        {att.isPassed ? 'Passed' : 'Failed'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400">
                      {new Date(att.submittedAt || att.startedAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenAttemptDetail(att.id)}
                        className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/60 text-brand-600 dark:text-brand-400 font-bold transition-all flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" /> Response Sheet
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No learner attempts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Response Sheet Modal */}
      <Modal
        isOpen={!!selectedAttemptId}
        onClose={() => {
          setSelectedAttemptId(null);
          setAttemptDetail(null);
        }}
        title={`Exam Response Sheet — ${attemptDetail?.attempt.learnerName || attemptDetail?.attempt.userName || 'Learner'}`}
        maxWidth="4xl"
      >
        {loadingDetail ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : attemptDetail ? (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
            {/* Scorecard Overview Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Learner</span>
                <h4 className="text-base font-black truncate">{attemptDetail.attempt.learnerName || attemptDetail.attempt.userName || 'Learner'}</h4>
                <p className="text-xs text-slate-400">{attemptDetail.quiz.title}</p>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Score</span>
                <h4 className="text-xl font-black text-emerald-400">
                  {attemptDetail.stats.score} / {attemptDetail.stats.totalQuestions}
                </h4>
                <span className="text-xs text-slate-300 font-semibold">{attemptDetail.stats.percentage}%</span>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Accuracy</span>
                <h4 className="text-base font-bold">
                  {attemptDetail.stats.correct} Correct • {attemptDetail.stats.incorrect} Wrong
                </h4>
                <span className="text-xs text-slate-400 font-medium">
                  {attemptDetail.stats.unattempted} skipped
                </span>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Result</span>
                <div>
                  <Badge variant={attemptDetail.stats.isPassed ? 'success' : 'danger'}>
                    {attemptDetail.stats.isPassed ? 'PASSED' : 'FAILED'}
                  </Badge>
                </div>
                <span className="text-xs text-slate-400 mt-1 block">
                  Time: {formatSeconds(attemptDetail.stats.timeTakenSeconds)}
                </span>
              </div>
            </div>

            {/* Questions Detailed Breakdown */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Question Responses ({attemptDetail.results?.length || 0})
              </h3>

              {(attemptDetail.results || []).map((res, index) => (
                <div
                  key={res.questionId}
                  className={`p-4 rounded-xl border transition-all ${
                    res.isCorrect
                      ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                      : res.selectedOptionId
                      ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center justify-center">
                        {index + 1}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {res.questionText}
                      </h4>
                    </div>

                    <Badge variant={res.isCorrect ? 'success' : res.selectedOptionId ? 'danger' : 'neutral'}>
                      {res.isCorrect ? 'Correct (+1)' : res.selectedOptionId ? 'Incorrect (0)' : 'Unattempted'}
                    </Badge>
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pl-8">
                    {res.options.map((opt) => {
                      const isStudentChoice = opt.id === res.selectedOptionId;
                      const isCorrectChoice = opt.id === res.correctOptionId;

                      let optClass = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300';
                      if (isCorrectChoice) {
                        optClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold';
                      } else if (isStudentChoice && !res.isCorrect) {
                        optClass = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-bold';
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${optClass}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-[10px]">
                              {opt.optionLetter}
                            </span>
                            <span>{opt.text}</span>
                          </div>

                          <div className="flex items-center gap-1 text-[10px]">
                            {isStudentChoice && (
                              <span className="px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 font-bold">
                                Student Choice
                              </span>
                            )}
                            {isCorrectChoice && (
                              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {res.explanation && (
                    <div className="mt-3 pl-8">
                      <div className="p-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-start gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Explanation:</strong> {res.explanation}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};