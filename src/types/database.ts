export type AppRole = 'writer' | 'reader' | 'industry' | 'admin';
export type IndustryAccountType = 'company' | 'independent';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type PageStatus = 'draft' | 'published' | 'hidden' | 'archived';
export type PageTemplate = 'landing' | 'standard' | 'marketing' | 'contact' | 'legal' | 'blank';
export type BlockType =
  | 'hero' | 'rich_text' | 'feature_grid' | 'stats' | 'testimonials'
  | 'cta_banner' | 'faq_accordion' | 'pricing_table' | 'philosophy'
  | 'how_it_works' | 'image' | 'video' | 'divider' | 'spacer' | 'contact_form';
export type NavLocation = 'header' | 'footer';
export type EnquiryType = 'general' | 'support' | 'partnership' | 'media';

export interface Profile {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  date_of_birth: string;
  country: string;
  active_role: AppRole;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  is_active: boolean;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

export interface WriterProfile {
  user_id: string;
  bio: string | null;
  city: string | null;
  website: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReaderProfile {
  user_id: string;
  bio: string | null;
  city: string | null;
  reputation_score: number;
  reviews_count: number;
  created_at: string;
  updated_at: string;
}

export interface IndustryProfile {
  user_id: string;
  account_type: IndustryAccountType;
  job_title: string | null;
  company_name: string | null;
  company_website: string | null;
  industry_role: string | null;
  primary_profession: string | null;
  linkedin_url: string | null;
  imdb_url: string | null;
  personal_website: string | null;
  portfolio_website: string | null;
  years_in_industry: number | null;
  genres_of_interest: string[] | null;
  preferred_budget_range: string | null;
  project_types_seeking: string[] | null;
  bio: string | null;
  city: string | null;
  verification_status: VerificationStatus;
  company_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  emailConfirmed: boolean;
}

export interface SiteSettings {
  id: number;
  site_name: string;
  site_tagline: string | null;
  default_seo_title: string | null;
  default_meta_description: string | null;
  default_og_image_url: string | null;
  social_twitter: string | null;
  social_linkedin: string | null;
  social_instagram: string | null;
  social_youtube: string | null;
  newsletter_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  template: PageTemplate;
  status: PageStatus;
  nav_label: string | null;
  nav_visible: boolean;
  footer_visible: boolean;
  seo_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  robots_index: boolean;
  page_icon: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface ContentBlock {
  type: BlockType;
  data: Record<string, unknown>;
  hidden: boolean;
}

export interface PageVersion {
  id: string;
  page_id: string;
  version_number: number;
  blocks: ContentBlock[];
  is_published: boolean;
  is_current: boolean;
  created_by: string | null;
  created_at: string;
  published_at: string | null;
}

export interface NavItem {
  id: string;
  label: string;
  location: NavLocation;
  page_id: string | null;
  external_url: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  author_name: string;
  author_role: string | null;
  author_company: string | null;
  avatar_url: string | null;
  quote: string;
  rating: number;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteStat {
  id: string;
  label: string;
  value: number;
  suffix: string | null;
  icon: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  currency: string;
  features: string[];
  cta_label: string;
  cta_url: string;
  is_featured: boolean;
  status: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactEnquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  enquiry_type: EnquiryType;
  status: string;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 'system' | 'account' | 'reviews' | 'screenplays' | 'industry_requests' | 'announcements';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  email_notifications: boolean;
  in_app_notifications: boolean;
  marketing_emails: boolean;
  review_reminders: boolean;
  producer_contact_requests: boolean;
  profile_visibility: string;
  allow_industry_introductions: boolean;
  theme_preference: string;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  threshold_type: string;
  threshold_value: number;
  sort_order: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
}

export type ScreenplayFormat = 'feature' | 'tv_pilot' | 'short_film';
export type ScreenplayStatus =
  | 'draft' | 'submitted' | 'awaiting_assignment' | 'in_review'
  | 'validated' | 'producer_visible' | 'archived' | 'hidden';

export interface PlatformSettings {
  id: number;
  max_upload_size_mb: number;
  credits_per_new_user: number;
  credits_per_submission: number;
  credits_per_review: number;
  supported_formats: string[];
  supported_languages: string[];
  created_at: string;
  updated_at: string;
}

export interface Screenplay {
  id: string;
  writer_id: string;
  title: string;
  logline: string | null;
  genre: string;
  format: ScreenplayFormat;
  estimated_budget: string | null;
  language: string;
  country: string;
  draft_number: number;
  status: ScreenplayStatus;
  page_count: number | null;
  is_archived: boolean;
  is_deleted: boolean;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScreenplayVersion {
  id: string;
  screenplay_id: string;
  draft_number: number;
  file_path: string;
  file_size_bytes: number | null;
  page_count: number | null;
  is_active: boolean;
  is_archived: boolean;
  uploaded_at: string;
  uploaded_by: string | null;
  notes: string | null;
}

export interface SubmissionCredits {
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  reason: string | null;
  screenplay_id: string | null;
  created_at: string;
}

export interface ScreenplayActivity {
  id: string;
  writer_id: string;
  screenplay_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ScreenplayStatusHistory {
  id: string;
  screenplay_id: string;
  from_status: ScreenplayStatus | null;
  to_status: ScreenplayStatus;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

export type AssignmentStatus = 'active' | 'completed' | 'abandoned' | 'expired';
export type ReaderDecision = 'finished' | 'stopped' | 'return_later';

export interface ReaderAssignment {
  id: string;
  reader_id: string;
  screenplay_id: string;
  screenplay_version_id: string | null;
  status: AssignmentStatus;
  assigned_at: string;
  completed_at: string | null;
  current_page: number;
  reading_progress: number;
  total_reading_time_ms: number;
  session_count: number;
  returned_later: boolean;
}

export interface ReadingSession {
  id: string;
  assignment_id: string;
  reader_id: string;
  session_start: string;
  session_end: string | null;
  start_page: number;
  end_page: number;
  pages_read: number;
  time_spent_ms: number;
  device_type: string;
  returned_later: boolean;
  finished: boolean;
  abandoned: boolean;
}

export interface ReaderDecisionRecord {
  id: string;
  assignment_id: string;
  reader_id: string;
  decision: ReaderDecision;
  finished_screenplay: boolean;
  recommendation: boolean | null;
  written_feedback: string | null;
  private_notes: string | null;
  stop_reason: string | null;
  page_abandoned: number | null;
  reading_time_ms: number | null;
  session_count: number | null;
  created_at: string;
}

export interface ReaderBehaviour {
  reader_id: string;
  total_assignments: number;
  total_completed: number;
  total_abandoned: number;
  total_returned_later: number;
  completion_rate: number;
  recommendation_rate: number;
  avg_abandonment_page: number;
  avg_reading_speed_pages_per_min: number;
  avg_reading_duration_ms: number;
  total_reading_time_ms: number;
  return_frequency: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_reading_date: string | null;
  genre_preferences: Record<string, number>;
  updated_at: string;
}

export interface RetentionMilestone {
  id: string;
  assignment_id: string;
  reader_id: string;
  milestone_page: number;
  milestone_name: string;
  reached_at: string;
  reading_time_ms: number;
}

export interface ReviewReason {
  id: string;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface BehaviourProfile {
  reader_id: string;
  profile_type: string;
  selectivity_score: number;
  persistence_score: number;
  engagement_score: number;
  calculated_at: string;
  updated_at: string;
}

// ---- Phase 5: Reader Contribution Credit Algorithm ----

export interface ReaderContributionAlgorithm {
  id: string;
  version_number: number;
  credit_threshold: number;
  page_contribution_enabled: boolean;
  points_per_page: number;
  time_contribution_enabled: boolean;
  minutes_per_interval: number;
  points_per_time_interval: number;
  max_time_points_per_script: number;
  feedback_contribution_enabled: boolean;
  feedback_starting_bonus: number;
  feedback_reduction_rate: number;
  feedback_minimum_bonus: number;
  ai_quality_enabled: boolean;
  ai_quality_weighting: number;
  ai_min_quality_score: number;
  ai_quality_multiplier: number;
  completion_bonus_enabled: boolean;
  completion_bonus_points: number;
  activated_at: string;
  activated_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface ReaderContributionBalance {
  reader_id: string;
  current_points: number;
  available_credits: number;
  total_credits_earned: number;
  created_at: string;
  updated_at: string;
}

export interface ContributionEvent {
  id: string;
  reader_id: string;
  assignment_id: string | null;
  screenplay_id: string | null;
  pages_read: number;
  active_reading_time_ms: number;
  feedback_submitted: string | null;
  feedback_quality_score: number;
  points_awarded: number;
  algorithm_version: number;
  decision: string;
  flagged: boolean;
  created_at: string;
}

export interface SuspiciousReaderActivity {
  id: string;
  reader_id: string;
  assignment_id: string | null;
  detection_type: string;
  description: string | null;
  severity: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type RecommendationChoice = 'yes' | 'no' | 'unsure';

export interface FeedbackQualityResult {
  score: number;
  reasons: string[];
  factors: {
    explainsWhy: boolean;
    referencesStoryElements: boolean;
    identifiesIssues: boolean;
    isConstructive: boolean;
    hasSpecificObservations: boolean;
  };
}

// ---- Phase 6: Engagement Engine & Producer Discovery ----

export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type CommentThemeName = 'opening' | 'dialogue' | 'characters' | 'pacing' | 'structure' | 'formatting' | 'ending' | 'general';
export type AISummaryType = 'overall' | 'themes' | 'pacing' | 'dialogue' | 'exposition' | 'formatting' | 'genre_consistency' | 'revision_suggestions';
export type IntroRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type ExportType = 'engagement_report' | 'reader_comments' | 'revision_comparison' | 'analytics_summary' | 'watchlist' | 'comparison_report';

export interface EngagementReport {
  id: string;
  screenplay_id: string;
  screenplay_version_id: string;
  report_data: Record<string, unknown>;
  confidence_level: ConfidenceLevel;
  confidence_reasons: string[];
  reader_count: number;
  completed_reviews: number;
  abandoned_reads: number;
  computed_at: string;
  created_at: string;
  updated_at: string;
}

export interface EngagementMetric {
  id: string;
  screenplay_version_id: string;
  metric_name: string;
  metric_value: number;
  metric_metadata: Record<string, unknown>;
  computed_at: string;
}

export interface CommentTheme {
  id: string;
  screenplay_version_id: string;
  theme_name: CommentThemeName;
  ai_summary: string | null;
  comment_count: number;
  sentiment_score: number;
  computed_at: string;
}

export interface ReaderCommentTheme {
  id: string;
  reader_decision_id: string;
  comment_theme_id: string;
  relevance_score: number;
  created_at: string;
}

export interface AISummary {
  id: string;
  screenplay_version_id: string;
  summary_type: AISummaryType;
  summary_text: string;
  derived_label: string;
  computed_at: string;
}

export interface RevisionComparison {
  id: string;
  screenplay_id: string;
  version_a_id: string;
  version_b_id: string;
  comparison_data: Record<string, unknown>;
  computed_at: string;
}

export interface PlatformDiscoveryConfig {
  id: number;
  min_readers: number;
  min_completed_reviews: number;
  min_confidence_level: ConfidenceLevel;
  auto_validate_enabled: boolean;
  updated_at: string;
}

export interface ProducerPreferences {
  id: string;
  user_id: string;
  genres: string[];
  formats: string[];
  countries: string[];
  languages: string[];
  budget_ranges: string[];
  commercial: boolean;
  independent: boolean;
  arthouse: boolean;
  updated_at: string;
}

export interface ProducerMatch {
  id: string;
  user_id: string;
  screenplay_id: string;
  match_percentage: number;
  match_factors: Record<string, unknown>;
  computed_at: string;
}

export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  screenplay_id: string;
  added_at: string;
}

export interface RecentlyViewedScreenplay {
  id: string;
  user_id: string;
  screenplay_id: string;
  viewed_at: string;
}

export interface IntroductionRequest {
  id: string;
  industry_user_id: string;
  writer_id: string;
  screenplay_id: string | null;
  message: string | null;
  status: IntroRequestStatus;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExportHistory {
  id: string;
  user_id: string;
  export_type: ExportType;
  screenplay_id: string | null;
  file_format: string;
  created_at: string;
}

export interface ScreenplayDiscoveryMetrics {
  screenplay_id: string;
  version_id: string | null;
  reader_count: number;
  completed_reviews: number;
  completion_rate: number;
  recommendation_rate: number;
  retention_page3: number;
  retention_page10: number;
  retention_page15: number;
  retention_page45: number;
  retention_final: number;
  avg_reading_time_ms: number;
  avg_reading_speed: number;
  confidence_level: ConfidenceLevel;
  trending_score: number;
  industry_views: number;
  is_discoverable: boolean;
  last_review_at: string | null;
  computed_at: string;
}

export interface EngagementReportData {
  overview: {
    reader_count: number;
    completed_reviews: number;
    abandoned_reads: number;
    completion_rate: number;
    recommendation_rate: number;
  };
  reader_activity: {
    total_readers: number;
    completed_reviews: number;
    abandoned_reads: number;
    returned_later: number;
    industry_readers: number;
    selective_readers: number;
    persistent_readers: number;
  };
  retention: {
    page3: { count: number; percentage: number };
    page10: { count: number; percentage: number };
    page15: { count: number; percentage: number };
    page45: { count: number; percentage: number };
    final: { count: number; percentage: number };
  };
  completion: {
    rate: number;
    count: number;
    avg_completion_time_ms: number;
  };
  recommendations: {
    yes: number;
    no: number;
    unsure: number;
    rate: number;
  };
  reader_behaviour: {
    avg_reading_time_ms: number;
    avg_reading_speed: number;
    avg_sessions_per_reader: number;
    return_later_pct: number;
    avg_abandonment_page: number;
    avg_completion_time_ms: number;
    recommendation_pct: number;
    persistence_score: number;
    selectivity_score: number;
  };
  confidence: {
    level: ConfidenceLevel;
    reasons: string[];
    reader_count: number;
    completed_reviews: number;
  };
  sample_size: number;
  statistical_confidence: string;
}
