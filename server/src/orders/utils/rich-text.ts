/**
 * Allow-list sanitizer for the rich-text fields admins write (the gateway
 * description shown to customers). Admins are trusted but their HTML is stored
 * and rendered with `dangerouslySetInnerHTML`, so anything outside the allow-list
 * is dropped here — at the boundary, once — rather than at every render site.
 *
 * Allowed inline formatting mirrors what the admin editor can produce:
 * headings, emphasis, lists, blockquote, links and code.
 */

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'a',
  'code',
  'pre',
  'span',
  'div',
]);

/** Only `a` carries attributes; everything else is stripped down to the tag. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target']),
};

const SAFE_URL = /^(https?:|mailto:|tel:)/i;

/** Elements whose *content* must disappear too, not just the tags. */
const VOID_CONTENT = /<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi;

export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return '';

  let html = String(input);
  html = html.replace(VOID_CONTENT, '');
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  // Any other comment variant / stray markup is dropped by the tag pass below.
  html = html.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');

  html = html.replace(
    /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
    (match, closing: string, rawName: string, rawAttrs: string) => {
      const name = rawName.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return ''; // drop the tag, keep the text
      if (closing) return `</${name}>`;

      const allowed = ALLOWED_ATTRS[name];
      if (!allowed) return `<${name}>`;

      const attrs = filterAttributes(rawAttrs, allowed);
      if (name === 'a') {
        // Outbound links always open safely.
        attrs.push('target="_blank"', 'rel="noopener noreferrer"');
      }
      return `<${name}${attrs.map((a) => ` ${a}`).join('')}>`;
    },
  );

  return html.trim();
}

function filterAttributes(
  rawAttrs: string,
  allowed: Set<string>,
): string[] {
  const out: string[] = [];
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawAttrs)) !== null) {
    const name = m[1].toLowerCase();
    if (!allowed.has(name)) continue; // drops onclick=, style=, onerror=, …
    const value = (m[3] ?? m[4] ?? m[5] ?? '').trim();
    if (name === 'href' && !SAFE_URL.test(value)) continue; // no javascript:, data:
    out.push(`${name}="${escapeAttribute(value)}"`);
  }
  return out;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}