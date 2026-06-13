// Public API + orchestration. The CLI and any other host (GitHub Action, a future
// Claude skill, a hosted dashboard) call run() — the delivery shell is thin and
// swappable; all the real logic lives in the modules it composes.

import { loadConfig, CADENCES } from './config.js';
import { isGitRepo, collectCommits, sinceFromDays, repoSlug } from './git.js';
import { generateDigest } from './generator.js';

import { deliver as stdoutDeliver } from './channels/stdout.js';
import { deliver as markdownDeliver } from './channels/markdown.js';
import { deliver as slackDeliver } from './channels/slack.js';
import { deliver as githubDeliver } from './channels/github.js';

const DELIVERERS = {
  stdout: stdoutDeliver,
  markdown: markdownDeliver,
  slack: slackDeliver,
  github: githubDeliver,
};

const noop = () => {};

/**
 * Run a full Sunshine pass: load config, read git, generate, deliver.
 * @param {object} opts
 * @param {string}  [opts.cwd]       Repository root.
 * @param {boolean} [opts.dryRun]    Don't write files or post anywhere.
 * @param {string}  [opts.since]     Explicit ISO date overriding cadence window.
 * @param {string}  [opts.cadence]   Override the configured cadence.
 * @param {string[]}[opts.only]      Restrict to these channel names.
 * @param {Date}    [opts.now]
 * @param {function}[opts.log]       Logger for operational messages.
 */
export async function run(opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const log = opts.log || noop;
  const now = opts.now || new Date();
  const dryRun = !!opts.dryRun;

  if (!isGitRepo(cwd)) {
    throw new Error(`Not a git repository: ${cwd}`);
  }

  const { config, exists } = loadConfig(cwd);
  if (!exists) log('No sunshine.config.json found — using defaults.');

  const cadence = opts.cadence || config.cadence;
  const since = opts.since || sinceFromDays(CADENCES[cadence], now);
  const slug = repoSlug(cwd);

  const commits = collectCommits({ cwd, since });
  log(`Scanned ${commits.length} commit(s) since ${since.slice(0, 10)}.`);

  const digest = generateDigest(commits, config, { now });

  // Channel selection:
  //   - opts.only is an explicit list (even []): run exactly those, force-enabled.
  //     "--only slack" means "I want slack" even if it's disabled in config.
  //     [] means "no channels" (used by preview, which prints the digest itself).
  //   - opts.only undefined: run whichever channels are enabled in config.
  const channelNames = Array.isArray(opts.only)
    ? opts.only
    : Object.keys(config.channels).filter((n) => config.channels[n].enabled);

  const ctx = { cwd, dryRun, now, slug, log };
  const results = {};
  for (const name of channelNames) {
    const channelCfg = config.channels[name];
    const fn = DELIVERERS[name];
    if (!channelCfg || !fn) {
      log(`[${name}] unknown channel — skipped.`);
      continue;
    }
    try {
      results[name] = await fn(digest, config, channelCfg, ctx);
    } catch (e) {
      log(`[${name}] error: ${e.message}`);
      results[name] = { error: e.message };
    }
  }

  return { digest, results, config, since, slug, commitCount: commits.length };
}

export { loadConfig, generateDigest, collectCommits };
export { DEFAULTS } from './config.js';
