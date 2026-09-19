import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileUp,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  UploadCloud,
  Check,
  Zap
} from 'lucide-react';
import { api } from '../../services/api';
import { PdfProcessingJob } from '@quizforge/shared';
import { Badge } from '../../components/Badge';

export const PdfUploadPage: React.FC = () => {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJob, setCurrentJob] = useState<PdfProcessingJob | null>(null);
  const [error, setError] = useState('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError('');
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF documents (.pdf) are supported.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleStartUpload = async (fileToUpload?: File) => {
    const target = fileToUpload || selectedFile;
    if (!target) return;

    setError('');
    setIsProcessing(true);

    try {
      const uploadRes = await api.uploadPdf(target);
      setCurrentJob(uploadRes.job);

      if (uploadRes.job.status === 'completed' || uploadRes.job.status === 'requires_review') {
        setIsProcessing(false);
        navigate(`/admin/review/${uploadRes.job.id}`);
        return;
      }

      // Poll job status until completed (fallback if asynchronous)
      const pollInterval = setInterval(async () => {
        try {
          const res = await api.getPdfJob(uploadRes.job.id);
          setCurrentJob(res.job);

          if (res.job.status === 'completed' || res.job.status === 'requires_review') {
            clearInterval(pollInterval);
            setIsProcessing(false);
            // Navigate to Extraction Review Screen
            navigate(`/admin/review/${res.job.id}`);
          } else if (res.job.status === 'failed') {
            clearInterval(pollInterval);
            setIsProcessing(false);
            setError(res.job.errorMessage || 'Failed to extract questions from PDF.');
          }
        } catch (pollErr: any) {
          clearInterval(pollInterval);
          setIsProcessing(false);
          setError(pollErr.message || 'Error tracking processing progress.');
        }
      }, 750);
    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || 'Upload failed. Please check the file.');
    }
  };

  // Helper to load bundled sample PDF for instant testing
  const handleLoadSample = async (sampleName: 'format_a' | 'format_b' | 'format_c') => {
    setError('');
    setIsProcessing(true);

    const filenames = {
      format_a: 'format_a_marked_answers.pdf',
      format_b: 'format_b_answer_key.pdf',
      format_c: 'format_c_visual_marking.pdf'
    };

    try {
      // Fetch sample PDF from API static uploads
      const resp = await fetch(`/uploads/${filenames[sampleName]}`);
      if (!resp.ok) {
        throw new Error(`Sample file not found. Ensure backend server is running.`);
      }
      const blob = await resp.blob();
      const sampleFile = new File([blob], filenames[sampleName], { type: 'application/pdf' });
      setSelectedFile(sampleFile);
      await handleStartUpload(sampleFile);
    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || 'Failed to load sample PDF.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Upload MCQ Question Paper
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          QuizForge will parse questions, detect options, extract answers, and guide you through reviewing the quiz.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Drag & Drop Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-10 rounded-2xl border-2 border-dashed text-center transition-all ${
          isDragging
            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
        }`}
      >
        <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center mb-4">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {selectedFile ? selectedFile.name : 'Choose a PDF file or drag & drop here'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Supports Format A (marked), Format B (answer keys), and Format C (visual/scanned). Max 25MB.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-sm">
            Browse Computer
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileInput}
              disabled={isProcessing}
              className="hidden"
            />
          </label>

          {selectedFile && !isProcessing && (
            <button
              onClick={() => handleStartUpload()}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              Start Ingestion <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Real-time Processing Pipeline Progress Visualizer */}
      {isProcessing && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-brand-500 animate-ping"></div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Processing PDF Pipeline...
              </span>
            </div>
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
              {currentJob?.progress || 10}%
            </span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-brand-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${currentJob?.progress || 15}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2 text-[11px] font-medium text-slate-500 text-center">
            <div className={currentJob && currentJob.progress >= 15 ? 'text-brand-600 font-bold' : ''}>
              1. Text / OCR
            </div>
            <div className={currentJob && currentJob.progress >= 50 ? 'text-brand-600 font-bold' : ''}>
              2. Questions
            </div>
            <div className={currentJob && currentJob.progress >= 75 ? 'text-brand-600 font-bold' : ''}>
              3. Answer Detection
            </div>
            <div className={currentJob && currentJob.progress >= 100 ? 'text-brand-600 font-bold' : ''}>
              4. Review Ready
            </div>
          </div>
        </div>
      )}

      {/* One-Click Quick Sample Testing Section */}
      <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Quick Test with Pre-Packaged Sample Papers
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => handleLoadSample('format_a')}
            disabled={isProcessing}
            className="p-4 text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition-all shadow-sm group"
          >
            <div className="flex items-center justify-between mb-2">
              <Badge variant="primary">Format A</Badge>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600 transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Marked Answers
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Inline checkmarks (✓) and [x] answer indicators.
            </p>
          </button>

          <button
            onClick={() => handleLoadSample('format_b')}
            disabled={isProcessing}
            className="p-4 text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition-all shadow-sm group"
          >
            <div className="flex items-center justify-between mb-2">
              <Badge variant="info">Format B</Badge>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600 transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Separate Answer Key
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              End-of-paper key (e.g. 1-B, 2-C) mapping.
            </p>
          </button>

          <button
            onClick={() => handleLoadSample('format_c')}
            disabled={isProcessing}
            className="p-4 text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition-all shadow-sm group"
          >
            <div className="flex items-center justify-between mb-2">
              <Badge variant="warning">Format C</Badge>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600 transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Review Required Demo
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Visual markers + 1 ambiguous question for manual review.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
