import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';
import { ImageUpload } from '../components/ImageUpload';

interface CategoryOption {
  id: string;
  name: string;
}
interface VariantRow {
  id?: string;
  label: string;
  price_delta: number;
}
interface ModifierGroupOption {
  id: string;
  name: string;
}
type ProductStatus = 'available' | 'out_of_stock' | 'hidden';
interface ProductRow {
  id: string;
  name: string;
  description: string;
  base_price: number;
  image_url: string | null;
  status: ProductStatus;
  category_id: string | null;
  categories: { name: string } | null;
  product_variants: VariantRow[];
  product_modifier_groups: { modifier_group_id: string }[];
}

const STATUS_OPTIONS: ProductStatus[] = ['available', 'out_of_stock', 'hidden'];

export function Products() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [allGroups, setAllGroups] = useState<ModifierGroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProductRow | 'new' | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<ProductStatus>('available');
  const [categoryId, setCategoryId] = useState('');
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [productsRes, categoriesRes, groupsRes] = await Promise.all([
      supabase
        .from('products')
        .select(
          `id, name, description, base_price, image_url, status, category_id,
           categories(name),
           product_variants(id, label, price_delta),
           product_modifier_groups(modifier_group_id)`
        )
        .eq('restaurant_id', RESTAURANT_ID)
        .is('deleted_at', null)
        .order('sort_order'),
      supabase.from('categories').select('id, name').eq('restaurant_id', RESTAURANT_ID).is('deleted_at', null).order('sort_order'),
      supabase.from('modifier_groups').select('id, name').eq('restaurant_id', RESTAURANT_ID).order('name'),
    ]);
    setProducts((productsRes.data as unknown as ProductRow[]) ?? []);
    setCategories(categoriesRes.data ?? []);
    setAllGroups(groupsRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
  load();

  const channel = supabase
    .channel(`products-realtime-${RESTAURANT_ID}`)

    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'products',
        filter: `restaurant_id=eq.${RESTAURANT_ID}`,
      },
      () => {
        load();
      }
    )

    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'categories',
        filter: `restaurant_id=eq.${RESTAURANT_ID}`,
      },
      () => {
        load();
      }
    )

    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'modifier_groups',
        filter: `restaurant_id=eq.${RESTAURANT_ID}`,
      },
      () => {
        load();
      }
    )

    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'product_variants',
      },
      () => {
        load();
      }
    )

    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'product_modifier_groups',
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

  function openNew() {
    setName('');
    setDescription('');
    setBasePrice(0);
    setImageUrl('');
    setStatus('available');
    setCategoryId(categories[0]?.id ?? '');
    setVariants([]);
    setSelectedGroupIds(new Set());
    setSelected('new');
  }

  function openEdit(product: ProductRow) {
    setName(product.name);
    setDescription(product.description);
    setBasePrice(product.base_price);
    setImageUrl(product.image_url ?? '');
    setStatus(product.status);
    setCategoryId(product.category_id ?? '');
    setVariants(product.product_variants.map((v) => ({ id: v.id, label: v.label, price_delta: v.price_delta })));
    setSelectedGroupIds(new Set(product.product_modifier_groups.map((g) => g.modifier_group_id)));
    setSelected(product);
  }

  function addVariantRow() {
    setVariants((prev) => [...prev, { label: '', price_delta: 0 }]);
  }
  function updateVariantRow(index: number, patch: Partial<VariantRow>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }
  function removeVariantRow(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  async function save() {
    if (!name.trim() || basePrice < 0) return;
    setSaving(true);

    const payload = {
      restaurant_id: RESTAURANT_ID,
      name: name.trim(),
      description: description.trim(),
      base_price: basePrice,
      image_url: imageUrl || null,
      status,
      category_id: categoryId || null,
    };

    let productId: string;

    if (selected === 'new') {
      const { data, error } = await supabase.from('products').insert(payload).select('id').single();
      if (error || !data) {
        setSaving(false);
        return;
      }
      productId = data.id;
    } else if (selected) {
      productId = selected.id;
      await supabase.from('products').update(payload).eq('id', productId);
      // Replace variants/modifier-group attachments wholesale rather than
      // diffing — the catalog is edited rarely enough that this is
      // simpler and avoids a class of stale-row bugs from partial updates.
      await supabase.from('product_variants').delete().eq('product_id', productId);
      await supabase.from('product_modifier_groups').delete().eq('product_id', productId);
    } else {
      setSaving(false);
      return;
    }

    if (variants.length > 0) {
      await supabase.from('product_variants').insert(
        variants
          .filter((v) => v.label.trim())
          .map((v, i) => ({ product_id: productId, label: v.label.trim(), price_delta: v.price_delta, sort_order: i }))
      );
    }

    if (selectedGroupIds.size > 0) {
      await supabase
        .from('product_modifier_groups')
        .insert(Array.from(selectedGroupIds).map((groupId, i) => ({ product_id: productId, modifier_group_id: groupId, sort_order: i })));
    }

    setSaving(false);
    setSelected(null);
    load();
  }

  async function remove(product: ProductRow) {
    if (!confirm(`Delete "${product.name}"? It will no longer appear in the app, but past orders keep their record of it.`)) return;
    await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', product.id);
    load();
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Products</h1>
            <p className="mt-1 text-sm text-ink/60">{products.length} products</p>
          </div>
          <button onClick={openNew} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark">
            + Add Product
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
          {loading ? (
            <p className="p-6 text-sm text-ink/50">Loading…</p>
          ) : products.length === 0 ? (
            <p className="p-6 text-sm text-ink/50">No products yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-xs uppercase tracking-wide text-ink/50">
                <tr>
                  <th className="px-4 py-3 font-medium"></th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => openEdit(product)}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-canvas/50"
                  >
                    <td className="px-4 py-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-canvas" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{product.name}</td>
                    <td className="px-4 py-3 text-ink/70">{product.categories?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">€{Number(product.base_price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          product.status === 'available'
                            ? 'bg-emerald-50 text-emerald-700'
                            : product.status === 'out_of_stock'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {product.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(product);
                        }}
                        className="text-xs font-medium text-danger hover:underline"
                      >
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

      {selected && (
        <aside className="w-[26rem] shrink-0 overflow-y-auto border-l border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">{selected === 'new' ? 'Add Product' : 'Edit Product'}</h2>
            <button onClick={() => setSelected(null)} className="text-ink/40 hover:text-ink">
              ✕
            </button>
          </div>

          <label className="mt-6 block text-xs font-medium uppercase tracking-wide text-ink/50">Image</label>
          <div className="mt-1">
            <ImageUpload value={imageUrl} onChange={setImageUrl} />
          </div>

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink/50">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink/50">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-ink/50">Base Price</label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-ink/50">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink/50">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="mt-6 border-t border-line pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Sizes / Variants</p>
              <button onClick={addVariantRow} className="text-xs font-medium text-accent hover:underline">
                + Add
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Label (e.g. Large)"
                    value={v.label}
                    onChange={(e) => updateVariantRow(i, { label: e.target.value })}
                    className="flex-1 rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="+€"
                    value={v.price_delta}
                    onChange={(e) => updateVariantRow(i, { price_delta: Number(e.target.value) })}
                    className="w-20 rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <button onClick={() => removeVariantRow(i)} className="text-xs text-danger hover:underline">
                    ✕
                  </button>
                </div>
              ))}
              {variants.length === 0 && <p className="text-xs text-ink/40">No variants — product sells at one fixed price.</p>}
            </div>
          </div>

          <div className="mt-6 border-t border-line pt-4">
            <p className="text-sm font-semibold text-ink">Modifier Groups</p>
            <p className="mt-1 text-xs text-ink/50">
              Which option groups apply to this product (manage the groups themselves on the Modifier Groups page).
            </p>
            <div className="mt-2 space-y-1">
              {allGroups.length === 0 && <p className="text-xs text-ink/40">No modifier groups created yet.</p>}
              {allGroups.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={selectedGroupIds.has(g.id)} onChange={() => toggleGroup(g.id)} className="rounded border-line" />
                  {g.name}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="mt-6 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-60"
          >
            {saving ? 'Saving…' : selected === 'new' ? 'Create Product' : 'Save Changes'}
          </button>
        </aside>
      )}
    </div>
  );
}
