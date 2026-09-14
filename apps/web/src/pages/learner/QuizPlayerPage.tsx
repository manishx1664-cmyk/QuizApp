import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Clock,
  Flag,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Menu,
  X,
  RotateCcw
} from 'lucide-react';
import { api } from '../../services/api';
import { ActiveQuizAttemptSession, LearnerQuestionView } from '@quizforge/shared';
import { Modal } from '../../components/Modal';

export const QuizPlayerPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] = useState<ActiveQuizAttemptSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState<
    Record<string, { selectedOptionId?: string; isMarkedForReview: boolean }>
  >({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(-1);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initial load
  useEffect(() => {
    async function initQuizSession() {
      // If session passed from JoinQuizPage state, use directly
      const stateSession = (location.state as any)?.session as ActiveQuizAttemptSession | undefined;
      if (stateSession) {
        setSession(stateSession);
        setSecondsRemaining(stateSession.remainingSeconds);

        const initAnswers: Record<string, { selectedOptionId?: string; isMarkedForReview: boolean }> = {};
        for (const q of stateSession.questions) {
          initAnswers[q.id] = {
            selectedOptionId: q.selectedOptionId,
            isMarkedForReview: q.isMarkedForReview
          };
        }
        setAnswersMap(initAnswers);
        setLoading(false);
        return;
      }

      if (!quizId) return;
      try {
        const data = await api.startQuizAttempt(quizId);
        setSession(data);
        setSecondsRemaining(data.remainingSeconds);

        // Preload answers
        const initAnswers: Record<string, { selectedOptionId?: string; isMarkedForReview: boolean }> = {};
        for (const q of data.questions) {
          initAnswers[q.id] = {
            selectedOptionId: q.selectedOptionId,
            isMarkedForReview: q.isMarkedForReview
          };
        }
        setAnswersMap(initAnswers);
      } catch (err: any) {
        setError(err.message || 'Failed to start quiz');
      } finally {
        setLoading(false);
      }
    }
    initQuizSession();
  }, [quizId, location.state]);


  // Countdown Timer with Auto-Submit
  useEffect(() => {
    if (secondsRemaining < 0) return; // untimed

    if (secondsRemaining === 0) {
      // Time is up! Auto-submit
      handleFinalSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  // Handle Option Selection with Auto-Save
  const handleSelectOption = async (optionId: string) => {
    if (!session) return;
    const currentQuestion = session.questions[currentIndex];
    const newAnswers = {
      ...answersMap,
      [currentQuestion.id]: {
        selectedOptionId: optionId,
        isMarkedForReview: answersMap[currentQuestion.id]?.isMarkedForReview || false
      }
    };
    setAnswersMap(newAnswers);

    // Trigger auto-save
    setIsAutoSaving(true);
    try {
      const res = await api.recordAnswer(
        session.attempt.id,
        currentQuestion.id,
        optionId,
        newAnswers[currentQuestion.id].isMarkedForReview
      );
      if (res.autoSubmitted) {
        navigate(`/results/${session.attempt.id}`);
      }
    } catch (err) {
      console.warn('Auto-save error:', err);
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Clear Selection
  const handleClearAnswer = async () => {
    if (!session) return;
    const currentQuestion = session.questions[currentIndex];
    const newAnswers = {
      ...answersMap,
      [currentQuestion.id]: {
        selectedOptionId: undefined,
        isMarkedForReview: answersMap[currentQuestion.id]?.isMarkedForReview || false
      }
    };
    setAnswersMap(newAnswers);

    setIsAutoSaving(true);
    try {
      await api.recordAnswer(
        session.attempt.id,
        currentQuestion.id,
        null,
        newAnswers[currentQuestion.id].isMarkedForReview
      );
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Toggle Mark for Review
  const handleToggleReview = async () => {
    if (!session) return;
    const currentQuestion = session.questions[currentIndex];
    const currentAnswer = answersMap[currentQuestion.id];
    const newReviewState = !currentAnswer?.isMarkedForReview;

    const newAnswers = {
      ...answersMap,
      [currentQuestion.id]: {
        selectedOptionId: currentAnswer?.selectedOptionId,
        isMarkedForReview: newReviewState
      }
    };
    setAnswersMap(newAnswers);

    setIsAutoSaving(true);
    try {
      await api.recordAnswer(
        session.attempt.id,
        currentQuestion.id,
        currentAnswer?.selectedOptionId || null,
        newReviewState
      );
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Final Submit
  const handleFinalSubmit = async (isAuto = false) => {
    if (!session) return;
    try {
      const result = await api.submitQuizAttempt(session.attempt.id, isAuto);
      navigate(`/results/${session.attempt.id}`);
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500">Preparing distraction-free quiz session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Unable to Start Quiz</h2>
          <p className="text-xs text-slate-500">{error || 'Quiz session could not be established.'}</p>
          <button
            onClick={() => navigate('/join')}
            className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold"
          >
            Back to Join Quiz
          </button>

        </div>
      </div>
    );
  }

  const currentQuestion = session.questions[currentIndex];
  const currentAnswer = answersMap[currentQuestion.id];
  const isMarked = !!currentAnswer?.isMarkedForReview;

  // Format timer
  const formatTime = (totalSeconds: number) => {
    if (totalSeconds < 0) return 'Untimed';
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timer warning style
  const isTimerCritical = secondsRemaining >= 0 && secondsRemaining <= 60;
  const isTimerWarning = secondsRemaining > 60 && secondsRemaining <= 300;

  // Question navigation counts
  const answeredCount = Object.values(answersMap).filter((a) => !!a.selectedOptionId).length;
  const markedCount = Object.values(answersMap).filter((a) => a.isMarkedForReview).length;
  const totalQuestions = session.questions.length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
      {/* Sticky Header with Timer and Progress */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNavDrawerOpen(!isNavDrawerOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {isNavDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight line-clamp-1">
              {session.quiz.title}
            </h1>
            <div className="text-[11px] font-semibold text-slate-500">
              Question {currentIndex + 1} of {totalQuestions}
            </div>
          </div>
        </div>

        {/* Center Auto-save Status */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>{isAutoSaving ? 'Saving...' : 'Answers saved'}</span>
        </div>

        {/* Right Timer Badge & Submit Button */}
        <div className="flex items-center gap-3">
          {secondsRemaining >= 0 && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-black border transition-all ${
                isTimerCritical
                  ? 'bg-rose-100 border-rose-300 text-rose-700 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300 animate-pulse'
                  : isTimerWarning
                  ? 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300'
                  : 'bg-slate-100 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>
          )}

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/25 transition-all"
          >
            Submit Quiz
          </button>
        </div>
      </header>

      {/* Main Player Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-8">
        {/* Left/Main Question Card */}
        <main className="flex-1 flex flex-col justify-between bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
          <div className="space-y-6">
            {/* Question Top Bar */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/70 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-black">
                Question {currentIndex + 1}
              </span>

              <button
                onClick={handleToggleReview}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  isMarked
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{isMarked ? 'Marked for Review' : 'Mark for Review'}</span>
              </button>
            </div>

            {/* Question Text */}
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
              {currentQuestion.questionText}
            </h2>

            {/* Question Image if present */}
            {currentQuestion.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 max-h-80 flex items-center justify-center">
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question Diagram or Illustration"
                  className="max-h-72 max-w-full rounded-xl object-contain shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Options List */}
            <div className="space-y-3 pt-2">
              {currentQuestion.options.map((opt) => {
                const isSelected = currentAnswer?.selectedOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 group ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/70 dark:bg-brand-950/40 shadow-sm ring-1 ring-brand-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl border flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 group-hover:border-brand-400'
                      }`}
                    >
                      {opt.optionLetter}
                    </div>
                    <span
                      className={`text-sm sm:text-base leading-relaxed ${
                        isSelected
                          ? 'font-bold text-brand-950 dark:text-brand-100'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              {currentAnswer?.selectedOptionId && (
                <button
                  onClick={handleClearAnswer}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear Selection
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-40 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>

              {currentIndex < totalQuestions - 1 ? (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                >
                  Review & Submit <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </main>

        {/* Right Side Question Navigator Palette */}
        <aside
          className={`fixed inset-y-0 right-0 z-40 w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-2xl transition-transform md:relative md:inset-auto md:translate-x-0 md:rounded-3xl md:border md:shadow-sm ${
            isNavDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Question Palette
              </h3>
              <button
                onClick={() => setIsNavDrawerOpen(false)}
                className="md:hidden text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigator Summary Indicators */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span>Answered: {answeredCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                <span>Unanswered: {totalQuestions - answeredCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span>Marked: {markedCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-brand-500"></span>
                <span>Current</span>
              </div>
            </div>

            {/* Navigator Grid */}
            <div className="grid grid-cols-5 gap-2 pt-2 max-h-[50vh] overflow-y-auto pr-1">
              {session.questions.map((q, idx) => {
                const ans = answersMap[q.id];
                const isAnswered = !!ans?.selectedOptionId;
                const isQMarked = !!ans?.isMarkedForReview;
                const isCurrent = idx === currentIndex;

                let btnStyles = 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';

                if (isAnswered) {
                  btnStyles = 'bg-emerald-500 text-white border-emerald-600 font-bold';
                }

                if (isQMarked) {
                  btnStyles = 'bg-amber-500 text-white border-amber-600 font-bold';
                }

                if (isCurrent) {
                  btnStyles += ' ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-900';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsNavDrawerOpen(false);
                    }}
                    className={`h-10 rounded-xl border text-xs flex items-center justify-center transition-all ${btnStyles}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
            >
              Submit Quiz
            </button>
          </div>
        </aside>
      </div>

      {/* Submit Confirmation Modal */}
      {isSubmitModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsSubmitModalOpen(false)}
          title="Confirm Quiz Submission"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {answeredCount}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">Answered</div>
              </div>
              <div>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                  {totalQuestions - answeredCount}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">Unanswered</div>
              </div>
              <div>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400">
                  {markedCount}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">Marked Review</div>
              </div>
            </div>

            {totalQuestions - answeredCount > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  You have {totalQuestions - answeredCount} unanswered question(s). Are you sure you want to submit?
                </span>
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Once submitted, your answers will be finalized and graded by the backend engine.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Return to Quiz
              </button>
              <button
                type="button"
                onClick={() => handleFinalSubmit(false)}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/25"
              >
                Yes, Submit Quiz
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
