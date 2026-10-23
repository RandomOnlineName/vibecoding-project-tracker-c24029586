# Vibecoding Project Tracker — Design

**Status:** Design doc finalized · Dark mode utilitarian aesthetic inspired by JetBrains IDE & GitLab Dark.

---

## 1. Mood / vibe

**One sentence:** A focused, high-clarity dark mode developer cockpit inspired by JetBrains and GitLab, delivering utilitarian precision, crisp contrast, and low cognitive overhead for fast-moving vibecoding workflows.

### Visual References
The images saved in the workspace define the visual language:

- **Reference 1 (![alt text](image-4.png) — Dark UI Structure & Contrast):** Deep charcoal surface hierarchy (`#1e1f22` / `#2b2d30`), clean card compartmentalization, and vivid accent indicators.
- **Reference 2 (![alt text](image-5.png) — Kanban Layout & Urgency Tinting):** High-visibility column states, prominent status indicators, and distinct category pill badges.
- **Reference 3 (![alt text](image-6.png) — Utilitarian Information Density):** GitLab-style information-dense issue tracking with clear stage counters, task metadata, and rapid keyboard/dropdown workflows.

### Anti-references (What we explicitly avoid)
- **Anti-Reference (![alt text](image-7.png)):** Overly soft, hyper-pastel, low-density light themes with washed-out contrast that sacrifice developer ergonomics and information density.

---

## 2. Color palette

Utilitarian dark mode palette engineered for developer focus, high legibility (WCAG AA compliant), and reduced eye strain during extended coding sessions.

### 2.1 Brand & Surfaces

| Token | Hex / Value | Where it shows up |
|---|---|---|
| `brand-primary` | `#3574f0` | Primary buttons, active indicators, focus rings (JetBrains blue) |
| `brand-accent` | `#60a5fa` | Cold gradient accent dot, link hovers, active tab highlights |
| `surface-page` | `#1e1f22` | Root application background (JetBrains dark canvas) |
| `surface-column` | `#25272b` | Kanban column container background |
| `surface-card` | `#2b2d30` | Task cards, modal surface, elevated dropdown panels |
| `surface-elevated` | `#323438` | Card hover state, active pill backgrounds, input controls |
| `border-subtle` | `#393b40` | Utilitarian 1px component borders and dividers |
| `text-primary` | `#dfe1e5` | Primary headings, task titles, modal body copy |
| `text-muted` | `#868a91` | Stage counters, dates, metadata, placeholders |

---

### 2.2 Task Type Color Scale (Functional Category)

*Applied to **Pill Badges**, **Category Tags**, and **Task Labels**.*  
*Mental Model: **Warm Spectrum (Red/Orange)** represents diagnostic issues to fix; **Cool Spectrum (Blue/Purple)** represents capabilities being built.*

| Task Type | Token | Hex Code | Dark Mode Pill Classes (`Tailwind`) | Meaning & Visual Role |
|---|---|---|---|---|
| **Urgent Fixes** | `type-urgent` | `#ef4444` | `bg-red-500/15 text-red-400 border border-red-500/30` | Blocker / emergency patch. Demands immediate dev intervention. |
| **Bugs** | `type-bug` | `#f97316` | `bg-orange-500/15 text-orange-400 border border-orange-500/30` | Standard defect or regression. Requires triage without panic. |
| **Important Features** | `type-feature` | `#3b82f6` | `bg-blue-500/15 text-blue-400 border border-blue-500/30` | Core roadmap feature and high-priority deliverable. |
| **Additional Features** | `type-additional` | `#a855f7` | `bg-purple-500/15 text-purple-400 border border-purple-500/30` | Enhancement, polish, stretch goal, or non-critical addition. |

---

### 2.3 Task Significance & Urgency Color Scale (Timeline)

*Applied to **Bottom Accent Stripe (`h-1.5 w-full rounded-full`)**, **Due Date Chips**, and **Timeline Dots**.*  
*Mental Model: A **thermal heat progression** from immediate red-hot deadline down to cold, quiet backlog.*

| Significance Level | Token | Hex Code | Dark Mode Classes (`Tailwind`) | Meaning & Timeline Window |
|---|---|---|---|---|
| **Need Today** | `significance-today` | `#f43f5e` | `bg-rose-500 text-rose-400 bg-rose-500/15` | Critical cutoff today (< 24 hours). Highest operational urgency. |
| **Needed within 5 Days** | `significance-soon` | `#f59e0b` | `bg-amber-500 text-amber-400 bg-amber-500/15` | Approaching deadline within current work week. Actively scheduled. |
| **Needed within 2 Weeks** | `significance-sprint` | `#38bdf8` | `bg-sky-500 text-sky-400 bg-sky-500/15` | Planned within current 2-week cycle. Healthy progress state. |
| **Later** | `significance-later` | `#64748b` | `bg-slate-600 text-slate-400 bg-slate-800/40` | Backlog or future phase. Low cognitive load on board scan. |

