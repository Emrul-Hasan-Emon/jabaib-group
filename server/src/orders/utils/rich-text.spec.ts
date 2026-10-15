import { sanitizeRichText } from './rich-text';

describe('sanitizeRichText (gateway description)', () => {
  it('keeps the formatting an admin is expected to write', () => {
    const html =
      '<h3>How to pay</h3><p>Send to <strong>01700000000</strong> and keep the ' +
      '<em>reference</em>.</p><ul><li>MFS</li><li>Bank</li></ul>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('removes script blocks including their content', () => {
    expect(
      sanitizeRichText('<p>Hi</p><script>alert("x")</script><p>Bye</p>'),
    ).toBe('<p>Hi</p><p>Bye</p>');
    expect(
      sanitizeRichText('<style>body{display:none}</style><p>Hi</p>'),
    ).toBe('<p>Hi</p>');
  });

  it('strips event handlers and inline styles but keeps the text', () => {
    expect(
      sanitizeRichText('<p onclick="steal()" style="color:red">Careful</p>'),
    ).toBe('<p>Careful</p>');
  });

  it('drops unknown tags while keeping their content', () => {
    expect(
      sanitizeRichText('<marquee>scroll me</marquee><iframe src="x"></iframe>'),
    ).toBe('scroll me');
  });

  it('keeps safe links and forces them to open safely', () => {
    expect(
      sanitizeRichText('<a href="https://example.com">Docs</a>'),
    ).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Docs</a>',
    );
  });

  it('removes javascript: and data: links', () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).toBe(
      '<a target="_blank" rel="noopener noreferrer">x</a>',
    );
    expect(sanitizeRichText('<a href="data:text/html,<b>x</b>">x</a>')).not.toContain(
      'data:',
    );
  });

  it('escapes quotes inside an attribute value so it cannot be terminated early', () => {
    const out = sanitizeRichText('<a href=\'https://e.com/?a="b"\'>x</a>');
    // the only raw quotes left are the ones delimiting href/target/rel
    const href = out.match(/href="([^"]*)"/)?.[1];
    expect(href).toBe('https://e.com/?a=&quot;b&quot;');
    expect(out).not.toContain('a="b"');
  });

  it('strips HTML comments', () => {
    expect(sanitizeRichText('<p>a</p><!-- secret --><p>b</p>')).toBe(
      '<p>a</p><p>b</p>',
    );
  });

  it('handles empty and nullish input', () => {
    expect(sanitizeRichText('')).toBe('');
    expect(sanitizeRichText(null)).toBe('');
    expect(sanitizeRichText(undefined)).toBe('');
    expect(sanitizeRichText('   ')).toBe('');
  });

  it('normalises case and stray whitespace in tags', () => {
    expect(sanitizeRichText('<P >Hello</P >')).toBe('<p>Hello</p>');
  });

  it('cannot be broken out of with nested or malformed markup', () => {
    const hostile =
      '<scr<script>ipt>alert(1)</script></p><img src=x onerror=alert(1)>';
    const out = sanitizeRichText(hostile);
    expect(out).not.toContain('script');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('<img');
  });
});