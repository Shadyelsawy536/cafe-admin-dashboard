import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';
import { ImageUpload } from '../components/ImageUpload';

interface ModifierRow {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}
interface GroupRow {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  modifiers: ModifierRow[];
}

export function ModifierGroups() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GroupRow | null>(null);
  const [isNewGroup, setIsNewGroup] = useState(false);

  const [gName, setGName] = useState('');
  const [gMin, setGMin] = useState(0);
  const [gMax, setGMax] = useState(1);
  const [gRequired, setGRequired] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);

  const [mName, setMName] = useState('');
  const [mPrice, setMPrice] = useState(0);
  const [mImage, setMImage] = useState('');
  const [savingModifier, setSavingModifier] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('modifier_groups')
      .select('id, name, min_select, max_select, required, modifiers(id, name, price, image_url)')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('name');
    const rows = (data as unknown as GroupRow[]) ?? [];
    setGroups(rows);
    setSelected((prev) => (prev ? rows.find((g) => g.id === prev.id) ?? null : null));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNewGroup() {
    setGName('');
    setGMin(0);
    setGMax(1);
    setGRequired(false);
    setIsNewGroup(true);
    setSelected(null);
  }

  function openGroup(group: GroupRow) {
    setGName(group.name);
    setGMin(group.min_select);
    setGMax(group.max_select);
    setGRequired(group.required);
    setIsNewGroup(false);
    setSelected(group);
    setMName('');
    setMPrice(0);
    setMImage('');
  }

  async function saveGroup() {
    if (!gName.trim()) return;
    setSavingGroup(true);
    if (isNewGroup) {
      const { data } = await supabase
        .from('modifier_groups')
        .insert({ restaurant_id: RESTAURANT_ID, name: gName.trim(), min_select: gMin, max_select: gMax, required: gRequired })
        .select()
        .single();
      await load();
      if (data) openGroup({ ...data, modifiers: [] } as GroupRow);
    } else if (selected) {
      await supabase
        .from('modifier_groups')
        .update({ name: gName.trim(), min_select: gMin, max_select: gMax, required: gRequired })
        .eq('id', selected.id);
      await load();
    }
    setSavingGroup(false);
  }

  async function deleteGroup(group: GroupRow) {
    if (!confirm(`Delete "${group.name}" and all its modifiers? Products using it will lose this option.`)) return;
    await supabase.from('modifier_groups').delete().eq('id', group.id);
    setSelected(null);
    load();
  }

  async function addModifier() {
    if (!selected || !mName.trim()) return;
    setSavingModifier(true);
    await supabase.from('modifiers').insert({
      modifier_group_id: selected.id,
      name: mName.trim(),
      price: mPrice,
      image_url: mImage || null,
      sort_order: selected.modifiers.length,
    });
    setMName('');
    setMPrice(0);
    setMImage('');
    setSavingModifier(false);
    load();
  }

  async function deleteModifier(modifierId: string) {
    await supabase.from('modifiers').delete().eq('id', modifierId);
    load();
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Modifier Groups</h1>
            <p className="mt-1 text-sm text-ink/60">{groups.length} groups</p>
          </div>
          <button onClick={openNewGroup} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark">
            + Add Group
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p className="text-sm text-ink/50">Loading…</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-ink/50">No modifier groups yet.</p>
          ) : (
            groups.map((group) => (
              <button
                key={group.id}
                onClick={() => openGroup(group)}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  selected?.id === group.id ? 'border-accent bg-accent/5' : 'border-line bg-surface hover:border-accent/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-ink">{group.name}</p>
                  {group.required && (
                    <span className="rounded-full bg-status-pending/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-status-pending">
                      Required
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink/50">
                  {group.modifiers.length} option{group.modifiers.length === 1 ? '' : 's'} · pick {group.min_select}–{group.max_select}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {(selected || isNewGroup) && (
        <aside className="w-96 shrink-0 overflow-y-auto border-l border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">{isNewGroup ? 'Add Group' : 'Edit Group'}</h2>
            <button
              onClick={() => {
                setSelected(null);
                setIsNewGroup(false);
              }}
              className="text-ink/40 hover:text-ink"
            >
              ✕
            </button>
          </div>

          <label className="mt-6 block text-xs font-medium uppercase tracking-wide text-ink/50">Name</label>
          <input
            type="text"
            value={gName}
            onChange={(e) => setGName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-ink/50">Min Select</label>
              <input
                type="number"
                min={0}
                value={gMin}
                onChange={(e) => setGMin(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-ink/50">Max Select</label>
              <input
                type="number"
                min={1}
                value={gMax}
                onChange={(e) => setGMax(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={gRequired} onChange={(e) => setGRequired(e.target.checked)} className="rounded border-line" />
            Required (customer must choose before adding to cart)
          </label>

          <button
            onClick={saveGroup}
            disabled={savingGroup || !gName.trim()}
            className="mt-6 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-60"
          >
            {savingGroup ? 'Saving…' : isNewGroup ? 'Create Group' : 'Save Changes'}
          </button>

          {!isNewGroup && selected && (
            <>
              <button
                onClick={() => deleteGroup(selected)}
                className="mt-2 w-full rounded-lg border border-danger/30 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/5"
              >
                Delete Group
              </button>

              <div className="mt-8 border-t border-line pt-6">
                <h3 className="text-sm font-semibold text-ink">Modifiers</h3>
                <div className="mt-3 space-y-2">
                  {selected.modifiers.map((mod) => (
                    <div key={mod.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
                      <div className="flex items-center gap-2">
                        {mod.image_url && <img src={mod.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                        <div>
                          <p className="text-sm font-medium text-ink">{mod.name}</p>
                          <p className="font-mono text-xs text-ink/50">
                            {Number(mod.price) === 0 ? 'Free' : `+€${Number(mod.price).toFixed(2)}`}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => deleteModifier(mod.id)} className="text-xs text-danger hover:underline">
                        Remove
                      </button>
                    </div>
                  ))}
                  {selected.modifiers.length === 0 && <p className="text-xs text-ink/40">No modifiers yet.</p>}
                </div>

                <div className="mt-4 rounded-lg border border-dashed border-line p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink/50">Add Modifier</p>
                  <input
                    type="text"
                    placeholder="Name"
                    value={mName}
                    onChange={(e) => setMName(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={mPrice}
                    onChange={(e) => setMPrice(Number(e.target.value))}
                    className="mt-2 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <div className="mt-2">
                    <ImageUpload value={mImage} onChange={setMImage} />
                  </div>
                  <button
                    onClick={addModifier}
                    disabled={savingModifier || !mName.trim()}
                    className="mt-2 w-full rounded-lg bg-ink py-2 text-xs font-semibold text-white transition hover:bg-ink/80 disabled:opacity-60"
                  >
                    {savingModifier ? 'Adding…' : 'Add Modifier'}
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      )}
    </div>
  );
}
