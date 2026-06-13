// Slack channel: post the digest to an incoming webhook. Opt-in, secret from env.
// The webhook URL is NEVER read from config — only from the environment variable
// named by channelCfg.webhookEnv (default SLACK_WEBHOOK_URL).

import { renderSlackBlocks } from '../render.js';

export async function deliver(digest, config, channelCfg, ctx) {
  const envName = channelCfg.webhookEnv || 'SLACK_WEBHOOK_URL';
  const url = process.env[envName];
  if (!url) {
    ctx.log(`[slack] skipped — ${envName} is not set. (Add an Incoming Webhook URL to that env var to enable.)`);
    return { wrote: false, skipped: true };
  }
  const payload = renderSlackBlocks(digest, config, { now: ctx.now, slug: ctx.slug });

  if (ctx.dryRun) {
    ctx.log('[dry-run] would POST to Slack webhook:');
    ctx.log(JSON.stringify(payload, null, 2));
    return { wrote: false };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Slack webhook returned ${res.status} ${res.statusText}`);
  }
  ctx.log('[slack] posted digest.');
  return { wrote: true };
}
