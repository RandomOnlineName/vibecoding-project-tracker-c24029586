import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';

const PORT = Number(process.env.PORT || 3001);

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'vibetracker',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vibetracker',
  waitForConnections: true,
  connectionLimit: 10,
  // Return DATE columns as 'YYYY-MM-DD' strings, matching the Task data model.
  dateStrings: ['DATE'],
});

const TYPES = ['feature', 'bug'];
const STATUSES = ['todo', 'in-progress', 'review', 'done'];
const ANCHOR_IDS = ['presentation', 'demo', 'report', 'documentation'];

// DB row -> Task shape from PRD §5
function rowToTask(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    status: r.status,
    assignee: r.assignee,
    dueDate: r.due_date,
    createdDate: r.created_date,
    context: r.context,
    contextTool: r.context_tool,
    contextUpdatedAt: r.context_updated_at
      ? new Date(r.context_updated_at).toISOString()
      : null,
  };
}

function toMysqlDatetime(iso) {
  return iso ? new Date(iso) : null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Validate + normalise an incoming task body. Returns { error } or { task }.
function parseTask(body, { partial = false } = {}) {
  const t = {};
  const has = (k) => body[k] !== undefined;

  if (!partial || has('title')) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return { error: 'title is required' };
    }
    t.title = body.title.trim().slice(0, 255);
  }
  if (!partial || has('description')) t.description = String(body.description ?? '');
  if (!partial || has('type')) {
    const v = body.type ?? 'feature';
    if (!TYPES.includes(v)) return { error: `type must be one of ${TYPES.join(', ')}` };
    t.type = v;
  }
  if (!partial || has('status')) {
    const v = body.status ?? 'todo';
    if (!STATUSES.includes(v)) return { error: `status must be one of ${STATUSES.join(', ')}` };
    t.status = v;
  }
  if (!partial || has('assignee')) t.assignee = String(body.assignee ?? '').slice(0, 100);
  if (!partial || has('dueDate')) {
    const v = body.dueDate || null;
    if (v !== null && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return { error: 'dueDate must be YYYY-MM-DD or null' };
    }
    t.due_date = v;
  }
  if (!partial || has('createdDate')) {
    const v = body.createdDate || today();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: 'createdDate must be YYYY-MM-DD' };
    t.created_date = v;
  }
  if (!partial || has('context')) t.context = String(body.context ?? '');
  if (!partial || has('contextTool')) t.context_tool = body.contextTool || null;
  if (!partial || has('contextUpdatedAt')) {
    t.context_updated_at = toMysqlDatetime(body.contextUpdatedAt);
  }
  return { task: t };
}

const app = express();
app.use(express.json({ limit: '1mb' }));

// Wrap async handlers so errors reach the error middleware.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/api/health', wrap(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
}));

// ---- Tasks ----
app.get('/api/tasks', wrap(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM tasks ORDER BY created_date, id');
  res.json(rows.map(rowToTask));
}));

app.post('/api/tasks', wrap(async (req, res) => {
  const { error, task } = parseTask(req.body || {});
  if (error) return res.status(400).json({ error });
  task.id = String(req.body.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  await pool.query('INSERT INTO tasks SET ?', [task]);
  const [[row]] = await pool.query('SELECT * FROM tasks WHERE id = ?', [task.id]);
  res.status(201).json(rowToTask(row));
}));

app.put('/api/tasks/:id', wrap(async (req, res) => {
  const { error, task } = parseTask(req.body || {}, { partial: true });
  if (error) return res.status(400).json({ error });
  if (Object.keys(task).length === 0) return res.status(400).json({ error: 'no fields to update' });
  const [result] = await pool.query('UPDATE tasks SET ? WHERE id = ?', [task, req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'task not found' });
  const [[row]] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  res.json(rowToTask(row));
}));

app.delete('/api/tasks/:id', wrap(async (req, res) => {
  const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'task not found' });
  res.status(204).end();
}));

// ---- Anchors ----
app.get('/api/anchors', wrap(async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, label, url FROM anchors ORDER BY FIELD(id, 'presentation','demo','report','documentation')"
  );
  res.json(rows);
}));

app.put('/api/anchors/:id', wrap(async (req, res) => {
  if (!ANCHOR_IDS.includes(req.params.id)) return res.status(404).json({ error: 'unknown anchor' });
  const url = req.body?.url ? String(req.body.url).slice(0, 2048) : null;
  await pool.query('UPDATE anchors SET url = ? WHERE id = ?', [url, req.params.id]);
  const [[row]] = await pool.query('SELECT id, label, url FROM anchors WHERE id = ?', [req.params.id]);
  res.json(row);
}));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
