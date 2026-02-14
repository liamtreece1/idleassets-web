import { create } from 'zustand';
import { supabase } from './supabase';

interface User {
  id: string;
  email: string;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  trust_score: number;
  is_id_verified: boolean;
  stripe_account_id: string | null;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface AppState {
  user: User | null;
  profile: Profile | null;
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;

  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
  fetchProfile: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  profile: null,
  notifications: [],
  unreadCount: 0,
  loading: true,

  initialize: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      set({ user: { id: user.id, email: user.email || '' } });
      await get().fetchProfile();
      await get().fetchNotifications();

      // Subscribe to realtime notifications
      supabase
        .channel('user-notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          const notif = payload.new as Notification;
          set(state => ({
            notifications: [notif, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          }));
        })
        .subscribe();
    }
    set({ loading: false });

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        set({ user: { id: session.user.id, email: session.user.email || '' } });
        get().fetchProfile();
        get().fetchNotifications();
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, notifications: [], unreadCount: 0 });
      }
    });
  },

  setUser: (user) => set({ user }),

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, trust_score, is_id_verified, stripe_account_id')
      .eq('id', user.id)
      .single();
    if (data) set({ profile: data });
  },

  fetchNotifications: async () => {
    const { user } = get();
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      set({
        notifications: data,
        unreadCount: data.filter(n => !n.is_read).length,
      });
    }
  },

  markNotificationRead: async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllNotificationsRead: async () => {
    const { user } = get();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, notifications: [], unreadCount: 0 });
  },
}));
