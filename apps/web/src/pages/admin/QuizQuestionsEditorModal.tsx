import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Check,
  HelpCircle,
  Image as ImageIcon,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { Quiz, Question, Category, QuizDifficulty } from '@quizforge/shared';
import { api } from '../../services/api';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { ImageUploadPasteField } from '../../components/ImageUploadPasteField';

interface QuizQuestionsEditorModalProps {
  quiz: Quiz;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  categories: Category[];
}

export const QuizQuestionsEditorModal: React.FC<QuizQuestionsEditorModalProps> = ({
  quiz,
  isOpen,
  onClose,
  onUpdated,
  categories
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editing Question State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    questionText: '',
    imageUrl: '',
    explanation: '',
    difficulty: 'medium' as QuizDifficulty,
    categoryId: quiz.categoryId || '',
    options: [
      { letter: 'A', text: '', isCorrect: true },
      { letter: 'B', text: '', isCorrect: false },
      { letter: 'C', text: '', isCorrect: false },
      { letter: 'D', text: '', isCorrect: false }
    ],
    requiresReview: false
  });

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const res = await api.getQuizById(quiz.id);
      setQuestions(res.questions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadQuestions();
    }
  }, [isOpen, quiz.id]);

  const handleOpenAddQuestion = () => {
    setEditingQuestionId(null);
    setFormData({
      questionText: '',
      imageUrl: '',
      explanation: '',
      difficulty: quiz.difficulty,
      categoryId: quiz.categoryId || categories[0]?.id || '',
      options: [
        { letter: 'A', text: '', isCorrect: true },
        { letter: 'B', text: '', isCorrect: false },
        { letter: 'C', text: '', isCorrect: false },
        { letter: 'D', text: '', isCorrect: false }
      ],
      requiresReview: false
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setFormData({
      questionText: q.questionText,
      imageUrl: q.imageUrl || '',
      explanation: q.explanation || '',
      difficulty: q.difficulty,
      categoryId: q.categoryId || quiz.categoryId || '',
      options: q.options.map((o) => ({
        letter: o.optionLetter,
        text: o.text,
        isCorrect: o.isCorrect
      })),
      requiresReview: q.requiresReview
    });
    setIsFormModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.questionText.trim()) return;

    try {
      if (editingQuestionId) {
        await api.updateQuestion(editingQuestionId, {
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
        setSuccessMsg('Question successfully updated');
      } else {
        await api.createQuestion({
          quizId: quiz.id,
          questionText: formData.questionText,
          imageUrl: formData.imageUrl,
          explanation: formData.explanation,
          difficulty: formData.difficulty,
          categoryId: formData.categoryId || undefined,
          options: formData.options,
          requiresReview: formData.requiresReview
        });
        setSuccessMsg('New question added to quiz');
      }

      setIsFormModalOpen(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadQuestions();
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to save question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question from the quiz?')) return;
    try {
      await api.deleteQuestion(questionId);
      setSuccessMsg('Question deleted from quiz');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadQuestions();
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to delete question');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Questions — ${quiz.title}`}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Top Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 flex items-center justify-center font-black">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{quiz.title}</span>
                <Badge variant={quiz.status === 'published' ? 'success' : 'neutral'} size="sm">
                  {quiz.status}
                </Badge>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Total Questions: <strong className="text-brand-600 dark:text-brand-400">{questions.length}</strong> • Time Limit: {quiz.settings.timeLimitMinutes > 0 ? `${quiz.settings.timeLimitMinutes} mins` : 'Untimed'}
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenAddQuestion}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 self-start sm:self-auto transition-all"
          >
            <Plus className="w-4 h-4" /> Add Question to Quiz
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <Check className="w-4 h-4" /> {successMsg}
          </div>
        )}

        {/* Questions List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-semibold">Loading questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No Questions in this Quiz
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add your first question manually or paste questions and diagrams using the button below.
            </p>
            <button
              onClick={handleOpenAddQuestion}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold"
            >
              Add Question
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-400 capitalize">
                      {q.difficulty}
                    </span>
                    {q.requiresReview && (
                      <Badge variant="warning" size="sm">
                        Review Needed
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditQuestion(q)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Question"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Prompt */}
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                  {q.questionText}
                </h4>

                {/* Question Attached Diagram/Image */}
                {q.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2 max-h-56 flex items-center justify-center">
                    <img
                      src={q.imageUrl}
                      alt="Question Diagram"
                      className="max-h-48 rounded-lg object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Options List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        opt.isCorrect
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-bold'
                          : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div>
                        <span className="font-bold mr-1.5">{opt.optionLetter}.</span>
                        <span>{opt.text}</span>
                      </div>
                      {opt.isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <div className="text-xs text-slate-500 pt-1 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl">
                    <strong className="text-slate-700 dark:text-slate-300">Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm"
          >
            Close
          </button>
        </div>
      </div>

      {/* Question Form Modal (Add / Edit) */}
      {isFormModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsFormModalOpen(false)}
          title={editingQuestionId ? 'Edit Quiz Question' : 'Add Question to Quiz'}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveQuestion} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Question Text / Prompt
              </label>
              <textarea
                required
                rows={3}
                value={formData.questionText}
                onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                placeholder="Type question prompt here..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Question Image (Clipboard paste support) */}
            <ImageUploadPasteField
              imageUrl={formData.imageUrl}
              onChange={(url) => setFormData({ ...formData, imageUrl: url })}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Difficulty
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  <option value="">Default / None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-900 dark:text-white">
                Options & Correct Answer Selection
              </label>
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
                    className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="radio"
                      name="modal-correct-option-group"
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
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Correct</span>
                  </label>
                </div>
              ))}
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Explanation / Solution Rationale (Optional)
              </label>
              <textarea
                rows={2}
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="Explain why the correct answer is right..."
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Save Question
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
};
