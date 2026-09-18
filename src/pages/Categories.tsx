import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
}

export function Categories() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CategoryRow | 'new' | null>(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('categories')
      .select('id, name, sort_order')
      .eq('restaurant_id', RESTAURANT_ID)
      .is('deleted_at', null)
      .order('sort_order');
    setCategories(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setName('');
    setSortOrder(categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 1);
    setEditing('new');
  }

  function openEdit(cat: CategoryRow) {
    setName(cat.name);
    setSortOrder(cat.sort_order);
    setEditing(cat);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    if (editing === 'new') {
      await supabase.from('categories').insert({ restaurant_id: RESTAURANT_ID, name: name.trim(), sort_order: sortOrder });
    } else if (editing) {
      await supabase.from('categories').update({ name: name.trim(), sort_order: sortOrder }).eq('id', editing.id);
    }
    setSaving(false);
    setEditing(null);
    load();
  }

  async function remove(cat: CategoryRow) {
    if (!confirm(`Delete "${cat.name}"? Products in this category will keep their name but lose their category link.`)) return;
    await supabase.from('categories').update({ deleted_at: new Date().toISOString() }).eq('id', cat.id);
    load();
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Categories</h1>
            <p className="mt-1 text-sm text-ink/60">{categories.length} categories</p>
          </div>
          <button onClick={openNew} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark">
            + Add Category
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
          {loading ? (
            <p className="p-6 text-sm text-ink/50">Loading…</p>
          ) : categories.length === 0 ? (
            <p className="p-6 text-sm text-ink/50">No categories yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-xs uppercase tracking-wide text-ink/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Sort Order</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-line last:border-0 hover:bg-canvas/50">
                    <td className="px-4 py-3 font-medium text-ink">{cat.name}</td>
                    <td className="px-4 py-3 font-mono text-ink/60">{cat.sort_order}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(cat)} className="mr-3 text-xs font-medium text-accent hover:underline">
                        Edit
                      </button>
                      <button onClick={() => remove(cat)} className="text-xs font-medium text-danger hover:underline">
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

      {editing && (
        <aside className="w-96 shrink-0 overflow-y-auto border-l border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">{editing === 'new' ? 'Add Category' : 'Edit Category'}</h2>
            <button onClick={() => setEditing(null)} className="text-ink/40 hover:text-ink">
              ✕
            </button>
          </div>

          <label className="mt-6 block text-xs font-medium uppercase tracking-wide text-ink/50">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink/50">Sort Order</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />

          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="mt-6 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </aside>
      )}
    </div>
  );
}
