import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Feather, Eye, Shield, FileText, Clock, AlertCircle, TrendingUp, Activity, ArrowRight, Building2, CheckCircle, Database, BarChart3 } from 'lucide-react';
import { fetchDashboardStats } from '@/lib/admin';
import { Card, CardHeader } from '@/components/ui/Card';
import { AnimatedStat } from '@/components/ui/AnimatedStat';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

export function AdminDashboard() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchDashboardStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats().then((s) => { setStats(s); setLoading(false); });
  }, []);

  if (loading || !stats) return <DashboardSkeleton />;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: <Users className="h-5 w-5" />, path: '/admin/users', color: 'text-primary' },
    { label: 'Active Writers', value: stats.activeWriters, icon: <Feather className="h-5 w-5" />, path: '/admin/users', color: 'text-accent' },
    { label: 'Active Readers', value: stats.activeReaders, icon: <Eye className="h-5 w-5" />, path: '/admin/users', color: 'text-success' },
    { label: 'Industry Members', value: stats.activeIndustry, icon: <Shield className="h-5 w-5" />, path: '/admin/users', color: 'text-warning' },
    { label: 'Administrators', value: stats.admins, icon: <Shield className="h-5 w-5" />, path: '/admin/users', color: 'text-error' },
    { label: 'Screenplays', value: stats.screenplaysUploaded, icon: <FileText className="h-5 w-5" />, path: '/admin/screenplays', color: 'text-primary' },
    { label: 'In Review', value: stats.screenplaysInReview, icon: <Clock className="h-5 w-5" />, path: '/admin/screenplays', color: 'text-warning' },
    { label: 'Producer Visible', value: stats.producerVisible, icon: <TrendingUp className="h-5 w-5" />, path: '/admin/screenplays', color: 'text-success' },
    { label: 'Reviews Completed', value: stats.reviewsCompleted, icon: <Activity className="h-5 w-5" />, path: '/admin/analytics', color: 'text-accent' },
    { label: 'Active Sessions', value: stats.activeReadingSessions, icon: <Eye className="h-5 w-5" />, path: '/admin/analytics', color: 'text-primary' },
    { label: 'Pending Reports', value: stats.pendingReports, icon: <AlertCircle className="h-5 w-5" />, path: '/admin/moderation', color: 'text-error' },
  ];

  const systemHealth = [
    { label: 'Database', status: 'Operational', description: 'All queries responding normally', icon: <Database className="h-5 w-5" /> },
    { label: 'Authentication', status: 'Operational', description: 'Sign-in and sessions active', icon: <Shield className="h-5 w-5" /> },
    { label: 'File Storage', status: 'Operational', description: 'Uploads and downloads normal', icon: <FileText className="h-5 w-5" /> },
  ];

  const quickActions = [
    { label: 'Manage Users', path: '/admin/users', icon: <Users className="h-4 w-4" /> },
    { label: 'Manage Screenplays', path: '/admin/screenplays', icon: <FileText className="h-4 w-4" /> },
    { label: 'Review Reports', path: '/admin/moderation', icon: <AlertCircle className="h-4 w-4" /> },
    { label: 'Platform Config', path: '/admin/config', icon: <Building2 className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden  rounded-xl border border-border bg-surface p-8 ">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72  bg-accent/8 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2  border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Shield className="h-3 w-3 text-accent" /> Platform Administration
          </div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">Platform Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">Monitor platform health and activity at a glance.</p>
        </div>
      </div>

      {/* Animated stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon, path, color }) => (
          <Link key={label} to={path}>
            <AnimatedStat label={label} value={value} icon={icon} color={color} />
          </Link>
        ))}
      </div>

      {/* System Health */}
      <Card>
        <CardHeader title="System Health" subtitle="Current platform status" icon={<Activity className="h-5 w-5" />} />
        <div className="grid gap-4 p-5 pt-2 sm:grid-cols-2 lg:grid-cols-3">
          {systemHealth.map((sys) => (
            <div key={sys.label} className="group relative overflow-hidden  rounded-xl border border-border bg-background p-5 transition-all hover:border-accent/20 hover:">
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20  bg-success/5 blur-2xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center  bg-secondary text-secondary-foreground">
                      {sys.icon}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{sys.label}</p>
                      <p className="font-display text-lg font-semibold text-success">{sys.status}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{sys.description}</p>
                </div>
                <div className="relative h-3 w-3  bg-success animate-pulse-soft" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader title="Quick Actions" subtitle="Common administrative tasks" icon={<TrendingUp className="h-5 w-5" />} />
        <div className="grid gap-4 p-5 pt-2 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map(({ label, path, icon }) => (
            <Link key={label} to={path} className="group flex items-center justify-between  rounded-xl border border-border bg-background p-5 transition-all hover:border-accent/30 hover:">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center  bg-secondary text-secondary-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                  {icon}
                </div>
                <span className="text-sm font-medium text-foreground">{label}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
