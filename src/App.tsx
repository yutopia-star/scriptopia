import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { PublicLayout } from '@/components/public/PublicLayout';
import { CmsPageView } from '@/pages/public/CmsPageView';
import { LoginPage } from '@/pages/LoginPage';
import { CreateAccountPage } from '@/pages/CreateAccountPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { EmailVerificationPage } from '@/pages/EmailVerificationPage';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminPages } from '@/pages/admin/AdminPages';
import { AdminPageEditor } from '@/pages/admin/AdminPageEditor';
import { AdminNewPage } from '@/pages/admin/AdminNewPage';
import { AdminNavigation } from '@/pages/admin/AdminNavigation';
import { AdminTestimonials } from '@/pages/admin/AdminTestimonials';
import { AdminStatistics } from '@/pages/admin/AdminStatistics';
import { AdminPricing } from '@/pages/admin/AdminPricing';
import { AdminFaq } from '@/pages/admin/AdminFaq';
import { AdminEnquiries } from '@/pages/admin/AdminEnquiries';
import { AdminAlgorithm } from '@/pages/admin/AdminAlgorithm';
import { AdminAppearance } from '@/pages/admin/AdminAppearance';
import { AdminConfig } from '@/pages/admin/AdminConfig';
import { AdminFeatureFlags } from '@/pages/admin/AdminFeatureFlags';
import { AdminUsers } from '@/pages/admin/AdminUsers';
import { AdminScreenplays } from '@/pages/admin/AdminScreenplays';
import { AdminModeration } from '@/pages/admin/AdminModeration';
import { AdminForms } from '@/pages/admin/AdminForms';
import { AdminNotifications } from '@/pages/admin/AdminNotifications';
import { AdminAnalytics } from '@/pages/admin/AdminAnalytics';
import { AdminDatabase } from '@/pages/admin/AdminDatabase';
import { AdminAuditLogs } from '@/pages/admin/AdminAuditLogs';
import { AdminSettings } from '@/pages/admin/AdminSettings';
import { AppLayout } from '@/components/app/AppLayout';
import { DashboardHome } from '@/pages/app/DashboardHome';
import { NotificationsPage } from '@/pages/app/NotificationsPage';
import { ProfilePage } from '@/pages/app/ProfilePage';
import { SettingsPage } from '@/pages/app/SettingsPage';
import { PlaceholderPage } from '@/pages/app/PlaceholderPage';
import { MyScreenplaysPage } from '@/pages/app/MyScreenplaysPage';
import { UploadScreenplayPage } from '@/pages/app/UploadScreenplayPage';
import { ScreenplayDetailPage } from '@/pages/app/ScreenplayDetailPage';
import { SubmissionCreditsPage } from '@/pages/app/SubmissionCreditsPage';
import { WriterActivityPage } from '@/pages/app/WriterActivityPage';
import { AssignedScreenplayPage } from '@/pages/app/AssignedScreenplayPage';
import { ReviewHistoryPage } from '@/pages/app/ReviewHistoryPage';
import { EngagementReportPage } from '@/pages/app/EngagementReportPage';
import { ReaderCommentsPage } from '@/pages/app/ReaderCommentsPage';
import { RevisionComparisonPage } from '@/pages/app/RevisionComparisonPage';
import { DiscoverPage } from '@/pages/app/DiscoverPage';
import { ScreenplayDiscoveryPage } from '@/pages/app/ScreenplayDiscoveryPage';
import { WatchlistsPage } from '@/pages/app/WatchlistsPage';
import { ComparePage } from '@/pages/app/ComparePage';
import { IntroductionRequestsPage } from '@/pages/app/IntroductionRequestsPage';
import { FileText, Coins, BookOpen, ClipboardList, Award, Compass, Bookmark, HeartHandshake } from 'lucide-react';

const ScreenplayReaderPage = lazy(() => import('@/pages/app/ScreenplayReaderPage').then(m => ({ default: m.ScreenplayReaderPage })));

function FullScreenSpinner() {
  return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin border-2 border-primary border-t-transparent" /></div>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, activeRole } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (activeRole !== 'admin') return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (session) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function AppShell() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  );
}

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <CmsPageView /> },
      { path: '/:slug', element: <CmsPageView /> },
    ],
  },
  {
    path: '/login',
    element: <AuthRoute><LoginPage /></AuthRoute>,
  },
  {
    path: '/create-account',
    element: <AuthRoute><CreateAccountPage /></AuthRoute>,
  },
  {
    path: '/forgot-password',
    element: <AuthRoute><ForgotPasswordPage /></AuthRoute>,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/email-verification',
    element: <EmailVerificationPage />,
  },
  {
    path: '/app',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardHome /> },
      { path: 'screenplays', element: <MyScreenplaysPage /> },
      { path: 'screenplays/upload', element: <UploadScreenplayPage /> },
      { path: 'screenplays/:screenplayId', element: <ScreenplayDetailPage /> },
      { path: 'credits', element: <SubmissionCreditsPage /> },
      { path: 'activity', element: <WriterActivityPage /> },
      { path: 'assigned', element: <AssignedScreenplayPage /> },
      { path: 'reviews', element: <ReviewHistoryPage /> },
      { path: 'screenplays/:screenplayId/report', element: <EngagementReportPage /> },
      { path: 'screenplays/:screenplayId/comments', element: <ReaderCommentsPage /> },
      { path: 'screenplays/:screenplayId/compare', element: <RevisionComparisonPage /> },
      { path: 'discover', element: <DiscoverPage /> },
      { path: 'discover/:screenplayId', element: <ScreenplayDiscoveryPage /> },
      { path: 'watchlists', element: <WatchlistsPage /> },
      { path: 'compare', element: <ComparePage /> },
      { path: 'introductions', element: <IntroductionRequestsPage /> },
      { path: 'read/:assignmentId', element: <Suspense fallback={<FullScreenSpinner />}><ScreenplayReaderPage /></Suspense> },
      { path: 'achievements', element: <PlaceholderPage title="Achievements" description="Track your reader achievements and milestones." icon={<Award className="h-7 w-7" />} /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminRoute><AdminLayout /></AdminRoute>,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'pages', element: <AdminPages /> },
      { path: 'pages/new', element: <AdminNewPage /> },
      { path: 'pages/:pageId/edit', element: <AdminPageEditor /> },
      { path: 'navigation', element: <AdminNavigation /> },
      { path: 'testimonials', element: <AdminTestimonials /> },
      { path: 'statistics', element: <AdminStatistics /> },
      { path: 'pricing', element: <AdminPricing /> },
      { path: 'faq', element: <AdminFaq /> },
      { path: 'enquiries', element: <AdminEnquiries /> },
      { path: 'algorithm', element: <AdminAlgorithm /> },
      { path: 'appearance', element: <AdminAppearance /> },
      { path: 'config', element: <AdminConfig /> },
      { path: 'feature-flags', element: <AdminFeatureFlags /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'screenplays', element: <AdminScreenplays /> },
      { path: 'moderation', element: <AdminModeration /> },
      { path: 'forms', element: <AdminForms /> },
      { path: 'notifications', element: <AdminNotifications /> },
      { path: 'analytics', element: <AdminAnalytics /> },
      { path: 'database', element: <AdminDatabase /> },
      { path: 'audit-logs', element: <AdminAuditLogs /> },
      { path: 'settings', element: <AdminSettings /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <RouterProvider router={router} />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
