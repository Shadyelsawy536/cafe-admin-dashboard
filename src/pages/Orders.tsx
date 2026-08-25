import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';
import { StatusBadge, STATUS_META, OrderStatus } from '../components/StatusBadge';

interface OrderItemModifier {
  modifier_name: string;
  price: number;
}
interface OrderItem {
  id: string;
  product_name: string;
  variant_label: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  order_item_modifiers: OrderItemModifier[];
}
interface OrderRow {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_type: 'delivery' | 'pickup';
  delivery_address: string | null;
  pickup_branch: string | null;
  payment_method: 'cash' | 'visa';
  subtotal: number;
  tax: number;
  discount_amount: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  order_items: OrderItem[];
}

const FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Ready', value: 'ready' },
  { label: 'Out for Delivery', value: 'out_for_delivery' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'out_for_delivery',
  out_for_delivery: 'delivered',
};

export function Orders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(
        `id, customer_name, customer_phone, delivery_type, delivery_address, pickup_branch,
         payment_method, subtotal, tax, discount_amount, total, status, created_at,
         order_items(id, product_name, variant_label, unit_price, quantity, line_total,
           order_item_modifiers(modifier_name, price))`
      )
      .eq('restaurant_id', RESTAURANT_ID)
      .order('created_at', { ascending: false });

    if (!error && data) setOrders(data as unknown as OrderRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
  load();

  const channel = supabase
    .channel(`orders-realtime-${RESTAURANT_ID}`)

    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${RESTAURANT_ID}`,
      },
      () => {
        load();
      }
    )

    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${RESTAURANT_ID}`,
      },
      () => {
        load();
      }
    )

    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${RESTAURANT_ID}`,
      },
      () => {
        load();
      }
    )

    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [load]);

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  async function advanceStatus(order: OrderRow) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdating(true);
    const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id);
    if (!error) {
      await load();
      setSelected((prev) => (prev && prev.id === order.id ? { ...prev, status: next } : prev));
    }
    setUpdating(false);
  }

  async function rejectOrder(order: OrderRow) {
    setUpdating(true);
    const { error } = await supabase.from('orders').update({ status: 'rejected' }).eq('id', order.id);
    if (!error) {
      await load();
      setSelected(null);
    }
    setUpdating(false);
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Orders</h1>
        <p className="mt-1 text-sm text-ink/60">
          {filtered.length} order{filtered.length === 1 ? '' : 's'}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.value ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-ink/60 hover:border-accent/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
          {loading ? (
            <p className="p-6 text-sm text-ink/50">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-ink/50">No orders here yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-xs uppercase tracking-wide text-ink/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Placed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelected(order)}
                    className={`cursor-pointer border-b border-line last:border-0 hover:bg-canvas/50 ${
                      selected?.id === order.id ? 'bg-canvas' : ''
                    }`}
                    style={{ borderLeft: `4px solid ${STATUS_META[order.status].color}` }}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-ink/70">#{order.id.slice(-6)}</td>
                    <td className="px-4 py-3">{order.customer_name}</td>
                    <td className="px-4 py-3 capitalize text-ink/70">{order.delivery_type}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">€{Number(order.total).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-ink/50">{new Date(order.created_at).toLocaleString()}</td>
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
            <h2 className="font-display text-lg font-semibold text-ink">Order #{selected.id.slice(-6)}</h2>
            <button onClick={() => setSelected(null)} className="text-ink/40 hover:text-ink">
              ✕
            </button>
          </div>
          <StatusBadge status={selected.status} className="mt-2" />

          <div className="mt-5 space-y-1 text-sm">
            <p className="font-medium text-ink">{selected.customer_name}</p>
            <p className="text-ink/60">{selected.customer_phone}</p>
            <p className="text-ink/60">
              {selected.delivery_type === 'delivery' ? selected.delivery_address : `Pickup at ${selected.pickup_branch}`}
            </p>
            <p className="text-ink/60 capitalize">Paying with {selected.payment_method}</p>
          </div>

          <div className="mt-5 border-t border-line pt-4">
            {selected.order_items.map((item) => (
              <div key={item.id} className="mb-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-ink">
                    {item.product_name} × {item.quantity}
                    {item.variant_label ? ` (${item.variant_label})` : ''}
                  </span>
                  <span className="font-mono tabular-nums text-ink/70">€{Number(item.line_total).toFixed(2)}</span>
                </div>
                {item.order_item_modifiers.map((m, i) => (
                  <p key={i} className="text-xs text-ink/50">
                    + {m.modifier_name}
                  </p>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-ink/60">
              <span>Subtotal</span>
              <span className="font-mono">€{Number(selected.subtotal).toFixed(2)}</span>
            </div>
            {Number(selected.discount_amount) > 0 && (
              <div className="flex justify-between text-status-ready">
                <span>Discount</span>
                <span className="font-mono">-€{Number(selected.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink/60">
              <span>Tax</span>
              <span className="font-mono">€{Number(selected.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-ink">
              <span>Total</span>
              <span className="font-mono">€{Number(selected.total).toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            {NEXT_STATUS[selected.status] && (
              <button
                onClick={() => advanceStatus(selected)}
                disabled={updating}
                className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-60"
              >
                Mark {STATUS_META[NEXT_STATUS[selected.status]!].label}
              </button>
            )}
            {selected.status !== 'delivered' && selected.status !== 'cancelled' && selected.status !== 'rejected' && (
              <button
                onClick={() => rejectOrder(selected)}
                disabled={updating}
                className="rounded-lg border border-danger/30 px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/5 disabled:opacity-60"
              >
                Reject
              </button>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
