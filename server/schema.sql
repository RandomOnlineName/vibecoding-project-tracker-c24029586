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
