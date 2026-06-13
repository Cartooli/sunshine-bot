#!/usr/bin/env node
// Sunshine Bot CLI — the thin delivery shell around src/index.js.

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        args.flags[key] = true;
      } else {
        args.flags[key] = next;
        i++;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

const HELP = `
☀️  sunshine-bot v${pkg.version}
Specific, earned praise for your team — read from your own git history.

Usage:
  sunshine run [options]     Scan history, generate praise, deliver to enabled channels
  sunshine preview           Dry-run to the terminal only (writes nothing, posts nothing)
  sunshine init              Create a sunshine.config.json from the example
  sunshine --help            Show this help
  sunshine --version         Print version

Options for "run":
  --dry-run                  Show what would happen; write/post nothing
  --since <ISO date>         Override the lookback window (e.g. 2026-06-01)
  --cadence <daily|weekly|monthly>   Override the configured cadence
  --only <names>             Comma-separated channels to use (e.g. stdout,markdown)
  --no-color                 Disable terminal colors

Examples:
  npx sunshine-bot preview
  npx sunshine-bot run --cadence weekly
  npx sunshine-bot run --only markdown,slack
`;

function log(msg) {
  process.stderr.write(`${msg}\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  const { _: positionals, flags } = parseArgs(argv);
  const cmd = positionals[0] || (flags.help ? 'help' : flags.version ? 'version' : 'help');

  if (cmd === 'help' || flags.help) {
    process.stdout.write(HELP);
    return;
  }
  if (cmd === 'version' || flags.version) {
    process.stdout.write(`${pkg.version}\n`);
    return;
  }

  if (cmd === 'init') {
    const dest = resolve(process.cwd(), 'sunshine.config.json');
    if (existsSync(dest)) {
      log('sunshine.config.json already exists — leaving it untouched.');
      return;
    }
    const example = join(__dirname, '..', 'sunshine.config.example.json');
    copyFileSync(example, dest);
    log('Created sunshine.config.json. Edit it to taste, then run: sunshine preview');
    return;
  }

  if (cmd === 'run' || cmd === 'preview') {
    const isPreview = cmd === 'preview';
    const only = flags.only ? String(flags.only).split(',').map((s) => s.trim()) : undefined;
    try {
      // Preview fires no channels (only: []) and prints the terminal view itself,
      // so it works even if stdout is disabled in config and never writes/posts.
      const { digest, config } = await run({
        cwd: process.cwd(),
        dryRun: isPreview || !!flags['dry-run'],
        since: typeof flags.since === 'string' ? new Date(flags.since).toISOString() : undefined,
        cadence: typeof flags.cadence === 'string' ? flags.cadence : undefined,
        only: isPreview ? [] : only,
        log,
      });
      if (isPreview) {
        const { renderTerminal } = await import('../src/render.js');
        process.stdout.write(renderTerminal(digest, config, { color: !flags['no-color'] }));
      }
    } catch (e) {
      log(`✗ ${e.message}`);
      process.exit(1);
    }
    return;
  }

  log(`Unknown command: ${cmd}`);
  process.stdout.write(HELP);
  process.exit(1);
}

main();
