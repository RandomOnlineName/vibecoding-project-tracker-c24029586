# Project Requirements Document (PRD)

**Project:** Vibecoding Project Tracker (VibeTracker)  
**Context:** Designed for agile software teams and vibecoding workflows, tracking sprint tasks, LLM prompt context & iteration history, and project deliverable anchors.

---

## 1. Functional Requirements (What)

### 1.1 Authentication & Workspace Scoping
* **User Authentication:**
  * Secure user registration and login using JSON Web Tokens (JWT) and bcrypt password hashing.
  * User profile management: name, email, GitHub handle, VS Code profile link, and default LLM tool preference.
* **Team Workspaces & Multi-Tenancy:**
  * Support for multiple team workspaces with dedicated task boards.
  * Team creation: The creator of a team automatically becomes the team `owner`.
  * Email-based invitation system with cryptographically secure, 7-day expiring tokens and instant membership resolution.

### 1.2 Task Management & Kanban Workflow
* **Kanban Board:**
  * 4 standard stages: `To Do`, `In Progress`, `Review`, and `Done`.
  * Visual task cards with real-time column count badges and quick-add actions.
* **Task Lifecycle & CRUD:**
  * Create, edit, and delete tasks with title, description, category, and due date.
  * Full-page task editor with keyboard shortcuts (`Ctrl+S` / `Cmd+S` to save, `Esc` to return).
  * Safe two-step deletion confirmation safeguarding task context and history.
* **Task Categorization (Scale 1):**
  * Functional classification: `feature`, `bug`, `urgent`, and `additional`.
  * Top pill badges with color and semantic icon pairings.
* **Assignment & Team Workloads:**
  * Assign tasks to team members or leave unassigned.
  * Quick assignee avatar and name badge on each card.
* **Due Dates & Timeline Urgency (Scale 2):**
  * Set optional target completion dates (`YYYY-MM-DD`).
  * Real-time thermal urgency indicators:
    * **Need Today / Overdue:** Rose tint and pulsing indicator (< 24h).
    * **Needed Soon:** Amber tint (≤ 5 days).
    * **Sprint Window:** Sky blue tint (≤ 14 days).
    * **Later / No Deadline:** Slate neutral (> 14 days).
    * **Completed:** Muted slate (overrides urgency once in `Done`).

### 1.3 Task Filtering & Sorting
* **"My Tasks" Filter:** One-click toggle in the board toolbar to filter out tasks not assigned to the currently logged-in user.
* **Multi-Criteria Sorting:** Sort tasks within each Kanban column by:
  * **Deadline:** Earliest first (approaching deadlines first) or Latest first.
  * **Creation Date:** Newest first or Oldest first.
  * **Default:** Team database sequence.

### 1.4 LLM Context & Prompt Iteration History
* **AI Context Window:**
  * Dedicated high-capacity monospace buffer (`MEDIUMTEXT`) for pasting system prompts, architectural notes, error stacktraces, API schemas, and logs.
  * Live character counters and one-click "Copy Context" button with visual toast feedback.
  * Target AI tool selection (`Claude`, `Cursor`, `ChatGPT`, `Copilot`, `Gemini`, `Other`).
* **Prompt History Box:**
  * Dedicated prompt history buffer tracking the exact prompts executed with AI tools while solving the task.
  * **Quick Append Tool (⚡):** Quick entry drawer to paste a prompt, tag the tool, and automatically prepend an ISO timestamp (e.g., `### [YYYY-MM-DD HH:MM] Claude`).
  * Freeform editing and one-click "Copy All Prompts" button for sprint retrospectives and Module 5 Vibe Coding History deliverables.
  * View density switcher in editor: toggle between `Stacked View` (both visible), `AI Context Window` only, or `Prompt History Box` only.

### 1.5 Project Deliverables & Milestones (Anchor Board)
* **Pinned Top Anchor Board:**
  * Anchored directly above the Kanban board for persistent team visibility.
  * Togglable via the board header or inline collapse button (`▲ Collapse` / `▼ Expand`).
  * Responsive 5-column grid tracking the 5 core project anchors:
    1. 📊 **Presentation Slides** (`presentation`)
    2. 🎥 **Live Demo & Video Walkthrough** (`demo`)
    3. 📄 **Project Report** (`report`)
    4. 📚 **Documentation & Architecture** (`documentation`)
    5. 🚀 **Live Deployment URL** (`deployment`)
* **Role-Based Governance:**
  * **Team Creator / Owner:** Exclusive permission to add, edit, and update anchor URLs, custom labels, and completion states (`not-started`, `in-progress`, `completed`).
  * **Team Members:** Read-only view with direct link navigation (`Open ↗`), one-click link copying, and live status progress tracking.
* **Milestone Progress Gauge:** Real-time completion percentage and linked deliverable count.

