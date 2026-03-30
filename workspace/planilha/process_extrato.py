#!/usr/bin/env python3
"""
process_extrato.py — Pipeline completo: PDF → categorização → Google Sheets

Uso:
  python3 process_extrato.py <caminho_pdf> <tipo_conta>

Tipos:
  "Itaú CC"       → Itaú Conta Corrente
  "Itaú Cartão"   → Itaú Cartão de Crédito
  "BTG Cartão"    → BTG Cartão de Crédito

Requer config.json com { "webhookUrl": "URL_DO_APPS_SCRIPT" }
"""

import sys
import json
import re
import urllib.request
import urllib.error
from pathlib import Path
from collections import defaultdict

import pdfplumber


# ── Constantes ────────────────────────────────────────────────────────────────

CONFIG_PATH = Path(__file__).parent / 'config.json'

RE_DATA  = re.compile(r'^\d{2}/\d{2}/\d{4}$')
RE_VALOR = re.compile(r'^-?\d{1,3}(?:\.\d{3})*,\d{2}$')

IGNORAR = re.compile(
    r'(SALDO DO DIA|REND PAGO APLIC AUT MAIS|^data$|^lançamentos$)',
    re.IGNORECASE,
)

# Regras de categorização — primeira que bater é usada
REGRAS = [
    # Entradas
    (r'PAGTO SALARIO',                'Salário',              'entrada'),
    (r'PAGTO EM CONTA CORREN',        'Dividendos Nord',      'entrada'),
    (r'VENCIMENTO (LCA|LCI|CDB)',     'Rendimentos',          'entrada'),
    (r'(RESGATE|DI RESGATE) CDB',     'Resgate CDB',          'entrada'),
    (r'TBI.*Nord',                    'Dividendos Nord',      'entrada'),
    (r'PAGTO BONUS',                  'Bônus Nord',           'entrada'),
    (r'TED.*RENATO L V',              'Transferência Própria','entrada'),
    (r'AFL MED',                      'Reembolso',            'entrada'),
    (r'SISPAG G4 EDUCACAO',           'Reembolso',            'entrada'),
    (r'PIX TRANSF PRIME F',           'Reembolso',            'entrada'),
    (r'PIX TRANSF GABRIEL',           'Transferência Gabriel','entrada'),  # confirmar
    (r'PIX TRANSF GUILHER.*\+',       'Transferência Própria','entrada'),

    # Saídas: Transferências próprias
    (r'PIX TRANSF RENATO',            'Transferência Própria','saída'),
    (r'TED.*RENATO',                  'Transferência Própria','saída'),

    # Saídas: Investimentos
    (r'APLICACAO CDB',                'Aplicação CDB',        'saída'),
    (r'LCA APLICACAO',                'Aplicação LCA',        'saída'),
    (r'MERCADO BIT',                  'Cripto',               'saída'),

    # Saídas: Obra / Reforma
    (r'CALACAT',                      'Obra/Reforma',         'saída'),
    (r'PAG.*898033777000',            'Obra/Reforma',         'saída'),

    # Saídas: Cartão de crédito (faturas)
    (r'PERS BLACK',                   'Fatura Cartão Itaú',   'saída'),
    (r'INT AZUL VISA',                'Fatura Cartão Azul',   'saída'),
    (r'INT PAG TIT',                  'Fatura Cartão',        'saída'),
    (r'PAG TIT INT',                  'Fatura Cartão',        'saída'),

    # Saídas: Contas fixas
    (r'DA VIVO',                      'Telecomunicações',     'saída'),
    (r'DA CLARO',                     'Telecomunicações',     'saída'),
    (r'PAINEIRAS',                    'Clube Paineiras',      'saída'),
    (r'ESPORTE CLU',                  'Clube ECP',            'saída'),
    (r'YELUM SEGUROS',                'Seguro',               'saída'),
    (r'XP VIDA E PREVID',             'Previdência',          'saída'),
    (r'IPVA|Licenciamento de Ve',     'IPVA/Licenciamento',   'saída'),

    # Saídas: Transferências fixas (confirmar com Renato)
    (r'PIX TRANSF FERNAND',           'Aluguel',              'saída'),
    (r'PIX TRANSF DMW',               'Contabilidade',        'saída'),
    (r'PIX.*LR - PR',                 '⚠ LR-PR',              'saída'),
    (r'PIX TRANSF GLAUCIA',           'Serviços Domésticos',  'saída'),

    # Saídas: Clínica esposa
    (r'BR PACK',                      'Clínica Esposa',       'saída'),
    (r'VILE EMBALAGENS',              'Clínica Esposa',       'saída'),
    (r'FOGOES SHOP',                  'Clínica Esposa',       'saída'),
    (r'CADPREST',                     'Clínica Esposa',       'saída'),
    (r'CSP COPIAS',                   'Clínica Esposa',       'saída'),
    (r'EQUATORIAL',                   'Clínica Esposa',       'saída'),

    # Saídas: Alimentação
    (r'HORTUS',                       'Alimentação',          'saída'),
    (r'SHOPPER',                      'Alimentação',          'saída'),

    # Saídas: Saúde
    (r'FARMACI',                      'Saúde/Farmácia',       'saída'),
    (r'MSF CAF',                      'Saúde',                'saída'),
    (r'RIOS PHARMA',                  'Saúde/Farmácia',       'saída'),

    # Saídas: Transporte
    (r'POSTO DE SE',                  'Combustível',          'saída'),
    (r'PIX TRANSF AILTON',            'Transporte/Táxi',      'saída'),

    # Saídas: Viagens
    (r'AZUL LINHAS',                  'Viagens/Passagens',    'saída'),
    (r'LUSOVIN',                      'Vinho',                'saída'),

    # Saídas: Lazer
    (r'1900 JARDIN',                  'Restaurante',          'saída'),
    (r'WINE BR',                      'Vinho',                'saída'),
    (r'VINDI PAGAM',                  'Streaming/Assinatura', 'saída'),

    # Saídas: Saúde / Bem-estar
    (r'LUCAS REZEN',                  'Personal Trainer',     'saída'),

    # Saídas: Educação
    (r'G4 EDUCACAO',                  'Educação',             'saída'),
    (r'LR - PR',                      'Educação',             'saída'),
    (r'NOVO AM',                      'Educação',             'saída'),
    (r'FACAPE',                       'Educação',             'saída'),
    (r'YARA TE',                      'Educação',             'saída'),
    (r'PORTELL',                      'Educação',             'saída'),

    # Impostos
    (r'^IOF$',                        'IOF',                  'saída'),
]

