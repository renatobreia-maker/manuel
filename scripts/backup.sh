#!/bin/bash
# OpenClaw Backup - roda a cada 3h via cron

BACKUP_DIR="$HOME/.openclaw/backup"
OPENCLAW_DIR="$HOME/.openclaw"

# Sync workspace (memória, SOUL, IDENTITY, etc.) — exclui .git para evitar submodule
rsync -a --delete --exclude='.git' "$OPENCLAW_DIR/workspace/" "$BACKUP_DIR/workspace/"

# Sync scripts
rsync -a --delete "$OPENCLAW_DIR/scripts/" "$BACKUP_DIR/scripts/"

# Config sem campos sensíveis
python3 -c "
import json
with open('$OPENCLAW_DIR/openclaw.json') as f:
    d = json.load(f)
# Remover session (pode conter tokens)
d.pop('session', None)
with open('$BACKUP_DIR/openclaw.json', 'w') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
"

# Dump do crontab
crontab -l > "$BACKUP_DIR/crontab.txt" 2>/dev/null || echo "sem crontab" > "$BACKUP_DIR/crontab.txt"

# Git commit e push
cd "$BACKUP_DIR"
git add -A
git diff --cached --quiet && exit 0  # nada mudou, sai

TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
git commit -m "backup: $TIMESTAMP"
git push origin main 2>/dev/null || git push --set-upstream origin main
