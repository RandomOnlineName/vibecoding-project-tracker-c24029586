import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { useTeams } from './hooks/useTeams.js';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import TeamDashboard from './pages/TeamDashboard.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
<<<<<<< HEAD
=======
import DeliverablesPinnedBoard from './components/DeliverablesPinnedBoard.jsx';
>>>>>>> f13340f (context)

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
  { id: 'in-progress', label: 'In Progress', color: 'bg-brand-primary' },
  { id: 'review',      label: 'Review',      color: 'bg-due-warning' },
  { id: 'done',        label: 'Done',        color: 'bg-due-safe' },
];

export const AI_TOOLS = ['Claude', 'Cursor', 'ChatGPT', 'Copilot', 'Gemini', 'Other'];

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
 * Task Card Component with Dual-Scale Color Coding:
 *   - Type Scale: Top Pill Tag (Green for Feature, Orange/Red for Bug)
 *   - Significance Scale: Stripe near the bottom of the card + Due Date Chip
 */
export function TaskCard({ task, onClick }) {
  const isBug = task.type === 'bug' || task.type === 'urgent';
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
            {task.type || 'feature'}
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

          <div className="flex items-center gap-2">
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

            {task.promptHistory && (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-purple-400 font-medium font-mono"
                title="Has prompt history log"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Prompts ({task.promptHistory.length > 999 ? `${Math.round(task.promptHistory.length / 1024)}k` : task.promptHistory.length})
              </span>
            )}
          </div>
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
export function TaskEditorPage({ task, teamMembers, onBack, onSave, onDelete }) {
  const isEditing = Boolean(task?.id);

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    type: task?.type || 'feature',
    status: task?.status || 'todo',
    assignee: task?.assignee || teamMembers[0] || '',
    dueDate: task?.dueDate || '',
    context: task?.context || '',
    contextTool: task?.contextTool || 'Claude',
    promptHistory: task?.promptHistory || '',
  });

  const [activeTab, setActiveTab] = useState('both'); // 'both' | 'context' | 'history'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [copyHistoryToast, setCopyHistoryToast] = useState(false);
  const [quickPromptText, setQuickPromptText] = useState('');
  const [quickPromptTool, setQuickPromptTool] = useState(task?.contextTool || 'Claude');
  const [showQuickPromptBox, setShowQuickPromptBox] = useState(false);

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
      promptHistory: form.promptHistory || '',
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

  const handleAppendPrompt = (e) => {
    if (e) e.preventDefault();
    if (!quickPromptText.trim()) return;
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const separator = form.promptHistory.trim() ? '\n\n---\n\n' : '';
    const entry = `${separator}### [${timeStr}] ${quickPromptTool}\n${quickPromptText.trim()}`;
    setForm(prev => ({
      ...prev,
      promptHistory: (prev.promptHistory || '') + entry,
    }));
    setQuickPromptText('');
    setShowQuickPromptBox(false);
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
              form.type === 'bug' || form.type === 'urgent'
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

            {/* Tab Navigation for Context vs Prompt History */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3 pt-2">
              <div className="flex items-center gap-1 bg-surface-column p-1 rounded-lg border border-border-subtle text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('both')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTab === 'both'
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Stacked View
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('context')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === 'context'
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                  <span>AI Context Window</span>
                  {form.context && (
                    <span className="text-[10px] font-mono opacity-80">
                      ({form.context.length > 999 ? `${Math.round(form.context.length / 1024)}k` : form.context.length})
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === 'history'
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Prompt History Box</span>
                  {form.promptHistory && (
                    <span className="text-[10px] font-mono opacity-80">
                      ({form.promptHistory.length > 999 ? `${Math.round(form.promptHistory.length / 1024)}k` : form.promptHistory.length})
                    </span>
                  )}
                </button>
              </div>

              <div className="text-[11px] font-mono text-text-muted hidden md:flex items-center gap-2">
                <span>Markdown & code blocks supported</span>
              </div>
            </div>

            {/* LLM Context Window (Briefing, Logs, Stacktraces, Documentation) */}
            {(activeTab === 'both' || activeTab === 'context') && (
              <div className="space-y-2 pt-2 border-t border-border-subtle/50 first:border-0 first:pt-0">
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
                      <span>AI Context Window (Briefing & Knowledge)</span>
                    </label>
                    <span className="text-[11px] font-mono text-text-muted bg-surface-column px-2 py-0.5 rounded border border-border-subtle">
                      {form.context.length.toLocaleString()} chars
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
                    rows={activeTab === 'both' ? 10 : 18}
                    placeholder={`Paste background system context, architectural notes, API schemas, or error stacktraces here...\n\nExample:\n// Context for AI assistant:\nFix the SQL connection pooling issue in server/index.js.\nStacktrace:\nError: ER_ACCESS_DENIED_ERROR: Access denied for user 'vibetracker'@'localhost'`}
                    value={form.context}
                    onChange={(e) => setForm({ ...form, context: e.target.value })}
                    className="w-full bg-[#121316] font-mono text-xs text-[#a9b7c6] border border-border-subtle rounded-xl p-4 placeholder:text-text-muted/40 focus:outline-none focus:border-brand-accent leading-relaxed resize-y selection:bg-brand-primary selection:text-white"
                  />
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Context briefing buffer. Persisted in MariaDB MEDIUMTEXT for AI prompt generation and task handoffs.
                </p>
              </div>
            )}

            {/* Prompt History Box (Prompts Used while working on the problem) */}
            {(activeTab === 'both' || activeTab === 'history') && (
              <div className="space-y-3 pt-3 border-t border-border-subtle/80">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>Prompt History Box (Prompts Used)</span>
                    </label>
                    <span className="text-[11px] font-mono text-purple-300/80 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                      {form.promptHistory.length.toLocaleString()} chars
                    </span>
                    {form.promptHistory && (
                      <span className="text-[10px] font-mono text-text-muted">
                        ~{(form.promptHistory.match(/### \[/g) || [1]).length} entry/entries
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowQuickPromptBox(!showQuickPromptBox)}
                      className="px-2.5 py-1 rounded text-xs font-mono text-purple-300 hover:text-white bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 transition-colors flex items-center gap-1"
                    >
                      <span>+</span>
                      <span>{showQuickPromptBox ? 'Close Quick Entry' : 'Quick Append'}</span>
                    </button>

                    {form.promptHistory && (
                      <button
                        type="button"
                        onClick={handleCopyPromptHistory}
                        className="px-2.5 py-1 rounded text-xs font-mono text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                        <span>{copyHistoryToast ? 'Prompts Copied!' : 'Copy All Prompts'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Append Panel */}
                {showQuickPromptBox && (
                  <div className="bg-surface-column border border-purple-500/30 rounded-xl p-3.5 space-y-3 animate-fade-in shadow-md">
                    <div className="flex items-center justify-between text-xs text-text-primary font-medium">
                      <span className="flex items-center gap-1.5 text-purple-300">
                        <span>⚡</span>
                        <span>Append Prompt to History Log</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-text-muted font-normal">Tool:</label>
                        <select
                          value={quickPromptTool}
                          onChange={(e) => setQuickPromptTool(e.target.value)}
                          className="bg-surface-card border border-border-subtle rounded px-2 py-0.5 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                        >
                          {AI_TOOLS.map((tool) => (
                            <option key={tool} value={tool}>{tool}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      autoFocus
                      placeholder="Paste the prompt you just sent to the AI assistant..."
                      value={quickPromptText}
                      onChange={(e) => setQuickPromptText(e.target.value)}
                      className="w-full bg-[#121316] font-mono text-xs text-text-primary border border-border-subtle rounded-lg p-2.5 focus:outline-none focus:border-purple-400 placeholder:text-text-muted/40"
                    />

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowQuickPromptBox(false)}
                        className="px-3 py-1 rounded text-xs text-text-muted hover:text-text-primary border border-border-subtle"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAppendPrompt}
                        disabled={!quickPromptText.trim()}
                        className="px-3.5 py-1 rounded text-xs font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <span>+ Append to Log</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Direct Prompt History Box Textarea */}
                <div className="relative">
                  <textarea
                    rows={activeTab === 'both' ? 12 : 20}
                    placeholder={`Paste the prompts you used into this prompt history box while working on the problem...\n\nExample:\n### [2026-10-26 14:15] Claude 3.5 Sonnet\nWrite an Express route to fetch all team members and their roles.\n\n---\n\n### [2026-10-26 14:32] Cursor\nRefactor the query to include joined_at date and order by role.\n\n---\n\n### [2026-10-26 15:05] ChatGPT\nHelp write the SQL migration to add prompt_history mediumtext to the tasks table.`}
                    value={form.promptHistory}
                    onChange={(e) => setForm({ ...form, promptHistory: e.target.value })}
                    className="w-full bg-[#121316] font-mono text-xs text-[#c0caf5] border border-border-subtle rounded-xl p-4 placeholder:text-text-muted/40 focus:outline-none focus:border-purple-400 leading-relaxed resize-y selection:bg-purple-600 selection:text-white"
                  />
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Prompt history log. Type or paste your exact prompts here as you iterate on the problem. Persisted in MariaDB MEDIUMTEXT to build your team audit log and Module 5 Vibe Coding History deliverable.
                </p>
              </div>
            )}
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

              {/* Type Selector */}
              <div>
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                  Category Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['feature', 'bug', 'urgent', 'additional'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`py-2 px-3 rounded-lg text-xs font-medium capitalize border flex items-center justify-center gap-2 transition-all ${
                        form.type === t
                          ? 'bg-brand-primary/15 text-brand-accent border-brand-primary shadow-sm'
                          : 'bg-surface-card text-text-muted border-border-subtle hover:bg-surface-elevated'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${t === 'bug' || t === 'urgent' ? 'bg-type-bug' : 'bg-type-feature'}`} />
                      {t}
                    </button>
                  ))}
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
                  {teamMembers.map((member) => (
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
  const [showDeliverablesPinned, setShowDeliverablesPinned] = useState(true);
  const [deliverablesStats, setDeliverablesStats] = useState({ ready: 0, completed: 0, total: 5 });

<<<<<<< HEAD
  // Accept invite handler
  const [inviteTokenParam] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    return params.get('token') || '';
  });
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [acceptError, setAcceptError] = useState('');
  const [acceptSuccess, setAcceptSuccess] = useState('');

=======
  // Filtering & Sorting State
  const [filterMyTasksOnly, setFilterMyTasksOnly] = useState(false);
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'deadline-asc' | 'deadline-desc' | 'created-desc' | 'created-asc'

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

>>>>>>> f13340f (context)
  async function handleAcceptInviteSubmit() {
    if (!inviteTokenParam) return;
    setAcceptingInvite(true);
    setAcceptError('');
    try {
      const res = await acceptInvite(inviteTokenParam);
      setAcceptSuccess(res.message || 'Successfully joined team!');
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-page text-text-muted flex items-center justify-center text-sm">
        Loading VibeTracker…
      </div>
    );
  }

  if (!token) {
    if (route === 'register') {
      return (
        <RegisterPage
          onRegister={async (fields) => {
            await register(fields);
            window.location.hash = '#/teams';
            setRoute('teams');
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
        onLogin={async (email, password) => {
          await login(email, password);
          window.location.hash = '#/teams';
          setRoute('teams');
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
      <div className="min-h-screen bg-[#1e1f22] text-[#dfe1e5] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#2b2d30] border border-[#3c3f41] rounded-lg p-6 text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Team Invitation</h2>
          {acceptSuccess ? (
            <p className="text-[#22c55e] text-sm">{acceptSuccess}</p>
          ) : (
            <>
              <p className="text-[#8c8fa3] text-sm">You have been invited to join a team on VibeTracker.</p>
              {acceptError && <p className="text-[#ef4444] text-sm">{acceptError}</p>}
              <button
                onClick={handleAcceptInviteSubmit}
                disabled={acceptingInvite}
                className="w-full bg-[#4c9ee8] hover:bg-[#5aadff] text-white py-2 rounded text-sm font-semibold transition-colors"
              >
                {acceptingInvite ? 'Joining…' : 'Accept Invitation'}
              </button>
            </>
          )}
          <button
            onClick={() => { window.location.hash = '#/teams'; setRoute('teams'); }}
            className="text-[#8c8fa3] hover:text-[#dfe1e5] text-xs underline"
          >
            Go to Teams Dashboard
          </button>
        </div>
      </div>
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

<<<<<<< HEAD
=======
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

>>>>>>> f13340f (context)
  // Active task editor view
  if (activeEditorTask) {
    return (
      <TaskEditorPage
        task={activeEditorTask}
        teamMembers={teamMembersList}
        onBack={() => setActiveEditorTask(null)}
        onSave={async (formData) => {
          if (activeEditorTask?.id) {
            await updateTask(activeEditorTask.id, formData);
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
    <div className="min-h-screen bg-surface-page text-text-primary p-6 flex flex-col">
      {/* Header with Team Switcher & User Profile */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text-primary">
                VibeTracker
              </h1>
              <span className="w-2 h-2 rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent" />
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Agile task & prompt tracker · Team Workspace
            </p>
          </div>

          {/* Active team pill / switcher */}
          <button
            onClick={() => { window.location.hash = '#/teams'; setRoute('teams'); }}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-column hover:bg-surface-elevated border border-border-subtle rounded-lg text-xs transition-colors"
            title="Switch team"
          >
            <span className="w-2 h-2 rounded-full bg-brand-primary" />
            <span className="font-semibold text-text-primary">{activeTeam?.name || 'Select Team'}</span>
            <span className="text-text-muted">▾</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Significance Timeline Legend (§2.3) */}
          <div className="hidden xl:flex items-center gap-3 text-[11px] font-mono text-text-muted bg-surface-column px-3 py-1.5 rounded-lg border border-border-subtle">
            <span className="text-text-muted/60 uppercase font-sans text-[10px] font-semibold">Urgency:</span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Today
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

          {/* Filter & Sort Controls */}
          <div className="flex items-center gap-2 bg-surface-column p-1 rounded-lg border border-border-subtle">
            {/* My Tasks Filter Toggle */}
            <button
              type="button"
              onClick={() => setFilterMyTasksOnly(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filterMyTasksOnly
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
              }`}
              title={filterMyTasksOnly ? 'Show all team tasks' : 'Show only tasks assigned to me'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>My Tasks</span>
              {filterMyTasksOnly && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 border-l border-border-subtle/80 pl-2 pr-1">
              <label htmlFor="task-sort-select" className="text-[10px] uppercase font-mono text-text-muted flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <span>Sort:</span>
              </label>
              <select
                id="task-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-surface-card border border-border-subtle/80 rounded px-2 py-0.5 text-xs text-text-primary focus:outline-none focus:border-brand-primary cursor-pointer"
              >
                <option value="deadline-asc">Deadline (Earliest first)</option>
                <option value="deadline-desc">Deadline (Latest first)</option>
                <option value="created-desc">Created (Newest first)</option>
                <option value="created-asc">Created (Oldest first)</option>
              </select>
            </div>
          </div>

          <span className="text-xs font-mono text-text-muted bg-surface-column px-2.5 py-1 rounded-md border border-border-subtle">
            {displayedTasks.length}{filterMyTasksOnly ? ` / ${tasks.length}` : ''} {displayedTasks.length === 1 ? 'task' : 'tasks'}
          </span>

          {/* Deliverables & Milestones Board Toggle (PRD §3.3) */}
          <button
<<<<<<< HEAD
=======
            type="button"
            onClick={() => setShowDeliverablesPinned(prev => !prev)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              showDeliverablesPinned
                ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                : 'bg-surface-column hover:bg-surface-elevated text-text-primary border-border-subtle hover:border-[#4e5157]'
            }`}
            title="Toggle Pinned Deliverables & Milestones Board (PRD §3.3)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span className="hidden sm:inline">Deliverables</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${
                showDeliverablesPinned
                  ? 'bg-white/20 text-white border-white/30 font-semibold'
                  : 'bg-surface-elevated text-text-muted border-border-subtle'
              }`}
            >
              {deliverablesStats.ready}/{deliverablesStats.total}
            </span>
            <span className="text-[10px] opacity-75">{showDeliverablesPinned ? '▲' : '▼'}</span>
          </button>

          <button
>>>>>>> f13340f (context)
            onClick={() => setActiveEditorTask({
              status: 'todo',
              type: 'feature',
              assignee: teamMembersList[0] || user?.name || '',
              description: '',
              context: '',
              contextTool: user?.defaultLlmTool || 'Claude',
<<<<<<< HEAD
=======
              promptHistory: '',
>>>>>>> f13340f (context)
            })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
          >
            <span>+</span>
            <span>Add Task</span>
          </button>

          {/* Profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-border-subtle">
            <button
              onClick={() => { window.location.hash = '#/profile'; setRoute('profile'); }}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-surface-column transition-colors text-xs"
              title="Edit Profile"
            >
              <div className="w-6 h-6 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center font-bold text-[11px]">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline font-medium text-text-primary">{user?.name}</span>
            </button>

            <button
              onClick={() => {
                logout();
                window.location.hash = '#/login';
                setRoute('login');
              }}
              className="text-text-muted hover:text-type-bug text-xs px-2 py-1 rounded transition-colors"
              title="Sign out"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Database Error Banner (if offline) */}
      {tasksError && (
        <div className="mb-4 rounded-md border border-due-warning/40 bg-due-warning/10 p-3 text-xs text-due-warning flex items-center justify-between">
          <span>
            API error: {tasksError}. Ensure backend server is running (<code className="font-mono bg-surface-page px-1 rounded">npm run server</code>).
          </span>
        </div>
      )}

      {!activeTeam ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <p className="text-text-muted text-sm mb-4">No team selected.</p>
          <button
            onClick={() => { window.location.hash = '#/teams'; setRoute('teams'); }}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-semibold"
          >
            Go to Teams Dashboard
          </button>
        </div>
      ) : tasksLoading ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Loading tasks for {activeTeam.name}…
        </div>
      ) : (
<<<<<<< HEAD
        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              tasks={tasks}
              onTaskClick={setActiveEditorTask}
              onAddTask={(status) => setActiveEditorTask({
                status,
                type: 'feature',
                assignee: teamMembersList[0] || user?.name || '',
                description: '',
                context: '',
                contextTool: user?.defaultLlmTool || 'Claude',
              })}
            />
          ))}
        </main>
=======
        <>
          {/* Pinned Deliverables & Milestones Board (PRD §3.3) */}
          <DeliverablesPinnedBoard
            token={token}
            teamId={activeTeamId}
            teamName={activeTeam?.name || 'Workspace'}
            isCreator={isTeamCreator}
            isOpen={showDeliverablesPinned}
            onToggle={() => setShowDeliverablesPinned(prev => !prev)}
            onStatsChange={handleDeliverablesStatsChange}
          />

          <main className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                tasks={displayedTasks}
                onTaskClick={setActiveEditorTask}
                onAddTask={(status) => setActiveEditorTask({
                  status,
                  type: 'feature',
                  assignee: teamMembersList[0] || user?.name || '',
                  description: '',
                  context: '',
                  contextTool: user?.defaultLlmTool || 'Claude',
                  promptHistory: '',
                })}
              />
            ))}
          </main>
        </>
>>>>>>> f13340f (context)
      )}
    </div>
  );
}