# Pre-compila as regras
REGRAS_COMPILADAS = [
    (re.compile(pat, re.IGNORECASE), cat, tipo)
    for pat, cat, tipo in REGRAS
]


# ── Parser ────────────────────────────────────────────────────────────────────

def parse_valor(s: str) -> float:
    return float(s.replace('.', '').replace(',', '.'))


def format_data(s: str) -> str:
    d, m, y = s.split('/')
    return f"{y}-{m}-{d}"


def extrair_transacoes(caminho_pdf: str) -> list[dict]:
    transacoes = []

    with pdfplumber.open(caminho_pdf) as pdf:
        for page in pdf.pages:
            words = page.extract_words(x_tolerance=4, y_tolerance=3)

            # Agrupa por linha (y)
            linhas: dict = defaultdict(list)
            for w in words:
                y_key = round(w['top'] / 6) * 6
                linhas[y_key].append(w)

            for y in sorted(linhas.keys()):
                ws = sorted(linhas[y], key=lambda w: w['x0'])
                tokens = [w['text'] for w in ws]

                if not tokens or not RE_DATA.match(tokens[0]):
                    continue

                if len(tokens) < 2:
                    continue

                ultimo = tokens[-1]
                if not RE_VALOR.match(ultimo):
                    continue

                descricao = ' '.join(tokens[1:-1])
                valor = parse_valor(ultimo)

                if IGNORAR.search(descricao):
                    continue

                # Ignora micro-rendimentos (< R$1)
                if abs(valor) < 1.0:
                    continue

                transacoes.append({
                    'data': format_data(tokens[0]),
                    'dataOriginal': tokens[0],
                    'descricao': descricao,
                    'valor': valor,
                    'mes': format_data(tokens[0])[:7],
                })

    return transacoes


