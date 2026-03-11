#!/bin/bash
# OpenClaw Gateway Watchdog v2
# Verifica se o LaunchAgent está carregado e o processo está rodando.
# Se não, recarrega o serviço automaticamente.
# Também detecta crash loops e erros de autenticação.
#
# Instalar no crontab: */2 * * * * ~/.openclaw/scripts/gateway-watchdog.sh

LABEL="ai.openclaw.gateway"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG="$HOME/.openclaw/logs/watchdog.log"
STATE_FILE="$HOME/.openclaw/scripts/.watchdog-state"
PORT=18789

mkdir -p "$(dirname "$LOG")"
mkdir -p "$(dirname "$STATE_FILE")"

timestamp() {
  date "+%Y-%m-%d %H:%M:%S"
}

# =====================================================
# 0. Rodar config guardian (protege configs críticas)
# =====================================================
CONFIG_GUARD="$HOME/.openclaw/scripts/config-guard.sh"
if [ -x "$CONFIG_GUARD" ]; then
  "$CONFIG_GUARD" 2>/dev/null
fi

# =====================================================
# 1. Verificar se o plist existe
# =====================================================
if [ ! -f "$PLIST" ]; then
  echo "$(timestamp) [ERROR] Plist not found: $PLIST" >> "$LOG"
  exit 1
fi

# =====================================================
# 2. Verificar se o serviço está carregado no launchd
# =====================================================
if ! launchctl list 2>/dev/null | grep -q "$LABEL"; then
  echo "$(timestamp) [ALERT] Service '$LABEL' not loaded in launchd. Re-loading..." >> "$LOG"
  launchctl load "$PLIST" 2>> "$LOG"

  sleep 3
  if launchctl list 2>/dev/null | grep -q "$LABEL"; then
    echo "$(timestamp) [OK] Service re-loaded successfully." >> "$LOG"
  else
    echo "$(timestamp) [ERROR] Failed to re-load service." >> "$LOG"
    exit 1
  fi
  exit 0
fi

# =====================================================
# 3. Verificar se o processo está realmente rodando
# =====================================================
PID=$(launchctl list | grep "$LABEL" | awk '{print $1}')
if [ "$PID" = "-" ] || [ -z "$PID" ]; then
  echo "$(timestamp) [WARN] Service loaded but no PID (process not running). launchd should restart it via KeepAlive." >> "$LOG"
  exit 0
fi

# =====================================================
# 4. Detectar crash loop (PID muda muito rápido)
# =====================================================
PREV_PID=""
CRASH_COUNT=0
if [ -f "$STATE_FILE" ]; then
  PREV_PID=$(head -1 "$STATE_FILE" 2>/dev/null)
  CRASH_COUNT=$(sed -n '2p' "$STATE_FILE" 2>/dev/null)
  CRASH_COUNT=${CRASH_COUNT:-0}
fi

if [ -n "$PREV_PID" ] && [ "$PID" != "$PREV_PID" ]; then
  CRASH_COUNT=$((CRASH_COUNT + 1))
  echo "$(timestamp) [WARN] PID changed ($PREV_PID -> $PID). Crash count: $CRASH_COUNT" >> "$LOG"

  # Se muitas mudanças de PID em sequência, forçar restart limpo
  if [ "$CRASH_COUNT" -ge 5 ]; then
    echo "$(timestamp) [ALERT] Crash loop detected ($CRASH_COUNT PID changes). Forcing clean restart..." >> "$LOG"

    # Forçar restart limpo
    launchctl kickstart -k "gui/$(id -u)/$LABEL" 2>> "$LOG"

    if [ $? -eq 0 ]; then
      echo "$(timestamp) [OK] Clean restart via kickstart." >> "$LOG"
    else
      launchctl unload "$PLIST" 2>/dev/null
      sleep 2
      launchctl load "$PLIST" 2>/dev/null
      echo "$(timestamp) [OK] Clean restart via unload/load." >> "$LOG"
    fi

    CRASH_COUNT=0
  fi
elif [ "$PID" = "$PREV_PID" ]; then
  # PID estável - resetar crash counter
  if [ "$CRASH_COUNT" -gt 0 ]; then
    echo "$(timestamp) [OK] PID stable ($PID). Resetting crash counter." >> "$LOG"
    CRASH_COUNT=0
  fi
fi

# Salvar estado atual
echo "$PID" > "$STATE_FILE"
echo "$CRASH_COUNT" >> "$STATE_FILE"

# =====================================================
# 5. Verificar se o processo responde (porta aberta)
# =====================================================
if ! /usr/sbin/lsof -iTCP:$PORT -sTCP:LISTEN -P -n 2>/dev/null | grep -q "$PID"; then
  echo "$(timestamp) [WARN] Process $PID running but not listening on port $PORT. May be starting up." >> "$LOG"
fi

# =====================================================
# 6. Verificar erros 401 (token expirado)
# =====================================================
GATEWAY_LOG="/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log"
if [ -f "$GATEWAY_LOG" ]; then
  RECENT_401=$(tail -50 "$GATEWAY_LOG" 2>/dev/null | grep -c "401\|authentication_error\|Invalid bearer token")
  if [ "$RECENT_401" -gt 2 ]; then
    echo "$(timestamp) [ALERT] Detected $RECENT_401 auth errors in recent logs. Triggering token refresh..." >> "$LOG"
    "$HOME/.openclaw/scripts/token-refresh.sh" 2>> "$LOG" &
  fi
fi

# =====================================================
# 7. Verificar hot-reload loops no log
# =====================================================
ERR_LOG="$HOME/.openclaw/logs/gateway.err.log"
if [ -f "$ERR_LOG" ]; then
  # Contar reloads nos últimos minutos
  RECENT_RELOADS=$(tail -30 "$ERR_LOG" 2>/dev/null | grep -c "config reload\|config change detected\|hot reload")
  if [ "$RECENT_RELOADS" -gt 3 ]; then
    echo "$(timestamp) [ALERT] Excessive config reloads detected ($RECENT_RELOADS). Running config guard..." >> "$LOG"
    if [ -x "$CONFIG_GUARD" ]; then
      "$CONFIG_GUARD" 2>/dev/null
    fi
  fi
fi

# =====================================================
# 8. Detectar falhas do Telegram (Network request failed)
# =====================================================
if [ -f "$ERR_LOG" ]; then
  # Contar falhas de rede do Telegram nas últimas linhas
  TELEGRAM_FAILS=$(tail -30 "$ERR_LOG" 2>/dev/null | grep -c "Network request.*failed\|sendMessage failed\|sendChatAction failed\|Polling stall")
  if [ "$TELEGRAM_FAILS" -gt 3 ]; then
    echo "$(timestamp) [ALERT] Telegram network failures detected ($TELEGRAM_FAILS). Restarting gateway..." >> "$LOG"
    launchctl kickstart -k "gui/$(id -u)/$LABEL" 2>> "$LOG"
    if [ $? -eq 0 ]; then
      echo "$(timestamp) [OK] Gateway restarted to fix Telegram." >> "$LOG"
    fi
    exit 0
  fi
fi

# Tudo OK — silencioso (não loga para não poluir)
exit 0
