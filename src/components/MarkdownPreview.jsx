/**
 * Markdown preview for the task editor's AI Context and Prompt History buffers.
 * Output is sanitised with DOMPurify, since task text is user-supplied.
 */
import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

const EDITOR_MODES = [
  { id: 'write', label: 'Write' },
  { id: 'split', label: 'Split', title: 'Editor and live preview side by side' },
  { id: 'preview', label: 'Preview' },
];

/** Segmented Write / Split / Preview control. `mode` is 'write' | 'split' | 'preview'. */
export function EditorModeToggle({ mode, onChange, label, controls }) {
  const base = 'btn py-1 px-2.5';
  const active = 'bg-surface-elevated border-border-strong text-text-primary';
  const idle = 'bg-transparent border-border-subtle text-text-muted hover:text-text-primary';
  return (
    <div role="group" aria-label={`${label} display mode`} className="inline-flex">
      {EDITOR_MODES.map((m, i) => (
        <button
          key={m.id}
          type="button"
          aria-pressed={mode === m.id}
          aria-controls={controls}
          title={m.title}
          onClick={() => onChange(m.id)}
          className={`${base} ${i > 0 ? 'rounded-l-none -ml-px' : ''} ${i < EDITOR_MODES.length - 1 ? 'rounded-r-none' : ''} ${mode === m.id ? active : idle}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

export default function MarkdownPreview({ id, source, label, className = '' }) {
  const html = useMemo(
    () => DOMPurify.sanitize(marked.parse(source || '')),
    [source]
  );

  return (
    <div
      id={id}
      role="region"
      aria-label={`${label} preview`}
      tabIndex={0}
      className={`md-preview bg-surface-code border border-border-strong p-4 overflow-auto ${className}`}
    >
      {source?.trim() ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-text-subtle italic">Nothing to preview yet.</p>
      )}
    </div>
  );
}
