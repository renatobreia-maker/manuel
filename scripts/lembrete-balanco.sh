#!/usr/bin/env bash
# lembrete-balanco.sh — Lembrete diário do balanço mensal de investimentos
# Roda todo dia às 9:03 via LaunchAgent, mas só dispara se o balanço do mês não foi feito

BOT_TOKEN="8478596151:AAGLoQUYYXrppaVC0fa6MwsssO6qo6EryiE"
CHAT_ID="-1003630621992"
TOPIC_ID="63"

LOG="/Users/renatobreia/.openclaw/logs/lembrete-balanco.log"
exec >> "$LOG" 2>&1
echo "--- $(date '+%Y-%m-%d %H:%M:%S') ---"

# Verifica se o balanço do mês já foi feito
MES_ATUAL=$(date '+%Y-%m')
FLAG="/Users/renatobreia/.openclaw/flags/balanco-${MES_ATUAL}.done"

if [ -f "$FLAG" ]; then
  echo "Balanço de ${MES_ATUAL} já feito (flag: $FLAG). Lembrete não enviado."
  exit 0
fi

# Busca a data do último balanço concluído
ULTIMO_FLAG=$(ls /Users/renatobreia/.openclaw/flags/balanco-*.done 2>/dev/null | sort | tail -1)
if [ -n "$ULTIMO_FLAG" ]; then
  ULTIMO_DATA=$(cat "$ULTIMO_FLAG" 2>/dev/null || basename "$ULTIMO_FLAG" | sed 's/balanco-//;s/\.done//')
else
  ULTIMO_DATA="desconhecido"
fi

MSG="📊 *Balanço Mensal de Investimentos*

Para fazer o balanço do mês, preciso de:
1️⃣ Visão 360° BTG Nord Wealth \(PDF\)
2️⃣ Screenshots Mercado Bitcoin \(BTC, ETH, SOL\)
3️⃣ Screenshots Avenue \(Overview \+ Ações \+ ETFs \+ Renda Fixa \+ Fundos\)
4️⃣ Taxa USD/BRL do dia

📌 _Último balanço: ${ULTIMO_DATA}_"

curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id="${CHAT_ID}" \
  -d message_thread_id="${TOPIC_ID}" \
  -d text="${MSG}" \
  -d parse_mode="MarkdownV2" \
  > /dev/null

echo "Lembrete enviado."
