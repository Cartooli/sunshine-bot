import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isGitRepo, collectCommits, sinceFromDays, repoSlug } from '../src/git.js';

function git(args, cwd) {
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' });
}

function makeRepo(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'sunshine-git-'));
  try {
    git(['init', '-q'], dir);
    git(['config', 'user.email', 'nina@example.com'], dir);
    git(['config', 'user.name', 'Nina Patel'], dir);
    git(['config', 'commit.gpgsign', 'false'], dir);
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function commit(dir, file, contents, message) {
  writeFileSync(join(dir, file), contents);
  git(['add', '-A'], dir);
  git(['commit', '-q', '-m', message], dir);
}

test('isGitRepo distinguishes a repo from a bare directory', () => {
  makeRepo((dir) => assert.equal(isGitRepo(dir), true));
  const plain = mkdtempSync(join(tmpdir(), 'sunshine-plain-'));
  try {
    assert.equal(isGitRepo(plain), false);
  } finally {
    rmSync(plain, { recursive: true, force: true });
  }
});

test('sinceFromDays returns an ISO date N days before now', () => {
  const now = new Date('2026-06-13T00:00:00Z');
  assert.equal(sinceFromDays(7, now), '2026-06-06T00:00:00.000Z');
});

test('collectCommits parses subject, author, and numstat', () => {
  makeRepo((dir) => {
    commit(dir, 'a.js', 'one\n', 'add a.js');
    commit(dir, 'a.js', 'one\ntwo\nthree\n', 'grow a.js');
    const commits = collectCommits({ cwd: dir });
    assert.equal(commits.length, 2);
    // newest first
    assert.equal(commits[0].subject, 'grow a.js');
    assert.equal(commits[0].author, 'Nina Patel');
    assert.equal(commits[0].email, 'nina@example.com');
    assert.ok(commits[0].files.some((f) => f.path === 'a.js'));
    assert.ok(commits[0].insertions >= 2);
  });
});

test('collectCommits detects a squash-merge PR reference in the subject', () => {
  makeRepo((dir) => {
    commit(dir, 'b.js', 'x\n', 'redesign the users endpoint (#41)');
    const [c] = collectCommits({ cwd: dir });
    assert.equal(c.pr, 41);
  });
});

test('collectCommits leaves pr null when there is no reference', () => {
  makeRepo((dir) => {
    commit(dir, 'c.js', 'x\n', 'plain commit with no number');
    const [c] = collectCommits({ cwd: dir });
    assert.equal(c.pr, null);
  });
});

test('repoSlug extracts owner/repo from a github remote', () => {
  makeRepo((dir) => {
    commit(dir, 'd.js', 'x\n', 'init');
    git(['remote', 'add', 'origin', 'git@github.com:acme/app.git'], dir);
    assert.equal(repoSlug(dir), 'acme/app');
  });
});

test('repoSlug keeps dots in the repo name (e.g. user.github.io)', () => {
  makeRepo((dir) => {
    commit(dir, 'f.js', 'x\n', 'init');
    git(['remote', 'add', 'origin', 'https://github.com/acme/foo.github.io'], dir);
    assert.equal(repoSlug(dir), 'acme/foo.github.io');
  });
});

test('repoSlug returns null without a github remote', () => {
  makeRepo((dir) => {
    commit(dir, 'e.js', 'x\n', 'init');
    assert.equal(repoSlug(dir), null);
  });
});
