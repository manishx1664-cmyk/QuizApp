import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

// Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { JoinQuizPage } from './pages/public/JoinQuizPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { PdfUploadPage } from './pages/admin/PdfUploadPage';
import { ExtractionReviewPage } from './pages/admin/ExtractionReviewPage';
import { QuizManagementPage } from './pages/admin/QuizManagementPage';
import { QuestionBankPage } from './pages/admin/QuestionBankPage';
import { CategoriesPage } from './pages/admin/CategoriesPage';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';

// Learner Pages
import { LearnerDashboardPage } from './pages/learner/LearnerDashboardPage';
import { AvailableQuizzesPage } from './pages/learner/AvailableQuizzesPage';
import { QuizPlayerPage } from './pages/learner/QuizPlayerPage';
import { QuizResultPage } from './pages/learner/QuizResultPage';
import { AttemptHistoryPage } from './pages/learner/AttemptHistoryPage';

// Protected Route wrappers
const RequireAuth: React.FC<{ role?: 'admin' | 'learner' }> = ({ role }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/learner/dashboard'} replace />;
  }

  return <Outlet />;
};

// Admin Console Layout
const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Learner Standard Layout
const LearnerLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="flex-1 pb-12">
        <Outlet />
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<><Navbar /><LandingPage /></>} />
      <Route path="/join" element={<><Navbar /><JoinQuizPage /></>} />
      <Route path="/join/:code" element={<><Navbar /><JoinQuizPage /></>} />
      <Route path="/login" element={<><Navbar /><LoginPage /></>} />
      <Route path="/register" element={<><Navbar /><RegisterPage /></>} />

      {/* Public Distraction-Free Quiz Player & Results (Learner does not need to log in) */}
      <Route path="/quiz/:quizId" element={<QuizPlayerPage />} />
      <Route path="/results/:attemptId" element={<><Navbar /><QuizResultPage /></>} />

      {/* Admin Protected Routes */}
      <Route element={<RequireAuth role="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="upload" element={<PdfUploadPage />} />
          <Route path="review/:jobId" element={<ExtractionReviewPage />} />
          <Route path="quizzes" element={<QuizManagementPage />} />
          <Route path="questions" element={<QuestionBankPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="audit" element={<AuditLogsPage />} />
        </Route>
      </Route>

      {/* Registered Learner Protected Routes */}
      <Route element={<RequireAuth role="learner" />}>
        <Route path="/learner" element={<LearnerLayout />}>
          <Route index element={<Navigate to="/learner/dashboard" replace />} />
          <Route path="dashboard" element={<LearnerDashboardPage />} />
          <Route path="quizzes" element={<AvailableQuizzesPage />} />
          <Route path="history" element={<AttemptHistoryPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

