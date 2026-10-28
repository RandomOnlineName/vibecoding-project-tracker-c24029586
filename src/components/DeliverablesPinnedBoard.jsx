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
    pill: 'bg-status-success/10 text-status-success border-status-success/70',
    dot: 'bg-status-success',
  },
  'in-progress': {
    label: 'In Progress',
    pill: 'bg-status-warning/10 text-status-warning border-status-warning/70',
    dot: 'bg-status-warning',
  },
  'not-started': {
    label: 'Not Started',
    pill: 'text-text-muted border-border-strong',
    dot: 'bg-slate-400',
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

  // Owner-only: the API decides, and the UI must agree the user created the team
  const canEdit = canEditServer && isCreatorProp;

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

  // If collapsed, show a single ruled summary strip
  if (!isOpen) {
    return (
      <section
        id="deliverables-board"
        aria-label="Deliverables & Milestones (collapsed)"
        className="mb-4 bg-surface-column border border-border-subtle border-l-4 border-l-brand-accent px-3 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="font-bold uppercase tracking-wider text-text-primary">Deliverables & Milestones</h2>
          <span className="text-[11px] text-text-muted font-mono">
            {configuredCount}/{totalCount} linked · {completedCount} completed
          </span>

          {/* Quick anchor status swatches */}
          <ul aria-label="Deliverable status" className="hidden sm:flex items-center gap-3 border-l border-border-subtle pl-3">
            {deliverables.map((d) => {
              const statusCfg = STATUS_CONFIG[d.status] || STATUS_CONFIG['not-started'];
              return (
                <li
                  key={d.id}
                  className="flex items-center gap-1 text-[11px] font-mono text-text-muted"
                  title={`${d.label}: ${d.url ? d.url : 'No link set'} (${statusCfg.label})`}
                >
                  <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${d.url ? statusCfg.dot : 'bg-slate-600'}`} />
                  <span className="capitalize">{d.id}</span>
                  <span className="sr-only">: {d.url ? statusCfg.label : 'No link set'}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-text-muted">
            <span>{progressPercent}% complete</span>
            <div
              role="progressbar"
              aria-label="Deliverables completed"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-16 h-1.5 rounded-full overflow-hidden bg-surface-card border border-border-strong"
            >
              <div className="h-full rounded-full bg-status-success transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <button type="button" onClick={onToggle} aria-expanded={false} className="btn-secondary py-1">
            Show Pinned Board
          </button>
        </div>
      </section>
    );
  }

  // Expanded pinned board: header row + 5 ruled cells
  return (
    <section
      id="deliverables-board"
      aria-labelledby="deliverables-heading"
      className="mb-4 bg-surface-column border border-border-subtle border-t-2 border-t-brand-accent animate-fade-in text-text-primary"
    >
      {/* Header row */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 border-b border-border-strong">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="deliverables-heading" className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Project Deliverables & Milestones (PRD §3.3)
            </h2>
            {canEdit ? (
              <span className="tag text-brand-accent border-brand-accent/70">Team Creator Mode</span>
            ) : (
              <span className="tag text-text-muted border-border-strong">Read-Only · Managed by Creator</span>
            )}
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">
            Pinned anchor board for {teamName} · presentation, demo, report, documentation, deployment
          </p>
        </div>

        {/* Progress & Actions */}
        <div className="flex items-center gap-3">
          <p className="text-xs font-mono text-text-muted">
            {configuredCount}/{totalCount} linked · <span className="text-status-success font-semibold">{progressPercent}% complete</span>
          </p>

          <button
            type="button"
            onClick={onToggle}
            aria-expanded={true}
            className="btn-secondary py-1"
            title="Collapse Deliverables Section"
          >
            <span aria-hidden="true">▲</span>
            <span>Collapse</span>
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="px-3 py-2 border-b border-border-subtle bg-type-urgent/10 text-xs text-type-urgent">
          Error loading deliverables: {error}
        </p>
      )}

      {/* 5 ruled cells: 1px gaps over the border colour draw the dividers */}
      {loading && deliverables.length === 0 ? (
        <p role="status" className="h-28 flex items-center justify-center text-xs text-text-muted font-mono">
          Loading deliverables…
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-border-subtle">
          {deliverables.map((d) => {
            const isEditing = editingId === d.id;
            const statusCfg = STATUS_CONFIG[d.status] || STATUS_CONFIG['not-started'];
            const icon = DELIVERABLE_ICONS[d.id] || DELIVERABLE_ICONS.report;
            const urlId = `deliverable-url-${d.id}`;
            const statusId = `deliverable-status-${d.id}`;

            return (
              <li
                key={d.id}
                className={`p-3 flex flex-col justify-between transition-colors ${
                  isEditing ? 'bg-surface-card ring-2 ring-inset ring-brand-accent' : 'bg-surface-page'
                }`}
              >
                <div>
                  {/* Top: Icon + Label + Status Tag */}
                  <div className="flex items-start justify-between gap-1.5 mb-2">
                    <h3 className="flex items-center gap-1.5 min-w-0 text-xs font-semibold text-text-primary">
                      <span aria-hidden="true" className="shrink-0">{icon}</span>
                      <span className="truncate" title={d.label}>{d.label}</span>
                    </h3>

                    <span className={`tag shrink-0 text-[10px] ${statusCfg.pill}`}>
                      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      <span>{statusCfg.label}</span>
                    </span>
                  </div>

                  {/* Inline Editing Form */}
                  {isEditing ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleSave(d.id); }}
                      className="space-y-2 pt-2 border-t border-border-subtle animate-fade-in text-xs"
                    >
                      <div>
                        <label htmlFor={urlId} className="field-label text-[10px] mb-0.5">
                          URL / Link
                        </label>
                        <input
                          id={urlId}
                          type="url"
                          autoFocus
                          value={draftUrl}
                          onChange={(e) => setDraftUrl(e.target.value)}
                          placeholder="https://..."
                          className="field bg-surface-code font-mono px-2 py-1 text-xs"
                        />
                      </div>

                      <div>
                        <label htmlFor={statusId} className="field-label text-[10px] mb-0.5">
                          Status
                        </label>
                        <select
                          id={statusId}
                          value={draftStatus}
                          onChange={(e) => setDraftStatus(e.target.value)}
                          className="field bg-surface-code px-2 py-1 text-xs cursor-pointer"
                        >
                          <option value="not-started">Not Started</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button type="button" onClick={cancelEdit} className="btn-secondary px-2 py-0.5 text-[11px]">
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingId === d.id}
                          className="btn-primary px-3 py-0.5 text-[11px]"
                        >
                          {savingId === d.id ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Display View */
                    <div className="pt-1">
                      {d.url ? (
                        <div className="bg-surface-code border border-border-subtle px-1.5 py-1 flex items-center justify-between gap-1 text-xs">
                          <span className="font-mono text-[11px] text-text-muted truncate min-w-0" title={d.url}>
                            {d.url.replace(/^https?:\/\//, '')}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopyLink(d.id, d.url)}
                              className="btn-ghost px-1.5 py-0.5 text-[10px] font-mono"
                              aria-label={copiedId === d.id ? `${d.label} URL copied` : `Copy ${d.label} URL`}
                            >
                              {copiedId === d.id ? 'Copied' : 'Copy'}
                            </button>
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn px-1.5 py-0.5 text-[10px] text-brand-accent border-brand-accent/70 hover:bg-brand-accent/10"
                            >
                              <span>Open</span>
                              <span aria-hidden="true">↗</span>
                              <span className="sr-only">{d.label} (opens in new tab)</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <p className="border border-dashed border-border-strong px-1.5 py-1 text-[11px] text-text-muted">
                          {canEdit ? 'No URL linked' : 'Pending link'}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Edit Affordance (Only for Team Creator) */}
                {!isEditing && (
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-border-subtle text-[11px]">
                    <span className="text-[10px] font-mono text-text-muted uppercase">
                      {d.id}
                    </span>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => startEdit(d)}
                        className="link font-semibold no-underline hover:underline"
                        aria-label={saveSuccessId === d.id ? `${d.label} saved` : `${d.url ? 'Edit' : 'Set'} ${d.label} link`}
                      >
                        {saveSuccessId === d.id ? (
                          <span className="text-status-success">✓ Saved</span>
                        ) : (
                          <span>{d.url ? 'Edit' : '+ Set Link'}</span>
                        )}
                      </button>
                    ) : (
                      <span className="text-[10px] text-text-muted italic">Read-only</span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
