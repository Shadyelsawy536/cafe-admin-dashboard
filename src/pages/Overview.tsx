import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/Icons';

type Period = 'day' | 'week' | 'month';

interface Totals {
  sales: number;
  net_revenue: number;
  orders: number;
  avg_order_value: number;
  items_sold: number;
  completed: number;
  cancelled: number;
  delivery_orders: number;
  pending: number;
}
interface DailyPoint {
  day: string;
  revenue: number;
  orders: number;
}
interface OverviewData {
  totals: Totals;
  daily: DailyPoint[];
}
function periodBounds(now: Date, period: Period) {
  const end = new Date(now.getTime() + 60000);
  let start: Date;
  let prevStart: Date;
  let prevEnd: Date;
  if (period === 'day') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    prevStart = new Date(start.getTime() - 86400000);
    prevEnd = start;
  } else if (period === 'week') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    prevStart = new Date(start.getTime() - 7 * 86400000);
    prevEnd = new Date(Math.min(prevStart.getTime() + (end.getTime() - start.getTime()), start.getTime()));
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevEnd = new Date(Math.min(prevStart.getTime() + (end.getTime() - start.getTime()), start.getTime()));
  }
  return { start, end, prevStart, prevEnd };
}

function periodLabel(period: Period) {
  return period === 'day' ? 'today' : period === 'week' ? 'this week' : 'this month';
}

function comparisonLabel(period: Period) {
  return period === 'day' ? 'yesterday' : period === 'week' ? 'last week' : 'last month';
}

function pctDelta(cur: number, prev: number | undefined): number | null {
  return prev && prev > 0 ? ((cur - prev) / prev) * 100 : null;
}

