# MEMORY.md — Memória de Longo Prazo do Manuel

## Sobre o Renato
- Fundador da Nord Investimentos e Wealth Management
- 40 anos, São Paulo (GMT-3)
- Telegram: @renatotelegram1
- Busca evolução pessoal integral, não só produtividade

---

## 🚨 REGRAS CRÍTICAS — NUNCA VIOLAR

Lições aprendidas no dia 11/Mar/2026. Custaram um dia inteiro de downtime.

### 1. NUNCA deletar arquivos de credenciais
- `~/.claude/.credentials.json` e Keychain são sagrados
- CLI v2.1.72 usa macOS Keychain (`Claude Code-credentials`)
- Se der 401 → `claude auth login` no terminal (só o Renato pode fazer)

### 2. NUNCA mudar dmPolicy pra "pairing"
- `dmPolicy: "pairing"` faz o gateway ESCREVER no `openclaw.json` a cada interação
- File watcher detecta mudança → hot-reload → mata conexão Telegram → mensagem perdida
- **SEMPRE manter `dmPolicy: "open"` com `allowFrom: ["*"]`**

### 3. NUNCA modificar openclaw.json durante operação normal
- Qualquer escrita no config dispara hot-reload do gateway
- Hot-reload = reconexão de todos os canais = mensagens em andamento morrem
- Se precisar mudar config: avisar o Renato, fazer rápido, verificar status depois

### 4. NUNCA reduzir watchdog timeout abaixo de 600s
- Config atual: `noOutputTimeoutMs: 600000` (10 min)
- Default de 180s mata respostas complexas
- Localização: `agents.defaults.cliBackends.claude-cli.reliability.watchdog`

### 5. CUIDADO com `openclaw gateway restart`
- Pode descarregar o LaunchAgent permanentemente
- Se usar, SEMPRE verificar `openclaw gateway status` depois
- Existe watchdog cron (`*/2 * * * *`) que recarrega se necessário

### 6. OAuth token ≠ API key
- Token OAuth NÃO funciona com embedded agent (chamada direta à API)
- auth-profiles.json deve ter `mode: "oauth"` com profile `anthropic:claude-cli`
- NUNCA colocar token OAuth pra uso embedded

### 7. Token OAuth expira a cada ~8h
- Cron `0 */6 * * *` com `token-refresh.sh` faz refresh preventivo
- Watchdog detecta 401 nos logs e faz refresh emergencial
- Não preciso agir, mas ficar ciente se começar a dar 401

---

## Infraestrutura Atual

### Scripts de Proteção
- `~/.openclaw/scripts/gateway-watchdog.sh` — verifica LaunchAgent a cada 2min (cron)
- `~/.openclaw/scripts/token-refresh.sh` — refresh OAuth a cada 6h (cron)

### Config Importantes
- Gateway: LaunchAgent com ThrottleInterval=30s, KeepAlive=true
- Telegram: dmPolicy=open, groupPolicy=open, allowFrom=["*"]
- Grupo "Pessoal" (chat_id: -5193178027): requireMention=false
- Model padrão: claude-cli/sonnet-4.6
- Workspace: ~/.openclaw/workspace

### Plugins
- memory-lancedb-pro: embedder.ts editado pra Voyage AI (non-OpenAI provider detection)
- qmd: instalado em /usr/local/bin/qmd
- acpx: permissões corrigidas com chown

---

## ⚠️ Lições Operacionais

### Datas: SEMPRE verificar dia da semana
- NUNCA calcular dia da semana de cabeça — usar `date` ou `session_status` pra confirmar
- Antes de apresentar agenda, rodar: `date -d "2026-03-13" +%A` (ou equivalente macOS)
- Erro cometido em 11/Mar: chamei sexta-feira (13/03) de quinta-feira
- Regra: ao listar agenda, sempre incluir validação programática do dia da semana

---

## Histórico

### 11/Mar/2026 — Primeiro Dia
- Setup completo do OpenClaw com Telegram
- 6 incidentes graves, todos resolvidos
- ~20 restarts, 50 mensagens, 1 resposta entregue
- Resultado: sistema agora robusto com watchdog + token refresh automático
- Configurei grupo "Pessoal" pra responder sem menção
