#!/bin/bash
# OpenClaw Config Guardian
# Protege configurações críticas contra auto-modificação pelo OpenClaw.
# O OpenClaw v2026.3.8 tem um bug onde modifica openclaw.json durante operação,
# o que dispara o file watcher → hot-reload → mata in-flight responses.
#
# Este script:
# 1. Salva snapshot das configs críticas na primeira execução
# 2. Nas execuções seguintes, verifica se alguma config crítica mudou
# 3. Se mudou, restaura os valores corretos sem tocar no resto
#
# Crontab: * * * * * ~/.openclaw/scripts/config-guard.sh
# (roda a cada minuto)

CONFIG="$HOME/.openclaw/openclaw.json"
AUTH_PROFILES="$HOME/.openclaw/agents/main/agent/auth-profiles.json"
SNAPSHOT="$HOME/.openclaw/scripts/.config-snapshot.json"
LOG="$HOME/.openclaw/logs/config-guard.log"

mkdir -p "$(dirname "$LOG")"
mkdir -p "$(dirname "$SNAPSHOT")"

timestamp() {
  date "+%Y-%m-%d %H:%M:%S"
}

# Se o config não existe, sai
if [ ! -f "$CONFIG" ]; then
  echo "$(timestamp) [ERROR] Config not found: $CONFIG" >> "$LOG"
  exit 1
fi

# Criar snapshot se não existe (primeira execução)
if [ ! -f "$SNAPSHOT" ]; then
  python3 -c "
import json, sys

with open('$CONFIG') as f:
    cfg = json.load(f)

with open('$AUTH_PROFILES') as f:
    auth = json.load(f)

snapshot = {
    'created_at': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'openclaw': {
        'auth_profiles': cfg.get('auth', {}).get('profiles', {}),
        'telegram_dmPolicy': cfg.get('channels', {}).get('telegram', {}).get('dmPolicy'),
        'telegram_allowFrom': cfg.get('channels', {}).get('telegram', {}).get('allowFrom'),
        'telegram_groupAllowFrom': cfg.get('channels', {}).get('telegram', {}).get('groupAllowFrom'),
        'telegram_groupPolicy': cfg.get('channels', {}).get('telegram', {}).get('groupPolicy'),
        'telegram_streaming': cfg.get('channels', {}).get('telegram', {}).get('streaming'),
        'cli_reliability': cfg.get('agents', {}).get('defaults', {}).get('cliBackends', {}).get('claude-cli', {}).get('reliability'),
        'model_primary': cfg.get('agents', {}).get('defaults', {}).get('model', {}).get('primary'),
    },
    'auth_profiles_json': {
        'profiles': auth.get('profiles', {})
    }
}

with open('$SNAPSHOT', 'w') as f:
    json.dump(snapshot, f, indent=2)

print('Snapshot created')
" 2>&1

  if [ $? -eq 0 ]; then
    echo "$(timestamp) [INIT] Config snapshot created at $SNAPSHOT" >> "$LOG"
  else
    echo "$(timestamp) [ERROR] Failed to create snapshot" >> "$LOG"
    exit 1
  fi
  exit 0
fi

# Verificar e restaurar configs críticas
python3 << 'PYEOF'
import json, sys, os, datetime

CONFIG = os.path.expanduser("~/.openclaw/openclaw.json")
AUTH_PROFILES = os.path.expanduser("~/.openclaw/agents/main/agent/auth-profiles.json")
SNAPSHOT = os.path.expanduser("~/.openclaw/scripts/.config-snapshot.json")
LOG = os.path.expanduser("~/.openclaw/logs/config-guard.log")

def log(level, msg):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG, "a") as f:
        f.write(f"{ts} [{level}] {msg}\n")

try:
    with open(SNAPSHOT) as f:
        snap = json.load(f)
    with open(CONFIG) as f:
        cfg = json.load(f)
    with open(AUTH_PROFILES) as f:
        auth = json.load(f)
except Exception as e:
    log("ERROR", f"Failed to read files: {e}")
    sys.exit(1)

fixes_openclaw = []
fixes_auth = []

# Check openclaw.json critical values
telegram = cfg.get("channels", {}).get("telegram", {})
auth_cfg = cfg.get("auth", {}).get("profiles", {})
snap_oc = snap.get("openclaw", {})

