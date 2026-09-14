import React, { useEffect, useState } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Edit3,
  Copy,
  Trash2,
  History,
  AlertCircle,
  CheckCircle,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import { Question, QuestionVersion, Category, QuizDifficulty } from '@quizforge/shared';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ImageUploadPasteField } from '../../components/ImageUploadPasteField';

export const QuestionBankPage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  // Version History Modal
  const [selectedVersions, setSelectedVersions] = useState<QuestionVersion[]>([]);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [historyQuestionTitle, setHistoryQuestionTitle] = useState('');

  // Manual Creation / Edit Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    questionText: string;
    imageUrl?: string;
    explanation: string;
    difficulty: QuizDifficulty;
    categoryId: string;
    options: { letter: string; text: string; isCorrect: boolean }[];
    requiresReview: boolean;
  }>({
    questionText: '',
    imageUrl: '',
    explanation: '',
    difficulty: 'medium',
    categoryId: '',
    options: [
      { letter: 'A', text: '', isCorrect: true },
      { letter: 'B', text: '', isCorrect: false },
      { letter: 'C', text: '', isCorrect: false },
      { letter: 'D', text: '', isCorrect: false }
    ],
    requiresReview: false
  });

  const loadData = async () => {
    try {
      const [qRes, catRes] = await Promise.all([
        api.getQuestions({
          search: search || undefined,
          categoryId: categoryFilter || undefined,
          difficulty: (difficultyFilter as QuizDifficulty) || undefined,
          requiresReview: reviewOnly ? true : undefined
        }),
        api.getCategories()
      ]);
      setQuestions(qRes.questions);
      setCategories(catRes.categories);
    } catch (err: any) {
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, categoryFilter, difficultyFilter, reviewOnly]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      questionText: '',
      imageUrl: '',
      explanation: '',
      difficulty: 'medium',
      categoryId: categories[0]?.id || '',
      options: [
        { letter: 'A', text: '', isCorrect: true },
        { letter: 'B', text: '', isCorrect: false },
        { letter: 'C', text: '', isCorrect: false },
        { letter: 'D', text: '', isCorrect: false }
      ],
      requiresReview: false
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    setEditingId(q.id);
    setFormData({
      questionText: q.questionText,
      imageUrl: q.imageUrl || '',
      explanation: q.explanation || '',
      difficulty: q.difficulty,
      categoryId: q.categoryId || '',
      options: q.options.map((o) => ({
        letter: o.optionLetter,
        text: o.text,
        isCorrect: o.isCorrect
      })),
      requiresReview: q.requiresReview
    });
    setIsFormOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.questionText.trim()) return;

    try {
      if (editingId) {
        await api.updateQuestion(editingId, {
          questionText: formData.questionText,
          imageUrl: formData.imageUrl,
          explanation: formData.explanation,
          difficulty: formData.difficulty,
          categoryId: formData.categoryId || undefined,
          options: formData.options.map((o) => ({
            letter: o.letter,
            text: o.text,
            isCorrect: o.isCorrect
          })),
          requiresReview: formData.requiresReview
        });
        setSuccessMsg('Question updated and version recorded');
      } else {
        await api.createQuestion({
          questionText: formData.questionText,
          imageUrl: formData.imageUrl,
          explanation: formData.explanation,
          difficulty: formData.difficulty,
          categoryId: formData.categoryId || undefined,
          options: formData.options,
          requiresReview: formData.requiresReview
        });
        setSuccessMsg('Question added to Question Bank');
      }
      setIsFormOpen(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.duplicateQuestion(id);
      setSuccessMsg('Question cloned');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this question from question bank?')) return;
    try {
      await api.deleteQuestion(id);
      setSuccessMsg('Question deleted');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleViewVersions = async (q: Question) => {
    try {
      const res = await api.getQuestionVersions(q.id);
      setSelectedVersions(res.versions);
      setHistoryQuestionTitle(q.questionText);
      setVersionModalOpen(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Question Bank
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Central repository of all MCQ questions with audit history and version comparison
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 self-start sm:self-auto transition-all"
        >
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search questions by text or solution..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={reviewOnly}
              onChange={(e) => setReviewOnly(e.target.checked)}
              className="rounded text-brand-600"
            />
            <span>Review Required Only</span>
          </label>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.map((q) => (
          <div
            key={q.id}
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 capitalize">
                  {q.difficulty}
                </span>
                {q.categoryName && (
                  <>
                    <span>•</span>
                    <span className="text-xs text-brand-600 font-semibold">{q.categoryName}</span>
                  </>
                )}
                <span>•</span>
                <span className="text-xs text-slate-400">v{q.version}</span>
              </div>

              <div className="flex items-center gap-2">
                {q.requiresReview ? (
                  <Badge variant="warning">Verification Required</Badge>
                ) : (
                  <Badge variant="success">Verified</Badge>
                )}

                <button
                  onClick={() => handleViewVersions(q)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="View version history"
                >
                  <History className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenEdit(q)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Edit question"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDuplicate(q.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Duplicate question"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                  title="Delete question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {q.questionText}
            </h3>

            {/* Question Image if present */}
            {q.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2 max-h-60 flex items-center justify-center">
                <img
                  src={q.imageUrl}
                  alt="Question Illustration"
                  className="max-h-52 rounded-lg object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt) => (
                <div
                  key={opt.id}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    opt.isCorrect
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                      : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div>
                    <span className="font-bold mr-1">{opt.optionLetter}.</span> {opt.text}
                  </div>
                  {opt.isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
              ))}
            </div>

            {q.explanation && (
              <div className="text-xs text-slate-500 pt-1">
                <strong>Solution Rationale:</strong> {q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit Question Modal */}
      {isFormOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsFormOpen(false)}
          title={editingId ? 'Edit Question & Save Version' : 'Create New MCQ Question'}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveQuestion} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Question Text
              </label>
              <textarea
                required
                rows={3}
                value={formData.questionText}
                onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                placeholder="Type the question prompt..."
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
            </div>

            {/* Question Image (Clipboard paste or file upload) */}
            <ImageUploadPasteField
              imageUrl={formData.imageUrl}
              onChange={(url) => setFormData({ ...formData, imageUrl: url })}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                >
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Difficulty
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Options (Select correct answer)
              </span>
              {formData.options.map((opt, idx) => (
                <div key={opt.letter} className="flex items-center gap-2">
                  <span className="w-6 font-bold text-sm text-slate-500">{opt.letter}.</span>
                  <input
                    type="text"
                    required
                    value={opt.text}
                    onChange={(e) => {
                      const newOpts = [...formData.options];
                      newOpts[idx] = { ...newOpts[idx], text: e.target.value };
                      setFormData({ ...formData, options: newOpts });
                    }}
                    placeholder={`Option ${opt.letter} text...`}
                    className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                  />
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="correct-option-group"
                      checked={opt.isCorrect}
                      onChange={() => {
                        const newOpts = formData.options.map((o, i) => ({
                          ...o,
                          isCorrect: i === idx
                        }));
                        setFormData({ ...formData, options: newOpts, requiresReview: false });
                      }}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Correct</span>
                  </label>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Solution Explanation
              </label>
              <textarea
                rows={2}
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="Optional explanation visible to learners after submission..."
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20"
              >
                {editingId ? 'Save & Record Version' : 'Add Question'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Version History Comparison Modal */}
      {versionModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setVersionModalOpen(false)}
          title="Question Version History"
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs">
              <strong>Question:</strong> {historyQuestionTitle}
            </div>

            {selectedVersions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No past versions recorded. This question has not been modified since initial import.
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {selectedVersions.map((v, i) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span>Version Snapshot #{selectedVersions.length - i}</span>
                      <span>
                        Modified by {v.changedByName || 'Admin'} on{' '}
                        {new Date(v.changedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {v.questionText}
                    </div>
                    <div className="space-y-1">
                      {v.optionsJson.map((opt) => (
                        <div
                          key={opt.id}
                          className={`text-xs pl-2 ${
                            opt.isCorrect
                              ? 'text-emerald-600 font-bold'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {opt.optionLetter}. {opt.text} {opt.isCorrect && '✓'}
                        </div>
                      ))}
                    </div>
                    {v.explanation && (
                      <div className="text-[11px] text-slate-500">
                        <strong>Explanation:</strong> {v.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setVersionModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold"
              >
                Close History
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
