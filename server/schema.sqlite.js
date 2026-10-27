// Vibecoding Project Tracker — SQLite schema (exported as JS string for reliable serverless bundling)

export const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  github_handle   TEXT,
  vscode_profile  TEXT,
  default_llm_tool TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS teams (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id   TEXT NOT NULL,
  user_id   TEXT NOT NULL,
  role      TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invitations (
  id          TEXT PRIMARY KEY,
  team_id     TEXT NOT NULL,
  email       TEXT NOT NULL,
  invited_by  TEXT,
  token       TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,
  FOREIGN KEY (team_id)    REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations (token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations (email);

CREATE TABLE IF NOT EXISTS tasks (
  id                 TEXT PRIMARY KEY,
  team_id            TEXT,
  created_by         TEXT,
  title              TEXT NOT NULL,
  description        TEXT NOT NULL,
  type               TEXT NOT NULL DEFAULT 'feature',
  status             TEXT NOT NULL DEFAULT 'todo',
  assignee           TEXT NOT NULL DEFAULT '',
  due_date           TEXT,
  created_date       TEXT NOT NULL,
  context            TEXT NOT NULL,
  context_tool       TEXT,
  context_updated_at TEXT,
  prompt_history     TEXT,
  FOREIGN KEY (team_id)    REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_due    ON tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_team   ON tasks (team_id);

CREATE TABLE IF NOT EXISTS anchors (
  id    TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  url   TEXT
);

CREATE TABLE IF NOT EXISTS team_deliverables (
  team_id     TEXT NOT NULL,
  id          TEXT NOT NULL,
  label       TEXT NOT NULL,
  url         TEXT,
  status      TEXT NOT NULL DEFAULT 'not-started',
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (team_id, id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO anchors (id, label, url) VALUES
  ('presentation',  'Presentation',  NULL),
  ('demo',          'Demo',          NULL),
  ('report',        'Report',        NULL),
  ('documentation', 'Documentation', NULL);
`;
