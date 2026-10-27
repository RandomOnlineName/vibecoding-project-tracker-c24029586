import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import { seedDatabase } from './seed.js';
import { sqlitePool } from './sqlite-db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT      = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'vibetracker-dev-secret-change-in-prod';
const JWT_EXPIRY = '7d';
const INVITE_EXPIRY_DAYS = 7;

const useSqlite = process.env.DB_CLIENT === 'sqlite' || process.env.VERCEL === '1' || process.env.DB_USE_SQLITE === 'true';

const dbSsl = process.env.DB_SSL === 'true'
  ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' }
  : undefined;

const pool = useSqlite
  ? sqlitePool
  : mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'vibetracker',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'vibetracker',
      waitForConnections: true,
      connectionLimit: 10,
      ssl: dbSsl,
      // Return DATE columns as 'YYYY-MM-DD' strings, matching the Task data model.
      dateStrings: ['DATE'],
      multipleStatements: true,
    });

async function initDb() {
  try {
    if (useSqlite) {
      console.log('📦 Using SQLite engine (Option 1: Serverless / In-Memory / File in /tmp)...');
      const schemaPath = path.join(__dirname, 'schema.sqlite.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
      }
      const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
      const count = users[0]?.count || 0;
      if (count === 0 || process.env.DB_RESET_ON_BOOT === 'true' || process.env.RESET_ON_BOOT === 'true') {
        console.log('🔄 Regenerating demo dataset on startup...');
        await seedDatabase(pool, { delay: 0 });
      }
      console.log('SQLite database initialized successfully.');
      return;
    }
    if (process.env.DB_SKIP_CREATE !== 'true') {
      try {
        const tempConn = await mysql.createConnection({
          host: process.env.DB_HOST || '127.0.0.1',
          port: Number(process.env.DB_PORT || 3306),
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          ssl: dbSsl,
        });
        const dbName = process.env.DB_NAME || 'vibetracker';
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await tempConn.end();
      } catch (createErr) {
        // Many managed cloud databases do not permit CREATE DATABASE; log and proceed
        console.warn('Notice: Could not execute CREATE DATABASE (expected if using managed cloud DB):', createErr.message);
      }
    }

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
    }

    // Ensure columns team_id, created_by, and prompt_history exist on tasks table
    await pool.query(`ALTER TABLE tasks ADD COLUMN team_id VARCHAR(36) NULL;`).catch(() => {});
    await pool.query(`ALTER TABLE tasks ADD COLUMN created_by VARCHAR(36) NULL;`).catch(() => {});
    await pool.query(`ALTER TABLE tasks ADD COLUMN prompt_history MEDIUMTEXT NULL;`).catch(() => {});

    // Ensure team_deliverables table exists (PRD §3.3)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_deliverables (
        team_id     VARCHAR(36)  NOT NULL,
        id          VARCHAR(32)  NOT NULL,
        label       VARCHAR(100) NOT NULL,
        url         VARCHAR(2048) NULL,
        status      ENUM('not-started','in-progress','completed') NOT NULL DEFAULT 'not-started',
        updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (team_id, id),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `).catch(() => {});

    // Option 2: Automatic regenerate / seed on boot for testing
    if (process.env.DB_RESET_ON_BOOT === 'true' || process.env.RESET_ON_BOOT === 'true') {
      console.log('🔄 DB_RESET_ON_BOOT=true: Regenerating demo dataset on startup...');
      await seedDatabase(pool, { delay: 0 });
    } else {
      // Migrate orphaned tasks to Default Team
      const [users] = await pool.query('SELECT id FROM users LIMIT 1');
      const vUserId = users[0]?.id || null;
      const vTeamId = 'default-team-0000-0000-000000000000';

      const [teams] = await pool.query('SELECT 1 FROM teams WHERE id = ?', [vTeamId]);
      if (teams.length === 0) {
        await pool.query(
          'INSERT INTO teams (id, name, description, created_by, created_at) VALUES (?, ?, ?, ?, NOW())',
          [vTeamId, 'Default Team', 'Auto-created during migration', vUserId]
        );
        if (vUserId) {
          await pool.query(
            'INSERT IGNORE INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
            [vTeamId, vUserId, 'owner']
          );
        }
      }
      await pool.query('UPDATE tasks SET team_id = ? WHERE team_id IS NULL', [vTeamId]);
    }

    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPES    = ['feature', 'bug', 'urgent', 'additional'];
const STATUSES = ['todo', 'in-progress', 'review', 'done'];
const ANCHOR_IDS = ['presentation', 'demo', 'report', 'documentation'];


const PRD_DELIVERABLES = [
  { id: 'presentation',  label: 'Presentation Slides' },
  { id: 'demo',          label: 'Live Demo & Video Walkthrough' },
  { id: 'report',        label: 'Project Report' },
  { id: 'documentation', label: 'Documentation & Architecture' },
  { id: 'deployment',    label: 'Live Deployment URL' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uuid() {
  return crypto.randomUUID();
}

function shortId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toMysqlDatetime(iso) {
  return iso ? new Date(iso) : null;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToTask(r) {
  return {
    id:               r.id,
    teamId:           r.team_id,
    createdBy:        r.created_by,
    title:            r.title,
    description:      r.description,
    type:             r.type,
    status:           r.status,
    assignee:         r.assignee,
    dueDate:          r.due_date,
    createdDate:      r.created_date,
    context:          r.context,
    contextTool:      r.context_tool,
    contextUpdatedAt: r.context_updated_at
      ? new Date(r.context_updated_at).toISOString()
      : null,

    promptHistory:    r.prompt_history || '',
  };
}

function rowToUser(r, { includePrivate = false } = {}) {
  const u = {
    id:             r.id,
    name:           r.name,
    email:          r.email,
    githubHandle:   r.github_handle,
    vsCodeProfile:  r.vscode_profile,
    defaultLlmTool: r.default_llm_tool,
    createdAt:      r.created_at,
  };
  return u;
}

function rowToTeam(r) {
  return {
    id:          r.id,
    name:        r.name,
    description: r.description,
    createdBy:   r.created_by,
    createdAt:   r.created_at,
  };
}

// ─── Task parser / validator ──────────────────────────────────────────────────

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
  if (!partial || has('assignee'))  t.assignee = String(body.assignee ?? '').slice(0, 100);
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
  if (!partial || has('context'))     t.context = String(body.context ?? '');
  if (!partial || has('contextTool')) t.context_tool = body.contextTool || null;
  if (!partial || has('contextUpdatedAt')) {
    t.context_updated_at = toMysqlDatetime(body.contextUpdatedAt);
  }
  if (!partial || has('promptHistory')) t.prompt_history = String(body.promptHistory ?? '');
  return { task: t };
}

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json({ limit: '16mb' }));

// Wrap async handlers so errors reach the error middleware.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── Auth middleware ───────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'invalid or expired token' });
  }
}

// Helper: ensure the authenticated user is a member of the requested team.
async function requireTeamMember(req, res, teamId) {
  const [[row]] = await pool.query(
    'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
    [teamId, req.user.id]
  );
  if (!row) {
    res.status(403).json({ error: 'not a member of this team' });
    return null;
  }
  return row.role; // 'owner' | 'member'
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/api/health', wrap(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
}));

// ─── Auth: Register ───────────────────────────────────────────────────────────

app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password, githubHandle, vsCodeProfile, defaultLlmTool } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim())
    return res.status(400).json({ error: 'name is required' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'valid email is required' });
  if (!password || password.length < 8)
    return res.status(400).json({ error: 'password must be at least 8 characters' });

  const [[existing]] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existing) return res.status(409).json({ error: 'an account with this email already exists' });

  const passwordHash = await bcrypt.hash(password, 12);
  const id = uuid();

  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, github_handle, vscode_profile, default_llm_tool)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, name.trim(), email.toLowerCase(), passwordHash,
     githubHandle || null, vsCodeProfile || null, defaultLlmTool || null]
  );

  // Check if there's a pending invite for this email — auto-accept them all
  const [invites] = await pool.query(
    `SELECT id, team_id FROM invitations WHERE email = ? AND status = 'pending' AND expires_at > NOW()`,
    [email.toLowerCase()]
  );
  for (const inv of invites) {
    await pool.query('INSERT IGNORE INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
      [inv.team_id, id, 'member']);
    await pool.query("UPDATE invitations SET status = 'accepted' WHERE id = ?", [inv.id]);
  }

  const [[row]] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  const token = jwt.sign({ id, email: email.toLowerCase() }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  res.status(201).json({ token, user: rowToUser(row) });
}));

// ─── Auth: Login ──────────────────────────────────────────────────────────────

app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const [[row]] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  if (!row) return res.status(401).json({ error: 'invalid email or password' });

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return res.status(401).json({ error: 'invalid email or password' });

  const token = jwt.sign({ id: row.id, email: row.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  res.json({ token, user: rowToUser(row) });
}));

// ─── Auth: Me (get + update profile) ─────────────────────────────────────────

app.get('/api/auth/me', requireAuth, wrap(async (req, res) => {
  const [[row]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!row) return res.status(404).json({ error: 'user not found' });
  res.json(rowToUser(row));
}));

app.put('/api/auth/me', requireAuth, wrap(async (req, res) => {
  const { name, githubHandle, vsCodeProfile, defaultLlmTool, password, currentPassword } = req.body || {};
  const updates = {};

  if (name !== undefined) updates.name = String(name).trim().slice(0, 100);
  if (githubHandle !== undefined)   updates.github_handle   = githubHandle   || null;
  if (vsCodeProfile !== undefined)  updates.vscode_profile  = vsCodeProfile  || null;
  if (defaultLlmTool !== undefined) updates.default_llm_tool = defaultLlmTool || null;

  // Password change: requires current password
  if (password) {
    if (!currentPassword) return res.status(400).json({ error: 'currentPassword is required to change password' });
    const [[row]] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, row.password_hash);
    if (!valid) return res.status(401).json({ error: 'current password is incorrect' });
    if (password.length < 8) return res.status(400).json({ error: 'new password must be at least 8 characters' });
    updates.password_hash = await bcrypt.hash(password, 12);
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'no fields to update' });

  await pool.query('UPDATE users SET ? WHERE id = ?', [updates, req.user.id]);
  const [[row]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json(rowToUser(row));
}));

// ─── Teams ────────────────────────────────────────────────────────────────────

// List teams the current user belongs to
app.get('/api/teams', requireAuth, wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT t.*, tm.role
     FROM teams t
     JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = ?
     ORDER BY t.created_at`,
    [req.user.id]
  );
  res.json(rows.map(r => ({ ...rowToTeam(r), role: r.role })));
}));

