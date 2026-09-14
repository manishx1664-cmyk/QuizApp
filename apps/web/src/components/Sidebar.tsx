import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileUp,
  BookOpen,
  HelpCircle,
  FolderTree,
  BarChart3,
  History,
  Settings
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Upload PDF', to: '/admin/upload', icon: FileUp },
    { label: 'Quizzes', to: '/admin/quizzes', icon: BookOpen },
    { label: 'Question Bank', to: '/admin/questions', icon: HelpCircle },
    { label: 'Categories', to: '/admin/categories', icon: FolderTree },
    { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
    { label: 'Audit Log', to: '/admin/audit', icon: History }
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Admin Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300 font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="p-3 bg-brand-50/60 dark:bg-brand-950/40 rounded-xl border border-brand-100 dark:border-brand-900/50">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-800 dark:text-brand-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          System Status: Online
        </div>
        <p className="text-[11px] text-brand-600/80 dark:text-brand-400/80 mt-1">
          PostgreSQL Engine active & ready.
        </p>
      </div>
    </aside>
  );
};
