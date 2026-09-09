import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RESTAURANT_ID } from '../lib/tenant';

interface RoleRow {
  id: string;
  name: string;
}
interface StaffRow {
  id: string; // restaurant_users.id
  user_id: string;
  role_id: string;
  role_name: string;
  full_name: string | null;
}

export function StaffPermissions() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [newRoleName, setNewRoleName] = useState('');
  const [savingRole, setSavingRole] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const { data: roleRows } = await supabase.from('roles').select('id, name').eq('restaurant_id', RESTAURANT_ID).order('name');
    setRoles(roleRows ?? []);
    if (roleRows?.length && !inviteRoleId) setInviteRoleId(roleRows[0].id);

    const { data: staffRows } = await supabase
      .from('restaurant_users')
      .select('id, user_id, role_id, roles(name)')
      .eq('restaurant_id', RESTAURANT_ID);

    if (staffRows) {
      // restaurant_users and profiles both reference auth.users independently
      // (no direct FK between them), so PostgREST can't auto-embed profiles
      // here — fetch them separately and merge client-side.
      const userIds = staffRows.map((s) => s.user_id);
      const { data: profileRows } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      const nameById = new Map((profileRows ?? []).map((p) => [p.id, p.full_name]));

      setStaff(
        staffRows.map((s) => ({
          id: s.id,
          user_id: s.user_id,
          role_id: s.role_id,
          role_name: (s.roles as unknown as { name: string } | null)?.name ?? '—',
          full_name: nameById.get(s.user_id) ?? null,
        }))
      );
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addRole() {
    if (!newRoleName.trim()) return;
    setSavingRole(true);
    await supabase.from('roles').insert({ restaurant_id: RESTAURANT_ID, name: newRoleName.trim() });
    setNewRoleName('');
    setSavingRole(false);
    load();
  }

  async function deleteRole(role: RoleRow) {
    if (!confirm(`Delete role "${role.name}"? Staff currently assigned to it will need a new role.`)) return;
    await supabase.from('roles').delete().eq('id', role.id);
    load();
  }

  async function changeStaffRole(staffRow: StaffRow, newRoleId: string) {
    await supabase.from('restaurant_users').update({ role_id: newRoleId }).eq('id', staffRow.id);
    load();
  }

  async function removeStaff(staffRow: StaffRow) {
    if (!confirm(`Remove ${staffRow.full_name ?? 'this account'} from your restaurant's staff?`)) return;
    await supabase.from('restaurant_users').delete().eq('id', staffRow.id);
    load();
  }

  async function sendInvite() {
    if (!inviteEmail.trim() || !inviteRoleId) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    const { data, error } = await supabase.functions.invoke('invite-staff', {
      body: { restaurantId: RESTAURANT_ID, email: inviteEmail.trim(), roleId: inviteRoleId },
    });

    if (error || data?.error) {
      setInviteError(data?.error ?? 'Could not send invite.');
    } else {
      setInviteSuccess(`Invited ${inviteEmail.trim()}.`);
      setInviteEmail('');
      load();
    }
    setInviting(false);
  }

  return (
    <div className="p-8">
      <h1 className="font-display text-2xl font-semibold text-ink">Staff & Permissions</h1>
      <p className="mt-1 text-sm text-ink/60">Manage who has dashboard access and what they can do.</p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Roles */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Roles</h2>
          <div className="mt-4 space-y-2">
            {roles.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                <span className="font-medium text-ink">{r.name}</span>
                <button onClick={() => deleteRole(r)} className="text-xs text-danger hover:underline">
                  Delete
                </button>
              </div>
            ))}
            {roles.length === 0 && !loading && <p className="text-xs text-ink/40">No roles yet.</p>}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="New role name (e.g. Cashier)"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={addRole}
              disabled={savingRole || !newRoleName.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
            >
              Add
            </button>
          </div>
          <p className="mt-3 text-xs text-ink/40">
            Fine-grained permission toggles per role are a future addition — every role currently has full dashboard access once assigned.
          </p>
        </div>

        {/* Invite */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Invite Staff</h2>
          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink/50">Email</label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-ink/50">Role</label>
          <select
            value={inviteRoleId}
            onChange={(e) => setInviteRoleId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {inviteError && <p className="mt-2 text-xs text-danger">{inviteError}</p>}
          {inviteSuccess && <p className="mt-2 text-xs text-status-ready">{inviteSuccess}</p>}
          <button
            onClick={sendInvite}
            disabled={inviting || !inviteEmail.trim() || !inviteRoleId}
            className="mt-4 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {inviting ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </div>

      {/* Staff list */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        <h2 className="border-b border-line px-5 py-4 text-sm font-semibold text-ink">Current Staff</h2>
        {loading ? (
          <p className="p-6 text-sm text-ink/50">Loading…</p>
        ) : staff.length === 0 ? (
          <p className="p-6 text-sm text-ink/50">No staff yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas/60 text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{s.full_name ?? s.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={s.role_id}
                      onChange={(e) => changeStaffRole(s, e.target.value)}
                      className="rounded-lg border border-line bg-canvas px-2 py-1 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeStaff(s)} className="text-xs font-medium text-danger hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
