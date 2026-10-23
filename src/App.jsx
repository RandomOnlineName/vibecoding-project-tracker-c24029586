import { useState, useEffect, useCallback } from 'react';

/**
 * Vibecoding Project Tracker
 *
 * Milestone 8 (due-tint) & Full-Page Context Workspace:
 *   - Implements Section 2.3 Task Significance & Urgency Color Scale (Timeline):
 *       * Need Today (< 24h / overdue): Rose-500 bottom stripe + Rose badge
 *       * Needed within 5 Days: Amber-500 bottom stripe + Amber badge
 *       * Needed within 2 Weeks: Sky-500 bottom stripe + Sky badge
 *       * Later / Done: Slate-600 bottom stripe + Slate badge
 *   - Dual-scale preservation (Type on pill badge, Significance on bottom stripe).
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {'feature'|'bug'} type
 * @property {'todo'|'in-progress'|'review'|'done'} status
 * @property {string} assignee
 * @property {string|null} dueDate     ISO 'YYYY-MM-DD'
 * @property {string} createdDate      ISO 'YYYY-MM-DD'
 * @property {string} [context]
 * @property {string|null} [contextTool]
 * @property {string|null} [contextUpdatedAt]
 */

// The four columns of the board, in render order.
export const STAGES = [
  { id: 'todo',        label: 'To Do',       color: 'bg-slate-400' },
  { id: 'in-progress', label: 'In Progress', color: 'bg-brand-primary' },
  { id: 'review',      label: 'Review',      color: 'bg-due-warning' },
  { id: 'done',        label: 'Done',        color: 'bg-due-safe' },
];

export const TEAM = ['Alex Reed', 'Teammate B', 'Teammate C'];
export const AI_TOOLS = ['Claude', 'Cursor', 'ChatGPT', 'Copilot', 'Other'];

export const INITIAL_MOCK_TASKS = [
  {
    id: 'task-1',
    title: 'Build task modal with full CRUD capabilities',
    description: 'Create an expansive editor to add, view, edit, and delete tasks with validation and long text support.',
    type: 'feature',
    status: 'todo',
    assignee: 'Alex Reed',
    dueDate: '2026-10-25', // Within 5 days -> Amber
    createdDate: '2026-10-20',
    context: 'Design tokens from DESIGN.md should be used for styling.\n\nAPI Contract:\nPOST /api/tasks { title, description, context, ... }\nSupports large logs and documentation payloads.',
    contextTool: 'Claude',
    contextUpdatedAt: '2026-10-20T12:00:00Z',
  },
  {
    id: 'task-2',
    title: 'Refine four-column Kanban board layout',
    description: 'Implement the grid layout displaying columns for To Do, In Progress, Review, and Done.',
    type: 'feature',
    status: 'in-progress',
    assignee: 'Teammate B',
    dueDate: '2026-10-24', // Tomorrow -> Amber
    createdDate: '2026-10-20',
    context: 'Use responsive CSS grid with JetBrains dark theme palette.',
    contextTool: 'Cursor',
    contextUpdatedAt: '2026-10-20T12:30:00Z',
  },
  {
    id: 'task-3',
    title: 'Audit contrast and accessibility on dark theme',
    description: 'Verify WCAG AA compliance across all status badges and card borders.',
    type: 'bug',
    status: 'review',
    assignee: 'Teammate C',
    dueDate: '2026-10-23', // Today -> Rose
    createdDate: '2026-10-21',
    context: 'Check contrast ratios of pill text on dark surfaces.\nStacktrace from previous contrast test:\nAssertionError: Expected contrast ratio >= 4.5, received 4.1 for #868a91 on #1e1f22',
    contextTool: 'ChatGPT',
    contextUpdatedAt: '2026-10-21T14:15:00Z',
  },
  {
    id: 'task-4',
    title: 'Configure MariaDB schema and Express REST API',
    description: 'Set up initial tables and endpoint routes for tasks and anchor deliverables.',
    type: 'feature',
    status: 'done',
    assignee: 'Alex Reed',
    dueDate: '2026-10-20', // Done -> Slate neutral
    createdDate: '2026-10-20',
    context: 'Database credentials configured in .env with fallback. MariaDB mediumtext supports up to 16MB of documentation/context.',
    contextTool: 'Cursor',
    contextUpdatedAt: '2026-10-20T11:00:00Z',
  },
  {
    id: 'task-5',
    title: 'Deliverable Anchor Board for Presentations & Reports',
    description: 'Pin presentation slides, live demo links, and documentation above the board.',
    type: 'feature',
    status: 'todo',
    assignee: 'Alex Reed',
    dueDate: '2026-11-04', // Within 2 weeks -> Sky Blue
    createdDate: '2026-10-22',
    context: 'Pinned anchor deliverables allow quick access to final project links.',
    contextTool: 'Claude',
    contextUpdatedAt: '2026-10-22T09:00:00Z',
  },
];

