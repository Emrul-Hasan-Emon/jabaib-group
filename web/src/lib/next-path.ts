/** Post-login destination (`?next=/checkout`) — same-origin paths only. */
export function nextPath(fallback = '/user/dashboard'): string {
  if (typeof window === 'undefined') return fallback;
  const raw = new URLSearchParams(window.location.search).get('next');
  if (!raw) return fallback;
  // Only allow internal absolute paths: no protocol-relative ("//evil.com"),
  // no absolute URLs, no backslash tricks — this value controls router.push().
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) {
    return fallback;
  }
  return raw;
}