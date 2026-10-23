-- Vibecoding Project Tracker — MariaDB schema
-- Run once:  mariadb -u root -p < server/schema.sql

CREATE DATABASE IF NOT EXISTS vibetracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vibetracker;

CREATE TABLE IF NOT EXISTS tasks (
  id                 VARCHAR(64)  NOT NULL PRIMARY KEY,
  title              VARCHAR(255) NOT NULL,
  description        TEXT         NOT NULL,
  type               ENUM('feature','bug') NOT NULL DEFAULT 'feature',
  status             ENUM('todo','in-progress','review','done') NOT NULL DEFAULT 'todo',
  assignee           VARCHAR(100) NOT NULL DEFAULT '',
  due_date           DATE         NULL,
  created_date       DATE         NOT NULL,
  context            MEDIUMTEXT   NOT NULL,
  context_tool       VARCHAR(32)  NULL,
  context_updated_at DATETIME(3)  NULL,
  INDEX idx_tasks_status (status),
  INDEX idx_tasks_due (due_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS anchors (
  id    ENUM('presentation','demo','report','documentation') NOT NULL PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  url   VARCHAR(2048) NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO anchors (id, label, url) VALUES
  ('presentation',  'Presentation',  NULL),
  ('demo',          'Demo',          NULL),
  ('report',        'Report',        NULL),
  ('documentation', 'Documentation', NULL);

INSERT IGNORE INTO tasks (id, title, description, type, status, assignee, due_date, created_date, context, context_tool, context_updated_at) VALUES
  ('task-1', 'Build task modal with full CRUD capabilities', 'Create a modal to add, view, edit, and delete tasks with validation.', 'feature', 'todo', 'Alex Reed', '2026-10-25', '2026-10-20', 'Design tokens from DESIGN.md should be used for styling.', 'Claude', NOW()),
  ('task-2', 'Refine four-column Kanban board layout', 'Implement the grid layout displaying columns for To Do, In Progress, Review, and Done.', 'feature', 'in-progress', 'Teammate B', '2026-10-24', '2026-10-20', 'Use responsive CSS grid with JetBrains dark theme palette.', 'Cursor', NOW()),
  ('task-3', 'Audit contrast and accessibility on dark theme', 'Verify WCAG AA compliance across all status badges and card borders.', 'bug', 'review', 'Teammate C', '2026-10-23', '2026-10-21', 'Check contrast ratios of pill text on dark surfaces.', 'ChatGPT', NOW()),
  ('task-4', 'Configure MariaDB schema and Express REST API', 'Set up initial tables and endpoint routes for tasks and anchor deliverables.', 'feature', 'done', 'Alex Reed', '2026-10-20', '2026-10-20', 'Database credentials configured in .env with fallback.', 'Cursor', NOW());
