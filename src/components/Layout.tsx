import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: '◧', permission: null },
  { to: '/orders', label: 'Orders', icon: '▤', permission: 'orders.view' },
  { to: '/products', label: 'Products', icon: '☕', permission: 'menu.manage' },
  { to: '/categories', label: 'Categories', icon: '▦', permission: 'menu.manage' },
  { to: '/modifier-groups', label: 'Modifier Groups', icon: '✦', permission: 'menu.manage' },
  { to: '/reports', label: 'Reports', icon: '◫', permission: 'reports.view' },
  { to: '/delivery-zones', label: 'Delivery Zones', icon: '⌖', permission: 'settings.manage' },
  { to: '/website', label: 'Website', icon: '◉', permission: 'settings.manage' },
  { to: '/settings', label: 'Settings', icon: '⚙', permission: 'settings.manage' },
  { to: '/staff', label: 'Staff', icon: '◐', permission: 'staff.manage' },
  { to: '/offers-coupons', label: 'Offers & Coupons', icon: '◆', permission: 'offers.manage' },
  { to: '/customers', label: 'Customers', icon: '◍', permission: 'customers.view' },
  { to: '/notifications', label: 'Notifications', icon: '◔', permission: 'settings.manage' },
  { to: '/payments', label: 'Payments', icon: '◆', permission: 'payments.manage' },
] as const;

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
  const { user, roleName, hasPermission, signOut } = useAuth();
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

  return (
    <div className="flex h-screen bg-canvas text-ink">
      <aside className="flex w-60 flex-col border-r border-line bg-surface">
        <div className="flex items-center gap-2 border-b border-line px-6 py-5">
          <span className="font-display text-lg font-semibold tracking-tight">Cafe</span>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
            Admin
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-ink/70 hover:bg-canvas hover:text-ink'
                }`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-4">
          <p className="truncate text-xs font-medium text-ink">{user?.email}</p>
          <p className="text-[11px] uppercase tracking-wide text-ink/40">{roleName}</p>

          {!alertsEnabled && (
            <button
              onClick={() => void enableAlerts()}
              className="mt-2 w-full rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-dark"
            >
              Enable order alerts 🔔
            </button>
          )}

          <button
            onClick={signOut}
            className="mt-2 text-xs font-medium text-accent hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
