import { useCallback, useEffect, useState } from 'react';
import { ImageUpload } from '../components/ImageUpload';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface Branding {
  restaurant_id: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  font_family: string | null;
  logo_url: string | null;
  cover_url: string | null;
}

interface RestaurantSettingsRow {
  restaurant_id: string;
  currency: string;
  timezone: string;
  order_number_prefix: string | null;
  min_order_amount: number | null;
  tax_rate: number;
  accepts_delivery: boolean;
  accepts_pickup: boolean;
}

interface DeliveryZone {
  id: string;
  name: string;
  delivery_fee: number;
  min_order_amount: number;
  is_active: boolean;
}

interface PaymentProvider {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface PaymentConfig {
  id: string;
  payment_provider_id: string;
  is_active: boolean;
}

const inputClass =
  'mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent';
const labelClass = 'block text-xs font-medium uppercase tracking-wide text-ink/50';

export function Settings() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [settings, setSettings] = useState<RestaurantSettingsRow | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [paymentConfigs, setPaymentConfigs] = useState<PaymentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [zoneDraft, setZoneDraft] = useState<DeliveryZone | 'new' | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneFee, setZoneFee] = useState(0);
  const [zoneMinOrder, setZoneMinOrder] = useState(0);
  const [zoneActive, setZoneActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [restaurantRes, brandingRes, settingsRes, zonesRes, providersRes, configsRes] = await Promise.all([
      supabase
        .from('restaurants')
        .select('id, name, description, logo_url, cover_image_url, phone, email, address')
        .eq('id', RESTAURANT_ID)
        .maybeSingle(),
      supabase
        .from('restaurant_branding')
        .select('restaurant_id, primary_color, secondary_color, background_color, font_family, logo_url, cover_url')
        .eq('restaurant_id', RESTAURANT_ID)
        .maybeSingle(),
      supabase
        .from('restaurant_settings')
        .select('restaurant_id, currency, timezone, order_number_prefix, min_order_amount, tax_rate, accepts_delivery, accepts_pickup')
        .eq('restaurant_id', RESTAURANT_ID)
        .maybeSingle(),
      supabase
        .from('delivery_zones')
        .select('id, name, delivery_fee, min_order_amount, is_active')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('name'),
      supabase.from('payment_providers').select('id, name, slug, is_active').order('name'),
      supabase
        .from('restaurant_payment_configs')
        .select('id, payment_provider_id, is_active')
        .eq('restaurant_id', RESTAURANT_ID),
    ]);

    if (restaurantRes.error) console.error(restaurantRes.error);
    if (brandingRes.error) console.error(brandingRes.error);
    if (settingsRes.error) console.error(settingsRes.error);
    if (zonesRes.error) console.error(zonesRes.error);
    if (providersRes.error) console.error(providersRes.error);
    if (configsRes.error) console.error(configsRes.error);

    setRestaurant(restaurantRes.data as Restaurant | null);
    setBranding(brandingRes.data as Branding | null);
    setSettings(settingsRes.data as RestaurantSettingsRow | null);
    setZones((zonesRes.data as DeliveryZone[]) ?? []);
    setProviders((providersRes.data as PaymentProvider[]) ?? []);
    setPaymentConfigs((configsRes.data as PaymentConfig[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateRestaurant<K extends keyof Restaurant>(key: K, value: Restaurant[K]) {
    setRestaurant((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateBranding<K extends keyof Branding>(key: K, value: Branding[K]) {
    setBranding((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateSettings<K extends keyof RestaurantSettingsRow>(key: K, value: RestaurantSettingsRow[K]) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }

  async function saveAll() {
    if (!restaurant || !branding || !settings) return;
    setSaving(true);
    setMessage(null);

    const [restaurantRes, brandingRes, settingsRes] = await Promise.all([
      supabase
        .from('restaurants')
        .update({
          name: restaurant.name.trim(),
          description: restaurant.description?.trim() || null,
          logo_url: restaurant.logo_url || null,
          cover_image_url: restaurant.cover_image_url || null,
          phone: restaurant.phone?.trim() || null,
          email: restaurant.email?.trim() || null,
          address: restaurant.address?.trim() || null,
        })
        .eq('id', RESTAURANT_ID),
      supabase
        .from('restaurant_branding')
        .update({
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          background_color: branding.background_color,
          font_family: branding.font_family?.trim() || null,
          logo_url: restaurant.logo_url || null,
          cover_url: restaurant.cover_image_url || null,
        })
        .eq('restaurant_id', RESTAURANT_ID),
      supabase
        .from('restaurant_settings')
        .update({
          currency: settings.currency.trim(),
          timezone: settings.timezone.trim(),
          order_number_prefix: settings.order_number_prefix?.trim() || null,
          min_order_amount: Number(settings.min_order_amount) || 0,
          tax_rate: Number(settings.tax_rate) || 0,
          accepts_delivery: settings.accepts_delivery,
          accepts_pickup: settings.accepts_pickup,
        })
        .eq('restaurant_id', RESTAURANT_ID),
    ]);

    const error = restaurantRes.error || brandingRes.error || settingsRes.error;
    setSaving(false);
    setMessage(error ? `Couldn't save settings: ${error.message}` : 'Settings saved successfully.');
  }

  function openNewZone() {
    setZoneName('');
    setZoneFee(0);
    setZoneMinOrder(0);
    setZoneActive(true);
    setZoneDraft('new');
  }

  function openZone(zone: DeliveryZone) {
    setZoneName(zone.name);
    setZoneFee(Number(zone.delivery_fee));
    setZoneMinOrder(Number(zone.min_order_amount));
    setZoneActive(zone.is_active);
    setZoneDraft(zone);
  }

  async function saveZone() {
    if (!zoneName.trim()) return;
    const payload = {
      restaurant_id: RESTAURANT_ID,
      name: zoneName.trim(),
      delivery_fee: Math.max(0, Number(zoneFee) || 0),
      min_order_amount: Math.max(0, Number(zoneMinOrder) || 0),
      is_active: zoneActive,
    };

    if (zoneDraft === 'new') {
      await supabase.from('delivery_zones').insert(payload);
    } else if (zoneDraft) {
      await supabase.from('delivery_zones').update(payload).eq('id', zoneDraft.id);
    }
    setZoneDraft(null);
    load();
  }

  async function removeZone(zone: DeliveryZone) {
    if (!confirm(`Delete delivery zone "${zone.name}"?`)) return;
    await supabase.from('delivery_zones').delete().eq('id', zone.id);
    load();
  }

  async function togglePayment(providerId: string, enabled: boolean) {
    const existing = paymentConfigs.find((config) => config.payment_provider_id === providerId);
    if (existing) {
      await supabase.from('restaurant_payment_configs').update({ is_active: enabled }).eq('id', existing.id);
    } else {
      await supabase.from('restaurant_payment_configs').insert({
        restaurant_id: RESTAURANT_ID,
        payment_provider_id: providerId,
        is_active: enabled,
      });
    }
    load();
  }

  if (loading) return <div className="p-8 text-sm text-ink/50">Loading settings…</div>;

  if (!restaurant || !settings) {
    return <div className="p-8 text-sm text-danger">Restaurant settings could not be loaded.</div>;
  }

  return (
    <div className="max-w-6xl p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Settings</h1>
          <p className="mt-1 text-sm text-ink/60">Manage restaurant information, branding, ordering, delivery and payments.</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {message && <div className="mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink/70">{message}</div>}

      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Restaurant Info</h2>
        <p className="mt-1 text-sm text-ink/50">The information customers see about the restaurant.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Name</label>
            <input className={inputClass} value={restaurant.name} onChange={(e) => updateRestaurant('name', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input className={inputClass} value={restaurant.phone ?? ''} onChange={(e) => updateRestaurant('phone', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} value={restaurant.email ?? ''} onChange={(e) => updateRestaurant('email', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input className={inputClass} value={restaurant.address ?? ''} onChange={(e) => updateRestaurant('address', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea rows={3} className={inputClass} value={restaurant.description ?? ''} onChange={(e) => updateRestaurant('description', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Logo</label>
            <div className="mt-1"><ImageUpload value={restaurant.logo_url ?? ''} onChange={(url) => updateRestaurant('logo_url', url || null)} /></div>
          </div>
          <div>
            <label className={labelClass}>Cover Image</label>
            <div className="mt-1"><ImageUpload value={restaurant.cover_image_url ?? ''} onChange={(url) => updateRestaurant('cover_image_url', url || null)} /></div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Branding</h2>
        <p className="mt-1 text-sm text-ink/50">Colors used by the customer app and dashboard branding.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <ColorField label="Primary Color" value={branding?.primary_color ?? '#000000'} onChange={(value) => branding && updateBranding('primary_color', value)} />
          <ColorField label="Secondary Color" value={branding?.secondary_color ?? '#000000'} onChange={(value) => branding && updateBranding('secondary_color', value)} />
          <ColorField label="Background Color" value={branding?.background_color ?? '#ffffff'} onChange={(value) => branding && updateBranding('background_color', value)} />
        </div>
        <div className="mt-4 max-w-md">
          <label className={labelClass}>Font Family</label>
          <input className={inputClass} value={branding?.font_family ?? ''} onChange={(e) => branding && updateBranding('font_family', e.target.value)} placeholder="Optional font family" />
        </div>
        <div className="mt-5 rounded-xl border border-line bg-canvas p-4">
          <p className={labelClass}>Preview</p>
          <div className="mt-3 flex items-center gap-3 rounded-lg p-4" style={{ background: branding?.background_color, fontFamily: branding?.font_family || undefined }}>
            <div className="h-10 w-10 rounded-lg" style={{ background: branding?.primary_color }} />
            <div>
              <p className="font-semibold" style={{ color: branding?.primary_color }}>Restaurant App</p>
              <p className="text-xs" style={{ color: branding?.secondary_color }}>Brand preview</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Pricing & Ordering</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <label className={labelClass}>Tax Rate (%)</label>
            <input type="number" min={0} step="0.01" className={inputClass} value={settings.tax_rate} onChange={(e) => updateSettings('tax_rate', Number(e.target.value))} />
          </div>
          <div>
            <label className={labelClass}>Minimum Order Amount</label>
            <input type="number" min={0} step="0.01" className={inputClass} value={settings.min_order_amount ?? 0} onChange={(e) => updateSettings('min_order_amount', Number(e.target.value))} />
          </div>
          <div>
            <label className={labelClass}>Currency</label>
            <input className={inputClass} value={settings.currency} onChange={(e) => updateSettings('currency', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Timezone</label>
            <input className={inputClass} value={settings.timezone} onChange={(e) => updateSettings('timezone', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Order Number Prefix</label>
            <input className={inputClass} value={settings.order_number_prefix ?? ''} onChange={(e) => updateSettings('order_number_prefix', e.target.value)} placeholder="e.g. CAF" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-6">
          <Toggle label="Accept Delivery" checked={settings.accepts_delivery} onChange={(value) => updateSettings('accepts_delivery', value)} />
          <Toggle label="Accept Pickup" checked={settings.accepts_pickup} onChange={(value) => updateSettings('accepts_pickup', value)} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Delivery Zones</h2>
            <p className="mt-1 text-sm text-ink/50">Set delivery fees and minimum orders per zone.</p>
          </div>
          <button onClick={openNewZone} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-accent/40">+ Add Zone</button>
        </div>
        <div className="mt-5 overflow-hidden rounded-xl border border-line">
          {zones.length === 0 ? (
            <p className="p-4 text-sm text-ink/50">No delivery zones yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-xs uppercase tracking-wide text-ink/50">
                <tr><th className="px-4 py-3">Zone</th><th className="px-4 py-3">Delivery Fee</th><th className="px-4 py-3">Min Order</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium">{zone.name}</td>
                    <td className="px-4 py-3">{Number(zone.delivery_fee).toFixed(2)}</td>
                    <td className="px-4 py-3">{Number(zone.min_order_amount).toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${zone.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{zone.is_active ? 'Active' : 'Disabled'}</span></td>
                    <td className="px-4 py-3 text-right"><button onClick={() => openZone(zone)} className="mr-3 text-xs font-medium text-accent hover:underline">Edit</button><button onClick={() => removeZone(zone)} className="text-xs font-medium text-danger hover:underline">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Payment Providers</h2>
        <p className="mt-1 text-sm text-ink/50">Enable the payment providers configured for this restaurant.</p>
        <div className="mt-5 space-y-3">
          {providers.length === 0 ? (
            <p className="text-sm text-ink/50">No payment providers are configured on the platform.</p>
          ) : providers.map((provider) => {
            const config = paymentConfigs.find((item) => item.payment_provider_id === provider.id);
            const enabled = config?.is_active ?? false;
            return (
              <div key={provider.id} className="flex items-center justify-between rounded-xl border border-line bg-canvas px-4 py-3">
                <div><p className="text-sm font-medium">{provider.name}</p><p className="text-xs text-ink/40">{provider.slug}</p></div>
                <Toggle label={enabled ? 'Enabled' : 'Disabled'} checked={enabled} onChange={(value) => togglePayment(provider.id, value)} />
              </div>
            );
          })}
        </div>
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Payment credentials are intentionally not stored in the dashboard database. The current schema has no credential fields; secret provider keys should be handled server-side through Edge Functions/secret storage rather than exposed to the browser.
        </div>
      </section>

      {zoneDraft && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">{zoneDraft === 'new' ? 'Add Delivery Zone' : 'Edit Delivery Zone'}</h2><button onClick={() => setZoneDraft(null)} className="text-ink/40 hover:text-ink">✕</button></div>
            <label className={`${labelClass} mt-5`}>Zone Name</label>
            <input className={inputClass} value={zoneName} onChange={(e) => setZoneName(e.target.value)} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Delivery Fee</label><input type="number" min={0} step="0.01" className={inputClass} value={zoneFee} onChange={(e) => setZoneFee(Number(e.target.value))} /></div>
              <div><label className={labelClass}>Minimum Order</label><input type="number" min={0} step="0.01" className={inputClass} value={zoneMinOrder} onChange={(e) => setZoneMinOrder(Number(e.target.value))} /></div>
            </div>
            <div className="mt-5"><Toggle label="Active" checked={zoneActive} onChange={setZoneActive} /></div>
            <div className="mt-6 flex justify-end gap-2"><button onClick={() => setZoneDraft(null)} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button><button onClick={saveZone} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Save Zone</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-ink/70">
      <button type="button" onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-accent' : 'bg-ink/20'}`} aria-pressed={checked}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
      </button>
      {label}
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="mt-1 flex gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded border border-line bg-canvas p-1" />
        <input className={inputClass.replace('mt-1 ', '')} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}
