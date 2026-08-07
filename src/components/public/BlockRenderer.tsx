import { Link } from 'react-router-dom';
import {
  ArrowRight, PenLine, BookOpen, Clapperboard, Eye, BarChart3, Users,
  Coins, RefreshCw, Building2, Sparkles, Activity, FileText, CheckCircle,
  Star, ChevronDown, Film, TrendingUp, Award, Target, Layers, Globe, Shield,
} from 'lucide-react';
import type { ContentBlock } from '@/types/database';
import { useEffect, useRef, useState } from 'react';
import { fetchTestimonials, fetchStats, fetchPricingPlans, fetchFaqEntries, submitContactEnquiry } from '@/lib/cms';
import type { Testimonial, SiteStat, PricingPlan, FaqEntry } from '@/types/database';

const ICON_MAP: Record<string, typeof PenLine> = {
  PenLine, BookOpen, Clapperboard, Eye, BarChart3, Users, Coins, RefreshCw,
  Building2, Sparkles, Activity, FileText, CheckCircle, Star, Film, TrendingUp, Award, Target, Layers, Globe,
};

function getIcon(name: string): typeof PenLine {
  return ICON_MAP[name] || FileText;
}

function HeroBlock({ data }: { data: Record<string, unknown> }) {
  const headline = data.headline as string;
  const subheadline = data.subheadline as string;
  const primaryCta = data.primary_cta_label as string;
  const primaryUrl = data.primary_cta_url as string;
  const secondaryCta = data.secondary_cta_label as string;
  const secondaryUrl = data.secondary_cta_url as string;

  return (
    <section className="relative min-h-[92vh] overflow-hidden bg-background grain-overlay flex items-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-[600px] w-[600px] rounded-full bg-accent/20 blur-[160px] animate-mesh-drift" />
        <div className="absolute right-1/4 bottom-1/4 h-[500px] w-[500px] rounded-full bg-tertiary/15 blur-[140px] animate-mesh-drift" style={{ animationDelay: '5s' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm animate-fade-in">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Audience intelligence for screenplay discovery
          </div>

          <h1 className="font-display text-5xl font-medium leading-[1.0] tracking-tight text-foreground sm:text-6xl lg:text-7xl animate-fade-up">
            {headline}
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground animate-fade-up" style={{ animationDelay: '0.1s' }}>
            {subheadline}
          </p>

          {(primaryCta || secondaryCta) && (
            <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-up" style={{ animationDelay: '0.2s' }}>
              {primaryCta && (
                <Link to={primaryUrl || '/create-account'}>
                  <button className="group inline-flex h-12 items-center gap-2 rounded-xl bg-foreground px-6 text-sm font-medium text-background shadow-soft transition-all duration-300 hover:shadow-glow hover:bg-primary-hover">
                    {primaryCta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </Link>
              )}
              {secondaryCta && (
                <Link to={secondaryUrl || '/how-it-works'}>
                  <button className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-transparent px-6 text-sm font-medium text-foreground transition-all duration-300 hover:border-accent/40 hover:bg-surface-hover">
                    {secondaryCta}
                  </button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FeatureGridBlock({ data }: { data: Record<string, unknown> }) {
  const title = data.title as string;
  const subtitle = data.subtitle as string;
  const cards = (data.cards as Array<{ icon: string; title: string; description: string }>) || [];

  return (
    <section className="relative bg-background py-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {title && <h2 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">{title}</h2>}
          {subtitle && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => {
            const Icon = getIcon(card.icon);
            return (
              <div
                key={i}
                className="group rounded-2xl border border-border bg-surface p-8 transition-all duration-300 hover:border-accent/30 hover:shadow-elevated hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold text-foreground">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{card.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PhilosophyBlock({ data }: { data: Record<string, unknown> }) {
  const title = data.title as string;
  const body = data.body as string;
  const notItems = (data.not_items as string[]) || [];

  return (
    <section className="relative overflow-hidden bg-surface py-30">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">{title}</h2>
        </div>
        <div className="mt-10 rounded-r-lg border-l-2 border-accent pl-8">
          <p className="text-xl leading-relaxed text-foreground/90">{body}</p>
        </div>
        {notItems.length > 0 && (
          <div className="mt-12">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">WhittleScript is not</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {notItems.map((item, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                  <span className="h-1 w-1 rounded-full bg-error/50" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function StatsBlock({ data }: { data: Record<string, unknown> }) {
  const title = data.title as string;
  const subtitle = data.subtitle as string;
  const [stats, setStats] = useState<SiteStat[]>([]);

  useEffect(() => {
    fetchStats().then(setStats);
  }, []);

  return (
    <section className="relative bg-background py-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {title && <h2 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">{title}</h2>}
          {subtitle && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="mt-16 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {stats.map((stat) => (
            <AnimatedCounter key={stat.id} value={stat.value} label={stat.label} suffix={stat.suffix} icon={stat.icon} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AnimatedCounter({ value, label, suffix, icon }: { value: number; label: string; suffix?: string | null; icon?: string | null }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !animated) {
          setAnimated(true);
          const duration = 1800;
          const start = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            setDisplay(Math.round(value * eased));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, animated]);

  const Icon = icon ? getIcon(icon) : null;

  return (
    <div ref={ref} className="rounded-xl border border-border bg-surface p-8 text-center transition-all duration-300 hover:border-accent/20 hover:shadow-soft">
      {Icon && <Icon className="mx-auto mb-3 h-5 w-5 text-accent" />}
      <div className="font-mono text-4xl font-semibold text-foreground">
        {display.toLocaleString()}{suffix}
      </div>
      <div className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function TestimonialsBlock({ data }: { data: Record<string, unknown> }) {
  const title = data.title as string;
  const subtitle = data.subtitle as string;
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    fetchTestimonials().then(setTestimonials);
  }, []);

  return (
    <section className="relative bg-surface py-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {title && <h2 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">{title}</h2>}
          {subtitle && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="mt-16 space-y-6">
          {testimonials.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-background p-8 lg:p-10">
              <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
                <div className="lg:col-span-9">
                  <p className="font-display text-2xl leading-relaxed text-foreground sm:text-3xl">"{t.quote}"</p>
                </div>
                <div className="lg:col-span-3 lg:border-l lg:border-border lg:pl-6">
                  <div className="mb-2 flex items-center gap-1">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="font-display text-sm font-semibold text-foreground">{t.author_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.author_role}{t.author_company ? `, ${t.author_company}` : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBannerBlock({ data }: { data: Record<string, unknown> }) {
  const title = data.title as string;
  const subtitle = data.subtitle as string;
  const primaryCta = data.primary_cta_label as string;
  const primaryUrl = data.primary_cta_url as string;
  const secondaryCta = data.secondary_cta_label as string;
  const secondaryUrl = data.secondary_cta_url as string;

  return (
    <section className="relative bg-background py-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-32 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent/20 blur-[80px] animate-glow-pulse" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-tertiary/20 blur-[80px] animate-glow-pulse" style={{ animationDelay: '2s' }} />
          </div>
          <div className="relative">
            <h2 className="font-display text-4xl font-medium tracking-tight text-background sm:text-5xl lg:text-6xl">{title}</h2>
            {subtitle && <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-background/70">{subtitle}</p>}
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {primaryCta && (
                <Link to={primaryUrl || '/create-account'}>
                  <button className="group inline-flex h-12 items-center gap-2 rounded-xl bg-background px-6 text-sm font-medium text-foreground transition-all duration-300 hover:shadow-cinematic">
                    {primaryCta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </Link>
              )}
              {secondaryCta && (
                <Link to={secondaryUrl || '/about'}>
                  <button className="inline-flex h-12 items-center gap-2 rounded-xl border border-background/30 px-6 text-sm font-medium text-background transition-all duration-300 hover:bg-background/10">
                    {secondaryCta}
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RichTextBlock({ data }: { data: Record<string, unknown> }) {
  const title = data.title as string;
  const body = data.body as string;

  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {title && <h2 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">{title}</h2>}
        <div className="mt-6 text-lg leading-relaxed text-muted-foreground">{body}</div>
      </div>
    </section>
  );
}

function HowItWorksBlock({ data }: { data: Record<string, unknown> }) {
  const title = data.title as string;
  const subtitle = data.subtitle as string;
  const steps = (data.steps as Array<{ title: string; description: string }>) || [];

  return (
    <section className="relative bg-surface py-30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {title && <h2 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">{title}</h2>}
          {subtitle && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="mt-20 space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="group flex items-start gap-8 rounded-2xl border border-border bg-background p-8 transition-all duration-300 hover:border-accent/20 hover:shadow-soft">
              <span className="font-display text-5xl font-semibold text-accent/30 transition-colors duration-300 group-hover:text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 pt-2">
                <h3 className="font-display text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqAccordionBlock({ data }: { data: Record<string, unknown> }) {
  const title = data.title as string;
  const subtitle = data.subtitle as string;
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchFaqEntries().then(setFaqs);
  }, []);

  const filtered = faqs.filter((f) =>
    !search ||
    f.question.toLowerCase().includes(search.toLowerCase()) ||
    f.answer.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {title && <h2 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">{title}</h2>}
          {subtitle && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="mt-10">
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            aria-label="Search FAQ questions"
          />
        </div>
        <div className="mt-8 space-y-3">
          {filtered.map((faq, i) => (
            <div key={faq.id} className="rounded-xl border border-border bg-surface overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
                aria-expanded={openIndex === i}
              >
                <span className="font-display text-base font-semibold text-foreground">{faq.question}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground animate-fade-in">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No questions match your search.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function PricingTableBlock({ data }: { data: Record<string, unknown> }) {
  const title = data.title as string;
  const subtitle = data.subtitle as string;
  const [plans, setPlans] = useState<PricingPlan[]>([]);

  useEffect(() => {
    fetchPricingPlans().then(setPlans);
  }, []);

  return (
    <section className="relative bg-surface py-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {title && <h2 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">{title}</h2>}
          {subtitle && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-background p-10 transition-all duration-300 hover:-translate-y-1 ${
                plan.is_featured
                  ? 'border-accent/50 shadow-glow'
                  : 'border-border hover:border-accent/20 hover:shadow-soft'
              }`}
            >
              {plan.is_featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                  Most Popular
                </div>
              )}
              <h3 className="font-display text-xl font-semibold text-foreground">{plan.name}</h3>
              {plan.description && <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>}
              <div className="mt-6">
                {plan.price_monthly === 0 ? (
                  <span className="font-display text-4xl font-semibold text-foreground">Free</span>
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-4xl font-semibold text-foreground">
                      ${plan.price_monthly?.toFixed(0)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                )}
                {plan.status === 'coming_soon' && (
                  <span className="mt-2 inline-block rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                    Coming Soon
                  </span>
                )}
              </div>
              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to={plan.cta_url} className="mt-8">
                <button
                  className={`inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium transition-all duration-300 ${
                    plan.is_featured
                      ? 'bg-accent text-accent-foreground hover:bg-accent-hover shadow-glow'
                      : 'border border-border text-foreground hover:bg-surface-hover'
                  } ${plan.status === 'coming_soon' ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  {plan.cta_label}
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DividerBlock() {
  return <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="border-t border-border" /></div>;
}

function SpacerBlock({ data }: { data: Record<string, unknown> }) {
  const height = (data.height as number) || 48;
  return <div style={{ height: `${height}px` }} />;
}

function ContactFormBlock({ data }: { data: Record<string, unknown> }) {
  const title = data.title as string;
  const subtitle = data.subtitle as string;
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', enquiry_type: 'general' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enquiryTypes = [
    { value: 'general', label: 'General Enquiries' },
    { value: 'support', label: 'Support' },
    { value: 'partnership', label: 'Business Partnerships' },
    { value: 'media', label: 'Media' },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const ok = await submitContactEnquiry(form);
      if (!ok) throw new Error('Failed to send');
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <section className="bg-background py-24">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-surface p-12 text-center shadow-soft">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold text-foreground">Message sent</h3>
            <p className="mt-3 text-sm text-muted-foreground">Thank you for reaching out. We will get back to you as soon as possible.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          {title && <h2 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">{title}</h2>}
          {subtitle && <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>}
        </div>
        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Enquiry Type</label>
            <select
              value={form.enquiry_type}
              onChange={(e) => setForm({ ...form, enquiry_type: e.target.value })}
              className="input-field"
            >
              {enquiryTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Subject</label>
            <input
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="input-field"
              placeholder="What is this about?"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Message</label>
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="input-field resize-none"
              placeholder="Tell us more..."
            />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-foreground text-sm font-medium text-background shadow-soft transition-all duration-300 hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </section>
  );
}

export function BlockRenderer({ block }: { block: ContentBlock }) {
  if (block.hidden) return null;

  switch (block.type) {
    case 'hero':
      return <HeroBlock data={block.data} />;
    case 'feature_grid':
      return <FeatureGridBlock data={block.data} />;
    case 'philosophy':
      return <PhilosophyBlock data={block.data} />;
    case 'stats':
      return <StatsBlock data={block.data} />;
    case 'testimonials':
      return <TestimonialsBlock data={block.data} />;
    case 'cta_banner':
      return <CtaBannerBlock data={block.data} />;
    case 'rich_text':
      return <RichTextBlock data={block.data} />;
    case 'how_it_works':
      return <HowItWorksBlock data={block.data} />;
    case 'faq_accordion':
      return <FaqAccordionBlock data={block.data} />;
    case 'pricing_table':
      return <PricingTableBlock data={block.data} />;
    case 'divider':
      return <DividerBlock />;
    case 'spacer':
      return <SpacerBlock data={block.data} />;
    case 'contact_form':
      return <ContactFormBlock data={block.data} />;
    default:
      return null;
  }
}
