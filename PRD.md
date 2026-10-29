# Project Requirements Document (PRD)

**Project:** Vibecoding Project Tracker  
**Context:** Designed for small teams where members know each other, tracking agile tasks, deliverables, and LLM prompt context.

---

## 1. Functional Requirements (What)

* **Task Management:**
  * **Add Tasks:** Create new tasks with title, description, category, and due date.
  * **Edit Tasks:** Update task details, status (`To Do`, `In Progress`, `Review`, `Done`), and delete.
  * **Task Categories:** Classify tasks (e.g., Feature vs. Bug).
  * **Assignment & Claiming:** Assign tasks to teammates, self-claim unassigned tasks, and reassign handoffs.
  * **Due Dates:** Set and track task deadlines.
* **LLM & Dev Handoff Context:**
  * **Prompt Context:** Store instructions, prompt history, and target tool (Claude, ChatGPT, Cursor, etc.) per task.
  * **One-Click Export:** Copy formatted context for instant reuse in external AI tools or developer handoffs.
* **Team & Project Tracking:**
  * **Teams on a Project:** View team members and their active workloads.
  * **Project Deliverables & Milestones:** Track key milestones, resource links, documentation, and live deployment URLs in a pinned anchor section.

---

## 2. Non-Functional Requirements (How)

* **Visual Distinction:** Clear separation of cards, stages, and deliverable anchors.
* **Color Schemes:** Structured palette distinguishing brand, categories, and interface surfaces.
* **Urgency & Status Indicators:** Visual cues (color tints/badges) reflecting deadline urgency (safe, due soon, overdue) and task type.
* **Accessibility & Readability:** High-contrast text (WCAG-compliant), legible typography, and icon/label pairings that do not rely solely on color.

---

## 3. Data Requirements (Implementation)

### 3.1 User & Team
* **Login Info:** User credentials / authentication identifier.
* **User Profile:**
  * Name
  * Email
  * GitHub / VS Code account
  * Preferences (default LLM tool, theme)
* **Team Info:** Team ID, project ID, member list.
* **Jobs Assigned:** List of task IDs assigned to the user.

### 3.2 Tasks
* **Task Fields:**
  * `id`: Unique identifier
  * `title`: String
  * `description`: Text
  * `category`: `feature` | `bug` | etc.
  * `status`: `todo` | `in-progress` | `review` | `done`
  * `assignee`: User reference
  * `dueDate`: Date (YYYY-MM-DD, nullable)
  * `createdDate`: Date (YYYY-MM-DD)
  * `context`: Text (prompt briefing / notes)
  * `contextTool`: String (target AI tool)
  * `contextUpdatedAt`: Timestamp

### 3.3 Deliverables & Milestones
* `id`: Anchor identifier (`presentation`, `demo`, `report`, `documentation`, `deployment`)
* `label`: Display title
* `url`: External link / resource location
* `status`: Completion state

---

## 4. Assumptions

* **Team Size:** Small team with high familiarity; no complex enterprise permissions or multi-role bureaucracy required.

---

## 5. Extra Features (unsorted)

* **Accounts:** Email/password registration and sign-in; profile page for editing details and changing password; seeded demo account with a "Use demo account" shortcut on the login page.
* **Teams:** Create teams; invite members by email (existing users are added directly, others get a shareable invite link); accept-invite page.
* **Owner (team creator) permissions:** Only the team creator can reassign any task; other members see assignees read-only.
* **Shared deliverables editing:** Any team member can edit deliverable links, labels and status.
* **Self handoff:** Members who aren't the team creator can reassign tasks currently assigned to them (in the task editor); the server enforces the same rule. A hint under the editor's Assignee field shows when the user can do this.
* **Handoff:** Reassigning is done from the task editor's Assignee field (not from the board), with a handoff confirmation toast.
* **GitHub handles on assignees:** Wherever an assignee is shown or picked (task rows, editor Assignee dropdown, handoff toast), the member's GitHub handle appears in brackets, e.g. "Teammate B (@teammate-b)"; members without a handle show just their name.
* **Extra task categories:** `urgent` and `additional` alongside `feature` and `bug`.
* **Prompt history log:** Separate `promptHistory` field per task, with "Quick Append" for timestamped, tool-tagged entries and "Copy All Prompts".
* **Quick Append metadata:** Optional git commit hash and tokens-used fields on Quick Append, recorded on the entry as "Commit: `abc1234` · Tokens: 12,400"; invalid values are flagged inline. The prompt itself is wrapped in a fenced code block so any pasted markdown is shown literally. Each entry's heading also names who appended it, with their GitHub handle if set (e.g. "Claude · Teammate A (@teammate-a)").
* **Editor views:** Full-page task editor with stacked / context-only / history-only views; keyboard shortcuts (Ctrl+S save, Esc back).
* **Markdown preview:** Write / Split / Preview toggle on the AI Context Window and Prompt History Box, rendering sanitised markdown (headings, lists, code blocks, tables, links). Split shows the editor and a live preview side by side inside the box (stacked on narrow screens).
* **Full-width task editor:** The task edit screen uses the full window width, with a fixed-width Properties sidebar and the editor column taking the rest.
* **Structured context (SPDD):** AI Context Window uses a template with a Resources section (logs, stack trace, relevant files & docs) and a REASONS canvas (Requirements, Entities, Approach, Structure, Operations, Norms, Safeguards) for Structured Prompt-Driven Development. New tasks start with it, "Insert SPDD Template" adds it to existing tasks, and empty sections are pruned when copying or saving.
* **Copy as Prompt Context:** Separate button that copies task metadata, problem description and context as one model-ready prompt; "Copy Context" copies the context alone.
* **Board filtering & sorting:** "My Tasks" filter; sort by deadline or created date; live task count; urgency legend.
* **Deliverables board extras:** Collapsible pinned board with linked/completed counts and progress bar; copy/open link buttons.
* **Storage / deployment:** Client-side localStorage backend (mock API) for the deployed demo; optional SQLite/MariaDB server and Vercel deployment.
