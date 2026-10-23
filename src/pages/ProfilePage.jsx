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

  const inputCls = 'w-full bg-[#1e1f22] border border-[#3c3f41] rounded px-3 py-2 text-[#dfe1e5] text-sm placeholder-[#5a5d6b] focus:outline-none focus:border-[#4c9ee8] transition-colors';
  const labelCls = 'block text-[#8c8fa3] text-xs font-medium mb-1 uppercase tracking-wider';

  return (
    <div className="min-h-screen bg-[#1e1f22] text-[#dfe1e5]">
      {/* Header */}
      <header className="border-b border-[#3c3f41] bg-[#25272b] px-6 py-3 flex items-center gap-4">
        <button onClick={onBack} className="text-[#8c8fa3] hover:text-[#dfe1e5] text-sm flex items-center gap-1 transition-colors">
          ← Back
        </button>
        <div className="text-[#dfe1e5] font-semibold">Profile Settings</div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Avatar + name header */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-full bg-[#4c9ee8]/20 border-2 border-[#4c9ee8]/40 flex items-center justify-center">
            <span className="text-[#4c9ee8] text-2xl font-bold">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </span>
          </div>
          <div>
            <div className="text-xl font-bold text-white">{user?.name}</div>
            <div className="text-[#8c8fa3] text-sm">{user?.email}</div>
          </div>
        </div>

        {/* ── Profile section ── */}
        <div className="bg-[#2b2d30] border border-[#3c3f41] rounded-lg p-6">
          <h2 className="text-[#dfe1e5] font-semibold text-base mb-4">Profile Details</h2>

          {profileMsg && <p className="text-[#22c55e] text-sm mb-3">{profileMsg}</p>}
          {profileErr && <p className="text-[#ef4444] text-sm mb-3">{profileErr}</p>}

          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className={labelCls}>Full Name</label>
              <input type="text" value={form.name} onChange={setF('name')} required className={inputCls} placeholder="Alex Reed" />
            </div>

            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={user?.email ?? ''} readOnly disabled
                className={`${inputCls} opacity-50 cursor-not-allowed`} />
              <p className="text-[#5a5d6b] text-xs mt-1">Email cannot be changed after registration.</p>
            </div>

            <div>
              <label className={labelCls}>GitHub Handle</label>
              <input type="text" value={form.githubHandle} onChange={setF('githubHandle')} className={inputCls} placeholder="@your-handle" />
            </div>

            <div>
              <label className={labelCls}>VS Code / Cursor Profile</label>
              <input type="text" value={form.vsCodeProfile} onChange={setF('vsCodeProfile')} className={inputCls} placeholder="profile name or email" />
            </div>

            <div>
              <label className={labelCls}>Default AI Tool</label>
              <select
                value={form.defaultLlmTool}
                onChange={setF('defaultLlmTool')}
                className={inputCls}
                style={{ color: form.defaultLlmTool ? '#dfe1e5' : '#5a5d6b' }}
              >
                <option value="" style={{ background: '#1e1f22', color: '#5a5d6b' }}>None / not set</option>
                {LLM_TOOLS.map(t => (
                  <option key={t} value={t} style={{ background: '#1e1f22', color: '#dfe1e5' }}>{t}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={profileBusy}
              className="bg-[#4c9ee8] hover:bg-[#5aadff] disabled:opacity-50 text-white font-semibold py-2 px-5 rounded text-sm transition-colors"
            >
              {profileBusy ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* ── Password section ── */}
        <div className="bg-[#2b2d30] border border-[#3c3f41] rounded-lg p-6">
          <h2 className="text-[#dfe1e5] font-semibold text-base mb-4">Change Password</h2>

          {pwMsg && <p className="text-[#22c55e] text-sm mb-3">{pwMsg}</p>}
          {pwErr && <p className="text-[#ef4444] text-sm mb-3">{pwErr}</p>}

          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className={labelCls}>Current Password</label>
              <input type="password" value={pwForm.currentPassword} onChange={setPw('currentPassword')} required className={inputCls} placeholder="••••••••" />
            </div>
            <div>
              <label className={labelCls}>New Password</label>
              <input type="password" value={pwForm.password} onChange={setPw('password')} required className={inputCls} placeholder="Min. 8 characters" />
            </div>
            <div>
              <label className={labelCls}>Confirm New Password</label>
              <input type="password" value={pwForm.confirm} onChange={setPw('confirm')} required className={inputCls} placeholder="••••••••" />
            </div>
            <button
              type="submit"
              disabled={pwBusy}
              className="bg-[#3c3f41] hover:bg-[#4c4f52] disabled:opacity-50 text-[#dfe1e5] font-semibold py-2 px-5 rounded text-sm transition-colors"
            >
              {pwBusy ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