function makeFormatters(currency: string) {
  let money: Intl.NumberFormat;
  try {
    money = new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 });
  } catch {
    money = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  }
  const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
  return { money: (n: number) => money.format(n), compact: (n: number) => compact.format(n) };
}

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function Overview() {
  const { hasPermission } = useAuth();
  const canReports = hasPermission('reports.view');
  const now = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState<Period>('day');
  const [current, setCurrent] = useState<OverviewData | null>(null);
  const [previous, setPrevious] = useState<OverviewData | null>(null);
  const [currency, setCurrency] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { money, compact } = useMemo(() => makeFormatters(currency), [currency]);
  const comparison = comparisonLabel(period);

  const load = useCallback(async () => {
    const id = RESTAURANT_ID;
    if (!id || !canReports) {
      setLoading(false);
      return;
    }
    const { start, end, prevStart, prevEnd } = periodBounds(new Date(), period);
    const [cur, prev, settings] = await Promise.all([
      supabase.rpc('get_dashboard_overview', {
        p_restaurant_id: id,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
      }),
      supabase.rpc('get_dashboard_overview', {
        p_restaurant_id: id,
        p_start: prevStart.toISOString(),
        p_end: prevEnd.toISOString(),
      }),
      supabase.from('restaurant_settings').select('currency').eq('restaurant_id', id).maybeSingle(),
    ]);

    if (cur.error) {
      setError(cur.error.message);
    } else {
      setError(null);
      setCurrent(cur.data as OverviewData);
      setPrevious((prev.data as OverviewData | null) ?? null);
    }
    if (settings.data?.currency) setCurrency(String(settings.data.currency));
    setLoading(false);
  }, [period, canReports]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Live: any order change refreshes the numbers (debounced so a burst of
  // updates triggers one reload, not many).
  useEffect(() => {
    const id = RESTAURANT_ID;
    if (!id || !canReports) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`overview-live-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${id}` },
        () => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            void load();
          }, 800);
        },
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [canReports, load]);

  async function exportCsv() {
    const id = RESTAURANT_ID;
    if (!id) return;
    setExporting(true);
    const { start, end } = periodBounds(new Date(), period);
    let query = supabase
      .from('orders')
      .select('id, created_at, customer_name, delivery_type, payment_method, status, payment_verified, total')
      .eq('restaurant_id', id)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .order('created_at', { ascending: false })
      .limit(5000);
    const { data } = await query;

    const header = ['Order ID', 'Date', 'Customer', 'Type', 'Payment', 'Status', 'Paid', 'Total'];
    const rows = (data ?? []).map((o) =>
      [o.id, o.created_at, o.customer_name, o.delivery_type, o.payment_method, o.status, o.payment_verified ? 'yes' : 'no', o.total]
        .map(csvCell)
        .join(','),
    );
    // BOM so Excel opens Arabic customer names correctly.
    const blob = new Blob(['\uFEFF' + [header.map(csvCell).join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${period}-${now.toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  if (!canReports) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard</h1>
        <p className="mt-2 text-sm text-ink/60">Welcome back. Use the menu to open the sections you have access to.</p>
      </div>
    );
  }

  const t = current?.totals;
  const p = previous?.totals;
  const daily = current?.daily ?? [];
  const ready = !loading && !!t;
  const val = (fn: () => string) => (ready ? fn() : '—');

  // Card 1 — weekly buckets for the decorative bars.
  const weekly = daily.slice(-4).map((d) => Number(d.revenue));
  while (weekly.length < 4) weekly.unshift(0);
  const maxWeek = Math.max(...weekly, 1);
  const currentWeek = 3;

  // Card 2 — sparkline of daily revenue.
  const revenuePoints = daily.map((d) => Number(d.revenue));
  const maxRev = Math.max(...revenuePoints, 1);
  const sparkPath =
    revenuePoints.length >= 2
      ? revenuePoints
          .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(2 + (i / (revenuePoints.length - 1)) * 116).toFixed(1)} ${(40 - (v / maxRev) * 34).toFixed(1)}`)
          .join(' ')
      : 'M 2 40 L 118 40';
  const sparkLast = revenuePoints.length >= 2 ? { x: 118, y: 40 - (revenuePoints[revenuePoints.length - 1] / maxRev) * 34 } : null;

  // Card 3 — delivery share donut.
  const deliveryShare = t && t.orders > 0 ? Math.round((t.delivery_orders / t.orders) * 100) : 0;

  // Card 4 — last 14 days of order counts.
  const orderBars = daily.slice(-14).map((d) => Number(d.orders));
  const maxOrders = Math.max(...orderBars, 1);

  const statusTotal = Math.max(0, Number(t?.completed || 0) + Number(t?.pending || 0) + Number(t?.cancelled || 0));
  const maxStatus = Math.max(Number(t?.completed || 0), Number(t?.pending || 0), Number(t?.cancelled || 0), 1);
  const periodTitle = period === 'day' ? 'Today' : period === 'week' ? 'This week' : 'This month';
  const periodTrend = daily.map((point) => ({ ...point, value: Number(point.revenue || 0) }));
  const trendMax = Math.max(...periodTrend.map((point) => point.value), 1);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-black/5 hover:bg-ink/5"
          >
            Full analytics
          </Link>
          <button
            onClick={exportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium hover:bg-accent-dark disabled:opacity-60"
          >
            <Icon name="download" className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full bg-surface p-1 shadow-sm ring-1 ring-black/5" role="group" aria-label="Overview period">
          {(['day', 'week', 'month'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              aria-pressed={period === value}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                period === value ? 'bg-accent' : 'text-ink/65 hover:text-ink'
              }`}
            >
              {value === 'day' ? 'Day' : value === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
        <span className="text-sm text-ink/55">{periodTitle} · {period === 'day' ? now.toLocaleDateString() : period === 'week' ? 'Monday to today' : now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
      </div>

      {error && (
        <p className="mt-6 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-700">Couldn't load analytics: {error}</p>
      )}

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Sales — dark */}
        <div className="relative overflow-hidden rounded-3xl bg-accent p-5">
          <p className="text-sm text-on-accent/60">Sales</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
            {val(() => money(t!.sales))}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Delta value={ready ? pctDelta(t!.sales, p?.sales) : null} tone="dark" hide={!ready} />
            <span className="text-xs text-on-accent/60">vs {comparison}</span>
          </div>
          <Link to="/orders" className="mt-5 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
            See orders <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
          <div className="absolute bottom-5 right-5 flex h-20 items-end gap-1.5">
            {weekly.map((v, i) => (
              <span
                key={i}
                className={`w-3 rounded-full ${i === currentWeek ? 'bg-on-accent' : 'bg-on-accent/25'}`}
                style={{ height: `${ready ? Math.max(16, (v / maxWeek) * 100) : 16}%` }}
              />
            ))}
          </div>
        </div>

        {/* Net revenue — white + sparkline */}
        <div className="relative overflow-hidden rounded-3xl bg-surface p-5 ring-1 ring-black/5">
          <p className="text-sm text-ink/55">Net revenue</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
            {val(() => money(t!.net_revenue))}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Delta value={ready ? pctDelta(t!.net_revenue, p?.net_revenue) : null} tone="light" hide={!ready} />
            <span className="text-xs text-ink/50">vs {comparison}</span>
          </div>
          <Link to="/reports" className="mt-5 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
            See analytics <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
          <svg viewBox="0 0 120 44" className="absolute bottom-5 right-4 h-14 w-28 text-ink" fill="none" aria-hidden="true">
            <path d={sparkPath} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {sparkLast && <circle cx={sparkLast.x} cy={sparkLast.y} r="3.2" fill="currentColor" />}
          </svg>
        </div>

        {/* Items sold — soft + donut */}
        <div className="relative overflow-hidden rounded-3xl bg-secondary p-5">
          <p className="text-sm text-ink/55">Items sold</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
            {val(() => String(t!.items_sold))}
          </p>
          <p className="mt-3 text-xs text-ink/55">{val(() => `from ${t!.orders} paid orders`)}</p>
          <Link to="/products" className="mt-5 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
            See products <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
          <div className="absolute bottom-4 right-4 text-center">
            <div className="relative h-[72px] w-[72px]">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="4" style={{ stroke: 'rgb(var(--c-ink) / 0.12)' }} />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${ready ? deliveryShare : 0} 100`}
                  style={{ stroke: 'rgb(var(--c-primary))' }}
                />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums">
                {ready ? `${deliveryShare}%` : '—'}
              </span>
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-ink/50">delivery</p>
          </div>
        </div>

        {/* Avg order value — deep + bars */}
        <div className="relative overflow-hidden rounded-3xl bg-secondary-deep p-5">
          <p className="text-sm text-ink/55">Avg. order value</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
            {val(() => money(t!.avg_order_value))}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Delta value={ready ? pctDelta(t!.avg_order_value, p?.avg_order_value) : null} tone="light" hide={!ready} />
            <span className="text-xs text-ink/55">vs {comparison}</span>
          </div>
          <Link to="/customers" className="mt-5 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
            See customers <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
          <div className="absolute bottom-5 right-5 flex h-16 items-end gap-1">
            {(orderBars.length ? orderBars : [0]).map((v, i, arr) => (
              <span
                key={i}
                className={`w-1.5 rounded-full ${i === arr.length - 1 ? 'bg-accent' : 'bg-ink/20'}`}
                style={{ height: `${Math.max(12, (v / maxOrders) * 100)}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Operational overview and revenue trend for the selected period */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-3xl bg-surface p-5 ring-1 ring-black/5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">Order status</p>
              <p className="text-xs text-ink/50">How orders are progressing {period === 'day' ? 'today' : period === 'week' ? 'this week' : 'this month'}</p>
            </div>
            <span className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-ink/60">{statusTotal.toLocaleString()} orders</span>
          </div>
          <div className="mt-6 space-y-5">
            {([
              { label: 'Completed', value: Number(t?.completed || 0), bar: 'bg-emerald-500' },
              { label: 'Pending / in progress', value: Number(t?.pending || 0), bar: 'bg-amber-500' },
              { label: 'Cancelled', value: Number(t?.cancelled || 0), bar: 'bg-red-500' },
            ]).map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-ink/75">{item.label}</span>
                  <span className="font-mono font-semibold tabular-nums text-ink">{ready ? item.value.toLocaleString() : '—'}{ready && statusTotal > 0 ? <span className="ml-2 text-xs font-normal text-ink/45">{Math.round(item.value / statusTotal * 100)}%</span> : null}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-canvas">
                  <div className={`h-full rounded-full ${item.bar} transition-all duration-500`} style={{ width: `${ready ? (item.value / maxStatus) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <Link to="/orders" className="mt-6 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
            Manage orders <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </section>

        <section className="rounded-3xl bg-surface p-5 ring-1 ring-black/5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">Revenue trend</p>
              <p className="text-xs text-ink/50">Sales {period === 'day' ? 'by day' : period === 'week' ? 'by day this week' : 'by day this month'}</p>
            </div>
            <span className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-ink/60">{money(Number(t?.sales || 0))}</span>
          </div>
          {periodTrend.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink/45">No revenue data for this period.</p>
          ) : (
            <div className="mt-6 flex h-48 items-end gap-1.5 border-b border-line pb-2 sm:gap-2">
              {periodTrend.map((point) => (
                <div key={point.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={`${point.day}: ${money(point.value)} · ${point.orders} orders`}>
                  <div className="flex h-36 w-full items-end rounded-t-md bg-canvas">
                    <div className="w-full rounded-t-md bg-accent transition-all" style={{ height: `${point.value > 0 ? Math.max(3, point.value / trendMax * 100) : 0}%` }} />
                  </div>
                  <span className="max-w-full truncate text-[10px] text-ink/45">{new Date(point.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-ink/40">Compared with {comparison}. Updated automatically when orders change.</p>
        </section>
      </div>
    </div>
  );
}

function Delta({ value, tone, hide }: { value: number | null; tone: 'dark' | 'light'; hide?: boolean }) {
  if (hide) return <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs">—</span>;
  if (value === null) {
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone === 'dark' ? 'bg-on-accent/15' : 'bg-ink/10'}`}>new</span>
    );
  }
  const up = value >= 0;
  const cls =
    tone === 'dark'
      ? up ? 'bg-emerald-400/20 text-emerald-300' : 'bg-red-400/20 text-red-300'
      : up ? 'bg-emerald-500/15 text-emerald-700' : 'bg-red-500/15 text-red-700';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {up ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function Gauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const phi = Math.PI * (1 - v / 100);
  const dx = 100 + 80 * Math.cos(phi);
  const dy = 100 - 80 * Math.sin(phi);
  const ticks = Array.from({ length: 21 }, (_, i) => {
    const a = Math.PI * (1 - i / 20);
    return {
      x1: 100 + 90 * Math.cos(a),
      y1: 100 - 90 * Math.sin(a),
      x2: 100 + 96 * Math.cos(a),
      y2: 100 - 96 * Math.sin(a),
    };
  });
  return (
    <svg viewBox="0 0 200 112" className="w-full" aria-hidden="true">
      {ticks.map((tk, i) => (
        <line key={i} {...tk} strokeWidth="1.5" style={{ stroke: 'rgb(var(--c-on-primary) / 0.35)' }} />
      ))}
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" strokeWidth="10" strokeLinecap="round" style={{ stroke: 'rgb(var(--c-on-primary) / 0.15)' }} />
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${v} 100`}
        style={{ stroke: 'rgb(var(--c-on-primary))' }}
      />
      <circle cx={dx} cy={dy} r="8" style={{ fill: 'rgb(var(--c-on-primary))' }} />
      <circle cx={dx} cy={dy} r="3.5" style={{ fill: 'rgb(var(--c-primary))' }} />
    </svg>
  );
}
