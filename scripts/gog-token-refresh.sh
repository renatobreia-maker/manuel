#!/bin/bash
# GOG Token Refresh — mantém tokens OAuth do Google ativos
# Faz uma chamada leve à API do Calendar para forçar refresh do token
# Crontab: 0 8 * * * ~/.openclaw/scripts/gog-token-refresh.sh
#
# Contas monitoradas:
#   - renatobreia@gmail.com (pessoal)
#   - renato.breia@nordresearch.com.br (Nord)

export GOG_KEYRING_PASSWORD="manuel-gog-2026"
LOG="$HOME/.openclaw/logs/gog-token-refresh.log"
mkdir -p "$(dirname "$LOG")"

timestamp() {
  date "+%Y-%m-%d %H:%M:%S"
}

echo "$(timestamp) [START] GOG token refresh" >> "$LOG"

# Lista de contas para manter vivas
ACCOUNTS=("renatobreia@gmail.com" "renato.breia@nordresearch.com.br")

for ACCOUNT in "${ACCOUNTS[@]}"; do
  # Chamada leve: listar 1 evento do dia de hoje
  RESULT=$(gog calendar list primary \
    --from "$(date -u +%Y-%m-%dT00:00:00Z)" \
    --to "$(date -u +%Y-%m-%dT23:59:59Z)" \
    -a "$ACCOUNT" \
    --no-input 2>&1)
  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    echo "$(timestamp) [OK] $ACCOUNT — token válido" >> "$LOG"
  else
    # Verificar se é erro de token expirado
    if echo "$RESULT" | grep -qi "expired\|revoked\|invalid_grant"; then
      echo "$(timestamp) [ERROR] $ACCOUNT — token EXPIRADO! Precisa de re-auth manual:" >> "$LOG"
      echo "$(timestamp)         GOG_KEYRING_PASSWORD=\"manuel-gog-2026\" gog auth login -a $ACCOUNT" >> "$LOG"

      # Notificar Renato via Telegram
      BOT="8478596151:AAGLoQUYYXrppaVC0fa6MwsssO6qo6EryiE"
      CHAT="800405424"
      MSG="⚠️ Token Google expirou para $ACCOUNT. Rodar no Terminal:%0A%0AGOG_KEYRING_PASSWORD=\"manuel-gog-2026\" gog auth login -a $ACCOUNT"
      curl -s -X POST "https://api.telegram.org/bot$BOT/sendMessage" \
        -d "chat_id=$CHAT&text=$MSG" > /dev/null 2>&1

      echo "$(timestamp) [INFO] Notificação enviada ao Telegram" >> "$LOG"
    else
      echo "$(timestamp) [WARN] $ACCOUNT — erro não-auth: $(echo "$RESULT" | head -1)" >> "$LOG"
    fi
  fi
done

echo "$(timestamp) [DONE] GOG token refresh complete" >> "$LOG"
exit 0
