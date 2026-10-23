import { useState, useEffect, useCallback } from 'react';

/**
 * Vibecoding Project Tracker
 *
 * Milestone 4 (data-model):
 *   - Four-column Kanban board (To Do, In Progress, Review, Done).
 *   - Visual task cards with type, assignee, due date, and prompt context indicators.
 *   - Seeded mock tasks connected to MariaDB API with fallback.
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

export const INITIAL_MOCK_TASKS = [
  {
    id: 'task-1',
    title: 'Build task modal with full CRUD capabilities',
    description: 'Create a modal to add, view, edit, and delete tasks with validation.',
    type: 'feature',
    status: 'todo',
    assignee: 'Alex Reed',
    dueDate: '2026-10-25',
    createdDate: '2026-10-20',
    context: 'Design tokens from DESIGN.md should be used for styling.',
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
    dueDate: '2026-10-24',
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
    dueDate: '2026-10-23',
    createdDate: '2026-10-21',
    context: 'Check contrast ratios of pill text on dark surfaces.',
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
    dueDate: '2026-10-20',
    createdDate: '2026-10-20',
    context: 'Database credentials configured in .env with fallback.',
    contextTool: 'Cursor',
    contextUpdatedAt: '2026-10-20T11:00:00Z',
  },
];

/**
 * A tiny localStorage hook — survives reloads, no library needed.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota or private-mode error — silently ignore */
    }
  }, [key, value]);

  return [value, setValue];
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
 * Tasks persisted in MariaDB with mock fallback.
 */
export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const fetched = await api('/tasks');
      if (Array.isArray(fetched) && fetched.length > 0) {
        setTasks(fetched);
      } else {
        // Fallback to initial mock tasks if database is empty
        setTasks(INITIAL_MOCK_TASKS);
      }
      setError(null);
    } catch (e) {
      setError(e.message);
      // Graceful fallback to initial mock tasks for standalone frontend testing
      setTasks(INITIAL_MOCK_TASKS);
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
      // Local fallback
      const newTask = {
        ...task,
        id: 'task-' + Date.now().toString(36),
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
      // Keep optimistic local update if offline
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
      // Keep optimistic removal if offline
    }
  }, []);

  return { tasks, loading, error, refresh, addTask, updateTask, deleteTask };
}

/**
 * Pinned Anchor Board slots.
 */
export function useAnchors() {
  const [anchors, setAnchors] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/anchors').then(setAnchors).catch((e) => setError(e.message));
  }, []);

  const setAnchorUrl = useCallback(async (id, url) => {
    const saved = await api(`/anchors/${id}`, { method: 'PUT', body: { url } });
    setAnchors((prev) => prev.map((a) => (a.id === id ? saved : a)));
    return saved;
  }, []);

  return { anchors, error, setAnchorUrl };
}

/**
 * Task Card Component
 */
export function TaskCard({ task, onClick }) {
  const isBug = task.type === 'bug';

  return (
    <div
      onClick={onClick}
      className="group bg-surface-card hover:bg-surface-elevated border border-border-subtle hover:border-[#4e5157] rounded-lg p-3.5 shadow-sm transition-all duration-150 relative cursor-pointer"
    >
      {/* Header: Type Pill & Due Date */}
      <div className="flex items-center justify-between gap-2 mb-2">
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

        {task.dueDate && (
          <span className="text-[11px] font-mono text-text-muted flex items-center gap-1">
            <svg
              className="w-3 h-3 opacity-70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {task.dueDate}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-text-primary mb-1.5 group-hover:text-white transition-colors line-clamp-2">
        {task.title}
      </h3>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-text-muted line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Footer: Assignee & Context Indicator */}
      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border-subtle/60 text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center text-[10px] font-semibold text-text-primary uppercase">
            {(task.assignee || 'Unassigned').slice(0, 2)}
          </span>
          <span className="truncate max-w-[100px]">{task.assignee || 'Unassigned'}</span>
        </div>

        {task.context && (
          <span
            className="inline-flex items-center gap-1 text-[11px] text-brand-accent font-medium"
            title={task.context}
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
            {task.contextTool || 'Context'}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Kanban Column Component
 */
export function KanbanColumn({ stage, tasks, onTaskClick }) {
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
        <span className="bg-surface-elevated text-text-muted text-[11px] font-mono px-2 py-0.5 rounded-full border border-border-subtle/60">
          {stageTasks.length}
        </span>
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
          <div className="h-32 flex items-center justify-center rounded-lg border border-dashed border-border-subtle/60 text-text-muted text-xs p-4 text-center">
            No tasks in this stage yet
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { tasks, loading, error } = useTasks();

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
            Agile task & prompt tracker · Milestone 4: Data Model
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-muted bg-surface-column px-2.5 py-1 rounded-md border border-border-subtle">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} total
          </span>
        </div>
      </header>

      {/* Database Error Banner (if offline) */}
      {error && (
        <div className="mb-4 rounded-md border border-due-warning/40 bg-due-warning/10 p-3 text-xs text-due-warning flex items-center justify-between">
          <span>
            API offline ({error}). Using local data model. Start server with{' '}
            <code className="font-mono bg-surface-page px-1 rounded">npm run server</code>.
          </span>
        </div>
      )}

      {/* Main Kanban Board (M4 data-model) */}
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
              onTaskClick={(task) => {
                // Prepped for M5 crud-modal click-to-edit
                console.log('Selected task:', task);
              }}
            />
          ))}
        </main>
      )}
    </div>
  );
}
