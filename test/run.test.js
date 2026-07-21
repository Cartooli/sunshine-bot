import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../src/index.js';

// These run against the sunshine-bot repo itself (a real git repo), so they
// exercise the real git path without fixtures.
const cwd = process.cwd();

test('run rejects an unknown cadence override with a clear message', async () => {
  await assert.rejects(
    () => run({ cwd, cadence: 'yearly', only: [] }),
    /Unknown cadence "yearly"/,
  );
});

test('run rejects an invalid --since date with a clear message', async () => {
  await assert.rejects(
    () => run({ cwd, since: 'not-a-date', only: [] }),
    /Invalid --since date/,
  );
});

test('run accepts a valid since date and returns a digest', async () => {
  const { digest, commitCount } = await run({ cwd, since: '2020-01-01', only: [] });
  assert.ok(digest, 'expected a digest');
  assert.ok(typeof commitCount === 'number');
});
