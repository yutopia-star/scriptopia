import { supabase } from '@/lib/supabase';

// ---- Types ----

export interface PlatformConfig {
  id: number;
  reviews_required_per_submission: number;
  max_active_submissions: number;
  reader_milestone_pages: number[];
  max_upload_size_mb: number;
  supported_file_types: string[];
  min_readers_for_discovery: number;
  min_completed_reviews_for_discovery: number;
  min_confidence_level: string;
  human_weighting: number;
  ai_weighting: number;
  industry_verification_required: boolean;
  industry_min_reviews_for_verification: number;
  auto_validate_screenplays: boolean;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  is_enabled: boolean;
  category: string;
  updated_at: string;
  created_at: string;
}

export interface ModerationReport {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string | null;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  reporter?: { username: string };
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  message: string;
  type: string;
  audience: string;
  is_active: boolean;
  is_dismissible: boolean;
  scheduled_at: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  category: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  admin?: { username: string };
}

export interface FormConfig {
  id: string;
  form_key: string;
  form_name: string;
  fields: FormField[];
  is_active: boolean;
  updated_at: string;
  created_at: string;
}

export interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  order: number;
}

export interface ThemeSettings {
  id: number;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  card_color: string;
  border_color: string;
  button_radius: string;
  font_heading: string;
  font_body: string;
  status_success: string;
  status_warning: string;
  status_error: string;
  status_info: string;
  chart_color_1: string;
  chart_color_2: string;
  chart_color_3: string;
  chart_color_4: string;
  chart_color_5: string;
  updated_at: string;
}

export interface SystemSettings {
  id: number;
  platform_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  support_email: string;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  allow_new_registrations: boolean;
  email_verification_required: boolean;
  industry_verification_required: boolean;
  default_theme_id: number;
  homepage_slug: string;
  terms_url: string | null;
  privacy_url: string | null;
  cookie_policy_url: string | null;
  updated_at: string;
}

// ---- Platform Config ----

export async function fetchPlatformConfig(): Promise<PlatformConfig | null> {
  const { data } = await supabase.from('platform_config').select('*').eq('id', 1).maybeSingle();
  return data as PlatformConfig | null;
}

export async function updatePlatformConfig(updates: Partial<PlatformConfig>): Promise<void> {
  await supabase.from('platform_config').update(updates).eq('id', 1);
}

// ---- Feature Flags ----

export async function fetchFeatureFlags(): Promise<FeatureFlag[]> {
  const { data } = await supabase.from('feature_flags').select('*').order('category, feature_name');
  return (data ?? []) as FeatureFlag[];
}

export async function toggleFeatureFlag(key: string, enabled: boolean): Promise<void> {
  await supabase.from('feature_flags').update({ is_enabled: enabled }).eq('feature_key', key);
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const { data } = await supabase.from('feature_flags').select('is_enabled').eq('feature_key', key).maybeSingle();
  return data?.is_enabled ?? true;
}

// ---- Moderation ----

export async function fetchModerationReports(status?: string): Promise<ModerationReport[]> {
  let query = supabase.from('moderation_reports').select('*, reporter:profiles!moderation_reports_reporter_id_fkey(username)');
  if (status) query = query.eq('status', status);
  const { data } = await query.order('created_at', { ascending: false });
  return (data ?? []) as ModerationReport[];
}

export async function resolveReport(id: string, status: string, notes: string, adminId: string): Promise<void> {
  await supabase.from('moderation_reports').update({
    status,
    resolved_by: adminId,
    resolved_at: new Date().toISOString(),
    resolution_notes: notes,
  }).eq('id', id);
}

export async function createReport(report: { target_type: string; target_id: string; reason: string; description?: string }): Promise<void> {
  await supabase.from('moderation_reports').insert(report);
}

// ---- Announcements ----

export async function fetchAnnouncements(): Promise<AdminAnnouncement[]> {
  const { data } = await supabase.from('admin_announcements').select('*').order('created_at', { ascending: false });
  return (data ?? []) as AdminAnnouncement[];
}

export async function createAnnouncement(ann: Omit<AdminAnnouncement, 'id' | 'created_by' | 'created_at' | 'updated_at'>, adminId: string): Promise<void> {
  await supabase.from('admin_announcements').insert({ ...ann, created_by: adminId });
}

export async function updateAnnouncement(id: string, updates: Partial<AdminAnnouncement>): Promise<void> {
  await supabase.from('admin_announcements').update(updates).eq('id', id);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await supabase.from('admin_announcements').delete().eq('id', id);
}

// ---- Audit Logs ----

export async function fetchAuditLogs(limit = 50, category?: string): Promise<AuditLog[]> {
  let query = supabase.from('audit_logs').select('*, admin:profiles!audit_logs_admin_id_fkey(username)');
  if (category) query = query.eq('category', category);
  const { data } = await query.order('created_at', { ascending: false }).limit(limit);
  return (data ?? []) as AuditLog[];
}

