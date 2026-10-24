import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';

interface OrderRow {
  total: number | string | null;
  status: string | null;
  created_at: string;
  payment_verified: boolean | null;
}

interface DaySummary {
  key: string;
  label: string;
  sales: number;
  orders: number;
}

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  pendingCount: number;
  avgOrderValue: number;
  weeklySales: number;
  weeklyOrders: number;
  daily: DaySummary[];
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'EGP',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || 'EGP'} ${amount.toFixed(2)}`;
  }
}

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function Overview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState('EGP');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - 6);

      const [{ data: settings }, { data, error: ordersError }] = await Promise.all([
        supabase.from('restaurant_settings')
          .select('currency')
          .eq('restaurant_id', RESTAURANT_ID)
          .maybeSingle(),
        supabase.from('orders')
          .select('total, status, created_at, payment_verified')
          .eq('restaurant_id', RESTAURANT_ID)
          .gte('created_at', startOfWeek.toISOString())
          .lte('created_at', now.toISOString())
          .order('created_at', { ascending: true }),
      ]);

      if (cancelled) return;
      if (settings?.currency) setCurrency(settings.currency);

      if (ordersError || !data) {
        setError('Could not load dashboard analytics. Please refresh and try again.');
        setLoading(false);
        return;
      }

      const rows = data as OrderRow[];
      const validOrders = rows.filter(o => !['cancelled', 'rejected'].includes((o.status || '').toLowerCase()));
      const paidOrders = validOrders.filter(o => o.payment_verified === true);
      const todayKey = dayKey(now);
      const todayOrders = validOrders.filter(o => dayKey(new Date(o.created_at)) === todayKey);
      const todayPaid = paidOrders.filter(o => dayKey(new Date(o.created_at)) === todayKey);

      const daily: DaySummary[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const key = dayKey(date);
        const dayOrders = paidOrders.filter(o => dayKey(new Date(o.created_at)) === key);
        daily.push({
          key,
          label: date.toLocaleDateString(undefined, { weekday: 'short' }),
          sales: dayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
          orders: dayOrders.length,
        });
      }

      const todaySales = todayPaid.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const weeklySales = daily.reduce((sum, day) => sum + day.sales, 0);
      setStats({
        todaySales,
        todayOrders: todayOrders.length,
        pendingCount: validOrders.filter(o => (o.status || '').toLowerCase() === 'pending').length,
        avgOrderValue: todayPaid.length ? todaySales / todayPaid.length : 0,
        weeklySales,
        weeklyOrders: paidOrders.length,
        daily,
      });
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const maxDailySales = Math.max(0, ...(stats?.daily.map(day => day.sales) ?? []));
  const maxDailyOrders = Math.max(0, ...(stats?.daily.map(day => day.orders) ?? []));

  return (
    <div className="mx-auto w-full max-w-7xl p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Overview</h1>
          <p className="mt-1 text-sm text-ink/60">Your restaurant performance at a glance.</p>
        </div>
        <p className="text-xs text-ink/50">Last 7 days · Updated when you open this page</p>
      </div>

      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map(item => <div key={item} className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />)}
        </div>
      ) : error ? (
        <div role="alert" className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : (
        <>
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Today's Paid Sales" value={formatCurrency(stats?.todaySales ?? 0, currency)} detail="Verified payments only" accent="text-accent" />
            <StatCard label="Orders Today" value={String(stats?.todayOrders ?? 0)} detail="Excludes cancelled and rejected" />
            <StatCard label="Pending Orders" value={String(stats?.pendingCount ?? 0)} detail="Orders awaiting action" accent="text-status-pending" />
            <StatCard label="Average Paid Order" value={formatCurrency(stats?.avgOrderValue ?? 0, currency)} detail="Today's verified orders" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 xl:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-ink">Paid sales trend</h2>
                  <p className="mt-1 text-xs text-ink/50">Daily verified sales for the last 7 days</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink/50">7-day sales</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-ink">{formatCurrency(stats?.weeklySales ?? 0, currency)}</p>
                </div>
              </div>
              <div className="mt-7 grid h-52 grid-cols-7 items-end gap-2 sm:gap-4">
                {(stats?.daily ?? []).map(day => {
                  const height = maxDailySales > 0 ? Math.max(day.sales > 0 ? 5 : 0, day.sales / maxDailySales * 100) : 0;
                  return (
                    <div key={day.key} className="flex h-full min-w-0 flex-col items-center justify-end gap-2" title={`${day.key}: ${formatCurrency(day.sales, currency)} · ${day.orders} paid orders`}>
                      <span className="max-w-full truncate text-[10px] text-ink/50">{day.sales > 0 ? formatCurrency(day.sales, currency) : '—'}</span>
                      <div className="flex h-32 w-full items-end overflow-hidden rounded-t-md bg-canvas">
                        <div className="w-full rounded-t-md bg-accent transition-all" style={{ height: `${height}%` }} />
                      </div>
                      <span className="text-xs font-medium text-ink/60">{day.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-line pt-4 text-xs text-ink/50">Only orders marked as payment verified are included in sales.</div>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <h2 className="text-base font-semibold text-ink">Order activity</h2>
              <p className="mt-1 text-xs text-ink/50">Verified orders by day</p>
              <div className="mt-6 space-y-4">
                {(stats?.daily ?? []).map(day => (
                  <div key={day.key}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="text-ink/70">{day.label} <span className="text-ink/40">{day.key.slice(5)}</span></span>
                      <span className="font-mono font-medium text-ink">{day.orders}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-canvas">
                      <div className="h-full rounded-full bg-accent/80 transition-all" style={{ width: `${maxDailyOrders > 0 ? day.orders / maxDailyOrders * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-canvas p-4">
                <p className="text-xs text-ink/50">Paid orders · 7 days</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-ink">{stats?.weeklyOrders ?? 0}</p>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, detail, accent }: { label: string; value: string; detail: string; accent?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</p>
      <p className={`mt-3 break-words font-mono text-2xl font-semibold tabular-nums sm:text-3xl ${accent ?? 'text-ink'}`}>{value}</p>
      <p className="mt-2 text-xs text-ink/45">{detail}</p>
    </div>
  );
}
