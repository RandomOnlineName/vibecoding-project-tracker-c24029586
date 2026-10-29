import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { useTeams } from './hooks/useTeams.js';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import TeamDashboard from './pages/TeamDashboard.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

import DeliverablesPinnedBoard from './components/DeliverablesPinnedBoard.jsx';
import Wordmark from './components/Wordmark.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import MarkdownPreview, { EditorModeToggle } from './components/MarkdownPreview.jsx';
import { CONTEXT_TEMPLATE, cleanContext, isContextEmpty, buildModelPrompt } from './services/promptFormat.js';

/**
 * Vibecoding Project Tracker
 *
 * Full Authentication, Teams, & Kanban Board Integration:
 *   - Implements Section 2.3 Task Significance & Urgency Color Scale (Timeline)
 *   - JWT Authentication & Team Scoping
 *   - Hash-based Routing (#/login, #/register, #/teams, #/board, #/profile)
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {'feature'|'bug'|'urgent'|'additional'} type
 * @property {'todo'|'in-progress'|'review'|'done'} status
 * @property {string} assignee
 * @property {string|null} dueDate     ISO 'YYYY-MM-DD'
 * @property {string} createdDate      ISO 'YYYY-MM-DD'
 * @property {string} [context]
 * @property {string|null} [contextTool]
 * @property {string|null} [contextUpdatedAt]
 * @property {string} [promptHistory]
 */

// The four columns of the board, in render order.
export const STAGES = [
  { id: 'todo',        label: 'To Do',       color: 'bg-slate-400' },
  { id: 'in-progress', label: 'In Progress', color: 'bg-brand-accent' },
  { id: 'review',      label: 'Review',      color: 'bg-status-warning' },
  { id: 'done',        label: 'Done',        color: 'bg-status-success' },
];

export const AI_TOOLS = ['Claude', 'Cursor', 'ChatGPT', 'Copilot', 'Gemini', 'Other'];

// Scale 1 (DESIGN.md §2.2): warm = things to fix, cool = things being built.
// Marker shape repeats the split without colour: diamond = fix, dot = build.
const FIX_MARKER   = 'rotate-45';
const BUILD_MARKER = 'rounded-full';

export const TASK_TYPES = {
  urgent:     { label: 'Urgent fix', tagClass: 'text-type-urgent border-type-urgent/70 bg-type-urgent/10',             swatch: 'bg-type-urgent',     marker: FIX_MARKER },
  bug:        { label: 'Bug',        tagClass: 'text-type-bug border-type-bug/70 bg-type-bug/10',                      swatch: 'bg-type-bug',        marker: FIX_MARKER },
  feature:    { label: 'Feature',    tagClass: 'text-type-feature border-type-feature/70 bg-type-feature/10',          swatch: 'bg-type-feature',    marker: BUILD_MARKER },
  additional: { label: 'Additional', tagClass: 'text-type-additional border-type-additional/70 bg-type-additional/10', swatch: 'bg-type-additional', marker: BUILD_MARKER },
};

export function TypeTag({ type }) {
  const cfg = TASK_TYPES[type] || TASK_TYPES.feature;
  return (
    <span className={`tag ${cfg.tagClass}`}>
      <span aria-hidden="true" className={`w-1.5 h-1.5 ${cfg.marker} ${cfg.swatch}`} />
      {cfg.label}
    </span>
  );
}

/**
 * Calculates Task Significance & Urgency according to DESIGN.md §2.3:
 *   - Need Today (< 24h / overdue): Rose
 *   - Needed within 5 Days: Amber
 *   - Needed within 2 Weeks: Sky
 *   - Later (> 14d / no date): Slate
 *   - Done tasks: Slate neutral (overrides urgency)
 */
const SIGNIFICANCE_STYLES = {
  today:   { stripeClass: 'bg-significance-today',  chipClass: 'text-significance-today border-significance-today/70 bg-significance-today/10',    dotColor: 'bg-significance-today' },
  soon:    { stripeClass: 'bg-significance-soon',   chipClass: 'text-significance-soon border-significance-soon/70 bg-significance-soon/10',       dotColor: 'bg-significance-soon' },
  sprint:  { stripeClass: 'bg-significance-sprint', chipClass: 'text-significance-sprint border-significance-sprint/70 bg-significance-sprint/10', dotColor: 'bg-significance-sprint' },
  later:   { stripeClass: 'bg-slate-500',           chipClass: 'text-significance-later border-border-strong',                                        dotColor: 'bg-slate-400' },
  neutral: { stripeClass: 'bg-slate-600',           chipClass: 'text-text-muted border-border-strong',                                                dotColor: 'bg-slate-500' },
};

export function getTaskSignificance(task) {
  if (task.status === 'done') {
    return { level: 'neutral', label: 'Completed', ...SIGNIFICANCE_STYLES.neutral };
  }

  if (!task.dueDate) {
    return { level: 'later', label: 'No deadline', ...SIGNIFICANCE_STYLES.later, stripeClass: 'bg-slate-700' };
  }

  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const parts = String(task.dueDate).split('-');

  if (parts.length !== 3) {
    return { level: 'later', label: task.dueDate, ...SIGNIFICANCE_STYLES.later };
  }

  const [year, month, day] = parts.map(Number);
  const due = new Date(year, month - 1, day);
  const diffDays = Math.round((due - todayDate) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      level: 'today',
      label: diffDays < 0 ? `Overdue (${Math.abs(diffDays)}d)` : 'Need Today',
      ...SIGNIFICANCE_STYLES.today,
    };
  } else if (diffDays <= 5) {
    return {
      level: 'soon',
      label: diffDays === 1 ? 'Due Tomorrow' : `In ${diffDays} days`,
      ...SIGNIFICANCE_STYLES.soon,
    };
  } else if (diffDays <= 14) {
    return { level: 'sprint', label: `In ${diffDays} days`, ...SIGNIFICANCE_STYLES.sprint };
  } else {
    return { level: 'later', label: `In ${diffDays} days`, ...SIGNIFICANCE_STYLES.later };
  }
}

/**
 * Tasks Hook scoped to activeTeamId and authenticated with JWT token.
 */
