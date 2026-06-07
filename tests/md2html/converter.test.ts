import { describe, it, expect } from 'vitest';
import { convertMarkdown } from '../../src/md2html/converter.js';

describe('convertMarkdown - list rendering', () => {
  it('should not insert whitespace/newlines between <li> elements (unordered list)', () => {
    const md = `- 第一项
- 第二项
- 第三项
`;
    const html = convertMarkdown(md, { theme: 'apple' });

    // The WeChat editor wraps stray text nodes between </li> and <li> as empty <li>
    // entries, producing extra bullets/empty numbered slots in the rendered article.
    expect(html).not.toMatch(/<\/li>\s+<li/);
  });

  it('should not insert whitespace/newlines between <li> elements (ordered list)', () => {
    const md = `1. 第一步
2. 第二步
3. 第三步
`;
    const html = convertMarkdown(md, { theme: 'apple' });
    expect(html).not.toMatch(/<\/li>\s+<li/);
  });

  it('should produce compact <ul>...</ul> markup', () => {
    const md = `- A
- B
`;
    const html = convertMarkdown(md, { theme: 'apple' });
    expect(html).toMatch(/<ul[^>]*><li[^>]*>A<\/li><li[^>]*>B<\/li><\/ul>/);
  });

  it('should produce compact <ol>...</ol> markup', () => {
    const md = `1. A
2. B
`;
    const html = convertMarkdown(md, { theme: 'apple' });
    expect(html).toMatch(/<ol[^>]*><li[^>]*>A<\/li><li[^>]*>B<\/li><\/ol>/);
  });
});

describe('convertMarkdown - code block rendering', () => {
  const codeMd = '```python\ndef foo():\n    return 1\n```';

  it('each code line span should disable justify and enable safe wrap', () => {
    const html = convertMarkdown(codeMd, { theme: 'apple' });

    // Every line <span style="display:block;..."> must include the three declarations
    // that fight WeChat's default text-align:justify + overflow-x:auto stripping.
    const lineSpans = html.match(/<span style="display:block;[^"]*">/g) ?? [];
    expect(lineSpans.length).toBeGreaterThan(0);
    for (const span of lineSpans) {
      expect(span).toContain('text-align:left');
      expect(span).toContain('white-space:pre-wrap');
      expect(span).toContain('word-break:break-all');
    }
  });

  it('outer code block section should pin text-align:left as a safety net', () => {
    const html = convertMarkdown(codeMd, { theme: 'apple' });
    // Find the inner wrapper section (padding:12px 16px; overflow-x:auto; ...)
    expect(html).toMatch(/<section style="padding:12px 16px;overflow-x:auto;text-align:left;">/);
  });

  it('should still keep the header dots and language label', () => {
    const html = convertMarkdown(codeMd, { theme: 'apple' });
    expect(html).toContain('background-color:#ff5f57');
    expect(html).toContain('background-color:#febc2e');
    expect(html).toContain('background-color:#28c840');
    expect(html).toMatch(/<span style="font-size:12px;color:[^"]+;">python<\/span>/);
  });
});
