# Guia Operacional OpenClaw + Manuel

*Criado em 11/Mar/2026 — Primeiro dia de operação*

---

## 1. O QUE FIZEMOS HOJE (Resumo)

### Instalação e Setup Inicial
1. Instalamos o **OpenClaw** via npm (`npm install -g openclaw`)
2. Criamos o bot do Telegram via **@BotFather** no Telegram
3. Configuramos o gateway com o token do bot em `~/.openclaw/openclaw.json`
4. Registramos o gateway como **LaunchAgent** (serviço do macOS que roda em background)
5. Instalamos o **Claude CLI** (`claude`) para ser o "cérebro" do Manuel

### Workspace e Identidade
6. Criamos os arquivos de identidade no workspace (`~/.openclaw/workspace/`):
   - `IDENTITY.md` — Nome, personalidade, propósito do Manuel
   - `USER.md` — Informações sobre o Renato
   - `SOUL.md` — Diretrizes de comportamento
   - `AGENTS.md` — Regras operacionais
   - `TOOLS.md` — Configurações de ferramentas (TTS, etc.)
   - `MEMORY.md` — Memória de longo prazo
   - `HEARTBEAT.md` — Tarefas periódicas

### Integrações
7. Instalamos **gog** (Google CLI) via Homebrew para acessar Gmail e Calendar
8. Autorizamos a conta `renato.breia@nordresearch.com.br`
9. Configuramos **Whisper** para transcrição de áudio
10. Configuramos **Edge TTS** (voz pt-BR-AntonioNeural) para respostas em áudio

### Grupos do Telegram
11. Adicionamos o bot aos grupos "Pessoal" e "NORD"
12. Configuramos `requireMention: false` para responder sem ser mencionado

### Proteções
13. Criamos scripts de watchdog e token refresh (cron automático)
14. Documentamos 8 incidentes e suas soluções

---

## 2. COMO INICIAR O OPENCLAW AMANHÃ

### Cenário A: Reiniciou o Mac (mais comum)

O OpenClaw **inicia automaticamente** com o Mac! O LaunchAgent está configurado com `RunAtLoad: true` e `KeepAlive: true`. Então:

1. **Ligue o Mac** — o OpenClaw já sobe sozinho
2. **Abra o Telegram** — mande uma mensagem pro Manuel pra confirmar que tá funcionando
3. **Pronto!** Não precisa fazer mais nada

### Cenário B: Quer verificar se está rodando

Abra o **Terminal** e digite:
```bash
openclaw gateway status
```

Se aparecer `Runtime: running` → tá tudo certo.

Se aparecer que não está rodando:
```bash
openclaw gateway start
```

### Cenário C: Precisa reiniciar

```bash
openclaw gateway restart
```

Depois confira:
```bash
openclaw gateway status
```

### Cenário D: Quer ver os logs (debug)

```bash
# Logs do dia
cat /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log | tail -50

# Logs em tempo real
tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log
```

### ⚠️ NÃO PRECISA ABRIR:
- **Claude Code** — não precisa. O OpenClaw chama o Claude CLI internamente
- **Terminal** — só se quiser verificar status ou debug
- O **Telegram** é a única coisa que você precisa abrir pra falar comigo

---

## 3. COMANDOS PRINCIPAIS

### Status e Saúde
```bash
# Ver se o gateway tá rodando
openclaw gateway status

# Status completo (todos os subsistemas)
openclaw status

# Ver logs do dia
tail -50 /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log
```

### Iniciar / Parar / Reiniciar
```bash
openclaw gateway start     # Iniciar
openclaw gateway stop      # Parar
openclaw gateway restart   # Reiniciar
```

### Configuração
O arquivo de config fica em:
```
~/.openclaw/openclaw.json
```

Para editar, use qualquer editor:
```bash
nano ~/.openclaw/openclaw.json
# ou
code ~/.openclaw/openclaw.json
```

**⚠️ CUIDADO:** Qualquer mudança no arquivo dispara hot-reload do gateway. Faça edições rápidas e verifique o status depois.

---

## 4. COMO ADICIONAR O MANUEL A NOVOS GRUPOS

