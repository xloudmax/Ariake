#!/usr/bin/env bash
# =============================================================================
# scripts/rewrite-history.sh — purge committed secrets and big binaries from
# the entire git history, force-push to all remotes.
#
# THIS IS DESTRUCTIVE. Anyone with a clone of this repo will need to re-clone
# after you run this. Read the entire script before invoking it.
# =============================================================================
#
# Why: `.env` (containing GOOGLE_API_KEY and a Postgres password) was pushed
# to two GitHub remotes. Removing it from the working tree is not enough —
# it must be removed from every commit on every branch. This script wraps
# `git filter-repo` to do that, plus drops a curated list of large binaries
# (Turbo cache, compiled backends, the overleaf zip, test binaries, DB files)
# that were committed by accident over the months.
#
# Prereqs:
#   1) Install git-filter-repo:
#        macOS:    brew install git-filter-repo
#        Pip:      pipx install git-filter-repo
#   2) Rotate every secret that was in the leaked .env *before* running this.
#      Once removed from history, attackers who already cloned still have it.
#      Treat all leaked secrets as compromised.
#   3) Make sure you have push access to every remote you intend to overwrite.
#
# What this script does (in order):
#   1) Refuses to run unless `--i-have-rotated-secrets` is passed.
#   2) Confirms `git filter-repo` is on PATH.
#   3) Confirms the working tree is clean (`git status --porcelain` empty).
#   4) Records the URLs of every remote, so we can restore them after the
#      rewrite (`git filter-repo` strips remotes by design — that is how it
#      protects you from accidentally overwriting upstream).
#   5) Makes a full mirror clone backup at $BACKUP_DIR — non-negotiable.
#   6) Runs `git filter-repo` with the paths file at scripts/history-purge-paths.txt
#      to drop every offending path from every commit.
#   7) Re-adds remotes.
#   8) Stops. You must run the force-push commands manually after a final
#      sanity check (the script prints them).
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PATHS_FILE="$SCRIPT_DIR/history-purge-paths.txt"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/c404-blog-history-backup-$TIMESTAMP}"

# ----- Safety guard -----
if [[ "${1:-}" != "--i-have-rotated-secrets" ]]; then
  cat >&2 <<EOF
Refusing to run.

This will rewrite every commit on every branch and require force-push.
Before invoking, you MUST:
  1) Rotate GOOGLE_API_KEY in https://console.cloud.google.com (APIs & Services -> Credentials).
  2) Rotate the Postgres password that appears as 'mysecretpassword' anywhere it was used.
  3) Revoke any other tokens that were in the leaked .env.
  4) Notify any collaborator who has a clone — they will need to re-clone.

When that is done, re-run as:
  $0 --i-have-rotated-secrets

EOF
  exit 1
fi

# ----- Tooling -----
if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "ERROR: git-filter-repo is not installed." >&2
  echo "  brew install git-filter-repo   # macOS" >&2
  echo "  pipx install git-filter-repo   # any" >&2
  exit 2
fi

cd "$REPO_ROOT"

# ----- Working-tree clean? -----
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree is dirty. Commit or stash before rewriting history." >&2
  git status --short >&2
  exit 3
fi

if [[ ! -f "$PATHS_FILE" ]]; then
  echo "ERROR: paths file missing: $PATHS_FILE" >&2
  exit 4
fi

# ----- Capture remotes -----
echo "==> Recording current remotes..."
git remote -v
mapfile -t REMOTES < <(git remote)
declare -A REMOTE_URLS
for r in "${REMOTES[@]}"; do
  REMOTE_URLS["$r"]="$(git remote get-url "$r")"
done

# ----- Mirror backup (mandatory safety net) -----
echo "==> Creating mirror backup at $BACKUP_DIR ..."
git clone --mirror "$REPO_ROOT" "$BACKUP_DIR"
echo "    backup created. If anything goes wrong, recover with:"
echo "      cd $BACKUP_DIR && git push --mirror <url>"

# ----- Run filter-repo -----
echo "==> Running git filter-repo with paths from: $PATHS_FILE"
git filter-repo --invert-paths --paths-from-file "$PATHS_FILE" --force

# ----- Re-add remotes -----
echo "==> Restoring remotes..."
for r in "${!REMOTE_URLS[@]}"; do
  git remote add "$r" "${REMOTE_URLS[$r]}"
  echo "    added: $r ${REMOTE_URLS[$r]}"
done

# ----- Print the manual force-push step -----
cat <<EOF

================================================================================
History rewrite complete locally. Repo size before/after:
EOF
du -sh "$BACKUP_DIR/.git" 2>/dev/null || du -sh "$BACKUP_DIR"
du -sh .git
cat <<EOF

The next step is destructive on the remotes. Run these manually after a final
sanity check (e.g. \`git log --all --oneline | head\` looks reasonable):

EOF

for r in "${!REMOTE_URLS[@]}"; do
  cat <<EOF
  # remote: $r
  git push --force --all $r
  git push --force --tags $r

EOF
done

cat <<EOF
After the force-push, every collaborator with a clone must:
  - re-clone from scratch, OR
  - run: git fetch $r && git reset --hard $r/<branch>

The mirror backup at $BACKUP_DIR can be deleted once you have verified the
remote is healthy. Keep it for at least 24 hours.
================================================================================
EOF
