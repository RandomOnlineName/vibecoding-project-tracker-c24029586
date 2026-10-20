# Project Requirements Document (PRD)

**Project:** Vibecoding Project Tracker  
**Context:** Designed for small teams where members know each other, tracking agile tasks, deliverables, and LLM prompt context.

---

## 1. Functional Requirements (What)

* **Task Management:**
  * **Add Tasks:** Create new tasks with title, description, category, and due date.
  * **Edit Tasks:** Update task details, status (`To Do`, `In Progress`, `Review`, `Done`), and delete/archive.
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
