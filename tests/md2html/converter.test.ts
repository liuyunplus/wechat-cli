import { describe, it, expect } from 'vitest';
import { convertMarkdown } from '../../src/md2html/converter.js';
import { getThemeIds } from '../../src/md2html/themes/index.js';

const ALL_THEMES = getThemeIds();

describe('convertMarkdown - list rendering (all themes)', () => {
  // The list fix lives in the shared converter (listitem() no longer emits a
  // trailing \n), so it must apply to every theme. WeChat's editor otherwise
  // wraps each stray text node between </li> and <li> as an empty <li> entry.
  for (const theme of ALL_THEMES) {
    it(`[${theme}] unordered list has no whitespace between <li> elements`, () => {
      const md = `- A
- B
- C
`;
      const html = convertMarkdown(md, { theme });
      expect(html).not.toMatch(/<\/li>\s+<li/);
    });

    it(`[${theme}] ordered list has no whitespace between <li> elements`, () => {
      const md = `1. A
2. B
3. C
`;
      const html = convertMarkdown(md, { theme });
      expect(html).not.toMatch(/<\/li>\s+<li/);
    });

    it(`[${theme}] <ul>...</ul> markup is compact`, () => {
      const html = convertMarkdown(`- A\n- B\n`, { theme });
      expect(html).toMatch(/<ul[^>]*><li[^>]*>A<\/li><li[^>]*>B<\/li><\/ul>/);
    });

    it(`[${theme}] <ol>...</ol> markup is compact`, () => {
      const html = convertMarkdown(`1. A\n2. B\n`, { theme });
      expect(html).toMatch(/<ol[^>]*><li[^>]*>A<\/li><li[^>]*>B<\/li><\/ol>/);
    });
  }
});

describe('convertMarkdown - code block rendering (all themes)', () => {
  // The code block fix lives in the shared converter (renderCodeBlock adds
  // text-align:left + white-space:pre-wrap + word-break:break-all to every
  // line span, and a 14px vertical margin + text-align:left to the outer
  // section). It must apply regardless of the theme's pre style.
  const codeMd = '```python\ndef foo():\n    return 1\n```';

  for (const theme of ALL_THEMES) {
    it(`[${theme}] each code line span disables justify and enables safe wrap`, () => {
      const html = convertMarkdown(codeMd, { theme });
      const lineSpans = html.match(/<span style="display:block;[^"]*">/g) ?? [];
      expect(lineSpans.length).toBeGreaterThan(0);
      for (const span of lineSpans) {
        expect(span).toContain('text-align:left');
        expect(span).toContain('white-space:pre-wrap');
        expect(span).toContain('word-break:break-all');
      }
    });

    it(`[${theme}] outer code block section pins text-align:left`, () => {
      const html = convertMarkdown(codeMd, { theme });
      expect(html).toMatch(/<section style="padding:12px 16px;overflow-x:auto;text-align:left;">/);
    });

    it(`[${theme}] keeps the macOS header dots and language label`, () => {
      const html = convertMarkdown(codeMd, { theme });
      expect(html).toContain('background-color:#ff5f57');
      expect(html).toContain('background-color:#febc2e');
      expect(html).toContain('background-color:#28c840');
      expect(html).toMatch(/<span style="font-size:12px;color:[^"]+;">python<\/span>/);
    });

    it(`[${theme}] code block outer section uses the reduced 14px vertical margin`, () => {
      const html = convertMarkdown(codeMd, { theme });
      expect(html).toMatch(/<section style="margin:14px 0;[^"]*background:/);
    });
  }
});

describe('convertMarkdown - apple theme layout', () => {
  it('container should use the trimmed 14px/14px/28px/14px padding', () => {
    const html = convertMarkdown('# Title', { theme: 'apple' });
    expect(html).toContain('padding: 14px 14px 28px 14px');
  });

  it('h1 should not have a top margin (relies on container padding)', () => {
    const html = convertMarkdown('# Title', { theme: 'apple' });
    expect(html).toMatch(/<h1[^>]*margin: 0 0 16px/);
  });

  it('h2-h4 should use the reduced margins', () => {
    const html = convertMarkdown('## H2\n### H3\n#### H4', { theme: 'apple' });
    expect(html).toMatch(/<h2[^>]*margin: 24px 0 12px/);
    expect(html).toMatch(/<h3[^>]*margin: 20px 0 10px/);
    expect(html).toMatch(/<h4[^>]*margin: 16px 0 8px/);
  });

  it('paragraph and list margins should be reduced to 12px', () => {
    const html = convertMarkdown('text\n\n- a\n- b', { theme: 'apple' });
    expect(html).toMatch(/<p[^>]*margin: 12px 0/);
    expect(html).toMatch(/<ul[^>]*margin: 12px 0/);
  });
});

