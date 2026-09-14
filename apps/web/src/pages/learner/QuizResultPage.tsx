import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ArrowRight,
  HelpCircle,
  Printer,
  ShieldCheck,
  AlertCircle,
  Home
} from 'lucide-react';
import { api } from '../../services/api';
import { QuizResultResponse } from '@quizforge/shared';
import { Badge } from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';

export const QuizResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { isAuthenticated, isAdmin } = useAuth();
  const [result, setResult] = useState<QuizResultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadResult() {
      if (!attemptId) return;
      try {
        const data = await api.getAttemptResult(attemptId);
        setResult(data);

        // Confetti burst on pass
        if (data.attempt.isPassed) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load result');
      } finally {
        setLoading(false);
      }
    }
    loadResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Unable to View Result</h2>
        <p className="text-xs text-slate-500">{error || 'Result details not found.'}</p>
        <Link
          to={isAuthenticated ? (isAdmin ? '/admin/dashboard' : '/learner/dashboard') : '/'}
          className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold inline-block"
        >
          {isAuthenticated ? 'Return to Dashboard' : 'Return to Home'}
        </Link>
      </div>
    );
  }


  const { attempt, quiz, stats, results, reviewAllowed, showCorrectAnswers, showExplanations } = result;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-8">
      {/* Score Hero Banner */}
      <div
        className={`p-8 rounded-3xl border shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${
          attempt.isPassed
            ? 'bg-gradient-to-tr from-emerald-500/10 via-white to-emerald-500/5 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border-emerald-300 dark:border-emerald-800'
            : 'bg-gradient-to-tr from-rose-500/10 via-white to-rose-500/5 dark:from-rose-950/40 dark:via-slate-900 dark:to-slate-900 border-rose-300 dark:border-rose-800'
        }`}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={attempt.isPassed ? 'success' : 'danger'} size="md">
              {attempt.isPassed ? 'PASSED' : 'FAILED'}
            </Badge>
            <span className="text-xs font-bold text-slate-500">
              Pass Mark: {quiz.settings.passingPercentage}%
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {quiz.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Completed on {new Date(attempt.submittedAt || attempt.startedAt).toLocaleString()}
          </p>
        </div>

        {/* Big Score Dial */}
        <div className="text-right sm:text-right">
          <div className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            {stats.percentage}%
          </div>
          <div className="text-sm font-bold text-slate-500 mt-1">
            Score: {stats.score} / {stats.totalQuestions}
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-400">Attempted</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {stats.attempted} / {stats.totalQuestions}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-400">Correct Answers</span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.correct}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-400">Incorrect Answers</span>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {stats.incorrect}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <span className="text-xs font-semibold text-slate-400">Time Taken</span>
          <div className="text-xl font-black text-brand-600 dark:text-brand-400 mt-1">
            {formatDuration(stats.timeTakenSeconds)}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <Link
            to={isAuthenticated ? (isAdmin ? '/admin/dashboard' : '/learner/dashboard') : '/'}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
          >
            <Home className="w-4 h-4" /> {isAuthenticated ? 'Dashboard' : 'Home'}
          </Link>

          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print Results
          </button>
        </div>

        {quiz.settings.allowRetake && (
          <Link
            to={`/quiz/${quiz.id}`}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Retake Quiz
          </Link>
        )}
      </div>

      {/* Question-by-Question Review Breakdown */}
      {reviewAllowed && results ? (
        <div className="space-y-6 pt-4">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Question-by-Question Analysis
          </h2>

          <div className="space-y-4">
            {results.map((q, idx) => (
              <div
                key={q.questionId}
                className={`p-6 rounded-2xl border space-y-4 bg-white dark:bg-slate-900 shadow-sm ${
                  q.isCorrect
                    ? 'border-slate-200 dark:border-slate-800'
                    : 'border-rose-200 dark:border-rose-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    Question {idx + 1} of {results.length}
                  </span>

                  {q.isCorrect ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Correct (+1)
                    </span>
                  ) : q.selectedOptionId ? (
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Incorrect (0)
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <HelpCircle className="w-4 h-4" /> Unanswered (0)
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {q.questionText}
                </h3>

                {/* Question Image if present */}
                {q.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2 max-h-64 flex items-center justify-center">
                    <img
                      src={q.imageUrl}
                      alt="Question Diagram"
                      className="max-h-56 max-w-full rounded-lg object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const isLearnerPick = opt.id === q.selectedOptionId;
                    const isTheCorrect = opt.id === q.correctOptionId;

                    let optStyle = 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400';

                    if (showCorrectAnswers && isTheCorrect) {
                      optStyle =
                        'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-bold ring-1 ring-emerald-500';
                    } else if (isLearnerPick && !q.isCorrect) {
                      optStyle =
                        'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 font-bold ring-1 ring-rose-500';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between ${optStyle}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{opt.optionLetter}.</span>
                          <span>{opt.text}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isLearnerPick && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                              Your Choice
                            </span>
                          )}
                          {showCorrectAnswers && isTheCorrect && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white uppercase tracking-wider">
                              Correct Choice
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {showExplanations && q.explanation && (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      Solution Explanation:
                    </span>{' '}
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-brand-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Score-Only Assessment
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Detailed question breakdowns are hidden for this quiz based on the instructor's assessment settings.
          </p>
        </div>
      )}
    </div>
  );
};
