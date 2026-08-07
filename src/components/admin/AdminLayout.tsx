import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Feather, LayoutGrid, Globe, Palette, Settings, Flag, Users, FileText,
  Shield, FormInput, Bell, BarChart3, Database, ScrollText, Settings2,
  Menu as MenuIcon, X, ChevronRight, LogOut, Search, AlertCircle, Command,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';

interface NavSection {
  label: string;
  path: string;
  icon: typeof LayoutGrid;
}

const NAV_SECTIONS: { heading: string; items: NavSection[] }[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', path: '/admin', icon: LayoutGrid },
    ],
  },
  {
    heading: 'Website',
    items: [
      { label: 'Pages', path: '/admin/pages', icon: FileText },
      { label: 'Navigation', path: '/admin/navigation', icon: Globe },
      { label: 'Appearance', path: '/admin/appearance', icon: Palette },
    ],
  },
  {
    heading: 'Platform',
    items: [
      { label: 'Configuration', path: '/admin/config', icon: Settings },
      { label: 'Feature Flags', path: '/admin/feature-flags', icon: Flag },
      { label: 'Forms', path: '/admin/forms', icon: FormInput },
      { label: 'Notifications', path: '/admin/notifications', icon: Bell },
    ],
  },
  {
    heading: 'Management',
    items: [
      { label: 'Users', path: '/admin/users', icon: Users },
      { label: 'Screenplays', path: '/admin/screenplays', icon: FileText },
      { label: 'Moderation', path: '/admin/moderation', icon: Shield },
    ],
  },
  {
    heading: 'Insights',
    items: [
      { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
      { label: 'Database', path: '/admin/database', icon: Database },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: ScrollText },
    ],
  },
  {
    heading: 'System',
    items: [
      { label: 'Settings', path: '/admin/settings', icon: Settings2 },
    ],
  },
];

export function AdminLayout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ title: string; path: string }>>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [pendingReports, setPendingReports] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    supabase
      .from('moderation_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingReports(count ?? 0));
  }, [location.pathname]);

  const isActive = (path: string) =>
    path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path);

  function handleSignOut() {
    signOut();
    navigate('/');
  }

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results: Array<{ title: string; path: string }> = [];
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        if (item.label.toLowerCase().includes(q)) {
          results.push({ title: item.label, path: item.path });
        }
      }
    }
    setSearchResults(results);
  }, [searchQuery]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — dense, Linear-quality */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col overflow-y-auto border-r border-border bg-surface transition-all duration-300 ${hovered ? 'w-52' : 'w-14'} lg:translate-x-0 ${sidebarOpen ? 'translate-x-0 w-52' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex h-14 items-center justify-center border-b border-border px-3">
          <Link to="/admin" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-foreground text-background">
              <Feather className="h-3.5 w-3.5" />
            </div>
            {(hovered || sidebarOpen) && <span className="font-display text-sm font-semibold text-foreground whitespace-nowrap">Admin</span>}
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 space-y-3 p-2 pb-20">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading}>
              {(hovered || sidebarOpen) && (
                <p className="px-2.5 pb-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground/60">{section.heading}</p>
              )}
              <div className="space-y-0.5">
                {section.items.map(({ label, path, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center gap-3  px-2.5 py-2 transition-all duration-200 ${(hovered || sidebarOpen) ? '' : 'justify-center'} ${
                      isActive(path)
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                    }`}
                    title={!(hovered || sidebarOpen) ? label : undefined}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive(path) ? 'text-accent' : ''}`} />
                    {(hovered || sidebarOpen) && <span className="flex-1 text-xs font-medium whitespace-nowrap">{label}</span>}
                    {(hovered || sidebarOpen) && label === 'Moderation' && pendingReports > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center bg-error px-1 font-mono text-2xs font-bold text-error-foreground">
                        {pendingReports}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-2">
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-3  px-2.5 py-2 text-xs font-medium text-error transition-colors hover:bg-error/5 ${(hovered || sidebarOpen) ? '' : 'justify-center'}`}
          >
            <LogOut className="h-4 w-4" />
            {(hovered || sidebarOpen) && <span className="whitespace-nowrap">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-14">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <MenuIcon className="h-5 w-5 text-foreground" />
            </button>
            <nav className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
              <Link to="/admin" className="hover:text-foreground">Admin</Link>
              {location.pathname !== '/admin' && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-foreground">
                    {NAV_SECTIONS.flatMap((s) => s.items).find((s) => location.pathname.startsWith(s.path) && s.path !== '/admin')?.label || 'Page'}
                  </span>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search admin..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                className="hidden h-8 w-40  border border-border bg-surface pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none sm:block"
              />
              {showSearch && searchResults.length > 0 && (
                <div className="absolute right-0 top-10 z-50 w-52 border border-border bg-surface shadow-elevated animate-scale-in">
                  {searchResults.map((r) => (
                    <Link
                      key={r.path}
                      to={r.path}
                      className="block px-3 py-2 text-xs text-foreground hover:bg-surface-hover"
                      onClick={() => { setSearchQuery(''); setShowSearch(false); }}
                    >
                      {r.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link to="/admin/moderation" className="relative flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground" title="Pending reports">
              <AlertCircle className="h-4 w-4" />
              {pendingReports > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center bg-error px-1 font-mono text-2xs font-bold text-error-foreground">
                  {pendingReports}
                </span>
              )}
            </Link>
            <Link to="/" className="font-mono text-2xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">View Site</Link>
            <ThemeToggle />
            <Avatar name={profile?.username || 'Admin'} size="sm" />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
