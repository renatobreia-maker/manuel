#!/bin/bash
# OpenClaw Token Refresh v2
# Usa o Claude CLI para forçar refresh do OAuth token antes de expirar.
# O CLI faz refresh automaticamente quando detecta token expirado.
# Depois atualiza o plist, auth-profiles.json e config snapshot.
#
# NOTA: O macOS trava o login keychain quando a tela bloqueia.
# Este script lida com keychain travado lendo o token do auth-profiles.json
# como fallback, e usando o CLI para forçar refresh quando possível.
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
TOKEN_CACHE="$HOME/.openclaw/scripts/.token-cache.json"

mkdir -p "$(dirname "$LOG")"

timestamp() {
  date "+%Y-%m-%d %H:%M:%S"
}

# =====================================================
# 1. Tentar ler token do keychain
# =====================================================
CURRENT_DATA=$($SECURITY find-generic-password -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT" -w 2>/dev/null)
KEYCHAIN_OK=false

if [ -n "$CURRENT_DATA" ]; then
  KEYCHAIN_OK=true
  EXPIRES_AT=$(echo "$CURRENT_DATA" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['claudeAiOauth']['expiresAt'])" 2>/dev/null)
  CURRENT_TOKEN=$(echo "$CURRENT_DATA" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['claudeAiOauth']['accessToken'])" 2>/dev/null)

  # Salvar cache local para quando keychain estiver travado
  echo "$CURRENT_DATA" > "$TOKEN_CACHE"
  chmod 600 "$TOKEN_CACHE"
else
  echo "$(timestamp) [WARN] Keychain locked/inaccessible. Trying cache..." >> "$LOG"

  # Fallback 1: token cache local
  if [ -f "$TOKEN_CACHE" ]; then
    CURRENT_DATA=$(cat "$TOKEN_CACHE" 2>/dev/null)
    EXPIRES_AT=$(echo "$CURRENT_DATA" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['claudeAiOauth']['expiresAt'])" 2>/dev/null)
    CURRENT_TOKEN=$(echo "$CURRENT_DATA" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['claudeAiOauth']['accessToken'])" 2>/dev/null)
    echo "$(timestamp) [INFO] Using cached token data" >> "$LOG"
  # Fallback 2: auth-profiles.json
  elif [ -f "$AUTH_PROFILES" ]; then
    CURRENT_TOKEN=$(python3 -c "
import json
with open('$AUTH_PROFILES') as f:
    auth = json.load(f)
print(auth.get('profiles',{}).get('anthropic:claude-cli',{}).get('token',''))
" 2>/dev/null)
    EXPIRES_AT=""
    echo "$(timestamp) [INFO] Using token from auth-profiles.json (no expiry info)" >> "$LOG"
  fi

  if [ -z "$CURRENT_TOKEN" ]; then
    echo "$(timestamp) [ERROR] Cannot read token from any source (keychain locked, no cache, no auth-profiles)" >> "$LOG"
    exit 1
  fi
fi

# =====================================================
# 2. Verificar expiração
# =====================================================
NOW_MS=$(python3 -c "import time; print(int(time.time()*1000))")

if [ -n "$EXPIRES_AT" ] && [ "$EXPIRES_AT" -gt 0 ] 2>/dev/null; then
  REMAINING_MS=$((EXPIRES_AT - NOW_MS))
  REMAINING_HOURS=$((REMAINING_MS / 3600000))
  echo "$(timestamp) [INFO] Token expires in ${REMAINING_HOURS}h (${REMAINING_MS}ms)" >> "$LOG"

  # Se mais de 2h restantes, skip
  if [ "$REMAINING_MS" -gt 7200000 ]; then
    echo "$(timestamp) [OK] Token still valid (${REMAINING_HOURS}h remaining), skipping refresh" >> "$LOG"
    exit 0
  fi

  echo "$(timestamp) [INFO] Token expiring soon or expired (${REMAINING_HOURS}h), forcing refresh..." >> "$LOG"
else
  echo "$(timestamp) [INFO] No expiry info available, attempting refresh..." >> "$LOG"
fi

# =====================================================
# 3. Forçar CLI a fazer refresh
# =====================================================
RESULT=$(CLAUDECODE="" "$CLAUDE_CLI" -p "respond with: ok" --max-turns 1 --model sonnet 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "$(timestamp) [ERROR] CLI refresh failed (exit $EXIT_CODE): $(echo "$RESULT" | head -2)" >> "$LOG"
  exit 1
fi

echo "$(timestamp) [OK] CLI command succeeded, checking for new token..." >> "$LOG"

# =====================================================
# 4. Ler token (possivelmente refreshed) do keychain
# =====================================================
NEW_DATA=$($SECURITY find-generic-password -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT" -w 2>/dev/null)

if [ -n "$NEW_DATA" ]; then
  NEW_TOKEN=$(echo "$NEW_DATA" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['claudeAiOauth']['accessToken'])" 2>/dev/null)
  NEW_EXPIRES=$(echo "$NEW_DATA" | python3 -c "
import sys,json,datetime
d = json.loads(sys.stdin.read())
exp = d['claudeAiOauth']['expiresAt']/1000
print(datetime.datetime.fromtimestamp(exp).strftime('%Y-%m-%d %H:%M'))
" 2>/dev/null)

  # Atualizar cache local
  echo "$NEW_DATA" > "$TOKEN_CACHE"
  chmod 600 "$TOKEN_CACHE"
else
  echo "$(timestamp) [WARN] Keychain still locked after CLI refresh. Token may have been refreshed internally by CLI." >> "$LOG"
  # O CLI refresha internamente mas pode não ter escrito de volta ao keychain
  # Neste caso, o gateway continua usando o CLI backend que funciona independente
  exit 0
fi

if [ -z "$NEW_TOKEN" ]; then
  echo "$(timestamp) [ERROR] Could not read new token from keychain" >> "$LOG"
  exit 1
fi

echo "$(timestamp) [OK] New token obtained (expires: $NEW_EXPIRES)" >> "$LOG"

# =====================================================
# 5. Atualizar plist com novo token
# =====================================================
if [ -f "$PLIST" ]; then
  OLD_PLIST_TOKEN=$(defaults read "$PLIST" EnvironmentVariables 2>/dev/null | grep -A1 "CLAUDE_CODE_OAUTH_TOKEN" | tail -1 | sed 's/.*"\(.*\)".*/\1/' 2>/dev/null)

  if [ "$OLD_PLIST_TOKEN" != "$NEW_TOKEN" ] && [ -n "$NEW_TOKEN" ]; then
    /usr/libexec/PlistBuddy -c "Set :EnvironmentVariables:CLAUDE_CODE_OAUTH_TOKEN $NEW_TOKEN" "$PLIST" 2>/dev/null

    if [ $? -eq 0 ]; then
      echo "$(timestamp) [OK] Plist updated with new token" >> "$LOG"

      # Reiniciar gateway para pegar novo env var
      launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway 2>/dev/null
      if [ $? -eq 0 ]; then
        echo "$(timestamp) [OK] Gateway restarted with new token" >> "$LOG"
      else
        launchctl unload "$PLIST" 2>/dev/null
        sleep 2
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

# =====================================================
# 6. Atualizar keychain entry legado (oauth_token)
# =====================================================
if [ "$KEYCHAIN_OK" = true ]; then
  $SECURITY delete-generic-password -s "$KEYCHAIN_SERVICE" -a "oauth_token" 2>/dev/null
  $SECURITY add-generic-password -s "$KEYCHAIN_SERVICE" -a "oauth_token" -w "$NEW_TOKEN" 2>/dev/null
fi

# =====================================================
# 7. Atualizar auth-profiles.json
# =====================================================
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

# =====================================================
# 8. Atualizar config snapshot
# =====================================================
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
