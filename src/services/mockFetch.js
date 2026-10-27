/**
 * mockFetch.js — Client-Side LocalStorage Backend
 * Intercepts all '/api/*' requests and resolves them entirely within browser localStorage.
 * No external server or database needed!
 */

import seedData from './seedData.js';

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

  if (force || !localStorage.getItem(STORAGE_KEYS.TASKS)) {
    setStorage(STORAGE_KEYS.TASKS, seedData.tasks);
  }
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

  // Auto-login Alex Reed on first visit if no token exists
  if (!localStorage.getItem(STORAGE_KEYS.TOKEN)) {
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

function getUserFromToken(headers) {
  const auth = headers.get?.('Authorization') || headers.Authorization || '';
  const match = auth.match(/^Bearer\s+mock-token-(.+)$/i);
  if (!match) return null;
  const userId = match[1];
  const users = getStorage(STORAGE_KEYS.USERS, []);
  return users.find(u => u.id === userId) || null;
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
      return jsonResponse(user);
    }
    if (method === 'PUT') {
      const users = getStorage(STORAGE_KEYS.USERS, []);
      const idx = users.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...body, id: user.id, email: user.email };
        setStorage(STORAGE_KEYS.USERS, users);
        return jsonResponse(users[idx]);
      }
      return jsonResponse({ error: 'user not found' }, 404);
    }
  }

  // 3. Auth: Login
  if (pathname === '/api/auth/login' && method === 'POST') {
    const { email, password } = body || {};
    const users = getStorage(STORAGE_KEYS.USERS, []);
    const user = users.find(u => u.email?.toLowerCase() === email?.toLowerCase());
    if (!user) {
      return jsonResponse({ error: 'Invalid email or password' }, 401);
    }
    const token = `mock-token-${user.id}`;
    return jsonResponse({ token, user });
  }

  // 4. Auth: Register
  if (pathname === '/api/auth/register' && method === 'POST') {
    const { name, email, github_handle, vscode_profile, default_llm_tool } = body || {};
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
    return jsonResponse({ token, user: newUser }, 201);
  }

  // 5. Teams: List
  if (pathname === '/api/teams' && method === 'GET') {
    const user = getUserFromToken(headers);
    if (!user) return jsonResponse({ error: 'unauthorized' }, 401);
    const teams = getStorage(STORAGE_KEYS.TEAMS, []);
    const members = getStorage(STORAGE_KEYS.TEAM_MEMBERS, []);
    const userTeams = teams.map(t => {
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

    const allMembers = getStorage(STORAGE_KEYS.TEAM_MEMBERS, []);
    const users = getStorage(STORAGE_KEYS.USERS, []);
    const teamMems = allMembers.filter(m => m.team_id === teamId);
    const members = teamMems.map(m => {
      const u = users.find(usr => usr.id === m.user_id);
      return {
        id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        name: u?.name || 'Unknown',
        email: u?.email || '',
        github_handle: u?.github_handle || null,
        vscode_profile: u?.vscode_profile || null,
        default_llm_tool: u?.default_llm_tool || null,
      };
    });

    return jsonResponse({ ...team, members });
  }

  // 8. Teams: Invite
  const inviteMatch = pathname.match(/^\/api\/teams\/([a-zA-Z0-9_-]+)\/invite$/);
  if (inviteMatch && method === 'POST') {
    const teamId = inviteMatch[1];
    const { email } = body || {};
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
    const token = `inv-${Math.random().toString(36).slice(2, 12)}`;
    return jsonResponse({ token, invited: true });
  }

  // 9. Invitations: Accept
  if (pathname === '/api/invitations/accept' && method === 'POST') {
    return jsonResponse({ success: true });
  }

  // 10. Deliverables: List
  const delivMatch = pathname.match(/^\/api\/teams\/([a-zA-Z0-9_-]+)\/deliverables$/);
  if (delivMatch && method === 'GET') {
    const teamId = delivMatch[1];
    const all = getStorage(STORAGE_KEYS.DELIVERABLES, []);
    const deliverables = all.filter(d => d.team_id === teamId || !d.team_id);
    return jsonResponse({ deliverables, canEdit: true });
  }

  // 11. Deliverables: Update
  const delivUpdateMatch = pathname.match(/^\/api\/teams\/([a-zA-Z0-9_-]+)\/deliverables\/([a-zA-Z0-9_-]+)$/);
  if (delivUpdateMatch && method === 'PUT') {
    const teamId = delivUpdateMatch[1];
    const deliverableId = delivUpdateMatch[2];
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
    return jsonResponse(filtered);
  }

  // 13. Tasks: Create
  if (pathname === '/api/tasks' && method === 'POST') {
    const user = getUserFromToken(headers);
    const tasks = getStorage(STORAGE_KEYS.TASKS, []);
    const newTask = {
      ...body,
      id: body.id || `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      created_by: user?.id || null,
      created_date: body.created_date || new Date().toISOString().slice(0, 10),
      status: body.status || 'todo',
      type: body.type || 'feature',
      assignee: body.assignee || '',
      context: body.context || '',
    };
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
      tasks[idx] = { ...tasks[idx], ...body, id: taskId };
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