// Create a team
app.post('/api/teams', requireAuth, wrap(async (req, res) => {
  const { name, description } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim())
    return res.status(400).json({ error: 'team name is required' });

  const id = uuid();
  await pool.query(
    'INSERT INTO teams (id, name, description, created_by) VALUES (?, ?, ?, ?)',
    [id, name.trim(), description || null, req.user.id]
  );
  // Creator becomes owner
  await pool.query(
    'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
    [id, req.user.id, 'owner']
  );
  const [[row]] = await pool.query('SELECT * FROM teams WHERE id = ?', [id]);
  res.status(201).json({ ...rowToTeam(row), role: 'owner' });
}));

// Get team detail + members
app.get('/api/teams/:id', requireAuth, wrap(async (req, res) => {
  const role = await requireTeamMember(req, res, req.params.id);
  if (!role) return;

  const [[team]] = await pool.query('SELECT * FROM teams WHERE id = ?', [req.params.id]);
  if (!team) return res.status(404).json({ error: 'team not found' });

  const [members] = await pool.query(
    `SELECT u.id, u.name, u.email, u.github_handle, u.default_llm_tool, tm.role, tm.joined_at
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = ?
     ORDER BY tm.joined_at`,
    [req.params.id]
  );

  res.json({
    ...rowToTeam(team),
    role,
    members: members.map(m => ({
      id:            m.id,
      name:          m.name,
      email:         m.email,
      githubHandle:  m.github_handle,
      defaultLlmTool: m.default_llm_tool,
      role:          m.role,
      joinedAt:      m.joined_at,
    })),
  });
}));

