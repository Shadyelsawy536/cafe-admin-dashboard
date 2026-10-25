import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';

type Branch = { id: string; name: string; is_active: boolean };
type RestaurantTable = { id: string; branch_id: string; table_number: string; display_name: string | null; qr_token: string; is_active: boolean };
type QRSettings = { accepts_dine_in: boolean; qr_primary_color: string; qr_background_color: string; qr_accent_color: string; qr_title: string; qr_design: string };
const DEFAULTS: QRSettings = { accepts_dine_in: false, qr_primary_color: '#111827', qr_background_color: '#FFFFFF', qr_accent_color: '#D4AF37', qr_title: 'Scan to order', qr_design: 'classic' };
const input = 'mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent';

export function Tables() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [restaurantSlug, setRestaurantSlug] = useState('');
  const [settings, setSettings] = useState<QRSettings>(DEFAULTS);
  const [branchId, setBranchId] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<RestaurantTable | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [branchResult, tableResult, restaurantResult, settingsResult] = await Promise.all([
      supabase.from('restaurant_locations').select('id,name,is_active').eq('restaurant_id', RESTAURANT_ID).order('sort_order'),
      supabase.from('restaurant_tables').select('id,branch_id,table_number,display_name,qr_token,is_active').eq('restaurant_id', RESTAURANT_ID).order('table_number'),
      supabase.from('restaurants').select('slug').eq('id', RESTAURANT_ID).maybeSingle(),
      supabase.from('restaurant_settings').select('accepts_dine_in,qr_primary_color,qr_background_color,qr_accent_color,qr_title,qr_design').eq('restaurant_id', RESTAURANT_ID).maybeSingle(),
    ]);
    if (branchResult.error || tableResult.error || restaurantResult.error || settingsResult.error) {
      setMessage([branchResult.error, tableResult.error, restaurantResult.error, settingsResult.error].find(Boolean)?.message ?? 'Could not load table settings.');
    } else {
      setBranches(branchResult.data ?? []);
      setTables((tableResult.data ?? []) as RestaurantTable[]);
      setRestaurantSlug(restaurantResult.data?.slug ?? '');
      setSettings({ ...DEFAULTS, ...(settingsResult.data ?? {}) });
      if (!branchId && branchResult.data?.length) setBranchId(branchResult.data.find(b => b.is_active)?.id ?? branchResult.data[0].id);
    }
    setLoading(false);
  }, [branchId]);

  useEffect(() => { void load(); }, [load]);

  const qrUrl = (table: RestaurantTable) => {
    const url = new URL('https://shadyelsawy536.github.io/cafe-website/');
    url.searchParams.set('restaurant', restaurantSlug);
    url.searchParams.set('table', table.qr_token);
    return url.toString();
  };
  const qrImageUrl = (table: RestaurantTable) => 'https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=18&color='
    + settings.qr_primary_color.replace('#', '') + '&bgcolor=' + settings.qr_background_color.replace('#', '')
    + '&data=' + encodeURIComponent(qrUrl(table));

  const saveSettings = async () => {
    setSaving(true); setMessage('');
    const { error } = await supabase.from('restaurant_settings').update({
      accepts_dine_in: settings.accepts_dine_in,
      qr_primary_color: settings.qr_primary_color,
      qr_background_color: settings.qr_background_color,
      qr_accent_color: settings.qr_accent_color,
      qr_title: settings.qr_title,
      qr_design: settings.qr_design,
    }).eq('restaurant_id', RESTAURANT_ID);
    setMessage(error ? error.message : 'Dine In and QR design settings saved.');
    setSaving(false);
  };

  const saveTable = async () => {
    if (!branchId || !tableNumber.trim()) { setMessage('Choose a branch and enter a table number.'); return; }
    setSaving(true); setMessage('');
    const payload = { restaurant_id: RESTAURANT_ID, branch_id: branchId, table_number: tableNumber.trim(), display_name: displayName.trim() || null };
    const result = editing
      ? await supabase.from('restaurant_tables').update({ branch_id: payload.branch_id, table_number: payload.table_number, display_name: payload.display_name }).eq('id', editing.id).eq('restaurant_id', RESTAURANT_ID)
      : await supabase.from('restaurant_tables').insert(payload);
    if (result.error) setMessage(result.error.message);
    else { setTableNumber(''); setDisplayName(''); setEditing(null); setMessage(editing ? 'Table updated.' : 'Table added.'); await load(); }
    setSaving(false);
  };

  const toggleActive = async (table: RestaurantTable) => {
    const { error } = await supabase.from('restaurant_tables').update({ is_active: !table.is_active }).eq('id', table.id).eq('restaurant_id', RESTAURANT_ID);
    setMessage(error ? error.message : `Table ${table.table_number} ${table.is_active ? 'deactivated' : 'activated'}.`);
    if (!error) await load();
  };

  const activeTables = useMemo(() => tables.filter(t => t.is_active).length, [tables]);

  return <div className="mx-auto w-full max-w-7xl space-y-6 overflow-y-auto p-6 md:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">Dine In</p><h1 className="mt-1 font-display text-2xl font-semibold text-ink">Tables & QR Codes</h1><p className="mt-2 text-sm text-ink/60">Create a QR code for each table, customize its appearance, and print it for your restaurant.</p></div>
      <div className="rounded-2xl border border-line bg-surface px-5 py-3"><p className="text-xs text-ink/50">Active tables</p><p className="mt-1 text-2xl font-semibold text-ink">{activeTables}</p></div>
    </header>
    {message && <div role="status" className="rounded-xl border border-line bg-surface p-3 text-sm text-ink">{message}</div>}
    <section className="rounded-2xl border border-line bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold text-ink">Dine In service</h2><p className="mt-1 text-sm text-ink/60">When disabled, new QR table orders must be rejected by the ordering backend.</p></div><label className="flex items-center gap-3 text-sm font-medium text-ink"><input type="checkbox" checked={settings.accepts_dine_in} onChange={e => setSettings(s => ({ ...s, accepts_dine_in: e.target.checked }))} className="h-4 w-4 accent-current" /> Enabled</label></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-medium text-ink/60">QR foreground<input aria-label="QR foreground color" type="color" value={settings.qr_primary_color} onChange={e => setSettings(s => ({ ...s, qr_primary_color: e.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-line bg-canvas p-1" /></label>
        <label className="text-xs font-medium text-ink/60">QR background<input aria-label="QR background color" type="color" value={settings.qr_background_color} onChange={e => setSettings(s => ({ ...s, qr_background_color: e.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-line bg-canvas p-1" /></label>
        <label className="text-xs font-medium text-ink/60">Accent color<input aria-label="QR accent color" type="color" value={settings.qr_accent_color} onChange={e => setSettings(s => ({ ...s, qr_accent_color: e.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-line bg-canvas p-1" /></label>
        <label className="text-xs font-medium text-ink/60 sm:col-span-2">Print heading<input className={input} value={settings.qr_title} maxLength={70} onChange={e => setSettings(s => ({ ...s, qr_title: e.target.value }))} placeholder="Scan to order" /></label>
        <label className="text-xs font-medium text-ink/60">Design style<select className={input} value={settings.qr_design} onChange={e => setSettings(s => ({ ...s, qr_design: e.target.value }))}><option value="classic">Classic</option><option value="minimal">Minimal</option><option value="premium">Premium</option></select></label>
      </div>
      <div className="mt-5 flex justify-end"><button disabled={saving} onClick={() => void saveSettings()} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Dine In & QR design'}</button></div>
    </section>
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-2xl border border-line bg-surface p-5 md:p-6">
        <h2 className="font-semibold text-ink">{editing ? 'Edit table' : 'Add a table'}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-ink/60">Branch<select className={input} value={branchId} onChange={e => setBranchId(e.target.value)}><option value="">Select branch</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}{b.is_active ? '' : ' (inactive)'}</option>)}</select></label>
          <label className="text-xs font-medium text-ink/60">Table number<input className={input} value={tableNumber} onChange={e => setTableNumber(e.target.value)} maxLength={30} placeholder="07" /></label>
          <label className="text-xs font-medium text-ink/60 sm:col-span-2">Display name (optional)<input className={input} value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={80} placeholder="Window seat / Patio 1" /></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><button disabled={saving} onClick={() => void saveTable()} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save table' : 'Add table'}</button>{editing && <button onClick={() => { setEditing(null); setTableNumber(''); setDisplayName(''); }} className="rounded-xl border border-line px-4 py-2.5 text-sm">Cancel</button>}</div>
        <div className="mt-6 overflow-x-auto rounded-xl border border-line"><table className="w-full text-left text-sm"><thead className="bg-canvas text-xs uppercase tracking-wide text-ink/50"><tr><th className="px-3 py-3">Table</th><th className="px-3 py-3">Branch</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Actions</th></tr></thead><tbody>{loading ? <tr><td className="p-4 text-ink/50" colSpan={4}>Loading tables…</td></tr> : tables.map(table => <tr key={table.id} className="border-t border-line"><td className="px-3 py-3"><strong>{table.display_name || `Table ${table.table_number}`}</strong><div className="text-xs text-ink/50">#{table.table_number}</div></td><td className="px-3 py-3">{branches.find(b => b.id === table.branch_id)?.name ?? '—'}</td><td className="px-3 py-3">{table.is_active ? 'Active' : 'Inactive'}</td><td className="px-3 py-3"><div className="flex flex-wrap gap-2"><button className="text-xs font-medium underline" onClick={() => { setEditing(table); setBranchId(table.branch_id); setTableNumber(table.table_number); setDisplayName(table.display_name ?? ''); }}>Edit</button><button className="text-xs font-medium underline" onClick={() => setSelected(table)}>QR / Print</button><button className="text-xs font-medium underline" onClick={() => void toggleActive(table)}>{table.is_active ? 'Disable' : 'Enable'}</button></div></td></tr>)}</tbody></table></div>
      </div>
      <aside className="rounded-2xl border border-line bg-surface p-5 md:p-6">
        <h2 className="font-semibold text-ink">QR preview</h2>
        {selected ? <div className="mt-4 rounded-2xl border p-5 text-center" style={{ borderColor: settings.qr_accent_color, backgroundColor: settings.qr_background_color, color: settings.qr_primary_color }}><p className="text-xs uppercase tracking-[0.18em]" style={{ color: settings.qr_accent_color }}>{restaurantSlug || 'HubDine'}</p><h3 className="mt-2 text-xl font-semibold">{settings.qr_title || 'Scan to order'}</h3><p className="mt-1 text-sm">{selected.display_name || `Table ${selected.table_number}`}</p><img className="mx-auto mt-4 w-full max-w-[240px]" src={qrImageUrl(selected)} alt={`QR code for table ${selected.table_number}`} /><p className="mt-3 text-xs">Scan the code to open this table's menu</p><div className="mt-4 flex flex-wrap justify-center gap-2 print:hidden"><button className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: settings.qr_accent_color }} onClick={() => window.open(qrUrl(selected), '_blank', 'noopener,noreferrer')}>Open link</button><button className="rounded-lg px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: settings.qr_primary_color }} onClick={() => window.print()}>Print QR</button></div></div> : <p className="mt-3 text-sm text-ink/50">Choose “QR / Print” on a table to preview its printable code.</p>}
        <p className="mt-4 text-xs leading-5 text-ink/50">QR design settings apply to every table. Each table keeps its own permanent token, so changing colors or layout does not change its identity.</p>
      </aside>
    </section>
  </div>;
}
