'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { getVisitorSessionId, recordVisitorActivity } from '@/lib/visitor-activity';

const readableTarget = (target: Element) => {
  const label = target.getAttribute('aria-label') || target.textContent || target.getAttribute('href') || '';
  return label.replace(/\s+/g, ' ').trim().slice(0, 120);
};

export default function VisitorActivityTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    getVisitorSessionId();

    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    recordVisitorActivity({ type: 'page_view', label: pathname, url });

    const search = searchParams.get('search');
    if (search) {
      recordVisitorActivity({ type: 'search', label: search, url });
    }

    const productMatch = pathname.match(/^\/products\/([^/]+)$/);
    if (productMatch) {
      recordVisitorActivity({ type: 'product_view', label: decodeURIComponent(productMatch[1]), url });
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a,button') : null;
      if (!target) return;

      const label = readableTarget(target);
      if (!label) return;

      recordVisitorActivity({
        type: 'click',
        label,
        metadata: {
          tag: target.tagName.toLowerCase(),
          href: target instanceof HTMLAnchorElement ? target.href : null,
        },
      });
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, []);

  return null;
}
