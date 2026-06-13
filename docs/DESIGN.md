# Sunshine Bot — Design & Scope

## Why this exists

A team's daily information diet skews negative. QA reports list defects, not the
hundred things that worked. Bug trackers are a queue of problems by definition.
Customer complaints are loud; quiet satisfaction is silent. Sprints compress,
launches slip, and the feedback that reaches engineers is disproportionately about
what is broken. Over time that asymmetry is demotivating — not because the work is
bad, but because the *signal* is filtered to show only the bad parts.

Sunshine Bot is a deliberate counterweight. It reads the same repository the team
pours its work into, finds genuinely good work, and says so — specifically, with
receipts. The goal is morale, pursued honestly: never hollow cheerleading, always
a real commit, file, or pull request the praise can point to.

## Design principles

1. **Earned, not generic.** Every compliment must cite a concrete artifact — a
   commit hash, a changed file, a PR number. "Great job team!" is banned by
   construction: if there is no artifact, there is no compliment.
2. **Specific beats effusive.** Naming the actual change ("the empty-state copy in
   `signup.tsx`") lands harder than a louder adjective.
3. **Honest about quiet periods.** When there is no signal, Sunshine Bot does not
   invent work. It says the week was quiet and offers an honest, non-fabricated
   note — clearly distinct from artifact-backed praise.
4. **Zero-config works.** Sensible defaults mean `npx sunshine-bot run` produces
   something good on the first try. Configuration only adds control.
5. **Safe by default.** Outbound posting (Slack, GitHub comments) is OFF until
   explicitly turned on. A fresh install cannot spam a channel. Secrets come from
   environment variables, never config files.
6. **Decoupled core.** The praise-generation engine knows nothing about delivery
   or scheduling. The same core can power a CLI, a GitHub Action, or a future
   Claude skill / hosted dashboard.

## The core loop

```
collect signal  ->  classify into categories  ->  select exemplars  ->  generate  ->  deliver
   (git.js)            (categories.js)            (generator.js)       (render.js)   (channels/*)
```

1. **Collect.** Read commits in a time window derived from the cadence
   (daily = 1 day, weekly = 7, monthly = 30) or an explicit `--since`. For each
   commit we capture: short hash, author, subject, body, changed files, and
   insertion/deletion counts. Merge commits are parsed for PR numbers.
2. **Classify.** Each commit is scored against every enabled praise category. A
   category's score combines keyword hits (in the message) with path/extension
   matches (in the changed files) and diff-shape signals (e.g. net code removal
   reads as *simplicity*). Scores are weighted by the per-category weight in config.
3. **Select.** For each enabled category that cleared the confidence threshold,
   pick the single strongest exemplar commit. One compliment per category per run,
   so the digest stays punchy rather than exhaustive.
4. **Generate.** A tone-aware template (subtle / warm / effusive) is filled with
   the real artifact details. A date-seeded shuffle keeps openers and phrasing
   fresh across runs without randomness that breaks reproducibility.
5. **Deliver.** Render once, fan out to enabled channels.

## Praise categories (seed set)

Categories are fully config-driven; this is the default taxonomy. Each has keyword
and path signals and a small bank of compliment templates.

| Category | Reads from | Celebrates |
|---|---|---|
| `marketing-copy` | copy/landing/README dirs, "headline", "messaging" | words that sell the work |
| `api-design` | `api/`, `routes/`, "endpoint", "schema" | clean contracts |
| `ux` | `components/`, "flow", "onboarding", "empty state" | the felt experience |
| `visual-design` | `*.css`, `*.scss`, "theme", "ui" | how it looks |
| `simplicity` | net code removal, "simplify", "dead code" | doing less |
| `progressive-disclosure` | "tooltip", "collapse", "advanced settings" | complexity revealed gradually |
| `safety` | "validate", "sanitize", "auth", "rate limit" | guarding the user |
| `performance` | "optimize", "cache", "lazy", "debounce" | speed |
| `docs` | `docs/`, `*.md`, "documentation" | making it understandable |
| `test-coverage` | `*.test.*`, `*.spec.*`, "coverage" | proving it works |
| `accessibility` | "a11y", "aria", "contrast", "screen reader" | including everyone |

## Configuration surface

A single `sunshine.config.json` at the repo root. Every field has a default, so the
file is entirely optional. See the README for the annotated schema. Validation runs
on load and fails loud with a precise message and the offending field.

## Delivery & scheduling

The core has no scheduler. Cadence is realized by *whoever runs the CLI*:
- **Locally / in CI:** `sunshine run` with a cron (GitHub Action provided).
- **Default output:** `SUNSHINE.md` (a growing, dated changelog of wins) + a
  colored terminal summary. No secrets, no network.
- **Opt-in output:** Slack (incoming webhook via `SLACK_WEBHOOK_URL`) and GitHub PR
  comments (via `GITHUB_TOKEN` + repo context). Both off unless enabled in config.

## Definition of done

- `sunshine run --dry-run` against a real repo emits at least one specific,
  artifact-cited compliment for each enabled category that has matching signal.
- Config schema is documented and validated; invalid config fails with a helpful error.
- README explains install, configure, and run.
- Test suite (matchers, generator, config validation) is green.
