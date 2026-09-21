import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ImageUpload } from '../components/ImageUpload';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';

type WebSettings = {
  restaurant_id: string;
  website_name: string;
  seo_title: string;
  seo_description: string;
  favicon_url: string | null;
  og_image_url: string | null;
  theme_color: string;
  pwa_enabled: boolean;
  pwa_short_name: string;
};

const input = 'mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent';
const card = 'mt-6 rounded-2xl border border-line bg-surface p-6';

const defaults: Omit<WebSettings, 'restaurant_id'> = {
  website_name: '', seo_title: '', seo_description: '', favicon_url: null, og_image_url: null,
  theme_color: '#111111', pwa_enabled: true, pwa_short_name: '',
};

export function WebsiteSettings() {
  const [restaurantName, setRestaurantName] = useState('Restaurant');
  const [settings, setSettings] = useState<WebSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [restaurant, web] = await Promise.all([
      supabase.from('restaurants').select('name,description,logo_url,cover_image_url').eq('id', RESTAURANT_ID).maybeSingle(),
      supabase.from('restaurant_web_settings').select('*').eq('restaurant_id', RESTAURANT_ID).maybeSingle(),
    ]);
    if (restaurant.error || web.error) {
      setMessage(restaurant.error?.message || web.error?.message || 'Unable to load website settings.');
      setLoading(false);
      return;
    }
    setRestaurantName(restaurant.data?.name || 'Restaurant');
    setSettings({
      restaurant_id: RESTAURANT_ID,
      ...defaults,
      website_name: restaurant.data?.name || defaults.website_name,
      seo_title: restaurant.data?.name || defaults.seo_title,
      seo_description: restaurant.data?.description || defaults.seo_description,
      favicon_url: restaurant.data?.logo_url || null,
      og_image_url: restaurant.data?.cover_image_url || null,
      pwa_short_name: restaurant.data?.name || defaults.pwa_short_name,
      ...(web.data || {}),
    });
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const patch = (key: keyof WebSettings, value: unknown) => setSettings(current => current ? { ...current, [key]: value } : current);

  async function save() {
    if (!settings) return;
    setSaving(true); setMessage(null);
    const payload = {
      restaurant_id: RESTAURANT_ID,
      website_name: settings.website_name.trim() || restaurantName,
      seo_title: settings.seo_title.trim() || settings.website_name.trim() || restaurantName,
      seo_description: settings.seo_description.trim() || null,
      favicon_url: settings.favicon_url || null,
      og_image_url: settings.og_image_url || null,
      theme_color: settings.theme_color || '#111111',
      pwa_enabled: settings.pwa_enabled,
      pwa_short_name: settings.pwa_short_name.trim() || settings.website_name.trim() || restaurantName,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('restaurant_web_settings').upsert(payload, { onConflict: 'restaurant_id' });
    setSaving(false);
    setMessage(error ? error.message : 'Website settings saved successfully.');
  }

  if (loading || !settings) return <div className="p-8 text-sm text-ink/50">Loading website settings…</div>;

  return <div className="max-w-5xl p-8 pb-16">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="font-display text-2xl font-semibold">Website</h1><p className="mt-1 text-sm text-ink/60">Control the customer-facing website, SEO metadata and installable PWA for this restaurant.</p></div>
      <button onClick={save} disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
    </header>
    {message && <div className="mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm">{message}</div>}

    <section className={card}>
      <h2 className="font-display text-lg font-semibold">Website Identity</h2>
      <p className="mt-1 text-sm text-ink/60">These values appear in the browser tab, shared links and the installed app shell.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Website Name"><input className={input} value={settings.website_name} onChange={e => patch('website_name', e.target.value)} placeholder={restaurantName} /></Field>
        <Field label="PWA Short Name"><input className={input} value={settings.pwa_short_name} onChange={e => patch('pwa_short_name', e.target.value)} placeholder={restaurantName} maxLength={30} /></Field>
        <Field label="Favicon / App Icon"><ImageUpload value={settings.favicon_url || ''} onChange={value => patch('favicon_url', value || null)} /></Field>
        <Field label="Open Graph Image"><ImageUpload value={settings.og_image_url || ''} onChange={value => patch('og_image_url', value || null)} /></Field>
        <Field label="Theme Color"><div className="flex gap-2"><input type="color" className="h-10 w-14 rounded border border-line bg-canvas" value={settings.theme_color || '#111111'} onChange={e => patch('theme_color', e.target.value)} /><input className={input} value={settings.theme_color || '#111111'} onChange={e => patch('theme_color', e.target.value)} /></div></Field>
      </div>
    </section>

    <section className={card}>
      <h2 className="font-display text-lg font-semibold">SEO</h2>
      <p className="mt-1 text-sm text-ink/60">Keep titles and descriptions concise. The website applies these values dynamically for the selected restaurant.</p>
      <div className="mt-5 space-y-4">
        <Field label="SEO Title"><input className={input} value={settings.seo_title} onChange={e => patch('seo_title', e.target.value)} maxLength={70} /></Field>
        <Field label="SEO Description"><textarea rows={4} className={input} value={settings.seo_description} onChange={e => patch('seo_description', e.target.value)} maxLength={180} /></Field>
      </div>
    </section>

    <section className={card}>
      <div className="flex items-center justify-between gap-4">
        <div><h2 className="font-display text-lg font-semibold">Progressive Web App</h2><p className="mt-1 text-sm text-ink/60">Allow customers to install the restaurant website like an app on supported browsers.</p></div>
        <button type="button" onClick={() => patch('pwa_enabled', !settings.pwa_enabled)} className={`relative h-7 w-12 rounded-full transition ${settings.pwa_enabled ? 'bg-accent' : 'bg-ink/20'}`} aria-label="Toggle PWA"><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${settings.pwa_enabled ? 'left-6' : 'left-1'}`} /></button>
      </div>
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="block text-xs font-medium uppercase tracking-wide text-ink/50">{label}</span>{children}</label>;
}
