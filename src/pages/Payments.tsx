import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';

interface Provider {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  supported_countries: string[];
  supported_currencies: string[];
}
interface Field {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  is_secret: boolean;
  required: boolean;
}
interface Account {
  id: string;
  provider_id: string;
  country: string | null;
  currency: string | null;
  configured_fields: string[];
  is_active: boolean;
}

export function Payments() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectProvider = useCallback(async (providerId: string, currentAccounts: Account[]) => {
    setSelectedProviderId(providerId);
    setError(null);
    setSuccess(null);
    const { data: fieldRows } = await supabase
      .from('payment_provider_fields')
      .select('id, field_key, label, field_type, is_secret, required')
      .eq('provider_id', providerId)
      .order('sort_order');
    setFields(fieldRows ?? []);

    const existing = currentAccounts.find((a) => a.provider_id === providerId);
    setCountry(existing?.country ?? '');
    setCurrency(existing?.currency ?? '');
    setValues({});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [providersRes, accountsRes] = await Promise.all([
      supabase
        .from('payment_providers')
        .select('id, code, name, is_active, supported_countries, supported_currencies')
        .order('is_active', { ascending: false }),
      // Only ever select safe metadata columns — credentials_encrypted is
      // revoked at the database level for this role, so it couldn't be
      // read here even if requested.
      supabase
        .from('tenant_payment_accounts')
        .select('id, provider_id, country, currency, configured_fields, is_active')
        .eq('restaurant_id', RESTAURANT_ID),
    ]);
    const providerRows = providersRes.data ?? [];
    const accountRows = accountsRes.data ?? [];
    setProviders(providerRows);
    setAccounts(accountRows);
    setLoading(false);

    if (providerRows.length && !selectedProviderId) {
      const firstActive = providerRows.find((p) => p.is_active);
      if (firstActive) await selectProvider(firstActive.id, accountRows);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currentAccount = accounts.find((a) => a.provider_id === selectedProviderId);
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const credentials: Record<string, string> = {};
    for (const f of fields) {
      if (values[f.field_key]) credentials[f.field_key] = values[f.field_key];
    }

    const missingRequired = fields.filter(
      (f) => f.required && !credentials[f.field_key] && !currentAccount?.configured_fields.includes(f.field_key)
    );
    if (missingRequired.length > 0) {
      setError(`Missing required field${missingRequired.length > 1 ? 's' : ''}: ${missingRequired.map((f) => f.label).join(', ')}`);
      setSaving(false);
      return;
    }

    const { data, error: fnError } = await supabase.functions.invoke('save-payment-credentials', {
      body: { restaurantId: RESTAURANT_ID, providerId: selectedProviderId, country, currency, credentials },
    });

    if (fnError || data?.error) {
      setError(data?.error ?? 'Could not save payment credentials.');
    } else {
      setSuccess('Payment provider connected.');
      setValues({});
      load();
    }
    setSaving(false);
  }

  return (
    <div className="max-w-2xl p-8">
      <h1 className="font-display text-2xl font-semibold text-ink">Payments</h1>
      <p className="mt-1 text-sm text-ink/60">
        Connect your own payment provider account. Credentials are encrypted and never shown again once saved.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-ink/50">Loading…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {providers.map((p) => {
              const connected = accounts.some((a) => a.provider_id === p.id && a.is_active);
              return (
                <button
                  key={p.id}
                  disabled={!p.is_active}
                  onClick={() => selectProvider(p.id, accounts)}
                  className={`rounded-xl border p-3 text-left text-sm ${
                    selectedProviderId === p.id ? 'border-accent bg-accent/5' : 'border-line bg-surface'
                  } ${!p.is_active ? 'cursor-not-allowed opacity-40' : 'hover:border-accent/40'}`}
                >
                  <p className="font-medium text-ink">{p.name}</p>
                  <p className="text-xs text-ink/50">{!p.is_active ? 'Coming soon' : connected ? '✓ Connected' : 'Not connected'}</p>
                </button>
              );
            })}
          </div>

          {selectedProvider && (
            <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold text-ink">{selectedProvider.name} Settings</h2>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-ink/50">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder={selectedProvider.supported_countries[0] ?? ''}
                    className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-ink/50">Currency</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder={selectedProvider.supported_currencies[0] ?? ''}
                    className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {fields.map((f) => {
                  const isSet = currentAccount?.configured_fields.includes(f.field_key);
                  return (
                    <div key={f.id}>
                      <label className="block text-xs font-medium uppercase tracking-wide text-ink/50">
                        {f.label} {f.required && <span className="text-danger">*</span>}
                      </label>
                      <input
                        type={f.field_type === 'password' ? 'password' : 'text'}
                        value={values[f.field_key] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [f.field_key]: e.target.value }))}
                        placeholder={isSet ? '•••••••••••••••• (already set — leave blank to keep)' : ''}
                        className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  );
                })}
              </div>

              {error && <p className="mt-3 text-sm text-danger">{error}</p>}
              {success && <p className="mt-3 text-sm text-status-ready">{success}</p>}

              <button
                onClick={save}
                disabled={saving}
                className="mt-5 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
              >
                {saving ? 'Saving…' : currentAccount ? 'Update Credentials' : 'Connect Provider'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