---

### 2.4 Dual-Scale Application Rules

To prevent sensory conflict when both scales appear on the same task card:
1. **Type** is always communicated through the **top pill badge** (`bg-{color}/15 text-{color} border border-{color}/30`).
2. **Significance** is always communicated through the **horizontal accent stripe near the bottom of the card** and the **due-date chip** next to the calendar icon.

```
┌──────────────────────────────────────────────────────────────┐
│  [ Urgent Fix ]                              ⏱ Due Today    │  <- Type in Pill Tag, Urgency in Due Chip
│                                                              │
│  Database timeout during bulk task fetch                     │
│  👤 Alex Reed                                💬 Context ready│
│  ══════════════════════════════════════════════════════════  │  <- Bottom accent stripe (e.g. Rose for "Need Today")
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Typography

| Role | Font | Why |
|---|---|---|
| Heading | `Inter`, `system-ui`, sans-serif | Clean, neutral sans-serif with high legibility on dark surfaces |
| Body | `Inter`, `system-ui`, sans-serif | Standardized developer UI font with balanced spacing |
| Monospace | `JetBrains Mono`, `ui-monospace`, monospace | Crisp formatting for code snippets, prompt context, and tool tags |

### Typography Scale
- **Page Title:** 22px / Semibold (`text-xl font-bold tracking-tight text-[#dfe1e5]`)
- **Column Header:** 13px / Semibold uppercase (`text-xs font-semibold tracking-wider text-[#868a91]`)
- **Card Title:** 14px / Medium (`text-sm font-medium text-[#dfe1e5]`)
- **Body / Context:** 13px / Regular (`text-xs text-[#868a91] leading-relaxed`)
- **Badges & Dates:** 11px / Medium (`text-[11px] font-medium`)

---

## 4. Component Principles

- **Columns:** Structured, dark panel containers (`rounded-xl bg-[#25272b] border border-[#393b40] p-3`).
- **Cards:** Crisp dark tiles with subtle borders (`rounded-lg bg-[#2b2d30] border border-[#393b40] p-3.5 hover:border-[#4e5157] hover:bg-[#323438] transition-colors`).
- **Pill Badges:** Compact utilitarian capsules with dark translucent backgrounds (`rounded-full px-2 py-0.5 text-[11px] font-medium border border-current/20`).
- **Buttons:** Utilitarian solid or ghost controls with sharp 6px–8px radius (`rounded-md px-3 py-1.5 text-xs font-medium transition-colors`).
- **Modal / Editor:** Full-page workspace or elevated dark dialog (`rounded-xl bg-[#25272b] border border-[#43454a] shadow-2xl p-6`).
- **Anchor Board:** Pinned dark toolbar above the Kanban board for quick access to deliverables.
- **Empty States:** Subtle dashed outline with muted caption (`rounded-lg border border-dashed border-[#393b40] p-6 text-center text-[#868a91] text-xs`).
- **Drag Affordance (if used):** Lightweight drag handles with fallback status select dropdowns in the task modal for quick one-click column transitions.

---

## 5. Voice / microcopy

| Where | Text |
|---|---|
| "+" button label | `+ Add Task` |
| Empty column placeholder | `No tasks in this stage yet` |
| Toast after "Copy as Prompt Context" | `Prompt context copied to clipboard` |
| Confirm-delete message | `Deleting this task will PERMANENTLY delete all context and history` |
| Handoff toast (M7 `task-owner`) | `Handed off to {name}. Make sure they have necessary context.` |

---

## 6. Logo / Wordmark

- **Product Name:** **VibeTracker**
- **Wordmark Style:** Clean bold sans-serif with a cold gradient accent dot: `VibeTracker` (`text-[#dfe1e5] font-extrabold`).

---

## 7. Out of Scope (This Hackathon)

To maintain focus and high build quality during the hackathon, the following are explicitly out of scope for design:

- Light mode toggle (shipping a polished, utilitarian dark mode as the default experience).
- Multiple themes (one cohesive JetBrains/GitLab dark palette applied consistently).
- Complex physics-based animations (limiting motion to snappy 150ms transitions and toast alerts).
- Custom icon set (utilizing standard SVG icons / Lucide icon shapes).
