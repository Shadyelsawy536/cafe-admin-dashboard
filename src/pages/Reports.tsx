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
interface AnalyticsOrder {
  total: number | string | null;
  status: string | null;
  created_at: string;
  payment_verified: boolean | null;
}
interface TrendPoint {
  key: string;
  label: string;
  revenue: number;
  orders: number;
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
  const [reportError, setReportError] = useState<string | null>(null);
  const [currency, setCurrency] = useState('EGP');
  const [analyticsOrders, setAnalyticsOrders] = useState<AnalyticsOrder[]>([]);
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [previousSales, setPreviousSales] = useState<number | null>(null);
  const [trendView, setTrendView] = useState<'day' | 'week' | 'month'>('day');

  const [breakdownProduct, setBreakdownProduct] = useState<ProductSales | null>(null);
  const [breakdown, setBreakdown] = useState<ProductBreakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [showBestSellersReport, setShowBestSellersReport] = useState(false);

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
    setReportError(null);
    if (!startDate || !endDate || startDate > endDate) {
      setReport(null);
      setReportError('Choose a valid date range. The start date must be on or before the end date.');
      setLoading(false);
      return;
    }
    const { start, end } = rangeBounds();

    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('currency')
      .eq('restaurant_id', RESTAURANT_ID)
      .maybeSingle();
    if (settings?.currency) setCurrency(settings.currency);

