import { supabase } from '@/lib/supabase';
import type {
  Screenplay, ScreenplayVersion, SubmissionCredits, CreditTransaction,
  ScreenplayActivity, ScreenplayStatusHistory, PlatformSettings,
  ScreenplayStatus, ScreenplayFormat,
} from '@/types/database';

// ---- Platform Settings ----
export async function fetchPlatformSettings(): Promise<PlatformSettings | null> {
  const { data } = await supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle();
  return data as PlatformSettings | null;
}

// ---- Screenplays ----
export async function fetchScreenplays(writerId: string): Promise<Screenplay[]> {
  const { data } = await supabase
    .from('screenplays')
    .select('*')
    .eq('writer_id', writerId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false });
  return (data ?? []) as Screenplay[];
}

export async function fetchScreenplay(id: string): Promise<Screenplay | null> {
  const { data } = await supabase.from('screenplays').select('*').eq('id', id).maybeSingle();
  return data as Screenplay | null;
}

export async function createScreenplay(
  writerId: string,
  data: {
    title: string;
    logline: string;
    genre: string;
    format: ScreenplayFormat;
    estimated_budget: string;
    language: string;
    country: string;
    draft_number: number;
    page_count: number | null;
    file_path: string;
    file_size_bytes: number;
  },
): Promise<Screenplay | null> {
  const { data: sp, error } = await supabase
    .from('screenplays')
    .insert({
      writer_id: writerId,
      title: data.title,
      logline: data.logline,
      genre: data.genre,
      format: data.format,
      estimated_budget: data.estimated_budget,
      language: data.language,
      country: data.country,
      draft_number: data.draft_number,
      page_count: data.page_count,
    })
    .select('*')
    .maybeSingle();
  if (error || !sp) throw new Error(error?.message || 'Failed to create screenplay');
  const screenplay = sp as Screenplay;

  await supabase.from('screenplay_versions').insert({
    screenplay_id: screenplay.id,
    draft_number: data.draft_number,
    file_path: data.file_path,
    file_size_bytes: data.file_size_bytes,
    page_count: data.page_count,
    is_active: true,
    uploaded_by: writerId,
  });

  await supabase.from('screenplay_status_history').insert({
    screenplay_id: screenplay.id,
    to_status: 'draft',
    changed_by: writerId,
  });

  await supabase.from('screenplay_activity').insert({
    writer_id: writerId,
    screenplay_id: screenplay.id,
    event_type: 'screenplay_uploaded',
    title: `Uploaded "${data.title}"`,
    description: `Draft ${data.draft_number} uploaded`,
  });

  return screenplay;
}

export async function updateScreenplay(
  id: string,
  updates: Partial<Screenplay>,
): Promise<void> {
  const { error } = await supabase.from('screenplays').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateScreenplayStatus(
  id: string,
  writerId: string,
  toStatus: ScreenplayStatus,
  reason?: string,
): Promise<void> {
  const { data: sp } = await supabase.from('screenplays').select('status').eq('id', id).maybeSingle();
  const fromStatus = sp?.status as ScreenplayStatus | null;

  await supabase.from('screenplays').update({ status: toStatus }).eq('id', id);
  await supabase.from('screenplay_status_history').insert({
    screenplay_id: id,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by: writerId,
    reason: reason || null,
  });
  await supabase.from('screenplay_activity').insert({
    writer_id: writerId,
    screenplay_id: id,
    event_type: 'status_changed',
    title: `Status changed to ${toStatus.replace(/_/g, ' ')}`,
    description: reason || undefined,
  });
}

export async function softDeleteScreenplay(id: string, writerId: string): Promise<void> {
  await supabase.from('screenplays').update({ is_deleted: true, is_archived: true }).eq('id', id);
  await supabase.from('screenplay_activity').insert({
    writer_id: writerId,
    screenplay_id: id,
    event_type: 'screenplay_deleted',
    title: 'Screenplay deleted',
    description: 'Moved to trash (soft delete)',
  });
}

export async function archiveScreenplay(id: string, writerId: string): Promise<void> {
  await supabase.from('screenplays').update({ is_archived: true }).eq('id', id);
  await supabase.from('screenplay_activity').insert({
    writer_id: writerId,
    screenplay_id: id,
    event_type: 'screenplay_archived',
    title: 'Screenplay archived',
  });
}

export async function restoreScreenplay(id: string, writerId: string): Promise<void> {
  await supabase.from('screenplays').update({ is_archived: false, is_deleted: false, status: 'draft' }).eq('id', id);
  await supabase.from('screenplay_activity').insert({
    writer_id: writerId,
    screenplay_id: id,
    event_type: 'screenplay_restored',
    title: 'Screenplay restored',
  });
}

// ---- Screenplay Versions ----
export async function fetchVersions(screenplayId: string): Promise<ScreenplayVersion[]> {
  const { data } = await supabase
    .from('screenplay_versions')
    .select('*')
    .eq('screenplay_id', screenplayId)
    .order('draft_number', { ascending: false });
  return (data ?? []) as ScreenplayVersion[];
}

export async function uploadNewVersion(
  screenplayId: string,
  writerId: string,
  data: {
    draft_number: number;
    file_path: string;
    file_size_bytes: number;
    page_count: number | null;
    notes?: string;
  },
): Promise<ScreenplayVersion | null> {
  await supabase
    .from('screenplay_versions')
    .update({ is_active: false })
    .eq('screenplay_id', screenplayId)
    .eq('is_active', true);

  const { data: version, error } = await supabase
    .from('screenplay_versions')
    .insert({
      screenplay_id: screenplayId,
      draft_number: data.draft_number,
      file_path: data.file_path,
      file_size_bytes: data.file_size_bytes,
      page_count: data.page_count,
      is_active: true,
      uploaded_by: writerId,
      notes: data.notes || null,
    })
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);

  await supabase.from('screenplays').update({
    draft_number: data.draft_number,
    page_count: data.page_count,
    updated_at: new Date().toISOString(),
  }).eq('id', screenplayId);

  await supabase.from('screenplay_activity').insert({
    writer_id: writerId,
    screenplay_id: screenplayId,
    event_type: 'revision_uploaded',
    title: `New revision: Draft ${data.draft_number}`,
    description: data.notes || undefined,
  });

  return version as ScreenplayVersion | null;
}

