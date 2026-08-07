import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Notification, UserSettings } from '@/types/database';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  settings: UserSettings | null;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const loadNotifications = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data ?? []) as Notification[]);
  }, []);

  const loadSettings = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();
    if (!data) {
      await supabase.from('user_settings').insert({ user_id: uid });
      const { data: newData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      setSettings(newData as UserSettings | null);
    } else {
      setSettings(data as UserSettings);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (userId) await loadNotifications(userId);
  }, [userId, loadNotifications]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          setUserId(session.user.id);
          await Promise.all([loadNotifications(session.user.id), loadSettings(session.user.id)]);
        } else {
          setUserId(null);
          setNotifications([]);
          setSettings(null);
        }
        setLoading(false);
      })();
    });
    return () => sub.subscription.unsubscribe();
  }, [loadNotifications, loadSettings]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [userId]);

  const archiveNotification = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_archived: true }).eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const dismissNotification = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true, is_archived: true }).eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    if (!userId) return;
    await supabase.from('user_settings').update(updates).eq('user_id', userId);
    setSettings((prev) => (prev ? { ...prev, ...updates } : prev));
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, settings, loading,
      markAsRead, markAllAsRead, archiveNotification, dismissNotification,
      refreshNotifications, updateSettings,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
}