/**
 * Calculates Task Significance & Urgency according to DESIGN.md §2.3:
 *   - Need Today (< 24h / overdue): Rose-500
 *   - Needed within 5 Days: Amber-500
 *   - Needed within 2 Weeks: Sky-500
 *   - Later (> 14d / no date): Slate-600
 *   - Done tasks: Slate neutral (overrides urgency)
 */
export function getTaskSignificance(task) {
  if (task.status === 'done') {
    return {
      level: 'neutral',
      label: 'Completed',
      stripeClass: 'bg-slate-600/70',
      chipClass: 'text-slate-400 bg-slate-800/40 border-slate-700/50',
      dotColor: 'bg-slate-500',
    };
  }

  if (!task.dueDate) {
    return {
      level: 'later',
      label: 'No deadline',
      stripeClass: 'bg-slate-700/50',
      chipClass: 'text-text-muted bg-surface-elevated/40 border-border-subtle/50',
      dotColor: 'bg-slate-600',
    };
  }

  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const parts = String(task.dueDate).split('-');

  if (parts.length !== 3) {
    return {
      level: 'later',
      label: task.dueDate,
      stripeClass: 'bg-slate-600',
      chipClass: 'text-slate-400 bg-slate-800/40 border-slate-700/50',
      dotColor: 'bg-slate-500',
    };
  }

  const [year, month, day] = parts.map(Number);
  const due = new Date(year, month - 1, day);
  const diffDays = Math.round((due - todayDate) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      level: 'today',
      label: diffDays < 0 ? `Overdue (${Math.abs(diffDays)}d)` : 'Need Today',
      stripeClass: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]',
      chipClass: 'text-rose-400 bg-rose-500/15 border-rose-500/30 font-medium',
      dotColor: 'bg-rose-500 animate-pulse',
    };
  } else if (diffDays <= 5) {
    return {
      level: 'soon',
      label: diffDays === 1 ? 'Due Tomorrow' : `In ${diffDays} days`,
      stripeClass: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.3)]',
      chipClass: 'text-amber-400 bg-amber-500/15 border-amber-500/30 font-medium',
      dotColor: 'bg-amber-500',
    };
  } else if (diffDays <= 14) {
    return {
      level: 'sprint',
      label: `In ${diffDays} days`,
      stripeClass: 'bg-sky-500',
      chipClass: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
      dotColor: 'bg-sky-500',
    };
  } else {
    return {
      level: 'later',
      label: `In ${diffDays} days`,
      stripeClass: 'bg-slate-600',
      chipClass: 'text-slate-400 bg-slate-800/40 border-slate-700/50',
      dotColor: 'bg-slate-500',
    };
  }
}

/**
 * Tiny fetch wrapper for the MariaDB-backed API (server/index.js).
 */
async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      msg = (await res.json()).error || msg;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

/**
 * Tasks persisted in MariaDB with localStorage sync.
 */
