import type { AppRole, IndustryAccountType } from '@/types/database';

export const INDUSTRY_ROLES = [
  'Producer',
  'Executive Producer',
  'Development Executive',
  'Script Editor',
  'Literary Manager',
  'Agent',
  'Director',
  'Acquisitions Executive',
  'Broadcaster',
  'Streaming Executive',
  'Distributor',
  'Sales Agent',
  'Festival Programmer',
  'Investor',
  'Other',
] as const;

export const PRIMARY_PROFESSIONS = [
  'Independent Producer',
  'Director',
  'Writer-Director',
  'Executive Producer',
  'Development Consultant',
  'Script Consultant',
  'Casting Director',
  'Sales Agent',
  'Financier',
  'Other',
] as const;

export const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'New Zealand',
  'Ireland', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Belgium',
  'Sweden', 'Norway', 'Denmark', 'Finland', 'Iceland', 'Switzerland',
  'Austria', 'Portugal', 'Greece', 'Poland', 'Czech Republic', 'Hungary',
  'Romania', 'Bulgaria', 'Croatia', 'Serbia', 'Slovenia', 'Slovakia',
  'Estonia', 'Latvia', 'Lithuania', 'Russia', 'Ukraine', 'Turkey',
  'Israel', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Lebanon',
  'Egypt', 'South Africa', 'Nigeria', 'Kenya', 'Morocco', 'Ghana',
  'India', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Singapore', 'Malaysia',
  'Indonesia', 'Philippines', 'Thailand', 'Vietnam', 'Cambodia',
  'Japan', 'South Korea', 'China', 'Hong Kong', 'Taiwan',
  'Mexico', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru',
  'Venezuela', 'Uruguay', 'Costa Rica', 'Panama', 'Dominican Republic',
  'Cuba', 'Jamaica', 'Trinidad and Tobago', 'Barbados', 'Bahamas',
  'Other',
] as const;

export const GENRE_OPTIONS = [
  'Drama', 'Comedy', 'Thriller', 'Horror', 'Action', 'Adventure',
  'Science Fiction', 'Fantasy', 'Romance', 'Mystery', 'Crime',
  'Documentary', 'Animation', 'Family', 'Historical', 'Biopic',
  'War', 'Western', 'Musical', 'Experimental',
] as const;

export const BUDGET_RANGES = [
  'Under $500K', '$500K - $1M', '$1M - $5M', '$5M - $10M',
  '$10M - $25M', '$25M - $50M', '$50M - $100M', 'Over $100M',
] as const;

export const PROJECT_TYPES = [
  'Feature Film', 'Short Film', 'TV Series', 'Limited Series',
  'Web Series', 'Documentary', 'Animation', 'Streaming Original',
  'Theatrical Release', 'Festival Circuit',
] as const;

export const ROLE_LABELS: Record<AppRole, string> = {
  writer: 'Writer',
  reader: 'Reader',
  industry: 'Industry',
  admin: 'Administrator',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  writer: 'Upload screenplays and receive anonymous reader feedback.',
  reader: 'Read assigned screenplays, leave anonymous reviews and build your reviewer reputation.',
  industry: 'Discover screenplays and writers through measurable reader engagement.',
  admin: 'Manage the platform, users and content.',
};

export const INDUSTRY_TYPE_LABELS: Record<IndustryAccountType, string> = {
  company: 'Company Representative',
  independent: 'Independent Professional',
};

export const INDUSTRY_TYPE_DESCRIPTIONS: Record<IndustryAccountType, string> = {
  company: 'You represent a production company, broadcaster, studio, agency or similar organisation.',
  independent: 'You work independently as a producer, director, writer-director, consultant or similar.',
};

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  needsUppercase: true,
  needsLowercase: true,
  needsNumber: true,
  needsSpecial: true,
};

export const MIN_AGE = 18;

export const DEV_TEST_ACCOUNTS = [
  { role: 'writer' as AppRole, email: 'writer@test.com', password: 'Wh1ttleScript2026!' },
  { role: 'reader' as AppRole, email: 'reader@test.com', password: 'Wh1ttleScript2026!' },
  { role: 'industry' as AppRole, email: 'industry@test.com', password: 'Wh1ttleScript2026!' },
  { role: 'admin' as AppRole, email: 'admin@test.com', password: 'Wh1ttleScript2026!' },
];
