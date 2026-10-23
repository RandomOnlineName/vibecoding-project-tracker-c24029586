/**
 * RegisterPage — create a new account with profile details.
 * Profile fields from PRD §3.1: name, email, GitHub, VS Code, default LLM tool.
 */
import { useState } from 'react';

const LLM_TOOLS = ['Claude', 'ChatGPT', 'Cursor', 'Gemini', 'Copilot', 'Other'];

export default function RegisterPage({ onRegister, onGoLogin }) {
  const [form, setForm] = useState({
    name:           '',
    email:          '',
    password:       '',
    confirm:        '',
    githubHandle:   '',
    vsCodeProfile:  '',
    defaultLlmTool: '',
  });
  const [error, setError]   = useState('');
  const [busy, setBusy]     = useState(false);

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await onRegister({
        name:           form.name.trim(),
        email:          form.email.trim(),
        password:       form.password,
        githubHandle:   form.githubHandle.trim() || undefined,
        vsCodeProfile:  form.vsCodeProfile.trim() || undefined,
        defaultLlmTool: form.defaultLlmTool || undefined,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const field = (label, key, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-[#8c8fa3] text-xs font-medium mb-1 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        className="w-full bg-[#1e1f22] border border-[#3c3f41] rounded px-3 py-2 text-[#dfe1e5] text-sm placeholder-[#5a5d6b] focus:outline-none focus:border-[#4c9ee8] transition-colors"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-white tracking-tight">⚡ VibeCoder</div>
          <p className="text-[#8c8fa3] text-sm mt-1">Create your account</p>
        </div>

        <div className="bg-[#2b2d30] border border-[#3c3f41] rounded-lg p-6">
          {error && (
            <div className="mb-4 px-3 py-2 bg-[#3c1a1a] border border-[#ef4444]/40 rounded text-[#ef4444] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ── Required fields ── */}
            <div>
              <p className="text-[#dfe1e5] text-xs font-semibold uppercase tracking-wider mb-3">
                Account Details
              </p>
              <div className="space-y-3">
                {field('Full Name', 'name', 'text', 'Alex Reed')}
                {field('Email', 'email', 'email', 'you@example.com')}
                {field('Password', 'password', 'password', 'Min. 8 characters')}
                {field('Confirm Password', 'confirm', 'password', '••••••••')}
              </div>
            </div>

            {/* ── Profile fields ── */}
            <div>
              <p className="text-[#8c8fa3] text-xs font-semibold uppercase tracking-wider mb-3 mt-2">
                Profile <span className="font-normal normal-case">(optional)</span>
              </p>
              <div className="space-y-3">
                {field('GitHub Handle', 'githubHandle', 'text', '@your-handle')}
                {field('VS Code / Cursor Profile', 'vsCodeProfile', 'text', 'profile name or email')}

                {/* Default LLM tool */}
                <div>
                  <label className="block text-[#8c8fa3] text-xs font-medium mb-1 uppercase tracking-wider">
                    Default AI Tool
                  </label>
                  <select
                    value={form.defaultLlmTool}
                    onChange={set('defaultLlmTool')}
                    className="w-full bg-[#1e1f22] border border-[#3c3f41] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4c9ee8] transition-colors"
                    style={{ color: form.defaultLlmTool ? '#dfe1e5' : '#5a5d6b' }}
                  >
                    <option value="">None / not set</option>
                    {LLM_TOOLS.map(t => (
                      <option key={t} value={t} style={{ color: '#dfe1e5', background: '#1e1f22' }}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[#4c9ee8] hover:bg-[#5aadff] disabled:opacity-50 text-white font-semibold py-2 rounded text-sm transition-colors mt-2"
            >
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#8c8fa3] text-sm mt-4">
          Already have an account?{' '}
          <button onClick={onGoLogin} className="text-[#4c9ee8] hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
