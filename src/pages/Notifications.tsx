import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
}
interface CampaignRow {
  id: string;
  title: string;
  body: string;
  target_audience: string;
  sent_at: string | null;
  created_at: string;
}

export function Notifications() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [notifRes, campaignRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, title, body, type, read, created_at')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('notification_campaigns').select('id, title, body, target_audience, sent_at, created_at').eq('restaurant_id', RESTAURANT_ID).order('created_at', { ascending: false }),
    ]);
    setNotifications(notifRes.data ?? []);
    setCampaigns(campaignRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sendCampaign() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    await supabase.from('notification_campaigns').insert({
      restaurant_id: RESTAURANT_ID,
      title: title.trim(),
      body: body.trim(),
      target_audience: 'all',
    });
    setTitle('');
    setBody('');
    setSending(false);
    load();
  }

  return (
    <div className="p-8">
      <h1 className="font-display text-2xl font-semibold text-ink">Notifications</h1>
      <p className="mt-1 text-sm text-ink/60">
        Order-status notifications are logged automatically. <strong>Note: this records notifications but doesn't yet deliver real push
        notifications</strong> — that needs a separate FCM/APNs integration, not built yet.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Compose Campaign</h2>
          <p className="mt-1 text-xs text-ink/50">Recorded as a campaign — not yet actually sent to devices.</p>
          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink/50">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-ink/50">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={sendCampaign}
            disabled={sending || !title.trim() || !body.trim()}
            className="mt-4 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {sending ? 'Saving…' : 'Save Campaign'}
          </button>

          <div className="mt-6 space-y-2">
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-lg border border-line px-3 py-2">
                <p className="text-sm font-medium text-ink">{c.title}</p>
                <p className="text-xs text-ink/60">{c.body}</p>
                <p className="mt-1 text-[11px] text-ink/40">{new Date(c.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Recent Notifications</h2>
          <div className="mt-4 space-y-2">
            {loading ? (
              <p className="text-xs text-ink/50">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="text-xs text-ink/40">None yet — these appear automatically as order statuses change.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="rounded-lg border border-line px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ink">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </div>
                  <p className="text-xs text-ink/60">{n.body}</p>
                  <p className="mt-1 text-[11px] text-ink/40">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