# 1. Auth profiles in openclaw.json
if auth_cfg != snap_oc.get("auth_profiles"):
    cfg.setdefault("auth", {})["profiles"] = snap_oc["auth_profiles"]
    fixes_openclaw.append("auth.profiles")

# 2. Telegram dmPolicy
if telegram.get("dmPolicy") != snap_oc.get("telegram_dmPolicy"):
    cfg["channels"]["telegram"]["dmPolicy"] = snap_oc["telegram_dmPolicy"]
    fixes_openclaw.append("telegram.dmPolicy")

# 3. Telegram allowFrom
if telegram.get("allowFrom") != snap_oc.get("telegram_allowFrom"):
    cfg["channels"]["telegram"]["allowFrom"] = snap_oc["telegram_allowFrom"]
    fixes_openclaw.append("telegram.allowFrom")

# 4. Telegram groupAllowFrom
if telegram.get("groupAllowFrom") != snap_oc.get("telegram_groupAllowFrom"):
    cfg["channels"]["telegram"]["groupAllowFrom"] = snap_oc["telegram_groupAllowFrom"]
    fixes_openclaw.append("telegram.groupAllowFrom")

# 5. Telegram groupPolicy
if telegram.get("groupPolicy") != snap_oc.get("telegram_groupPolicy"):
    cfg["channels"]["telegram"]["groupPolicy"] = snap_oc["telegram_groupPolicy"]
    fixes_openclaw.append("telegram.groupPolicy")

# 6. Telegram streaming
if telegram.get("streaming") != snap_oc.get("telegram_streaming"):
    cfg["channels"]["telegram"]["streaming"] = snap_oc["telegram_streaming"]
    fixes_openclaw.append("telegram.streaming")

# 7. CLI reliability (watchdog timeouts)
cli_backends = cfg.get("agents", {}).get("defaults", {}).get("cliBackends", {}).get("claude-cli", {})
if cli_backends.get("reliability") != snap_oc.get("cli_reliability"):
    cfg["agents"]["defaults"]["cliBackends"]["claude-cli"]["reliability"] = snap_oc["cli_reliability"]
    fixes_openclaw.append("cli.reliability")

# 8. Model primary
model = cfg.get("agents", {}).get("defaults", {}).get("model", {})
if model.get("primary") != snap_oc.get("model_primary"):
    cfg["agents"]["defaults"]["model"]["primary"] = snap_oc["model_primary"]
    fixes_openclaw.append("model.primary")

# 9. TTS auto — must be one of "off"|"always"|"inbound"|"tagged"
VALID_TTS_AUTO = {"off", "always", "inbound", "tagged"}
tts_auto = cfg.get("messages", {}).get("tts", {}).get("auto")
snap_tts = snap_oc.get("tts_auto")
if tts_auto not in VALID_TTS_AUTO:
    # Invalid value, restore from snapshot or default to "off"
    correct = snap_tts if snap_tts in VALID_TTS_AUTO else "off"
    cfg.setdefault("messages", {}).setdefault("tts", {})["auto"] = correct
    fixes_openclaw.append(f"tts.auto ({tts_auto}->{correct})")
elif snap_tts and tts_auto != snap_tts:
    cfg["messages"]["tts"]["auto"] = snap_tts
    fixes_openclaw.append("tts.auto")

# Check auth-profiles.json
snap_auth = snap.get("auth_profiles_json", {})
if auth.get("profiles") != snap_auth.get("profiles"):
    auth["profiles"] = snap_auth["profiles"]
    fixes_auth.append("profiles")

# Apply fixes
if fixes_openclaw:
    with open(CONFIG, "w") as f:
        json.dump(cfg, f, indent=2)
    log("FIX", f"Restored openclaw.json keys: {', '.join(fixes_openclaw)}")

if fixes_auth:
    with open(AUTH_PROFILES, "w") as f:
        json.dump(auth, f, indent=2)
    log("FIX", f"Restored auth-profiles.json keys: {', '.join(fixes_auth)}")

if not fixes_openclaw and not fixes_auth:
    # Silêncio — tudo ok (não polui o log)
    pass

PYEOF
