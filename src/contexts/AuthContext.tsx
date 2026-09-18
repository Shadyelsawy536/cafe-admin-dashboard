import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { setRestaurantId } from '../lib/tenant';

interface AuthState {
  user: User | null;
  roleName: string | null;
  permissions: Set<string>;
  hasPermission: (key: string) => boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadStaffRole(currentUser: User | null) {
    if (!currentUser) {
      setRestaurantId(null);
      setRoleName(null);
      setPermissions(new Set());
      return;
    }
    // No RESTAURANT_ID to filter by yet -- this account could belong to any
    // restaurant, so look it up by user_id alone. This one query is what
    // actually determines which restaurant the rest of the dashboard shows.
    // (A staff account linked to more than one restaurant isn't supported
    // yet -- takes the first row found, same limitation the old hardcoded
    // constant had, just no longer hardcoded to one specific restaurant.)
    const { data } = await supabase
      .from('restaurant_users')
      .select('restaurant_id, roles(name, role_permissions(permissions(key)))')
      .eq('user_id', currentUser.id)
      .limit(1)
      .maybeSingle();

    if (!data) {
      // Signed in, but not linked to any restaurant at all.
      setRestaurantId(null);
      setRoleName(null);
      setPermissions(new Set());
      return;
    }

    setRestaurantId(data.restaurant_id);

    const roles = data.roles as unknown as {
      name: string;
      role_permissions: { permissions: { key: string } }[];
    } | null;
    setRoleName(roles?.name ?? null);
    setPermissions(new Set((roles?.role_permissions ?? []).map((rp) => rp.permissions.key)));
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      loadStaffRole(session?.user ?? null).finally(() => setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      loadStaffRole(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  function hasPermission(key: string) {
    return permissions.has(key);
  }

  return (
    <AuthContext.Provider value={{ user, roleName, permissions, hasPermission, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