export async function logAction(adminId: string, action: string, category: string, details?: Record<string, unknown>, targetType?: string, targetId?: string): Promise<void> {
  await supabase.rpc('log_audit_action', {
    p_admin_id: adminId,
    p_action: action,
    p_category: category,
    p_target_type: targetType ?? null,
    p_target_id: targetId ?? null,
    p_details: details ?? {},
  });
}

// ---- Form Configs ----

export async function fetchFormConfigs(): Promise<FormConfig[]> {
  const { data } = await supabase.from('form_configs').select('*').order('form_name');
  return (data ?? []) as FormConfig[];
}

export async function fetchFormConfig(key: string): Promise<FormConfig | null> {
  const { data } = await supabase.from('form_configs').select('*').eq('form_key', key).maybeSingle();
  return data as FormConfig | null;
}

export async function updateFormConfig(key: string, fields: FormField[]): Promise<void> {
  await supabase.from('form_configs').update({ fields: JSON.parse(JSON.stringify(fields)) }).eq('form_key', key);
}

// ---- Theme Settings ----

export async function fetchThemeSettings(): Promise<ThemeSettings | null> {
  const { data } = await supabase.from('theme_settings').select('*').eq('id', 1).maybeSingle();
  return data as ThemeSettings | null;
}

export async function updateThemeSettings(updates: Partial<ThemeSettings>): Promise<void> {
  await supabase.from('theme_settings').update(updates).eq('id', 1);
}

// ---- System Settings ----

export async function fetchSystemSettings(): Promise<SystemSettings | null> {
  const { data } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle();
  return data as SystemSettings | null;
}

export async function updateSystemSettings(updates: Partial<SystemSettings>): Promise<void> {
  await supabase.from('system_settings').update(updates).eq('id', 1);
}

// ---- User Management ----

export async function fetchAllUsers(filters?: { search?: string; role?: string; status?: string }): Promise<Array<{
  id: string; username: string; email: string; created_at: string; last_active_at: string | null;
  is_deleted: boolean; is_suspended: boolean;
  roles: Array<{ role: string; is_active: boolean; verification_status: string }>;
}>> {
  let query = supabase.from('profiles').select(`
    id, username, email, created_at, last_active_at, is_deleted, is_suspended,
    roles:user_roles(role, is_active, verification_status)
  `);
  if (filters?.search) {
    query = query.or(`username.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }
  const { data } = await query.order('created_at', { ascending: false });
  let users = (data ?? []) as Array<{
    id: string; username: string; email: string; created_at: string; last_active_at: string | null;
    is_deleted: boolean; is_suspended: boolean;
    roles: Array<{ role: string; is_active: boolean; verification_status: string }>;
  }>;
  if (filters?.role) {
    users = users.filter((u) => u.roles?.some((r) => r.role === filters.role));
  }
  if (filters?.status === 'suspended') {
    users = users.filter((u) => u.is_suspended);
  } else if (filters?.status === 'deleted') {
    users = users.filter((u) => u.is_deleted);
  } else if (filters?.status === 'active') {
    users = users.filter((u) => !u.is_deleted && !u.is_suspended);
  }
  return users;
}

export async function suspendUser(userId: string): Promise<void> {
  await supabase.from('profiles').update({ is_suspended: true }).eq('id', userId);
}

export async function restoreUser(userId: string): Promise<void> {
  await supabase.from('profiles').update({ is_suspended: false, is_deleted: false }).eq('id', userId);
}

export async function softDeleteUser(userId: string): Promise<void> {
  await supabase.from('profiles').update({ is_deleted: true, is_suspended: true }).eq('id', userId);
}

export async function permanentlyDeleteUser(userId: string): Promise<void> {
  await supabase.auth.admin.deleteUser(userId);
}

export async function updateUserRoles(userId: string, roles: string[]): Promise<void> {
  const { data: existing } = await supabase.from('user_roles').select('id, role').eq('user_id', userId);
  const existingRoles = existing ?? [];
  const toRemove = existingRoles.filter((r) => !roles.includes(r.role));
  const toAdd = roles.filter((r) => !existingRoles.some((e) => e.role === r));

  for (const r of toRemove) {
    await supabase.from('user_roles').delete().eq('id', r.id);
  }
  for (const r of toAdd) {
    await supabase.from('user_roles').insert({
      user_id: userId,
      role: r,
      is_active: true,
      verification_status: r === 'industry' ? 'pending' : 'verified',
    });
  }
}

export async function verifyUserEmail(userId: string): Promise<void> {
  await supabase.auth.admin.updateUserById(userId, { email_confirm: true });
}

export async function resetUserPassword(userId: string): Promise<void> {
  const { data: user } = await supabase.from('profiles').select('email').eq('id', userId).maybeSingle();
  if (user?.email) {
    await supabase.auth.resetPasswordForEmail(user.email);
  }
}

// ---- Screenplay Management ----

export async function fetchAllScreenplaysForAdmin(filters?: {
  status?: string; genre?: string; language?: string; country?: string; search?: string;
}): Promise<Array<{
  id: string; title: string; logline: string; genre: string; format: string; status: string;
  country: string; language: string; is_deleted: boolean; created_at: string; updated_at: string;
  writer: { username: string };
}>> {
  let query = supabase.from('screenplays').select(`
    id, title, logline, genre, format, status, country, language, is_deleted, created_at, updated_at,
    writer:profiles!screenplays_writer_id_fkey(username)
  `);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.genre) query = query.eq('genre', filters.genre);
  if (filters?.language) query = query.eq('language', filters.language);
  if (filters?.country) query = query.eq('country', filters.country);
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,logline.ilike.%${filters.search}%`);
  }
  const { data } = await query.order('updated_at', { ascending: false });
  return (data ?? []) as Array<{
    id: string; title: string; logline: string; genre: string; format: string; status: string;
    country: string; language: string; is_deleted: boolean; created_at: string; updated_at: string;
    writer: { username: string };
  }>;
}

