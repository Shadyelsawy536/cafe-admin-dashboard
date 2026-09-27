import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const { user, loading, error, signIn, cachedLoginId, forgetLoginId } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const needsLoginId = !cachedLoginId;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await signIn(email, password, needsLoginId ? loginId : undefined);
    setSubmitting(false);
  }

  return (
    <div className="flex h-screen items-center justify-center bg-canvas px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <h1 className="font-display text-2xl font-semibold text-ink">Cafe Admin</h1>
        <p className="mt-1 text-sm text-ink/60">Sign in to manage your restaurant.</p>

        {needsLoginId ? (
          <>
            <label className="mt-6 block text-xs font-medium uppercase tracking-wide text-ink/50">
              Restaurant Login ID
            </label>
            <input
              required
              maxLength={6}
              inputMode="numeric"
              autoFocus
              value={loginId}
              onChange={(e) => setLoginId(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-sm tracking-widest outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <p className="mt-1 text-xs text-ink/40">
              The 6-digit code for your restaurant. You'll only need to enter it once on this device.
            </p>
          </>
        ) : (
          <div className="mt-6 flex items-center justify-between rounded-lg bg-canvas px-3 py-2 text-xs text-ink/50">
            <span>Restaurant remembered on this device.</span>
            <button type="button" onClick={forgetLoginId} className="font-semibold text-accent hover:underline">
              Switch restaurant
            </button>
          </div>
        )}

        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink/50">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />

        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink/50">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
