# Launch kit — Sunshine Bot

Paste-ready copy for announcing Sunshine Bot. One voice; trim to taste.

---

## "Why we built this" (blog / Substack)

**We ship in a sea of negative signal. Sunshine Bot is the counterweight.**

Look at what actually reaches an engineer in a given week: QA reports listing
defects, a bug tracker that is — by definition — a queue of things that are wrong,
customer complaints (the happy customers stay quiet), a sprint that compressed, a
launch that slipped. None of it is unfair. All of it is *filtered to the bad parts*.

The good work is right there in the same repository — the API that got cleaner, the
hundred lines someone deleted, the empty-state copy that finally reads like a human
wrote it — but nobody says so, because there is no system that says so.

So we built one. Sunshine Bot reads your git history, recognizes specific *kinds* of
good work (API design, UX, simplicity, safety, accessibility, performance, docs,
tests, and more), and posts an earned compliment that points at the actual commit.

It has exactly one rule, and the rule is the whole product: **every compliment cites
a real artifact.** A commit, a file, a PR. "Great job team!" is impossible by
construction. When a week is genuinely quiet, it says so — it never invents praise.

It installs into any repo as a CLI and a GitHub Action, writes a growing `SUNSHINE.md`
log by default, and can post to Slack or drop a PR comment when you turn those on.
Zero runtime dependencies. Configure cadence, categories, and tone in one JSON file —
or run it with no config at all.

Morale isn't a perk. It's the thing that lets a team keep shipping through the hard
weeks. Sunshine Bot makes the good work visible again.

`npx sunshine-bot preview`

---

## X / Twitter

> Your bug tracker is a list of everything wrong with your code. Your QA report is a
> list of everything wrong with your code. Where's the list of what's *right*?
>
> We built ☀️ Sunshine Bot: it reads your git history and posts specific, earned praise
> — always citing a real commit. Never hollow.
>
> `npx sunshine-bot preview`

## LinkedIn

> Teams burn out not because the work is bad, but because the feedback loop is
> negative by design: defects, complaints, slipped dates. The wins stay invisible.
>
> Sunshine Bot is a small open-source tool that fixes the asymmetry. It scans your
> repo's git history, recognizes good work across categories (API design, UX,
> simplicity, safety, accessibility…), and posts an earned compliment that names the
> actual commit. One rule: every compliment cites a real artifact — no empty
> cheerleading, and quiet weeks get an honest note instead of invented praise.
>
> Installs as a CLI + GitHub Action. Zero dependencies. MIT licensed.

## Internal Slack announcement

> ☀️ New: I dropped **Sunshine Bot** into our repo. Every Monday it'll post a few
> *specific* wins from the week's commits to #team-wins — real praise, always linked
> to the actual change. It only celebrates work that happened; quiet weeks get an
> honest note. Tune categories/tone in `sunshine.config.json`. Try it now:
> `npx sunshine-bot preview`

---

## Product Hunt one-liner

> Sunshine Bot — reads your git history and posts specific, earned team praise. The
> counterweight to bug queues and QA reports. Every compliment cites a real commit.
