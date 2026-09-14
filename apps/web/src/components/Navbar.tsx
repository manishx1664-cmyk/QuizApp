import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Moon, Sun, LogOut, User as UserIcon, LayoutDashboard, BookOpen, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Badge } from './Badge';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, isLearner, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 fill-white/20" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Quiz<span className="text-brand-600 dark:text-brand-400">Forge</span>
              </span>
              <span className="text-[10px] font-medium tracking-wider uppercase text-slate-500 dark:text-slate-400 -mt-1">
                Intelligent MCQ Engine
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" /> Admin Console
                    </Link>
                    <Link
                      to="/admin/upload"
                      className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-4 h-4" /> Upload PDF
                    </Link>
                    <Link
                      to="/admin/quizzes"
                      className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5 transition-colors"
                    >
                      <BookOpen className="w-4 h-4" /> Manage Quizzes
                    </Link>
                  </>
                )}
                {isLearner && (
                  <>
                    <Link
                      to="/learner/dashboard"
                      className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" /> My Dashboard
                    </Link>
                    <Link
                      to="/learner/quizzes"
                      className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5 transition-colors"
                    >
                      <BookOpen className="w-4 h-4" /> Available Quizzes
                    </Link>
                  </>
                )}
              </>
            ) : (
              <>
                <a href="/#features" className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Features
                </a>
                <a href="/#pipeline" className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  How It Works
                </a>
                <a href="/#formats" className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  PDF Formats
                </a>
              </>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
                <Link
                  to="/join"
                  className="px-3 py-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 rounded-xl hover:bg-brand-100 dark:hover:bg-brand-900 transition-colors"
                >
                  Join Code
                </Link>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {user?.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge variant={isAdmin ? 'primary' : 'success'} size="sm">
                      {isAdmin ? 'Admin' : 'Learner'}
                    </Badge>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/join"
                  className="px-3.5 py-2 text-xs sm:text-sm font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 rounded-xl hover:bg-brand-100 dark:hover:bg-brand-900 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Join Quiz
                </Link>
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md shadow-brand-500/20 transition-all hover:shadow-lg hover:shadow-brand-500/30"
                >
                  Get Started
                </Link>
              </div>
            )}

          </div>
        </div>
      </div>
    </nav>
  );
};