export async function archiveVersion(versionId: string): Promise<void> {
  await supabase.from('screenplay_versions').update({ is_archived: true, is_active: false }).eq('id', versionId);
}

export async function restoreVersion(versionId: string, screenplayId: string): Promise<void> {
  await supabase
    .from('screenplay_versions')
    .update({ is_active: false })
    .eq('screenplay_id', screenplayId)
    .eq('is_active', true);

  await supabase.from('screenplay_versions').update({ is_archived: false, is_active: true }).eq('id', versionId);
}

// ---- Submission Credits ----
export async function fetchCredits(userId: string): Promise<SubmissionCredits | null> {
  const { data } = await supabase
    .from('submission_credits')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) {
    await supabase.from('submission_credits').insert({ user_id: userId, balance: 3 });
    const { data: newData } = await supabase
      .from('submission_credits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return newData as SubmissionCredits | null;
  }
  return data as SubmissionCredits;
}

export async function fetchCreditTransactions(userId: string): Promise<CreditTransaction[]> {
  const { data } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []) as CreditTransaction[];
}

// ---- Activity ----
export async function fetchActivity(writerId: string, limit = 20): Promise<ScreenplayActivity[]> {
  const { data } = await supabase
    .from('screenplay_activity')
    .select('*')
    .eq('writer_id', writerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as ScreenplayActivity[];
}

export async function fetchScreenplayActivity(screenplayId: string, limit = 20): Promise<ScreenplayActivity[]> {
  const { data } = await supabase
    .from('screenplay_activity')
    .select('*')
    .eq('screenplay_id', screenplayId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as ScreenplayActivity[];
}

// ---- Status History ----
export async function fetchStatusHistory(screenplayId: string): Promise<ScreenplayStatusHistory[]> {
  const { data } = await supabase
    .from('screenplay_status_history')
    .select('*')
    .eq('screenplay_id', screenplayId)
    .order('changed_at', { ascending: false });
  return (data ?? []) as ScreenplayStatusHistory[];
}

// ---- File Upload ----
export async function uploadScreenplayFile(
  writerId: string,
  screenplayId: string,
  file: File,
): Promise<{ path: string; size: number }> {
  const ext = file.name.split('.').pop() || 'pdf';
  const path = `${writerId}/${screenplayId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from('screenplays')
    .upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return { path, size: file.size };
}

export function getScreenplayFileUrl(path: string): string {
  const { data } = supabase.storage.from('screenplays').getPublicUrl(path);
  return data.publicUrl;
}

export async function createScreenplayBucket(): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find((b) => b.name === 'screenplays')) {
    await supabase.storage.createBucket('screenplays', { public: false });
  }
}
