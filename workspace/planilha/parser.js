const pdfParse = require('pdf-parse');
const fs = require('fs');

// Converte "1.234,56" ou "-1.234,56" para número
function parseValor(str) {
  return parseFloat(str.replace(/\./g, '').replace(',', '.'));
}

// Formata data DD/MM/YYYY → YYYY-MM-DD (para ordenar no Sheets)
function formatData(str) {
  const [d, m, y] = str.split('/');
  return `${y}-${m}-${d}`;
}

// Extrai mês como YYYY-MM para agrupar no dashboard
function extrairMes(dataISO) {
  return dataISO.slice(0, 7);
}

async function parsePDF(caminhoArquivo) {
  const buffer = fs.readFileSync(caminhoArquivo);
  const result = await pdfParse(buffer);
  return result.text;
}

// ── Parser Itaú Conta Corrente ───────────────────────────────────────────────
// Formato esperado no texto extraído:
//   DD/MM/YYYY DESCRIÇÃO VALOR DD/MM/YYYY ... (tudo concatenado)
// Estratégia: split por marcadores de data, depois extrai valor do final
function parseItauCC(texto) {
  // Localiza o início dos lançamentos (depois do header da tabela)
  const marcador = 'saldo (R$)';
  const idx = texto.toLowerCase().indexOf(marcador);
  const conteudo = idx >= 0 ? texto.slice(idx + marcador.length) : texto;

  const transacoes = [];

  // Regex: captura DATE + DESCRIPTION + AMOUNT
  // Usa lookahead para parar na próxima data ou no fim
  const rx = /(\d{2}\/\d{2}\/\d{4})\s+([\s\S]+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2})(?=\s+\d{2}\/\d{2}\/\d{4}|\s*$)/g;

  let match;
  while ((match = rx.exec(conteudo)) !== null) {
    const [, data, descRaw, valorStr] = match;
    const descricao = descRaw.replace(/\s+/g, ' ').trim();

    // Ignora linhas de saldo e rendimentos mínimos irrelevantes
    if (/SALDO DO DIA/i.test(descricao)) continue;
    if (/REND PAGO APLIC AUT MAIS/i.test(descricao) && Math.abs(parseValor(valorStr)) < 10) continue;

    const valor = parseValor(valorStr);
    const dataISO = formatData(data);

    transacoes.push({
      data: dataISO,
      dataOriginal: data,
      descricao,
      valor,
      mes: extrairMes(dataISO),
    });
  }

  return transacoes;
}

// ── Mapa de parsers por tipo de conta ────────────────────────────────────────
const PARSERS = {
  'Itaú CC': parseItauCC,
  // Adicionar quando chegar os PDFs:
  // 'Itaú Cartão': parseItauCartao,
  // 'BTG Cartão':  parseBTGCartao,
};

async function processarExtrato(caminhoPDF, tipoConta) {
  const parser = PARSERS[tipoConta];
  if (!parser) {
    throw new Error(`Tipo de conta desconhecido: "${tipoConta}". Disponíveis: ${Object.keys(PARSERS).join(', ')}`);
  }
  const texto = await parsePDF(caminhoPDF);
  return parser(texto);
}

module.exports = { processarExtrato, parseValor, formatData };
