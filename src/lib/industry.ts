import { supabase } from '@/lib/supabase';
import type {
  ProducerPreferences, ProducerMatch, Watchlist, WatchlistItem,
  IntroductionRequest, Screenplay,
} from '@/types/database';

// ---- Producer Preferences ----

export async function fetchPreferences(userId: string): Promise<ProducerPreferences | null> {
  const { data } = await supabase
    .from('producer_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data as ProducerPreferences | null;
}

export async function upsertPreferences(userId: string, prefs: {
  genres: string[];
  formats: string[];
  countries: string[];
  languages: string[];
  budget_ranges: string[];
  commercial: boolean;
  independent: boolean;
  arthouse: boolean;
}): Promise<void> {
  const { data: existing } = await supabase
    .from('producer_preferences')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('producer_preferences').update(prefs).eq('user_id', userId);
  } else {
    await supabase.from('producer_preferences').insert({ user_id: userId, ...prefs });
  }
}

// ---- Producer Match ----

export async function computeMatch(userId: string, screenplayId: string): Promise<{ percentage: number; factors: Record<string, unknown> } | null> {
  const { data, error } = await supabase.rpc('compute_producer_match', {
    p_user_id: userId,
    p_screenplay_id: screenplayId,
  });
  if (error) return null;
  return data as { percentage: number; factors: Record<string, unknown> } | null;
}

export async function fetchMatch(userId: string, screenplayId: string): Promise<ProducerMatch | null> {
  const { data } = await supabase
    .from('producer_matches')
    .select('*')
    .eq('user_id', userId)
    .eq('screenplay_id', screenplayId)
    .maybeSingle();
  return data as ProducerMatch | null;
}

export async function fetchAllMatches(userId: string): Promise<Array<ProducerMatch & { screenplay: Screenplay }>> {
  const { data } = await supabase
    .from('producer_matches')
    .select('*, screenplay:screenplays(*)')
    .eq('user_id', userId)
    .order('match_percentage', { ascending: false });
  return (data ?? []) as Array<ProducerMatch & { screenplay: Screenplay }>;
}

// ---- Watchlists ----

export async function fetchWatchlists(userId: string): Promise<Watchlist[]> {
  const { data } = await supabase
    .from('watchlists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []) as Watchlist[];
}

export async function createWatchlist(userId: string, name: string, description?: string): Promise<Watchlist | null> {
  const { data, error } = await supabase
    .from('watchlists')
    .insert({ user_id: userId, name, description: description ?? null })
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Watchlist | null;
}

export async function deleteWatchlist(watchlistId: string): Promise<void> {
  await supabase.from('watchlists').delete().eq('id', watchlistId);
}

export async function renameWatchlist(watchlistId: string, name: string): Promise<void> {
  await supabase.from('watchlists').update({ name }).eq('id', watchlistId);
}

export async function fetchWatchlistItems(watchlistId: string): Promise<Array<WatchlistItem & { screenplay: Screenplay }>> {
  const { data } = await supabase
    .from('watchlist_items')
    .select('*, screenplay:screenplays(*)')
    .eq('watchlist_id', watchlistId)
    .order('added_at', { ascending: false });
  return (data ?? []) as Array<WatchlistItem & { screenplay: Screenplay }>;
}

export async function addToWatchlist(watchlistId: string, screenplayId: string): Promise<void> {
  const { error } = await supabase
    .from('watchlist_items')
    .insert({ watchlist_id: watchlistId, screenplay_id: screenplayId });
  if (error && error.code !== '23505') throw new Error(error.message);
}

export async function removeFromWatchlist(watchlistId: string, screenplayId: string): Promise<void> {
  await supabase.from('watchlist_items').delete().eq('watchlist_id', watchlistId).eq('screenplay_id', screenplayId);
}

export async function isScreenplaySaved(userId: string, screenplayId: string): Promise<boolean> {
  const { data } = await supabase
    .from('watchlist_items')
    .select('id')
    .eq('screenplay_id', screenplayId)
    .in('watchlist_id', (await supabase.from('watchlists').select('id').eq('user_id', userId)).data?.map((w) => w.id) ?? [])
    .maybeSingle();
  return !!data;
}

// ---- Introduction Requests ----

export async function fetchIntroRequestsSent(userId: string): Promise<Array<IntroductionRequest & { screenplay: Screenplay | null }>> {
  const { data } = await supabase
    .from('introduction_requests')
    .select('*, screenplay:screenplays(*)')
    .eq('industry_user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []) as Array<IntroductionRequest & { screenplay: Screenplay | null }>;
}

export async function fetchIntroRequestsReceived(userId: string): Promise<Array<IntroductionRequest & { screenplay: Screenplay | null }>> {
  const { data } = await supabase
    .from('introduction_requests')
    .select('*, screenplay:screenplays(*)')
    .eq('writer_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []) as Array<IntroductionRequest & { screenplay: Screenplay | null }>;
}

export async function createIntroRequest(params: {
  industryUserId: string;
  writerId: string;
  screenplayId?: string;
  message?: string;
}): Promise<void> {
  const { error } = await supabase.from('introduction_requests').insert({
    industry_user_id: params.industryUserId,
    writer_id: params.writerId,
    screenplay_id: params.screenplayId ?? null,
    message: params.message ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function respondToIntroRequest(requestId: string, status: 'accepted' | 'declined'): Promise<void> {
  const { error } = await supabase
    .from('introduction_requests')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw new Error(error.message);
}

export async function cancelIntroRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('introduction_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId);
  if (error) throw new Error(error.message);
}