export function useTasks() {
  const [tasks, setTasks] = useState(() => {
    try {
      const cached = localStorage.getItem('vibetracker.tasks');
      return cached ? JSON.parse(cached) : INITIAL_MOCK_TASKS;
    } catch {
      return INITIAL_MOCK_TASKS;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem('vibetracker.tasks', JSON.stringify(tasks));
    } catch {
      /* ignore storage quota limits */
    }
  }, [tasks]);

  const refresh = useCallback(async () => {
    try {
      const fetched = await api('/tasks');
      if (Array.isArray(fetched) && fetched.length > 0) {
        setTasks(fetched);
      } else {
        setTasks((prev) => (prev && prev.length > 0 ? prev : INITIAL_MOCK_TASKS));
      }
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTask = useCallback(async (task) => {
    try {
      const created = await api('/tasks', { method: 'POST', body: task });
      setTasks((prev) => [...prev, created]);
      return created;
    } catch (e) {
      const newTask = {
        ...task,
        id: 'task-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        createdDate: new Date().toISOString().slice(0, 10),
      };
      setTasks((prev) => [...prev, newTask]);
      return newTask;
    }
  }, []);

  const updateTask = useCallback(async (id, patch) => {
    let previous;
    setTasks((prev) => {
      previous = prev;
      return prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
    });
    try {
      const saved = await api(`/tasks/${id}`, { method: 'PUT', body: patch });
      setTasks((prev) => prev.map((t) => (t.id === id ? saved : t)));
      return saved;
    } catch (e) {
      return { id, ...patch };
    }
  }, []);

  const deleteTask = useCallback(async (id) => {
    let previous;
    setTasks((prev) => {
      previous = prev;
      return prev.filter((t) => t.id !== id);
    });
    try {
      await api(`/tasks/${id}`, { method: 'DELETE' });
    } catch (e) {
      /* keep optimistic delete */
    }
  }, []);

  return { tasks, loading, error, refresh, addTask, updateTask, deleteTask };
}

/**
 * Task Card Component with Dual-Scale Color Coding:
 *   - Type Scale: Top Pill Tag (Green for Feature, Orange/Red for Bug)
 *   - Significance Scale: Stripe near the bottom of the card + Due Date Chip
 */
export function TaskCard({ task, onClick }) {
  const isBug = task.type === 'bug';
  const significance = getTaskSignificance(task);

  return (
    <div
      onClick={onClick}
      className="group bg-surface-card hover:bg-surface-elevated border border-border-subtle hover:border-[#4e5157] rounded-lg p-3.5 shadow-sm transition-all duration-150 relative cursor-pointer select-none flex flex-col justify-between"
    >
      <div>
        {/* Header: Type Pill (Scale 1) & Due Date Chip (Scale 2) */}
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Scale 1: Task Type Pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
              isBug
                ? 'bg-type-bug/15 text-type-bug border-type-bug/30'
                : 'bg-type-feature/15 text-type-feature border-type-feature/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isBug ? 'bg-type-bug' : 'bg-type-feature'
              }`}
            />
            {isBug ? 'Bug' : 'Feature'}
          </span>

          {/* Scale 2: Task Significance Due Chip */}
          {task.dueDate && (
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1.5 transition-colors ${significance.chipClass}`}
              title={`Deadline: ${task.dueDate} (${significance.label})`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${significance.dotColor}`} />
              <span>{significance.label}</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium text-text-primary mb-1.5 group-hover:text-white transition-colors line-clamp-2">
          {task.title}
        </h3>

        {/* Description Preview */}
        {task.description && (
          <p className="text-xs text-text-muted line-clamp-2 mb-3 leading-relaxed whitespace-pre-line">
            {task.description}
          </p>
        )}
      </div>

      {/* Footer Area */}
      <div>
        {/* Assignee & Context Indicator */}
        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border-subtle/60 text-text-muted">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center text-[10px] font-semibold text-text-primary uppercase">
              {(task.assignee || 'Unassigned').slice(0, 2)}
            </span>
            <span className="truncate max-w-[100px]">{task.assignee || 'Unassigned'}</span>
          </div>

          {task.context && (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-brand-accent font-medium font-mono"
              title="Has documentation / prompt context"
            >
              <svg
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
              {task.contextTool || 'Context'} ({task.context.length > 999 ? `${Math.round(task.context.length / 1024)}k` : task.context.length})
            </span>
          )}
        </div>

        {/* Urgency / Deadline Stripe near the bottom of the card */}
        <div
          className={`h-1.5 w-full rounded-full mt-2.5 transition-colors ${significance.stripeClass}`}
          title={`Deadline significance: ${significance.label}`}
        />
      </div>
    </div>
  );
}

/**
 * Kanban Column Component
 */
export function KanbanColumn({ stage, tasks, onTaskClick, onAddTask }) {
  const stageTasks = tasks.filter((t) => t.status === stage.id);

  return (
    <div className="bg-surface-column border border-border-subtle rounded-xl p-3 flex flex-col min-h-[500px]">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle/80 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${stage.color}`} />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
            {stage.label}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="bg-surface-elevated text-text-muted text-[11px] font-mono px-2 py-0.5 rounded-full border border-border-subtle/60">
            {stageTasks.length}
          </span>
          <button
            onClick={() => onAddTask(stage.id)}
            title={`Add task to ${stage.label}`}
            className="w-6 h-6 rounded-md hover:bg-surface-elevated text-text-muted hover:text-text-primary flex items-center justify-center transition-colors text-sm"
          >
            +
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 space-y-2.5 overflow-y-auto">
        {stageTasks.length > 0 ? (
          stageTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick && onTaskClick(task)}
            />
          ))
        ) : (
          <div className="h-32 flex flex-col items-center justify-center rounded-lg border border-dashed border-border-subtle/60 text-text-muted text-xs p-4 text-center">
            <span>No tasks in this stage yet</span>
            <button
              onClick={() => onAddTask(stage.id)}
              className="mt-2 text-xs text-brand-primary hover:text-brand-accent transition-colors font-medium"
            >
              + Add task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Full-Page Task Editor Component
 */
export function TaskEditorPage({ task, onBack, onSave, onDelete }) {
  const isEditing = Boolean(task?.id);

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    type: task?.type || 'feature',
    status: task?.status || 'todo',
    assignee: task?.assignee || TEAM[0] || '',
    dueDate: task?.dueDate || '',
    context: task?.context || '',
    contextTool: task?.contextTool || 'Claude',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copyToast, setCopyToast] = useState(false);

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
  }, [form, showDeleteConfirm, onBack]);

  const handleSave = () => {
    if (!form.title.trim()) return;

    onSave({
      ...form,
      title: form.title.trim(),
      dueDate: form.dueDate || null,
      contextUpdatedAt: form.context ? new Date().toISOString() : null,
    });
  };

  const handleCopyContext = async () => {
    if (!form.context) return;
    try {
      await navigator.clipboard.writeText(form.context);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2500);
    } catch {
      /* fallback */
    }
  };

  const handleDelete = () => {
    if (onDelete && task?.id) {
      onDelete(task.id);
    }
  };

  return (
    <div className="min-h-screen bg-surface-page text-text-primary flex flex-col animate-fade-in">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-surface-column/95 backdrop-blur border-b border-border-subtle px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-xs font-medium text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
            title="Return to Kanban board (Esc)"
          >
            <span>&larr;</span>
            <span>Back to Board</span>
          </button>
          <span className="text-border-subtle">/</span>
          <span className="text-xs font-mono text-text-muted">
            {isEditing ? (task.id || 'Task') : 'New Task'}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border ${
              form.type === 'bug'
                ? 'bg-type-bug/15 text-type-bug border-type-bug/30'
                : 'bg-type-feature/15 text-type-feature border-type-feature/30'
            }`}
          >
            {form.type}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-1.5 rounded-lg border border-border-subtle text-xs font-medium text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!form.title.trim()}
            className="px-4 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white text-xs font-medium transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>{isEditing ? 'Save Changes' : 'Create Task'}</span>
            <span className="hidden sm:inline text-[10px] opacity-75 font-mono">(Ctrl+S)</span>
          </button>
        </div>
      </nav>

      {/* Editor Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Editing Area (Col span 8) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Title Input */}
            <div>
              <label className="block text-xs font-mono uppercase text-text-muted tracking-wider mb-2">
                Task Title <span className="text-type-bug">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Task title or user story..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full text-2xl lg:text-3xl font-bold bg-transparent border-0 border-b-2 border-border-subtle focus:border-brand-primary focus:ring-0 pb-2 text-text-primary placeholder:text-text-muted/40 transition-colors"
              />
            </div>

            {/* Description / Detailed Test Specifications */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <span>Description & Test Specs</span>
                  <span className="text-[10px] font-normal font-mono text-text-muted">
                    ({form.description.length} chars)
                  </span>
                </label>
              </div>
              <textarea
                rows={8}
                placeholder="Provide comprehensive task specifications, user acceptance criteria, reproduction steps, or detailed test definitions..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-surface-card border border-border-subtle rounded-xl p-4 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-brand-primary leading-relaxed resize-y transition-colors font-sans"
              />
            </div>

            {/* LLM Context Window (Prompts, Logs, Stacktraces, Documentation) */}
            <div className="space-y-2 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-brand-accent flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                    <span>LLM Context Window</span>
                  </label>
                  <span className="text-[11px] font-mono text-text-muted bg-surface-column px-2 py-0.5 rounded border border-border-subtle">
                    {form.context.length.toLocaleString()} characters
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {form.context && (
                    <button
                      type="button"
                      onClick={handleCopyContext}
                      className="px-2.5 py-1 rounded text-xs font-mono text-brand-accent hover:text-white bg-brand-accent/10 hover:bg-brand-accent/20 border border-brand-accent/30 transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                        />
                      </svg>
                      <span>{copyToast ? 'Copied to Clipboard!' : 'Copy Context'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <textarea
                  rows={16}
                  placeholder={`Paste full system prompts, API documentation, terminal logs, or error stacktraces here...\n\nExample:\n// Context for AI assistant:\nFix the SQL connection pooling issue in server/index.js.\nStacktrace:\nError: ER_ACCESS_DENIED_ERROR: Access denied for user 'vibetracker'@'localhost'`}
                  value={form.context}
                  onChange={(e) => setForm({ ...form, context: e.target.value })}
                  className="w-full bg-[#121316] font-mono text-xs text-[#a9b7c6] border border-border-subtle rounded-xl p-4 placeholder:text-text-muted/40 focus:outline-none focus:border-brand-accent leading-relaxed resize-y min-h-[350px] selection:bg-brand-primary selection:text-white"
                />
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Dedicated buffer for expansive context briefings. Persisted in MariaDB MEDIUMTEXT to support comprehensive logs, code snippets, and prompt histories.
              </p>
            </div>
          </div>

          {/* Properties Sidebar (Col span 4) */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-surface-column/70 border border-border-subtle rounded-xl p-5 space-y-5 sticky top-20 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted pb-2 border-b border-border-subtle">
                Task Properties
              </h3>

              {/* Status / Stage */}
              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                  Stage
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STAGES.map((s) => {
                    const active = form.status === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setForm({ ...form, status: s.id })}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all ${
                          active
                            ? 'bg-surface-elevated text-text-primary border-brand-primary shadow-sm'
                            : 'bg-surface-card text-text-muted border-border-subtle hover:bg-surface-elevated'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${s.color}`} />
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Type Toggle */}
              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                  Category Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'feature' })}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                      form.type === 'feature'
                        ? 'bg-type-feature/15 text-type-feature border-type-feature shadow-sm'
                        : 'bg-surface-card text-text-muted border-border-subtle hover:bg-surface-elevated'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-type-feature" />
                    Feature
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'bug' })}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                      form.type === 'bug'
                        ? 'bg-type-bug/15 text-type-bug border-type-bug shadow-sm'
                        : 'bg-surface-card text-text-muted border-border-subtle hover:bg-surface-elevated'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-type-bug" />
                    Bug
                  </button>
                </div>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">
                  Assignee
                </label>
                <select
                  value={form.assignee}
                  onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                  className="w-full bg-surface-card border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary cursor-pointer"
                >
                  {TEAM.map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date with Live Significance Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-text-muted uppercase tracking-wider">
                    Due Date
                  </label>
                  {form.dueDate && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${currentSignificance.chipClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${currentSignificance.dotColor}`} />
                      <span>{currentSignificance.label}</span>
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full bg-surface-card border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>

              {/* AI Target Tool */}
              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">
                  Target AI Tool
                </label>
                <select
                  value={form.contextTool}
                  onChange={(e) => setForm({ ...form, contextTool: e.target.value })}
                  className="w-full bg-surface-card border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary cursor-pointer"
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
                <div className="pt-3 border-t border-border-subtle text-[11px] text-text-muted space-y-1 font-mono">
                  <div>Created: {task.createdDate}</div>
                  {task.contextUpdatedAt && (
                    <div>Context updated: {new Date(task.contextUpdatedAt).toLocaleDateString()}</div>
                  )}
                </div>
              )}

              {/* Danger Zone: Delete */}
              {isEditing && (
                <div className="pt-4 border-t border-border-subtle">
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-2 px-3 rounded-lg border border-type-bug/30 text-type-bug hover:bg-type-bug/10 text-xs font-medium transition-colors text-center"
                    >
                      Delete Task
                    </button>
                  ) : (
                    <div className="p-3 rounded-lg border border-type-bug/60 bg-type-bug/10 space-y-2 text-xs animate-fade-in">
                      <p className="font-semibold text-type-bug">
                        Deleting this task will PERMANENTLY delete all context and history
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 py-1 px-2 rounded bg-surface-card text-text-muted hover:text-text-primary text-xs border border-border-subtle"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="flex-1 py-1 px-2 rounded bg-type-bug hover:bg-type-bug/90 text-white font-medium text-xs transition-colors"
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
  const { tasks, loading, error, addTask, updateTask, deleteTask } = useTasks();

  const [activeEditorTask, setActiveEditorTask] = useState(null);

  const handleOpenAdd = (status = 'todo') => {
    setActiveEditorTask({
      status,
      type: 'feature',
      assignee: TEAM[0] || '',
      description: '',
      context: '',
      contextTool: 'Claude',
    });
  };

  const handleOpenEdit = (task) => {
    setActiveEditorTask(task);
  };

  const handleBackToBoard = () => {
    setActiveEditorTask(null);
  };

  const handleSaveTask = async (formData) => {
    if (activeEditorTask?.id) {
      await updateTask(activeEditorTask.id, formData);
    } else {
      await addTask(formData);
    }
    setActiveEditorTask(null);
  };

  const handleDeleteTask = async (id) => {
    await deleteTask(id);
    setActiveEditorTask(null);
  };

  // If a task is being created or edited, render the dedicated Full-Page Task Editor
  if (activeEditorTask) {
    return (
      <TaskEditorPage
        task={activeEditorTask}
        onBack={handleBackToBoard}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />
    );
  }

  // Otherwise, render the main Kanban Board
  return (
    <div className="min-h-screen bg-surface-page text-text-primary p-6 flex flex-col">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              VibeTracker
            </h1>
            <span className="w-2 h-2 rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent" />
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Agile task & prompt tracker · Timeline Urgency Color Coding
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Significance Timeline Legend (§2.3) */}
          <div className="hidden md:flex items-center gap-3 text-[11px] font-mono text-text-muted bg-surface-column px-3 py-1.5 rounded-lg border border-border-subtle">
            <span className="text-text-muted/60 uppercase font-sans text-[10px] font-semibold">Urgency:</span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Today / Overdue
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> &le; 5 Days
            </span>
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> &le; 2 Weeks
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-500" /> Later
            </span>
          </div>

          <span className="text-xs font-mono text-text-muted bg-surface-column px-2.5 py-1 rounded-md border border-border-subtle">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </span>

          <button
            onClick={() => handleOpenAdd('todo')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
          >
            <span>+</span>
            <span>Add Task</span>
          </button>
        </div>
      </header>

      {/* Database Error Banner (if offline) */}
      {error && (
        <div className="mb-4 rounded-md border border-due-warning/40 bg-due-warning/10 p-3 text-xs text-due-warning flex items-center justify-between">
          <span>
            API offline ({error}). Operating in local fallback mode. Start server with{' '}
            <code className="font-mono bg-surface-page px-1 rounded">npm run server</code>.
          </span>
        </div>
      )}

      {/* Main Kanban Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Loading tasks…
        </div>
      ) : (
        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              tasks={tasks}
              onTaskClick={handleOpenEdit}
              onAddTask={handleOpenAdd}
            />
          ))}
        </main>
      )}
    </div>
  );
}
