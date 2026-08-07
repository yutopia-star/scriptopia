import { type ReactNode } from 'react';
import { Feather } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  maxWidth?: string;
}

export function AuthLayout({ children, title, subtitle, maxWidth = 'max-w-md' }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background grain-overlay">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2  bg-accent/6 blur-[120px] animate-glow-pulse" />
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[400px]  bg-tertiary/4 blur-[100px] animate-glow-pulse" style={{ animationDelay: '3s' }} />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <a href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center bg-foreground text-background">
            <Feather className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-semibold tracking-tight text-foreground">WhittleScript</span>
        </a>
        <ThemeToggle />
      </header>

      {/* Content */}
      <main className="relative z-10 flex flex-col items-center px-6 pb-16 pt-8 sm:pt-16">
        <div className={`w-full ${maxWidth} animate-fade-up`}>
          {title && (
            <div className="mb-10">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
              {subtitle && <p className="mt-3 text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
