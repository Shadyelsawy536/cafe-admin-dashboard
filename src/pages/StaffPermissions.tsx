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
interface PermissionRow {
  id: string;
  key: string;
  description: string | null;
}

export function StaffPermissions() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  // roleId -> Set of permission keys currently granted to that role
  const [grants, setGrants] = useState<Record<string, Set<string>>>({});
  const [savingCell, setSavingCell] = useState<string | null>(null); // `${roleId}:${permKey}` while in flight
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

    const { data: permissionRows } = await supabase.from('permissions').select('id, key, description').order('key');
    setPermissions(permissionRows ?? []);

    if (roleRows?.length) {
      const { data: rolePermRows } = await supabase
        .from('role_permissions')
        .select('role_id, permissions(key)')
        .in('role_id', roleRows.map((r) => r.id));

      const byRole: Record<string, Set<string>> = {};
      for (const r of roleRows) byRole[r.id] = new Set();
      for (const row of rolePermRows ?? []) {
        const key = (row.permissions as unknown as { key: string } | null)?.key;
        if (key) byRole[row.role_id]?.add(key);
      }
      setGrants(byRole);
    }

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

  async function togglePermission(role: RoleRow, permission: PermissionRow, nextChecked: boolean) {
    const cellKey = `${role.id}:${permission.key}`;
    setSavingCell(cellKey);

    // Optimistic update so the checkbox responds immediately.
    setGrants((prev) => {
      const next = { ...prev, [role.id]: new Set(prev[role.id] ?? []) };
      if (nextChecked) next[role.id].add(permission.key);
      else next[role.id].delete(permission.key);
      return next;
    });

    const result = nextChecked
      ? await supabase.from('role_permissions').insert({ role_id: role.id, permission_id: permission.id })
      : await supabase.from('role_permissions').delete().eq('role_id', role.id).eq('permission_id', permission.id);

    if (result.error) {
      // Revert on failure (e.g. this account itself lacks staff.manage).
      setGrants((prev) => {
        const next = { ...prev, [role.id]: new Set(prev[role.id] ?? []) };
        if (nextChecked) next[role.id].delete(permission.key);
        else next[role.id].add(permission.key);
        return next;
      });
    }
    setSavingCell(null);
  }

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
          <p className="mt-3 text-xs text-ink/40">Configure exactly what each role can access in the Role Permissions table below.</p>
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

      {/* Permission matrix */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Role Permissions</h2>
          <p className="mt-1 text-xs text-ink/60">
            Choose exactly what each role can access. Changes apply immediately — both here and to what that role can do in the database.
          </p>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-ink/50">Loading…</p>
        ) : roles.length === 0 ? (
          <p className="p-6 text-sm text-ink/50">Add a role above to configure its permissions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-xs uppercase tracking-wide text-ink/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Permission</th>
                  {roles.map((r) => (
                    <th key={r.id} className="px-4 py-3 text-center font-medium">
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{p.key}</p>
                      {p.description && <p className="text-xs text-ink/50">{p.description}</p>}
                    </td>
                    {roles.map((r) => {
                      const cellKey = `${r.id}:${p.key}`;
                      const checked = grants[r.id]?.has(p.key) ?? false;
                      return (
                        <td key={r.id} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={savingCell === cellKey}
                            onChange={(e) => togglePermission(r, p, e.target.checked)}
                            className="h-4 w-4 rounded border-line accent-accent disabled:opacity-50"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {permissions.length === 0 && (
                  <tr>
                    <td colSpan={roles.length + 1} className="px-4 py-6 text-center text-xs text-ink/40">
                      No permission types found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
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
