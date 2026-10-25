import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';
import { useDashboardBranding, usePendingOrdersCount } from '../lib/dashboardHooks';
import { Icon, type IconName } from './Icons';

// 'primary' items live in the top pill bar; 'tools' items live in the
// floating side rail (and everything is listed in the mobile drawer).
const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'grid', permission: null, group: 'primary' },
  { to: '/orders', label: 'Orders', icon: 'receipt', permission: 'orders.view', group: 'primary' },
  { to: '/tables', label: 'Tables & QR', icon: 'pin', permission: 'settings.manage', group: 'tools' },
  { to: '/products', label: 'Products', icon: 'coffee', permission: 'menu.manage', group: 'primary' },
  { to: '/customers', label: 'Customers', icon: 'users', permission: 'customers.view', group: 'primary' },
  { to: '/reports', label: 'Reports', icon: 'chart', permission: 'reports.view', group: 'primary' },
  { to: '/offers-coupons', label: 'Offers', icon: 'tag', permission: 'offers.manage', group: 'primary' },
  { to: '/categories', label: 'Categories', icon: 'layers', permission: 'menu.manage', group: 'tools' },
  { to: '/modifier-groups', label: 'Modifier Groups', icon: 'sliders', permission: 'menu.manage', group: 'tools' },
  { to: '/delivery-zones', label: 'Delivery Zones', icon: 'pin', permission: 'settings.manage', group: 'tools' },
  { to: '/website', label: 'Website', icon: 'globe', permission: 'settings.manage', group: 'tools' },
  { to: '/payments', label: 'Payments', icon: 'card', permission: 'payments.manage', group: 'tools' },
  { to: '/staff', label: 'Staff', icon: 'shield', permission: 'staff.manage', group: 'tools' },
  { to: '/settings', label: 'Settings', icon: 'gear', permission: 'settings.manage', group: 'tools' },
] as const satisfies ReadonlyArray<{
  to: string;
  label: string;
  icon: IconName;
  permission: string | null;
  group: 'primary' | 'tools';
}>;

type NavItem = (typeof NAV_ITEMS)[number];

type AudioContextWithWebkit = typeof AudioContext & {
  new (): AudioContext;
};

let alertAudioContext: AudioContext | null = null;

function getAlertAudioContext() {
  if (typeof window === 'undefined') return null;

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: AudioContextWithWebkit;
    }).webkitAudioContext;

  if (!AudioContextCtor) return null;

  if (!alertAudioContext) {
    alertAudioContext = new AudioContextCtor();
  }

  return alertAudioContext;
}

async function unlockAlertAudio() {
  try {
    const audio = getAlertAudioContext();
    if (!audio) return;

    if (audio.state === 'suspended') {
      await audio.resume();
    }
  } catch {
    // Browser autoplay restrictions must never break the dashboard.
  }
}

function playNewOrderAlert() {
  try {
    const audio = getAlertAudioContext();
    if (!audio) return;

    const play = () => {
      const now = audio.currentTime;
      const notes = [
        { offset: 0, frequency: 880 },
        { offset: 0.22, frequency: 1175 },
        { offset: 0.44, frequency: 880 },
        { offset: 0.66, frequency: 1175 },
      ];

      for (const note of notes) {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = note.frequency;
        gain.gain.setValueAtTime(0.0001, now + note.offset);
        gain.gain.exponentialRampToValueAtTime(0.22, now + note.offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.offset + 0.18);

        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(now + note.offset);
        oscillator.stop(now + note.offset + 0.2);
      }
    };

    if (audio.state === 'suspended') {
      void audio.resume().then(play).catch(() => {});
    } else {
      play();
    }
  } catch {
    // Browser audio restrictions must never break the dashboard.
  }
}

function showNewOrderNotification(onClick: () => void) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const notification = new Notification('🔔 New order received', {
    body: 'A new paid order is waiting in the dashboard.',
    tag: 'cafe-new-order',
    requireInteraction: true,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
    onClick();
  };
}

