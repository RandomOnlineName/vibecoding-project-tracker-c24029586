/**
 * TeamDashboard — view your teams, create teams, invite members,
 * and see the members of the active team.
 */
import { useState } from 'react';
import Wordmark from '../components/Wordmark.jsx';

function MemberRow({ member, isCurrentUser }) {
  return (
    <tr className="hover:bg-surface-elevated transition-colors">
      <th scope="row" className="px-4 py-2.5 text-left font-normal">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <span aria-hidden="true" className="w-7 h-7 bg-brand-primary text-white flex items-center justify-center shrink-0 text-xs font-bold">
            {member.name.charAt(0).toUpperCase()}
          </span>
          <span className="text-text-primary text-sm font-semibold truncate">{member.name}</span>
          {isCurrentUser && (
            <span className="tag text-brand-accent border-brand-accent/70">You</span>
          )}
        </div>
      </th>
      <td className="px-4 py-2.5 text-text-muted text-xs truncate max-w-[14rem]">{member.email}</td>
      <td className="px-4 py-2.5">
        {member.role === 'owner' ? (
          <span className="tag text-status-warning border-status-warning/70">Owner</span>
        ) : (
          <span className="text-text-muted text-xs capitalize">{member.role || 'Member'}</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        {member.githubHandle && (
          <a
            href={`https://github.com/${member.githubHandle.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="link text-xs"
          >
            GitHub<span aria-hidden="true"> ↗</span>
            <span className="sr-only"> profile for {member.name} (opens in new tab)</span>
          </a>
        )}
      </td>
    </tr>
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
        const link = `${window.location.origin}${window.location.pathname}#/accept-invite?token=${result.token}`;
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
    <div className="min-h-screen bg-surface-page text-text-primary">
      <a href="#teams-main" className="skip-link">Skip to content</a>
      {/* Header */}
      <header className="border-b border-border-strong bg-surface-column px-4 sm:px-6 h-12 flex items-center gap-4">
        <Wordmark />
        <div className="flex-1" />
        <span className="text-text-muted text-sm">{user?.name}</span>
      </header>

      <div id="teams-main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Left: Teams list ── */}
        <nav aria-labelledby="teams-heading" className="md:col-span-1">
          <div className="flex items-center justify-between pb-2 border-b border-border-strong">
            <h2 id="teams-heading" className="text-text-muted text-xs font-bold uppercase tracking-wider">Your Teams</h2>
            <button
              type="button"
              aria-expanded={creating}
              aria-controls="create-team-form"
              onClick={() => setCreating(c => !c)}
              className="link text-xs font-semibold no-underline hover:underline"
            >
              {creating ? 'Cancel' : '+ New Team'}
            </button>
          </div>

          {/* Create team form */}
          {creating && (
            <form id="create-team-form" onSubmit={handleCreate} className="bg-surface-column border-b border-border-subtle p-3 space-y-2">
              {createErr && (
                <p role="alert" className="text-type-urgent text-xs">{createErr}</p>
              )}
              <label htmlFor="new-team-name" className="sr-only">Team name</label>
              <input
                id="new-team-name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Team name"
                required
                autoFocus
                className="field py-1.5"
              />
              <label htmlFor="new-team-desc" className="sr-only">Description (optional)</label>
              <input
                id="new-team-desc"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                className="field py-1.5"
              />
              <button type="submit" disabled={createBusy} className="btn-primary w-full py-1.5 text-sm">
                {createBusy ? 'Creating…' : 'Create'}
              </button>
            </form>
          )}

          {/* Teams list */}
          {teams.length === 0 && !creating && (
            <p className="text-text-muted text-sm py-4">
              No teams yet.
              <button type="button" onClick={() => setCreating(true)} className="link ml-1">
                Create one
              </button>
            </p>
          )}
          <ul className="divide-y divide-border-subtle">
            {teams.map(team => {
              const active = activeTeam?.id === team.id;
              return (
                <li key={team.id}>
                  <button
                    type="button"
                    aria-current={active ? 'true' : undefined}
                    onClick={() => onSelectTeam(team.id)}
                    className={`w-full text-left px-3 py-2.5 border-l-4 transition-colors ${
                      active
                        ? 'bg-surface-column border-l-brand-accent text-text-primary'
                        : 'border-l-transparent text-text-muted hover:bg-surface-column hover:text-text-primary'
                    }`}
                  >
                    <span className="block font-semibold text-sm">{team.name}</span>
                    {team.role === 'owner' && (
                      <span className="block text-[11px] text-status-warning mt-0.5">Owner</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── Right: Active team detail ── */}
        <main className="md:col-span-2">
          {!activeTeam ? (
            <p className="border border-dashed border-border-strong p-8 text-center text-text-muted">
              Select or create a team to get started.
            </p>
          ) : (
            <div className="space-y-6">
              {/* Team header + Go to board */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-border-strong">
                <div>
                  <h1 className="text-xl font-bold text-text-primary">{activeTeam.name}</h1>
                  {activeTeam.description && (
                    <p className="text-text-muted text-sm mt-1">{activeTeam.description}</p>
                  )}
                  <p className="text-text-muted text-xs mt-2 font-mono">
                    {teamDetail?.members?.length ?? '?'} member{(teamDetail?.members?.length ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                <button type="button" onClick={onGoToBoard} className="btn-primary px-4 py-2 text-sm">
                  Open Board <span aria-hidden="true">→</span>
                </button>
              </div>

              {/* Members */}
              <section aria-labelledby="members-heading" className="border border-border-subtle">
                <h2 id="members-heading" className="px-4 py-2.5 bg-surface-column border-b border-border-strong text-text-primary text-xs font-bold uppercase tracking-wider">
                  Members
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sr-only">
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Email</th>
                        <th scope="col">Role</th>
                        <th scope="col">Links</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {(teamDetail?.members ?? []).map(m => (
                        <MemberRow key={m.id} member={m} isCurrentUser={m.id === user?.id} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Invite */}
              <section aria-labelledby="invite-heading" className="border border-border-subtle">
                <h2 id="invite-heading" className="px-4 py-2.5 bg-surface-column border-b border-border-strong text-text-primary text-xs font-bold uppercase tracking-wider">
                  Invite a Member
                </h2>

                <div className="p-4">
                  {inviteErr && (
                    <p role="alert" className="mb-3 px-3 py-2 bg-type-urgent/10 border-l-4 border-type-urgent text-type-urgent text-sm">
                      {inviteErr}
                    </p>
                  )}

                  {inviteResult && (
                    <div role="status" className="mb-3 px-3 py-2 bg-status-success/10 border-l-4 border-status-success text-sm">
                      <p className="text-status-success mb-1">{inviteResult.message}</p>
                      {inviteResult.link && (
                        <div className="flex items-center gap-2 mt-2">
                          <code className="bg-surface-code border border-border-subtle text-text-primary text-xs px-2 py-1 flex-1 truncate block">
                            {inviteResult.link}
                          </code>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(inviteResult.link); }}
                            className="btn-secondary py-1 shrink-0"
                          >
                            Copy
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleInvite} className="flex gap-2">
                    <label htmlFor="invite-email" className="sr-only">Teammate email</label>
                    <input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="teammate@example.com"
                      required
                      aria-describedby="invite-hint"
                      className="field flex-1"
                    />
                    <button type="submit" disabled={inviteBusy} className="btn-secondary px-4 text-sm">
                      {inviteBusy ? '…' : 'Invite'}
                    </button>
                  </form>
                  <p id="invite-hint" className="text-text-muted text-xs mt-2">
                    If they already have an account, they'll be added immediately. Otherwise, share the invite link.
                  </p>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
