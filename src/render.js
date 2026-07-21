// Renders a digest into the formats each channel wants. Pure functions, no I/O.

const RESET = '\x1b[0m';
const C = {
  yellow: (s) => `\x1b[33m${s}${RESET}`,
  dim: (s) => `\x1b[2m${s}${RESET}`,
  bold: (s) => `\x1b[1m${s}${RESET}`,
  green: (s) => `\x1b[32m${s}${RESET}`,
};

function dateLabel(now) {
  return now.toISOString().slice(0, 10);
}

function commitUrl(slug, hash) {
  return slug ? `https://github.com/${slug}/commit/${hash}` : null;
}
function prUrl(slug, pr) {
  return slug ? `https://github.com/${slug}/pull/${pr}` : null;
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Replace an artifact token (a commit hash or "#123" PR ref) with `replacement`,
// but only at token boundaries so a "#12" ref never mangles an unrelated "#123"
// and a short hash never rewrites a coincidental substring of the subject.
function replaceToken(text, token, replacement) {
  const re = new RegExp(`(^|[^\\w#])${escapeRe(token)}(?![\\w])`, 'g');
  return text.replace(re, (_, pre) => `${pre}${replacement}`);
}

// Replace the bare {hash}/{ref} text in a compliment with markdown links.
function linkifyMarkdown(c, slug) {
  let text = c.text;
  const hUrl = commitUrl(slug, c.hash);
  text = replaceToken(text, c.hash, hUrl ? `[\`${c.hash}\`](${hUrl})` : `\`${c.hash}\``);
  if (c.pr) {
    const pUrl = prUrl(slug, c.pr);
    if (pUrl) text = replaceToken(text, `#${c.pr}`, `[#${c.pr}](${pUrl})`);
  }
  return text;
}

export function renderMarkdownSection(digest, config, { now = new Date(), slug = null } = {}) {
  const lines = [`## ☀️ ${dateLabel(now)}`, ''];
  if (config.intro) lines.push(`_${config.intro}_`, '');
  if (digest.quiet) {
    lines.push(config.quietFallback, '');
    return lines.join('\n');
  }
  for (const c of digest.compliments) {
    lines.push(`- ${linkifyMarkdown(c, slug)}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function renderTerminal(digest, config, { now = new Date(), color = true } = {}) {
  const paint = color ? C : { yellow: (s) => s, dim: (s) => s, bold: (s) => s, green: (s) => s };
  const out = [];
  out.push(paint.yellow(paint.bold(`\n  ☀  Sunshine — ${dateLabel(now)}`)));
  if (config.intro) out.push(paint.dim(`  ${config.intro}`));
  out.push('');
  if (digest.quiet) {
    out.push(`  ${config.quietFallback}`);
    out.push('');
    return out.join('\n');
  }
  for (const c of digest.compliments) {
    out.push(`  ${c.emoji}  ${paint.bold(c.categoryLabel)}`);
    out.push(`     ${replaceToken(c.text, c.hash, paint.green(c.hash))}`);
    out.push('');
  }
  out.push(paint.dim(`  ${digest.compliments.length} moment(s) of sunshine. Keep going. 💛`));
  out.push('');
  return out.join('\n');
}

export function renderSlackBlocks(digest, config, { now = new Date(), slug = null } = {}) {
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `☀️ Sunshine — ${dateLabel(now)}`, emoji: true } },
  ];
  if (config.intro) {
    blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: config.intro }] });
  }
  if (digest.quiet) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: config.quietFallback } });
    return { blocks, text: `Sunshine — ${dateLabel(now)}` };
  }
  for (const c of digest.compliments) {
    // Slack mrkdwn uses <url|text> link syntax.
    let text = c.text;
    const hUrl = commitUrl(slug, c.hash);
    if (hUrl) text = replaceToken(text, c.hash, `<${hUrl}|${c.hash}>`);
    if (c.pr) {
      const pUrl = prUrl(slug, c.pr);
      if (pUrl) text = replaceToken(text, `#${c.pr}`, `<${pUrl}|#${c.pr}>`);
    }
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `${c.emoji} ${text}` } });
  }
  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `${digest.compliments.length} moment(s) of sunshine — keep going 💛` }],
  });
  return { blocks, text: `Sunshine — ${dateLabel(now)}` };
}

export function renderGithubComment(digest, config, { now = new Date(), slug = null } = {}) {
  const lines = [`### ☀️ Sunshine — ${dateLabel(now)}`, ''];
  if (config.intro) lines.push(`> ${config.intro}`, '');
  if (digest.quiet) {
    lines.push(config.quietFallback);
    return lines.join('\n');
  }
  for (const c of digest.compliments) lines.push(`- ${linkifyMarkdown(c, slug)}`);
  lines.push('', `<sub>${digest.compliments.length} moment(s) of sunshine · posted by sunshine-bot</sub>`);
  return lines.join('\n');
}
