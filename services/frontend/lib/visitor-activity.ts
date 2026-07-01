export type VisitorActivityEvent = {
  id: string;
  type: 'page_view' | 'search' | 'product_view' | 'click' | 'assistant_message';
  label: string;
  url: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
};

const STORAGE_KEY = 'flipflop.visitorActivity.v1';
const SESSION_KEY = 'flipflop.visitorSessionId.v1';
const MAX_EVENTS = 80;

const isBrowser = () => typeof window !== 'undefined';

export function getVisitorSessionId() {
  if (!isBrowser()) return 'server';

  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const sessionId = `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
}

export function readVisitorActivity(): VisitorActivityEvent[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-MAX_EVENTS) : [];
  } catch {
    return [];
  }
}

export function recordVisitorActivity(event: Omit<VisitorActivityEvent, 'id' | 'createdAt' | 'url'> & { url?: string }) {
  if (!isBrowser()) return;

  const nextEvent: VisitorActivityEvent = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    url: event.url || `${window.location.pathname}${window.location.search}`,
  };

  const events = [...readVisitorActivity(), nextEvent].slice(-MAX_EVENTS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function getVisitorInterestSummary() {
  const events = readVisitorActivity();
  const searches = events.filter((event) => event.type === 'search').map((event) => event.label).slice(-5);
  const productViews = events.filter((event) => event.type === 'product_view').map((event) => event.label).slice(-5);
  const clicks = events.filter((event) => event.type === 'click').map((event) => event.label).slice(-5);

  return {
    sessionId: getVisitorSessionId(),
    events,
    searches,
    productViews,
    clicks,
  };
}
