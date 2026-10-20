import { useState, useEffect, useCallback } from 'react';
 
/**
 * Vibecoding Project Tracker — starter scaffold.
 *
 * This file is intentionally almost empty. The boilerplate (Vite, React,
 * Tailwind) is configured for you, plus a few shared constants and a
 * localStorage helper. Everything visible on screen, you build.
 *
 * Where to start (build sequence in Phase 3):
 *   - M4  data-model    : render the four columns and the task cards below.
 *   - M5  crud-modal    : add the "+" button modal and the edit-on-click modal.
 *   - M6  tag-style     : feature vs. bug color coding (uses DESIGN.md §2 colors).
 *   - M7  task-owner    : assignee badge + "Hand off to..." dropdown.
 *   - M8  due-tint      : color cards by due date (uses DESIGN.md §2 due-state colors).
 *   - M9  context       : a curated Context briefing field on the modal.
 *   - M10 copy-prompt   : a "Copy as Prompt Context" button that serializes the task + context.
 *   - M11 anchors       : the Anchor Board above the Kanban.
 *   - M12 secret-sauce  : the one open-ended thing that makes your tracker yours.
 *
 * Search the file for `TODO M<n>` to find the right hook for each milestone.
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
 */
 
// The four columns of the board, in render order.
// Use these IDs everywhere — do not invent new ones.
export const STAGES = [
  { id: 'todo',        label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review',      label: 'Review' },
  { id: 'done',        label: 'Done' },
];
 
// Replace these placeholders with the three names from PRD §8 before M4.
// They become the only valid values for `Task.assignee`.
export const TEAM = ['Teammate A', 'Teammate B', 'Teammate C'];
 
/**
 * A tiny localStorage hook — survives reloads, no library needed.
 *
 * Usage:
 *   const [tasks, setTasks] = useLocalStorage('vibetracker.tasks', []);
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
      /* quota or private-mode error — silently ignore for hackathon */
    }
  }, [key, value]);
 
  return [value, setValue];
}
 
/**
 * Tiny fetch wrapper for the MariaDB-backed API (server/index.js).
 * Vite proxies /api -> http://localhost:3001 in dev (see vite.config.js).
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
 * Tasks persisted in MariaDB.
 *
 * Usage:
 *   const { tasks, loading, error, addTask, updateTask, deleteTask } = useTasks();
 *
 * Updates are applied optimistically and rolled back if the server rejects them.
 */
export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
 
  const refresh = useCallback(async () => {
    try {
      setTasks(await api('/tasks'));
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
    const created = await api('/tasks', { method: 'POST', body: task });
    setTasks((prev) => [...prev, created]);
    return created;
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
      setTasks(previous);
      throw e;
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
      setTasks(previous);
      throw e;
    }
  }, []);
 
  return { tasks, loading, error, refresh, addTask, updateTask, deleteTask };
}
 
/**
 * The four Anchor Board slots persisted in MariaDB.
 *   const { anchors, setAnchorUrl } = useAnchors();
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
 
export default function App() {
  // Data now lives in MariaDB via the API (see server/). Use these in M4+:
  const { tasks, loading, error } = useTasks();
  //
  // TODO M4 data-model:
  //   Render `tasks` in the four columns. Seed 3-4 tasks by POSTing them (addTask)
  //   or by inserting rows into the `tasks` table.
  //
  // TODO M5 crud-modal:
  //   const [editing, setEditing] = useState(null);
  //   Save with addTask(...) / updateTask(id, patch); remove with deleteTask(id).
  //
  // TODO M11 anchors:
  //   const { anchors, setAnchorUrl } = useAnchors();
 
  return (
    <div className="min-h-screen bg-surface-page text-text-primary p-6">
      <header className="mb-6 flex items-end justify-between border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <span>VibeTracker</span>
            <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent"></span>
          </h1>
          <p className="text-xs text-text-muted mt-1">
            {/* Replace this line with your team name from PRD §11. */}
            Team starter · Utilitarian developer workspace
          </p>
        </div>
      </header>
 
      {/* TODO M11 anchors: render the Anchor Board (Presentation / Demo / Report / Documentation) above the board. */}
 
      {/*
        TODO M4 data-model:
          Render a Kanban board with the four columns from STAGES.
          Each column should display the tasks whose status matches its id.
          Pre-populate 3-4 mock tasks so the board isn't empty on first load.
 
        TODO M5 crud-modal:
          Add a "+" button that opens a modal with every Task field.
          Clicking a card should open the same modal in edit mode.
      */}
      {error && (
        <div className="mb-4 rounded-md border border-due-overdue/40 bg-due-overdue/10 p-3 text-xs text-due-overdue">
          Can't reach the database API: {error}. Is the server running (<code>npm run server</code>)
          and MariaDB up?
        </div>
      )}
      <main className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface-column/50 text-text-muted text-sm">
        {loading
          ? 'Loading tasks…'
          : `Build the four-column board here · M4 (${tasks.length} tasks in MariaDB)`}
      </main>
    </div>
  );
}