// Update team (owners only)
app.put('/api/teams/:id', requireAuth, wrap(async (req, res) => {
  const role = await requireTeamMember(req, res, req.params.id);
  if (!role) return;
  if (role !== 'owner') return res.status(403).json({ error: 'only team owners can edit team settings' });

  const { name, description } = req.body || {};
  const updates = {};
  if (name !== undefined)        updates.name        = String(name).trim().slice(0, 100);
  if (description !== undefined) updates.description = description || null;
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'no fields to update' });

  await pool.query('UPDATE teams SET ? WHERE id = ?', [updates, req.params.id]);
  const [[row]] = await pool.query('SELECT * FROM teams WHERE id = ?', [req.params.id]);
  res.json({ ...rowToTeam(row), role });
}));

// ─── Invitations ──────────────────────────────────────────────────────────────

// Invite someone by email
app.post('/api/teams/:id/invite', requireAuth, wrap(async (req, res) => {
  const role = await requireTeamMember(req, res, req.params.id);
  if (!role) return;

  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'valid email is required' });

  const normalizedEmail = email.toLowerCase();

  // Check if they're already a member
  const [[existingUser]] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existingUser) {
    const [[alreadyMember]] = await pool.query(
      'SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?',
      [req.params.id, existingUser.id]
    );
    if (alreadyMember) return res.status(409).json({ error: 'this user is already a team member' });

    // Auto-add if they already have an account
    await pool.query('INSERT IGNORE INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
      [req.params.id, existingUser.id, 'member']);
    return res.json({ added: true, message: 'existing user added to team directly' });
  }

  // Check for existing pending invite
  const [[existingInvite]] = await pool.query(
    "SELECT id FROM invitations WHERE team_id = ? AND email = ? AND status = 'pending' AND expires_at > NOW()",
    [req.params.id, normalizedEmail]
  );
  if (existingInvite) return res.status(409).json({ error: 'a pending invite already exists for this email' });

  const inviteToken = crypto.randomBytes(32).toString('hex');
  const inviteId    = uuid();
  const expiresAt   = addDays(new Date(), INVITE_EXPIRY_DAYS);

  await pool.query(
    `INSERT INTO invitations (id, team_id, email, invited_by, token, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [inviteId, req.params.id, normalizedEmail, req.user.id, inviteToken, expiresAt]
  );

  res.status(201).json({
    message: `Invitation created for ${email}`,
    // Return the token so the frontend can build a shareable link
    inviteToken,
    expiresAt: expiresAt.toISOString(),
  });
}));

// Accept invitation by token
app.post('/api/invitations/accept', requireAuth, wrap(async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token is required' });

  const [[inv]] = await pool.query(
    "SELECT * FROM invitations WHERE token = ? AND status = 'pending' AND expires_at > NOW()",
    [token]
  );
  if (!inv) return res.status(404).json({ error: 'invite not found or expired' });

  // Verify the logged-in user's email matches the invite (or allow any logged-in user to accept)
  await pool.query('INSERT IGNORE INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
    [inv.team_id, req.user.id, 'member']);
  await pool.query("UPDATE invitations SET status = 'accepted' WHERE id = ?", [inv.id]);

  const [[team]] = await pool.query('SELECT * FROM teams WHERE id = ?', [inv.team_id]);
  res.json({ message: 'You have joined the team!', team: rowToTeam(team) });
}));

// ─── Tasks (team-scoped) ──────────────────────────────────────────────────────

app.get('/api/tasks', requireAuth, wrap(async (req, res) => {
  const { teamId } = req.query;
  if (!teamId) return res.status(400).json({ error: 'teamId query param is required' });

  const role = await requireTeamMember(req, res, teamId);
  if (!role) return;

  const [rows] = await pool.query(
    'SELECT * FROM tasks WHERE team_id = ? ORDER BY created_date, id',
    [teamId]
  );
  res.json(rows.map(rowToTask));
}));

app.post('/api/tasks', requireAuth, wrap(async (req, res) => {
  const { teamId } = req.body || {};
  if (!teamId) return res.status(400).json({ error: 'teamId is required' });

  const role = await requireTeamMember(req, res, teamId);
  if (!role) return;

  const { error, task } = parseTask(req.body || {});
  if (error) return res.status(400).json({ error });

  task.id         = String(req.body.id || shortId());
  task.team_id    = teamId;
  task.created_by = req.user.id;

  await pool.query('INSERT INTO tasks SET ?', [task]);
  const [[row]] = await pool.query('SELECT * FROM tasks WHERE id = ?', [task.id]);
  res.status(201).json(rowToTask(row));
}));

app.put('/api/tasks/:id', requireAuth, wrap(async (req, res) => {
  // Load task to verify team membership
  const [[existing]] = await pool.query('SELECT team_id FROM tasks WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'task not found' });

  const role = await requireTeamMember(req, res, existing.team_id);
  if (!role) return;

  const { error, task } = parseTask(req.body || {}, { partial: true });
  if (error) return res.status(400).json({ error });
  if (Object.keys(task).length === 0) return res.status(400).json({ error: 'no fields to update' });

  await pool.query('UPDATE tasks SET ? WHERE id = ?', [task, req.params.id]);
  const [[row]] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  res.json(rowToTask(row));
}));

app.delete('/api/tasks/:id', requireAuth, wrap(async (req, res) => {
  const [[existing]] = await pool.query('SELECT team_id FROM tasks WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'task not found' });

  const role = await requireTeamMember(req, res, existing.team_id);
  if (!role) return;

  await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.status(204).end();
}));


// ─── Team Deliverables & Milestones (PRD §3.3) ────────────────────────────────

// Get all deliverables for a team (seeded if new)
app.get('/api/teams/:id/deliverables', requireAuth, wrap(async (req, res) => {
  const role = await requireTeamMember(req, res, req.params.id);
  if (!role) return;

  const [existing] = await pool.query(
    'SELECT id, label, url, status, updated_at FROM team_deliverables WHERE team_id = ?',
    [req.params.id]
  );

  const existingMap = new Map(existing.map(d => [d.id, d]));
  for (const def of PRD_DELIVERABLES) {
    if (!existingMap.has(def.id)) {
      await pool.query(
        'INSERT IGNORE INTO team_deliverables (team_id, id, label, url, status) VALUES (?, ?, ?, NULL, ?)',
        [req.params.id, def.id, def.label, 'not-started']
      );
    }
  }

  const [rows] = await pool.query(
    `SELECT id, label, url, status, updated_at
     FROM team_deliverables
     WHERE team_id = ?
     ORDER BY FIELD(id, 'presentation', 'demo', 'report', 'documentation', 'deployment')`,
    [req.params.id]
  );

  res.json({
    role,
    canEdit: role === 'owner',
    deliverables: rows.map(r => ({
      id: r.id,
      label: r.label,
      url: r.url || '',
      status: r.status,
      updatedAt: r.updated_at,
    })),
  });
}));

// Update a team deliverable (Only the creator / owner of the development team can update)
app.put('/api/teams/:id/deliverables/:deliverableId', requireAuth, wrap(async (req, res) => {
  const role = await requireTeamMember(req, res, req.params.id);
  if (!role) return;

  if (role !== 'owner') {
    return res.status(403).json({ error: 'Only the creator of the development team can store or update deliverables.' });
  }

  const { url, status, label } = req.body || {};
  const validStatuses = ['not-started', 'in-progress', 'completed'];

  const updates = {};
  if (url !== undefined) {
    const cleanUrl = String(url || '').trim();
    updates.url = cleanUrl ? cleanUrl.slice(0, 2048) : null;
  }
  if (status !== undefined) {
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }
    updates.status = status;
  }
  if (label !== undefined && String(label).trim()) {
    updates.label = String(label).trim().slice(0, 100);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'no valid fields to update' });
  }

  const [[existing]] = await pool.query(
    'SELECT id FROM team_deliverables WHERE team_id = ? AND id = ?',
    [req.params.id, req.params.deliverableId]
  );

  if (!existing) {
    const defaultLabel = PRD_DELIVERABLES.find(d => d.id === req.params.deliverableId)?.label || req.params.deliverableId;
    await pool.query(
      'INSERT INTO team_deliverables (team_id, id, label, url, status) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, req.params.deliverableId, updates.label || defaultLabel, updates.url || null, updates.status || 'not-started']
    );
  } else {
    await pool.query(
      'UPDATE team_deliverables SET ? WHERE team_id = ? AND id = ?',
      [updates, req.params.id, req.params.deliverableId]
    );
  }

  const [[row]] = await pool.query(
    'SELECT id, label, url, status, updated_at FROM team_deliverables WHERE team_id = ? AND id = ?',
    [req.params.id, req.params.deliverableId]
  );

  res.json({
    id: row.id,
    label: row.label,
    url: row.url || '',
    status: row.status,
    updatedAt: row.updated_at,
  });
}));

// ─── Anchors ──────────────────────────────────────────────────────────────────

app.get('/api/anchors', requireAuth, wrap(async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, label, url FROM anchors ORDER BY FIELD(id, 'presentation','demo','report','documentation')"
  );
  res.json(rows);
}));

app.put('/api/anchors/:id', requireAuth, wrap(async (req, res) => {
  if (!ANCHOR_IDS.includes(req.params.id)) return res.status(404).json({ error: 'unknown anchor' });
  const url = req.body?.url ? String(req.body.url).slice(0, 2048) : null;
  await pool.query('UPDATE anchors SET url = ? WHERE id = ?', [url, req.params.id]);
  const [[row]] = await pool.query('SELECT id, label, url FROM anchors WHERE id = ?', [req.params.id]);
  res.json(row);
}));

// ─── Global error handler ─────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

app.use((_req, res) => res.status(404).json({ error: 'not found' }));

export const initDbPromise = initDb();

if (process.env.VERCEL !== '1' && !process.env.NOW_REGION) {
  initDbPromise.then(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`API listening on http://localhost:${PORT}`));
  });
}

export default app;