    const duration = Math.max(24 * 60 * 60 * 1000, end.getTime() - start.getTime());
    const previousStart = new Date(start.getTime() - duration);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      { data, error },
      { data: orderRows, error: ordersError },
      { data: previousReport },
      { count: todayCount },
      { count: pendingCount },
    ] = await Promise.all([
      supabase.rpc('get_sales_report', {
        p_restaurant_id: RESTAURANT_ID,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
      }),
      supabase.from('orders')
        .select('total, status, created_at, payment_verified')
        .eq('restaurant_id', RESTAURANT_ID)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
        .order('created_at', { ascending: true }),
      supabase.rpc('get_sales_report', {
        p_restaurant_id: RESTAURANT_ID,
        p_start: previousStart.toISOString(),
        p_end: start.toISOString(),
      }),
      supabase.from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', RESTAURANT_ID)
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .not('status', 'in', '("cancelled","rejected")'),
      supabase.from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', RESTAURANT_ID)
        .eq('status', 'pending'),
    ]);

    if (error || !data) {
      setReport(null);
      setReportError(error?.message || 'The report could not be loaded. Please try again.');
    } else {
      setReport(data as SalesReport);
      setPreviousSales(previousReport ? Number((previousReport as SalesReport).totals?.total_sales ?? 0) : null);
    }
    setAnalyticsOrders(!ordersError && orderRows ? orderRows as AnalyticsOrder[] : []);
    setTodayOrdersCount(todayCount ?? 0);
    setPendingOrdersCount(pendingCount ?? 0);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  function applyPreset(days: number) {
    setStartDate(toDateInputValue(daysAgo(days)));
    setEndDate(toDateInputValue(new Date()));
  }

  async function exportExcel() {
    if (!report) return;
    const { start, end } = rangeBounds();
    const breakdowns = await Promise.all(report.products.map(async (product) => {
      const { data, error } = await supabase.rpc('get_product_breakdown', {
        p_restaurant_id: RESTAURANT_ID,
        p_product_id: product.product_id,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
      });
      return !error && data ? { product, breakdown: data as ProductBreakdown } : null;
    }));

    const sizes = new Map<string, number>();
    const modifiers = new Map<string, { group: string; name: string; count: number }>();
    breakdowns.filter((item): item is NonNullable<typeof item> => item !== null).forEach(({ breakdown }) => {
      breakdown.variants.filter(v => v.label !== 'Standard').forEach(v => sizes.set(v.label, (sizes.get(v.label) ?? 0) + Number(v.quantity_sold || 0)));
      breakdown.modifiers.forEach(m => {
        const key = `${m.group_name}||${m.modifier_name}`;
        const current = modifiers.get(key);
        modifiers.set(key, { group: m.group_name, name: m.modifier_name, count: (current?.count ?? 0) + Number(m.quantity_sold || 0) });
      });
    });

    const esc = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    type Cell = { value: unknown; numeric?: boolean; style?: number };
    type Sheet = { name: string; rows: Cell[][] };
    const row = (...values: unknown[]): Cell[] => values.map(value => ({ value }));
    const heading = (title: string): Cell[] => [{ value: title, style: 1 }];
    const tableHeader = (...values: unknown[]): Cell[] => values.map(value => ({ value, style: 2 }));
    const sheets: Sheet[] = [
      { name: 'Summary', rows: [
        heading('HUBDINE · SALES REPORT'), row('Start date', startDate), row('End date', endDate), [],
        heading('SUMMARY'), tableHeader('Metric', 'Value'),
        row('Total sales', Number(report.totals.total_sales)), row('Total orders', Number(report.totals.total_orders)),
        row('Average order value', Number(report.totals.avg_order_value)), row('Currency', currency),
      ]},
      { name: 'Daily Sales', rows: [
        heading('DAILY SALES'), tableHeader('Date', 'Orders', `Revenue (${currency})`),
        ...report.daily.map(day => row(day.day.slice(0, 10), Number(day.orders), Number(day.revenue))),
      ]},
      { name: 'Product Sales', rows: [
        heading('PRODUCT SALES'), tableHeader('Product', 'Quantity sold', `Revenue (${currency})`),
        ...report.products.map(p => row(p.product_name, Number(p.quantity_sold), Number(p.revenue))),
      ]},
      { name: 'Category Sales', rows: [
        heading('CATEGORY SALES'), tableHeader('Category', 'Quantity sold', `Revenue (${currency})`),
        ...report.categories.map(c => row(c.category_name, Number(c.quantity_sold), Number(c.revenue))),
      ]},
      { name: 'Size Sales', rows: [
        heading('SIZE SALES'), tableHeader('Size', 'Quantity sold'),
        ...Array.from(sizes.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => row(name, count)),
        ...(sizes.size ? [] : [row('No size data available for this period')]),
      ]},
      { name: 'Modifier Sales', rows: [
        heading('MODIFIER SALES'), tableHeader('Modifier group', 'Selected option', 'Times selected'),
        ...Array.from(modifiers.values()).sort((a, b) => b.count - a.count).map(m => row(m.group, m.name, m.count)),
        ...(modifiers.size ? [] : [row('No modifier data available for this period')]),
      ]},
    ];
    const xmlCell = (cell: Cell) => {
      const value = cell.value;
      const numeric = typeof value === 'number' && Number.isFinite(value);
      return `<Cell${cell.style ? ` ss:StyleID="s${cell.style}"` : ''}><Data ss:Type="${numeric ? 'Number' : 'String'}">${esc(value)}</Data></Cell>`;
    };
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">
<Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Aptos" ss:Size="10" ss:Color="#243247"/></Style><Style ss:ID="s1"><Font ss:FontName="Aptos Display" ss:Size="14" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#17365D" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#17365D"/></Borders></Style><Style ss:ID="s2"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#4472C4" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/></Borders></Style></Styles>
${sheets.map(sheet => `<Worksheet ss:Name="${esc(sheet.name)}"><Table>${sheet.rows.map(cells => `<Row>${cells.map(xmlCell).join('')}</Row>`).join('')}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>2</SplitHorizontal><TopRowBottomPane>2</TopRowBottomPane><ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios></WorksheetOptions></Worksheet>`).join('')}
</Workbook>`;
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-report-${startDate}-to-${endDate}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
    <div className="flex min-h-full flex-col lg:flex-row">
      <div className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Reports</h1>
        <p className="mt-1 text-sm text-ink/60">Sales performance for the selected period.</p>

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 sm:p-4">
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
          <button onClick={() => void exportExcel()} disabled={!report || loading} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">Export Excel</button>
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-ink/50">Loading…</p>
        ) : !report ? (
          <div role="alert" className="mt-8 rounded-xl border border-line bg-surface p-5 text-sm text-ink/70"><p className="font-medium text-ink">Couldn't load report</p><p className="mt-1">{reportError || 'No report data is available for this date range.'}</p><button onClick={() => void load()} className="mt-4 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white">Try again</button></div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Total Sales" value={formatCurrency(Number(report.totals.total_sales), currency)} accent="text-accent" />
              <StatCard label="Total Orders" value={String(report.totals.total_orders)} />
              <StatCard label="Avg. Order Value" value={formatCurrency(Number(report.totals.avg_order_value), currency)} />
              <StatCard label="Orders Today" value={String(todayOrdersCount)} />
              <StatCard label="Pending Orders" value={String(pendingOrdersCount)} />
            </div>

            <section className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-ink">Sales performance</h2>
                  <p className="mt-1 text-xs text-ink/50">Verified payments · selected reporting period</p>
                </div>
                <div className="flex rounded-lg border border-line bg-canvas p-1">
                  {(['day', 'week', 'month'] as const).map((view) => (
                    <button key={view} onClick={() => setTrendView(view)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${trendView === view ? 'bg-surface text-ink shadow-sm' : 'text-ink/50 hover:text-ink'}`}>
                      {view}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-canvas p-4">
                  <p className="text-xs text-ink/50">Period sales</p>
                  <p className="mt-2 font-mono text-xl font-semibold text-ink">{formatCurrency(Number(report.totals.total_sales), currency)}</p>
                </div>
                <div className="rounded-xl bg-canvas p-4">
                  <p className="text-xs text-ink/50">Previous equivalent period</p>
                  <p className="mt-2 font-mono text-xl font-semibold text-ink">{previousSales === null ? '—' : formatCurrency(previousSales, currency)}</p>
                </div>
                <div className="rounded-xl bg-canvas p-4">
                  <p className="text-xs text-ink/50">Change vs previous period</p>
                  <p className={`mt-2 font-mono text-xl font-semibold ${previousSales !== null && Number(report.totals.total_sales) >= previousSales ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {previousSales === null ? '—' : previousSales === 0 ? (Number(report.totals.total_sales) === 0 ? '0.0%' : 'New sales') : `${Number(((Number(report.totals.total_sales) - previousSales) / previousSales) * 100).toFixed(1)}%`}
                  </p>
                </div>
              </div>
              <SalesTrendChart
                daily={report.daily}
                currency={currency}
                view={trendView}
                formatCurrency={formatCurrency}
              />
              <HourlySalesChart orders={analyticsOrders} currency={currency} formatCurrency={formatCurrency} />
            </section>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <button
                type="button"
                onClick={() => setShowBestSellersReport(true)}
                className="group w-full rounded-2xl border border-line bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent/40 sm:p-6"
                aria-label="Open full Best-Selling Products report"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">Product insights</p>
                    <h2 className="mt-1 text-base font-semibold text-ink">Best-Selling Products</h2>
                    <p className="mt-1 text-xs text-ink/50">Top performers for the selected period</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white">↗</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-canvas p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-ink/45">Products</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{report.products.length}</p>
                  </div>
                  <div className="rounded-xl bg-canvas p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-ink/45">Units sold</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{report.products.reduce((sum, p) => sum + Number(p.quantity_sold || 0), 0)}</p>
                  </div>
                  <div className="rounded-xl bg-canvas p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-ink/45">Top seller</p>
                    <p className="mt-1 truncate text-sm font-semibold text-ink">{report.products[0]?.product_name ?? '—'}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {report.products.length === 0 && <p className="text-xs text-ink/40">No sales in this period.</p>}
                  {report.products.slice(0, 3).map((p, index) => (
                    <div key={p.product_id} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-canvas text-xs font-semibold text-ink/60">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-ink">{p.product_name}</span>
                          <span className="shrink-0 font-mono text-xs tabular-nums text-ink/70">{formatCurrency(Number(p.revenue), currency)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas">
                          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${maxProductRevenue > 0 ? (Number(p.revenue) / maxProductRevenue) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-xs font-semibold text-accent">
                  <span>Open full product report</span><span className="transition-transform group-hover:translate-x-1">View report →</span>
                </div>
              </button>

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

            <section className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">Product performance</p>
                  <h2 className="mt-1 text-base font-semibold text-ink">What customers are ordering</h2>
                  <p className="mt-1 text-xs text-ink/50">Top products ranked by sales revenue · selected period</p>
                </div>
                <button type="button" onClick={() => setShowBestSellersReport(true)} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-accent/50 hover:text-accent">View full report ↗</button>
              </div>
              {report.products.length === 0 ? (
                <p className="py-10 text-center text-sm text-ink/45">No product sales to analyze for this period.</p>
              ) : (
                <div className="mt-6 space-y-4">
                  {report.products.slice(0, 8).map((p, index) => (
                    <button key={p.product_id} type="button" onClick={() => openBreakdown(p)} className="group block w-full rounded-xl p-2 text-left transition hover:bg-canvas/70">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${index === 0 ? 'bg-accent text-white' : 'bg-canvas text-ink/60'}`}>{String(index + 1).padStart(2, '0')}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                            <span className="truncate text-sm font-medium text-ink">{p.product_name}</span>
                            <span className="font-mono text-sm font-semibold tabular-nums text-ink">{formatCurrency(Number(p.revenue), currency)}</span>
                          </div>
                          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-canvas">
                            <div className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent transition-all duration-500 group-hover:opacity-80" style={{ width: `${maxProductRevenue > 0 ? Math.max(2, (Number(p.revenue) / maxProductRevenue) * 100) : 0}%` }} />
                          </div>
                          <p className="mt-1.5 text-[11px] text-ink/45">{Number(p.quantity_sold).toLocaleString()} units sold · click for sizes and modifiers</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold text-ink">Sales Over Time</h2>
              <div className="mt-4 flex items-end gap-2" style={{ height: 120 }}>
                {report.daily.length === 0 && <p className="text-xs text-ink/40">No sales in this period.</p>}
                {report.daily.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${formatCurrency(Number(d.revenue), currency)} · ${d.orders} orders`}>
                    <div className="w-full rounded-t bg-accent/70" style={{ height: `${maxDailyRevenue > 0 ? (Number(d.revenue) / maxDailyRevenue) * 100 : 0}%`, minHeight: Number(d.revenue) > 0 ? 3 : 0 }} />
                    <span className="text-[9px] text-ink/40">{new Date(d.day).getDate()}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {showBestSellersReport && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="best-sellers-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowBestSellersReport(false); }}>
          <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-canvas/70 p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">HUBDINE · PRODUCT ANALYTICS</p>
                <h2 id="best-sellers-title" className="mt-1 font-display text-xl font-semibold text-ink sm:text-2xl">Best-Selling Products</h2>
                <p className="mt-1 text-sm text-ink/55">{startDate} — {endDate} · Ranked by revenue</p>
              </div>
              <button type="button" onClick={() => setShowBestSellersReport(false)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink/55 transition hover:bg-surface hover:text-ink" aria-label="Close report">✕</button>
            </header>
            <div className="grid grid-cols-1 gap-3 border-b border-line p-4 sm:grid-cols-3 sm:p-5">
              <div className="rounded-xl bg-canvas p-4"><p className="text-xs text-ink/50">Products sold</p><p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{report.products.length}</p></div>
              <div className="rounded-xl bg-canvas p-4"><p className="text-xs text-ink/50">Total units sold</p><p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{report.products.reduce((sum, p) => sum + Number(p.quantity_sold || 0), 0).toLocaleString()}</p></div>
              <div className="rounded-xl bg-canvas p-4"><p className="text-xs text-ink/50">Product revenue</p><p className="mt-1 text-2xl font-semibold tabular-nums text-accent">{formatCurrency(report.products.reduce((sum, p) => sum + Number(p.revenue || 0), 0), currency)}</p></div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {report.products.length === 0 ? <p className="py-12 text-center text-sm text-ink/50">No product sales for this period.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                    <thead><tr className="border-b border-line text-xs uppercase tracking-wide text-ink/45"><th className="px-3 py-3 font-semibold">Rank / Product</th><th className="px-3 py-3 text-right font-semibold">Units sold</th><th className="px-3 py-3 text-right font-semibold">Revenue</th><th className="px-3 py-3 text-right font-semibold">Share of product revenue</th><th className="px-3 py-3 text-right font-semibold">Details</th></tr></thead>
                    <tbody>
                      {report.products.map((p, index) => {
                        const totalProductRevenue = report.products.reduce((sum, product) => sum + Number(product.revenue || 0), 0);
                        const share = totalProductRevenue > 0 ? Number(p.revenue || 0) / totalProductRevenue * 100 : 0;
                        return <tr key={p.product_id} className="border-b border-line/70 transition hover:bg-canvas/70">
                          <td className="px-3 py-3"><div className="flex items-center gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${index === 0 ? 'bg-accent text-white' : 'bg-canvas text-ink/60'}`}>{index + 1}</span><span className="font-medium text-ink">{p.product_name}</span></div></td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums text-ink/70">{Number(p.quantity_sold).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right font-mono font-semibold tabular-nums text-ink">{formatCurrency(Number(p.revenue), currency)}</td>
                          <td className="px-3 py-3 text-right"><div className="flex items-center justify-end gap-2"><span className="text-xs tabular-nums text-ink/60">{share.toFixed(1)}%</span><div className="h-1.5 w-16 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-accent" style={{ width: `${share}%` }} /></div></div></td>
                          <td className="px-3 py-3 text-right"><button type="button" onClick={() => { setShowBestSellersReport(false); void openBreakdown(p); }} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent/50 hover:text-accent">Sizes & options</button></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-4 text-xs text-ink/40">Choose “Sizes & options” to see sold sizes and selected modifiers for a product. Revenue and rankings use the selected reporting period.</p>
            </div>
          </section>
        </div>
      )}

      {breakdownProduct && (
        <aside className="w-full shrink-0 overflow-y-auto border-t border-line bg-surface p-5 sm:p-6 lg:w-96 lg:border-l lg:border-t-0">
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


function SalesTrendChart({
  daily, currency, view, formatCurrency: format,
}: {
  daily: DailySales[];
  currency: string;
  view: 'day' | 'week' | 'month';
  formatCurrency: (amount: number, currency: string) => string;
}) {
  const buckets = new Map<string, TrendPoint>();
  const getBucket = (date: Date) => {
    const d = new Date(date);
    if (view === 'month') {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { key, label: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) };
    }
    if (view === 'week') {
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { key, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
    }
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { key, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
  };
  daily.forEach(day => {
    const date = new Date(day.day);
    const bucket = getBucket(date);
    const existing = buckets.get(bucket.key) ?? { key: bucket.key, label: bucket.label, revenue: 0, orders: 0 };
    existing.revenue += Number(day.revenue || 0);
    existing.orders += Number(day.orders || 0);
    buckets.set(bucket.key, existing);
  });
  const points = Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
  const max = Math.max(1, ...points.map(point => point.revenue));
  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Sales trend</h3>
        <span className="text-xs text-ink/45">By {view}</span>
      </div>
      {points.length === 0 ? <p className="py-8 text-center text-sm text-ink/45">No sales data for this period.</p> : (
        <div className="flex h-56 items-end gap-2 overflow-x-auto border-b border-line pb-2">
          {points.map(point => (
            <div key={point.key} className="flex h-full min-w-[34px] flex-1 flex-col items-center justify-end gap-2" title={`${point.label}: ${format(point.revenue, currency)} · ${point.orders} orders`}>
              <span className="max-w-20 truncate text-[10px] text-ink/45">{point.revenue > 0 ? format(point.revenue, currency) : '—'}</span>
              <div className="flex h-36 w-full items-end rounded-t-md bg-canvas">
                <div className="w-full rounded-t-md bg-accent transition-all" style={{ height: `${point.revenue > 0 ? Math.max(4, point.revenue / max * 100) : 0}%` }} />
              </div>
              <span className="whitespace-nowrap text-[10px] text-ink/50">{point.label}</span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-ink/40">Sales totals come from the report function. Hourly distribution below uses orders marked as payment verified.</p>
    </div>
  );
}

function HourlySalesChart({ orders, currency, formatCurrency: format }: {
  orders: AnalyticsOrder[];
  currency: string;
  formatCurrency: (amount: number, currency: string) => string;
}) {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, sales: 0, orders: 0 }));
  orders.forEach(order => {
    if (order.payment_verified !== true || ['cancelled', 'rejected'].includes((order.status || '').toLowerCase())) return;
    const hour = new Date(order.created_at).getHours();
    hours[hour].sales += Number(order.total || 0);
    hours[hour].orders += 1;
  });
  const max = Math.max(1, ...hours.map(hour => hour.sales));
  const peak = hours.reduce((best, hour) => hour.sales > best.sales ? hour : best, hours[0]);
  return (
    <div className="mt-7 border-t border-line pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Hourly sales</h3>
          <p className="mt-1 text-xs text-ink/45">Sales by time of day across the selected period</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink/45">Busiest sales hour</p>
          <p className="mt-1 text-sm font-semibold text-ink">{peak.sales > 0 ? `${String(peak.hour).padStart(2, '0')}:00–${String((peak.hour + 1) % 24).padStart(2, '0')}:00` : 'No paid sales'}</p>
        </div>
      </div>
      <div className="mt-5 grid h-36 grid-cols-12 items-end gap-1 sm:grid-cols-[repeat(24,minmax(0,1fr))]">
        {hours.map(hour => (
          <div key={hour.hour} className="group flex h-full min-w-0 flex-col items-center justify-end gap-1" title={`${String(hour.hour).padStart(2, '0')}:00 · ${format(hour.sales, currency)} · ${hour.orders} orders`}>
            <div className="flex h-28 w-full items-end rounded-t bg-canvas">
              <div className="w-full rounded-t-sm bg-accent/80 transition-all group-hover:bg-accent" style={{ height: `${hour.sales > 0 ? Math.max(4, hour.sales / max * 100) : 0}%` }} />
            </div>
            {hour.hour % 3 === 0 && <span className="text-[9px] text-ink/45">{String(hour.hour).padStart(2, '0')}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return <div className="rounded-2xl border border-line bg-surface p-5"><p className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</p><p className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${accent ?? 'text-ink'}`}>{value}</p></div>;
}
