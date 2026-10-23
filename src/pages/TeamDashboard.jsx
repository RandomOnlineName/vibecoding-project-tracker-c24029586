/**
 * TeamDashboard — view your teams, create teams, invite members,
 * and see the members of the active team.
 */
import { useState } from 'react';

function MemberRow({ member, isCurrentUser }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded hover:bg-[#1e1f22]/50 transition-colors">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-[#4c9ee8]/20 border border-[#4c9ee8]/30 flex items-center justify-center flex-shrink-0">
        <span className="text-[#4c9ee8] text-xs font-bold">
          {member.name.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[#dfe1e5] text-sm font-medium truncate">{member.name}</span>
          {isCurrentUser && (
            <span className="text-[10px] bg-[#4c9ee8]/15 text-[#4c9ee8] px-1.5 py-0.5 rounded font-medium">
              You
            </span>
          )}
          {member.role === 'owner' && (
            <span className="text-[10px] bg-[#f59e0b]/15 text-[#f59e0b] px-1.5 py-0.5 rounded font-medium">
              Owner
            </span>
          )}
        </div>
        <div className="text-[#8c8fa3] text-xs truncate">{member.email}</div>
      </div>

      {member.githubHandle && (
        <a
          href={`https://github.com/${member.githubHandle.replace('@', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#8c8fa3] hover:text-[#dfe1e5] text-xs shrink-0"
          title="GitHub"
        >
          GitHub ↗
        </a>
      )}
    </div>
  );
}

export default function TeamDashboard({ user, teams, activeTeam, teamDetail, onSelectTeam, onCreate, onInvite, onGoToBoard }) {
  const [creating, setCreating]   = useState(false);
  const [newName, setNewName]     = useState('');
  const [newDesc, setNewDesc]     = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState('');

  const [inviteEmail, setInviteEmail]     = useState('');
  const [inviteBusy, setInviteBusy]       = useState(false);
  const [inviteResult, setInviteResult]   = useState(null); // { link, message } | null
  const [inviteErr, setInviteErr]         = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreateBusy(true);
    setCreateErr('');
    try {
      await onCreate(newName.trim(), newDesc.trim());
      setCreating(false);
      setNewName('');
      setNewDesc('');
    } catch (err) {
      setCreateErr(err.message);
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeTeam) return;
    setInviteBusy(true);
    setInviteErr('');
    setInviteResult(null);
    try {
      const result = await onInvite(activeTeam.id, inviteEmail.trim());
      if (result.added) {
        setInviteResult({ message: `${inviteEmail} was added to the team directly (they already have an account).` });
      } else {
        // Build invite link for the frontend
        const link = `${window.location.origin}${window.location.pathname}#/accept-invite?token=${result.inviteToken}`;
        setInviteResult({ link, message: `Invite created! Share this link with ${inviteEmail}:` });
      }
      setInviteEmail('');
    } catch (err) {
      setInviteErr(err.message);
    } finally {
      setInviteBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1e1f22] text-[#dfe1e5]">
      {/* Header */}
      <header className="border-b border-[#3c3f41] bg-[#25272b] px-6 py-3 flex items-center gap-4">
        <div className="text-lg font-bold text-white tracking-tight">⚡ VibeCoder</div>
        <div className="flex-1" />
        <span className="text-[#8c8fa3] text-sm">{user?.name}</span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Left: Teams list ── */}
        <div className="md:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[#8c8fa3] text-xs font-semibold uppercase tracking-wider">Your Teams</h2>
            <button
              onClick={() => setCreating(c => !c)}
              className="text-[#4c9ee8] hover:text-[#5aadff] text-xs font-medium"
            >
              {creating ? 'Cancel' : '+ New Team'}
            </button>
          </div>

          {/* Create team form */}
          {creating && (
            <div className="bg-[#2b2d30] border border-[#3c3f41] rounded-lg p-4 mb-3">
              {createErr && (
                <p className="text-[#ef4444] text-xs mb-2">{createErr}</p>
              )}
              <form onSubmit={handleCreate} className="space-y-2">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Team name"
                  required
                  autoFocus
                  className="w-full bg-[#1e1f22] border border-[#3c3f41] rounded px-3 py-1.5 text-sm text-[#dfe1e5] placeholder-[#5a5d6b] focus:outline-none focus:border-[#4c9ee8]"
                />
                <input
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full bg-[#1e1f22] border border-[#3c3f41] rounded px-3 py-1.5 text-sm text-[#dfe1e5] placeholder-[#5a5d6b] focus:outline-none focus:border-[#4c9ee8]"
                />
                <button
                  type="submit"
                  disabled={createBusy}
                  className="w-full bg-[#4c9ee8] hover:bg-[#5aadff] disabled:opacity-50 text-white py-1.5 rounded text-sm font-semibold transition-colors"
                >
                  {createBusy ? 'Creating…' : 'Create'}
                </button>
              </form>
            </div>
          )}

          {/* Teams list */}
          <div className="space-y-1">
            {teams.length === 0 && !creating && (
              <p className="text-[#8c8fa3] text-sm py-4 text-center">
                No teams yet.
                <button onClick={() => setCreating(true)} className="text-[#4c9ee8] hover:underline ml-1">
                  Create one
                </button>
              </p>
            )}
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => onSelectTeam(team.id)}
                className={`w-full text-left px-3 py-2.5 rounded transition-colors border ${
                  activeTeam?.id === team.id
                    ? 'bg-[#2b2d30] border-[#4c9ee8]/50 text-[#dfe1e5]'
                    : 'bg-transparent border-transparent text-[#8c8fa3] hover:bg-[#2b2d30] hover:text-[#dfe1e5]'
                }`}
              >
                <div className="font-medium text-sm">{team.name}</div>
                {team.role === 'owner' && (
                  <div className="text-[10px] text-[#f59e0b] mt-0.5">Owner</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right: Active team detail ── */}
        <div className="md:col-span-2">
          {!activeTeam ? (
            <div className="bg-[#2b2d30] border border-[#3c3f41] rounded-lg p-8 text-center">
              <p className="text-[#8c8fa3]">Select or create a team to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Team header + Go to board */}
              <div className="bg-[#2b2d30] border border-[#3c3f41] rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-white">{activeTeam.name}</h1>
                    {activeTeam.description && (
                      <p className="text-[#8c8fa3] text-sm mt-1">{activeTeam.description}</p>
                    )}
                    <p className="text-[#5a5d6b] text-xs mt-2">
                      {teamDetail?.members?.length ?? '?'} member{(teamDetail?.members?.length ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={onGoToBoard}
                    className="bg-[#4c9ee8] hover:bg-[#5aadff] text-white px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    Open Board →
                  </button>
                </div>
              </div>

              {/* Members */}
              <div className="bg-[#2b2d30] border border-[#3c3f41] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-[#3c3f41]">
                  <h3 className="text-[#dfe1e5] font-semibold text-sm">Members</h3>
                </div>
                <div className="divide-y divide-[#3c3f41]/50 px-1 py-1">
                  {(teamDetail?.members ?? []).map(m => (
                    <MemberRow key={m.id} member={m} isCurrentUser={m.id === user?.id} />
                  ))}
                </div>
              </div>

              {/* Invite */}
              <div className="bg-[#2b2d30] border border-[#3c3f41] rounded-lg p-5">
                <h3 className="text-[#dfe1e5] font-semibold text-sm mb-3">Invite a Member</h3>

                {inviteErr && (
                  <div className="mb-3 px-3 py-2 bg-[#3c1a1a] border border-[#ef4444]/40 rounded text-[#ef4444] text-sm">
                    {inviteErr}
                  </div>
                )}

                {inviteResult && (
                  <div className="mb-3 px-3 py-2 bg-[#1a3c1a] border border-[#22c55e]/40 rounded text-sm">
                    <p className="text-[#22c55e] mb-1">{inviteResult.message}</p>
                    {inviteResult.link && (
                      <div className="flex items-center gap-2 mt-2">
                        <code className="bg-[#1e1f22] text-[#a8b1c2] text-xs px-2 py-1 rounded flex-1 truncate block">
                          {inviteResult.link}
                        </code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(inviteResult.link); }}
                          className="text-[#4c9ee8] hover:text-[#5aadff] text-xs shrink-0 font-medium"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleInvite} className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    required
                    className="flex-1 bg-[#1e1f22] border border-[#3c3f41] rounded px-3 py-2 text-sm text-[#dfe1e5] placeholder-[#5a5d6b] focus:outline-none focus:border-[#4c9ee8]"
                  />
                  <button
                    type="submit"
                    disabled={inviteBusy}
                    className="bg-[#3c3f41] hover:bg-[#4c4f52] disabled:opacity-50 text-[#dfe1e5] px-4 py-2 rounded text-sm font-semibold transition-colors"
                  >
                    {inviteBusy ? '…' : 'Invite'}
                  </button>
                </form>
                <p className="text-[#5a5d6b] text-xs mt-2">
                  If they already have an account, they'll be added immediately. Otherwise, share the invite link.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
