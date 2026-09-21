import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';

interface CustomerSummary {
  customer_id: string;
  full_name: string;
  phone: string;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
}
interface AddressRow {
  id: string;
  label: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  street: string | null;
  notes: string | null;
}
interface OrderSummaryRow {
  id: string;
  total: number;
  status: string;
  created_at: string;
}

export function Customers() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CustomerSummary | null>(null);
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderSummaryRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_customers_summary', { p_restaurant_id: RESTAURANT_ID });
    setCustomers((data as CustomerSummary[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openCustomer(customer: CustomerSummary) {
    setSelected(customer);
    setDetailLoading(true);
    const [addressesRes, ordersRes] = await Promise.all([
      supabase.from('customer_addresses').select('id, label, building, floor, apartment, street, notes').eq('customer_id', customer.customer_id),
      supabase
        .from('orders')
        .select('id, total, status, created_at')
        .eq('customer_id', customer.customer_id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    setAddresses(addressesRes.data ?? []);
    setRecentOrders(ordersRes.data ?? []);
    setDetailLoading(false);
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Customers</h1>
        <p className="mt-1 text-sm text-ink/60">{customers.length} customers</p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
          {loading ? (
            <p className="p-6 text-sm text-ink/50">Loading…</p>
          ) : customers.length === 0 ? (
            <p className="p-6 text-sm text-ink/50">No customers yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-xs uppercase tracking-wide text-ink/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium">Total Spent</th>
                  <th className="px-4 py-3 font-medium">Last Order</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.customer_id}
                    onClick={() => openCustomer(c)}
                    className={`cursor-pointer border-b border-line last:border-0 hover:bg-canvas/50 ${selected?.customer_id === c.customer_id ? 'bg-canvas' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium text-ink">{c.full_name}</td>
                    <td className="px-4 py-3 text-ink/70">{c.phone}</td>
                    <td className="px-4 py-3 font-mono">{c.order_count}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{Number(c.total_spent).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-ink/50">
                      {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <aside className="w-96 shrink-0 overflow-y-auto border-l border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">{selected.full_name}</h2>
            <button onClick={() => setSelected(null)} className="text-ink/40 hover:text-ink">✕</button>
          </div>
          <p className="mt-1 text-sm text-ink/60">{selected.phone}</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line p-3">
              <p className="text-xs text-ink/50">Orders</p>
              <p className="mt-1 font-mono text-xl font-semibold text-ink">{selected.order_count}</p>
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="text-xs text-ink/50">Total Spent</p>
              <p className="mt-1 font-mono text-xl font-semibold text-ink">{Number(selected.total_spent).toFixed(2)}</p>
            </div>
          </div>

          {detailLoading ? (
            <p className="mt-6 text-sm text-ink/50">Loading…</p>
          ) : (
            <>
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">Addresses</h3>
                <div className="mt-2 space-y-2">
                  {addresses.length === 0 && <p className="text-xs text-ink/40">No saved addresses.</p>}
                  {addresses.map((a) => (
                    <div key={a.id} className="rounded-lg border border-line px-3 py-2 text-sm">
                      <p className="font-medium text-ink">{a.label}</p>
                      <p className="text-xs text-ink/60">
                        {[a.street, a.building, a.floor && `Floor ${a.floor}`, a.apartment && `Apt ${a.apartment}`].filter(Boolean).join(', ') || '—'}
                      </p>
                      {a.notes && <p className="text-xs text-ink/40">{a.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">Recent Orders</h3>
                <div className="mt-2 space-y-2">
                  {recentOrders.length === 0 && <p className="text-xs text-ink/40">No orders yet.</p>}
                  {recentOrders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-mono text-xs text-ink/60">#{o.id.slice(-6)}</span>
                        <span className="ml-2 text-xs capitalize text-ink/40">{o.status.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="font-mono tabular-nums text-ink/70">{Number(o.total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      )}
    </div>
  );
}
