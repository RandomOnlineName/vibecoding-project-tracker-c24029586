import { useState, useEffect, useRef } from 'react';

const DELIVERABLE_ICONS = {
  presentation: (
    <svg className="w-4 h-4 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  ),
  demo: (
    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  report: (
    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  documentation: (
    <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  deployment: (
    <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

const STATUS_CONFIG = {
  'completed': {
    label: 'Completed',
    pill: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  'in-progress': {
    label: 'In Progress',
    pill: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  'not-started': {
    label: 'Not Started',
    pill: 'bg-slate-700/40 text-slate-400 border-slate-600/40',
    dot: 'bg-slate-500',
  },
};

export default function DeliverablesPinnedBoard({
  token,
  teamId,
  teamName,
  isCreator: isCreatorProp,
  isOpen,
  onToggle,
  onStatsChange,
}) {
  const [deliverables, setDeliverables] = useState([]);
  const [canEditServer, setCanEditServer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Active item in edit mode
  const [editingId, setEditingId] = useState(null);
  const [draftUrl, setDraftUrl] = useState('');
  const [draftStatus, setDraftStatus] = useState('not-started');
  const [draftLabel, setDraftLabel] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [saveSuccessId, setSaveSuccessId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Store ref to onStatsChange to prevent infinite dependency loops
  const onStatsChangeRef = useRef(onStatsChange);
  useEffect(() => {
    onStatsChangeRef.current = onStatsChange;
  }, [onStatsChange]);

  // Fetch deliverables once when teamId or token changes (no render loops)
  useEffect(() => {
    let isMounted = true;
    if (!token || !teamId) {
      setDeliverables([]);
      return;
    }

    const fetchDeliverables = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/teams/${teamId}/deliverables`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch deliverables');
        }
        const data = await res.json();
        if (isMounted) {
          const list = data.deliverables || [];
          setDeliverables(list);
          setCanEditServer(Boolean(data.canEdit));
          setError(null);

          if (onStatsChangeRef.current) {
            const readyCount = list.filter(d => Boolean(d.url)).length;
            const completedCount = list.filter(d => d.status === 'completed').length;
            onStatsChangeRef.current({ ready: readyCount, completed: completedCount, total: list.length });
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDeliverables();
    return () => {
      isMounted = false;
    };
  }, [token, teamId]);

  const canEdit = canEditServer || isCreatorProp;

  const startEdit = (d) => {
    setEditingId(d.id);
    setDraftUrl(d.url || '');
    setDraftStatus(d.status || 'not-started');
    setDraftLabel(d.label || '');
    setSaveSuccessId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftUrl('');
    setDraftStatus('not-started');
    setDraftLabel('');
  };

  const handleSave = async (id) => {
    if (!token || !teamId) return;
    setSavingId(id);
    try {
      const res = await fetch(`/api/teams/${teamId}/deliverables/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: draftUrl.trim(),
          status: draftStatus,
          label: draftLabel.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save deliverable link');
      }

      setDeliverables(prev => {
        const next = prev.map(d => (d.id === id ? data : d));
        if (onStatsChangeRef.current) {
          const readyCount = next.filter(d => Boolean(d.url)).length;
          const completedCount = next.filter(d => d.status === 'completed').length;
          onStatsChangeRef.current({ ready: readyCount, completed: completedCount, total: next.length });
        }
        return next;
      });

      setSaveSuccessId(id);
      setTimeout(() => setSaveSuccessId(null), 2500);
      cancelEdit();
    } catch (err) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleCopyLink = async (id, url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* fallback */
    }
  };

  const configuredCount = deliverables.filter(d => Boolean(d.url)).length;
  const completedCount = deliverables.filter(d => d.status === 'completed').length;
  const totalCount = deliverables.length || 5;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // If collapsed, show a sleek pinned summary ribbon
  if (!isOpen) {
    return (
      <div className="mb-5 bg-surface-column/80 hover:bg-surface-column border border-border-subtle rounded-xl px-4 py-2.5 transition-colors flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-2 font-semibold text-text-primary hover:text-white transition-colors"
            title="Expand Deliverables & Milestones Board"
          >
            <span className="w-2 h-2 rounded-full bg-brand-primary" />
            <span>Deliverables & Milestones</span>
            <span className="text-[10px] text-text-muted font-mono">
              ({configuredCount}/{totalCount} linked · {completedCount} completed)
            </span>
            <span className="text-text-muted hover:text-text-primary text-[10px]">▼ Expand</span>
          </button>

          {/* Quick Anchor Status Dots */}
          <div className="hidden sm:flex items-center gap-2 border-l border-border-subtle pl-3">
            {deliverables.map((d) => {
              const statusCfg = STATUS_CONFIG[d.status] || STATUS_CONFIG['not-started'];
              return (
                <span
                  key={d.id}
                  className="flex items-center gap-1 text-[11px] font-mono text-text-muted"
                  title={`${d.label}: ${d.url ? d.url : 'No link set'} (${statusCfg.label})`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${d.url ? statusCfg.dot : 'bg-slate-600'}`} />
                  <span className="capitalize">{d.id}</span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-text-muted">
            <span>{progressPercent}% Complete</span>
            <div className="w-16 h-1.5 bg-surface-card rounded-full overflow-hidden border border-border-subtle/50">
              <div
                className="h-full bg-emerald-400 transition-all rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="px-2.5 py-1 rounded-md bg-surface-card hover:bg-surface-elevated text-brand-accent hover:text-white border border-border-subtle text-[11px] font-medium transition-colors"
          >
            Show Pinned Board
          </button>
        </div>
      </div>
    );
  }

  // Expanded Pinned Board View above the Kanban board
  return (
    <div className="mb-6 bg-surface-column border border-border-subtle rounded-xl p-4 shadow-sm animate-fade-in text-text-primary">
      {/* Header bar of the Pinned Section */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-border-subtle/80">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-brand-accent">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Project Deliverables & Milestones (PRD §3.3)
              </h2>
              {canEdit ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-primary/15 text-brand-accent border border-brand-primary/30">
                  👑 Team Creator Mode
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-elevated text-text-muted border border-border-subtle">
                  🔒 Read-Only (Managed by Creator)
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              Pinned anchor board for {teamName} · presentation, demo, report, documentation, deployment
            </p>
          </div>
        </div>

        {/* Progress & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-text-muted bg-surface-card px-2.5 py-1 rounded-md border border-border-subtle">
            <span>{configuredCount}/{totalCount} linked</span>
            <span>·</span>
            <span className="text-emerald-400 font-semibold">{progressPercent}% complete</span>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-surface-elevated text-text-muted hover:text-text-primary text-xs transition-colors border border-border-subtle"
            title="Collapse Deliverables Section"
          >
            <span>▲</span>
            <span>Collapse</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-rose-500/10 border border-rose-500/30 p-2 text-xs text-rose-400">
          Error loading deliverables: {error}
        </div>
      )}

      {/* 5-Column Responsive Grid of Anchors */}
      {loading && deliverables.length === 0 ? (
        <div className="h-28 flex items-center justify-center text-xs text-text-muted font-mono">
          Loading deliverables…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {deliverables.map((d) => {
            const isEditing = editingId === d.id;
            const statusCfg = STATUS_CONFIG[d.status] || STATUS_CONFIG['not-started'];
            const icon = DELIVERABLE_ICONS[d.id] || DELIVERABLE_ICONS.report;

            return (
              <div
                key={d.id}
                className={`bg-surface-card border rounded-lg p-3 transition-all flex flex-col justify-between ${
                  isEditing
                    ? 'border-brand-primary ring-1 ring-brand-primary/40 shadow-md'
                    : 'border-border-subtle hover:border-[#4e5157]'
                }`}
              >
                <div>
                  {/* Top: Icon + Label + Status Pill */}
                  <div className="flex items-start justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-6 h-6 rounded bg-surface-elevated border border-border-subtle/80 flex items-center justify-center shrink-0">
                        {icon}
                      </div>
                      <span className="text-xs font-semibold text-text-primary truncate" title={d.label}>
                        {d.label}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${statusCfg.pill}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      <span>{statusCfg.label}</span>
                    </span>
                  </div>

                  {/* Inline Editing Form */}
                  {isEditing ? (
                    <div className="space-y-2 pt-1 border-t border-border-subtle/80 animate-fade-in text-xs">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-text-muted mb-0.5">
                          URL / Link
                        </label>
                        <input
                          type="url"
                          autoFocus
                          value={draftUrl}
                          onChange={(e) => setDraftUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-[#121316] font-mono border border-border-subtle rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-text-muted mb-0.5">
                          Status
                        </label>
                        <select
                          value={draftStatus}
                          onChange={(e) => setDraftStatus(e.target.value)}
                          className="w-full bg-[#121316] border border-border-subtle rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-brand-primary cursor-pointer"
                        >
                          <option value="not-started">Not Started</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-2 py-0.5 rounded text-[11px] text-text-muted hover:text-text-primary border border-border-subtle"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSave(d.id)}
                          disabled={savingId === d.id}
                          className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm disabled:opacity-50 transition-colors"
                        >
                          {savingId === d.id ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display View */
                    <div className="space-y-2 pt-1">
                      {d.url ? (
                        <div className="bg-[#121316] border border-border-subtle/80 rounded p-1.5 flex items-center justify-between text-xs">
                          <span className="font-mono text-[11px] text-text-muted truncate max-w-[110px]" title={d.url}>
                            {d.url.replace(/^https?:\/\//, '')}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopyLink(d.id, d.url)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
                              title="Copy URL to clipboard"
                            >
                              {copiedId === d.id ? 'Copied' : 'Copy'}
                            </button>
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium text-brand-accent hover:text-white bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 transition-colors inline-flex items-center gap-0.5"
                            >
                              <span>Open</span>
                              <span>↗</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-border-subtle/70 rounded p-1.5 text-center text-[11px] text-text-muted">
                          {canEdit ? 'No URL linked' : 'Pending link'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Edit Affordance (Only for Team Creator) */}
                {!isEditing && (
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-border-subtle/60 text-[11px]">
                    <span className="text-[10px] font-mono text-text-muted uppercase">
                      {d.id}
                    </span>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => startEdit(d)}
                        className="text-brand-accent hover:text-white transition-colors font-medium hover:underline flex items-center gap-1"
                      >
                        {saveSuccessId === d.id ? (
                          <span className="text-emerald-400">✓ Saved</span>
                        ) : (
                          <span>{d.url ? 'Edit' : '+ Set Link'}</span>
                        )}
                      </button>
                    ) : (
                      <span className="text-[10px] text-text-muted/60 italic">Read-only</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
