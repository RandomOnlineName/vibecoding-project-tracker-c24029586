/**
 * mockFetch.js — Client-Side LocalStorage Backend
 * Intercepts all '/api/*' requests and resolves them entirely within browser localStorage.
 * No external server or database needed!
 */

import seedData, { SEED_VERSION, LEGACY_ASSIGNEES, RETIRED_USER_IDS, TASKS_ADDED_IN } from './seedData.js';

const STORAGE_KEYS = {
  USERS: 'vt_users',
  TEAMS: 'vt_teams',
  TEAM_MEMBERS: 'vt_team_members',
  TASKS: 'vt_tasks',
  DELIVERABLES: 'vt_deliverables',
  INVITATIONS: 'vt_invitations',
  TOKEN: 'vt_token',
  ACTIVE_TEAM: 'vt_active_team',
  ANCHORS: 'vt_anchors',
  SEED_VERSION: 'vt_seed_version',
};

// ── Initial Seed Data ─────────────────────────────────────────────────────────

function getStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`localStorage save error for ${key}:`, err);
  }
}

export function initLocalStorage(force = false) {
  if (typeof window === 'undefined') return;

  // A browser with no users stored has never run the demo before
  const isFirstVisit = !localStorage.getItem(STORAGE_KEYS.USERS);
  const seedChanged = localStorage.getItem(STORAGE_KEYS.SEED_VERSION) !== String(SEED_VERSION);

  if (force || !localStorage.getItem(STORAGE_KEYS.TASKS)) {
    setStorage(STORAGE_KEYS.TASKS, seedData.tasks);
  } else if (seedChanged) {
    // Seed content changed: refresh the text of seeded tasks, keeping user-made tasks
    // and each task's board state (status, due date). Assignees from the old demo users
    // are mapped onto their replacements.
    const seedById = new Map(seedData.tasks.map(t => [t.id, t]));
    const tasks = getStorage(STORAGE_KEYS.TASKS, []).map(t => {
      const migrated = LEGACY_ASSIGNEES[t.assignee] ? { ...t, assignee: LEGACY_ASSIGNEES[t.assignee] } : t;
      const seed = seedById.get(t.id);
      if (!seed) return migrated;
      return {
        ...migrated,
        title: seed.title,
        description: seed.description,
        context: seed.context,
        context_updated_at: null,
        contextUpdatedAt: null,
      };
    });
    // Add seed tasks introduced since this browser's seed version (newest first, like created tasks)
    const storedVersion = Number(localStorage.getItem(STORAGE_KEYS.SEED_VERSION)) || 0;
    const existingIds = new Set(tasks.map(t => t.id));
    const added = seedData.tasks.filter(t =>
      TASKS_ADDED_IN[t.id] > storedVersion && !existingIds.has(t.id)
    );
    setStorage(STORAGE_KEYS.TASKS, [...added, ...tasks]);
  }

  if (!force && !isFirstVisit && seedChanged) {
    // Replace the seeded demo accounts (matched by id) and drop retired ones; registered users are kept
    const seedUserById = new Map(seedData.users.map(u => [u.id, u]));
    const users = getStorage(STORAGE_KEYS.USERS, [])
      .filter(u => !RETIRED_USER_IDS.includes(u.id))
      .map(u => (seedUserById.has(u.id) ? { ...seedUserById.get(u.id) } : u));
    setStorage(STORAGE_KEYS.USERS, users);
    const members = getStorage(STORAGE_KEYS.TEAM_MEMBERS, []).filter(m => !RETIRED_USER_IDS.includes(m.user_id));
    setStorage(STORAGE_KEYS.TEAM_MEMBERS, members);
  }
  localStorage.setItem(STORAGE_KEYS.SEED_VERSION, String(SEED_VERSION));
  if (force || !localStorage.getItem(STORAGE_KEYS.USERS)) {
    setStorage(STORAGE_KEYS.USERS, seedData.users);
  }
  if (force || !localStorage.getItem(STORAGE_KEYS.TEAMS)) {
    setStorage(STORAGE_KEYS.TEAMS, [seedData.team]);
  }
  if (force || !localStorage.getItem(STORAGE_KEYS.TEAM_MEMBERS)) {
    const members = seedData.users.map((u, i) => ({
      team_id: seedData.team.id,
      user_id: u.id,
      role: i === 0 ? 'owner' : 'member',
      joined_at: new Date().toISOString(),
    }));
    setStorage(STORAGE_KEYS.TEAM_MEMBERS, members);
  }
  if (force || !localStorage.getItem(STORAGE_KEYS.DELIVERABLES)) {
    const deliverables = seedData.deliverables.map(d => ({
      ...d,
      team_id: seedData.team.id,
      updated_at: new Date().toISOString(),
    }));
    setStorage(STORAGE_KEYS.DELIVERABLES, deliverables);
  }
  if (force || !localStorage.getItem(STORAGE_KEYS.INVITATIONS)) {
    setStorage(STORAGE_KEYS.INVITATIONS, []);
  }
  if (force || !localStorage.getItem(STORAGE_KEYS.ANCHORS)) {
    setStorage(STORAGE_KEYS.ANCHORS, [
      { id: 'presentation',  label: 'Presentation',  url: null },
      { id: 'demo',          label: 'Demo',          url: null },
      { id: 'report',        label: 'Report',        url: null },
      { id: 'documentation', label: 'Documentation', url: null },
    ]);
  }
  if (force || !localStorage.getItem(STORAGE_KEYS.ACTIVE_TEAM)) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TEAM, seedData.team.id);
  }

  // Auto-login Teammate A (the team creator) on first visit only, so logging out sticks across reloads
  if ((force || isFirstVisit) && !localStorage.getItem(STORAGE_KEYS.TOKEN)) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, `mock-token-${seedData.users[0].id}`);
  }
}

