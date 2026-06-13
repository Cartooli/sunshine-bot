import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORY_BY_ID, scoreCommit, _kw, _pathHits } from '../src/categories.js';

function commit(over = {}) {
  return {
    hash: 'abc1234',
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

test('keyword matcher respects word boundaries', () => {
  // "ui" should not match inside "build"
  assert.equal(_kw('rebuild pipeline', ['ui']), 0);
  assert.equal(_kw('tweak the ui', ['ui']), 1);
});

test('multi-word keywords match as phrases', () => {
  assert.equal(_kw('improved the empty state copy', ['empty state']), 1);
  assert.equal(_kw('state machine empty', ['empty state']), 0);
});

test('path hits count matching files', () => {
  const files = [{ path: 'src/api/users.ts' }, { path: 'README.md' }];
  assert.equal(_pathHits(files, [/(^|\/)api(\/|$)/]), 1);
});

test('api-design scores a clear API commit', () => {
  const cat = CATEGORY_BY_ID['api-design'];
  const c = commit({ subject: 'redesign the users endpoint schema', files: [{ path: 'src/api/users.ts', insertions: 10, deletions: 2 }] });
  assert.ok(scoreCommit(c, cat) >= 2);
});

test('simplicity rewards net code removal', () => {
  const cat = CATEGORY_BY_ID['simplicity'];
  const removal = commit({ subject: 'delete dead code', insertions: 5, deletions: 220 });
  const addition = commit({ subject: 'add feature', insertions: 200, deletions: 0 });
  assert.ok(scoreCommit(removal, cat) > scoreCommit(addition, cat));
});

test('unrelated commit scores zero for a category', () => {
  const cat = CATEGORY_BY_ID['accessibility'];
  const c = commit({ subject: 'bump dependency versions' });
  assert.equal(scoreCommit(c, cat), 0);
});
