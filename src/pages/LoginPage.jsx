/**
 * LoginPage — email/password login form.
 * Props: { onLogin, onGoRegister, onAcceptInvite? }
 */
import { useState } from 'react';

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
    <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-white tracking-tight">⚡ VibeCoder</div>
          <p className="text-[#8c8fa3] text-sm mt-1">Project Tracker</p>
        </div>

        <div className="bg-[#2b2d30] border border-[#3c3f41] rounded-lg p-6">
          <h2 className="text-[#dfe1e5] font-semibold text-lg mb-5">Sign in</h2>

          {error && (
            <div className="mb-4 px-3 py-2 bg-[#3c1a1a] border border-[#ef4444]/40 rounded text-[#ef4444] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#8c8fa3] text-xs font-medium mb-1 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full bg-[#1e1f22] border border-[#3c3f41] rounded px-3 py-2 text-[#dfe1e5] text-sm placeholder-[#5a5d6b] focus:outline-none focus:border-[#4c9ee8] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-[#8c8fa3] text-xs font-medium mb-1 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#1e1f22] border border-[#3c3f41] rounded px-3 py-2 text-[#dfe1e5] text-sm placeholder-[#5a5d6b] focus:outline-none focus:border-[#4c9ee8] transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[#4c9ee8] hover:bg-[#5aadff] disabled:opacity-50 text-white font-semibold py-2 rounded text-sm transition-colors"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#8c8fa3] text-sm mt-4">
          Don't have an account?{' '}
          <button onClick={onGoRegister} className="text-[#4c9ee8] hover:underline">
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
