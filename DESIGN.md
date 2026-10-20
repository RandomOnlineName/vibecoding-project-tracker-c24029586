# Vibecoding Project Tracker — Design

**Status:** Design doc finalized · matches the translucent, warm-gradient & hyper-rounded UI aesthetic from design references.

---

## 1. Mood / vibe

**One sentence:** A warm, luminous, and tactile workspace featuring frosted-glass column surfaces, radiant ambient gradients, and hyper-rounded pill components that make tracking agile vibecoding tasks feel delightful, clear, and effortless.

### Visual References
The images saved in the workspace define the visual language:

- **Reference 1 (![alt text](image-4.png) — Primary Layout & Style):** Warm radiant amber-to-lime ambient gradient canvas, translucent frosted-white column containers (`rounded-3xl` with `backdrop-filter: blur`), floating crisp white task cards (`rounded-2xl`), and vibrant pill badges.
- **Reference 2 (![alt text](image-5.png) — Urgency & Status Tinting):** High-visibility column and card emphasis for urgent or active states (e.g., terracotta/coral tinted active columns, status borders, and distinct category pills).
- **Reference 3 (![alt text](image-6.png) — High Contrast & Tactile Controls):** Rich contrasting surface layers with glowing accents, clear typographic hierarchy, and smooth rounded action buttons.

### Anti-references (What we explicitly avoid)
- **Anti-Reference (![alt text](image-7.png)):** Rigid, square-cornered, grey-bordered enterprise issue tracking boards (e.g., legacy GitLab/Jira) with dense, sterile, and uninviting layouts.

---

## 2. Color palette

These design tokens provide high visual contrast (WCAG AA compliant) across frosted glass and glowing background layers.

### Brand & Surfaces

| Token | Hex / Value | Where it shows up |
|---|---|---|
| `brand-primary` | `#0f172a` | Headers, primary action buttons, active borders |
| `brand-accent` | `#f97316` | Warm radiant amber/orange highlights, active indicators, focus rings |
| `surface-page` | `#fef9ee` | Base page canvas (paired with ambient gradient: amber-100 to lime-100) |
| `surface-column` | `rgba(255, 255, 255, 0.65)` | Translucent frosted Kanban column containers (`backdrop-blur-md`) |
| `surface-card` | `#ffffff` | Floating task cards, modal backgrounds, input fields |
| `text-primary` | `#0f172a` | Main task titles, modal headings, primary body copy |
| `text-muted` | `#64748b` | Dates, stage counters, secondary captions, placeholders |

### Task Type (M6 `tag-style`)

| Token | Hex | When used |
|---|---|---|
| `type-feature` | `#10b981` | Emerald green pill badge & accent stripe for `feature` tasks |
| `type-bug` | `#ef4444` | Vivid crimson/coral pill badge & alert accent for `bug` tasks |

### Due-Date States (M8 `due-tint`)

| Token | Hex | When used |
|---|---|---|
| `due-safe` | `#10b981` | Calm emerald green (deadline > 2 days away) |
| `due-warning` | `#f59e0b` | Amber warning (deadline within 24 hours) |
| `due-overdue` | `#dc2626` | Urgent red/crimson alert (past deadline) |
| `due-neutral` | `#94a3b8` | Muted slate gray (completed / done tasks) |

---

## 3. Typography

| Role | Font | Why |
|---|---|---|
| Heading | `Plus Jakarta Sans`, `system-ui`, sans-serif | Modern, geometric, friendly curves matching rounded surfaces |
| Body | `Inter`, `system-ui`, sans-serif | High legibility and neutral proportions across small card sizes |
| Monospace | `JetBrains Mono`, `ui-monospace`, monospace | Crisp formatting for code snippets, prompts, and tool tags |

### Typography Scale
- **Page Title:** 24px / Semibold (`text-2xl font-bold tracking-tight text-slate-900`)
- **Column Header:** 15px / Semibold (`text-sm font-semibold tracking-wide text-slate-800`)
- **Card Title:** 14px / Medium (`text-sm font-medium text-slate-900`)
- **Body / Context:** 13px–14px / Regular (`text-sm text-slate-600 leading-relaxed`)
- **Badges & Dates:** 11px–12px / Medium (`text-xs font-medium`)

---

## 4. Component Principles

- **Columns:** Large, friendly, translucent containers (`rounded-3xl bg-white/65 backdrop-blur-md border border-white/60 shadow-sm p-4`).
- **Cards:** Crisp floating white surfaces with generous curvature (`rounded-2xl bg-white p-4 shadow-sm hover:shadow-md transition-shadow border border-slate-100`).
- **Pill Badges:** Fully rounded capsules (`rounded-full px-2.5 py-0.5 text-xs font-medium`).
- **Buttons:** Tactile pill-shaped or soft-rounded controls (`rounded-full` or `rounded-xl`, generous padding, smooth hover transition).
- **Modal:** Centered floating dialog (`rounded-3xl bg-white/95 backdrop-blur-lg border border-slate-200/80 shadow-2xl p-6 max-w-lg`).
- **Anchor Board:** Pinned glassmorphic ribbon above the Kanban board for quick access to deliverables.
- **Empty States:** Friendly translucent card with dashed border, warm muted text (`rounded-2xl border-2 border-dashed border-slate-300/80 p-6 text-center text-slate-400 text-sm`).
- **Drag Affordance (if used):** Lightweight drag-and-drop handles paired with fallback status select dropdowns in the task modal for quick one-click column transitions.

---

## 5. Voice / microcopy

| Where | Text |
|---|---|
| "+" button label | `+ Add Task` |
| Empty column placeholder | `No tasks in this stage yet · Ready for the next vibe` |
| Toast after "Copy as Prompt Context" | `Prompt context copied to clipboard! Ready to paste into AI.` |
| Confirm-delete message | `Delete this task? Prompt history and context will be permanently lost.` |
| Handoff toast (M7 `task-owner`) | `Handed off to {name}. Context is in their hands.` |

---

## 6. Logo / Wordmark

- **Product Name:** **VibeTracker**
- **Wordmark Style:** Clean bold sans-serif with a warm gradient accent dot: `VibeTracker` (`text-slate-900 font-extrabold`).

---

## 7. Out of Scope (This Hackathon)

To maintain focus and high build quality during the hackathon, the following are explicitly out of scope for design:

- Dark mode toggle (shipping a polished, warm translucent light mode).
- Multiple themes (one cohesive brand applied consistently).
- Complex physics-based animations (limiting motion to smooth 200 ms hover transitions and toast fades).
- Custom icon set (utilizing standard SVG icons / Lucide icon shapes).
