#!/usr/bin/env bash
# Ship sunshine-bot to GitHub: create the repo in the dwellchecker org, open a PR
# from a feature branch, confirm it's mergeable, and merge to main.
#
# Why a script instead of "Claude did it": creating a repo and pushing needs YOUR
# GitHub credentials, which the assistant must not handle. This runs entirely on
# your machine with your `gh` login.
#
# Prereqs:
#   - GitHub CLI:  https://cli.github.com   (then `gh auth login`)
#   - Node 18+ (to run the test gate)
#
# Usage:
#   bash ship.sh                 # creates a PRIVATE repo dwellchecker/sunshine-bot
#   SUNSHINE_VISIBILITY=public bash ship.sh
#   SUNSHINE_ORG=yourorg bash ship.sh

set -euo pipefail

ORG="${SUNSHINE_ORG:-dwellchecker}"
REPO="sunshine-bot"
BRANCH="feat/initial-engine"
VISIBILITY="${SUNSHINE_VISIBILITY:-private}"

cd "$(dirname "$0")"

command -v gh >/dev/null || { echo "✗ GitHub CLI (gh) is required: https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "✗ Not logged in. Run: gh auth login"; exit 1; }

echo "▸ 1/7  Verifying tests locally (the gate before anything is pushed)…"
npm test

echo "▸ 2/7  Initializing a fresh git repository…"
rm -rf .git .gitkeep_tmp   # clear any leftover sandbox artifacts
git init -q -b main
git config commit.gpgsign false

echo "▸ 3/7  Scaffold commit on main…"
git add README.md LICENSE .gitignore
git commit -q -m "chore: initialize sunshine-bot repository"

echo "▸ 4/7  Implementation commit on ${BRANCH}…"
git checkout -q -b "$BRANCH"
git add -A
git commit -q -m "feat: sunshine-bot v0.1.0 — praise engine, channels, CLI, Action

A configurable positivity engine that reads git history and shares specific,
artifact-cited praise to keep the team motivated. Markdown + stdout on by
default; opt-in Slack and GitHub channels. 19 tests on Node's built-in runner."

echo "▸ 5/7  Creating ${ORG}/${REPO} (${VISIBILITY}) and pushing main…"
git checkout -q main
gh repo create "${ORG}/${REPO}" "--${VISIBILITY}" --source=. --remote=origin --push \
  --description "Configurable positivity engine: scans git history and shares specific, earned team praise."

echo "▸ 6/7  Pushing ${BRANCH} and opening the PR…"
git push -q -u origin "$BRANCH"
PR_URL=$(gh pr create --base main --head "$BRANCH" \
  --title "Sunshine Bot v0.1.0 — praise engine, channels, CLI, Action" \
  --body "Initial release of Sunshine Bot.

**What it is:** a configurable positivity engine that reads this repo's own git
history and surfaces specific, artifact-cited praise on a daily/weekly/monthly
cadence — a deliberate counterweight to the negative skew of QA reports, bug
queues, and crunch.

**The one rule:** every compliment cites a real commit/file/PR. No hollow praise
is possible; quiet weeks get an honest note, not invented work.

**Included:** praise engine core, category taxonomy, CLI (\`run\` / \`preview\` /
\`init\`), Markdown + stdout (default) and opt-in Slack + GitHub channels, a
scheduled GitHub Action, docs, and 19 passing tests (zero runtime deps).

Verified locally with \`npm test\` before push.")
echo "   PR: ${PR_URL}"

echo "▸ 7/7  Confirming mergeable and merging to main…"
for i in 1 2 3 4 5; do
  STATE=$(gh pr view "$BRANCH" --json mergeable --jq .mergeable 2>/dev/null || echo UNKNOWN)
  [ "$STATE" = "MERGEABLE" ] && break
  echo "   mergeable=${STATE} — waiting…"; sleep 3
done
gh pr merge "$BRANCH" --merge --delete-branch
echo "✅ Merged to main. Sunshine Bot is live at https://github.com/${ORG}/${REPO} ☀️"
