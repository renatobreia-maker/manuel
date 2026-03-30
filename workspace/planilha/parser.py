#!/usr/bin/env python3
"""
parser.py — Extrai transações de extratos bancários em PDF
Uso: python3 parser.py <caminho_pdf> <tipo_conta>
Tipos: "Itaú CC" | "Itaú Cartão" | "BTG Cartão"

Retorna JSON array de transações para o stdout.
"""

import sys
import json
import re
import pdfplumber


def parse_valor(s: str) -> float:
    """Converte '1.234,56' ou '-1.234,56' para float."""
    return float(s.replace('.', '').replace(',', '.'))


def format_data(s: str) -> str:
    """Converte 'DD/MM/YYYY' para 'YYYY-MM-DD'."""
    d, m, y = s.split('/')
    return f"{y}-{m}-{d}"


RE_DATA = re.compile(r'^\d{2}/\d{2}/\d{4}$')
RE_VALOR = re.compile(r'^-?\d{1,3}(?:\.\d{3})*,\d{2}$')

# Descrições a ignorar (não são transações)
IGNORAR = re.compile(
    r'(SALDO DO DIA|REND PAGO APLIC AUT MAIS|^data$|^lançamentos$|saldo \(R\$\)|valor \(R\$\))',
    re.IGNORECASE
)


def extrair_linhas(caminho_pdf: str) -> list[dict]:
    """
    Usa pdfplumber com word-level extraction para reconstruir linhas.
    Retorna lista de {'data', 'descricao', 'valor'}.
    """
    transacoes = []

    with pdfplumber.open(caminho_pdf) as pdf:
        for page in pdf.pages:
            words = page.extract_words(x_tolerance=4, y_tolerance=3)

            # Agrupa palavras por posição y (±5px = mesma linha)
            linhas: dict[int, list] = {}
            for w in words:
                y_key = round(w['top'] / 6) * 6
                linhas.setdefault(y_key, []).append(w)

            for y in sorted(linhas.keys()):
                ws = sorted(linhas[y], key=lambda w: w['x0'])
                tokens = [w['text'] for w in ws]

                if not tokens:
                    continue

                # Linha começa com data?
                if not RE_DATA.match(tokens[0]):
                    continue

                data_str = tokens[0]
                resto = tokens[1:]

                if not resto:
                    continue

                # Último token é um valor?
                ultimo = resto[-1]
                if not RE_VALOR.match(ultimo):
                    continue

                descricao = ' '.join(resto[:-1])
                valor_str = ultimo

                # Ignora linhas que não são transações reais
                if IGNORAR.search(descricao):
                    continue

                # Ignora rendimentos automáticos < R$10 (irrelevante)
                valor = parse_valor(valor_str)
                if abs(valor) < 1.0:
                    continue

                transacoes.append({
                    'data': format_data(data_str),
                    'dataOriginal': data_str,
                    'descricao': descricao,
                    'valor': valor,
                    'mes': format_data(data_str)[:7],
                })

    return transacoes


def parse_itau_cc(caminho_pdf: str) -> list[dict]:
    return extrair_linhas(caminho_pdf)


PARSERS = {
    'Itaú CC': parse_itau_cc,
    # Adicionar quando chegar os PDFs:
    # 'Itaú Cartão': parse_itau_cartao,
    # 'BTG Cartão':  parse_btg_cartao,
}


def main():
    if len(sys.argv) < 3:
        print('Uso: python3 parser.py <caminho_pdf> "<tipo_conta>"', file=sys.stderr)
        sys.exit(1)

    caminho_pdf = sys.argv[1]
    tipo_conta = sys.argv[2]

    if tipo_conta not in PARSERS:
        print(f'Tipo de conta desconhecido: "{tipo_conta}". Disponíveis: {list(PARSERS.keys())}', file=sys.stderr)
        sys.exit(1)

    transacoes = PARSERS[tipo_conta](caminho_pdf)
    print(json.dumps(transacoes, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
