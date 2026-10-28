/**
 * ProfilePage — view and edit user profile details.
 * Fields: name, email (read-only), githubHandle, vsCodeProfile, defaultLlmTool, password change.
 */
import { useState, useEffect } from 'react';

const LLM_TOOLS = ['Claude', 'ChatGPT', 'Cursor', 'Gemini', 'Copilot', 'Other'];

export default function ProfilePage({ user, onUpdate, onBack }) {
  const [form, setForm] = useState({
    name:           user?.name           ?? '',
    githubHandle:   user?.githubHandle   ?? '',
    vsCodeProfile:  user?.vsCodeProfile  ?? '',
    defaultLlmTool: user?.defaultLlmTool ?? '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', password: '', confirm: '' });

  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);

  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  // Sync if user object changes
  useEffect(() => {
    if (!user) return;
    setForm({
      name:           user.name           ?? '',
      githubHandle:   user.githubHandle   ?? '',
      vsCodeProfile:  user.vsCodeProfile  ?? '',
      defaultLlmTool: user.defaultLlmTool ?? '',
    });
  }, [user]);

  function setF(k) { return e => setForm(p => ({ ...p, [k]: e.target.value })); }
  function setPw(k) { return e => setPwForm(p => ({ ...p, [k]: e.target.value })); }

  async function saveProfile(e) {
    e.preventDefault();
    setProfileMsg(''); setProfileErr('');
    setProfileBusy(true);
    try {
      await onUpdate({ name: form.name, githubHandle: form.githubHandle, vsCodeProfile: form.vsCodeProfile, defaultLlmTool: form.defaultLlmTool });
      setProfileMsg('Profile saved.');
    } catch (err) {
      setProfileErr(err.message);
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwMsg(''); setPwErr('');
    if (pwForm.password !== pwForm.confirm) { setPwErr('Passwords do not match'); return; }
    setPwBusy(true);
    try {
      await onUpdate({ currentPassword: pwForm.currentPassword, password: pwForm.password });
      setPwMsg('Password changed.');
      setPwForm({ currentPassword: '', password: '', confirm: '' });
    } catch (err) {
      setPwErr(err.message);
    } finally {
      setPwBusy(false);
    }
  }

  const sectionCls = 'border border-border-subtle';
  const sectionHeadCls = 'px-5 py-2.5 bg-surface-column border-b border-border-strong text-text-primary text-xs font-bold uppercase tracking-wider';

  return (
    <div className="min-h-screen bg-surface-page text-text-primary">
      {/* Header */}
      <header className="border-b border-border-strong bg-surface-column px-4 sm:px-6 h-12 flex items-center gap-4">
        <button type="button" onClick={onBack} className="link text-sm font-semibold no-underline hover:underline">
          ← Back
        </button>
        <span aria-hidden="true" className="h-5 w-px bg-border-strong" />
        <span className="text-text-primary font-semibold text-sm">Profile Settings</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Avatar + name header */}
        <div className="flex items-center gap-4 pb-4 border-b border-border-strong">
          <span aria-hidden="true" className="w-14 h-14 bg-brand-primary text-white flex items-center justify-center text-2xl font-bold chamfer">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </span>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{user?.name}</h1>
            <p className="text-text-muted text-sm">{user?.email}</p>
          </div>
        </div>

        {/* ── Profile section ── */}
        <section aria-labelledby="profile-heading" className={sectionCls}>
          <h2 id="profile-heading" className={sectionHeadCls}>Profile Details</h2>

          <div className="p-5">
            {profileMsg && <p role="status" className="text-status-success text-sm mb-3">{profileMsg}</p>}
            {profileErr && <p role="alert" className="text-type-urgent text-sm mb-3">{profileErr}</p>}

            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label htmlFor="profile-name" className="field-label">Full Name</label>
                <input id="profile-name" type="text" autoComplete="name" value={form.name} onChange={setF('name')} required className="field" placeholder="Alex Reed" />
              </div>

              <div>
                <label htmlFor="profile-email" className="field-label">Email</label>
                <input id="profile-email" type="email" value={user?.email ?? ''} readOnly disabled aria-describedby="profile-email-hint"
                  className="field" />
                <p id="profile-email-hint" className="text-text-muted text-xs mt-1">Email cannot be changed after registration.</p>
              </div>

              <div>
                <label htmlFor="profile-github" className="field-label">GitHub Handle</label>
                <input id="profile-github" type="text" value={form.githubHandle} onChange={setF('githubHandle')} className="field" placeholder="@your-handle" />
              </div>

              <div>
                <label htmlFor="profile-vscode" className="field-label">VS Code / Cursor Profile</label>
                <input id="profile-vscode" type="text" value={form.vsCodeProfile} onChange={setF('vsCodeProfile')} className="field" placeholder="profile name or email" />
              </div>

              <div>
                <label htmlFor="profile-tool" className="field-label">Default AI Tool</label>
                <select
                  id="profile-tool"
                  value={form.defaultLlmTool}
                  onChange={setF('defaultLlmTool')}
                  className="field"
                >
                  <option value="">None / not set</option>
                  {LLM_TOOLS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <button type="submit" disabled={profileBusy} className="btn-primary py-2 px-5 text-sm">
                {profileBusy ? 'Saving…' : 'Save Profile'}
              </button>
            </form>
          </div>
        </section>

        {/* ── Password section ── */}
        <section aria-labelledby="password-heading" className={sectionCls}>
          <h2 id="password-heading" className={sectionHeadCls}>Change Password</h2>

          <div className="p-5">
            {pwMsg && <p role="status" className="text-status-success text-sm mb-3">{pwMsg}</p>}
            {pwErr && <p role="alert" className="text-type-urgent text-sm mb-3">{pwErr}</p>}

            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label htmlFor="pw-current" className="field-label">Current Password</label>
                <input id="pw-current" type="password" autoComplete="current-password" value={pwForm.currentPassword} onChange={setPw('currentPassword')} required className="field" placeholder="••••••••" />
              </div>
              <div>
                <label htmlFor="pw-new" className="field-label">New Password</label>
                <input id="pw-new" type="password" autoComplete="new-password" value={pwForm.password} onChange={setPw('password')} required className="field" placeholder="Min. 8 characters" />
              </div>
              <div>
                <label htmlFor="pw-confirm" className="field-label">Confirm New Password</label>
                <input id="pw-confirm" type="password" autoComplete="new-password" value={pwForm.confirm} onChange={setPw('confirm')} required className="field" placeholder="••••••••" />
              </div>
              <button type="submit" disabled={pwBusy} className="btn-secondary py-2 px-5 text-sm">
                {pwBusy ? 'Changing…' : 'Change Password'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
