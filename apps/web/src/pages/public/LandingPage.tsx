import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  FileText,
  Brain,
  CheckCircle2,
  Clock,
  ShieldCheck,
  BarChart2,
  ArrowRight,
  Upload,
  Check,
  HelpCircle,
  Award
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/Badge';

export const LandingPage: React.FC = () => {
  const { quickDemoLogin, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleQuickDemo = async (role: 'admin' | 'learner1') => {
    await quickDemoLogin(role);
    if (role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/learner/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-brand-50/50 via-white to-white dark:from-slate-900/50 dark:via-slate-950 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100/80 dark:bg-brand-950/80 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen MCQ Digitization Engine
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight sm:leading-tight">
            Turn Any PDF Question Paper into an{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400">
              Interactive Online Quiz
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            QuizForge intelligently parses question papers with inline checkmarks, separate answer keys, or visual markings. Complete with distraction-free testing, timer countdowns, and automated grading.
          </p>

          {/* Quick Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/join"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all hover:scale-105"
            >
              <Sparkles className="w-4 h-4" /> Join Quiz with Code (No Login)
            </Link>

            {isAuthenticated ? (
              <Link
                to={isAdmin ? '/admin/dashboard' : '/learner/dashboard'}
                className="px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-all hover:scale-105"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-all hover:scale-105"
                >
                  Create Free Account <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Demo Quick-Launch Bar */}
          <div className="mt-8 p-4 max-w-xl mx-auto bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">

            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Instant 1-Click Demo Access
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleQuickDemo('admin')}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-brand-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 hover:border-brand-300 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-brand-600" /> Demo as Admin
              </button>
              <button
                onClick={() => handleQuickDemo('learner1')}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 hover:border-emerald-300 flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4 text-emerald-600" /> Demo as Learner
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Supported PDF Formats */}
      <section id="formats" className="py-20 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="primary">Multi-Format Extraction</Badge>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
              Supports Every Question Paper Layout
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              QuizForge doesn't enforce rigid formatting. Its adaptive parser recognizes answers whether marked inline, listed at the end, or visually highlighted.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Format A */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold mb-4">
                A
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Marked Answers
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Questions where the correct option is indicated inline via checkmark (✓), [x], or (Correct) tags.
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 space-y-1">
                <div>Q1. What is Java?</div>
                <div>A. Database</div>
                <div className="text-emerald-600 dark:text-emerald-400 font-bold">B. Programming language ✓</div>
                <div>C. Operating system</div>
              </div>
            </div>

            {/* Format B */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold mb-4">
                B
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Separate Answer Keys
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Questions followed by a dedicated answer sheet or key at the end of the document (e.g. 1-B, 2-C).
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 space-y-1">
                <div>1. Virtual DOM purpose?</div>
                <div>2. React side-effect hook?</div>
                <div className="text-brand-600 dark:text-brand-400 font-bold pt-1">Answer Key: 1 - B, 2 - B</div>
              </div>
            </div>

            {/* Format C */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold mb-4">
                C
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Visual Marks & Safety Check
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Circles, asterisks, or bold text. If an answer cannot be detected with confidence, it flags for review!
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 space-y-1">
                <div>Q3. Binary search complexity?</div>
                <div className="text-amber-600 dark:text-amber-400 font-bold">
                  ⚠️ Verification Required
                </div>
                <div className="text-slate-400">Admin selects answer before publish</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline Explanation */}
      <section id="pipeline" className="py-20 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="info">Automated Pipeline</Badge>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
              From Raw PDF to Live Interactive Quiz
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              A resilient asynchronous multi-stage ingestion architecture built for speed and 100% data integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { step: '01', title: 'PDF Upload', desc: 'Secure asynchronous file upload with size & type validation.' },
              { step: '02', title: 'Text & OCR', desc: 'Direct layout stream extraction with automatic Tesseract OCR fallback.' },
              { step: '03', title: 'Smart Parsing', desc: 'Detects question boundaries, multi-line options, and answer keys.' },
              { step: '04', title: 'Admin Review', desc: 'Interactive card review with confidence tags and 1-click answer editor.' },
              { step: '05', title: 'Publish & Score', desc: 'Timed quiz player, automatic auto-saving, and server-side grading.' }
            ].map((item, idx) => (
              <div
                key={item.step}
                className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 relative group hover:border-brand-500 transition-colors"
              >
                <div className="text-3xl font-black text-brand-600/20 dark:text-brand-400/20 mb-2">
                  {item.step}
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-slate-50 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="success">Production Ready</Badge>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
              Engineered for Real Classrooms & EdTech Platforms
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Accurate Quiz Timer
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Countdown timer persisted against page refreshes with warnings at 10m, 5m, and 1m, and auto-submission at 0:00.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Zero Answer Leakage
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Correct answers and explanations are strictly stripped from student payloads. Scoring is 100% computed on backend.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Safe Option Randomization
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Options and questions can be safely randomized. Option IDs remain invariant so answer validation never breaks.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Duplicate Question Detection
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Warns instructor when duplicate questions appear across pages or imports, with options to merge or delete.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Topic & Question Analytics
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Deep analytics showcasing score distributions, pass rates, and the most difficult questions missed by learners.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  JSON & CSV Export
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  One-click export of complete quizzes and question banks into standard CSV and JSON format for external LMS systems.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">QuizForge</span>
            <span>— Intelligent MCQ Quiz Platform</span>
          </div>
          <div>PostgreSQL Database • React • TypeScript • Tailwind CSS</div>
        </div>
      </footer>
    </div>
  );
};
