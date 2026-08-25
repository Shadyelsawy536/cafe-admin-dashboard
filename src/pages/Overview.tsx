import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';

interface Stats {
  todaySales: number;
  todayOrders: number;
  pendingCount: number;
  avgOrderValue: number;
}

export function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select('total, status, created_at')
        .eq('restaurant_id', RESTAURANT_ID)
        .gte('created_at', startOfToday.toISOString());

      if (!error && data) {
        const todaySales = data.reduce((sum, o) => sum + Number(o.total), 0);
        const todayOrders = data.length;
        const pendingCount = data.filter((o) => o.status === 'pending').length;
        const avgOrderValue = todayOrders > 0 ? todaySales / todayOrders : 0;
        setStats({ todaySales, todayOrders, pendingCount, avgOrderValue });
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-8">
      <h1 className="font-display text-2xl font-semibold text-ink">Overview</h1>
      <p className="mt-1 text-sm text-ink/60">Today at a glance.</p>

      {loading ? (
        <p className="mt-8 text-sm text-ink/50">Loading…</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Today's Sales" value={`€${(stats?.todaySales ?? 0).toFixed(2)}`} accent="text-accent" />
          <StatCard label="Orders Today" value={String(stats?.todayOrders ?? 0)} />
          <StatCard label="Pending" value={String(stats?.pendingCount ?? 0)} accent="text-status-pending" />
          <StatCard label="Avg. Order Value" value={`€${(stats?.avgOrderValue ?? 0).toFixed(2)}`} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</p>
      <p className={`mt-2 font-mono text-3xl font-semibold tabular-nums ${accent ?? 'text-ink'}`}>{value}</p>
    </div>
  );
}
