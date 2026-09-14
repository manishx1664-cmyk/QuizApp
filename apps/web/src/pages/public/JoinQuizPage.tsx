import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Quiz } from '@quizforge/shared';

export const JoinQuizPage: React.FC = () => {
  const { code: urlCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();

  const [joinCode, setJoinCode] = useState(urlCode || '');
  const [learnerName, setLearnerName] = useState(() => localStorage.getItem('quizforge_learner_name') || '');
  const [quizPreview, setQuizPreview] = useState<{ quiz: Quiz; questionCount: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  // When code changes, optionally fetch quiz details to give instant feedback
  useEffect(() => {
    if (urlCode) {
      setJoinCode(urlCode.toUpperCase());
    }
  }, [urlCode]);

  useEffect(() => {
    const clean = joinCode.trim().toUpperCase();
    if (clean.length === 6) {
      setLoadingPreview(true);
      setError('');
      api.getQuizByJoinCode(clean)
        .then((res) => {
          setQuizPreview(res);
        })
        .catch((err) => {
          setQuizPreview(null);
          setError(err.message || 'Invalid join code');
        })
        .finally(() => {
          setLoadingPreview(false);
        });
    } else {
      setQuizPreview(null);
    }
  }, [joinCode]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a 6-character Join Code.');
      return;
    }
    if (!learnerName.trim()) {
      setError('Please enter your Name.');
      return;
    }

    setIsJoining(true);
    try {
      localStorage.setItem('quizforge_learner_name', learnerName.trim());
      const session = await api.joinQuizByCode(cleanCode, learnerName.trim());
      // Navigate to quiz player with session
      navigate(`/quiz/${session.quiz.id}`, { state: { session } });
    } catch (err: any) {
      setError(err.message || 'Failed to join quiz. Please verify the code and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100/80 dark:bg-brand-950/80 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" /> No Registration Required
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Join a Live Quiz
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Enter your name and the 6-character Join Code provided by your instructor
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Your Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alex Johnson"
                value={learnerName}
                onChange={(e) => setLearnerName(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                6-Character Join Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. K7P4X9"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-center text-lg font-black tracking-widest uppercase text-brand-600 dark:text-brand-400 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {loadingPreview && (
              <div className="p-3 text-center text-xs text-slate-400 animate-pulse">
                Finding quiz details...
              </div>
            )}

            {quizPreview && (
              <div className="p-4 rounded-2xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 space-y-2">
                <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300 font-bold text-sm">
                  <BookOpen className="w-4 h-4" />
                  <span>{quizPreview.quiz.title}</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400">
                  <span>{quizPreview.questionCount} Questions</span>
                  <span>•</span>
                  <span>{quizPreview.quiz.settings.timeLimitMinutes > 0 ? `${quizPreview.quiz.settings.timeLimitMinutes} min limit` : 'Untimed'}</span>
                  <span>•</span>
                  <span>Pass: {quizPreview.quiz.settings.passingPercentage}%</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isJoining}
              className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isJoining ? (
                <span>Starting Quiz...</span>
              ) : (
                <>
                  <span>Start Quiz Now</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link to="/" className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              ? Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