# ── Categorização ─────────────────────────────────────────────────────────────

def categorizar(descricao: str, valor: float) -> tuple[str, str]:
    for pat, cat, tipo in REGRAS_COMPILADAS:
        if pat.search(descricao):
            # Diferencia dividendo semestral (> R$500k) do mensal
            if cat == 'Dividendos Nord' and valor > 500_000:
                return 'Dividendo Semestral Nord', 'entrada'
            return cat, tipo
    # Sem regra: infere pelo sinal
    return 'Outros', 'entrada' if valor > 0 else 'saída'


# ── Google Sheets ─────────────────────────────────────────────────────────────

def enviar_sheets(webhook_url: str, conta: str, transacoes: list[dict]) -> dict:
    meses = list({t['mes'] for t in transacoes})
    payload = json.dumps({
        'conta': conta,
        'meses': meses,
        'transacoes': transacoes,
    }).encode('utf-8')

    req = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 3:
        print('Uso: python3 process_extrato.py <caminho_pdf> "<tipo_conta>"', file=sys.stderr)
        sys.exit(1)

    caminho_pdf = sys.argv[1]
    tipo_conta  = sys.argv[2]

    if not Path(caminho_pdf).exists():
        print(f'❌  Arquivo não encontrado: {caminho_pdf}', file=sys.stderr)
        sys.exit(1)

    if not CONFIG_PATH.exists():
        print(f'❌  config.json não encontrado em {CONFIG_PATH}', file=sys.stderr)
        sys.exit(1)

    config = json.loads(CONFIG_PATH.read_text())
    webhook_url = config.get('webhookUrl', '')

    print(f'\n📄  Processando: {Path(caminho_pdf).name}')
    print(f'🏦  Conta: {tipo_conta}\n')

    # 1. Extrai transações
    transacoes_raw = extrair_transacoes(caminho_pdf)
    print(f'✅  {len(transacoes_raw)} lançamentos extraídos do PDF')

    # 2. Categoriza
    transacoes = []
    sem_cat = []

    for t in transacoes_raw:
        cat, tipo = categorizar(t['descricao'], t['valor'])
        transacoes.append({**t, 'categoria': cat, 'tipo': tipo, 'conta': tipo_conta})
        if cat in ('Outros',) or cat.startswith('⚠'):
            sem_cat.append(t['descricao'])

    # 3. Resumo por categoria
    resumo: dict = defaultdict(lambda: {'count': 0, 'total': 0.0})
    for t in transacoes:
        resumo[t['categoria']]['count'] += 1
        resumo[t['categoria']]['total'] += t['valor']

    print('\n📊  Resumo por categoria:')
    for cat in sorted(resumo.keys()):
        r = resumo[cat]
        sinal = '+' if r['total'] >= 0 else ''
        print(f"   {cat:<40} {sinal}R$ {r['total']:>12,.2f}  ({r['count']} lançamentos)")

    if sem_cat:
        unique = list(dict.fromkeys(sem_cat))
        print('\n⚠️   Sem categoria definida (revisar no Sheets):')
        for d in unique:
            print(f'   • {d}')

    # 4. Envia para Google Sheets
    if not webhook_url or webhook_url == 'COLE_AQUI_A_URL_DO_APPS_SCRIPT':
        print('\n⚠️   webhookUrl não configurado em config.json.')
        print('Configure a URL do Apps Script e rode novamente.\n')
        # Mostra JSON para copiar manualmente
        print('\nDados para importação manual:')
        print(json.dumps(transacoes, ensure_ascii=False, indent=2))
        return

    meses = list({t['mes'] for t in transacoes})
    print(f'\n📤  Enviando para Google Sheets... (meses: {", ".join(sorted(meses))})')

    try:
        resultado = enviar_sheets(webhook_url, tipo_conta, transacoes)
        if 'error' in resultado:
            print(f'❌  Erro do Apps Script: {resultado["error"]}')
            sys.exit(1)
        print(f'✅  {resultado.get("count", len(transacoes))} lançamentos enviados')
        print('\n🎉  Planilha atualizada com sucesso!\n')
    except Exception as e:
        print(f'❌  Erro ao enviar: {e}')
        sys.exit(1)


if __name__ == '__main__':
    main()
