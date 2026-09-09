import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';

interface ProductSales {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  revenue: number;
}
interface CategorySales {
  category_name: string;
  quantity_sold: number;
  revenue: number;
}
interface DailySales {
  day: string;
  revenue: number;
  orders: number;
}
interface SalesReport {
  totals: { total_sales: number; total_orders: number; avg_order_value: number };
  products: ProductSales[];
  categories: CategorySales[];
  daily: DailySales[];
}
interface VariantBreakdown {
  label: string;
  quantity_sold: number;
}
interface ModifierBreakdownRow {
  group_name: string;
  modifier_name: string;
  quantity_sold: number;
}
interface ProductBreakdown {
  totals: { total_sold: number; total_revenue: number };
  variants: VariantBreakdown[];
  modifiers: ModifierBreakdownRow[];
}

function formatCurrency(amount: number, currency: string) {
  const code = currency.trim().toUpperCase();
  const symbols: Record<string, string> = { EGP: 'EGP', USD: '$', EUR: '€', GBP: '£', SAR: 'SAR', AED: 'AED' };
  return `${symbols[code] ?? code} ${amount.toFixed(2)}`;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}
function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

export function Reports() {
  const [startDate, setStartDate] = useState(toDateInputValue(daysAgo(30)));
  const [endDate, setEndDate] = useState(toDateInputValue(new Date()));
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('EGP');

  const [breakdownProduct, setBreakdownProduct] = useState<ProductSales | null>(null);
  const [breakdown, setBreakdown] = useState<ProductBreakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  function rangeBounds() {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    return { start, end };
  }

  const load = useCallback(async () => {
    setLoading(true);
    const { start, end } = rangeBounds();

    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('currency')
      .eq('restaurant_id', RESTAURANT_ID)
      .maybeSingle();
    if (settings?.currency) setCurrency(settings.currency);

    const { data, error } = await supabase.rpc('get_sales_report', {
      p_restaurant_id: RESTAURANT_ID,
      p_start: start.toISOString(),
      p_end: end.toISOString(),
    });

    if (!error && data) setReport(data as SalesReport);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  function applyPreset(days: number) {
    setStartDate(toDateInputValue(daysAgo(days)));
    setEndDate(toDateInputValue(new Date()));
  }

  async function openBreakdown(product: ProductSales) {
    setBreakdownProduct(product);
    setBreakdownLoading(true);
    setBreakdown(null);

    const { start, end } = rangeBounds();
    const { data, error } = await supabase.rpc('get_product_breakdown', {
      p_restaurant_id: RESTAURANT_ID,
      p_product_id: product.product_id,
      p_start: start.toISOString(),
      p_end: end.toISOString(),
    });

    if (!error && data) setBreakdown(data as ProductBreakdown);
    setBreakdownLoading(false);
  }

  const maxProductRevenue = report?.products.length ? Math.max(...report.products.map((p) => Number(p.revenue))) : 0;
  const maxDailyRevenue = report?.daily.length ? Math.max(...report.daily.map((d) => Number(d.revenue))) : 0;

  const groupedModifiers = breakdown
    ? breakdown.modifiers.reduce<Record<string, ModifierBreakdownRow[]>>((acc, row) => {
        (acc[row.group_name] ??= []).push(row);
        return acc;
      }, {})
    : {};

  const hasVariantData = breakdown ? breakdown.variants.some((v) => v.label !== 'Standard') : false;

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Reports</h1>
        <p className="mt-1 text-sm text-ink/60">Sales performance for the selected period.</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
            <span className="text-sm text-ink/40">to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
          </div>
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p.days)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink/60 hover:border-accent/40">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-ink/50">Loading…</p>
        ) : !report ? (
          <p className="mt-8 text-sm text-ink/50">Couldn't load report.</p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Total Sales" value={formatCurrency(Number(report.totals.total_sales), currency)} accent="text-accent" />
              <StatCard label="Total Orders" value={String(report.totals.total_orders)} />
              <StatCard label="Avg. Order Value" value={formatCurrency(Number(report.totals.avg_order_value), currency)} />
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surface p-5">
                <h2 className="text-sm font-semibold text-ink">Best-Selling Products</h2>
                <div className="mt-4 space-y-3">
                  {report.products.length === 0 && <p className="text-xs text-ink/40">No sales in this period.</p>}
                  {report.products.map((p) => (
                    <button key={p.product_id} onClick={() => openBreakdown(p)} className="block w-full text-left">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-ink">{p.product_name}</span>
                        <span className="font-mono tabular-nums text-ink/70">{formatCurrency(Number(p.revenue), currency)}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${maxProductRevenue > 0 ? (Number(p.revenue) / maxProductRevenue) * 100 : 0}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-ink/40">{p.quantity_sold} sold · View Breakdown →</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-5">
                <h2 className="text-sm font-semibold text-ink">Sales by Category</h2>
                <div className="mt-4 space-y-3">
                  {report.categories.length === 0 && <p className="text-xs text-ink/40">No sales in this period.</p>}
                  {report.categories.map((c) => (
                    <div key={c.category_name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-ink">{c.category_name}</span>
                        <span className="font-mono tabular-nums text-ink/70">{formatCurrency(Number(c.revenue), currency)}</span>
                      </div>
                      <p className="text-xs text-ink/40">{c.quantity_sold} items sold</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold text-ink">Sales Over Time</h2>
              <div className="mt-4 flex items-end gap-2" style={{ height: 120 }}>
                {report.daily.length === 0 && <p className="text-xs text-ink/40">No sales in this period.</p>}
                {report.daily.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${formatCurrency(Number(d.revenue), currency)} · ${d.orders} orders`}>
                    <div className="w-full rounded-t bg-accent/70" style={{ height: `${maxDailyRevenue > 0 ? (Number(d.revenue) / maxDailyRevenue) * 100 : 2}px`, minHeight: 2 }} />
                    <span className="text-[9px] text-ink/40">{new Date(d.day).getDate()}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {breakdownProduct && (
        <aside className="w-96 shrink-0 overflow-y-auto border-l border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">{breakdownProduct.product_name}</h2>
            <button onClick={() => setBreakdownProduct(null)} className="text-ink/40 hover:text-ink">✕</button>
          </div>

          {breakdownLoading ? (
            <p className="mt-6 text-sm text-ink/50">Loading…</p>
          ) : !breakdown ? (
            <p className="mt-6 text-sm text-ink/50">Couldn't load breakdown.</p>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-line p-3"><p className="text-xs text-ink/50">Total Sold</p><p className="mt-1 font-mono text-xl font-semibold text-ink">{breakdown.totals.total_sold}</p></div>
                <div className="rounded-xl border border-line p-3"><p className="text-xs text-ink/50">Revenue</p><p className="mt-1 font-mono text-xl font-semibold text-ink">{formatCurrency(Number(breakdown.totals.total_revenue), currency)}</p></div>
              </div>

              {hasVariantData && (
                <div className="mt-6"><h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">Sizes</h3><div className="mt-2 space-y-2">{breakdown.variants.map((v) => <div key={v.label} className="flex items-center justify-between text-sm"><span className="text-ink">{v.label}</span><span className="font-mono text-ink/60">{v.quantity_sold}</span></div>)}</div></div>
              )}

              {Object.entries(groupedModifiers).map(([groupName, rows]) => (
                <div key={groupName} className="mt-6"><h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">{groupName}</h3><div className="mt-2 space-y-2">{rows.map((row) => <div key={row.modifier_name} className="flex items-center justify-between text-sm"><span className="text-ink">{row.modifier_name}</span><span className="font-mono text-ink/60">{row.quantity_sold}</span></div>)}</div></div>
              ))}

              {!hasVariantData && Object.keys(groupedModifiers).length === 0 && <p className="mt-6 text-xs text-ink/40">No size or modifier data for this product in this period.</p>}
            </>
          )}
        </aside>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return <div className="rounded-2xl border border-line bg-surface p-5"><p className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</p><p className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${accent ?? 'text-ink'}`}>{value}</p></div>;
}
