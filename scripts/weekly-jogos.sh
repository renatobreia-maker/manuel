#!/usr/bin/env bash
# weekly-jogos.sh — Envia lista de jogos do Renato toda segunda às 8h
# Crontab: 0 8 * * 1 /Users/renatobreia/.openclaw/scripts/weekly-jogos.sh

set -euo pipefail

BOT_TOKEN="8478596151:AAGLoQUYYXrppaVC0fa6MwsssO6qo6EryiE"
CHAT_ID="800405424"

LOG="/Users/renatobreia/.openclaw/logs/weekly-jogos.log"
exec >> "$LOG" 2>&1
echo "--- $(date '+%Y-%m-%d %H:%M:%S') ---"

TODAY=$(date '+%Y-%m-%d')

# --- ECP Pinheiros: Real Madrid (316) ---
RAW_RM=$(curl -s "https://futebol.ecp.org.br/index.php?tipo=canal&id=16&id_campeonato=316&bt-enviar=" 2>/dev/null || echo "")
JOGOS_RM=""
if [ -n "$RAW_RM" ]; then
  JOGOS_RM=$(echo "$RAW_RM" | python3 -c "
import sys, re
from html.parser import HTMLParser

html = sys.stdin.read()
# Find all game rows with Real Madrid
pattern = r'(\d{2}/\d{2}/\d{4})\s*[\-–]\s*\w+\s*[\-–]\s*(\d{2}:\d{2})\s*.*?(Real Madrid[^<]*|[^<]*Real Madrid[^<]*)'
# Simpler: just extract table rows mentioning Real Madrid
lines = html.split('\n')
games = []
for line in lines:
    if 'Real Madrid' in line:
        # Try to extract date, time, teams
        date_match = re.findall(r'(\d{2}/\d{2}/\d{4})', line)
        time_match = re.findall(r'(\d{2}:\d{2})', line)
        if date_match and time_match:
            games.append(f'{date_match[0]} {time_match[0]} - {line.strip()[:80]}')
if not games:
    print('(buscar via bot)')
else:
    print('\n'.join(games))
" 2>/dev/null || echo "(buscar via bot)")
fi

# --- ECP Pinheiros: Boca (319) ---
RAW_BOCA=$(curl -s "https://futebol.ecp.org.br/index.php?tipo=canal&id=16&id_campeonato=319&bt-enviar=" 2>/dev/null || echo "")
JOGOS_BOCA=""
if [ -n "$RAW_BOCA" ]; then
  JOGOS_BOCA=$(echo "$RAW_BOCA" | python3 -c "
import sys, re
html = sys.stdin.read()
lines = html.split('\n')
games = []
for line in lines:
    if 'Boca' in line or 'BOCA' in line:
        date_match = re.findall(r'(\d{2}/\d{2}/\d{4})', line)
        time_match = re.findall(r'(\d{2}:\d{2})', line)
        if date_match and time_match:
            games.append(f'{date_match[0]} {time_match[0]} - {line.strip()[:80]}')
if not games:
    print('(buscar via bot)')
else:
    print('\n'.join(games))
" 2>/dev/null || echo "(buscar via bot)")
fi

# --- Paineiras: Milan (fixo, atualizado manualmente) ---
JOGOS_MILAN="24/Mar (seg) 20h45 — Milan x Liverpool
31/Mar (seg) 20h45 — Milan x Real Madrid
15/Abr (qua) 20h45 — Milan x Barcelona
05/Mai (seg) 20h45 — Milan x PSG
26-28/Mai — SEMI FINAL
04/Jun — FINAL"

# Filter past Paineiras games
JOGOS_MILAN_FILTRADO=$(echo "$JOGOS_MILAN" | python3 -c "
import sys
from datetime import datetime

today = datetime.now().date()
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    # Try to parse date from start
    try:
        parts = line.split('/')
        day = int(parts[0])
        month_str = parts[1][:3]
        months = {'Jan':1,'Fev':2,'Mar':3,'Abr':4,'Mai':5,'Jun':6,'Jul':7,'Ago':8,'Set':9,'Out':10,'Nov':11,'Dez':12}
        month = months.get(month_str, 0)
        if month > 0:
            game_date = datetime(2026, month, day).date()
            if game_date >= today:
                print(line)
        else:
            print(line)
    except:
        print(line)
" 2>/dev/null || echo "$JOGOS_MILAN")

MSG="⚽ Seus jogos da semana:

🏆 ECP Pinheiros — Real Madrid
${JOGOS_RM:-Sem jogos próximos}

🏆 ECP Pinheiros — Boca
${JOGOS_BOCA:-Sem jogos próximos}

🏆 Paineiras — Milan
${JOGOS_MILAN_FILTRADO:-Sem jogos próximos}

Boa semana! 💪"

# Send via Telegram Bot API
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id="$CHAT_ID" \
  --data-urlencode "text=${MSG}" \
  -d parse_mode="" \
  -d disable_web_page_preview=true)

OK=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ok',''))" 2>/dev/null || echo "")

if [ "$OK" = "True" ]; then
  echo "Jogos enviados com sucesso"
else
  echo "ERRO ao enviar: $RESPONSE"
  exit 1
fi
