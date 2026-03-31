#!/usr/bin/env bash
# lembrete-balanco.sh — Lembrete diário do balanço mensal de investimentos
# Crontab: 3 12 * * * /Users/renatobreia/.openclaw/lembrete-balanco.sh

BOT_TOKEN="8478596151:AAGLoQUYYXrppaVC0fa6MwsssO6qo6EryiE"
CHAT_ID="-1003630621992"
TOPIC_ID="63"

LOG="/Users/renatobreia/.openclaw/logs/lembrete-balanco.log"
exec >> "$LOG" 2>&1
echo "--- $(date '+%Y-%m-%d %H:%M:%S') ---"

MSG="📊 *Lembrete: Balanço Mensal de Investimentos*

Para fazer o balanço do mês, preciso de:
1️⃣ Visão 360° BTG Nord Wealth \(PDF\)
2️⃣ Screenshots Mercado Bitcoin \(BTC, ETH, SOL\)
3️⃣ Screenshots Avenue \(Overview \+ Ações \+ ETFs \+ Renda Fixa \+ Fundos\)
4️⃣ Taxa USD/BRL do dia

📌 _Último balanço: 31/Mar/2026 → R\$ 18\.803\.700,24_"

curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id="${CHAT_ID}" \
  -d message_thread_id="${TOPIC_ID}" \
  -d text="${MSG}" \
  -d parse_mode="MarkdownV2" \
  > /dev/null

echo "Lembrete enviado."
