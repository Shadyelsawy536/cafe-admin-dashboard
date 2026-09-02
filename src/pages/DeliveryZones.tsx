import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';

interface Zone { id: string; name: string; delivery_fee: number; min_order_amount: number; is_active: boolean; boundary_geojson: Record<string, unknown> | null; }
const input = 'mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent';
const label = 'block text-xs font-medium uppercase tracking-wide text-ink/50';
const emptyPolygon = JSON.stringify({ type: 'Polygon', coordinates: [[]] }, null, 2);

export function DeliveryZones() {
  const [zones, setZones] = useState<Zone[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Zone | null>(null); const [name, setName] = useState(''); const [fee, setFee] = useState(0); const [minOrder, setMinOrder] = useState(0); const [active, setActive] = useState(true); const [geojson, setGeojson] = useState(emptyPolygon); const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => { setLoading(true); const { data, error } = await supabase.from('delivery_zones').select('id,name,delivery_fee,min_order_amount,is_active,boundary_geojson').eq('restaurant_id', RESTAURANT_ID).order('name'); if (error) setMessage(error.message); setZones((data as Zone[]) ?? []); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);
  function newZone() { setDraft(null); setName(''); setFee(0); setMinOrder(0); setActive(true); setGeojson(emptyPolygon); setMessage(null); }
  function edit(z: Zone) { setDraft(z); setName(z.name); setFee(Number(z.delivery_fee)); setMinOrder(Number(z.min_order_amount)); setActive(z.is_active); setGeojson(JSON.stringify(z.boundary_geojson ?? { type: 'Polygon', coordinates: [[]] }, null, 2)); setMessage(null); }
  async function save() {
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(geojson); } catch { setMessage('Boundary must be valid JSON.'); return; }
    if (parsed.type !== 'Polygon') { setMessage('Boundary GeoJSON must be a Polygon.'); return; }
    setSaving(true); setMessage(null);
    const payload = { restaurant_id: RESTAURANT_ID, name: name.trim(), delivery_fee: Math.max(0, Number(fee) || 0), min_order_amount: Math.max(0, Number(minOrder) || 0), is_active: active, boundary_geojson: parsed };
    const result = draft ? await supabase.from('delivery_zones').update(payload).eq('id', draft.id) : await supabase.from('delivery_zones').insert(payload);
    setSaving(false); if (result.error) { setMessage(result.error.message); return; } setMessage('Zone saved successfully.'); await load();
  }
  async function remove(z: Zone) { if (!confirm(`Delete delivery zone "${z.name}"?`)) return; const { error } = await supabase.from('delivery_zones').delete().eq('id', z.id); if (error) setMessage(error.message); else load(); }
  return <div className="max-w-6xl p-8"><div className="flex items-center justify-between gap-4"><div><h1 className="font-display text-2xl font-semibold">Delivery Zones</h1><p className="mt-1 text-sm text-ink/60">Draw or paste each delivery boundary as GeoJSON. The app and website can resolve a customer's coordinates to the matching zone.</p></div><button onClick={newZone} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">New Zone</button></div>
    {message && <div className="mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink/70">{message}</div>}
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <section className="rounded-2xl border border-line bg-surface p-6"><h2 className="font-display text-lg font-semibold">Zones</h2>{loading ? <p className="mt-4 text-sm text-ink/50">Loading…</p> : zones.length === 0 ? <p className="mt-4 text-sm text-ink/50">No zones yet.</p> : <div className="mt-4 space-y-3">{zones.map(z => <div key={z.id} className="rounded-xl border border-line bg-canvas p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{z.name}</p><p className="mt-1 text-xs text-ink/50">Delivery {z.delivery_fee} · Minimum {z.min_order_amount} · {z.boundary_geojson ? 'Polygon set' : 'No boundary'}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${z.is_active ? 'bg-accent/10 text-accent' : 'bg-ink/10 text-ink/50'}`}>{z.is_active ? 'Active' : 'Inactive'}</span></div><div className="mt-3 flex gap-2"><button onClick={() => edit(z)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium">Edit</button><button onClick={() => remove(z)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-danger">Delete</button></div></div>)}</div>}</section>
      <section className="rounded-2xl border border-line bg-surface p-6"><h2 className="font-display text-lg font-semibold">{draft ? 'Edit Zone' : 'Create Zone'}</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><div><label className={label}>Zone Name</label><input className={input} value={name} onChange={e => setName(e.target.value)} placeholder="Downtown" /></div><div><label className={label}>Delivery Fee</label><input type="number" min="0" step="0.01" className={input} value={fee} onChange={e => setFee(Number(e.target.value))} /></div><div><label className={label}>Minimum Order</label><input type="number" min="0" step="0.01" className={input} value={minOrder} onChange={e => setMinOrder(Number(e.target.value))} /></div><label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Active</label><div className="md:col-span-2"><label className={label}>Polygon GeoJSON</label><textarea rows={14} className={`${input} font-mono text-xs`} value={geojson} onChange={e => setGeojson(e.target.value)} /><p className="mt-2 text-xs text-ink/50">Use a GeoJSON Polygon with coordinates in [longitude, latitude] order. The first and last coordinate of the ring must match.</p></div></div><button disabled={saving || !name.trim()} onClick={save} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Zone'}</button></section>
    </div></div>;
}
