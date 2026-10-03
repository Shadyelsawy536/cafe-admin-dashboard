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

function playNewOrderAlert() {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;

    const audio = new AudioContextCtor();
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

    window.setTimeout(() => void audio.close(), 1200);
  } catch {
    // Browser autoplay/audio restrictions must never break the dashboard.
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
      try {
        const AudioContextCtor =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioContextCtor) return;
        const audio = new AudioContextCtor();
        void audio.resume().finally(() => void audio.close());
      } catch {
        // Ignore browser-specific audio restrictions.
      }
    };

    window.addEventListener('pointerdown', primeAudio, { passive: true });
    return () => window.removeEventListener('pointerdown', primeAudio);
  }, []);

  useEffect(() => {
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
        (payload) => {
          const order = payload.new as { id?: string; payment_verified?: boolean };
          if (!order.id || order.payment_verified !== true) return;
          if (seenEvents.current.has(`order:${order.id}`)) return;
          seenEvents.current.add(`order:${order.id}`);

          playNewOrderAlert();
          showNewOrderNotification(() => navigate('/orders'));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
        },
        (payload) => {
          const payment = payload.new as { id?: string; status?: string };
          if (!payment.id || payment.status !== 'paid') return;
          if (seenEvents.current.has(`payment:${payment.id}`)) return;
          seenEvents.current.add(`payment:${payment.id}`);

          playNewOrderAlert();
          showNewOrderNotification(() => navigate('/orders'));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [navigate]);

  const enableAlerts = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setAlertsEnabled(permission === 'granted');
    }
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
