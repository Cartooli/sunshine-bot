#!/usr/bin/env bash
# Sunshine Bot is already live at https://github.com/Cartooli/sunshine-bot
#
# This file used to bootstrap a fresh GitHub repo under a different org and
# would `rm -rf .git`. That path is obsolete and dangerous — do not run it.
#
# To publish the npm package instead:
#   npm test && npm pack --dry-run && npm publish

set -euo pipefail
echo "✗ ship.sh is retired. Repo: https://github.com/Cartooli/sunshine-bot" >&2
echo "  Use npm publish for releases (see docs/plans for the ship plan)." >&2
exit 1
