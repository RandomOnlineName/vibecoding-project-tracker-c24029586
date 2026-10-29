/**
 * LoginPage — email-only sign in (demo app: accounts have no passwords).
 * Lists every account that can sign in, with a one-click "Sign in" for each.
 * Props: { onLogin, onGoRegister }
 */
import { useEffect, useState } from 'react';
import Wordmark from '../components/Wordmark.jsx';

export default function LoginPage({ onLogin, onGoRegister }) {
  const [email, setEmail]       = useState('');
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [accounts, setAccounts] = useState(null); // null = loading
  const [accountsError, setAccountsError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/auth/accounts')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('Could not load demo accounts'))))
      .then(list => { if (active) setAccounts(list); })
      .catch(err => { if (active) { setAccounts([]); setAccountsError(err.message); } });
    return () => { active = false; };
  }, []);

  async function signIn(address) {
    setError('');
    setBusy(true);
    try {
      await onLogin(address.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    signIn(email);
  }

  return (
    <main className="min-h-screen bg-surface-page flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo / title */}
        <div className="mb-6">
          <Wordmark size="lg" />
          <p className="text-text-muted text-sm mt-1">Project Tracker</p>
        </div>

        <section aria-labelledby="signin-heading" className="bg-surface-column border border-border-subtle border-t-2 border-t-brand-accent p-6">
          <h1 id="signin-heading" className="text-text-primary font-bold text-lg mb-1">Sign in</h1>
          <p className="text-text-muted text-xs mb-5">This is a demo: no password is needed. Pick an account below or enter its email.</p>

          {error && (
            <p role="alert" className="mb-4 px-3 py-2 bg-type-urgent/10 border-l-4 border-type-urgent text-type-urgent text-sm">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="field-label">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="field"
                placeholder="you@example.com"
              />
            </div>

            <button type="submit" disabled={busy} className="btn-primary w-full py-2 text-sm">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </section>

        {/* Every account that can sign in */}
        <section aria-labelledby="accounts-heading" className="mt-4 border border-dashed border-border-strong text-sm">
          <h2 id="accounts-heading" className="px-4 pt-3 pb-2 text-brand-accent text-xs font-bold uppercase tracking-wider">
            Demo accounts
          </h2>

          {accounts === null ? (
            <p role="status" className="px-4 pb-3 text-xs text-text-muted">Loading accounts…</p>
          ) : accounts.length === 0 ? (
            <p className="px-4 pb-3 text-xs text-text-muted">
              {accountsError || 'No accounts yet.'} You can still sign in by typing an email above.
            </p>
          ) : (
            <ul className="divide-y divide-border-subtle border-t border-border-subtle">
              {accounts.map((a) => (
                <li key={a.email} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-text-primary text-xs font-semibold">
                      {a.name}
                      {a.role === 'owner' && <span className="ml-2 font-normal text-text-muted">Team creator</span>}
                    </p>
                    <p className="font-mono text-[11px] text-text-muted break-all">{a.email}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => signIn(a.email)}
                    className="btn-secondary py-1 shrink-0"
                  >
                    Sign in<span className="sr-only"> as {a.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-text-muted text-sm mt-4">
          Don't have an account?{' '}
          <button type="button" onClick={onGoRegister} className="link">
            Create one
          </button>
        </p>
      </div>
    </main>
  );
}
