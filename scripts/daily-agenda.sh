#!/usr/bin/env bash
# daily-agenda.sh — Envia agenda dos próximos 7 dias para Renato via Telegram
# Crontab: 57 6 * * * /Users/renatobreia/.openclaw/scripts/daily-agenda.sh

set -euo pipefail

BOT_TOKEN="8478596151:AAGLoQUYYXrppaVC0fa6MwsssO6qo6EryiE"
CHAT_ID="800405424"
GOG="/opt/homebrew/bin/gog"
ACCOUNT="renato.breia@nordresearch.com.br"
export GOG_KEYRING_PASSWORD="manuel-gog-2026"

LOG="/Users/renatobreia/.openclaw/logs/daily-agenda.log"
exec >> "$LOG" 2>&1
echo "--- $(date '+%Y-%m-%d %H:%M:%S') ---"

# Fetch events for next 7 days (plain TSV: ID\tSTART\tEND\tSUMMARY)
RAW=$("$GOG" cal list --days=7 -a "$ACCOUNT" -p --max=100 --no-input 2>&1) || {
  echo "ERRO: gog falhou: $RAW"
  exit 1
}

# Skip header line, sort by start time
EVENTS=$(echo "$RAW" | tail -n +2 | sort -t$'\t' -k2,2)

if [ -z "$EVENTS" ]; then
  MSG="Bom dia, Renato! ☀️

Sua agenda dos próximos 7 dias está limpa — nenhum compromisso agendado."
else
  # Build formatted message grouped by day
  MSG="Bom dia, Renato! ☀️

📋 Sua agenda dos próximos 7 dias:
"
  CURRENT_DAY=""
  DAYS_PT=("DOM" "SEG" "TER" "QUA" "QUI" "SEX" "SÁB")

  while IFS=$'\t' read -r id start end summary; do
    # Extract date and time from ISO format (2026-03-12T08:00:00-03:00)
    DATE_PART="${start:0:10}"
    START_TIME="${start:11:5}"
    END_TIME="${end:11:5}"

    if [ "$DATE_PART" != "$CURRENT_DAY" ]; then
      CURRENT_DAY="$DATE_PART"
      # Get day of week
      DOW=$(date -j -f "%Y-%m-%d" "$DATE_PART" "+%w" 2>/dev/null || echo "0")
      DAY_NAME="${DAYS_PT[$DOW]}"
      DAY_NUM="${DATE_PART:8:2}"
      MONTH="${DATE_PART:5:2}"
      # Month names
      case "$MONTH" in
        01) MONTH_NAME="Jan" ;; 02) MONTH_NAME="Fev" ;; 03) MONTH_NAME="Mar" ;;
        04) MONTH_NAME="Abr" ;; 05) MONTH_NAME="Mai" ;; 06) MONTH_NAME="Jun" ;;
        07) MONTH_NAME="Jul" ;; 08) MONTH_NAME="Ago" ;; 09) MONTH_NAME="Set" ;;
        10) MONTH_NAME="Out" ;; 11) MONTH_NAME="Nov" ;; 12) MONTH_NAME="Dez" ;;
      esac
      MSG+="
🗓 ${DAY_NAME} ${DAY_NUM}/${MONTH_NAME}
"
    fi

    MSG+="• ${START_TIME}–${END_TIME} — ${summary}
"
  done <<< "$EVENTS"
fi

# Send via Telegram Bot API
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id="$CHAT_ID" \
  --data-urlencode "text=${MSG}" \
  -d parse_mode="" \
  -d disable_web_page_preview=true)

OK=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ok',''))" 2>/dev/null || echo "")

if [ "$OK" = "True" ]; then
  echo "Agenda enviada com sucesso"
else
  echo "ERRO ao enviar: $RESPONSE"
  exit 1
fi
