// Configuration loading, defaults, and validation.
// Zero dependencies. The whole point: a missing or partial config still works.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const CADENCES = { daily: 1, weekly: 7, monthly: 30 };
export const TONES = ['subtle', 'warm', 'effusive'];
export const CHANNELS = ['stdout', 'markdown', 'slack', 'github'];

// The default praise taxonomy. Each category is enabled with weight 1 unless the
// user overrides it. Weight scales a category's match score during selection.
export const DEFAULT_CATEGORIES = [
  'marketing-copy',
  'api-design',
  'ux',
  'visual-design',
  'simplicity',
  'progressive-disclosure',
  'safety',
  'performance',
  'docs',
  'test-coverage',
  'accessibility',
];

export const DEFAULTS = {
  // How often you intend to run. Drives the default lookback window.
  cadence: 'weekly',
  // Loudness of the praise. subtle = understated, effusive = celebratory.
  tone: 'warm',
  // Which categories are live, and their relative weight. `true` means weight 1.
  categories: Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c, true])),
  // Where compliments go. stdout + markdown are safe and on by default.
  channels: {
    stdout: { enabled: true },
    markdown: { enabled: true, path: 'SUNSHINE.md' },
    // Opt-in. Reads the webhook URL from the SLACK_WEBHOOK_URL env var.
    slack: { enabled: false, webhookEnv: 'SLACK_WEBHOOK_URL' },
    // Opt-in. Posts a PR comment using GITHUB_TOKEN in a GitHub Actions context.
    github: { enabled: false, tokenEnv: 'GITHUB_TOKEN' },
  },
  // Minimum match score for a compliment to be emitted. Higher = pickier.
  minConfidence: 1,
  // Map git author names/emails to display handles, e.g. "@nina".
  team: {},
  // Author names/emails to never single out (e.g. bots).
  optOut: ['dependabot[bot]', 'github-actions[bot]'],
  // One honest, non-fabricated line shown when a run finds no qualifying signal.
  quietFallback:
    'Quiet stretch in the commit log — sometimes the most valuable work is the rest you took, the fire you prevented, or the thinking that has not landed yet.',
  // An optional intro that acknowledges the grind before the praise. Empty = off.
  intro: '',
};

class ConfigError extends Error {}

function fail(field, msg) {
  throw new ConfigError(`Invalid sunshine config at "${field}": ${msg}`);
}

// Deep-merge user config over defaults so partial configs are complete.
function merge(base, over) {
  if (Array.isArray(over)) return over.slice();
  if (over && typeof over === 'object') {
    const out = { ...base };
    for (const k of Object.keys(over)) {
      out[k] = merge(base?.[k], over[k]);
    }
    return out;
  }
  return over === undefined ? base : over;
}

export function validate(cfg) {
  if (!CADENCES[cfg.cadence]) {
    fail('cadence', `must be one of ${Object.keys(CADENCES).join(', ')}`);
  }
  if (!TONES.includes(cfg.tone)) {
    fail('tone', `must be one of ${TONES.join(', ')}`);
  }
  if (typeof cfg.categories !== 'object' || cfg.categories === null) {
    fail('categories', 'must be an object of { categoryName: weight }');
  }
  for (const [name, w] of Object.entries(cfg.categories)) {
    const weight = w === true ? 1 : w === false ? 0 : w;
    if (typeof weight !== 'number' || Number.isNaN(weight) || weight < 0) {
      fail(`categories.${name}`, 'must be true, false, or a non-negative number');
    }
  }
  for (const name of Object.keys(cfg.channels)) {
    if (!CHANNELS.includes(name)) {
      fail(`channels.${name}`, `unknown channel; valid: ${CHANNELS.join(', ')}`);
    }
  }
  if (typeof cfg.minConfidence !== 'number' || cfg.minConfidence < 0) {
    fail('minConfidence', 'must be a non-negative number');
  }
  if (typeof cfg.team !== 'object' || cfg.team === null) {
    fail('team', 'must be an object mapping author -> handle');
  }
  if (!Array.isArray(cfg.optOut)) {
    fail('optOut', 'must be an array of author names/emails');
  }
  return cfg;
}

// Normalize category weights to a flat { name: number } map, dropping zeros.
export function activeCategories(cfg) {
  const out = {};
  for (const [name, w] of Object.entries(cfg.categories)) {
    const weight = w === true ? 1 : w === false ? 0 : w;
    if (weight > 0) out[name] = weight;
  }
  return out;
}

export function loadConfig(cwd = process.cwd(), filename = 'sunshine.config.json') {
  const path = resolve(cwd, filename);
  let user = {};
  if (existsSync(path)) {
    let raw;
    try {
      raw = readFileSync(path, 'utf8');
    } catch (e) {
      throw new ConfigError(`Could not read ${path}: ${e.message}`);
    }
    try {
      user = JSON.parse(raw);
    } catch (e) {
      throw new ConfigError(`${path} is not valid JSON: ${e.message}`);
    }
  }
  const merged = merge(DEFAULTS, user);
  validate(merged);
  return { config: merged, path, exists: existsSync(path) };
}

export { ConfigError };
