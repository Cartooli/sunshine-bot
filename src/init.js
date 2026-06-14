// Interactive `sunshine init` — a short terminal interview that writes a tailored
// sunshine.config.json. Falls back to non-interactive defaults in CI / with --yes.
// Never asks for or stores secrets: Slack/GitHub still read env vars at runtime.

import { writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { DEFAULTS, CADENCES, TONES } from './config.js';
import { topAuthors } from './git.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Pure: assemble a config object from interview answers. Tested directly.
export function buildConfig(answers = {}) {
  return {
    cadence: answers.cadence || DEFAULTS.cadence,
    tone: answers.tone || DEFAULTS.tone,
    categories: { ...DEFAULTS.categories },
    channels: {
      stdout: { enabled: true },
      markdown: { enabled: answers.markdown !== false, path: 'SUNSHINE.md' },
      slack: { enabled: !!answers.slack, webhookEnv: 'SLACK_WEBHOOK_URL' },
      github: { enabled: !!answers.github, tokenEnv: 'GITHUB_TOKEN' },
    },
    minConfidence: DEFAULTS.minConfidence,
    team: answers.team || {},
    optOut: DEFAULTS.optOut.slice(),
    intro: answers.intro || '',
  };
}

function ask(rl, q, def) {
  const hint = def ? ` (${def})` : '';
  return new Promise((res) => rl.question(`${q}${hint}: `, (a) => res(a.trim() || def || '')));
}
async function askChoice(rl, q, choices, def) {
  const a = await ask(rl, `${q} [${choices.join('/')}]`, def);
  return choices.includes(a) ? a : def;
}
async function askYesNo(rl, q, def) {
  const a = (await ask(rl, `${q} [${def ? 'Y/n' : 'y/N'}]`, '')).toLowerCase();
  if (!a) return def;
  return a.startsWith('y');
}

export async function interview({ cwd = process.cwd(), input = process.stdin, output = process.stdout } = {}) {
  const rl = createInterface({ input, output });
  const answers = {};
  try {
    output.write('\n☀️  Let’s set up Sunshine Bot for this repo.\n\n');
    answers.cadence = await askChoice(rl, 'How often will you run it?', Object.keys(CADENCES), DEFAULTS.cadence);
    answers.tone = await askChoice(rl, 'Praise tone', TONES, DEFAULTS.tone);
    answers.markdown = await askYesNo(rl, 'Keep a SUNSHINE.md log in the repo?', true);
    answers.slack = await askYesNo(rl, 'Post to Slack? (reads SLACK_WEBHOOK_URL env var; nothing stored)', false);
    answers.intro = await ask(rl, 'Optional intro line shown before the praise (blank to skip)', '');
    const authors = topAuthors(cwd, 8);
    if (authors.length) {
      output.write('\nMap git authors to display handles (blank to skip each).\n');
      const team = {};
      for (const a of authors) {
        const h = await ask(rl, `  ${a.name} <${a.email}> · ${a.count} commits`, '');
        if (h) { team[a.name] = h; team[a.email] = h; }
      }
      answers.team = team;
    }
  } finally {
    rl.close();
  }
  return answers;
}

export async function runInit({ cwd = process.cwd(), interactive = true, input, output } = {}) {
  const dest = resolve(cwd, 'sunshine.config.json');
  if (existsSync(dest)) return { created: false, reason: 'exists', path: dest };

  if (!interactive) {
    const example = join(__dirname, '..', 'sunshine.config.example.json');
    if (existsSync(example)) copyFileSync(example, dest);
    else writeFileSync(dest, JSON.stringify(buildConfig({}), null, 2) + '\n');
    return { created: true, interactive: false, path: dest };
  }

  const answers = await interview({ cwd, input, output });
  const cfg = buildConfig(answers);
  writeFileSync(dest, JSON.stringify(cfg, null, 2) + '\n');
  return { created: true, interactive: true, path: dest, config: cfg };
}
