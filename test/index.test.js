import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../src/index.js';

function git(args, cwd) {
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' });
}

async function makeRepo(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'sunshine-run-'));
  try {
    git(['init', '-q'], dir);
    git(['config', 'user.email', 'nina@example.com'], dir);
    git(['config', 'user.name', 'Nina Patel'], dir);
    git(['config', 'commit.gpgsign', 'false'], dir);
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function commit(dir, file, contents, message) {
  writeFileSync(join(dir, file), contents);
  git(['add', '-A'], dir);
  git(['commit', '-q', '-m', message], dir);
}

const now = new Date('2026-06-13T00:00:00Z');

test('run throws on a non-git directory', async () => {
  const plain = mkdtempSync(join(tmpdir(), 'sunshine-nogit-'));
  try {
    await assert.rejects(() => run({ cwd: plain }), /Not a git repository/);
  } finally {
    rmSync(plain, { recursive: true, force: true });
  }
});

test('run generates a digest and reports the commit count', async () => {
  await makeRepo(async (dir) => {
    commit(dir, 'a.js', 'x\n', 'delete dead code to simplify the module');
    const result = await run({ cwd: dir, since: '2020-01-01', only: [], now });
    assert.ok(result.digest.compliments.length >= 1);
    assert.equal(result.commitCount, 1);
  });
});

test('markdown channel writes SUNSHINE.md and is idempotent on marker', async () => {
  await makeRepo(async (dir) => {
    commit(dir, 'a.js', 'x\n', 'simplify and delete dead code');
    await run({ cwd: dir, only: ['markdown'], since: '2020-01-01', now });
    const path = join(dir, 'SUNSHINE.md');
    assert.ok(existsSync(path));
    const first = readFileSync(path, 'utf8');
    assert.ok(first.includes('<!-- sunshine:entries -->'));

    // A second run prepends a new section under the marker, not a duplicate header.
    await run({ cwd: dir, only: ['markdown'], since: '2020-01-01', now });
    const second = readFileSync(path, 'utf8');
    assert.equal(second.match(/# ☀️ Sunshine/g).length, 1, 'header appears exactly once');
    assert.ok(second.match(/## ☀️/g).length >= 2, 'two dated sections');
  });
});

test('markdown HEADER links to Cartooli/sunshine-bot, not dwellchecker', async () => {
  await makeRepo(async (dir) => {
    commit(dir, 'a.js', 'x\n', 'simplify and delete dead code');
    await run({ cwd: dir, only: ['markdown'], since: '2020-01-01', now });
    const body = readFileSync(join(dir, 'SUNSHINE.md'), 'utf8');
    assert.match(body, /https:\/\/github\.com\/Cartooli\/sunshine-bot/);
    assert.doesNotMatch(body, /dwellchecker\/sunshine-bot/);
  });
});

test('dry-run writes nothing', async () => {
  await makeRepo(async (dir) => {
    commit(dir, 'a.js', 'x\n', 'simplify and delete dead code');
    await run({ cwd: dir, only: ['markdown'], since: '2020-01-01', dryRun: true, now });
    assert.equal(existsSync(join(dir, 'SUNSHINE.md')), false);
  });
});

test('an unknown cadence override fails with a clear message', async () => {
  await makeRepo(async (dir) => {
    commit(dir, 'a.js', 'x\n', 'add tests');
    await assert.rejects(() => run({ cwd: dir, cadence: 'hourly', now }), /Unknown cadence "hourly"/);
  });
});

test('an unknown channel in only is skipped without throwing', async () => {
  await makeRepo(async (dir) => {
    commit(dir, 'a.js', 'x\n', 'add tests');
    const logs = [];
    const result = await run({
      cwd: dir,
      only: ['nope'],
      since: '2020-01-01',
      now,
      log: (m) => logs.push(m),
    });
    assert.ok(logs.some((l) => /unknown channel/.test(l)));
    assert.deepEqual(result.results, {});
  });
});