---

## 2. Non-Functional Requirements (How)

* **Design Aesthetic & Vibe:** Utilitarian dark-mode developer cockpit inspired by JetBrains IDE and GitLab Dark (`#1e1f22`, `#25272b`, `#2b2d30`).
* **Dual-Scale Visual Hierarchy:**
  * **Scale 1 (Type):** Communicated through the top card capsule pill.
  * **Scale 2 (Urgency):** Communicated through the bottom horizontal stripe and due date chip.
* **Accessibility & Readability:** High-contrast text adhering to WCAG AA, legible typography (`Inter` + `JetBrains Mono`), and icon/text pairings that never rely solely on color.
* **Performance & Data Integrity:**
  * Parameterized SQL queries preventing injection attacks.
  * Stable React dependency trees preventing redundant re-fetching or infinite render loops.
  * Transactional database seeding (`npm run db:seed`) for offline testing and demo rehearsal.

---

## 3. Data Requirements (Implementation)

### 3.1 Users & Authentication (`users`)
* `id`: UUID (Primary Key, VARCHAR(36))
* `name`: VARCHAR(100)
* `email`: VARCHAR(255), unique, indexed
* `password_hash`: VARCHAR(255) (bcrypt, 12 rounds)
* `github_handle`: VARCHAR(100), nullable
* `vscode_profile`: VARCHAR(100), nullable
* `default_llm_tool`: VARCHAR(32), nullable
* `created_at`: DATETIME

### 3.2 Teams & Memberships (`teams`, `team_members`, `invitations`)
* **`teams`:**
  * `id`: UUID (Primary Key, VARCHAR(36))
  * `name`: VARCHAR(100)
  * `description`: TEXT, nullable
  * `created_by`: VARCHAR(36) (Foreign Key -> `users.id`)
  * `created_at`: DATETIME
* **`team_members`:**
  * `team_id`: VARCHAR(36) (Composite Primary Key, Foreign Key -> `teams.id` ON DELETE CASCADE)
  * `user_id`: VARCHAR(36) (Composite Primary Key, Foreign Key -> `users.id` ON DELETE CASCADE)
  * `role`: ENUM (`owner`, `member`)
  * `joined_at`: DATETIME
* **`invitations`:**
  * `id`: UUID (Primary Key, VARCHAR(36))
  * `team_id`: VARCHAR(36) (Foreign Key -> `teams.id` ON DELETE CASCADE)
  * `email`: VARCHAR(255), indexed
  * `invited_by`: VARCHAR(36) (Foreign Key -> `users.id`)
  * `token`: VARCHAR(64), unique, indexed
  * `status`: ENUM (`pending`, `accepted`, `declined`)
  * `created_at`: DATETIME
  * `expires_at`: DATETIME (7 days from creation)

### 3.3 Tasks (`tasks`)
* `id`: Unique identifier (VARCHAR(64), Primary Key)
* `team_id`: VARCHAR(36) (Foreign Key -> `teams.id` ON DELETE CASCADE, indexed)
* `created_by`: VARCHAR(36) (Foreign Key -> `users.id` ON DELETE SET NULL)
* `title`: VARCHAR(255)
* `description`: TEXT
* `type`: ENUM (`feature`, `bug`, `urgent`, `additional`)
* `status`: ENUM (`todo`, `in-progress`, `review`, `done`, indexed)
* `assignee`: VARCHAR(100)
* `due_date`: DATE, nullable, indexed
* `created_date`: DATE
* `context`: MEDIUMTEXT (up to 16MB for prompts, logs, code snippets)
* `context_tool`: VARCHAR(32), nullable
* `context_updated_at`: DATETIME(3), nullable
* `prompt_history`: MEDIUMTEXT, nullable (chronological history of prompts used)

### 3.4 Team Deliverables & Milestones (`team_deliverables`)
* `team_id`: VARCHAR(36) (Composite Primary Key, Foreign Key -> `teams.id` ON DELETE CASCADE)
* `id`: ENUM/VARCHAR(32) (`presentation`, `demo`, `report`, `documentation`, `deployment`)
* `label`: VARCHAR(100)
* `url`: VARCHAR(2048), nullable
* `status`: ENUM (`not-started`, `in-progress`, `completed`)
* `updated_at`: DATETIME

---

## 4. Operational & Tooling Requirements

* **Seed & Demo Script:**
  * Server CLI command: `npm run db:seed` (`server/seed.js`).
  * Replaces database with a coherent demo workspace (`UXD Hackathon 2026`) featuring 5 distinct users, 23 realistic tasks across all Kanban stages, prompt logs, and configured deliverables.
* **Deployment & Environments:**
  * Frontend: Vite build target deployed to Vercel or local preview.
  * Backend: Express API server proxied through Vite in development (`http://localhost:3001`).
