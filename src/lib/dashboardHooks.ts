import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from './supabase';
import { RESTAURANT_ID } from './tenant';
import { applyDashboardTheme, DEFAULT_THEME } from './theme';

/**
 * Loads this restaurant's dashboard colors, logo and name and applies them.
 * Colors also update LIVE: restaurant_branding is in the realtime
 * publication, so saving new colors in Settings re-themes every open
 * dashboard session without a refresh.
 */
export function useDashboardBranding(fallbackName: string | null) {
  const location = useLocation();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(fallbackName);

  // Re-fetch on navigation so a new name/logo saved in Settings shows up
  // as soon as the user moves to another page.
  useEffect(() => {
    const id = RESTAURANT_ID;
    if (!id) return;
    let cancelled = false;

    (async () => {
      const [branding, restaurant] = await Promise.all([
        supabase
          .from('restaurant_branding')
          .select('dashboard_primary_color, dashboard_secondary_color, dashboard_background_color')
          .eq('restaurant_id', id)
          .maybeSingle(),
        supabase.from('restaurants').select('name, logo_url').eq('id', id).maybeSingle(),
      ]);
      if (cancelled) return;

      applyDashboardTheme({
        primary: branding.data?.dashboard_primary_color,
        secondary: branding.data?.dashboard_secondary_color,
        background: branding.data?.dashboard_background_color,
      });
      setLogoUrl(restaurant.data?.logo_url ?? null);
      if (restaurant.data?.name) setDisplayName(String(restaurant.data.name).trim());
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    const id = RESTAURANT_ID;
    if (!id) return;

    const channel = supabase
      .channel(`dashboard-branding-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_branding', filter: `restaurant_id=eq.${id}` },
        (payload) => {
          const row = payload.new as {
            dashboard_primary_color?: string;
            dashboard_secondary_color?: string;
            dashboard_background_color?: string;
          };
          applyDashboardTheme({
            primary: row.dashboard_primary_color,
            secondary: row.dashboard_secondary_color,
            background: row.dashboard_background_color,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      // Signed out / leaving the dashboard: back to neutral defaults.
      applyDashboardTheme(DEFAULT_THEME);
    };
  }, []);

  return { logoUrl, displayName };
}

/** Count of paid, still-pending orders for the Orders nav badge. */
export function usePendingOrdersCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = RESTAURANT_ID;
    if (!enabled || !id) return;
    let active = true;

    const refresh = async () => {
      const { count: c } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', id)
        .eq('status', 'pending')
        .eq('payment_verified', true);
      if (active) setCount(c ?? 0);
    };

    void refresh();
    const channel = supabase
      .channel(`pending-orders-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${id}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [enabled]);

  return count;
}
