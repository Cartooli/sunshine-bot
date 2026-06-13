// Turns raw commits into a digest of specific, artifact-cited compliments.
// This is the heart of Sunshine Bot — and the place the "no hollow praise" rule lives.

import { CATEGORIES, CATEGORY_BY_ID, scoreCommit } from './categories.js';
import { activeCategories } from './config.js';

// Small deterministic PRNG so phrasing varies day to day but a given day/run is
// reproducible (important for tests and for not spamming identical messages).
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function seededIndex(seed, n) {
  // mulberry32 step
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return Math.floor(r * n);
}

function isOptedOut(commit, optOut) {
  const a = commit.author.toLowerCase();
  const e = commit.email.toLowerCase();
  return optOut.some((x) => {
    const xl = String(x).toLowerCase();
    return a === xl || e === xl;
  });
}

function resolveHandle(commit, team) {
  return team[commit.author] || team[commit.email] || commit.author;
}

// Pick the changed file that best represents why this category matched.
function representativeFile(commit, category) {
  if (!commit.files.length) return null;
  const match = commit.files.find((f) => category.paths.some((re) => re.test(f.path)));
  if (match) return match.path;
  // Otherwise the file with the largest change.
  return [...commit.files].sort(
    (a, b) => b.insertions + b.deletions - (a.insertions + a.deletions),
  )[0].path;
}

function fill(template, vars) {
  const raw = template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
  // When there's no PR, {ref} is empty — tidy up the now-empty "()" the templates
  // leave behind and any doubled spaces or space-before-punctuation.
  return raw
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([:.,])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Build the digest.
 * @returns {{ compliments: object[], quiet: boolean, window: object }}
 */
export function generateDigest(commits, config, { now = new Date() } = {}) {
  const weights = activeCategories(config);
  const tone = config.tone;
  const eligible = commits.filter((c) => !isOptedOut(c, config.optOut));

  // Score every (commit, category) pair, keeping only those above the threshold.
  const candidates = [];
  for (const cat of CATEGORIES) {
    const weight = weights[cat.id];
    if (!weight) continue; // category disabled
    for (const commit of eligible) {
      const raw = scoreCommit(commit, cat);
      const score = raw * weight;
      if (raw >= config.minConfidence && score > 0) {
        candidates.push({ cat, commit, score, raw });
      }
    }
  }

  // Greedily assign: strongest matches first, one compliment per category, and
  // never reuse a commit. Spreading recognition across distinct commits keeps each
  // compliment earned — we'd rather celebrate fewer things honestly than stretch a
  // single commit across categories it only weakly fits.
  candidates.sort((a, b) => b.score - a.score);
  const usedCategories = new Set();
  const usedCommits = new Set();
  const picks = [];
  for (const cand of candidates) {
    if (usedCategories.has(cand.cat.id)) continue;
    if (usedCommits.has(cand.commit.hash)) continue;
    usedCategories.add(cand.cat.id);
    usedCommits.add(cand.commit.hash);
    picks.push(cand);
  }

  // Order compliments by category weight (most-valued categories first).
  picks.sort((a, b) => weights[b.cat.id] - weights[a.cat.id] || b.score - a.score);

  const dayKey = now.toISOString().slice(0, 10);
  const compliments = picks.map(({ cat, commit, score }) => {
    const who = resolveHandle(commit, config.team);
    const file = representativeFile(commit, cat);
    // {ref} is the PR reference when present, otherwise empty — the commit hash is
    // already named via {hash}, so repeating it as a ref would be redundant.
    const ref = commit.pr ? `#${commit.pr}` : '';
    const bank = cat.templates[tone] || cat.templates.warm;
    const idx = seededIndex(hashSeed(dayKey + cat.id + commit.hash), bank.length);
    const vars = { who, hash: commit.hash, subject: commit.subject, file: file || 'the change', ref };
    return {
      categoryId: cat.id,
      categoryLabel: cat.label,
      emoji: cat.emoji,
      who,
      hash: commit.hash,
      subject: commit.subject,
      file,
      pr: commit.pr,
      score: Number(score.toFixed(2)),
      text: fill(bank[idx], vars),
    };
  });

  return { compliments, quiet: compliments.length === 0, window: { since: null } };
}

export { CATEGORY_BY_ID };
