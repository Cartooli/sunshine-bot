// Praise categories: how Sunshine Bot recognizes a *kind* of good work in a commit,
// and the compliment templates it draws from. Detection here, delivery elsewhere.
//
// A category scores a commit by combining three signals:
//   - keyword hits in the commit message (subject + body)
//   - path/extension hits among the changed files
//   - an optional "shape" bonus derived from the diff (e.g. net code removal)
//
// Templates use placeholders filled by the generator: {who} {hash} {subject}
// {file} {ref}. Keep them specific — every template names a concrete artifact.

function kw(text, words) {
  const t = text.toLowerCase();
  let hits = 0;
  for (const w of words) {
    const found = w.includes(' ')
      ? t.includes(w)
      : new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t);
    if (found) hits += 1;
  }
  return hits;
}

function pathHits(files, patterns) {
  let hits = 0;
  for (const f of files) {
    if (patterns.some((re) => re.test(f.path))) hits += 1;
  }
  return hits;
}

export const CATEGORIES = [
  {
    id: 'marketing-copy',
    label: 'marketing copy',
    emoji: '✍️',
    keywords: ['copy', 'headline', 'messaging', 'wording', 'cta', 'tagline', 'microcopy', 'landing'],
    paths: [/(^|\/)(landing|marketing|copy|content)(\/|$)/i, /README/i, /\.mdx?$/i],
    templates: {
      subtle: ['{who} sharpened the words in {hash} — "{subject}". Clearer copy, quietly done.'],
      warm: ['{who} made the product *speak* better in {hash} ({ref}): "{subject}". Good words are a feature.'],
      effusive: ['✨ {who} turned plain text into persuasion in {hash} — "{subject}". This is marketing copy doing real work ({ref}).'],
    },
  },
  {
    id: 'api-design',
    label: 'API design',
    emoji: '🔌',
    keywords: ['api', 'endpoint', 'route', 'schema', 'contract', 'payload', 'request', 'response', 'rest', 'graphql'],
    paths: [/(^|\/)(api|routes?|controllers?|handlers?)(\/|$)/i, /openapi|swagger/i, /\.proto$/i],
    templates: {
      subtle: ['{who} tidied the API surface in {hash} — "{subject}". Future callers will thank you.'],
      warm: ['{who} designed a cleaner contract in {hash} ({ref}): "{subject}". Good API design is invisible until you need it.'],
      effusive: ['🔌 {who} nailed the API design in {hash} — "{subject}". The kind of interface people build happily on top of ({ref}).'],
    },
  },
  {
    id: 'ux',
    label: 'UX',
    emoji: '🧭',
    keywords: ['ux', 'flow', 'onboarding', 'empty state', 'friction', 'usability', 'journey', 'wizard', 'affordance'],
    paths: [/(^|\/)(components?|screens?|views?|pages?|app)(\/|$)/i],
    templates: {
      subtle: ['{who} smoothed a rough edge for users in {hash} — "{subject}".'],
      warm: ['{who} put the user first in {hash} ({ref}): "{subject}". Less friction is a gift you can\'t always see in the diff.'],
      effusive: ['🧭 {who} made the experience genuinely better in {hash} — "{subject}". UX wins like this compound ({ref}).'],
    },
  },
  {
    id: 'visual-design',
    label: 'visual design',
    emoji: '🎨',
    keywords: ['design', 'style', 'ui', 'theme', 'layout', 'spacing', 'typography', 'color', 'polish', 'visual'],
    paths: [/\.(css|scss|sass|less)$/i, /tailwind/i, /(^|\/)(styles?|theme|tokens?|design)(\/|$)/i],
    templates: {
      subtle: ['{who} polished the look in {hash} — "{subject}".'],
      warm: ['{who} made it look right in {hash} ({ref}): "{subject}". Visual care signals care everywhere else too.'],
      effusive: ['🎨 {who} brought real visual polish in {hash} — "{subject}". Details like these are why it *feels* good ({ref}).'],
    },
  },
  {
    id: 'simplicity',
    label: 'simplicity',
    emoji: '🪶',
    keywords: ['simplify', 'simpler', 'remove', 'delete', 'cleanup', 'clean up', 'dead code', 'refactor', 'prune', 'consolidate'],
    paths: [],
    shape: (c) => {
      // Net code removal is the clearest signal of simplification.
      const net = c.deletions - c.insertions;
      if (net > 200) return 3;
      if (net > 50) return 2;
      if (net > 0) return 1;
      return 0;
    },
    templates: {
      subtle: ['{who} made things simpler in {hash} — "{subject}". Net less code to maintain.'],
      warm: ['{who} chose subtraction in {hash} ({ref}): "{subject}". Deleting code is underrated craft.'],
      effusive: ['🪶 {who} did the hard work of making it *simpler* in {hash} — "{subject}". Fewer moving parts, less to break ({ref}).'],
    },
  },
  {
    id: 'progressive-disclosure',
    label: 'progressive disclosure',
    emoji: '🪜',
    keywords: ['tooltip', 'collapse', 'expand', 'disclosure', 'reveal', 'advanced settings', 'accordion', 'step by step', 'show more'],
    paths: [],
    templates: {
      subtle: ['{who} revealed complexity gently in {hash} — "{subject}".'],
      warm: ['{who} practiced progressive disclosure in {hash} ({ref}): "{subject}". Power for experts, calm for newcomers.'],
      effusive: ['🪜 {who} layered the complexity beautifully in {hash} — "{subject}". Progressive disclosure done with intent ({ref}).'],
    },
  },
  {
    id: 'safety',
    label: 'safety',
    emoji: '🛡️',
    keywords: ['validate', 'sanitize', 'auth', 'guard', 'rate limit', 'escape', 'secure', 'permission', 'csrf', 'xss', 'injection'],
    paths: [/(^|\/)(auth|security|middleware|guards?)(\/|$)/i],
    templates: {
      subtle: ['{who} hardened a boundary in {hash} — "{subject}".'],
      warm: ['{who} kept users safe in {hash} ({ref}): "{subject}". The bugs you prevent never make the changelog, but they matter most.'],
      effusive: ['🛡️ {who} shipped real safety in {hash} — "{subject}". This is the unglamorous work that protects everyone ({ref}).'],
    },
  },
  {
    id: 'performance',
    label: 'performance',
    emoji: '⚡',
    keywords: ['perf', 'performance', 'optimize', 'optimise', 'cache', 'memo', 'lazy', 'debounce', 'throttle', 'faster', 'latency', 'speed'],
    paths: [],
    templates: {
      subtle: ['{who} made it faster in {hash} — "{subject}".'],
      warm: ['{who} squeezed out real speed in {hash} ({ref}): "{subject}". Every millisecond is respect for the user\'s time.'],
      effusive: ['⚡ {who} delivered a performance win in {hash} — "{subject}". Fast software is a feeling, and this earns it ({ref}).'],
    },
  },
  {
    id: 'docs',
    label: 'docs',
    emoji: '📚',
    keywords: ['docs', 'documentation', 'readme', 'comment', 'explain', 'guide', 'changelog', 'example', 'tutorial'],
    paths: [/\.mdx?$/i, /(^|\/)docs?(\/|$)/i, /README/i, /CHANGELOG/i],
    templates: {
      subtle: ['{who} improved the docs in {hash} — "{subject}".'],
      warm: ['{who} made it easier to understand in {hash} ({ref}): "{subject}". Good docs are an act of generosity to the next person.'],
      effusive: ['📚 {who} wrote docs that actually help in {hash} — "{subject}". Future teammates are already grateful ({ref}).'],
    },
  },
  {
    id: 'test-coverage',
    label: 'test coverage',
    emoji: '✅',
    keywords: ['test', 'tests', 'coverage', 'spec', 'assertion', 'fixture', 'unit test', 'integration test', 'e2e'],
    paths: [/\.(test|spec)\.[a-z]+$/i, /(^|\/)(tests?|__tests__|spec)(\/|$)/i],
    templates: {
      subtle: ['{who} added tests in {hash} — "{subject}". Confidence, banked.'],
      warm: ['{who} proved it works in {hash} ({ref}): "{subject}". Tests are how we sleep at night.'],
      effusive: ['✅ {who} strengthened the safety net in {hash} — "{subject}". This is how a codebase earns trust ({ref}).'],
    },
  },
  {
    id: 'accessibility',
    label: 'accessibility',
    emoji: '♿',
    keywords: ['a11y', 'accessible', 'accessibility', 'aria', 'contrast', 'screen reader', 'keyboard', 'focus', 'wcag', 'alt text'],
    paths: [],
    templates: {
      subtle: ['{who} improved accessibility in {hash} — "{subject}".'],
      warm: ['{who} made it work for more people in {hash} ({ref}): "{subject}". Accessibility is just good engineering with empathy.'],
      effusive: ['♿ {who} championed accessibility in {hash} — "{subject}". Including everyone is the whole point ({ref}).'],
    },
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

// Score a single commit for a single category. Returns a non-negative number.
export function scoreCommit(commit, category) {
  const text = `${commit.subject} ${commit.body}`;
  const keywordScore = kw(text, category.keywords);
  const pathScore = pathHits(commit.files, category.paths) * 0.5;
  const shapeScore = category.shape ? category.shape(commit) : 0;
  return keywordScore + pathScore + shapeScore;
}

export { kw as _kw, pathHits as _pathHits };
