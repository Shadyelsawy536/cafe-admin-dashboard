import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';

type DiscountType = 'percentage' | 'fixed';

interface CouponRow {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  max_uses_per_customer: number;
  is_active: boolean;
}
interface OfferRow {
  id: string;
  name: string;
  discount_type: DiscountType;
  discount_value: number;
  applies_to: 'all' | 'category' | 'product';
  category_id: string | null;
  product_id: string | null;
  is_active: boolean;
}
interface Option {
  id: string;
  name: string;
}

function discountLabel(type: DiscountType, value: number) {
  return type === 'percentage' ? `${value}%` : `€${Number(value).toFixed(2)}`;
}

export function OffersCoupons() {
  const [tab, setTab] = useState<'coupons' | 'offers'>('coupons');

  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingCoupon, setEditingCoupon] = useState<CouponRow | 'new' | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'percentage' as DiscountType,
    discount_value: 10,
    min_order_amount: 0,
    max_uses: '' as string | number,
    max_uses_per_customer: 1,
    is_active: true,
  });

  const [editingOffer, setEditingOffer] = useState<OfferRow | 'new' | null>(null);
  const [offerForm, setOfferForm] = useState({
    name: '',
    discount_type: 'percentage' as DiscountType,
    discount_value: 10,
    applies_to: 'all' as 'all' | 'category' | 'product',
    category_id: '',
    product_id: '',
    is_active: true,
  });

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [couponsRes, offersRes, categoriesRes, productsRes] = await Promise.all([
      supabase.from('coupons').select('*').eq('restaurant_id', RESTAURANT_ID).order('created_at', { ascending: false }),
      supabase.from('offers').select('*').eq('restaurant_id', RESTAURANT_ID).order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name').eq('restaurant_id', RESTAURANT_ID).is('deleted_at', null),
      supabase.from('products').select('id, name').eq('restaurant_id', RESTAURANT_ID).is('deleted_at', null),
    ]);
    setCoupons(couponsRes.data ?? []);
    setOffers(offersRes.data ?? []);
    setCategories(categoriesRes.data ?? []);
    setProducts(productsRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNewCoupon() {
    setCouponForm({ code: '', discount_type: 'percentage', discount_value: 10, min_order_amount: 0, max_uses: '', max_uses_per_customer: 1, is_active: true });
    setEditingCoupon('new');
  }
  function openEditCoupon(c: CouponRow) {
    setCouponForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: Number(c.discount_value),
      min_order_amount: Number(c.min_order_amount),
      max_uses: c.max_uses ?? '',
      max_uses_per_customer: c.max_uses_per_customer,
      is_active: c.is_active,
    });
    setEditingCoupon(c);
  }
  async function saveCoupon() {
    if (!couponForm.code.trim()) return;
    setSaving(true);
    const payload = {
      restaurant_id: RESTAURANT_ID,
      code: couponForm.code.trim().toUpperCase(),
      discount_type: couponForm.discount_type,
      discount_value: couponForm.discount_value,
      min_order_amount: couponForm.min_order_amount,
      max_uses: couponForm.max_uses === '' ? null : Number(couponForm.max_uses),
      max_uses_per_customer: couponForm.max_uses_per_customer,
      is_active: couponForm.is_active,
    };
    if (editingCoupon === 'new') {
      await supabase.from('coupons').insert(payload);
    } else if (editingCoupon) {
      await supabase.from('coupons').update(payload).eq('id', editingCoupon.id);
    }
    setSaving(false);
    setEditingCoupon(null);
    load();
  }
  async function deleteCoupon(c: CouponRow) {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    await supabase.from('coupons').delete().eq('id', c.id);
    load();
  }
  async function toggleCouponActive(c: CouponRow) {
    await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id);
    load();
  }

  function openNewOffer() {
    setOfferForm({ name: '', discount_type: 'percentage', discount_value: 10, applies_to: 'all', category_id: '', product_id: '', is_active: true });
    setEditingOffer('new');
  }
  function openEditOffer(o: OfferRow) {
    setOfferForm({
      name: o.name,
      discount_type: o.discount_type,
      discount_value: Number(o.discount_value),
      applies_to: o.applies_to,
      category_id: o.category_id ?? '',
      product_id: o.product_id ?? '',
      is_active: o.is_active,
    });
    setEditingOffer(o);
  }
  async function saveOffer() {
    if (!offerForm.name.trim()) return;
    if (offerForm.applies_to === 'category' && !offerForm.category_id) return;
    if (offerForm.applies_to === 'product' && !offerForm.product_id) return;
    setSaving(true);
    const payload = {
      restaurant_id: RESTAURANT_ID,
      name: offerForm.name.trim(),
      discount_type: offerForm.discount_type,
      discount_value: offerForm.discount_value,
      applies_to: offerForm.applies_to,
      category_id: offerForm.applies_to === 'category' ? offerForm.category_id : null,
      product_id: offerForm.applies_to === 'product' ? offerForm.product_id : null,
      is_active: offerForm.is_active,
    };
    if (editingOffer === 'new') {
      await supabase.from('offers').insert(payload);
    } else if (editingOffer) {
      await supabase.from('offers').update(payload).eq('id', editingOffer.id);
    }
    setSaving(false);
    setEditingOffer(null);
    load();
  }
  async function deleteOffer(o: OfferRow) {
    if (!confirm(`Delete offer "${o.name}"?`)) return;
    await supabase.from('offers').delete().eq('id', o.id);
    load();
  }
  async function toggleOfferActive(o: OfferRow) {
    await supabase.from('offers').update({ is_active: !o.is_active }).eq('id', o.id);
    load();
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Offers & Coupons</h1>
        <p className="mt-1 text-sm text-ink/60">
          Coupons are code-based and applied at checkout in the app. Offers are auto-applied promotions —{' '}
          <strong>note: management here is live, but automatic offer application at checkout isn't wired into the order flow yet</strong> — only coupon codes are currently honored by place_order.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setTab('coupons')}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${tab === 'coupons' ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-ink/60'}`}
          >
            Coupons
          </button>
          <button
            onClick={() => setTab('offers')}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${tab === 'offers' ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-ink/60'}`}
          >
            Offers
          </button>
        </div>

        {tab === 'coupons' && (
          <div className="mt-6">
            <div className="flex justify-end">
              <button onClick={openNewCoupon} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark">
                + Add Coupon
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
              {loading ? (
                <p className="p-6 text-sm text-ink/50">Loading…</p>
              ) : coupons.length === 0 ? (
                <p className="p-6 text-sm text-ink/50">No coupons yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-canvas/60 text-xs uppercase tracking-wide text-ink/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Discount</th>
                      <th className="px-4 py-3 font-medium">Min Order</th>
                      <th className="px-4 py-3 font-medium">Uses</th>
                      <th className="px-4 py-3 font-medium">Active</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => (
                      <tr key={c.id} className="border-b border-line last:border-0 hover:bg-canvas/50">
                        <td className="px-4 py-3 font-mono font-medium text-ink">{c.code}</td>
                        <td className="px-4 py-3">{discountLabel(c.discount_type, c.discount_value)}</td>
                        <td className="px-4 py-3">€{Number(c.min_order_amount).toFixed(2)}</td>
                        <td className="px-4 py-3">{c.max_uses ? `≤${c.max_uses}` : 'Unlimited'} · {c.max_uses_per_customer}/customer</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleCouponActive(c)}
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                          >
                            {c.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openEditCoupon(c)} className="mr-3 text-xs font-medium text-accent hover:underline">
                            Edit
                          </button>
                          <button onClick={() => deleteCoupon(c)} className="text-xs font-medium text-danger hover:underline">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab === 'offers' && (
          <div className="mt-6">
            <div className="flex justify-end">
              <button onClick={openNewOffer} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark">
                + Add Offer
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
              {loading ? (
                <p className="p-6 text-sm text-ink/50">Loading…</p>
              ) : offers.length === 0 ? (
                <p className="p-6 text-sm text-ink/50">No offers yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-canvas/60 text-xs uppercase tracking-wide text-ink/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Discount</th>
                      <th className="px-4 py-3 font-medium">Applies To</th>
                      <th className="px-4 py-3 font-medium">Active</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((o) => (
                      <tr key={o.id} className="border-b border-line last:border-0 hover:bg-canvas/50">
                        <td className="px-4 py-3 font-medium text-ink">{o.name}</td>
                        <td className="px-4 py-3">{discountLabel(o.discount_type, o.discount_value)}</td>
                        <td className="px-4 py-3 capitalize text-ink/70">{o.applies_to}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleOfferActive(o)}
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${o.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                          >
                            {o.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openEditOffer(o)} className="mr-3 text-xs font-medium text-accent hover:underline">
                            Edit
                          </button>
                          <button onClick={() => deleteOffer(o)} className="text-xs font-medium text-danger hover:underline">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {editingCoupon && (
        <aside className="w-96 shrink-0 overflow-y-auto border-l border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">{editingCoupon === 'new' ? 'Add Coupon' : 'Edit Coupon'}</h2>
            <button onClick={() => setEditingCoupon(null)} className="text-ink/40 hover:text-ink">✕</button>
          </div>

          <label className="mt-6 block text-xs font-medium uppercase tracking-wide text-ink/50">Code</label>
          <input
            type="text"
            value={couponForm.code}
            onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-ink/50">Type</label>
              <select
                value={couponForm.discount_type}
                onChange={(e) => setCouponForm((f) => ({ ...f, discount_type: e.target.value as DiscountType }))}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-ink/50">Value</label>
              <input
                type="number"
                step="0.01"
                value={couponForm.discount_value}
                onChange={(e) => setCouponForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink/50">Minimum Order Amount</label>
          <input
            type="number"
            step="0.01"
            value={couponForm.min_order_amount}
            onChange={(e) => setCouponForm((f) => ({ ...f, min_order_amount: Number(e.target.value) }))}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-ink/50">Max Total Uses</label>
              <input
                type="number"
                placeholder="Unlimited"
                value={couponForm.max_uses}
                onChange={(e) => setCouponForm((f) => ({ ...f, max_uses: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-ink/50">Max Per Customer</label>
              <input
                type="number"
                min={1}
                value={couponForm.max_uses_per_customer}
                onChange={(e) => setCouponForm((f) => ({ ...f, max_uses_per_customer: Number(e.target.value) }))}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={couponForm.is_active} onChange={(e) => setCouponForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded border-line" />
            Active
          </label>

          <button
            onClick={saveCoupon}
            disabled={saving || !couponForm.code.trim()}
            className="mt-6 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </aside>
      )}

      {editingOffer && (
        <aside className="w-96 shrink-0 overflow-y-auto border-l border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">{editingOffer === 'new' ? 'Add Offer' : 'Edit Offer'}</h2>
            <button onClick={() => setEditingOffer(null)} className="text-ink/40 hover:text-ink">✕</button>
          </div>

          <label className="mt-6 block text-xs font-medium uppercase tracking-wide text-ink/50">Name</label>
          <input
            type="text"
            value={offerForm.name}
            onChange={(e) => setOfferForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-ink/50">Type</label>
              <select
                value={offerForm.discount_type}
                onChange={(e) => setOfferForm((f) => ({ ...f, discount_type: e.target.value as DiscountType }))}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-ink/50">Value</label>
              <input
                type="number"
                step="0.01"
                value={offerForm.discount_value}
                onChange={(e) => setOfferForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink/50">Applies To</label>
          <select
            value={offerForm.applies_to}
            onChange={(e) => setOfferForm((f) => ({ ...f, applies_to: e.target.value as 'all' | 'category' | 'product' }))}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            <option value="all">Whole Menu</option>
            <option value="category">Specific Category</option>
            <option value="product">Specific Product</option>
          </select>

          {offerForm.applies_to === 'category' && (
            <select
              value={offerForm.category_id}
              onChange={(e) => setOfferForm((f) => ({ ...f, category_id: e.target.value }))}
              className="mt-2 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {offerForm.applies_to === 'product' && (
            <select
              value={offerForm.product_id}
              onChange={(e) => setOfferForm((f) => ({ ...f, product_id: e.target.value }))}
              className="mt-2 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <label className="mt-4 flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={offerForm.is_active} onChange={(e) => setOfferForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded border-line" />
            Active
          </label>

          <button
            onClick={saveOffer}
            disabled={saving || !offerForm.name.trim()}
            className="mt-6 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </aside>
      )}
    </div>
  );
}
