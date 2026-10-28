/**
 * LoginPage — email/password login form.
 * Props: { onLogin, onGoRegister, onAcceptInvite? }
 */
import { useState } from 'react';
import Wordmark from '../components/Wordmark.jsx';

// Seeded team creator account for demos (see services/seedData.js)
const DEMO_EMAIL    = 'alex.reed@vibetrack.dev';
const DEMO_PASSWORD = 'password123';

export default function LoginPage({ onLogin, onGoRegister }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface-page flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo / title */}
        <div className="mb-6">
          <Wordmark size="lg" />
          <p className="text-text-muted text-sm mt-1">Project Tracker</p>
        </div>

        <section aria-labelledby="signin-heading" className="bg-surface-column border border-border-subtle border-t-2 border-t-brand-accent p-6">
          <h1 id="signin-heading" className="text-text-primary font-bold text-lg mb-5">Sign in</h1>

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

            <div>
              <label htmlFor="login-password" className="field-label">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="field"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={busy} className="btn-primary w-full py-2 text-sm">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </section>

        {/* Demo credentials */}
        <aside aria-labelledby="demo-heading" className="mt-4 border border-dashed border-border-strong p-4 text-sm">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 id="demo-heading" className="text-brand-accent text-xs font-bold uppercase tracking-wider">Demo login</h2>
            <button
              type="button"
              onClick={() => { setEmail(DEMO_EMAIL); setPassword(DEMO_PASSWORD); setError(''); }}
              className="link text-xs font-semibold"
            >
              Use demo account
            </button>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-text-muted">Email</dt>
            <dd className="font-mono text-text-primary break-all">{DEMO_EMAIL}</dd>
            <dt className="text-text-muted">Password</dt>
            <dd className="font-mono text-text-primary">{DEMO_PASSWORD}</dd>
          </dl>
          <p className="text-text-muted text-[11px] mt-2">Alex Reed · creator of the UXD Hackathon 2026 team</p>
        </aside>

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
