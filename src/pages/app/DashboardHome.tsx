import { useAuth } from '@/context/AuthContext';
import { WriterDashboard } from '@/pages/app/WriterDashboard';
import { ReaderDashboard } from '@/pages/app/ReaderDashboard';
import { IndustryDashboard } from '@/pages/app/IndustryDashboard';

export function DashboardHome() {
  const { activeRole } = useAuth();

  if (activeRole === 'writer') return <WriterDashboard />;
  if (activeRole === 'reader') return <ReaderDashboard />;
  if (activeRole === 'industry') return <IndustryDashboard />;
  return <WriterDashboard />;
}
