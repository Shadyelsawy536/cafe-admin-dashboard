import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { setRestaurantId } from '../lib/tenant';

// Cached on this device once a login ID has been used successfully, so
// staff only have to type it once -- every login after that is just
// email/password, same as before this feature existed.
const LOGIN_ID_STORAGE_KEY = 'cafe_dashboard_login_id';

interface MembershipRow {
  restaurant_id: string;
  roles: { name: string; role_permissions: { permissions: { key: string } }[] } | null;
  restaurants: { login_id: string | null } | null;
}

interface AuthState {
  user: User | null;
  roleName: string | null;
  permissions: Set<string>;
  hasPermission: (key: string) => boolean;
  loading: boolean;
  error: string | null;
  cachedLoginId: string | null;
  signIn: (email: string, password: string, loginId?: string) => Promise<void>;
  signOut: () => Promise<void>;
  forgetLoginId: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cachedLoginId, setCachedLoginId] = useState<string | null>(() =>
    localStorage.getItem(LOGIN_ID_STORAGE_KEY)
  );

  function applyMembership(row: MembershipRow) {
    setRestaurantId(row.restaurant_id);
    setRoleName(row.roles?.name ?? null);
    setPermissions(new Set((row.roles?.role_permissions ?? []).map((rp) => rp.permissions.key)));
  }

  function clearMembership() {
    setRestaurantId(null);
    setRoleName(null);
    setPermissions(new Set());
  }

  /**
   * Loads this account's restaurant memberships and picks one.
   *
   * - No memberships at all -> nothing to load.
   * - Exactly one membership -> use it. A single-restaurant account
   *   shouldn't be blocked by a stale/missing cached code.
   * - More than one membership -> a specific loginId to match against is
   *   required (either just typed at sign-in, or cached from a previous
   *   sign-in on this device). No match -> caller decides what to do
   *   (sign-in flow treats this as a hard failure; session-restore falls
   *   back to the first membership rather than locking someone out just
   *   because localStorage got cleared -- RLS is what actually enforces
   *   data isolation regardless of which membership the UI is showing).
   */
  async function loadMemberships(
    currentUser: User,
    loginIdToMatch: string | null
  ): Promise<{ matched: boolean }> {
    const { data } = await supabase
      .from('restaurant_users')
      .select('restaurant_id, roles(name, role_permissions(permissions(key))), restaurants(login_id)')
      .eq('user_id', currentUser.id);

    const rows = (data ?? []) as unknown as MembershipRow[];

    if (rows.length === 0) {
      clearMembership();
      return { matched: false };
    }

    if (rows.length === 1) {
      applyMembership(rows[0]);
      return { matched: true };
    }

    const found = rows.find((r) => r.restaurants?.login_id && r.restaurants.login_id === loginIdToMatch);
    if (found) {
      applyMembership(found);
      return { matched: true };
    }

    return { matched: false };
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadMemberships(session.user, cachedLoginId).then((result) => {
          // Cache missing/stale but the account still has memberships --
          // fall back to whichever was found rather than a hard lock, per
          // the reasoning in loadMemberships' comment.
          if (!result.matched) {
            supabase
              .from('restaurant_users')
              .select('restaurant_id, roles(name, role_permissions(permissions(key))), restaurants(login_id)')
              .eq('user_id', session.user.id)
              .limit(1)
              .maybeSingle()
              .then(({ data }) => {
                if (data) applyMembership(data as unknown as MembershipRow);
              });
          }
          setLoading(false);
        });
      } else {
        clearMembership();
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) clearMembership();
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(email: string, password: string, loginId?: string) {
    setError(null);
    const effectiveLoginId = loginId ?? cachedLoginId;

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !data.user) {
      // Deliberately generic -- never confirms whether the email, password,
      // or login ID was the part that was wrong.
      setError('Invalid login ID, email, or password.');
      return;
    }

    const { matched } = await loadMemberships(data.user, effectiveLoginId ?? null);
    if (!matched) {
      clearMembership();
      await supabase.auth.signOut();
      setError('Invalid login ID, email, or password.');
      return;
    }

    if (loginId) {
      localStorage.setItem(LOGIN_ID_STORAGE_KEY, loginId);
      setCachedLoginId(loginId);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  function forgetLoginId() {
    localStorage.removeItem(LOGIN_ID_STORAGE_KEY);
    setCachedLoginId(null);
  }

  function hasPermission(key: string) {
    return permissions.has(key);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        roleName,
        permissions,
        hasPermission,
        loading,
        error,
        cachedLoginId,
        signIn,
        signOut,
        forgetLoginId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