// Run initial seed on load
initLocalStorage();

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Seed data uses snake_case (from the old SQL schema); the UI reads camelCase.
const TASK_FIELD_ALIASES = {
  due_date: 'dueDate',
  created_date: 'createdDate',
  context_tool: 'contextTool',
  context_updated_at: 'contextUpdatedAt',
  prompt_history: 'promptHistory',
  team_id: 'teamId',
};

function normalizeTask(task) {
  const out = { ...task };
  for (const [snake, camel] of Object.entries(TASK_FIELD_ALIASES)) {
    if (out[camel] === undefined && out[snake] !== undefined) out[camel] = out[snake];
    if (out[camel] !== undefined) out[snake] = out[camel];
  }
  return out;
}

function getUserFromToken(headers) {
  const auth = headers.get?.('Authorization') || headers.Authorization || '';
  const match = auth.match(/^Bearer\s+mock-token-(.+)$/i);
  if (!match) return null;
  const userId = match[1];
  const users = getStorage(STORAGE_KEYS.USERS, []);
  return users.find(u => u.id === userId) || null;
}

// Profile fields are stored snake_case (like the SQL schema) but the client speaks camelCase,
// matching server/index.js. Accept either on write and return both on read.
const PROFILE_FIELDS = [
  ['github_handle', 'githubHandle'],
  ['vscode_profile', 'vsCodeProfile'],
  ['default_llm_tool', 'defaultLlmTool'],
];

function toStoredProfile(fields = {}) {
  const out = { ...fields };
  for (const [snake, camel] of PROFILE_FIELDS) {
    if (camel in out) {
      out[snake] = out[camel] || null;
      delete out[camel];
    }
  }
  return out;
}

function toClientUser(u) {
  if (!u) return u;
  const out = { ...u };
  for (const [snake, camel] of PROFILE_FIELDS) out[camel] = u[camel] ?? u[snake] ?? null;
  return out;
}

function isTeamMember(user, teamId) {
  if (!user) return false;
  const teams = getStorage(STORAGE_KEYS.TEAMS, []);
  const members = getStorage(STORAGE_KEYS.TEAM_MEMBERS, []);
  return teams.some(t => t.id === teamId && t.created_by === user.id) ||
    members.some(m => m.team_id === teamId && m.user_id === user.id);
}

