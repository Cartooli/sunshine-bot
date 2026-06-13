import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, validate, activeCategories, DEFAULTS, ConfigError } from '../src/config.js';

function withConfig(obj, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'sunshine-cfg-'));
  try {
    if (obj !== null) writeFileSync(join(dir, 'sunshine.config.json'), JSON.stringify(obj));
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('missing config falls back to defaults', () => {
  withConfig(null, (dir) => {
    const { config, exists } = loadConfig(dir);
    assert.equal(exists, false);
    assert.equal(config.cadence, 'weekly');
    assert.equal(config.channels.stdout.enabled, true);
    assert.equal(config.channels.slack.enabled, false);
  });
});

test('partial config deep-merges over defaults', () => {
  withConfig({ tone: 'effusive', channels: { slack: { enabled: true } } }, (dir) => {
    const { config } = loadConfig(dir);
    assert.equal(config.tone, 'effusive');
    assert.equal(config.channels.slack.enabled, true);
    // untouched defaults survive
    assert.equal(config.channels.slack.webhookEnv, 'SLACK_WEBHOOK_URL');
    assert.equal(config.channels.markdown.enabled, true);
    assert.equal(config.cadence, 'weekly');
  });
});

test('invalid cadence fails loud with field name', () => {
  withConfig({ cadence: 'hourly' }, (dir) => {
    assert.throws(() => loadConfig(dir), (e) => e instanceof ConfigError && /cadence/.test(e.message));
  });
});

test('invalid category weight is rejected', () => {
  assert.throws(
    () => validate({ ...DEFAULTS, categories: { ux: -1 } }),
    /categories\.ux/,
  );
});

test('unknown channel is rejected', () => {
  assert.throws(
    () => validate({ ...DEFAULTS, channels: { teams: { enabled: true } } }),
    /channels\.teams/,
  );
});

test('activeCategories drops disabled and zero-weight entries', () => {
  const cfg = { ...DEFAULTS, categories: { ux: true, docs: false, safety: 2, perf: 0 } };
  const active = activeCategories(cfg);
  assert.deepEqual(active, { ux: 1, safety: 2 });
});

test('malformed JSON throws a helpful error', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sunshine-cfg-'));
  try {
    writeFileSync(join(dir, 'sunshine.config.json'), '{ not json');
    assert.throws(() => loadConfig(dir), /not valid JSON/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
