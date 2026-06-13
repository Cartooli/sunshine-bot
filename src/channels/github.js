// GitHub channel: post the digest as a comment on a pull request. Opt-in.
// Designed to run inside GitHub Actions, where GITHUB_TOKEN, GITHUB_REPOSITORY,
// and the PR number (via GITHUB_REF or the event payload) are available.

import { readFileSync, existsSync } from 'node:fs';
import { renderGithubComment } from '../render.js';

function resolvePrNumber(channelCfg) {
  if (channelCfg.pr) return Number(channelCfg.pr);
  // refs/pull/<n>/merge
  const ref = process.env.GITHUB_REF || '';
  const m = ref.match(/refs\/pull\/(\d+)\//);
  if (m) return Number(m[1]);
  // Fall back to the event payload file.
  const evt = process.env.GITHUB_EVENT_PATH;
  if (evt && existsSync(evt)) {
    try {
      const payload = JSON.parse(readFileSync(evt, 'utf8'));
      if (payload?.pull_request?.number) return Number(payload.pull_request.number);
      if (payload?.issue?.number) return Number(payload.issue.number);
    } catch {
      /* ignore malformed payload */
    }
  }
  return null;
}

export async function deliver(digest, config, channelCfg, ctx) {
  const tokenEnv = channelCfg.tokenEnv || 'GITHUB_TOKEN';
  const token = process.env[tokenEnv];
  const repo = channelCfg.repo || process.env.GITHUB_REPOSITORY || ctx.slug;
  const pr = resolvePrNumber(channelCfg);

  if (!token) {
    ctx.log(`[github] skipped — ${tokenEnv} is not set.`);
    return { wrote: false, skipped: true };
  }
  if (!repo) {
    ctx.log('[github] skipped — could not determine owner/repo.');
    return { wrote: false, skipped: true };
  }
  if (!pr) {
    ctx.log('[github] skipped — no pull request number in context (set channels.github.pr or run on a PR event).');
    return { wrote: false, skipped: true };
  }

  const body = renderGithubComment(digest, config, { now: ctx.now, slug: repo });
  const apiUrl = `https://api.github.com/repos/${repo}/issues/${pr}/comments`;

  if (ctx.dryRun) {
    ctx.log(`[dry-run] would POST a comment to ${repo}#${pr}:`);
    ctx.log(body);
    return { wrote: false };
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'sunshine-bot',
    },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status} ${res.statusText}`);
  }
  ctx.log(`[github] commented on ${repo}#${pr}.`);
  return { wrote: true };
}
