import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  Feather, LayoutGrid, FileText, Coins, Bell, User, Settings,
  BookOpen, ClipboardList, Award, Search, Compass, Bookmark,
  HeartHandshake, Menu, X, LogOut, Activity, Command,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import type { AppRole } from '@/types/database';
import { ROLE_LABELS } from '@/lib/constants';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface NavItemDef {
  label: string;
  path: string;
  icon: typeof LayoutGrid;
}

const ROLE_NAV: Record<AppRole, NavItemDef[]> = {
  writer: [
    { label: 'Dashboard', path: '/app', icon: LayoutGrid },
    { label: 'My Screenplays', path: '/app/screenplays', icon: FileText },
    { label: 'Submission Credits', path: '/app/credits', icon: Coins },
    { label: 'Activity', path: '/app/activity', icon: Activity },
    { label: 'Notifications', path: '/app/notifications', icon: Bell },
    { label: 'Profile', path: '/app/profile', icon: User },
    { label: 'Settings', path: '/app/settings', icon: Settings },
  ],
  reader: [
    { label: 'Dashboard', path: '/app', icon: LayoutGrid },
    { label: 'Assigned Screenplays', path: '/app/assigned', icon: BookOpen },
    { label: 'Review History', path: '/app/reviews', icon: ClipboardList },
    { label: 'Achievements', path: '/app/achievements', icon: Award },
    { label: 'Notifications', path: '/app/notifications', icon: Bell },
    { label: 'Profile', path: '/app/profile', icon: User },
    { label: 'Settings', path: '/app/settings', icon: Settings },
  ],
  industry: [
    { label: 'Dashboard', path: '/app', icon: LayoutGrid },
    { label: 'Discover', path: '/app/discover', icon: Compass },
    { label: 'Watchlists', path: '/app/watchlists', icon: Bookmark },
    { label: 'Compare', path: '/app/compare', icon: Activity },
    { label: 'Introduction Requests', path: '/app/introductions', icon: HeartHandshake },
    { label: 'Notifications', path: '/app/notifications', icon: Bell },
    { label: 'Profile', path: '/app/profile', icon: User },
    { label: 'Settings', path: '/app/settings', icon: Settings },
  ],
  admin: [],
};

export function AppLayout() {
  const { profile, activeRole, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (activeRole === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const navItems = activeRole ? ROLE_NAV[activeRole] : [];

  function handleSignOut() {
    signOut();
    navigate('/');
  }

  const isActive = (path: string) =>
    path === '/app' ? location.pathname === '/app' : location.pathname.startsWith(path);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Icon rail — Linear style */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-surface transition-all duration-300 ${hovered ? 'w-52' : 'w-14'} lg:flex`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-center border-b border-border px-3">
          <Link to="/app" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
              <Feather className="h-3.5 w-3.5" />
            </div>
            {hovered && <span className="font-display text-sm font-semibold tracking-tight text-foreground whitespace-nowrap">WhittleScript</span>}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-2">
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 rounded-lg px-2.5 py-2 transition-all duration-200 ${hovered ? '' : 'justify-center'} ${
                  active
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                }`}
                title={!hovered ? label : undefined}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-accent' : ''}`} />
                {hovered && <span className="text-xs font-medium whitespace-nowrap">{label}</span>}
                {hovered && active && <span className="ml-auto h-1 w-1  bg-accent" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-border p-2">
          <div className={`relative ${hovered ? '' : 'flex justify-center'}`}>
            <button
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className={`flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-surface-hover ${hovered ? 'w-full' : ''}`}
            >
              <Avatar name={profile?.username || 'User'} size="sm" />
              {hovered && (
                <>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="truncate text-xs font-medium text-foreground">{profile?.username}</p>
                    <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{activeRole ? ROLE_LABELS[activeRole] : ''}</p>
                  </div>
                </>
              )}
            </button>
            {userMenuOpen && (
              <div className={`absolute bottom-full mb-1 ${hovered ? 'left-0 right-0' : 'left-full ml-2'} rounded-xl border border-border bg-surface shadow-elevated animate-scale-in`}>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-error hover:bg-error/5"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface lg:hidden animate-slide-in">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <Link to="/app" className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center bg-foreground text-background">
                  <Feather className="h-3.5 w-3.5" />
                </div>
                <span className="font-display text-sm font-semibold text-foreground">WhittleScript</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-hover"><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <nav className="flex-1 space-y-0.5 p-2">
              {navItems.map(({ label, path, icon: Icon }) => {
                const active = isActive(path);
                return (
                  <Link key={path} to={path} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-surface-hover'}`}>
                    <Icon className={`h-4 w-4 ${active ? 'text-accent' : ''}`} />
                    <span className="text-xs font-medium">{label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border p-3">
              <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-error hover:bg-error/5">
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-14">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-lg lg:hidden">
              <Menu className="h-5 w-5 text-foreground" />
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-hover"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden items-center gap-0.5 rounded border border-border px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider text-muted-foreground sm:flex">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/app/notifications" className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-1 font-mono text-2xs font-semibold text-accent-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>

      {/* Command palette */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const { activeRole } = useAuth();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const navSuggestions = activeRole && activeRole !== 'admin' ? ROLE_NAV[activeRole] : [];
  const filteredNav = navSuggestions.filter((n) =>
    n.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-24 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-xl glass-card shadow-cinematic animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search screenplays, users, navigation..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredNav.length > 0 && (
            <div className="p-2">
              <p className="mb-2 px-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">Navigation</p>
              {filteredNav.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-surface-hover"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
          {filteredNav.length === 0 && query && (
            <p className="p-3 text-sm text-muted-foreground">No results found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
