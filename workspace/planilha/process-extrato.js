#!/usr/bin/env node
/**
 * process-extrato.js
 *
 * Uso:
 *   node process-extrato.js <caminho-pdf> <tipo-conta>
 *
 * Tipos de conta válidos:
 *   "Itaú CC"       → Itaú Conta Corrente
 *   "Itaú Cartão"   → Itaú Cartão de Crédito
 *   "BTG Cartão"    → BTG Cartão de Crédito
 *
 * Exemplo:
 *   node process-extrato.js ./extratos/itau_jan2026.pdf "Itaú CC"
 *
 * Requer GOOGLE_SHEETS_WEBHOOK configurado em config.json
 */

const path = require('path');
const fs = require('fs');
const { processarExtrato } = require('./parser');
const { categorizar } = require('./categorias');

// ── Config ──────────────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, 'config.json');

function carregarConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌  config.json não encontrado. Crie o arquivo com { "webhookUrl": "URL_DO_APPS_SCRIPT" }');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const [,, caminhoPDF, tipoConta] = process.argv;

  if (!caminhoPDF || !tipoConta) {
    console.log('Uso: node process-extrato.js <caminho-pdf> "<tipo-conta>"');
    console.log('Tipos: "Itaú CC" | "Itaú Cartão" | "BTG Cartão"');
    process.exit(1);
  }

  if (!fs.existsSync(caminhoPDF)) {
    console.error(`❌  Arquivo não encontrado: ${caminhoPDF}`);
    process.exit(1);
  }

  const config = carregarConfig();

  console.log(`\n📄  Processando: ${path.basename(caminhoPDF)}`);
  console.log(`🏦  Conta: ${tipoConta}\n`);

  // 1. Extrai transações do PDF
  const transacoes = await processarExtrato(caminhoPDF, tipoConta);
  console.log(`✅  ${transacoes.length} lançamentos extraídos do PDF`);

  // 2. Categoriza cada transação
  const transacoesCat = [];
  const semCategoria = [];

  for (const t of transacoes) {
    const resultado = categorizar(t.descricao, t.valor);
    if (resultado === null) continue; // ignorar (ex: SALDO DO DIA)

    transacoesCat.push({
      ...t,
      categoria: resultado.categoria,
      tipo: resultado.tipo,
      conta: tipoConta,
    });

    if (resultado.categoria === 'Outros' || resultado.categoria.startsWith('⚠')) {
      semCategoria.push(t.descricao);
    }
  }

  // 3. Mostra resumo por categoria
  const resumo = {};
  for (const t of transacoesCat) {
    if (!resumo[t.categoria]) resumo[t.categoria] = { count: 0, total: 0 };
    resumo[t.categoria].count++;
    resumo[t.categoria].total += t.valor;
  }

  console.log('\n📊  Resumo por categoria:');
  for (const [cat, dados] of Object.entries(resumo).sort((a, b) => a[0].localeCompare(b[0]))) {
    const sinal = dados.total >= 0 ? '+' : '';
    console.log(`   ${cat.padEnd(35)} ${sinal}R$ ${dados.total.toFixed(2).replace('.', ',').padStart(12)}  (${dados.count} lançamentos)`);
  }

  if (semCategoria.length > 0) {
    console.log('\n⚠️   Lançamentos sem categoria definida (revisar no Sheets):');
    [...new Set(semCategoria)].forEach(d => console.log(`   • ${d}`));
  }

  // 4. Envia para Google Sheets
  const meses = [...new Set(transacoesCat.map(t => t.mes))];
  console.log(`\n📤  Enviando para Google Sheets... (${meses.join(', ')})`);

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conta: tipoConta,
        meses,
        transacoes: transacoesCat,
      }),
    });

    const resultado = await response.json();

    if (resultado.error) {
      console.error('❌  Erro do Apps Script:', resultado.error);
      process.exit(1);
    }

    console.log(`✅  ${resultado.count} lançamentos enviados para a planilha`);
    console.log('\n🎉  Planilha atualizada com sucesso!\n');
  } catch (err) {
    console.error('❌  Erro ao enviar para o Sheets:', err.message);
    console.log('\nDados prontos para envio manual (JSON):');
    console.log(JSON.stringify({ conta: tipoConta, meses, transacoes: transacoesCat }, null, 2));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌  Erro inesperado:', err.message);
  process.exit(1);
});
