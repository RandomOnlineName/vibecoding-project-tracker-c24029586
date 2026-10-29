/**
 * Prompt formatting for the task editor's copy buttons.
 *
 * The AI Context Window holds two parts:
 *   1. Resources: raw material for an agent (logs, stack traces, files, docs)
 *   2. A REASONS canvas: Structured Prompt-Driven Development (SPDD) instructions,
 *      see https://martinfowler.com/articles/structured-prompt-driven/
 *
 * Unfilled template sections are pruned before anything is copied.
 */

export const CONTEXT_TEMPLATE = `## Resources
<!-- Raw material for the agent. Paste output inside the fences; delete what you don't need. -->

### Logs
\`\`\`text

\`\`\`

### Stack trace
\`\`\`text

\`\`\`

### Relevant files & docs
-

## REASONS Canvas (SPDD)
<!-- Structured Prompt-Driven Development: the contract the agent works to. -->

### R — Requirements
Problem:
Definition of Done:

### E — Entities
-

### A — Approach
-

### S — Structure
-

### O — Operations
1.

### N — Norms
-

### S — Safeguards
-
`;

const TYPE_LABELS = { feature: 'Feature', bug: 'Bug', urgent: 'Urgent fix', additional: 'Additional' };
const STATUS_LABELS = { todo: 'To Do', 'in-progress': 'In Progress', review: 'Review', done: 'Done' };

const HEADING = /^(#{1,6})\s/;
const FENCE = /^\s*(```|~~~)/;

// Drop headings that have no content before the next heading of the same or higher level.
function pruneEmptySections(md) {
  let lines = md.split('\n');
  let changed = true;
  while (changed) {
    changed = false;
    const out = [];
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (FENCE.test(line)) inFence = !inFence;
      const m = !inFence && HEADING.exec(line);
      if (m) {
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        const next = j < lines.length ? HEADING.exec(lines[j]) : null;
        if (j >= lines.length || (next && next[1].length <= m[1].length)) {
          changed = true;
          continue;
        }
      }
      out.push(line);
    }
    lines = out;
  }
  return lines.join('\n');
}

// Drop fenced code blocks whose body is blank, plus blank bullets / unfilled labels outside fences.
function dropEmptyBlocks(md) {
  const lines = md.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const open = FENCE.exec(lines[i]);
    if (open) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith(open[1])) j++;
      const body = lines.slice(i + 1, j);
      if (body.some((l) => l.trim())) out.push(...lines.slice(i, j + 1));
      i = j;
      continue;
    }
    if (/^[ \t]*(?:[-*]|\d+\.)[ \t]*$/.test(lines[i])) continue;
    if (/^[ \t]*(?:Problem|Definition of Done):[ \t]*$/i.test(lines[i])) continue;
    out.push(lines[i]);
  }
  return out.join('\n');
}

/** Strips template comments, empty fences, blank bullets and unfilled sections. */
export function cleanContext(md = '') {
  const stripped = dropEmptyBlocks((md || '').replace(/<!--[\s\S]*?-->/g, ''));
  return pruneEmptySections(stripped).replace(/\n{3,}/g, '\n\n').trim();
}

/** True when the context is empty or still just the untouched template. */
export function isContextEmpty(md) {
  return cleanContext(md) === '';
}

const hasCanvas = (md) => /REASONS|^#{1,6}\s*R\s*[—-]\s*Requirements/im.test(md);

/**
 * Formats the task's problem description and context as one block
 * ready to paste into a model chat. XML-style tags keep the pasted markdown
 * from colliding with the wrapper's own structure.
 */
export function buildModelPrompt(task) {
  const context = cleanContext(task.context);
  const description = (task.description || '').trim();

  const intro = [
    'You are an AI coding agent working on a task from our team\'s VibeTracker board.',
    'Use the problem description and the context below.',
  ];
  if (hasCanvas(context)) {
    intro.push(
      'The context includes a REASONS canvas (Structured Prompt-Driven Development). Treat it as the contract:',
      'meet the Requirements and Definition of Done, follow the Approach, Structure and Operations,',
      'respect the Norms, and never violate the Safeguards.'
    );
  }
  intro.push('If something essential is missing, ask before guessing.');

  const meta = [
    `Title: ${task.title?.trim() || 'Untitled task'}`,
    `Type: ${TYPE_LABELS[task.type] || task.type || 'Feature'}`,
    `Status: ${STATUS_LABELS[task.status] || task.status || 'To Do'}`,
    task.assignee ? `Assignee: ${task.assignee}` : null,
    `Due: ${task.dueDate || 'No deadline'}`,
    task.contextTool ? `Target tool: ${task.contextTool}` : null,
  ].filter(Boolean);

  const blocks = [intro.join(' '), `<task>\n${meta.join('\n')}\n</task>`];
  if (description) blocks.push(`<problem_description>\n${description}\n</problem_description>`);
  if (context) blocks.push(`<context>\n${context}\n</context>`);
  return blocks.join('\n\n');
}