describe('convertMarkdown - wechat 主题布局', () => {
  it('container should keep the original tight 8/10/24/10 padding', () => {
    const html = convertMarkdown('# Title', { theme: 'wechat' });
    expect(html).toContain('padding: 8px 10px 24px 10px');
  });

  it('h1 should not have a top margin (relies on container padding)', () => {
    const html = convertMarkdown('# Title', { theme: 'wechat' });
    expect(html).toMatch(/<h1[^>]*margin: 0 0 16px/);
  });

  it('h2-h4 should use the reduced margins', () => {
    const html = convertMarkdown('## H2\n### H3\n#### H4', { theme: 'wechat' });
    expect(html).toMatch(/<h2[^>]*margin: 24px 0 12px/);
    expect(html).toMatch(/<h3[^>]*margin: 20px 0 10px/);
    expect(html).toMatch(/<h4[^>]*margin: 16px 0 8px/);
  });

  it('paragraph and list margins should be 12px', () => {
    const html = convertMarkdown('text\n\n- a\n- b', { theme: 'wechat' });
    expect(html).toMatch(/<p[^>]*margin: 12px 0/);
    expect(html).toMatch(/<ul[^>]*margin: 12px 0/);
  });

  it('blockquote, pre, table should use 16px vertical margin', () => {
    const html = convertMarkdown('> q\n\n```js\nx\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |', { theme: 'wechat' });
    expect(html).toMatch(/<blockquote[^>]*margin: 16px 0/);
    // Code block uses a hardcoded <section style="margin:14px 0;..."> wrapper, not <pre>.
    expect(html).toMatch(/<section style="margin:14px 0;[^"]*background:/);
    expect(html).toMatch(/<table[^>]*margin: 16px 0/);
  });

  it('hr should use 24px, img should use 12px', () => {
    const html = convertMarkdown('---\n\n![](a.png)', { theme: 'wechat' });
    expect(html).toMatch(/<hr[^>]*margin: 24px 0/);
    expect(html).toMatch(/<img[^>]*margin: 12px 0/);
  });
});

describe('convertMarkdown - 默认主题布局（抽样 workspace / bloomberg / sunset）', () => {
  const sampled = ['workspace', 'bloomberg', 'sunset'] as const;

  for (const id of sampled) {
    it(`${id}: container padding should be 14/14/28/14`, () => {
      const html = convertMarkdown('# Title', { theme: id });
      expect(html).toContain('padding: 14px 14px 28px 14px');
    });

    it(`${id}: h1 should have zero top margin`, () => {
      const html = convertMarkdown('# Title', { theme: id });
      expect(html).toMatch(/<h1[^>]*margin: 0 0 16px/);
    });

    it(`${id}: h2-h4 should use the reduced margins`, () => {
      const html = convertMarkdown('## H2\n### H3\n#### H4', { theme: id });
      expect(html).toMatch(/<h2[^>]*margin: 24px 0 12px/);
      expect(html).toMatch(/<h3[^>]*margin: 20px 0 10px/);
      expect(html).toMatch(/<h4[^>]*margin: 16px 0 8px/);
    });

    it(`${id}: paragraph, list, blockquote, code block, table should be tightened`, () => {
      const md = 'p\n\n- a\n\n> q\n\n```js\nx\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n';
      const html = convertMarkdown(md, { theme: id });
      expect(html).toMatch(/<p[^>]*margin: 12px 0/);
      expect(html).toMatch(/<ul[^>]*margin: 12px 0/);
      expect(html).toMatch(/<blockquote[^>]*margin: 16px 0/);
      // Code block uses a hardcoded <section style="margin:14px 0;..."> wrapper, not <pre>.
      expect(html).toMatch(/<section style="margin:14px 0;[^"]*background:/);
      expect(html).toMatch(/<table[^>]*margin: 16px 0/);
    });

    it(`${id}: hr should use 24px (auto centered), img should use 12px (auto centered)`, () => {
      const html = convertMarkdown('---\n\n![](a.png)', { theme: id });
      expect(html).toMatch(/<hr[^>]*margin: 24px auto/);
      expect(html).toMatch(/<img[^>]*margin: 12px auto/);
    });
  }
});
