import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Feather, Twitter, Linkedin, Instagram, Youtube, Mail } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { SiteSettings } from '@/types/database';
import { fetchNavigation, fetchSiteSettings } from '@/lib/cms';

export function PublicFooter() {
  const [footerNav, setFooterNav] = useState<Array<{ id: string; label: string; external_url: string | null; page_slug: string | null; is_visible: boolean }>>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSent, setNewsletterSent] = useState(false);

  useEffect(() => {
    fetchNavigation('footer').then(setFooterNav);
    fetchSiteSettings().then(setSettings);
  }, []);

  const visibleFooter = footerNav.filter((n) => n.is_visible);
  const year = new Date().getFullYear();

  const socials = [
    { icon: Twitter, url: settings?.social_twitter, label: 'Twitter' },
    { icon: Linkedin, url: settings?.social_linkedin, label: 'LinkedIn' },
    { icon: Instagram, url: settings?.social_instagram, label: 'Instagram' },
    { icon: Youtube, url: settings?.social_youtube, label: 'YouTube' },
  ].filter((s) => s.url);

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
                <Feather className="h-4 w-4" />
              </div>
              <span className="font-display text-base font-semibold tracking-tight text-foreground">WhittleScript</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {settings?.site_tagline || 'Screenplay discovery through real reader engagement.'}
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socials.map(({ icon: Icon, url, label }) => (
                <a
                  key={label}
                  href={url || '#'}
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all duration-200 hover:border-accent/30 hover:text-foreground"
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
              <ThemeToggle />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Navigation</h3>
            <ul className="mt-4 space-y-3">
              {visibleFooter.map((item) => (
                <li key={item.id}>
                  <Link to={item.external_url || (item.page_slug ? `/${item.page_slug === 'home' ? '' : item.page_slug}` : '/')} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Legal</h3>
            <ul className="mt-4 space-y-3">
              <li><Link to="/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Privacy Policy</Link></li>
              <li><Link to="/contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Contact Us</Link></li>
            </ul>
          </div>

          {settings?.newsletter_enabled && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Stay updated</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Get the latest on new features and screenplays.
              </p>
              {newsletterSent ? (
                <p className="mt-4 text-sm text-success">Thanks for subscribing</p>
              ) : (
                <form
                  className="mt-4 flex flex-col gap-3"
                  onSubmit={(e) => { e.preventDefault(); if (newsletterEmail) setNewsletterSent(true); }}
                >
                  <Input
                    name="newsletter-email"
                    type="email"
                    placeholder="you@example.com"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    icon={<Mail className="h-4 w-4" />}
                  />
                  <Button type="submit" size="sm">Subscribe</Button>
                </form>
              )}
            </div>
          )}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {year} {settings?.site_name || 'WhittleScript'}
          </p>
          <p className="text-xs text-muted-foreground">
            Built for writers, readers, and industry professionals
          </p>
        </div>
      </div>
    </footer>
  );
}
