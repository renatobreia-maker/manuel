#!/bin/bash
# OpenClaw Token Refresh
# Usa o Claude CLI para forçar refresh do OAuth token antes de expirar.
# O CLI faz refresh automaticamente quando detecta token expirado.
# Depois atualiza o plist do gateway com o novo token.
#
# Crontab: 0 */6 * * * ~/.openclaw/scripts/token-refresh.sh

CLAUDE_CLI="/Users/renatobreia/Library/Application Support/Claude/claude-code/2.1.72/claude"
PLIST="$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist"
LOG="$HOME/.openclaw/logs/token-refresh.log"
KEYCHAIN_SERVICE="Claude Code-credentials"
KEYCHAIN_ACCOUNT="renatobreia"
SECURITY="/usr/bin/security"
AUTH_PROFILES="$HOME/.openclaw/agents/main/agent/auth-profiles.json"
CONFIG_SNAPSHOT="$HOME/.openclaw/scripts/.config-snapshot.json"

mkdir -p "$(dirname "$LOG")"

timestamp() {
  date "+%Y-%m-%d %H:%M:%S"
}

# 1. Check current token expiry
CURRENT_DATA=$($SECURITY find-generic-password -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT" -w 2>/dev/null)
if [ -z "$CURRENT_DATA" ]; then
  echo "$(timestamp) [ERROR] No token data in keychain" >> "$LOG"
  exit 1
fi

EXPIRES_AT=$(echo "$CURRENT_DATA" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['claudeAiOauth']['expiresAt'])" 2>/dev/null)
NOW_MS=$(python3 -c "import time; print(int(time.time()*1000))")
REMAINING_MS=$((EXPIRES_AT - NOW_MS))
REMAINING_HOURS=$((REMAINING_MS / 3600000))

echo "$(timestamp) [INFO] Token expires in ${REMAINING_HOURS}h (${REMAINING_MS}ms)" >> "$LOG"

# 2. If more than 2 hours remaining, skip refresh
if [ "$REMAINING_MS" -gt 7200000 ]; then
  echo "$(timestamp) [OK] Token still valid (${REMAINING_HOURS}h remaining), skipping refresh" >> "$LOG"
  exit 0
fi

echo "$(timestamp) [INFO] Token expiring soon (${REMAINING_HOURS}h), forcing refresh..." >> "$LOG"

# 3. Force CLI to refresh by running a simple command
# Unset CLAUDECODE to avoid nested session error
RESULT=$(CLAUDECODE="" "$CLAUDE_CLI" -p "say ok" --max-turns 1 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "$(timestamp) [ERROR] CLI refresh failed (exit $EXIT_CODE): $RESULT" >> "$LOG"

  # Fallback: try auth login (will fail without browser, but might trigger refresh)
  CLAUDECODE="" "$CLAUDE_CLI" auth status 2>/dev/null
  exit 1
fi

echo "$(timestamp) [OK] CLI command succeeded, checking for new token..." >> "$LOG"

# 4. Read the (potentially refreshed) token from keychain
NEW_DATA=$($SECURITY find-generic-password -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT" -w 2>/dev/null)
NEW_TOKEN=$(echo "$NEW_DATA" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['claudeAiOauth']['accessToken'])" 2>/dev/null)
NEW_EXPIRES=$(echo "$NEW_DATA" | python3 -c "
import sys,json,datetime
d = json.loads(sys.stdin.read())
exp = d['claudeAiOauth']['expiresAt']/1000
print(datetime.datetime.fromtimestamp(exp).strftime('%Y-%m-%d %H:%M'))
" 2>/dev/null)

if [ -z "$NEW_TOKEN" ]; then
  echo "$(timestamp) [ERROR] Could not read new token from keychain" >> "$LOG"
  exit 1
fi

echo "$(timestamp) [OK] New token obtained (expires: $NEW_EXPIRES)" >> "$LOG"

# 5. Update the plist with new token
if [ -f "$PLIST" ]; then
  # Read current plist token
  OLD_TOKEN=$(defaults read "$PLIST" EnvironmentVariables 2>/dev/null | grep -A1 "CLAUDE_CODE_OAUTH_TOKEN" | tail -1 | sed 's/.*"\(.*\)".*/\1/' 2>/dev/null)

  if [ "$OLD_TOKEN" != "$NEW_TOKEN" ] && [ -n "$NEW_TOKEN" ]; then
    # Use plutil to update the plist
    /usr/libexec/PlistBuddy -c "Set :EnvironmentVariables:CLAUDE_CODE_OAUTH_TOKEN $NEW_TOKEN" "$PLIST" 2>/dev/null

    if [ $? -eq 0 ]; then
      echo "$(timestamp) [OK] Plist updated with new token" >> "$LOG"

      # Reload gateway to pick up new env var
      launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway 2>/dev/null
      if [ $? -eq 0 ]; then
        echo "$(timestamp) [OK] Gateway restarted with new token" >> "$LOG"
      else
        # Fallback: unload/load
        launchctl unload "$PLIST" 2>/dev/null
        launchctl load "$PLIST" 2>/dev/null
        echo "$(timestamp) [OK] Gateway reloaded (fallback)" >> "$LOG"
      fi
    else
      echo "$(timestamp) [ERROR] Failed to update plist" >> "$LOG"
    fi
  else
    echo "$(timestamp) [INFO] Token unchanged, no plist update needed" >> "$LOG"
  fi
fi

# 6. Also update the legacy keychain entry (oauth_token)
$SECURITY delete-generic-password -s "$KEYCHAIN_SERVICE" -a "oauth_token" 2>/dev/null
$SECURITY add-generic-password -s "$KEYCHAIN_SERVICE" -a "oauth_token" -w "$NEW_TOKEN" 2>/dev/null

# 7. Update auth-profiles.json with new token
if [ -f "$AUTH_PROFILES" ] && [ -n "$NEW_TOKEN" ]; then
  python3 -c "
import json
with open('$AUTH_PROFILES') as f:
    auth = json.load(f)
auth['profiles']['anthropic:claude-cli']['token'] = '$NEW_TOKEN'
with open('$AUTH_PROFILES', 'w') as f:
    json.dump(auth, f, indent=2)
print('ok')
" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "$(timestamp) [OK] auth-profiles.json updated with new token" >> "$LOG"
  fi
fi

# 8. Update config snapshot to reflect new token
if [ -f "$CONFIG_SNAPSHOT" ] && [ -n "$NEW_TOKEN" ]; then
  python3 -c "
import json
with open('$CONFIG_SNAPSHOT') as f:
    snap = json.load(f)
snap['auth_profiles_json']['profiles']['anthropic:claude-cli']['token'] = '$NEW_TOKEN'
with open('$CONFIG_SNAPSHOT', 'w') as f:
    json.dump(snap, f, indent=2)
print('ok')
" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "$(timestamp) [OK] Config snapshot updated with new token" >> "$LOG"
  fi
fi

echo "$(timestamp) [DONE] Token refresh complete" >> "$LOG"
exit 0