export function Layout() {
  const { user, roleName, restaurantName, hasPermission, signOut } = useAuth();
  const navigate = useNavigate();
  const [alertsEnabled, setAlertsEnabled] = useState(
    typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted',
  );
  const seenEvents = useRef(new Set<string>());

  useEffect(() => {
    const primeAudio = () => {
      void unlockAlertAudio();
    };

    window.addEventListener('pointerdown', primeAudio, { passive: true });
    return () => window.removeEventListener('pointerdown', primeAudio);
  }, []);

  useEffect(() => {
    const alertOrder = (orderId: string) => {
      if (seenEvents.current.has(`order:${orderId}`)) return;
      seenEvents.current.add(`order:${orderId}`);

      playNewOrderAlert();
      showNewOrderNotification(() => navigate('/orders'));
    };

    const handleOrderInsert = async (payload: { new: unknown }) => {
      const inserted = payload.new as { id?: string };

      if (!inserted.id) return;

      // Read the row back instead of trusting the Realtime payload for the
      // payment flag. This handles cases where the Realtime payload is
      // incomplete while keeping unpaid Visa orders silent.
      const { data: order } = await supabase
        .from('orders')
        .select('id, restaurant_id, payment_verified')
        .eq('id', inserted.id)
        .maybeSingle();

      if (
        order?.id &&
        order.restaurant_id === RESTAURANT_ID &&
        order.payment_verified === true
      ) {
        alertOrder(order.id);
      }
    };

    const handlePaymentUpdate = async (payload: { new: unknown }) => {
      const payment = payload.new as { id?: string; status?: string };

      if (!payment.id || payment.status !== 'paid') return;

      // Resolve the payment to its order, then verify the order belongs to
      // this restaurant and is actually payment_verified before alerting.
      const { data: paymentRow } = await supabase
        .from('payments')
        .select('id, order_id, status')
        .eq('id', payment.id)
        .maybeSingle();

      if (!paymentRow?.order_id || paymentRow.status !== 'paid') return;

      const { data: order } = await supabase
        .from('orders')
        .select('id, restaurant_id, payment_verified')
        .eq('id', paymentRow.order_id)
        .maybeSingle();

      if (
        order?.id &&
        order.restaurant_id === RESTAURANT_ID &&
        order.payment_verified === true
      ) {
        alertOrder(order.id);
      }
    };

    const channel = supabase
      .channel(`dashboard-order-alerts-${RESTAURANT_ID}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${RESTAURANT_ID}`,
        },
        payload => {
          void handleOrderInsert(payload);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
        },
        payload => {
          void handlePaymentUpdate(payload);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [navigate, roleName]);

  const enableAlerts = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setAlertsEnabled(permission === 'granted');
    }

    await unlockAlertAudio();
    playNewOrderAlert();
  };

  const visibleItems = NAV_ITEMS.filter(
    item => item.permission === null || hasPermission(item.permission),
  );
  const primaryItems = visibleItems.filter(item => item.group === 'primary');
  const toolItems = visibleItems.filter(item => item.group === 'tools');

  const location = useLocation();
  const { logoUrl, displayName } = useDashboardBranding(restaurantName);
  const pendingCount = usePendingOrdersCount(hasPermission('orders.view'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const name = displayName || restaurantName || 'Restaurant';
  const initials = (user?.email ?? '?').slice(0, 2).toUpperCase();

  const onBellClick = () => {
    if (alertsEnabled) navigate('/orders');
    else void enableAlerts();
  };

  const pill = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        `flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors xl:px-4 ${
          isActive ? 'bg-accent' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {item.label}
          {item.to === '/orders' && pendingCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
                isActive ? 'bg-on-accent/20' : 'bg-ink/10'
              }`}
            >
              {pendingCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Floating tool rail (desktop) */}
      {toolItems.length > 0 && (
        <nav
          aria-label="Tools"
          className="fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-1 rounded-full bg-accent p-2 shadow-xl lg:flex"
        >
          {toolItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) =>
                `grid h-10 w-10 place-items-center rounded-full transition-colors ${
                  isActive ? 'bg-on-accent/25' : 'hover:bg-on-accent/10'
                }`
              }
            >
              <Icon name={item.icon} />
            </NavLink>
          ))}
        </nav>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-canvas">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 lg:pl-28 lg:pr-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-accent font-display text-lg font-semibold">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </span>
            <span
              className="truncate font-display text-base font-semibold tracking-tight sm:text-lg lg:max-w-[200px] xl:max-w-xs"
              title={name}
            >
              {name}
            </span>
          </div>

          <nav
            aria-label="Main"
            className="hidden items-center gap-1 rounded-full bg-surface p-1.5 shadow-sm ring-1 ring-black/5 lg:flex"
          >
            {primaryItems.map(pill)}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onBellClick}
              title={alertsEnabled ? 'Open orders' : 'Enable new-order alerts'}
              aria-label={alertsEnabled ? 'Open orders' : 'Enable new-order alerts'}
              className="relative grid h-10 w-10 place-items-center rounded-full bg-surface shadow-sm ring-1 ring-black/5 hover:bg-ink/5"
            >
              <Icon name="bell" />
              {!alertsEnabled && (
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface" />
              )}
            </button>

            <div className="relative hidden lg:block">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                aria-label="Account menu"
                className="grid h-10 w-10 place-items-center rounded-full bg-accent text-sm font-semibold"
              >
                {initials}
              </button>
              {userMenuOpen && (
                <>
                  <button
                    className="fixed inset-0 z-40 cursor-default"
                    aria-label="Close menu"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl bg-surface p-3 shadow-xl ring-1 ring-black/5">
                    <p className="truncate text-sm font-medium">{user?.email}</p>
                    <p className="text-[11px] uppercase tracking-wide text-ink/40">{roleName}</p>
                    {!alertsEnabled && (
                      <button
                        onClick={() => void enableAlerts()}
                        className="mt-3 w-full rounded-lg bg-accent px-3 py-2 text-xs font-semibold hover:bg-accent-dark"
                      >
                        Enable order alerts
                      </button>
                    )}
                    <button
                      onClick={signOut}
                      className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink/70 hover:bg-ink/5"
                    >
                      <Icon name="logout" className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="grid h-10 w-10 place-items-center rounded-full bg-surface shadow-sm ring-1 ring-black/5 hover:bg-ink/5 lg:hidden"
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>

      {/* Quick pill bar (mobile / tablet) */}
      <div className="mx-4 mb-2 overflow-hidden rounded-full bg-surface p-1 shadow-sm ring-1 ring-black/5 lg:hidden">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">{primaryItems.map(pill)}</div>
      </div>

      <main className="mx-auto w-full max-w-[1600px] lg:pl-20">
        <Outlet />
      </main>

      {/* Full menu drawer (mobile / tablet) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-surface p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="truncate font-display text-lg font-semibold">{name}</span>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5"
              >
                <Icon name="close" />
              </button>
            </div>

            <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
              {visibleItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive ? 'bg-accent' : 'text-ink/75 hover:bg-ink/5'
                    }`
                  }
                >
                  <Icon name={item.icon} className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.to === '/orders' && pendingCount > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold leading-none text-white">
                      {pendingCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-line pt-4">
              <p className="truncate text-xs font-medium">{user?.email}</p>
              <p className="text-[11px] uppercase tracking-wide text-ink/40">{roleName}</p>
              {!alertsEnabled && (
                <button
                  onClick={() => void enableAlerts()}
                  className="mt-2 w-full rounded-lg bg-accent px-3 py-2 text-xs font-semibold hover:bg-accent-dark"
                >
                  Enable order alerts
                </button>
              )}
              <button
                onClick={signOut}
                className="mt-2 flex items-center gap-2 text-sm font-medium text-ink/70 hover:text-ink"
              >
                <Icon name="logout" className="h-4 w-4" /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
