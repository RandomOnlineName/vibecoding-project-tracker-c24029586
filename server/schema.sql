-- Vibecoding Project Tracker — MariaDB schema
-- Run once:  mariadb -u root < server/schema.sql

CREATE DATABASE IF NOT EXISTS vibetracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vibetracker;

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              VARCHAR(36)  NOT NULL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  github_handle   VARCHAR(100) NULL,
  vscode_profile  VARCHAR(100) NULL,
  default_llm_tool VARCHAR(32) NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- ─── Teams ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT         NULL,
  created_by  VARCHAR(36)  NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Team Members ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  team_id   VARCHAR(36) NOT NULL,
  user_id   VARCHAR(36) NOT NULL,
  role      ENUM('owner','member') NOT NULL DEFAULT 'member',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id)  ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Invitations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  team_id     VARCHAR(36)  NOT NULL,
  email       VARCHAR(255)    NOT NULL,
  invited_by  VARCHAR(36)  NULL,
  token       VARCHAR(64)  NOT NULL UNIQUE,
  status      ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME NOT NULL,
  FOREIGN KEY (team_id)    REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_invitations_token (token),
  INDEX idx_invitations_email (email)
) ENGINE=InnoDB;

-- ─── Tasks ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id                 VARCHAR(64)  NOT NULL PRIMARY KEY,
  team_id            VARCHAR(36)  NULL,
  created_by         VARCHAR(36)  NULL,
  title              VARCHAR(255) NOT NULL,
  description        TEXT         NOT NULL,
  type               ENUM('feature','bug','urgent','additional') NOT NULL DEFAULT 'feature',
  status             ENUM('todo','in-progress','review','done') NOT NULL DEFAULT 'todo',
  assignee           VARCHAR(100) NOT NULL DEFAULT '',
  due_date           DATE         NULL,
  created_date       DATE         NOT NULL,
  context            MEDIUMTEXT   NOT NULL,
  context_tool       VARCHAR(32)  NULL,
  context_updated_at DATETIME(3)  NULL,
  prompt_history     MEDIUMTEXT   NULL,

  INDEX idx_tasks_status  (status),
  INDEX idx_tasks_due     (due_date),
  INDEX idx_tasks_team    (team_id),
  FOREIGN KEY (team_id)    REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Anchors ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anchors (
  id    ENUM('presentation','demo','report','documentation') NOT NULL PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  url   VARCHAR(2048) NULL
) ENGINE=InnoDB;

-- ─── Team Deliverables & Milestones (PRD §3.3) ────────────────────────────────
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


-- ─── Seed: Anchors ────────────────────────────────────────────────────────────
INSERT IGNORE INTO anchors (id, label, url) VALUES
  ('presentation',  'Presentation',  NULL),
  ('demo',          'Demo',          NULL),
  ('report',        'Report',        NULL),
  ('documentation', 'Documentation', NULL);