export function useTasks(token, activeTeamId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!token || !activeTeamId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?teamId=${activeTeamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch tasks');
      }
      const data = await res.json();
      setTasks(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, activeTeamId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTask = useCallback(async (task) => {
    if (!token || !activeTeamId) return;
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...task, teamId: activeTeamId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create task');
    setTasks(prev => [...prev, data]);
    return data;
  }, [token, activeTeamId]);

  const updateTask = useCallback(async (id, patch) => {
    if (!token) return;
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update task');
    setTasks(prev => prev.map(t => t.id === id ? data : t));
    return data;
  }, [token]);

  const deleteTask = useCallback(async (id) => {
    if (!token) return;
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete task');
    setTasks(prev => prev.filter(t => t.id !== id));
  }, [token]);

  return { tasks, loading, error, refresh, addTask, updateTask, deleteTask };
}

/**
 * Display name with the member's GitHub handle in brackets, e.g. "Teammate B (@teammate-b)".
 * `handles` maps member name → handle; members without a handle show just the name.
 */
function withGithub(name, handles = {}) {
  if (!name) return name;
  const handle = String(handles[name] || '').trim().replace(/^@/, '');
  return handle ? `${name} (@${handle})` : name;
}

/**
 * Counts "### [timestamp]" entry headings in the prompt history, skipping fenced code blocks
 * so headings inside a pasted prompt aren't counted. Free text with no headings counts as one.
 */
function countHistoryEntries(history) {
  let count = 0;
  let fence = null;
  for (const line of history.split('\n')) {
    const marker = line.match(/^(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length && !line.slice(marker[1].length).trim()) fence = null;
    } else if (!fence && /^### \[/.test(line)) {
      count += 1;
    }
  }
  return count || 1;
}

/** Character count with an explicit "chars" suffix so it isn't read as a word count. */
function formatChars(n, { compact = false } = {}) {
  if (compact && n > 999) return `${(n / 1000).toFixed(n < 10000 ? 1 : 0)}k chars`;
  return `${n.toLocaleString()} chars`;
}

/**
 * Task row with Dual-Scale Color Coding (DESIGN.md §2.4):
 *   - Type Scale: rounded tag, top-left
 *   - Significance Scale: left edge rule + due-date tag
 * The title button is stretched over the row so the whole row is clickable.
 * Assignees are read-only here; handoffs happen in the task editor.
 */
export function TaskCard({ task, onClick, assigneeHandles = {} }) {
  const assigneeLabel = withGithub(task.assignee, assigneeHandles) || 'Unassigned';
  const significance = getTaskSignificance(task);

  return (
    <article className="group relative pl-4 pr-3 py-3 bg-surface-page hover:bg-surface-elevated transition-colors">
      {/* Scale 2: significance rule on the leading edge */}
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${significance.stripeClass}`} />

      <div>
        {/* Header: Type Tag (Scale 1) & Due Date Tag (Scale 2) */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <TypeTag type={task.type} />

          {task.dueDate && (
            <span className={`tag font-mono normal-case tracking-normal ${significance.chipClass}`}>
              <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${significance.dotColor}`} />
              <span className="sr-only">Due: </span>
              <time dateTime={task.dueDate} title={`Deadline: ${task.dueDate}`}>{significance.label}</time>
            </span>
          )}
        </div>

        {/* Title (stretched link-button) */}
        <h3 className="text-sm font-semibold leading-snug text-text-primary mb-1 line-clamp-2">
          <button
            type="button"
            onClick={onClick}
            className="text-left group-hover:underline underline-offset-2 after:absolute after:inset-0 after:content-['']"
          >
            {task.title}
          </button>
        </h3>

        {/* Description Preview */}
        {task.description && (
          <p className="text-xs text-text-muted line-clamp-2 mb-2 leading-relaxed whitespace-pre-line">
            {task.description}
          </p>
        )}
      </div>

      {/* Footer: Assignee & Context Indicators */}
      <div>
        <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted">
          <div className="flex items-center gap-1.5 min-w-0">
            <span aria-hidden="true" className="w-5 h-5 shrink-0 bg-surface-card border border-border-strong flex items-center justify-center text-[10px] font-semibold text-text-primary uppercase">
              {(task.assignee || 'Unassigned').slice(0, 2)}
            </span>
            <span className="truncate max-w-[180px]" title={assigneeLabel}>{assigneeLabel}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {task.context && (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-brand-accent font-medium font-mono"
                title="Has documentation / prompt context"
              >
                <svg
                  aria-hidden="true"
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                {task.contextTool || 'Context'} ({formatChars(task.context.length, { compact: true })})
              </span>
            )}

            {task.promptHistory && (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-type-additional font-medium font-mono"
                title="Has prompt history log"
              >
                <svg aria-hidden="true" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Prompts ({formatChars(task.promptHistory.length, { compact: true })})
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Kanban Column: one cell of the board table. Header row on top, tasks as ruled rows.
 */
export function KanbanColumn({ stage, tasks, onTaskClick, onAddTask, assigneeHandles }) {
  const stageTasks = tasks.filter((t) => t.status === stage.id);
  const headingId = `stage-${stage.id}`;

  return (
    <section aria-labelledby={headingId} className="bg-surface-page border border-border-subtle flex flex-col min-h-[28rem]">
      {/* Column header row */}
      <header className="flex items-center justify-between gap-2 h-10 pl-3 pr-1.5 bg-surface-column border-b border-border-strong">
        <h2 id={headingId} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-primary">
          <span aria-hidden="true" className={`w-2 h-2 rounded-full ${stage.color}`} />
          {stage.label}
          <span className="font-mono font-medium text-text-muted">
            <span className="sr-only">(</span>{stageTasks.length}<span className="sr-only"> tasks)</span>
          </span>
        </h2>
        <button
          type="button"
          onClick={() => onAddTask(stage.id)}
          aria-label={`Add task to ${stage.label}`}
          title={`Add task to ${stage.label}`}
          className="btn-ghost w-7 h-7 px-0 py-0 text-base leading-none"
        >
          +
        </button>
      </header>

      {/* Task rows */}
      {stageTasks.length > 0 ? (
        <ul className="divide-y divide-border-subtle border-b border-border-subtle">
          {stageTasks.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                onClick={() => onTaskClick && onTaskClick(task)}
                assigneeHandles={assigneeHandles}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-3 py-6 border-b border-border-subtle text-text-muted text-xs">
          <p>No tasks in this stage yet</p>
          <button
            type="button"
            onClick={() => onAddTask(stage.id)}
            className="link mt-1.5 text-xs font-semibold"
          >
            + Add Task
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Full-Page Task Editor Component
 */
/**
 * Markdown preview beside (split) or instead of (preview) an editor textarea.
 * In split on wide screens the pane is pinned to the grid cell, so it tracks the
 * textarea's (resizable) height and scrolls; on narrow screens it stacks below.
 */
function PreviewPane({ id, label, source, split, sizeClass }) {
  if (!split) {
    return <MarkdownPreview id={id} label={label} source={source} className={sizeClass} />;
  }
  return (
    <div className="relative">
      <MarkdownPreview
        id={id}
        label={label}
        source={source}
        className={`${sizeClass} lg:absolute lg:inset-0 lg:min-h-0 lg:max-h-none`}
      />
    </div>
  );
}

export function TaskEditorPage({ task, teamMembers, assigneeHandles = {}, currentUserName = '', canReassign = false, onBack, onSave, onDelete }) {
  const isEditing = Boolean(task?.id);

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    type: task?.type || 'feature',
    status: task?.status || 'todo',
    assignee: task?.id ? (task.assignee || '') : (task?.assignee || teamMembers[0] || ''),
    dueDate: task?.dueDate || '',
    context: task?.context || '',
    contextTool: task?.contextTool || 'Claude',
    promptHistory: task?.promptHistory || '',
  });

  const [activeTab, setActiveTab] = useState('both'); // 'both' | 'context' | 'history'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [copyToast, setCopyToast] = useState(false);
  const [copyHistoryToast, setCopyHistoryToast] = useState(false);
  const [copyPromptToast, setCopyPromptToast] = useState(false);
  const [quickPromptText, setQuickPromptText] = useState('');
  const [quickPromptTool, setQuickPromptTool] = useState(task?.contextTool || 'Claude');
  const [quickPromptCommit, setQuickPromptCommit] = useState('');
  const [quickPromptTokens, setQuickPromptTokens] = useState('');
  const [showQuickPromptBox, setShowQuickPromptBox] = useState(false);
  const [contextMode, setContextMode] = useState('write'); // 'write' | 'split' | 'preview'
  const [historyMode, setHistoryMode] = useState('write');

  const currentSignificance = getTaskSignificance({
    dueDate: form.dueDate,
    status: form.status,
  });

  // Keyboard shortcut: Ctrl+S / Cmd+S to save, Esc to go back
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape' && !showDeleteConfirm) {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [form, saving, showDeleteConfirm, onBack]);

  const handleSave = async () => {
    if (!form.title.trim() || saving) return;

    // An untouched template is stored as no context at all
    const context = isContextEmpty(form.context) ? '' : form.context;
    const contextChanged = context !== (task?.context || '');
    setSaving(true);
    setSaveError('');
    try {
      await onSave({
        ...form,
        context,
        title: form.title.trim(),
        dueDate: form.dueDate || null,
        contextUpdatedAt: !context
          ? null
          : contextChanged ? new Date().toISOString() : (task?.contextUpdatedAt || null),
        promptHistory: form.promptHistory || '',
      });
    } catch (e) {
      setSaveError(e.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  // Copies the resources + REASONS canvas, minus unfilled template sections
  const handleCopyContext = async () => {
    if (isContextEmpty(form.context)) return;
    try {
      await navigator.clipboard.writeText(cleanContext(form.context));
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2500);
    } catch {
      /* fallback */
    }
  };

  // Copies title, problem description and context as one model-ready prompt
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildModelPrompt(form));
      setCopyPromptToast(true);
      setTimeout(() => setCopyPromptToast(false), 2500);
    } catch {
      /* fallback */
    }
  };

  const handleInsertTemplate = () => {
    setForm(prev => ({
      ...prev,
      context: prev.context.trim() ? `${prev.context.trimEnd()}\n\n${CONTEXT_TEMPLATE}` : CONTEXT_TEMPLATE,
    }));
    if (contextMode === 'preview') setContextMode('write');
  };

  const hasTemplate = /^## Resources\b/m.test(form.context) && /REASONS/.test(form.context);

  const handleCopyPromptHistory = async () => {
    if (!form.promptHistory) return;
    try {
      await navigator.clipboard.writeText(form.promptHistory);
      setCopyHistoryToast(true);
      setTimeout(() => setCopyHistoryToast(false), 2500);
    } catch {
      /* fallback */
    }
  };

  // Optional Quick Append metadata: a git commit hash (short or full SHA-1/SHA-256) and tokens used
  const commitHash = quickPromptCommit.trim();
  const commitInvalid = commitHash !== '' && !/^[0-9a-f]{4,64}$/i.test(commitHash);
  const tokensRaw = quickPromptTokens.trim().replace(/[,\s_]/g, '');
  const tokensInvalid = tokensRaw !== '' && !/^\d+$/.test(tokensRaw);

  const handleAppendPrompt = (e) => {
    if (e) e.preventDefault();
    if (!quickPromptText.trim() || commitInvalid || tokensInvalid) return;
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const separator = form.promptHistory.trim() ? '\n\n---\n\n' : '';
    const meta = [
      commitHash && `Commit: \`${commitHash.toLowerCase()}\``,
      tokensRaw && `Tokens: ${Number(tokensRaw).toLocaleString('en-GB')}`,
    ].filter(Boolean).join(' · ');
    // Wrap the prompt in a fenced code block so pasted markdown shows literally. The fence is one
    // backtick longer than any backtick run in the prompt, so nothing inside can close it early.
    const promptText = quickPromptText.trim();
    const longestTicks = Math.max(0, ...(promptText.match(/`+/g) || []).map((run) => run.length));
    const fence = '`'.repeat(Math.max(3, longestTicks + 1));
    // Credit the person appending, e.g. "Claude · Teammate A (@teammate-a)"
    const author = withGithub(currentUserName, assigneeHandles);
    const heading = `### [${timeStr}] ${quickPromptTool}${author ? ` · ${author}` : ''}`;
    const entry = `${separator}${heading}\n${meta ? `${meta}\n\n` : ''}${fence}text\n${promptText}\n${fence}`;
    setForm(prev => ({
      ...prev,
      promptHistory: (prev.promptHistory || '') + entry,
    }));
    setQuickPromptText('');
    setQuickPromptCommit('');
    setQuickPromptTokens('');
    setShowQuickPromptBox(false);
  };

  const handleDelete = async () => {
    if (!onDelete || !task?.id) return;
    setSaveError('');
    try {
      await onDelete(task.id);
    } catch (e) {
      setSaveError(e.message || 'Failed to delete task');
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-page text-text-primary flex flex-col animate-fade-in">
      <a href="#task-title" className="skip-link">Skip to task form</a>
      {/* Top bar: breadcrumb + actions */}
      <header className="sticky top-0 z-40 bg-surface-column border-b border-border-strong px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-2 text-xs">
            <li>
              <button
                type="button"
                onClick={onBack}
                className="link font-semibold no-underline hover:underline"
                title="Return to Kanban board (Esc)"
              >
                &larr; Board
              </button>
            </li>
            <li aria-hidden="true" className="text-text-subtle">/</li>
            <li aria-current="page" className="font-mono text-text-muted truncate">
              {isEditing ? (task.id || 'Task') : 'New Task'}
            </li>
            <li><TypeTag type={form.type} /></li>
          </ol>
        </nav>

        <div className="flex items-center gap-2">
          {saveError && (
            <span role="alert" className="text-xs text-type-urgent max-w-xs truncate" title={saveError}>
              {saveError}
            </span>
          )}
          <ThemeToggle />
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="btn-secondary"
            title="Copy the task, problem description and context, formatted to paste into a model"
          >
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span aria-live="polite">{copyPromptToast ? 'Prompt context copied to clipboard' : 'Copy as Prompt Context'}</span>
          </button>
          <button type="button" onClick={onBack} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!form.title.trim() || saving}
            className="btn-primary pr-4"
          >
            <span>{saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Task'}</span>
            <kbd className="hidden sm:inline text-[10px] opacity-80 font-mono">Ctrl+S</kbd>
          </button>
        </div>
      </header>

      {/* Editor Main Content */}
      {/* Full-width page: the editor column takes all the room beside a fixed-width Properties sidebar */}
      <main className="flex-1 w-full px-4 sm:px-6 py-6 lg:py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* Main Editing Area (flexible column) */}
          <div className="space-y-6">
            {/* Title Input */}
            <div>
              <label htmlFor="task-title" className="field-label">
                Task Title <span aria-hidden="true" className="text-type-urgent">*</span>
                <span className="sr-only">(required)</span>
              </label>
              <input
                id="task-title"
                type="text"
                required
                autoFocus
                placeholder="Task title or user story..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full text-2xl lg:text-3xl font-bold bg-transparent border-0 border-b-2 border-border-strong focus:border-brand-accent focus:outline-none pb-2 text-text-primary transition-colors"
              />
            </div>

            {/* Description / Detailed Test Specifications */}
            <div>
              <label htmlFor="task-description" className="field-label flex items-center gap-2">
                <span>Description & Test Specs</span>
                <span className="text-[11px] font-normal normal-case tracking-normal font-mono">
                  ({formatChars(form.description.length)})
                </span>
              </label>
              <textarea
                id="task-description"
                rows={8}
                placeholder="Provide comprehensive task specifications, user acceptance criteria, reproduction steps, or detailed test definitions..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="field p-4 leading-relaxed resize-y"
              />
            </div>

            {/* View switcher for Context vs Prompt History (underline tabs) */}
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-strong">
              <div role="group" aria-label="Editor view" className="flex items-end text-xs -mb-px">
                {[
                  { id: 'both', label: 'Stacked View' },
                  { id: 'context', label: 'AI Context Window', swatch: 'bg-brand-accent', count: form.context.length },
                  { id: 'history', label: 'Prompt History Box', swatch: 'bg-type-additional', count: form.promptHistory.length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === tab.id
                        ? 'border-brand-accent text-text-primary'
                        : 'border-transparent text-text-muted hover:text-text-primary hover:border-border-strong'
                    }`}
                  >
                    {tab.swatch && <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${tab.swatch}`} />}
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className="text-[10px] font-mono text-text-muted">
                        ({formatChars(tab.count, { compact: true })})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <p className="text-[11px] font-mono text-text-muted hidden md:block pb-2">
                Markdown & code blocks supported
              </p>
            </div>

            {/* LLM Context Window (Briefing, Logs, Stacktraces, Documentation) */}
            {(activeTab === 'both' || activeTab === 'context') && (
              <section aria-labelledby="context-heading" className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                  <div className="flex items-center gap-2">
                    <label id="context-heading" htmlFor="task-context" className="text-xs font-bold uppercase tracking-wider text-brand-accent flex items-center gap-1.5">
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                      <span>AI Context Window (Briefing & Knowledge)</span>
                    </label>
                    <span className="tag font-mono normal-case tracking-normal font-medium text-text-muted border-border-strong">
                      {formatChars(form.context.length)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <EditorModeToggle
                      label="AI context"
                      controls="task-context-preview"
                      mode={contextMode}
                      onChange={setContextMode}
                    />
                    {!hasTemplate && (
                      <button
                        type="button"
                        onClick={handleInsertTemplate}
                        className="btn-secondary"
                        title="Add Resources and REASONS canvas (SPDD) sections"
                      >
                        <span aria-hidden="true">+</span>
                        <span>Insert SPDD Template</span>
                      </button>
                    )}
                    {!isContextEmpty(form.context) && (
                      <button
                        type="button"
                        onClick={handleCopyContext}
                        className="btn font-mono text-brand-accent border-brand-accent/70 hover:bg-brand-accent/10"
                      >
                        <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                        <span aria-live="polite">{copyToast ? 'Context copied to clipboard' : 'Copy Context'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className={contextMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 gap-3' : 'relative'}>
                  <textarea
                    id="task-context"
                    hidden={contextMode === 'preview'}
                    aria-describedby="task-context-hint"
                    rows={activeTab === 'both' ? 10 : 18}
                    placeholder={`Paste resources for the agent (logs, stack traces, files, docs) and the REASONS canvas instructions here.\n\nUse "Insert SPDD Template" for the standard structure:\n## Resources → Logs · Stack trace · Relevant files & docs\n## REASONS Canvas → Requirements · Entities · Approach · Structure · Operations · Norms · Safeguards`}
                    value={form.context}
                    onChange={(e) => setForm({ ...form, context: e.target.value })}
                    className="field bg-surface-code font-mono text-xs text-text-primary p-4 leading-relaxed resize-y selection:bg-brand-primary selection:text-white"
                  />
                  {contextMode !== 'write' && (
                    <PreviewPane
                      id="task-context-preview"
                      label="AI context"
                      source={form.context}
                      split={contextMode === 'split'}
                      sizeClass={activeTab === 'both' ? 'min-h-[13rem] max-h-[32rem]' : 'min-h-[24rem] max-h-[48rem]'}
                    />
                  )}
                </div>
                <p id="task-context-hint" className="text-[11px] text-text-muted leading-relaxed">
                  Resources plus Structured Prompt-Driven Development (REASONS canvas) instructions. Empty template sections are left out when copying. "Copy as Prompt Context" bundles this with the problem description.
                </p>
              </section>
            )}

            {/* Prompt History Box (Prompts Used while working on the problem) */}
            {(activeTab === 'both' || activeTab === 'history') && (
              <section aria-labelledby="history-heading" className={`space-y-3 ${activeTab === 'both' ? 'pt-5 border-t border-border-subtle' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                  <div className="flex items-center gap-2">
                    <label id="history-heading" htmlFor="task-history" className="text-xs font-bold uppercase tracking-wider text-type-additional flex items-center gap-1.5">
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>Prompt History Box (Prompts Used)</span>
                    </label>
                    <span className="tag font-mono normal-case tracking-normal font-medium text-text-muted border-border-strong">
                      {formatChars(form.promptHistory.length)}
                    </span>
                    {form.promptHistory && (
                      <span className="text-[11px] font-mono text-text-muted">
                        ~{countHistoryEntries(form.promptHistory)} entry/entries
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <EditorModeToggle
                      label="Prompt history"
                      controls="task-history-preview"
                      mode={historyMode}
                      onChange={setHistoryMode}
                    />
                    <button
                      type="button"
                      aria-expanded={showQuickPromptBox}
                      aria-controls="quick-append-panel"
                      onClick={() => setShowQuickPromptBox(!showQuickPromptBox)}
                      className="btn font-mono text-type-additional border-type-additional/70 hover:bg-type-additional/10"
                    >
                      <span aria-hidden="true">+</span>
                      <span>{showQuickPromptBox ? 'Close Quick Entry' : 'Quick Append'}</span>
                    </button>

                    {form.promptHistory && (
                      <button
                        type="button"
                        onClick={handleCopyPromptHistory}
                        className="btn font-mono text-type-additional border-type-additional/70 hover:bg-type-additional/10"
                      >
                        <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                        <span aria-live="polite">{copyHistoryToast ? 'Prompts copied to clipboard' : 'Copy All Prompts'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Append Panel */}
                {showQuickPromptBox && (
                  <div id="quick-append-panel" className="bg-surface-column border border-border-subtle border-l-4 border-l-type-additional p-3.5 space-y-3 animate-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                      <label htmlFor="quick-prompt-text" className="text-type-additional uppercase tracking-wider">
                        Append Prompt to History Log
                      </label>
                      <div className="flex items-center gap-2">
                        <label htmlFor="quick-prompt-tool" className="text-[11px] text-text-muted font-normal">Tool:</label>
                        <select
                          id="quick-prompt-tool"
                          value={quickPromptTool}
                          onChange={(e) => setQuickPromptTool(e.target.value)}
                          className="field w-auto px-2 py-0.5 text-xs"
                        >
                          {AI_TOOLS.map((tool) => (
                            <option key={tool} value={tool}>{tool}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <textarea
                      id="quick-prompt-text"
                      rows={3}
                      autoFocus
                      placeholder="Paste the prompt you just sent to the AI assistant..."
                      value={quickPromptText}
                      onChange={(e) => setQuickPromptText(e.target.value)}
                      className="field bg-surface-code font-mono text-xs p-2.5"
                    />

                    {/* Optional metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="quick-prompt-commit" className="field-label">
                          Git commit <span className="font-normal normal-case tracking-normal text-text-muted">(optional)</span>
                        </label>
                        <input
                          id="quick-prompt-commit"
                          type="text"
                          autoComplete="off"
                          spellCheck={false}
                          placeholder="e.g. 4f539dc"
                          value={quickPromptCommit}
                          onChange={(e) => setQuickPromptCommit(e.target.value)}
                          aria-invalid={commitInvalid}
                          aria-describedby={commitInvalid ? 'quick-prompt-commit-error' : undefined}
                          className={`field font-mono text-xs ${commitInvalid ? 'border-status-danger' : ''}`}
                        />
                        {commitInvalid && (
                          <p id="quick-prompt-commit-error" className="mt-1 text-[11px] text-status-danger">
                            Use a commit hash: 4–64 hex characters (0–9, a–f).
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="quick-prompt-tokens" className="field-label">
                          Tokens used <span className="font-normal normal-case tracking-normal text-text-muted">(optional)</span>
                        </label>
                        <input
                          id="quick-prompt-tokens"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="e.g. 12,400"
                          value={quickPromptTokens}
                          onChange={(e) => setQuickPromptTokens(e.target.value)}
                          aria-invalid={tokensInvalid}
                          aria-describedby={tokensInvalid ? 'quick-prompt-tokens-error' : undefined}
                          className={`field font-mono text-xs ${tokensInvalid ? 'border-status-danger' : ''}`}
                        />
                        {tokensInvalid && (
                          <p id="quick-prompt-tokens-error" className="mt-1 text-[11px] text-status-danger">
                            Enter a whole number, e.g. 12400 or 12,400.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowQuickPromptBox(false)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAppendPrompt}
                        disabled={!quickPromptText.trim() || commitInvalid || tokensInvalid}
                        className="btn-primary pr-4"
                      >
                        + Append to Log
                      </button>
                    </div>
                  </div>
                )}

                {/* Direct Prompt History Box Textarea */}
                <div className={historyMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 gap-3' : 'relative'}>
                  <textarea
                    id="task-history"
                    hidden={historyMode === 'preview'}
                    aria-describedby="task-history-hint"
                    rows={activeTab === 'both' ? 12 : 20}
                    placeholder={`Paste the prompts you used into this prompt history box while working on the problem...\n\nExample:\n### [2026-10-26 14:15] Claude 3.5 Sonnet\nWrite an Express route to fetch all team members and their roles.\n\n---\n\n### [2026-10-26 14:32] Cursor\nRefactor the query to include joined_at date and order by role.\n\n---\n\n### [2026-10-26 15:05] ChatGPT\nHelp write the SQL migration to add prompt_history mediumtext to the tasks table.`}
                    value={form.promptHistory}
                    onChange={(e) => setForm({ ...form, promptHistory: e.target.value })}
                    className="field bg-surface-code font-mono text-xs text-text-primary p-4 leading-relaxed resize-y selection:bg-purple-600 selection:text-white"
                  />
                  {historyMode !== 'write' && (
                    <PreviewPane
                      id="task-history-preview"
                      label="Prompt history"
                      source={form.promptHistory}
                      split={historyMode === 'split'}
                      sizeClass={activeTab === 'both' ? 'min-h-[15rem] max-h-[36rem]' : 'min-h-[26rem] max-h-[52rem]'}
                    />
                  )}
                </div>
                <p id="task-history-hint" className="text-[11px] text-text-muted leading-relaxed">
                  Prompt history log. Type or paste your exact prompts here as you iterate on the problem. Persisted in MariaDB MEDIUMTEXT to build your team audit log and Module 5 Vibe Coding History deliverable.
                </p>
              </section>
            )}
          </div>

          {/* Properties Sidebar (Col span 4) */}
          <aside aria-labelledby="task-properties-heading">
            <div className="lg:sticky lg:top-16 bg-surface-column border-t-2 border-t-brand-accent border-x border-b border-border-subtle divide-y divide-border-subtle">
              <h2 id="task-properties-heading" className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text-primary">
                Task Properties
              </h2>

              {/* Status / Stage */}
              <fieldset className="px-4 py-4">
                <legend className="field-label float-left w-full">Stage</legend>
                <div className="clear-both grid grid-cols-2 gap-2">
                  {STAGES.map((s) => {
                    const active = form.status === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setForm({ ...form, status: s.id })}
                        className={`py-2 px-3 rounded-md border text-xs font-semibold flex items-center gap-2 transition-colors ${
                          active
                            ? 'bg-brand-primary border-brand-primary text-white'
                            : 'bg-surface-card border-border-strong text-text-muted hover:bg-surface-elevated hover:text-text-primary'
                        }`}
                      >
                        <span aria-hidden="true" className={`w-2 h-2 rounded-full ${s.color}`} />
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Type Selector */}
              <fieldset className="px-4 py-4">
                <legend className="field-label float-left w-full">Category Type</legend>
                <div className="clear-both grid grid-cols-2 gap-2">
                  {Object.entries(TASK_TYPES).map(([t, cfg]) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={form.type === t}
                      onClick={() => setForm({ ...form, type: t })}
                      className={`py-2 px-3 rounded-md border text-xs font-semibold flex items-center gap-2 transition-colors ${
                        form.type === t
                          ? 'bg-brand-primary border-brand-primary text-white'
                          : 'bg-surface-card border-border-strong text-text-muted hover:bg-surface-elevated hover:text-text-primary'
                      }`}
                    >
                      <span aria-hidden="true" className={`w-2 h-2 ${cfg.marker} ${cfg.swatch}`} />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Assignee */}
              <div className="px-4 py-4">
                <label htmlFor={canReassign ? 'task-assignee' : undefined} className="field-label">
                  Assignee
                </label>
                {canReassign ? (
                  <>
                  <select
                    id="task-assignee"
                    aria-describedby="task-assignee-hint"
                    value={form.assignee}
                    onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                    className="field text-xs cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {form.assignee && !teamMembers.includes(form.assignee) && (
                      <option value={form.assignee}>{withGithub(form.assignee, assigneeHandles)}</option>
                    )}
                    {teamMembers.map((member) => (
                      <option key={member} value={member}>
                        {withGithub(member, assigneeHandles)}
                      </option>
                    ))}
                  </select>
                  <p id="task-assignee-hint" className="mt-1 flex items-center gap-1 text-[11px] text-brand-accent">
                    <svg aria-hidden="true" className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    {task?.id
                      ? 'You can hand this task off to another teammate.'
                      : 'Choose which teammate this task goes to.'}
                  </p>
                  </>
                ) : (
                  <>
                    <p className="field text-xs border-border-subtle">
                      {withGithub(form.assignee, assigneeHandles) || 'Unassigned'}
                    </p>
                    <p className="mt-1 text-[11px] text-text-muted">
                      Only the team creator or the current assignee can reassign this task.
                    </p>
                  </>
                )}
              </div>

              {/* Due Date with Live Significance Preview */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="task-due" className="field-label mb-0">
                    Due Date
                  </label>
                  {form.dueDate && (
                    <span aria-live="polite" className={`tag font-mono normal-case tracking-normal ${currentSignificance.chipClass}`}>
                      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${currentSignificance.dotColor}`} />
                      <span>{currentSignificance.label}</span>
                    </span>
                  )}
                </div>
                <input
                  id="task-due"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="field text-xs [color-scheme:dark]"
                />
              </div>

              {/* AI Target Tool */}
              <div className="px-4 py-4">
                <label htmlFor="task-tool" className="field-label">
                  Target AI Tool
                </label>
                <select
                  id="task-tool"
                  value={form.contextTool}
                  onChange={(e) => setForm({ ...form, contextTool: e.target.value })}
                  className="field text-xs cursor-pointer"
                >
                  {AI_TOOLS.map((tool) => (
                    <option key={tool} value={tool}>
                      {tool}
                    </option>
                  ))}
                </select>
              </div>

              {/* Metadata */}
              {isEditing && (
                <dl className="px-4 py-3 text-[11px] text-text-muted font-mono grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <dt>Created</dt>
                  <dd className="text-text-primary">{task.createdDate}</dd>
                  {task.contextUpdatedAt && (
                    <>
                      <dt>Context updated</dt>
                      <dd className="text-text-primary">{new Date(task.contextUpdatedAt).toLocaleDateString()}</dd>
                    </>
                  )}
                </dl>
              )}

              {/* Danger Zone: Delete */}
              {isEditing && (
                <div className="px-4 py-4">
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="btn-danger w-full py-2"
                    >
                      Delete Task
                    </button>
                  ) : (
                    <div role="alertdialog" aria-labelledby="delete-warning" className="p-3 border border-type-urgent border-l-4 bg-type-urgent/10 space-y-2 text-xs animate-fade-in">
                      <p id="delete-warning" className="font-semibold text-type-urgent">
                        Deleting this task will PERMANENTLY delete all context and history
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          autoFocus
                          onClick={() => setShowDeleteConfirm(false)}
                          className="btn-secondary flex-1"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="btn flex-1 bg-red-700 border-red-700 hover:bg-red-800 text-white"
                        >
                          Yes, Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const { user, token, loading: authLoading, login, register, logout, updateProfile } = useAuth();
  const {
    teams,
    activeTeam,
    activeTeamId,
    teamDetail,
    setActiveTeamId,
    createTeam,
    inviteMember,
    acceptInvite
  } = useTeams(token);

  const { tasks, loading: tasksLoading, error: tasksError, addTask, updateTask, deleteTask } = useTasks(token, activeTeamId);

  const [route, setRoute] = useState(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/register')) return 'register';
    if (hash.startsWith('#/teams')) return 'teams';
    if (hash.startsWith('#/profile')) return 'profile';
    if (hash.startsWith('#/accept-invite')) return 'accept-invite';
    if (hash.startsWith('#/board')) return 'board';
    return 'board';
  });

  // Listen to hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const h = window.location.hash;
      if (h.startsWith('#/register')) setRoute('register');
      else if (h.startsWith('#/login')) setRoute('login');
      else if (h.startsWith('#/teams')) setRoute('teams');
      else if (h.startsWith('#/profile')) setRoute('profile');
      else if (h.startsWith('#/accept-invite')) setRoute('accept-invite');
      else if (h.startsWith('#/board')) setRoute('board');
      else setRoute(token ? (activeTeamId ? 'board' : 'teams') : 'login');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [token, activeTeamId]);

  // Authentication & routing guard
  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      if (window.location.hash !== '#/register') {
        window.location.hash = '#/login';
        setRoute('login');
      }
    } else {
      const h = window.location.hash;
      if (!h || h === '#/login' || h === '#/register') {
        if (!activeTeamId) {
          window.location.hash = '#/teams';
          setRoute('teams');
        } else {
          window.location.hash = '#/board';
          setRoute('board');
        }
      }
    }
  }, [token, authLoading, activeTeamId]);

  const [activeEditorTask, setActiveEditorTask] = useState(null);
  const [handoffToast, setHandoffToast] = useState('');
  const handoffToastTimer = useRef(null);

  const showHandoffToast = useCallback((message) => {
    // Restart the timer so an earlier toast can't hide a newer message early
    clearTimeout(handoffToastTimer.current);
    setHandoffToast(message);
    handoffToastTimer.current = setTimeout(() => setHandoffToast(''), 3500);
  }, []);

  useEffect(() => () => clearTimeout(handoffToastTimer.current), []);
  const [showDeliverablesPinned, setShowDeliverablesPinned] = useState(true);
  const [deliverablesStats, setDeliverablesStats] = useState({ ready: 0, completed: 0, total: 5 });

  // Filtering & Sorting State
  const [filterMyTasksOnly, setFilterMyTasksOnly] = useState(false);
  // Must match one of the sort <select> options, otherwise the dropdown shows a mode that isn't applied
  const [sortBy, setSortBy] = useState('deadline-asc'); // 'deadline-asc' | 'deadline-desc' | 'created-desc' | 'created-asc'

  const handleDeliverablesStatsChange = useCallback((stats) => {
    setDeliverablesStats(prev => {
      if (prev.ready === stats.ready && prev.completed === stats.completed && prev.total === stats.total) {
        return prev;
      }
      return stats;
    });
  }, []);

  const isTeamCreator = Boolean(
    teamDetail?.role === 'owner' ||
    activeTeam?.role === 'owner' ||
    (activeTeam?.createdBy && activeTeam.createdBy === user?.id)
  );

  const creatorMember = teamDetail?.members?.find(m => m.role === 'owner');
  const creatorName = creatorMember?.name || (isTeamCreator ? user?.name : 'Team Creator');

  // Accept invite handler
  const [inviteTokenParam] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    return params.get('token') || '';
  });
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [acceptError, setAcceptError] = useState('');
  const [acceptSuccess, setAcceptSuccess] = useState('');


  async function handleAcceptInviteSubmit() {
    if (!inviteTokenParam) return;
    setAcceptingInvite(true);
    setAcceptError('');
    try {
      const res = await acceptInvite(inviteTokenParam);
      setAcceptSuccess(res.message || 'Successfully joined team!');
      if (res.teamId) setActiveTeamId(res.teamId);
      setTimeout(() => {
        window.location.hash = '#/teams';
        setRoute('teams');
      }, 1500);
    } catch (e) {
      setAcceptError(e.message);
    } finally {
      setAcceptingInvite(false);
    }
  }

  // After signing in or registering, return to a pending invite link instead of the teams list
  function goAfterAuth() {
    if (inviteTokenParam && !acceptSuccess) {
      window.location.hash = `#/accept-invite?token=${inviteTokenParam}`;
      setRoute('accept-invite');
    } else {
      window.location.hash = '#/teams';
      setRoute('teams');
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-surface-page text-text-muted flex items-center justify-center text-sm">
        <p role="status">Loading VibeTracker…</p>
      </main>
    );
  }

  if (!token) {
    if (route === 'register') {
      return (
        <RegisterPage
          onRegister={async (fields) => {
            await register(fields);
            goAfterAuth();
          }}
          onGoLogin={() => {
            window.location.hash = '#/login';
            setRoute('login');
          }}
        />
      );
    }
    return (
      <LoginPage
        onLogin={async (email) => {
          await login(email);
          goAfterAuth();
        }}
        onGoRegister={() => {
          window.location.hash = '#/register';
          setRoute('register');
        }}
      />
    );
  }

  if (route === 'accept-invite') {
    return (
      <main className="min-h-screen bg-surface-page text-text-primary flex items-center justify-center p-4">
        <section aria-labelledby="invite-heading" className="w-full max-w-md bg-surface-column border border-border-subtle border-t-2 border-t-brand-accent p-6 space-y-4">
          <Wordmark />
          <h1 id="invite-heading" className="text-xl font-bold">Team Invitation</h1>
          {acceptSuccess ? (
            <p role="status" className="text-status-success text-sm">{acceptSuccess}</p>
          ) : (
            <>
              <p className="text-text-muted text-sm">You have been invited to join a team on VibeTracker.</p>
              {acceptError && <p role="alert" className="text-status-danger text-sm">{acceptError}</p>}
              <button
                type="button"
                onClick={handleAcceptInviteSubmit}
                disabled={acceptingInvite}
                className="btn-primary w-full py-2 text-sm"
              >
                {acceptingInvite ? 'Joining…' : 'Accept Invitation'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => { window.location.hash = '#/teams'; setRoute('teams'); }}
            className="link text-xs"
          >
            Go to Teams Dashboard
          </button>
        </section>
      </main>
    );
  }

  if (route === 'teams') {
    return (
      <TeamDashboard
        user={user}
        teams={teams}
        activeTeam={activeTeam}
        teamDetail={teamDetail}
        onSelectTeam={(id) => {
          setActiveTeamId(id);
          window.location.hash = '#/board';
          setRoute('board');
        }}
        onCreate={createTeam}
        onInvite={inviteMember}
        onGoToBoard={() => {
          window.location.hash = '#/board';
          setRoute('board');
        }}
      />
    );
  }

  if (route === 'profile') {
    return (
      <ProfilePage
        user={user}
        onUpdate={updateProfile}
        onBack={() => {
          window.location.hash = activeTeamId ? '#/board' : '#/teams';
          setRoute(activeTeamId ? 'board' : 'teams');
        }}
      />
    );
  }

  const teamMembersList = teamDetail?.members?.map(m => m.name) || [user?.name || 'Alex'];
  // Member name → GitHub handle, for "Name (@handle)" labels wherever an assignee is shown
  const assigneeHandles = {
    ...(user?.name ? { [user.name]: user.githubHandle || user.github_handle } : {}),
    ...Object.fromEntries((teamDetail?.members || []).map(m => [m.name, m.githubHandle || m.github_handle])),
  };
  // Only the team creator picks who new tasks go to; everyone else creates tasks for themselves
  const defaultAssignee = isTeamCreator ? (teamMembersList[0] || user?.name || '') : (user?.name || '');

  // The team creator can reassign any task; other members can hand off tasks assigned to them
  const canReassignTask = (task) =>
    isTeamCreator || Boolean(task?.id && user?.name && task.assignee === user.name);

  // Filter & Sort tasks
  const displayedTasks = tasks
    .filter(task => {
      if (filterMyTasksOnly) {
        const myName = (user?.name || '').trim().toLowerCase();
        const assignee = (task.assignee || '').trim().toLowerCase();
        return assignee === myName;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'deadline-asc') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === 'deadline-desc') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return b.dueDate.localeCompare(a.dueDate);
      }
      if (sortBy === 'created-desc') {
        const dateA = a.createdDate || '';
        const dateB = b.createdDate || '';
        return dateB.localeCompare(dateA);
      }
      if (sortBy === 'created-asc') {
        const dateA = a.createdDate || '';
        const dateB = b.createdDate || '';
        return dateA.localeCompare(dateB);
      }
      return 0; // 'default' - keeps backend order
    });


    // Active task editor view
  if (activeEditorTask) {
    return (
      <TaskEditorPage
        task={activeEditorTask}
        teamMembers={teamMembersList}
        assigneeHandles={assigneeHandles}
        currentUserName={user?.name || ''}
        canReassign={canReassignTask(activeEditorTask)}
        onBack={() => setActiveEditorTask(null)}
        onSave={async (formData) => {
          if (activeEditorTask?.id) {
            await updateTask(activeEditorTask.id, formData);
            if (formData.assignee && formData.assignee !== (activeEditorTask.assignee || '')) {
              showHandoffToast(`Handed off to ${withGithub(formData.assignee, assigneeHandles)}. Make sure they have necessary context.`);
            }
          } else {
            await addTask(formData);
          }
          setActiveEditorTask(null);
        }}
        onDelete={async (id) => {
          await deleteTask(id);
          setActiveEditorTask(null);
        }}
      />
    );
  }

  // Main Kanban Board View
  return (
    <div className="min-h-screen bg-surface-page text-text-primary flex flex-col">
      <a href="#board" className="skip-link">Skip to board</a>

      {/* Global top bar: brand, team switcher, account */}
      <header className="bg-surface-column border-b border-border-strong">
        <div className="px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Wordmark />
            <span aria-hidden="true" className="h-5 w-px bg-border-strong" />
            <button
              type="button"
              onClick={() => { window.location.hash = '#/teams'; setRoute('teams'); }}
              className="btn-ghost text-text-primary min-w-0"
              title="Switch team"
            >
              <span className="sr-only">Switch team. Current team:</span>
              <span className="truncate max-w-[12rem]">{activeTeam?.name || 'Select Team'}</span>
              <span aria-hidden="true" className="text-text-muted">▾</span>
            </button>
          </div>

          <nav aria-label="Account" className="flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => { window.location.hash = '#/profile'; setRoute('profile'); }}
              className="btn-ghost text-text-primary"
              title="Edit Profile"
            >
              <span aria-hidden="true" className="w-6 h-6 bg-brand-primary text-white flex items-center justify-center font-bold text-[11px]">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
              <span className="hidden sm:inline">{user?.name}</span>
              <span className="sr-only sm:hidden">Profile</span>
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.hash = '#/login';
                setRoute('login');
              }}
              className="btn-ghost hover:text-type-urgent"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      {/* All page content below the top bar lives in <main> so it sits inside a landmark */}
      <main id="board" tabIndex={-1} className="flex-1 flex flex-col focus:outline-none">
      {/* Page heading + primary actions */}
      <div className="px-4 sm:px-6 pt-5 pb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{activeTeam?.name ? `${activeTeam.name} board` : 'Board'}</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Agile task & prompt tracker · Team Workspace
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Deliverables & Milestones Board Toggle (PRD §3.3) */}
          <button
            type="button"
            aria-expanded={showDeliverablesPinned}
            aria-controls="deliverables-board"
            onClick={() => setShowDeliverablesPinned(prev => !prev)}
            className="btn-secondary"
            title="Toggle Pinned Deliverables & Milestones Board (PRD §3.3)"
          >
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span>Deliverables</span>
            <span className="font-mono text-text-muted">
              {deliverablesStats.ready}/{deliverablesStats.total}
              <span className="sr-only"> linked</span>
            </span>
            <span aria-hidden="true" className="text-[10px] text-text-muted">{showDeliverablesPinned ? '▲' : '▼'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveEditorTask({
              status: 'todo',
              type: 'feature',
              assignee: defaultAssignee,
              description: '',
              context: CONTEXT_TEMPLATE,
              contextTool: user?.defaultLlmTool || 'Claude',
              promptHistory: '',
            })}
            className="btn-primary pr-4"
          >
            <span aria-hidden="true">+</span>
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filter bar: ruled strip, GitLab-style */}
      <div
        role="group"
        aria-label="Filter and sort tasks"
        className="mx-4 sm:mx-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border-subtle bg-surface-column px-3 py-2"
      >
        <button
          type="button"
          aria-pressed={filterMyTasksOnly}
          onClick={() => setFilterMyTasksOnly(prev => !prev)}
          className={`btn ${
            filterMyTasksOnly
              ? 'bg-brand-primary border-brand-primary text-white'
              : 'bg-surface-card border-border-strong text-text-primary hover:bg-surface-elevated'
          }`}
          title={filterMyTasksOnly ? 'Show all team tasks' : 'Show only tasks assigned to me'}
        >
          <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>My Tasks</span>
        </button>

        <div className="flex items-center gap-2">
          <label htmlFor="task-sort-select" className="text-[11px] uppercase font-semibold tracking-wider text-text-muted">
            Sort
          </label>
          <select
            id="task-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="field w-auto py-1 px-2 text-xs cursor-pointer"
          >
            <option value="deadline-asc">Deadline (Earliest first)</option>
            <option value="deadline-desc">Deadline (Latest first)</option>
            <option value="created-desc">Created (Newest first)</option>
            <option value="created-asc">Created (Oldest first)</option>
          </select>
        </div>

        <p role="status" className="text-xs font-mono text-text-muted">
          {displayedTasks.length}{filterMyTasksOnly ? ` / ${tasks.length}` : ''} {displayedTasks.length === 1 ? 'task' : 'tasks'}
        </p>

        {/* Significance Timeline Legend (§2.3) */}
        <div className="hidden lg:flex items-center gap-3 ml-auto text-[11px] font-mono text-text-muted">
          <span className="font-sans font-semibold uppercase tracking-wider">Urgency</span>
          <ul aria-label="Urgency legend" className="flex items-center gap-3">
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="w-1 h-3.5 bg-significance-today" /> Today</li>
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="w-1 h-3.5 bg-significance-soon" /> &le; 5 days</li>
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="w-1 h-3.5 bg-significance-sprint" /> &le; 2 weeks</li>
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="w-1 h-3.5 bg-slate-500" /> Later</li>
          </ul>
        </div>
      </div>

      {/* Database Error Banner (if offline) */}
      {tasksError && (
        <div role="alert" className="mx-4 sm:mx-6 mt-4 border border-status-warning/60 border-l-4 border-l-status-warning bg-status-warning/10 px-3 py-2 text-xs text-status-warning">
          API error: {tasksError}. Ensure backend server is running (<code className="font-mono bg-surface-page px-1">npm run server</code>).
        </div>
      )}

      <div className="flex-1 flex flex-col px-4 sm:px-6 py-4">
      {!activeTeam ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <p className="text-text-muted text-sm mb-4">No team selected.</p>
          <button
            type="button"
            onClick={() => { window.location.hash = '#/teams'; setRoute('teams'); }}
            className="btn-primary px-4 py-2 text-sm"
          >
            Go to Teams Dashboard
          </button>
        </div>
      ) : tasksLoading ? (
        <p role="status" className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Loading tasks for {activeTeam.name}…
        </p>
      ) : (

        <>
          {/* Pinned Deliverables & Milestones Board (PRD §3.3) */}
          <DeliverablesPinnedBoard
            token={token}
            teamId={activeTeamId}
            teamName={activeTeam?.name || 'Workspace'}
            isOpen={showDeliverablesPinned}
            onToggle={() => setShowDeliverablesPinned(prev => !prev)}
            onStatsChange={handleDeliverablesStatsChange}
          />

          {/* Board: square, ruled columns separated by small gutters */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                tasks={displayedTasks}
                onTaskClick={setActiveEditorTask}
                onAddTask={(status) => setActiveEditorTask({
                  status,
                  type: 'feature',
                  assignee: defaultAssignee,
                  description: '',
                  context: CONTEXT_TEMPLATE,
                  contextTool: user?.defaultLlmTool || 'Claude',
                  promptHistory: '',
                })}
                assigneeHandles={assigneeHandles}
              />
            ))}
          </div>
        </>
      )}
      </div>

      {/* Handoff toast (M7 task-owner); fixed-position, but kept inside <main> for landmark coverage */}
      <div aria-live="polite" className="fixed bottom-6 right-6 z-50 max-w-sm">
        {handoffToast && (
          <p className="bg-surface-card border border-border-strong border-l-4 border-l-brand-accent shadow-2xl px-4 py-3 text-xs text-text-primary">
            {handoffToast}
          </p>
        )}
      </div>
      </main>
    </div>
  );
}
