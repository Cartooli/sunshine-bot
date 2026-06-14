import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildConfig } from '../src/init.js';
import { TONES, CADENCES, validate } from '../src/config.js';

test('buildConfig applies answers over defaults', () => {
  const cfg = buildConfig({ cadence:'daily', tone:'effusive', slack:true, intro:'Hi', team:{A:'@a'} });
  assert.equal(cfg.cadence,'daily');
  assert.equal(cfg.tone,'effusive');
  assert.equal(cfg.channels.slack.enabled,true);
  assert.equal(cfg.channels.markdown.enabled,true);
  assert.equal(cfg.intro,'Hi');
  assert.deepEqual(cfg.team,{A:'@a'});
});

test('buildConfig defaults are sane', () => {
  const cfg = buildConfig({});
  assert.ok(Object.keys(CADENCES).includes(cfg.cadence));
  assert.ok(TONES.includes(cfg.tone));
  assert.equal(cfg.channels.slack.enabled,false);
  assert.equal(cfg.channels.stdout.enabled,true);
});

test('buildConfig output passes config validation', () => {
  assert.doesNotThrow(()=>validate(buildConfig({ cadence:'monthly' })));
});

test('markdown can be disabled', () => {
  assert.equal(buildConfig({ markdown:false }).channels.markdown.enabled, false);
});
