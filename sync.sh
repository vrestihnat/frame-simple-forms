#!/bin/bash
# Sync local project to remote server via rsync

LOCAL_DIR="$HOME/Documents/augment_code/frame-simple-forms/"
REMOTE_DIR="wwwadmin@ramari.cz:~/builds/git/dantik_web/app/frame-simple-forms/"

EXTRA_ARGS=""
if [[ "$1" == "--dry-run" ]]; then
  EXTRA_ARGS="--dry-run"
  echo "=== DRY RUN (nic se nenahraje) ==="
fi

/usr/bin/rsync -avz --delete $EXTRA_ARGS \
  --exclude '.git/' \
  --exclude '.vscode/' \
  --exclude '.claude/' \
  --exclude '.sixth/' \
  --exclude 'test-results/' \
  --exclude 'node_modules/' \
  --exclude '.DS_Store' \
  --exclude '*.swp' \
  --exclude 'sync.sh' \
  --exclude '.mcp.json' \
  --exclude '.gitignore' \
  "$LOCAL_DIR" "$REMOTE_DIR"
