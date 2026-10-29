// In-page index for long pages (audit addendum §B, AD-B-03). On phones it sticks under the header as one row of
// section links that scrolls sideways inside itself and marks the section in view; on desktop it stays a quiet
// link row. Sections are ordinary elements with ids, so it works with any page.
import { useEffect, useState } from 'react';

export function PageIndex({ items, label = 'On this page' }: { items: { id: string; label: string }[]; label?: string }) {
  const [cur, setCur] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((x): x is HTMLElement => !!x);
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((es) => { const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setCur(v.target.id); }, { rootMargin: '-15% 0px -70% 0px' });
    els.forEach((e) => io.observe(e)); return () => io.disconnect();
  }, [items]);
  if (items.length < 3) return null;
  return (
    <nav className="ds-pageindex" aria-label={label}>
      {items.map((i) => (
        <a key={i.id} href={`#${i.id}`} aria-current={cur === i.id ? 'true' : undefined}
          onClick={(e) => { e.preventDefault(); document.getElementById(i.id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); setCur(i.id); }}>{i.label}</a>
      ))}
    </nav>
  );
}