function isTeamOwner(user, teamId) {
  if (!user) return false;
  const teams = getStorage(STORAGE_KEYS.TEAMS, []);
  const members = getStorage(STORAGE_KEYS.TEAM_MEMBERS, []);
  return teams.some(t => t.id === teamId && t.created_by === user.id) ||
    members.some(m => m.team_id === teamId && m.user_id === user.id && m.role === 'owner');
}

function defaultDeliverables(teamId) {
  const now = new Date().toISOString();
  return seedData.deliverables.map(d => ({
    id: d.id,
    label: d.label,
    url: null,
    status: 'not-started',
    team_id: teamId,
    updated_at: now,
  }));
}

// ── Request Router ───────────────────────────────────────────────────────────

async function handleLocalApi(path, method, body, headers) {
  const urlObj = new URL(path, 'http://localhost');
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  // 1. Health
  if (pathname === '/api/health') {
    return jsonResponse({ ok: true, mode: 'localStorage' });
  }

  // 2. Auth: Me
  if (pathname === '/api/auth/me') {
    const user = getUserFromToken(headers);
    if (!user) return jsonResponse({ error: 'unauthorized' }, 401);

    if (method === 'GET') {
      return jsonResponse(toClientUser(user));
    }
    if (method === 'PUT') {
      const users = getStorage(STORAGE_KEYS.USERS, []);
      const idx = users.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        // Drop any camelCase copies left by older versions so the snake_case value is the only one
        const stored = toStoredProfile({ ...users[idx], ...body, id: user.id, email: user.email });
        users[idx] = stored;
        setStorage(STORAGE_KEYS.USERS, users);
        return jsonResponse(toClientUser(users[idx]));
      }
      return jsonResponse({ error: 'user not found' }, 404);
    }
  }

  // 3a. Auth: Accounts that can sign in (demo only: listed on the login page)
  if (pathname === '/api/auth/accounts' && method === 'GET') {
    const users = getStorage(STORAGE_KEYS.USERS, []);
    const teams = getStorage(STORAGE_KEYS.TEAMS, []);
    return jsonResponse(users.map(u => ({
      name: u.name,
      email: u.email,
      role: teams.some(t => t.created_by === u.id) ? 'owner' : 'member',
    })));
  }

  // 3. Auth: Login (demo: email only, no passwords)
  if (pathname === '/api/auth/login' && method === 'POST') {
    const { email } = body || {};
    const users = getStorage(STORAGE_KEYS.USERS, []);
    const user = users.find(u => u.email?.toLowerCase() === email?.toLowerCase());
    if (!user) {
      return jsonResponse({ error: 'No account with that email' }, 401);
    }
    const token = `mock-token-${user.id}`;
    return jsonResponse({ token, user: toClientUser(user) });
  }

  // 4. Auth: Register
  if (pathname === '/api/auth/register' && method === 'POST') {
    const { name, email, github_handle, vscode_profile, default_llm_tool } = toStoredProfile(body || {});
    if (!email || !name) {
      return jsonResponse({ error: 'Name and email are required' }, 400);
    }
    const users = getStorage(STORAGE_KEYS.USERS, []);
    if (users.some(u => u.email?.toLowerCase() === email.toLowerCase())) {
      return jsonResponse({ error: 'Email already registered' }, 409);
    }
    const newUser = {
      id: `uid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      email: email.toLowerCase(),
      github_handle: github_handle || null,
      vscode_profile: vscode_profile || null,
      default_llm_tool: default_llm_tool || 'Claude',
      created_at: new Date().toISOString(),
    };
    users.push(newUser);
    setStorage(STORAGE_KEYS.USERS, users);

    // Add to default team
    const teams = getStorage(STORAGE_KEYS.TEAMS, []);
    if (teams[0]) {
      const members = getStorage(STORAGE_KEYS.TEAM_MEMBERS, []);
      members.push({
        team_id: teams[0].id,
        user_id: newUser.id,
        role: 'member',
        joined_at: new Date().toISOString(),
      });
      setStorage(STORAGE_KEYS.TEAM_MEMBERS, members);
    }

    const token = `mock-token-${newUser.id}`;
    return jsonResponse({ token, user: toClientUser(newUser) }, 201);
  }

  // 5. Teams: List
  if (pathname === '/api/teams' && method === 'GET') {
    const user = getUserFromToken(headers);
    if (!user) return jsonResponse({ error: 'unauthorized' }, 401);
    const teams = getStorage(STORAGE_KEYS.TEAMS, []);
    const members = getStorage(STORAGE_KEYS.TEAM_MEMBERS, []);
    const userTeams = teams
      .filter(t => isTeamMember(user, t.id))
      .map(t => {
        const m = members.find(mem => mem.team_id === t.id && mem.user_id === user.id);
        return {
          ...t,
          role: m?.role || (t.created_by === user.id ? 'owner' : 'member'),
        };
      });
    return jsonResponse(userTeams);
  }

  // 6. Teams: Create
  if (pathname === '/api/teams' && method === 'POST') {
    const user = getUserFromToken(headers);
    if (!user) return jsonResponse({ error: 'unauthorized' }, 401);
    const { name, description } = body || {};
    const teams = getStorage(STORAGE_KEYS.TEAMS, []);
    const newTeam = {
      id: `team-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name || 'New Team',
      description: description || '',
      created_by: user.id,
      created_at: new Date().toISOString(),
      role: 'owner',
    };
    teams.push(newTeam);
    setStorage(STORAGE_KEYS.TEAMS, teams);

    const members = getStorage(STORAGE_KEYS.TEAM_MEMBERS, []);
    members.push({
      team_id: newTeam.id,
      user_id: user.id,
      role: 'owner',
      joined_at: new Date().toISOString(),
    });
    setStorage(STORAGE_KEYS.TEAM_MEMBERS, members);

    return jsonResponse(newTeam, 201);
  }

  // 7. Teams: Detail with Members
  const teamMatch = pathname.match(/^\/api\/teams\/([a-zA-Z0-9_-]+)$/);
  if (teamMatch && method === 'GET') {
    const teamId = teamMatch[1];
    const teams = getStorage(STORAGE_KEYS.TEAMS, []);
    const team = teams.find(t => t.id === teamId);
    if (!team) return jsonResponse({ error: 'team not found' }, 404);
    if (!isTeamMember(getUserFromToken(headers), teamId)) {
      return jsonResponse({ error: 'You are not a member of this team' }, 403);
    }

    const allMembers = getStorage(STORAGE_KEYS.TEAM_MEMBERS, []);
    const users = getStorage(STORAGE_KEYS.USERS, []);
    const teamMems = allMembers.filter(m => m.team_id === teamId);
    const members = teamMems.map(m => {
      const u = toClientUser(users.find(usr => usr.id === m.user_id));
      return {
        id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        name: u?.name || 'Unknown',
        email: u?.email || '',
        github_handle: u?.githubHandle || null,
        githubHandle: u?.githubHandle || null,
        vscode_profile: u?.vsCodeProfile || null,
        default_llm_tool: u?.defaultLlmTool || null,
      };
    });

    return jsonResponse({ ...team, members });
  }

  // 8. Teams: Invite
  const inviteMatch = pathname.match(/^\/api\/teams\/([a-zA-Z0-9_-]+)\/invite$/);
  if (inviteMatch && method === 'POST') {
    const teamId = inviteMatch[1];
    const { email } = body || {};
    const inviter = getUserFromToken(headers);
    if (!isTeamMember(inviter, teamId)) {
      return jsonResponse({ error: 'You are not a member of this team' }, 403);
    }
    const users = getStorage(STORAGE_KEYS.USERS, []);
    const existing = users.find(u => u.email?.toLowerCase() === email?.toLowerCase());
    if (existing) {
      const members = getStorage(STORAGE_KEYS.TEAM_MEMBERS, []);
      if (!members.some(m => m.team_id === teamId && m.user_id === existing.id)) {
        members.push({
          team_id: teamId,
          user_id: existing.id,
          role: 'member',
          joined_at: new Date().toISOString(),
        });
        setStorage(STORAGE_KEYS.TEAM_MEMBERS, members);
      }
      return jsonResponse({ added: true, user: existing });
    }
    // No account yet: store a pending invitation (7-day expiry) redeemable by token
    const token = `inv-${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
    const invitations = getStorage(STORAGE_KEYS.INVITATIONS, []);
    invitations.push({
      token,
      team_id: teamId,
      email: (email || '').toLowerCase(),
      invited_by: inviter.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      accepted_at: null,
    });
    setStorage(STORAGE_KEYS.INVITATIONS, invitations);
    return jsonResponse({ token, invited: true });
  }

  // 9. Invitations: Accept
  if (pathname === '/api/invitations/accept' && method === 'POST') {
    const user = getUserFromToken(headers);
    if (!user) return jsonResponse({ error: 'unauthorized' }, 401);
    const invitations = getStorage(STORAGE_KEYS.INVITATIONS, []);
    const invite = invitations.find(i => i.token === body?.token);
    if (!invite) return jsonResponse({ error: 'Invitation not found' }, 404);
    if (invite.accepted_at) return jsonResponse({ error: 'Invitation has already been used' }, 410);
    if (new Date(invite.expires_at) < new Date()) return jsonResponse({ error: 'Invitation has expired' }, 410);

    const members = getStorage(STORAGE_KEYS.TEAM_MEMBERS, []);
    if (!members.some(m => m.team_id === invite.team_id && m.user_id === user.id)) {
      members.push({
        team_id: invite.team_id,
        user_id: user.id,
        role: 'member',
        joined_at: new Date().toISOString(),
      });
      setStorage(STORAGE_KEYS.TEAM_MEMBERS, members);
    }
    invite.accepted_at = new Date().toISOString();
    setStorage(STORAGE_KEYS.INVITATIONS, invitations);

    const team = getStorage(STORAGE_KEYS.TEAMS, []).find(t => t.id === invite.team_id);
    return jsonResponse({
      success: true,
      teamId: invite.team_id,
      message: `Successfully joined ${team?.name || 'the team'}!`,
    });
  }

  // 10. Deliverables: List
  const delivMatch = pathname.match(/^\/api\/teams\/([a-zA-Z0-9_-]+)\/deliverables$/);
  if (delivMatch && method === 'GET') {
    const teamId = delivMatch[1];
    const user = getUserFromToken(headers);
    if (!isTeamMember(user, teamId)) {
      return jsonResponse({ error: 'You are not a member of this team' }, 403);
    }
    const all = getStorage(STORAGE_KEYS.DELIVERABLES, []);
    let deliverables = all.filter(d => d.team_id === teamId || !d.team_id);
    if (deliverables.length === 0) {
      // First visit to a new team: seed the five empty deliverable anchors
      deliverables = defaultDeliverables(teamId);
      setStorage(STORAGE_KEYS.DELIVERABLES, [...all, ...deliverables]);
    }
    return jsonResponse({ deliverables, canEdit: true });
  }

  // 11. Deliverables: Update
  const delivUpdateMatch = pathname.match(/^\/api\/teams\/([a-zA-Z0-9_-]+)\/deliverables\/([a-zA-Z0-9_-]+)$/);
  if (delivUpdateMatch && method === 'PUT') {
    const teamId = delivUpdateMatch[1];
    const deliverableId = delivUpdateMatch[2];
    if (!isTeamMember(getUserFromToken(headers), teamId)) {
      return jsonResponse({ error: 'You are not a member of this team' }, 403);
    }
    const all = getStorage(STORAGE_KEYS.DELIVERABLES, []);
    const idx = all.findIndex(d => (d.team_id === teamId || !d.team_id) && d.id === deliverableId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...body, team_id: teamId, id: deliverableId, updated_at: new Date().toISOString() };
      setStorage(STORAGE_KEYS.DELIVERABLES, all);
      return jsonResponse(all[idx]);
    }
    const created = { ...body, team_id: teamId, id: deliverableId, updated_at: new Date().toISOString() };
    all.push(created);
    setStorage(STORAGE_KEYS.DELIVERABLES, all);
    return jsonResponse(created);
  }

  // 12. Tasks: List
  if (pathname === '/api/tasks' && method === 'GET') {
    const teamId = searchParams.get('teamId');
    const tasks = getStorage(STORAGE_KEYS.TASKS, []);
    const filtered = teamId
      ? tasks.filter(t => t.team_id === teamId || t.teamId === teamId)
      : tasks;
    return jsonResponse(filtered.map(normalizeTask));
  }

  // 13. Tasks: Create
  if (pathname === '/api/tasks' && method === 'POST') {
    const user = getUserFromToken(headers);
    const tasks = getStorage(STORAGE_KEYS.TASKS, []);
    const newTask = normalizeTask({
      ...body,
      id: body.id || `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      created_by: user?.id || null,
      createdDate: body.createdDate || body.created_date || new Date().toISOString().slice(0, 10),
      teamId: body.teamId || body.team_id || null,
      status: body.status || 'todo',
      type: body.type || 'feature',
      assignee: body.assignee || '',
      context: body.context || '',
    });
    tasks.unshift(newTask);
    setStorage(STORAGE_KEYS.TASKS, tasks);
    return jsonResponse(newTask, 201);
  }

  // 14. Tasks: Update
  const taskUpdateMatch = pathname.match(/^\/api\/tasks\/([a-zA-Z0-9_-]+)$/);
  if (taskUpdateMatch && method === 'PUT') {
    const taskId = taskUpdateMatch[1];
    const tasks = getStorage(STORAGE_KEYS.TASKS, []);
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      // Only the team creator (owner) or the current assignee may reassign a task
      const existing = tasks[idx];
      if (body && 'assignee' in body && (body.assignee || '') !== (existing.assignee || '')) {
        const teamId = existing.team_id || existing.teamId;
        const user = getUserFromToken(headers);
        const isAssignee = Boolean(user?.name && existing.assignee === user.name);
        if (!isAssignee && !isTeamOwner(user, teamId)) {
          return jsonResponse({ error: 'Only the team creator or the current assignee can reassign this task' }, 403);
        }
      }
      // Normalise first so the incoming camelCase fields override stale snake_case ones
      tasks[idx] = normalizeTask({ ...normalizeTask(existing), ...body, id: taskId });
      setStorage(STORAGE_KEYS.TASKS, tasks);
      return jsonResponse(tasks[idx]);
    }
    return jsonResponse({ error: 'task not found' }, 404);
  }

  // 15. Tasks: Delete
  if (taskUpdateMatch && method === 'DELETE') {
    const taskId = taskUpdateMatch[1];
    const tasks = getStorage(STORAGE_KEYS.TASKS, []);
    const remaining = tasks.filter(t => t.id !== taskId);
    setStorage(STORAGE_KEYS.TASKS, remaining);
    return new Response(null, { status: 204 });
  }

  // Fallback 404
  return jsonResponse({ error: 'not found in localStorage backend' }, 404);
}

// ── Intercept Global Fetch in Browser ────────────────────────────────────────

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async (input, init = {}) => {
    let url = typeof input === 'string' ? input : input?.url || '';
    if (url.startsWith('/api') || url.includes('/api/')) {
      const method = (init.method || 'GET').toUpperCase();
      let body = null;
      if (init.body && typeof init.body === 'string') {
        try { body = JSON.parse(init.body); } catch { body = init.body; }
      }
      const headers = new Headers(init.headers || {});
      return handleLocalApi(url, method, body, headers);
    }
    return originalFetch(input, init);
  };
}