### Passo 1: Adicionar o Bot ao Grupo
1. Abra o grupo no Telegram
2. Toque no nome do grupo (configurações)
3. "Adicionar membro" → busque pelo bot: `@ClawdBotManuel` (ou o username do seu bot)
4. Adicione

### Passo 2: Dar Admin ao Bot (IMPORTANTE)
1. No grupo, toque no nome do bot
2. "Promover a Admin"
3. Dê pelo menos estas permissões:
   - ✅ Enviar mensagens
   - ✅ Ler mensagens
   - O resto pode deixar desativado

### Passo 3: Descobrir o chat_id do Grupo
Mande uma mensagem no grupo e peça pro Manuel:
> "Manuel, qual o chat_id desse grupo?"

Ou veja nos logs:
```bash
grep "chat_id" /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log | tail -5
```

### Passo 4: Configurar no openclaw.json
Edite `~/.openclaw/openclaw.json` e adicione o grupo:

```json
{
  "channels": {
    "telegram": {
      "groups": {
        "-NUMERO_DO_CHAT_ID": {
          "requireMention": false
        }
      }
    }
  }
}
```

- `requireMention: false` → Manuel responde sem precisar marcar @
- `requireMention: true` → Manuel só responde quando marcado com @

### Passo 5: Verificar
```bash
openclaw gateway status
```

O gateway faz hot-reload automático quando detecta mudança no config.

---

## 5. CONVERSAR COM O MANUEL

### No Chat Direto (DM)
Só mandar mensagem pro bot no Telegram. Ele responde tudo.

### Em Grupos (com requireMention: false)
Ele lê todas as mensagens e decide quando participar. Não precisa marcar @.

### Em Grupos (com requireMention: true)
Marque o bot: `@ClawdBotManuel sua pergunta aqui`

### Comandos Úteis (via mensagem)
- "Quais meus compromissos amanhã?" → Consulta o Google Calendar
- "Li meus emails?" → Consulta o Gmail
- "Mande um áudio para [pessoa]" → Gera áudio com TTS

---

## 6. ARQUIVOS IMPORTANTES

| Arquivo | Localização | O que faz |
|---------|------------|-----------|
| Config principal | `~/.openclaw/openclaw.json` | Toda configuração do gateway |
| LaunchAgent | `~/Library/LaunchAgents/ai.openclaw.gateway.plist` | Serviço que roda em background |
| Workspace | `~/.openclaw/workspace/` | Arquivos do Manuel (memória, identidade, etc.) |
| Logs | `/tmp/openclaw/openclaw-YYYY-MM-DD.log` | Logs diários |
| Watchdog | `~/.openclaw/scripts/gateway-watchdog.sh` | Verifica saúde a cada 2min |
| Token Refresh | `~/.openclaw/scripts/token-refresh.sh` | Renova OAuth a cada 6h |
| Incidentes | Workspace do Claude Code | Registro dos 8 incidentes do dia 1 |
| Credenciais gog | `~/Library/Application Support/gogcli/` | Tokens do Google |

---

## 7. TROUBLESHOOTING RÁPIDO

### Manuel não responde no Telegram
1. `openclaw gateway status` — tá rodando?
2. Se não: `openclaw gateway start`
3. Se sim mas não responde: `openclaw gateway restart`

### Erro 401 (autenticação)
1. No Terminal: `claude auth login`
2. Faça o login no navegador
3. `openclaw gateway restart`

### Grupo não recebe resposta
1. Verifique se o bot é admin do grupo
2. Verifique se o chat_id está no config
3. Grupos migram de ID — verifique nos logs o ID atualizado

### Áudio/TTS não funciona
1. Verifique no config: `messages.tts.auto` deve ser `"always"` ou `"tagged"`
2. `openclaw gateway restart` se mudou config

---

## 8. CRONS AUTOMÁTICOS (já configurados)

```
*/2 * * * *  gateway-watchdog.sh    # Verifica se gateway tá vivo
0 */6 * * *  token-refresh.sh       # Renova token OAuth
17 */3 * * * backup.sh              # Backup dos configs
```

Esses rodam sozinhos. Não precisa fazer nada.

---

*Este guia foi gerado pelo Manuel no primeiro dia de operação. Atualize conforme necessário.*
