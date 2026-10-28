/**
 * RegisterPage — create a new account with profile details.
 * Profile fields from PRD §3.1: name, email, GitHub, VS Code, default LLM tool.
 */
import { useState } from 'react';
import Wordmark from '../components/Wordmark.jsx';

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

  const field = (label, key, type = 'text', placeholder = '', autoComplete = 'off') => (
    <div>
      <label htmlFor={`register-${key}`} className="field-label">
        {label}
      </label>
      <input
        id={`register-${key}`}
        type={type}
        autoComplete={autoComplete}
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        className="field"
      />
    </div>
  );

  return (
    <main className="min-h-screen bg-surface-page flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo / title */}
        <div className="mb-6">
          <Wordmark size="lg" />
          <p className="text-text-muted text-sm mt-1">Create your account</p>
        </div>

        <section aria-labelledby="register-heading" className="bg-surface-column border border-border-subtle border-t-2 border-t-brand-accent p-6">
          <h1 id="register-heading" className="sr-only">Create account</h1>
          {error && (
            <p role="alert" className="mb-4 px-3 py-2 bg-type-urgent/10 border-l-4 border-type-urgent text-type-urgent text-sm">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ── Required fields ── */}
            <fieldset>
              <legend className="text-text-primary text-xs font-bold uppercase tracking-wider mb-3">
                Account Details
              </legend>
              <div className="space-y-3">
                {field('Full Name', 'name', 'text', 'Alex Reed', 'name')}
                {field('Email', 'email', 'email', 'you@example.com', 'email')}
                {field('Password', 'password', 'password', 'Min. 8 characters', 'new-password')}
                {field('Confirm Password', 'confirm', 'password', '••••••••', 'new-password')}
              </div>
            </fieldset>

            {/* ── Profile fields ── */}
            <fieldset className="pt-5 border-t border-border-subtle">
              <legend className="float-left w-full text-text-primary text-xs font-bold uppercase tracking-wider mb-3">
                Profile <span className="font-normal normal-case text-text-muted">(optional)</span>
              </legend>
              <div className="clear-both space-y-3">
                {field('GitHub Handle', 'githubHandle', 'text', '@your-handle')}
                {field('VS Code / Cursor Profile', 'vsCodeProfile', 'text', 'profile name or email')}

                {/* Default LLM tool */}
                <div>
                  <label htmlFor="register-defaultLlmTool" className="field-label">
                    Default AI Tool
                  </label>
                  <select
                    id="register-defaultLlmTool"
                    value={form.defaultLlmTool}
                    onChange={set('defaultLlmTool')}
                    className="field"
                  >
                    <option value="">None / not set</option>
                    {LLM_TOOLS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>

            <button type="submit" disabled={busy} className="btn-primary w-full py-2 text-sm">
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </section>

        <p className="text-text-muted text-sm mt-4">
          Already have an account?{' '}
          <button type="button" onClick={onGoLogin} className="link">
            Sign in
          </button>
        </p>
      </div>
    </main>
  );
}
