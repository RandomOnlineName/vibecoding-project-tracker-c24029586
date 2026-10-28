/**
 * VibeTracker wordmark (DESIGN.md §6): angled brand mark + bold sans name.
 */
export default function Wordmark({ size = 'md', as: Tag = 'span' }) {
  const text = size === 'lg' ? 'text-2xl' : 'text-base';
  const mark = size === 'lg' ? 'w-3.5 h-5' : 'w-2.5 h-4';
  return (
    <Tag className={`inline-flex items-center gap-2 font-extrabold tracking-tight text-text-primary ${text}`}>
      <span aria-hidden="true" className={`${mark} -skew-x-12 bg-gradient-to-b from-brand-accent to-brand-primary`} />
      VibeTracker
    </Tag>
  );
}
