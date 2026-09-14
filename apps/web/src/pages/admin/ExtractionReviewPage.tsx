import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Edit3,
  Trash2,
  Check,
  ArrowRight,
  ShieldCheck,
  Plus,
  HelpCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { ExtractedQuestion, PdfProcessingJob, Category } from '@quizforge/shared';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ImageUploadPasteField } from '../../components/ImageUploadPasteField';

export const ExtractionReviewPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<PdfProcessingJob | null>(null);
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'review_required' | 'approved'>('all');

  // Edit Modal State
  const [editingQuestion, setEditingQuestion] = useState<ExtractedQuestion | null>(null);

  // Quiz Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [passingPercentage, setPassingPercentage] = useState(60);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!jobId) return;
      try {
        const [jobRes, catRes] = await Promise.all([
          api.getPdfJob(jobId),
          api.getCategories()
        ]);
        setJob(jobRes.job);
        setQuestions(jobRes.job.questions || []);
        setCategories(catRes.categories);
        setQuizTitle(jobRes.job.filename.replace('.pdf', '').replace(/[-_]/g, ' '));
        if (catRes.categories.length > 0) {
          setCategoryId(catRes.categories[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load extraction results.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [jobId]);

  // Update question correct answer directly on card
  const handleSelectAnswer = async (tempId: string, letter: string) => {
    const updated = questions.map((q) => {
      if (q.tempId === tempId) {
        return {
          ...q,
          detectedAnswerLetter: letter,
          detectionMethod: 'manual_required' as const,
          confidence: 1.0,
          requiresReview: false
        };
      }
      return q;
    });

    setQuestions(updated);
    if (jobId) {
      await api.updatePdfJobQuestions(jobId, updated);
    }
  };

  // Delete question
  const handleDeleteQuestion = async (tempId: string) => {
    const updated = questions.filter((q) => q.tempId !== tempId);
    setQuestions(updated);
    if (jobId) {
      await api.updatePdfJobQuestions(jobId, updated);
    }
  };

  // Dismiss duplicate warning
  const handleDismissDuplicate = async (tempId: string) => {
    const updated = questions.map((q) => {
      if (q.tempId === tempId) {
        return { ...q, duplicateWarning: false };
      }
      return q;
    });
    setQuestions(updated);
    if (jobId) {
      await api.updatePdfJobQuestions(jobId, updated);
    }
  };

  // Approve All questions that have answers
  const handleApproveAll = async () => {
    const updated = questions.map((q) => {
      if (q.detectedAnswerLetter) {
        return { ...q, requiresReview: false };
      }
      return q;
    });
    setQuestions(updated);
    if (jobId) {
      await api.updatePdfJobQuestions(jobId, updated);
    }
  };

  // Save changes from Edit Modal
  const handleSaveEditModal = async () => {
    if (!editingQuestion) return;
    const updated = questions.map((q) =>
      q.tempId === editingQuestion.tempId ? editingQuestion : q
    );
    setQuestions(updated);
    setEditingQuestion(null);
    if (jobId) {
      await api.updatePdfJobQuestions(jobId, updated);
    }
  };

  // Final Quiz Creation
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle.trim()) return;

    setError('');
    setIsSaving(true);

    try {
      const res = await api.createQuizFromExtraction({
        title: quizTitle.trim(),
        description: quizDescription.trim(),
        categoryId: categoryId || undefined,
        difficulty,
        settings: {
          timeLimitMinutes,
          passingPercentage
        },
        questions
      });

      // Navigate to Quiz Management page
      navigate('/admin/quizzes');
    } catch (err: any) {
      setError(err.message || 'Failed to create quiz');
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const reviewRequiredCount = questions.filter((q) => q.requiresReview).length;
  const duplicatesCount = questions.filter((q) => q.duplicateWarning).length;

  const filteredQuestions = questions.filter((q) => {
    if (activeFilter === 'review_required') return q.requiresReview;
    if (activeFilter === 'approved') return !q.requiresReview;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Extraction Review Interface
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verify detected questions and answers before publishing to learners
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleApproveAll}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600" /> Approve All
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center gap-2"
          >
            Create Quiz ({questions.length} Questions) <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Questions Found
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
            {questions.length}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Answers Detected
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {questions.filter((q) => !!q.detectedAnswerLetter).length}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Requires Review
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {reviewRequiredCount}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Duplicates Detected
          </span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
            {duplicatesCount}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeFilter === 'all'
              ? 'bg-brand-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All Questions ({questions.length})
        </button>
        <button
          onClick={() => setActiveFilter('review_required')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeFilter === 'review_required'
              ? 'bg-amber-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Review Required ({reviewRequiredCount})
        </button>
        <button
          onClick={() => setActiveFilter('approved')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeFilter === 'approved'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Approved ({questions.length - reviewRequiredCount})
        </button>
      </div>

      {/* Question Cards Grid */}
      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => (
          <div
            key={q.tempId}
            className={`p-6 bg-white dark:bg-slate-900 rounded-2xl border transition-all ${
              q.requiresReview
                ? 'border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-950/10'
                : 'border-slate-200 dark:border-slate-800 shadow-sm'
            }`}
          >
            {/* Question Header & Method Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center">
                  #{q.questionNumber || idx + 1}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Detection: {q.detectionMethod.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {q.requiresReview ? (
                  <Badge variant="warning">Answer Verification Required</Badge>
                ) : (
                  <Badge variant="success">Confidence: {Math.round(q.confidence * 100)}%</Badge>
                )}

                <button
                  onClick={() => setEditingQuestion(q)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Edit question text and explanation"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteQuestion(q.tempId)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                  title="Delete question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Duplicate Question Alert Banner */}
            {q.duplicateWarning && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4" />
                  <span>Possible duplicate question detected in paper.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDismissDuplicate(q.tempId)}
                    className="px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:underline"
                  >
                    Keep Both
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.tempId)}
                    className="px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    Delete Duplicate
                  </button>
                </div>
              </div>
            )}

            {/* Question Text */}
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              {q.questionText}
            </h3>

            {/* Question Image if present */}
            {q.imageUrl && (
              <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2 max-h-72 flex items-center justify-center">
                <img
                  src={q.imageUrl}
                  alt="Question Diagram"
                  className="max-h-64 rounded-lg object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Options Selector */}
            <div className="space-y-2">
              {q.options.map((opt) => {
                const isSelected = q.detectedAnswerLetter?.toUpperCase() === opt.letter.toUpperCase();
                return (
                  <label
                    key={opt.letter}
                    onClick={() => handleSelectAnswer(q.tempId, opt.letter)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.tempId}`}
                      checked={isSelected}
                      onChange={() => handleSelectAnswer(q.tempId, opt.letter)}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1 text-sm">
                      <span className="font-bold mr-1">{opt.letter}.</span> {opt.text}
                    </div>
                    {isSelected && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Correct Answer
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Explanation Note if exists */}
            {q.explanation && (
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                <span className="font-bold text-slate-700 dark:text-slate-300">Explanation:</span>{' '}
                {q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Question Modal */}
      {editingQuestion && (
        <Modal
          isOpen={true}
          onClose={() => setEditingQuestion(null)}
          title={`Edit Question #${editingQuestion.questionNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Question Text
              </label>
              <textarea
                rows={3}
                value={editingQuestion.questionText}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, questionText: e.target.value })
                }
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Question Image (Clipboard paste or upload) */}
            <ImageUploadPasteField
              imageUrl={editingQuestion.imageUrl}
              onChange={(url) => setEditingQuestion({ ...editingQuestion, imageUrl: url })}
            />

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Options
              </label>
              {editingQuestion.options.map((opt, i) => (
                <div key={opt.letter} className="flex items-center gap-2">
                  <span className="w-6 font-bold text-sm text-slate-500">{opt.letter}.</span>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => {
                      const newOpts = [...editingQuestion.options];
                      newOpts[i] = { ...newOpts[i], text: e.target.value };
                      setEditingQuestion({ ...editingQuestion, options: newOpts });
                    }}
                    className="flex-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                  />
                  <input
                    type="radio"
                    name="edit-modal-correct"
                    checked={editingQuestion.detectedAnswerLetter === opt.letter}
                    onChange={() =>
                      setEditingQuestion({
                        ...editingQuestion,
                        detectedAnswerLetter: opt.letter,
                        requiresReview: false
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Explanation
              </label>
              <textarea
                rows={2}
                value={editingQuestion.explanation || ''}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                }
                placeholder="Optional solution rationale..."
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditModal}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Quiz Creation & Publication Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCreateModalOpen(false)}
          title="Configure & Save Quiz"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateQuiz} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Quiz Title
              </label>
              <input
                type="text"
                required
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="e.g. Computer Networks Midterm"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Description
              </label>
              <textarea
                rows={2}
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
                placeholder="Instructions or topic summary..."
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Time Limit (Minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
                <span className="text-[10px] text-slate-400">0 for untimed</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Passing Percentage (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={passingPercentage}
                  onChange={(e) => setPassingPercentage(parseInt(e.target.value, 10) || 60)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? 'Creating Quiz...' : 'Save Quiz'} <Check className="w-4 h-4" />
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
