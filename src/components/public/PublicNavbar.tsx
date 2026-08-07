import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Feather, Menu, X, Bell, LogOut, ChevronDown, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { ROLE_LABELS } from '@/lib/constants';
import { fetchNavigation } from '@/lib/cms';

export function PublicNavbar() {
  const { session, profile, activeRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navItems, setNavItems] = useState<Array<{ id: string; label: string; external_url: string | null; page_id: string | null; page_slug: string | null; is_visible: boolean }>>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetchNavigation('header').then(setNavItems);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const visibleNav = navItems.filter((n) => n.is_visible);
  const navHref = (item: typeof visibleNav[number]) => item.external_url || (item.page_slug ? `/${item.page_slug === 'home' ? '' : item.page_slug}` : '/');

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-border bg-background/80 backdrop-blur-xl' : 'border-b border-transparent'}`}>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Feather className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-semibold tracking-tight text-foreground">WhittleScript</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {visibleNav.map((item) => (
            <Link
              key={item.id}
              to={item.external_url || '/'}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {session ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/app">
                <Button variant="outline" size="sm">Dashboard</Button>
              </Link>
              <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 text-sm text-foreground transition-opacity hover:opacity-80"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-foreground">
                    {profile?.username?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-surface shadow-elevated animate-scale-in">
                    <div className="border-b border-border p-3">
                      <p className="text-sm font-medium text-foreground">{profile?.username}</p>
                      <p className="text-xs text-muted-foreground">{activeRole ? ROLE_LABELS[activeRole] : 'Member'}</p>
                    </div>
                    <div className="p-1">
                      <Link to="/app" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface-hover">
                        <User className="h-4 w-4" /> Dashboard
                      </Link>
                      <button
                        onClick={() => { signOut(); navigate('/'); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-error hover:bg-error/5"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden items-center gap-3 md:flex">
              <Link to="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Sign In
              </Link>
              <Link to="/create-account">
                <Button size="sm">Create Account</Button>
              </Link>
            </div>
          )}

          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border bg-background md:hidden animate-fade-in">
          <div className="space-y-1 px-4 py-4">
            {visibleNav.map((item) => (
              <Link
                key={item.id}
                to={navHref(item)}
                className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-border pt-3">
              {session ? (
                <>
                  <Link to="/app" className="block rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-surface-hover">Dashboard</Link>
                  <button
                    onClick={() => { signOut(); navigate('/'); }}
                    className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-error hover:bg-error/5"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 px-3">
                  <Link to="/login"><Button variant="outline" fullWidth>Sign In</Button></Link>
                  <Link to="/create-account"><Button fullWidth>Create Account</Button></Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
