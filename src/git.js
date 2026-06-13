// Collects raw signal from a git repository. Zero dependencies — shells out to git.
// Output is a plain array of commit objects the rest of the pipeline can reason about.

import { execFileSync } from 'node:child_process';

const US = '\x1f'; // unit separator between fields
const RS = '\x1e'; // record separator between commits

// %b (body) is placed last among the text fields and terminated by a unit
// separator, so the numstat block that git appends after the pretty output is
// unambiguously the final field even when the body itself contains newlines.
const PRETTY = `${RS}%h${US}%an${US}%ae${US}%ad${US}%s${US}%b${US}`;

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function isGitRepo(cwd = process.cwd()) {
  try {
    git(['rev-parse', '--is-inside-work-tree'], cwd);
    return true;
  } catch {
    return false;
  }
}

// Convert a cadence-derived day count (or explicit ISO date) into a git --since arg.
export function sinceFromDays(days, now = new Date()) {
  const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function parseNumstat(block) {
  const files = [];
  let insertions = 0;
  let deletions = 0;
  for (const line of block.split('\n')) {
    const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (!m) continue;
    const add = m[1] === '-' ? 0 : Number(m[1]);
    const del = m[2] === '-' ? 0 : Number(m[2]);
    insertions += add;
    deletions += del;
    files.push({ path: m[3], insertions: add, deletions: del });
  }
  return { files, insertions, deletions };
}

function detectPr(subject, body) {
  // GitHub squash-merge appends "(#NN)"; fall back to a bare "#NN" reference.
  const fromSubject = subject.match(/\(#(\d+)\)/) || subject.match(/#(\d+)/);
  if (fromSubject) return Number(fromSubject[1]);
  const fromBody = body.match(/#(\d+)/);
  return fromBody ? Number(fromBody[1]) : null;
}

// Returns commits authored within the window, newest first, excluding merges.
export function collectCommits({ cwd = process.cwd(), since, max = 500 } = {}) {
  const args = [
    'log',
    '--no-merges',
    `--max-count=${max}`,
    '--numstat',
    `--pretty=format:${PRETTY}`,
  ];
  if (since) args.push(`--since=${since}`);

  let out;
  try {
    out = git(args, cwd);
  } catch (e) {
    throw new Error(`git log failed: ${e.message.split('\n')[0]}`);
  }

  const commits = [];
  for (const chunk of out.split(RS)) {
    if (!chunk.trim()) continue;
    const parts = chunk.split(US);
    if (parts.length < 6) continue;
    const [hash, author, email, date, subject, body] = parts;
    const numstat = parseNumstat(parts[6] || '');
    commits.push({
      hash: hash.trim(),
      author: author.trim(),
      email: email.trim(),
      date: date.trim(),
      subject: subject.trim(),
      body: (body || '').trim(),
      pr: detectPr(subject, body || ''),
      ...numstat,
    });
  }
  return commits;
}

// Best-effort "owner/repo" slug, for building artifact links in output.
export function repoSlug(cwd = process.cwd()) {
  let url;
  try {
    url = git(['config', '--get', 'remote.origin.url'], cwd).trim();
  } catch {
    return null;
  }
  const m = url.match(/github\.com[:/]+([^/]+\/[^/.]+)(?:\.git)?$/);
  return m ? m[1] : null;
}
