import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Play,
  Eye,
  Settings,
  Copy,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle,
  Filter,
  Search,
  Check,
  Clock,
  Shuffle,
  Layers
} from 'lucide-react';
import { api } from '../../services/api';
import { Quiz, QuizStatus, QuizDifficulty, Category, Question } from '@quizforge/shared';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { QuizQuestionsEditorModal } from './QuizQuestionsEditorModal';

export const QuizManagementPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Settings Modal State
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Preview Modal State
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Manage Questions Modal State
  const [questionsModalQuiz, setQuestionsModalQuiz] = useState<Quiz | null>(null);

  // Publish Warning Modal
  const [publishWarning, setPublishWarning] = useState<{ quizId: string; msg: string } | null>(null);

  const loadQuizzes = async () => {
    try {
      const [quizRes, catRes] = await Promise.all([
        api.getQuizzes({
          status: (statusFilter as QuizStatus) || undefined,
          search: search || undefined
        }),
        api.getCategories()
      ]);
      setQuizzes(quizRes.quizzes);
      setCategories(catRes.categories);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, [statusFilter, search]);

  const handlePublish = async (quizId: string, force = false) => {
    setError('');
    setPublishWarning(null);
    try {
      const res = await api.publishQuiz(quizId, force);
      if (res.warning) {
        setPublishWarning({ quizId, msg: res.warning });
      } else {
        setSuccessMsg('Quiz published successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
        await loadQuizzes();
      }
    } catch (err: any) {
      if (err.message && err.message.includes('review')) {
        setPublishWarning({ quizId, msg: err.message });
      } else {
        setError(err.message || 'Failed to publish quiz');
      }
    }
  };

  const handleUnpublish = async (quizId: string) => {
    try {
      await api.updateQuiz(quizId, { status: 'draft' });
      setSuccessMsg('Quiz reverted to draft');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadQuizzes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDuplicate = async (quizId: string) => {
    try {
      await api.duplicateQuiz(quizId);
      setSuccessMsg('Quiz duplicated successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadQuizzes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (quizId: string) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await api.deleteQuiz(quizId);
      setSuccessMsg('Quiz deleted');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadQuizzes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenPreview = async (quiz: Quiz) => {
    try {
      const res = await api.getQuizById(quiz.id);
      setPreviewQuiz(res.quiz);
      setPreviewQuestions(res.questions);
      setPreviewModalOpen(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz) return;
    try {
      await api.updateQuiz(selectedQuiz.id, {
        settings: selectedQuiz.settings
      });
      setSettingsModalOpen(false);
      setSuccessMsg('Quiz settings updated');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadQuizzes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Quiz Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure, preview, publish, and export your digitized MCQ question sets
          </p>
        </div>

        <Link
          to="/admin/upload"
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Upload New PDF
        </Link>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search quizzes by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Quiz Cards Table / List */}
      <div className="space-y-3">
        {quizzes.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No quizzes found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Upload a PDF question paper to automatically generate a quiz!
            </p>
          </div>
        ) : (
          quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {quiz.title}
                  </h3>
                  <Badge
                    variant={
                      quiz.status === 'published'
                        ? 'success'
                        : quiz.status === 'draft'
                        ? 'warning'
                        : 'neutral'
                    }
                  >
                    {quiz.status}
                  </Badge>
                  <span className="text-[11px] font-semibold text-slate-400 capitalize">
                    {quiz.difficulty}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {quiz.description || 'No description provided.'}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    <strong>{quiz.questionCount}</strong> Questions
                  </span>
                  <span>•</span>
                  <span>
                    <strong>{quiz.settings.timeLimitMinutes}</strong> min timer
                  </span>
                  <span>•</span>
                  <span>
                    Pass: <strong>{quiz.settings.passingPercentage}%</strong>
                  </span>
                  <span>•</span>
                  <span>
                    <strong>{quiz.attemptCount}</strong> Attempts
                  </span>
                  {quiz.categoryName && (
                    <>
                      <span>•</span>
                      <span className="text-brand-600 dark:text-brand-400 font-semibold">
                        {quiz.categoryName}
                      </span>
                    </>
                  )}
                </div>

                {quiz.status === 'published' && quiz.joinCode && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Join Code:</span>
                    <span className="font-mono text-xs sm:text-sm font-black text-brand-600 dark:text-brand-400 tracking-widest px-2 py-0.5 rounded-lg bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800">
                      {quiz.joinCode}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(quiz.joinCode!);
                        setSuccessMsg(`Join Code ${quiz.joinCode} copied!`);
                        setTimeout(() => setSuccessMsg(''), 2500);
                      }}
                      className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-colors"
                      title="Copy 6-digit Code"
                    >
                      <Copy className="w-3 h-3" /> Copy Code
                    </button>
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/join/${quiz.joinCode}`;
                        navigator.clipboard.writeText(link);
                        setSuccessMsg(`Direct Join Link copied!`);
                        setTimeout(() => setSuccessMsg(''), 2500);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 transition-colors"
                      title="Copy Direct Join URL for students"
                    >
                      Copy Link
                    </button>
                  </div>
                )}
              </div>


              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Manage Questions Button */}
                <button
                  onClick={() => setQuestionsModalQuiz(quiz)}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-brand-500/20"
                  title="View, edit, add and delete questions in this quiz"
                >
                  <Layers className="w-3.5 h-3.5" /> Manage Questions
                </button>

                {/* Preview Button */}
                <button
                  onClick={() => handleOpenPreview(quiz)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Preview exact learner experience"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>

                {/* Publish / Unpublish Toggle */}
                {quiz.status === 'published' ? (
                  <button
                    onClick={() => handleUnpublish(quiz.id)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all"
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    onClick={() => handlePublish(quiz.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Publish
                  </button>
                )}

                {/* Settings Button */}
                <button
                  onClick={() => {
                    setSelectedQuiz(quiz);
                    setSettingsModalOpen(true);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Configure quiz settings"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Duplicate Button */}
                <button
                  onClick={() => handleDuplicate(quiz.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Duplicate Quiz"
                >
                  <Copy className="w-4 h-4" />
                </button>

                {/* Export Dropdown / Buttons */}
                <a
                  href={api.exportQuizUrl(quiz.id, 'json')}
                  download
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
                  title="Export to JSON"
                >
                  <Download className="w-3 h-3" /> JSON
                </a>
                <a
                  href={api.exportQuizUrl(quiz.id, 'csv')}
                  download
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
                  title="Export to CSV"
                >
                  <Download className="w-3 h-3" /> CSV
                </a>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(quiz.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                  title="Delete Quiz"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Publish Warning Confirmation Modal */}
      {publishWarning && (
        <Modal
          isOpen={true}
          onClose={() => setPublishWarning(null)}
          title="Review Warning Before Publishing"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Unresolved Questions Detected:</span>
                <p className="mt-1">{publishWarning.msg}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Publishing without resolving correct answers may result in questions that cannot be graded properly. Are you sure you wish to publish anyway?
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPublishWarning(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Go Back to Review
              </button>
              <button
                type="button"
                onClick={() => handlePublish(publishWarning.quizId, true)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md"
              >
                Publish Anyway
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Settings Modal */}
      {settingsModalOpen && selectedQuiz && (
        <Modal
          isOpen={true}
          onClose={() => setSettingsModalOpen(false)}
          title={`Quiz Settings: ${selectedQuiz.title}`}
          maxWidth="xl"
        >
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Time Limit (Minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  value={selectedQuiz.settings.timeLimitMinutes}
                  onChange={(e) =>
                    setSelectedQuiz({
                      ...selectedQuiz,
                      settings: {
                        ...selectedQuiz.settings,
                        timeLimitMinutes: parseInt(e.target.value, 10) || 0
                      }
                    })
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
                <span className="text-[10px] text-slate-400">0 for unlimited / untimed</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Passing Percentage (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={selectedQuiz.settings.passingPercentage}
                  onChange={(e) =>
                    setSelectedQuiz({
                      ...selectedQuiz,
                      settings: {
                        ...selectedQuiz.settings,
                        passingPercentage: parseInt(e.target.value, 10) || 60
                      }
                    })
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Randomization & Display Toggles
              </span>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedQuiz.settings.randomizeQuestions}
                  onChange={(e) =>
                    setSelectedQuiz({
                      ...selectedQuiz,
                      settings: {
                        ...selectedQuiz.settings,
                        randomizeQuestions: e.target.checked
                      }
                    })
                  }
                  className="rounded text-brand-600"
                />
                <span>Randomize Question Order for Each Learner</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedQuiz.settings.randomizeOptions}
                  onChange={(e) =>
                    setSelectedQuiz({
                      ...selectedQuiz,
                      settings: {
                        ...selectedQuiz.settings,
                        randomizeOptions: e.target.checked
                      }
                    })
                  }
                  className="rounded text-brand-600"
                />
                <span>Randomize Options Order (Safe with Stable Option IDs)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedQuiz.settings.showCorrectAnswers}
                  onChange={(e) =>
                    setSelectedQuiz({
                      ...selectedQuiz,
                      settings: {
                        ...selectedQuiz.settings,
                        showCorrectAnswers: e.target.checked
                      }
                    })
                  }
                  className="rounded text-brand-600"
                />
                <span>Show Correct Answers in Results Review</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedQuiz.settings.showExplanations}
                  onChange={(e) =>
                    setSelectedQuiz({
                      ...selectedQuiz,
                      settings: {
                        ...selectedQuiz.settings,
                        showExplanations: e.target.checked
                      }
                    })
                  }
                  className="rounded text-brand-600"
                />
                <span>Show Explanations in Results Review</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedQuiz.settings.allowRetake}
                  onChange={(e) =>
                    setSelectedQuiz({
                      ...selectedQuiz,
                      settings: {
                        ...selectedQuiz.settings,
                        allowRetake: e.target.checked
                      }
                    })
                  }
                  className="rounded text-brand-600"
                />
                <span>Allow Learner to Retake Quiz</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md"
              >
                Save Settings
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Exact Learner Simulation Preview Modal */}
      {previewModalOpen && previewQuiz && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewModalOpen(false)}
          title={`Learner Preview: ${previewQuiz.title}`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            <div className="p-3 bg-brand-50 dark:bg-brand-950/40 rounded-xl border border-brand-200 dark:border-brand-800 text-xs text-brand-800 dark:text-brand-300">
              <strong>Preview Mode:</strong> This simulates the exact questions, choices, and timer layout learners will see.
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {previewQuestions.map((q, i) => (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">
                      Question {i + 1} of {previewQuestions.length}
                    </span>
                    <Badge variant={q.requiresReview ? 'warning' : 'neutral'}>
                      {q.requiresReview ? 'Needs Review' : 'Verified'}
                    </Badge>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {q.questionText}
                  </h4>

                  <div className="space-y-2">
                    {q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                          opt.isCorrect
                            ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div>
                          <span className="font-bold mr-1.5">{opt.optionLetter}.</span> {opt.text}
                        </div>
                        {opt.isCorrect && (
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                            Correct Answer (Hidden in live quiz)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="text-xs text-slate-500 pt-1">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Direct Quiz Questions Editor Modal */}
      {questionsModalQuiz && (
        <QuizQuestionsEditorModal
          quiz={questionsModalQuiz}
          isOpen={true}
          onClose={() => setQuestionsModalQuiz(null)}
          onUpdated={loadQuizzes}
          categories={categories}
        />
      )}
    </div>
  );
};