export async function hideScreenplay(id: string): Promise<void> {
  await supabase.from('screenplays').update({ status: 'hidden' }).eq('id', id);
}

export async function restoreScreenplay(id: string): Promise<void> {
  await supabase.from('screenplays').update({ status: 'in_review', is_deleted: false }).eq('id', id);
}

export async function archiveScreenplay(id: string): Promise<void> {
  await supabase.from('screenplays').update({ status: 'archived' }).eq('id', id);
}

export async function softDeleteScreenplay(id: string): Promise<void> {
  await supabase.from('screenplays').update({ is_deleted: true, status: 'archived' }).eq('id', id);
}

export async function permanentlyDeleteScreenplay(id: string): Promise<void> {
  await supabase.from('screenplays').delete().eq('id', id);
}

export async function resetReviewCycle(id: string): Promise<void> {
  await supabase.from('screenplays').update({ status: 'awaiting_assignment' }).eq('id', id);
  await supabase.from('reader_assignments').update({ status: 'cancelled' }).eq('screenplay_id', id).neq('status', 'completed');
}

// ---- Dashboard Stats ----

export async function fetchDashboardStats(): Promise<{
  totalUsers: number; activeWriters: number; activeReaders: number; activeIndustry: number; admins: number;
  screenplaysUploaded: number; screenplaysInReview: number; producerVisible: number; reviewsCompleted: number;
  activeReadingSessions: number; pendingReports: number;
}> {
  const [
    { count: totalUsers },
    { count: activeWriters },
    { count: activeReaders },
    { count: activeIndustry },
    { count: admins },
    { count: screenplaysUploaded },
    { count: screenplaysInReview },
    { count: producerVisible },
    { count: reviewsCompleted },
    { count: activeReadingSessions },
    { count: pendingReports },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role', 'writer').eq('is_active', true),
    supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role', 'reader').eq('is_active', true),
    supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role', 'industry').eq('is_active', true),
    supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true),
    supabase.from('screenplays').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('screenplays').select('id', { count: 'exact', head: true }).eq('status', 'in_review').eq('is_deleted', false),
    supabase.from('screenplays').select('id', { count: 'exact', head: true }).eq('status', 'producer_visible').eq('is_deleted', false),
    supabase.from('reader_assignments').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('reader_assignments').select('id', { count: 'exact', head: true }).eq('status', 'reading'),
    supabase.from('moderation_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  return {
    totalUsers: totalUsers ?? 0,
    activeWriters: activeWriters ?? 0,
    activeReaders: activeReaders ?? 0,
    activeIndustry: activeIndustry ?? 0,
    admins: admins ?? 0,
    screenplaysUploaded: screenplaysUploaded ?? 0,
    screenplaysInReview: screenplaysInReview ?? 0,
    producerVisible: producerVisible ?? 0,
    reviewsCompleted: reviewsCompleted ?? 0,
    activeReadingSessions: activeReadingSessions ?? 0,
    pendingReports: pendingReports ?? 0,
  };
}

// ---- Analytics ----

export async function fetchAnalyticsData(days = 30): Promise<{
  userGrowth: Array<{ date: string; count: number }>;
  uploads: Array<{ date: string; count: number }>;
  reviews: Array<{ date: string; count: number }>;
  totalStorage: number;
  tableCounts: Array<{ table_name: string; row_count: number }>;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: users } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });

  const { data: sps } = await supabase
    .from('screenplays')
    .select('created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });

  const { data: reviews } = await supabase
    .from('reader_assignments')
    .select('created_at')
    .eq('status', 'completed')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });

  const userGrowth = groupByDate(users ?? [], 'created_at');
  const uploads = groupByDate(sps ?? [], 'created_at');
  const reviewsData = groupByDate(reviews ?? [], 'created_at');

  const { data: tableCounts } = await supabase.rpc('get_table_row_counts');

  return {
    userGrowth,
    uploads,
    reviews: reviewsData,
    totalStorage: 0,
    tableCounts: (tableCounts ?? []) as Array<{ table_name: string; row_count: number }>,
  };
}

function groupByDate(items: Array<{ created_at: string }>, key: string): Array<{ date: string; count: number }> {
  const map = new Map<string, number>();
  for (const item of items) {
    const date = (item as Record<string, unknown>)[key] as string;
    const day = date.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}
