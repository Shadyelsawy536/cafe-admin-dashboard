export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'rejected';

export const STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string; text: string }> = {
  pending: { label: 'Pending', color: '#B7791F', bg: 'bg-amber-50', text: 'text-amber-700' },
  confirmed: { label: 'Confirmed', color: '#2B6CB0', bg: 'bg-blue-50', text: 'text-blue-700' },
  preparing: { label: 'Preparing', color: '#2B6CB0', bg: 'bg-blue-50', text: 'text-blue-700' },
  ready: { label: 'Ready', color: '#2F855A', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  out_for_delivery: { label: 'Out for Delivery', color: '#2F855A', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  delivered: { label: 'Delivered', color: '#4A5568', bg: 'bg-slate-100', text: 'text-slate-600' },
  cancelled: { label: 'Cancelled', color: '#C53030', bg: 'bg-red-50', text: 'text-red-700' },
  rejected: { label: 'Rejected', color: '#C53030', bg: 'bg-red-50', text: 'text-red-700' },
};

export function StatusBadge({ status, className = '' }: { status: OrderStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.bg} ${meta.text} ${className}`}>
      {meta.label}
    </span>
  );
}
