import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateDigest } from '../src/generator.js';
import { DEFAULTS } from '../src/config.js';

function commit(over = {}) {
  return {
    hash: Math.random().toString(16).slice(2, 9),
    author: 'Nina',
    email: 'nina@example.com',
    date: '2026-06-10',
    subject: '',
    body: '',
    files: [],
    insertions: 0,
    deletions: 0,
    pr: null,
    ...over,
  };
}

const now = new Date('2026-06-13T00:00:00Z');

test('every compliment cites a concrete artifact (no hollow praise)', () => {
  const commits = [
    commit({ hash: 'aaa1111', subject: 'add aria labels for screen reader users', files: [{ path: 'src/Button.tsx', insertions: 8, deletions: 1 }] }),
    commit({ hash: 'bbb2222', subject: 'optimize the image cache for faster loads', files: [{ path: 'src/cache.ts', insertions: 12, deletions: 3 }] }),
  ];
  const { compliments, quiet } = generateDigest(commits, DEFAULTS, { now });
  assert.equal(quiet, false);
  assert.ok(compliments.length >= 2);
  for (const c of compliments) {
    assert.ok(c.hash && c.text.includes(c.hash), 'compliment must name its commit hash');
    assert.ok(c.subject && c.text.includes(c.subject), 'compliment must quote the real subject');
  }
});

test('no qualifying signal yields the quiet fallback, not invented praise', () => {
  const commits = [commit({ subject: 'merge branch main' })];
  const { compliments, quiet } = generateDigest(commits, { ...DEFAULTS, minConfidence: 1 }, { now });
  assert.equal(quiet, true);
  assert.equal(compliments.length, 0);
});

test('opted-out authors are never singled out', () => {
  const commits = [
    commit({ author: 'dependabot[bot]', email: 'dependabot[bot]', subject: 'optimize cache performance', files: [{ path: 'a.ts', insertions: 1, deletions: 1 }] }),
  ];
  const { quiet } = generateDigest(commits, DEFAULTS, { now });
  assert.equal(quiet, true);
});

test('team map resolves author handles', () => {
  const commits = [commit({ author: 'Nina Patel', email: 'nina@example.com', subject: 'add tests for the api', files: [{ path: 'api.test.ts', insertions: 30, deletions: 0 }] })];
  const cfg = { ...DEFAULTS, team: { 'Nina Patel': '@nina' } };
  const { compliments } = generateDigest(commits, cfg, { now });
  assert.ok(compliments.some((c) => c.who === '@nina' && c.text.includes('@nina')));
});

test('output is deterministic for a given day', () => {
  const commits = [commit({ hash: 'ccc3333', subject: 'simplify and remove dead code', insertions: 2, deletions: 90 })];
  const a = generateDigest(commits, DEFAULTS, { now });
  const b = generateDigest(commits, DEFAULTS, { now });
  assert.equal(a.compliments[0].text, b.compliments[0].text);
});

test('disabled categories produce no compliments', () => {
  const commits = [commit({ subject: 'optimize cache for performance', files: [{ path: 'c.ts', insertions: 1, deletions: 1 }] })];
  const cfg = { ...DEFAULTS, categories: { performance: false } };
  const { quiet } = generateDigest(commits, cfg, { now });
  assert.equal(quiet, true);
});
