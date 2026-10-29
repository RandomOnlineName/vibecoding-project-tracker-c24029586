/**
 * VibeTracker — Demo Seed Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Usage:    node server/seed.js
 * npm run:  npm run db:seed
 *
 * ⚠  WARNING: This script DROPS all task, team, user, and deliverable data
 *    and replaces it with a realistic demo dataset. Run it only against a
 *    development database.
 *
 * Demo credentials (all passwords = "password123"):
 *   teammate.a@vibetrack.dev    — Team Owner / Creator
 *   teammate.b@vibetrack.dev
 *   teammate.c@vibetrack.dev
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── DB Connection ────────────────────────────────────────────────────────────

const dbSsl = process.env.DB_SSL === 'true'
  ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' }
  : undefined;

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     Number(process.env.DB_PORT || 3306),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'vibetracker',
  waitForConnections: true,
  connectionLimit: 5,
  ssl: dbSsl,
  dateStrings: ['DATE'],
  multipleStatements: true,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uuid  = () => crypto.randomUUID();
const sid   = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── Log helpers ──────────────────────────────────────────────────────────────

const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const RED    = '\x1b[31m';
const DIM    = '\x1b[2m';
const RESET  = '\x1b[0m';

const log    = (msg)       => console.log(`${GREEN}✓${RESET} ${msg}`);
const info   = (msg)       => console.log(`${CYAN}→${RESET} ${msg}`);
const warn   = (msg)       => console.log(`${YELLOW}⚠${RESET} ${msg}`);
const divider = (label)    => console.log(`\n${DIM}─────────────────────────────────────────────${RESET}\n  ${label}\n${DIM}─────────────────────────────────────────────${RESET}`);

// ─── Main Seed ────────────────────────────────────────────────────────────────

export async function seedDatabase(targetPool = pool, { delay = 0 } = {}) {
  console.log(`\n${CYAN}╔══════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║       VibeTracker Demo Data Seeder           ║${RESET}`);
  console.log(`${CYAN}╚══════════════════════════════════════════════╝${RESET}\n`);

  warn('This will DELETE all existing users, teams, tasks, and deliverables.');
  info('Starting in 2 seconds... (Ctrl+C to abort)\n');
  if (delay > 0) { await new Promise(resolve => setTimeout(resolve, delay)); }

  const conn = await targetPool.getConnection();

  try {
    await conn.beginTransaction();

    // ── 1. Clear existing data (order respects FK constraints) ──────────────
    divider('Step 1: Clearing Existing Data');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('DELETE FROM team_deliverables');
    await conn.query('DELETE FROM tasks');
    await conn.query('DELETE FROM invitations');
    await conn.query('DELETE FROM team_members');
    await conn.query('DELETE FROM teams');
    await conn.query('DELETE FROM users');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    log('All tables cleared.');

    // ── 2. Create demo users ─────────────────────────────────────────────────
    divider('Step 2: Creating Demo Users');
    const passwordHash = await bcrypt.hash('password123', 10);

    const USERS = [
      {
        id: uuid(), name: 'Teammate A',   email: 'teammate.a@vibetrack.dev',
        github_handle: 'teammate-a',      vscode_profile: 'teammate.a',
        default_llm_tool: 'Claude',
      },
      {
        id: uuid(), name: 'Teammate B',   email: 'teammate.b@vibetrack.dev',
        github_handle: 'teammate-b',      vscode_profile: 'teammate.b',
        default_llm_tool: 'ChatGPT',
      },
      {
        // No GitHub handle, to show how assignees without one are displayed
        id: uuid(), name: 'Teammate C',   email: 'teammate.c@vibetrack.dev',
        github_handle: null,              vscode_profile: 'teammate.c',
        default_llm_tool: 'Cursor',
      },
    ];

    for (const u of USERS) {
      await conn.query(
        `INSERT INTO users (id, name, email, password_hash, github_handle, vscode_profile, default_llm_tool)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.name, u.email, passwordHash, u.github_handle, u.vscode_profile, u.default_llm_tool]
      );
      log(`User: ${u.name} <${u.email}>`);
    }

    const [teammateA, teammateB, teammateC] = USERS;

    // ── 3. Create the demo team ──────────────────────────────────────────────
    divider('Step 3: Creating Demo Team');
    const TEAM_ID = uuid();
    await conn.query(
      `INSERT INTO teams (id, name, description, created_by)
       VALUES (?, ?, ?, ?)`,
      [
        TEAM_ID,
        'UXD Hackathon 2026',
        'Vibecoding Project Tracker — UXD Hackathon team workspace. Building the agile task & prompt tracker in 3 hours.',
        teammateA.id,
      ]
    );
    log(`Team created: UXD Hackathon 2026 (ID: ${TEAM_ID})`);

    // Add all users to the team
    const memberRoles = [
      [teammateA.id, 'owner'],
      [teammateB.id, 'member'],
      [teammateC.id, 'member'],
    ];
    for (const [userId, role] of memberRoles) {
      await conn.query(
        'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
        [TEAM_ID, userId, role]
      );
    }
    log('All 3 team members joined.');

    // ── 4. Create 22 demo tasks ──────────────────────────────────────────────
    divider('Step 4: Inserting 22 Demo Tasks');

    const TASKS = [
      // ── DONE: Completed sprint tasks ──────────────────────────────────────
      {
        id: sid('task'), title: 'Set up Vite + React + Tailwind scaffold',
        description: 'Initialise the project with Vite, configure React plugin, Tailwind v3 with PostCSS, and verify hot-reload works on localhost:5173. Commit as `git-linked`.',
        type: 'feature', status: 'done', assignee: teammateA.name,
        due_date: dateOffset(-10), created_date: dateOffset(-14),
        context: `// Vite config for React + Tailwind
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3001' } },
});

// tailwind.config.js — extend with custom design tokens
// Run: npm install -D tailwindcss postcss autoprefixer @vitejs/plugin-react`,
        context_tool: 'Claude',
        prompt_history: `### [2026-10-20 09:15] Claude\nSet up a Vite + React + Tailwind CSS project from scratch. I need the vite.config.js to proxy /api calls to localhost:3001. Include the Tailwind config with a custom color palette for a dark developer IDE theme.`,
      },
      {
        id: sid('task'), title: 'Write and finalise PRD §1–§4',
        description: 'Review the pre-written PRD, fill in team-specific TODOs for sections 1–4. Verify data model fields (task fields, user/team fields, deliverable anchors). Tag as `prd-done`.',
        type: 'feature', status: 'done', assignee: teammateB.name,
        due_date: dateOffset(-9), created_date: dateOffset(-14),
        context: `PRD §3.2 Task Fields:
id, title, description, category, status (todo/in-progress/review/done),
assignee, dueDate, createdDate, context, contextTool, contextUpdatedAt

PRD §3.3 Deliverable Anchors:
presentation, demo, report, documentation, deployment`,
        context_tool: 'ChatGPT',
        prompt_history: `### [2026-10-20 10:30] ChatGPT\nReview this PRD draft and identify any gaps in the data model for a Kanban-style agile task tracker that also stores LLM prompt context per task. Focus on the task data fields and team structure.`,
      },
      {
        id: sid('task'), title: 'Design system: dark JetBrains/GitLab theme',
        description: 'Define full colour palette (surface hierarchy, brand tokens, type scale, significance scale), typography stack, component principles, and microcopy. Paste design tokens into tailwind.config.js. Tag as `design-done`.',
        type: 'feature', status: 'done', assignee: teammateC.name,
        due_date: dateOffset(-8), created_date: dateOffset(-13),
        context: `Design reference: JetBrains IDE dark theme + GitLab Dark
Surface hierarchy: #1e1f22 → #25272b → #2b2d30 → #323438
Brand: primary #3574f0, accent #60a5fa
Type scale: feature/bug dual-pill system
Urgency thermal: rose(today) → amber(5d) → sky(2w) → slate(later)`,
        context_tool: 'Cursor',
        prompt_history: `### [2026-10-20 11:00] Cursor
Design a dark-mode developer UI colour palette inspired by JetBrains IDE and GitLab Dark. I need:
1. Surface hierarchy (4 levels from background to card)
2. Brand primary/accent colours
3. Task category colours (feature, bug, urgent, additional)
4. Urgency/deadline significance colours (4 tiers)

### [2026-10-20 11:45] Cursor
Generate the Tailwind config extend block with all the colour tokens from the palette above, using semantic names like surface-page, surface-card, brand-primary, type-feature, etc.`,
      },
      {
        id: sid('task'), title: 'Build four-column Kanban board with mock data',
        description: 'Render the Kanban board with 4 STAGES (todo, in-progress, review, done). Add 3–4 mock tasks to verify column filtering. Implement STAGES constant and Task typedef. Tag as `data-model`.',
        type: 'feature', status: 'done', assignee: teammateA.name,
        due_date: dateOffset(-7), created_date: dateOffset(-12),
        context: `export const STAGES = [
  { id: 'todo', label: 'To Do', color: 'bg-slate-400' },
  { id: 'in-progress', label: 'In Progress', color: 'bg-brand-primary' },
  { id: 'review', label: 'Review', color: 'bg-due-warning' },
  { id: 'done', label: 'Done', color: 'bg-due-safe' },
];

// Task shape:
// { id, title, description, type, status, assignee, dueDate, createdDate, context, contextTool }`,
        context_tool: 'Claude',
        prompt_history: `### [2026-10-20 13:00] Claude
Write a React component KanbanColumn that takes a stage object and array of tasks, filters tasks by status, and renders TaskCard components. The column header should show the stage label, a task count badge, and a + Add Task button.`,
      },
      {
        id: sid('task'), title: 'CRUD modal: add, edit and delete tasks',
        description: 'Implement the full task editor page (full-page, not modal). Persist tasks via POST/PUT/DELETE to the Express API. Keyboard shortcut: Ctrl+S to save, Esc to close. Tag as `crud-modal`.',
        type: 'feature', status: 'done', assignee: teammateC.name,
        due_date: dateOffset(-5), created_date: dateOffset(-10),
        context: `Task Editor Layout (lg:col-span-12):
  Left (col-span-8): Title input, Description textarea, LLM Context textarea
  Right (col-span-4): Sticky properties sidebar
    - Stage selector (4 buttons)
    - Type selector (4 buttons: feature/bug/urgent/additional)
    - Assignee select
    - Due date picker with significance preview
    - Target AI Tool select
    - Danger zone: Delete with confirm

API endpoints:
  POST   /api/tasks
  PUT    /api/tasks/:id
  DELETE /api/tasks/:id`,
        context_tool: 'Gemini',
        prompt_history: `### [2026-10-21 09:30] Gemini
Build a full-page task editor React component for a Kanban tracker. It needs a two-column layout: left for task content (title, description, LLM context), right for a sticky properties sidebar (stage, type, assignee, due date, AI tool selector). Include keyboard shortcuts Ctrl+S to save and Esc to navigate back.

### [2026-10-21 11:00] Gemini
Add a delete confirmation zone to the task editor's sidebar that requires a two-click confirmation before deleting. Show a warning message: "Deleting this task will PERMANENTLY delete all context and history".`,
      },

      // ── IN PROGRESS: Active sprint tasks ──────────────────────────────────
      {
        id: sid('task'), title: 'Feature vs bug visual distinction on cards',
        description: 'Cards must use the dual-scale colour system: type pill (feature=blue, bug=orange, urgent=red, additional=purple) as the top badge. Significance stripe at the card bottom. Tag as `tag-style`.',
        type: 'feature', status: 'in-progress', assignee: teammateC.name,
        due_date: dateOffset(0), created_date: dateOffset(-6),
        context: `// Scale 1: Task Type Pill (top of card)
isBug = type === 'bug' || type === 'urgent'
className: isBug
  ? 'bg-type-bug/15 text-type-bug border-type-bug/30'
  : 'bg-type-feature/15 text-type-feature border-type-feature/30'

// Scale 2: Significance Stripe (bottom of card, h-1.5)
getTaskSignificance(task) returns { stripeClass, chipClass, dotColor, label }
Levels: today (rose), soon (amber), sprint (sky), later (slate)`,
        context_tool: 'Cursor',
        prompt_history: `### [2026-10-23 14:00] Cursor
Implement the dual-scale colour system for task cards in React + Tailwind. The top pill badge should show the task TYPE (feature/bug/urgent/additional) with translucent coloured backgrounds. A thin horizontal stripe at the bottom shows deadline URGENCY. These two colour scales should never conflict visually.`,
      },
      {
        id: sid('task'), title: 'Assignee badge and hand-off dropdown on cards',
        description: 'Each card shows a small avatar (initials) and the assignee name. Owner column in task editor should show all team members in a dropdown. Reassign via edit. Tag as `task-owner`.',
        type: 'feature', status: 'in-progress', assignee: teammateB.name,
        due_date: dateOffset(1), created_date: dateOffset(-5),
        context: `// Team members pulled from teamDetail.members[].name via useTeams hook
// Assignee displayed in card footer:
<span class="w-5 h-5 rounded-full bg-surface-elevated border flex items-center justify-center">
  {(task.assignee || 'Unassigned').slice(0, 2)}
</span>
<span>{task.assignee || 'Unassigned'}</span>

// Toast on handoff: "Handed off to {name}. Make sure they have necessary context."`,
        context_tool: 'ChatGPT',
        prompt_history: `### [2026-10-23 15:30] ChatGPT
Add an assignee avatar to each Kanban task card. The avatar should be a small circle showing the first two initials of the assignee's name. In the task editor, the assignee field should be a dropdown populated with team member names fetched from the API.`,
      },
      {
        id: sid('task'), title: 'Due-date urgency tinting on task cards',
        description: 'Cards change bottom stripe colour as deadlines approach: rose (overdue/today), amber (≤5 days), sky (≤14 days), slate (later/no date). Done tasks always use neutral slate. Tag as `due-tint`.',
        type: 'feature', status: 'in-progress', assignee: teammateC.name,
        due_date: dateOffset(2), created_date: dateOffset(-4),
        context: `// getTaskSignificance(task) function:
const diffDays = Math.round((due - todayDate) / (1000 * 60 * 60 * 24));

if (diffDays <= 0)  → 'today'  bg-rose-500  animate-pulse dot
if (diffDays <= 5)  → 'soon'   bg-amber-500
if (diffDays <= 14) → 'sprint' bg-sky-500
else                → 'later'  bg-slate-600

// Stripe element in TaskCard:
<div className={\`h-1.5 w-full rounded-full mt-2.5 \${significance.stripeClass}\`} />`,
        context_tool: 'Gemini',
        prompt_history: `### [2026-10-24 10:00] Gemini
Implement a deadline urgency calculation function getTaskSignificance(task) that returns colour classes based on how many days remain until the due date. Map: overdue/today → rose, ≤5 days → amber, ≤14 days → sky, later → slate. The result should drive both a bottom stripe on the card and a due date chip in the card header.`,
      },
      {
        id: sid('task'), title: 'LLM Context Window field on task editor',
        description: 'Add a full-height monospace textarea with dark background (#121316) for storing prompt context, logs, and API documentation per task. Include a character counter and "Copy Context" clipboard button. Tag as `context`.',
        type: 'feature', status: 'in-progress', assignee: teammateA.name,
        due_date: dateOffset(1), created_date: dateOffset(-3),
        context: `// Context textarea styling
className="bg-[#121316] font-mono text-xs text-[#a9b7c6] border border-border-subtle
  rounded-xl p-4 resize-y min-h-[350px] focus:border-brand-accent"

// Copy context handler
const handleCopyContext = async () => {
  await navigator.clipboard.writeText(form.context);
  setCopyToast(true);
  setTimeout(() => setCopyToast(false), 2500);
};

// MEDIUMTEXT persisted in MariaDB (up to 16MB)`,
        context_tool: 'Claude',
        prompt_history: `### [2026-10-23 16:00] Claude
Add an LLM Context Window field to the task editor. It should be a large monospace textarea styled like a code editor with a dark background (#121316 surface) and syntax-like text colour. Include a character counter above it and a "Copy Context" button that copies to clipboard and shows a 2.5-second toast confirmation.

### [2026-10-23 16:45] Claude
Now add a Prompt History Box below the LLM Context Window. This is a separate field where users paste the actual prompts they sent to AI tools while working on the task. Include a "⚡ Quick Append" button that lets users add a timestamped entry with the AI tool name.`,
      },

      // ── REVIEW: Tasks awaiting review ─────────────────────────────────────
      {
        id: sid('task'), title: 'JWT authentication — login, register, logout',
        description: 'Full JWT auth flow: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me. Token stored in localStorage. Route guard redirects unauthenticated users to login page. Password hashed with bcrypt (12 rounds).',
        type: 'feature', status: 'review', assignee: teammateA.name,
        due_date: dateOffset(-2), created_date: dateOffset(-8),
        context: `// JWT middleware
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'invalid or expired token' });
  }
}

// Token config
const JWT_EXPIRY = '7d';
const JWT_SECRET = process.env.JWT_SECRET || 'vibetracker-dev-secret-change-in-prod';`,
        context_tool: 'Claude',
        prompt_history: `### [2026-10-23 09:00] Claude
Implement JWT authentication for an Express.js API. I need: POST /auth/register (validate email, hash password with bcrypt 12 rounds, return token), POST /auth/login (compare hash, return token), GET /auth/me (return user from token). Use 7-day JWT expiry. Include the requireAuth middleware.

### [2026-10-23 10:30] Claude
Add a profile update endpoint PUT /auth/me that allows updating name, github_handle, vscode_profile, and default_llm_tool. If the user wants to change their password, require them to provide currentPassword first.`,
      },
      {
        id: sid('task'), title: 'Teams API: create, join, and list teams',
        description: 'Implement multi-team scoping. Users can create teams (becoming owner), invite members by email (with shareable invite tokens), and switch active team. Tasks are filtered by activeTeamId.',
        type: 'feature', status: 'review', assignee: teammateB.name,
        due_date: dateOffset(-1), created_date: dateOffset(-7),
        context: `// Team endpoints:
GET  /api/teams        - List teams user belongs to (with role)
POST /api/teams        - Create team, caller becomes owner
GET  /api/teams/:id    - Detail + member list (requires membership)
PUT  /api/teams/:id    - Update team name/description (owner only)

// Invitation flow:
POST /api/teams/:id/invite   - Generate invite token (64-byte hex), expires in 7 days
POST /api/invitations/accept - Accept by token, join team as member

// requireTeamMember(req, res, teamId) → returns 'owner' | 'member' | null`,
        context_tool: 'Cursor',
        prompt_history: `### [2026-10-23 11:00] Cursor
Build the teams API for a multi-tenant app. I need endpoints for: listing user's teams (JOIN through team_members), creating a team (creator gets 'owner' role automatically), and getting team detail including a full member list with roles. Each endpoint should verify the user is a team member using a requireTeamMember helper.

### [2026-10-23 12:00] Cursor
Add an invitation system. When inviting by email: if the user already has an account, add them directly. If not, create a pending invitation with a 64-byte random token and 7-day expiry. The accept endpoint should verify the token, add the user to the team, and mark the invitation as accepted.`,
      },

      // ── TODO: Upcoming features ────────────────────────────────────────────
      {
        id: sid('task'), title: 'One-click "Copy as Prompt Context" with rich formatting',
        description: 'The hero feature. Clicking "Copy as Prompt Context" should format the full task briefing — title, description, context, tool target, assignee, due date — into a structured markdown block ready to paste into any LLM chat interface. Tag as `copy-prompt`.',
        type: 'feature', status: 'todo', assignee: teammateB.name,
        due_date: dateOffset(3), created_date: dateOffset(-3),
        context: `// Formatted prompt output template:
---
## VibeTracker Task Context
**Task:** {title}
**Type:** {type} | **Status:** {status} | **Assignee:** {assignee}
**Due:** {dueDate || 'No deadline'} | **AI Tool:** {contextTool}

### Task Description & Acceptance Criteria
{description}

### Context, Logs & Documentation
{context}

### Prompt History (AI sessions used on this task)
{promptHistory}
---
// Prompt: "Using the above context, continue from where we left off..."`,
        context_tool: 'Claude',
        prompt_history: null,
      },
      {
        id: sid('task'), title: 'Project Deliverables & Milestones anchor board',
        description: 'Pin a collapsible Deliverables Board above the Kanban board. Shows 5 deliverable anchors (presentation, demo, report, documentation, deployment). Only team owner can set/update URLs. Members can open links. Tag as `project-deliverables`.',
        type: 'feature', status: 'todo', assignee: teammateC.name,
        due_date: dateOffset(4), created_date: dateOffset(-2),
        context: `// team_deliverables table (team_id, id, label, url, status, updated_at)
// Deliverable IDs: presentation | demo | report | documentation | deployment

// GET  /api/teams/:id/deliverables   — fetch & auto-seed for new teams
// PUT  /api/teams/:id/deliverables/:deliverableId — owner only, update url/status

// PRD §3.3 Deliverable Anchors:
// id='presentation'  label='Presentation Slides'
// id='demo'          label='Live Demo & Video Walkthrough'
// id='report'        label='Project Report'
// id='documentation' label='Documentation & Architecture'
// id='deployment'    label='Live Deployment URL'`,
        context_tool: 'ChatGPT',
        prompt_history: null,
      },
      {
        id: sid('task'), title: 'Connect Vercel deployment for live demo',
        description: 'Deploy frontend to Vercel free tier. Import GitHub fork, accept auto-detected Vite config, deploy. Add the resulting URL to the Deployment deliverable anchor. Test that the backend API (separate deploy or local tunnel) resolves correctly.',
        type: 'feature', status: 'todo', assignee: teammateC.name,
        due_date: dateOffset(5), created_date: dateOffset(-1),
        context: `// Vercel deployment steps:
// 1. vercel.com → Import from GitHub
// 2. Framework: Vite (auto-detected)
// 3. Build command: npm run build
// 4. Output dir: dist/
// 5. Environment variable: Set VITE_API_URL if using a hosted backend

// Note: For hackathon demo, run backend locally and use ngrok:
//   npx ngrok http 3001
// Then update vite.config.js proxy target to the ngrok URL`,
        context_tool: 'Gemini',
        prompt_history: null,
      },
      {
        id: sid('task'), title: 'Secret sauce: AI prompt template generator',
        description: 'The standout differentiator for M12. Add a one-click "Generate Prompt" button that auto-builds a structured system prompt from the task\'s title, description, and context. Pre-selects a prompt template based on task type (feature → user story prompt, bug → debug prompt, etc.).',
        type: 'additional', status: 'todo', assignee: teammateB.name,
        due_date: dateOffset(6), created_date: dateOffset(-1),
        context: `// Prompt templates by task type:

// feature → User Story Prompt
"You are a senior full-stack developer. Implement the following feature:\n{title}\n\nAcceptance Criteria:\n{description}\n\nContext & Constraints:\n{context}\n\nDeliver production-ready code with error handling."

// bug → Debug Prompt
"You are an expert debugger. Diagnose and fix the following bug:\n{title}\n\nSteps to Reproduce:\n{description}\n\nStacktrace / Logs:\n{context}\n\nProvide a root cause analysis and the minimal fix."

// urgent → Hotfix Prompt
"CRITICAL: This is a production hotfix. Resolve immediately:\n{title}"`,
        context_tool: 'Claude',
        prompt_history: null,
      },
      {
        id: sid('task'), title: 'Load pitch-ready demo dataset for presentation',
        description: 'Populate the tracker with a realistic dataset that tells a coherent story during the pitch: mix of completed features, in-progress work, bugs being fixed, and upcoming deliverables. Run the seed script: `npm run db:seed`. Tag as `pitch-ready`.',
        type: 'additional', status: 'todo', assignee: teammateA.name,
        due_date: dateOffset(7), created_date: today(),
        context: `// npm run db:seed
// node server/seed.js

// Demo team: UXD Hackathon 2026
// 3 users: Teammate A (owner), Teammate B, Teammate C
// 22 tasks spread across all 4 stages
// 5 deliverable anchors (2 completed, 1 in-progress, 2 not started)
// All passwords: password123`,
        context_tool: 'Claude',
        prompt_history: null,
      },

      // ── BUG FIXES ─────────────────────────────────────────────────────────
      {
        id: sid('task'), title: 'Fix: MariaDB ENUM error on task type validation',
        description: 'Server throws "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD" when submitting tasks without an explicit type field. The parseTask function must default type to "feature" and validate against the TYPES constant before INSERT.',
        type: 'bug', status: 'done', assignee: teammateA.name,
        due_date: dateOffset(-6), created_date: dateOffset(-9),
        context: `// Error observed:
// ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: Incorrect enum value: '' for column 'type'

// Fix in parseTask():
const v = body.type ?? 'feature';
if (!TYPES.includes(v)) return { error: \`type must be one of \${TYPES.join(', ')}\` };
t.type = v;

// TYPES = ['feature', 'bug', 'urgent', 'additional']`,
        context_tool: 'Cursor',
        prompt_history: `### [2026-10-21 14:00] Cursor
I'm getting a MariaDB ENUM error when inserting tasks: "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD". The type column is ENUM('feature','bug','urgent','additional'). How do I validate the incoming request body to ensure it always contains a valid enum value, with 'feature' as the default?`,
      },
      {
        id: sid('task'), title: 'Fix: localStorage active team persists after logout',
        description: 'After logout, if a user registers with a new account, the stale activeTeamId from localStorage causes a 403 "not a member of this team" error on all task requests. Clear vt_active_team on logout.',
        type: 'bug', status: 'review', assignee: teammateB.name,
        due_date: dateOffset(0), created_date: dateOffset(-4),
        context: `// Bug reproduction:
// 1. Login as User A → team auto-selected → stored in localStorage
// 2. Logout
// 3. Register as User B (new account, no teams)
// 4. App still reads stale vt_active_team from localStorage
// 5. useTasks fires GET /api/tasks?teamId=<old-id> → 403 Forbidden

// Fix: clear localStorage on logout in useAuth.js
const logout = useCallback(() => {
  localStorage.removeItem('vt_token');
  localStorage.removeItem('vt_active_team'); // ← ADD THIS
  setToken(null);
  setUser(null);
}, []);`,
        context_tool: 'ChatGPT',
        prompt_history: `### [2026-10-24 16:00] ChatGPT
I have a React app with JWT auth stored in localStorage. After logout and re-login as a different user, the previous user's teamId is still stored in localStorage causing API 403 errors. How should I handle localStorage cleanup on logout to prevent stale state from a previous session leaking into a new one?`,
      },
      {
        id: sid('task'), title: 'Fix: Date timezone offset shifts task due dates by -1 day',
        description: 'Due dates stored as YYYY-MM-DD (MariaDB DATE) display one day earlier in the UI when parsed with `new Date(dateString)` due to UTC offset. Use date-only parsing (split on "-") instead of Date constructor to avoid timezone shifts.',
        type: 'bug', status: 'done', assignee: teammateC.name,
        due_date: dateOffset(-3), created_date: dateOffset(-5),
        context: `// Bug: new Date('2026-10-25') → parsed as UTC midnight → displayed as Oct 24 in GMT+1

// Wrong:
const due = new Date(task.dueDate); // uses UTC → shifts in local timezones

// Fixed: parse components directly to avoid timezone conversion
const parts = String(task.dueDate).split('-');
const [year, month, day] = parts.map(Number);
const due = new Date(year, month - 1, day); // local timezone constructor`,
        context_tool: 'Gemini',
        prompt_history: `### [2026-10-22 11:00] Gemini
I'm storing dates as 'YYYY-MM-DD' strings in a MariaDB DATE column and reading them back as strings. When I create a JavaScript Date with \`new Date('2026-10-25')\` it parses as UTC midnight, which shifts to the previous day in UTC+1 timezones. What's the correct way to compare a date string to today's date without timezone offset issues?`,
      },
      {
        id: sid('task'), title: 'Fix: Deliverables board re-fetches on every render',
        description: 'The DeliverablesPinnedBoard component was passing an inline callback as a dependency to a useEffect, causing an infinite fetch loop. Fix by using a ref to track the stable callback reference and only re-fetching when token or teamId actually changes.',
        type: 'bug', status: 'done', assignee: teammateC.name,
        due_date: dateOffset(-1), created_date: dateOffset(-2),
        context: `// Bug: useEffect with onStatsChange in deps causes re-render loop
// Every fetch updates state → parent re-renders → new function ref → triggers fetch again

// Fix: use a ref to break the dependency cycle
const onStatsChangeRef = useRef(onStatsChange);
useEffect(() => { onStatsChangeRef.current = onStatsChange; }, [onStatsChange]);

// Effect only depends on [token, teamId] — never on the callback itself
useEffect(() => {
  // fetch deliverables...
  if (onStatsChangeRef.current) onStatsChangeRef.current(stats);
}, [token, teamId]);`,
        context_tool: 'Claude',
        prompt_history: `### [2026-10-26 16:55] Claude
I have a React useEffect that calls a callback prop (onStatsChange) after fetching data. This callback updates parent state, which causes the parent to re-render, which passes a new function reference as the prop, which triggers the useEffect again — infinite loop. How do I break this cycle without wrapping the parent's callback in useCallback everywhere?`,
      },
      {
        id: sid('task'), title: 'Urgent: SQL injection risk in dynamic team queries',
        description: 'SECURITY: Some ad-hoc query strings in the invitation flow concatenate user-supplied email strings directly. Replace ALL string interpolation in SQL with parameterised queries using the mysql2 placeholder syntax (?). Review every pool.query() call.',
        type: 'urgent', status: 'in-progress', assignee: teammateA.name,
        due_date: dateOffset(0), created_date: dateOffset(-2),
        context: `// ⚠ Vulnerable pattern (DO NOT USE):
await pool.query(\`SELECT id FROM users WHERE email = '\${email}'\`);

// ✓ Safe parameterised query:
const [[row]] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);

// Audit checklist:
// [ ] /api/auth/register — email lookup
// [ ] /api/auth/login — email lookup
// [ ] /api/teams/:id/invite — email lookup + existence check
// [ ] /api/invitations/accept — token lookup
// All confirmed safe — use ? placeholders throughout`,
        context_tool: 'Claude',
        prompt_history: `### [2026-10-25 09:00] Claude
Audit the following Express.js server routes for SQL injection vulnerabilities. I'm using mysql2 with the promise API. Identify any query that concatenates user-supplied input directly into SQL strings, and show me the corrected parameterised version for each.`,
      },
      {
        id: sid('task'), title: 'UX: Add keyboard shortcut legend to board header',
        description: 'Developer-friendly UX improvement. Add a small "keyboard shortcuts" popover to the board header listing: Ctrl+S (save task), Esc (close editor), + (add task). Should auto-dismiss on outside click.',
        type: 'additional', status: 'todo', assignee: teammateB.name,
        due_date: dateOffset(8), created_date: today(),
        context: `// Shortcuts already implemented:
// Ctrl+S → handleSave() in TaskEditorPage
// Esc    → onBack() in TaskEditorPage (if !showDeleteConfirm)

// Planned shortcuts to add:
// N     → Open new task editor from board view
// /     → Focus search/filter input (if added)
// ?     → Toggle shortcuts popover`,
        context_tool: 'Copilot',
        prompt_history: null,
      },
      {
        id: sid('task'), title: 'UX: Empty state illustration for new teams',
        description: 'When a team has no tasks, show a helpful empty state: a subtle dashed border area with an icon and a call-to-action "Add your first task" button. Follow DESIGN.md §4 empty state principle: dashed border + muted caption.',
        type: 'additional', status: 'todo', assignee: teammateB.name,
        due_date: dateOffset(9), created_date: today(),
        context: `// DESIGN.md §4 empty state principle:
// "Subtle dashed outline with muted caption"
// className="rounded-lg border border-dashed border-[#393b40] p-6 text-center text-[#868a91] text-xs"

// Per-column empty state already exists in KanbanColumn:
<div className="h-32 flex flex-col items-center justify-center rounded-lg border border-dashed border-border-subtle/60 text-text-muted text-xs p-4 text-center">
  <span>No tasks in this stage yet</span>
  <button onClick={() => onAddTask(stage.id)}>+ Add task</button>
</div>`,
        context_tool: 'Copilot',
        prompt_history: null,
      },
    ];

    for (const t of TASKS) {
      await conn.query(
        `INSERT INTO tasks
          (id, team_id, created_by, title, description, type, status, assignee,
           due_date, created_date, context, context_tool, context_updated_at, prompt_history)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.id, TEAM_ID, teammateA.id,
          t.title, t.description, t.type, t.status, t.assignee,
          t.due_date, t.created_date,
          t.context || '',
          t.context_tool || null,
          t.context ? new Date().toISOString().replace('T', ' ').slice(0, 23) : null,
          t.prompt_history || null,
        ]
      );
      const statusIcon = { done: '✓', 'in-progress': '⟳', review: '⌛', todo: '·' }[t.status] || '·';
      log(`[${t.type.padEnd(10)}] [${t.status.padEnd(11)}] ${statusIcon} ${t.title}`);
    }

    // ── 5. Seed team deliverables ────────────────────────────────────────────
    divider('Step 5: Seeding Team Deliverables');

    const DELIVERABLES = [
      {
        id: 'presentation',
        label: 'Presentation Slides',
        url: 'https://docs.google.com/presentation/d/vibetracker-hackathon-2026',
        status: 'completed',
      },
      {
        id: 'demo',
        label: 'Live Demo & Video Walkthrough',
        url: null,
        status: 'in-progress',
      },
      {
        id: 'report',
        label: 'Project Report',
        url: 'https://overleaf.com/project/vibetracker-report-2026',
        status: 'completed',
      },
      {
        id: 'documentation',
        label: 'Documentation & Architecture',
        url: null,
        status: 'not-started',
      },
      {
        id: 'deployment',
        label: 'Live Deployment URL',
        url: null,
        status: 'not-started',
      },
    ];

    for (const d of DELIVERABLES) {
      await conn.query(
        `INSERT INTO team_deliverables (team_id, id, label, url, status) VALUES (?, ?, ?, ?, ?)`,
        [TEAM_ID, d.id, d.label, d.url, d.status]
      );
      const statusIcon = { completed: '✓', 'in-progress': '⟳', 'not-started': '·' }[d.status];
      log(`Deliverable [${d.status.padEnd(12)}] ${statusIcon} ${d.label}`);
    }

    // ── Commit ───────────────────────────────────────────────────────────────
    await conn.commit();

    // ── 6. Summary ────────────────────────────────────────────────────────────
    divider('Seed Complete');

    console.log(`\n${GREEN}✔ Demo data seeded successfully!${RESET}\n`);
    console.log('  Team:    UXD Hackathon 2026');
    console.log(`  Team ID: ${TEAM_ID}`);
    console.log(`  Tasks:   ${TASKS.length} tasks (done/in-progress/review/todo)`);
    console.log(`  Users:   ${USERS.length} members\n`);

    console.log(`${CYAN}Demo Credentials (password: password123)${RESET}`);
    console.log(`${'─'.repeat(48)}`);
    for (const u of USERS) {
      const role = u.id === teammateA.id ? 'Owner  ' : 'Member ';
      console.log(`  ${role}  ${u.email.padEnd(32)} ${DIM}(${u.default_llm_tool})${RESET}`);
    }
    console.log(`\n${YELLOW}  Login at: http://localhost:5173/#/login${RESET}\n`);

  } catch (err) {
    await conn.rollback();
    console.error(`\n${RED}✗ Seed failed — rolled back all changes.${RESET}`);
    console.error(err);
    if (targetPool === pool && isDirectRun) {
      process.exit(1);
    }
    throw err;
  } finally {
    conn.release();
  }
}

// Run directly from CLI: node server/seed.js
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  seedDatabase(pool, { delay: 2000 })
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async () => {
      await pool.end();
      process.exit(1);
    });
}
