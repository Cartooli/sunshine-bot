import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderMarkdownSection,
  renderTerminal,
  renderSlackBlocks,
  renderGithubComment,
} from '../src/render.js';
import { DEFAULTS } from '../src/config.js';

const now = new Date('2026-06-13T00:00:00Z');

function digest(over = {}) {
  return {
    quiet: false,
    compliments: [
      {
        categoryId: 'simplicity',
        categoryLabel: 'simplicity',
        emoji: '🪶',
        who: 'Nina',
        hash: 'abc1234',
        subject: 'remove dead code',
        file: 'src/legacy.js',
        pr: 41,
        score: 3,
        text: 'Nina chose subtraction in abc1234 (#41): "remove dead code".',
      },
    ],
    window: { since: null },
    ...over,
  };
}

test('markdown section links the hash and PR when a slug is known', () => {
  const md = renderMarkdownSection(digest(), DEFAULTS, { now, slug: 'acme/app' });
  assert.ok(md.includes('[`abc1234`](https://github.com/acme/app/commit/abc1234)'));
  assert.ok(md.includes('[#41](https://github.com/acme/app/pull/41)'));
});

test('markdown section renders a bare hash when no slug is available', () => {
  const md = renderMarkdownSection(digest(), DEFAULTS, { now, slug: null });
  assert.ok(md.includes('`abc1234`'));
  assert.ok(!md.includes('https://github.com'));
});

test('markdown quiet run emits the honest fallback, no compliments', () => {
  const md = renderMarkdownSection(digest({ quiet: true, compliments: [] }), DEFAULTS, { now });
  assert.ok(md.includes(DEFAULTS.quietFallback));
});

test('terminal render omits ANSI codes when color is disabled', () => {
  const out = renderTerminal(digest(), DEFAULTS, { now, color: false });
  // eslint-disable-next-line no-control-regex
  assert.ok(!/\x1b\[/.test(out), 'no escape sequences with color off');
  assert.ok(out.includes('abc1234'));
});

test('terminal render includes ANSI codes when color is enabled', () => {
  const out = renderTerminal(digest(), DEFAULTS, { now, color: true });
  // eslint-disable-next-line no-control-regex
  assert.ok(/\x1b\[/.test(out), 'escape sequences present with color on');
});

test('slack blocks are well-formed and link the artifacts', () => {
  const { blocks, text } = renderSlackBlocks(digest(), DEFAULTS, { now, slug: 'acme/app' });
  assert.ok(Array.isArray(blocks));
  assert.equal(blocks[0].type, 'header');
  const joined = JSON.stringify(blocks);
  assert.ok(joined.includes('<https://github.com/acme/app/commit/abc1234|abc1234>'));
  assert.ok(joined.includes('<https://github.com/acme/app/pull/41|#41>'));
  assert.ok(text.includes('Sunshine'));
});

test('github comment renders a footer and links', () => {
  const body = renderGithubComment(digest(), DEFAULTS, { now, slug: 'acme/app' });
  assert.ok(body.includes('posted by sunshine-bot'));
  assert.ok(body.includes('https://github.com/acme/app/commit/abc1234'));
});

test('a #12 PR ref is not mangled by a longer number in the subject', () => {
  const d = digest({
    compliments: [
      {
        ...digest().compliments[0],
        pr: 12,
        subject: 'fix issue #123',
        text: 'Nina fixed issue #123 in abc1234 (#12): "fix issue #123".',
      },
    ],
  });
  const md = renderMarkdownSection(d, DEFAULTS, { now, slug: 'acme/app' });
  // The real PR ref #12 becomes a link; the unrelated #123 stays untouched.
  assert.ok(md.includes('[#12](https://github.com/acme/app/pull/12)'));
  assert.ok(md.includes('#123'));
  assert.ok(!md.includes('pull/12)3'), 'must not corrupt #123 into a broken link');
});

test('intro line is shown when configured', () => {
  const cfg = { ...DEFAULTS, intro: 'Tough sprint, real progress.' };
  assert.ok(renderMarkdownSection(digest(), cfg, { now }).includes('Tough sprint'));
  assert.ok(renderTerminal(digest(), cfg, { now, color: false }).includes('Tough sprint'));
  assert.ok(renderGithubComment(digest(), cfg, { now }).includes('Tough sprint'));
});
