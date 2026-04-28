import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminRoute } from '@/components/AdminRoute';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ArticleListPage } from '@/pages/ArticleListPage';
import { ArticleDetailPage } from '@/pages/ArticleDetailPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ChatPage } from '@/pages/ChatPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

import { AdminLayout } from '@/pages/admin/AdminLayout';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminArticlesPage } from '@/pages/admin/AdminArticlesPage';
import { AdminArticleEditPage } from '@/pages/admin/AdminArticleEditPage';
import { AdminAssignmentEditPage } from '@/pages/admin/AdminAssignmentEditPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';

function withShell(node: JSX.Element): JSX.Element {
  return (
    <AppShell>
      <ErrorBoundary>{node}</ErrorBoundary>
    </AppShell>
  );
}

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route path="/" element={<ProtectedRoute>{withShell(<DashboardPage />)}</ProtectedRoute>} />
      <Route path="/articles" element={<ProtectedRoute>{withShell(<ArticleListPage />)}</ProtectedRoute>} />
      <Route path="/articles/:slug" element={<ProtectedRoute>{withShell(<ArticleDetailPage />)}</ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute>{withShell(<LeaderboardPage />)}</ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute>{withShell(<ProfilePage />)}</ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute>{withShell(<ChatPage />)}</ProtectedRoute>} />

      <Route path="/admin" element={<AdminRoute>{withShell(<AdminLayout />)}</AdminRoute>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="articles" element={<AdminArticlesPage />} />
        <Route path="articles/new" element={<AdminArticleEditPage />} />
        <Route path="articles/:id/edit" element={<AdminArticleEditPage />} />
        <Route path="articles/:articleId/assignment" element={<AdminAssignmentEditPage />} />
        <Route path="users" element={<AdminUsersPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
