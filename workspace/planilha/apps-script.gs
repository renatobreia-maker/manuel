/**
 * MANUEL - Planilha de Gastos Pessoais
 * Google Apps Script
 *
 * SETUP:
 * 1. Abra a planilha no Google Sheets
 * 2. Clique em Extensões → Apps Script
 * 3. Cole este código substituindo o conteúdo do editor
 * 4. Clique em Implantar → Nova implantação
 * 5. Tipo: "Aplicativo web"
 * 6. Executar como: "Eu (seu email)"
 * 7. Quem tem acesso: "Qualquer pessoa" (necessário para o webhook funcionar)
 * 8. Clique em Implantar e copie a URL gerada
 * 9. Cole a URL no arquivo config.json: { "webhookUrl": "URL_AQUI" }
 */

// ── Configurações ─────────────────────────────────────────────────────────────

const CONTAS = ['Itaú CC', 'Itaú Cartão', 'BTG Cartão'];
const NOME_DASHBOARD = 'Dashboard';

const COLUNAS = ['Data', 'Descrição', 'Valor (R$)', 'Tipo', 'Categoria', 'Mês', 'Conta'];

// Cores por tipo
const COR_ENTRADA = '#d9ead3'; // verde claro
const COR_SAIDA   = '#fce5cd'; // laranja claro
const COR_HEADER  = '#434343'; // cinza escuro
const COR_HEADER_TEXTO = '#ffffff';

// ── Endpoint principal ────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { conta, meses, transacoes } = payload;

    if (!conta || !transacoes || !Array.isArray(transacoes)) {
      return jsonResponse({ error: 'Payload inválido: conta e transacoes são obrigatórios' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Garante que a aba da conta existe
    let sheet = ss.getSheetByName(conta);
    if (!sheet) {
      sheet = criarAba(ss, conta);
    }

    // Remove lançamentos dos meses que estão sendo reimportados
    if (meses && meses.length > 0) {
      removerMeses(sheet, meses);
    }

    // Insere as novas transações
    const linhas = transacoes.map(t => [
      t.data,         // A: Data ISO
      t.descricao,    // B: Descrição
      t.valor,        // C: Valor
      t.tipo,         // D: Tipo
      t.categoria,    // E: Categoria
      t.mes,          // F: Mês
      conta,          // G: Conta
    ]);

    if (linhas.length > 0) {
      const ultimaLinha = sheet.getLastRow();
      const range = sheet.getRange(ultimaLinha + 1, 1, linhas.length, COLUNAS.length);
      range.setValues(linhas);

      // Formata cores por tipo
      for (let i = 0; i < linhas.length; i++) {
        const tipo = linhas[i][3]; // coluna D
        const cor = tipo === 'entrada' ? COR_ENTRADA : COR_SAIDA;
        sheet.getRange(ultimaLinha + 1 + i, 1, 1, COLUNAS.length).setBackground(cor);
      }
    }

    // Atualiza o Dashboard
    atualizarDashboard(ss);

    return jsonResponse({ success: true, count: linhas.length });

  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function criarAba(ss, nome) {
  const sheet = ss.insertSheet(nome);

  // Header
  const header = sheet.getRange(1, 1, 1, COLUNAS.length);
  header.setValues([COLUNAS]);
  header.setFontWeight('bold');
  header.setBackground(COR_HEADER);
  header.setFontColor(COR_HEADER_TEXTO);

  // Larguras
  sheet.setColumnWidth(1, 110); // Data
  sheet.setColumnWidth(2, 300); // Descrição
  sheet.setColumnWidth(3, 110); // Valor
  sheet.setColumnWidth(4, 80);  // Tipo
  sheet.setColumnWidth(5, 200); // Categoria
  sheet.setColumnWidth(6, 80);  // Mês
  sheet.setColumnWidth(7, 120); // Conta

  // Congela header
  sheet.setFrozenRows(1);

  return sheet;
}

function removerMeses(sheet, meses) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const dados = sheet.getRange(2, 1, lastRow - 1, COLUNAS.length).getValues();

  // Percorre de baixo pra cima para não deslocar índices
  for (let i = dados.length - 1; i >= 0; i--) {
    const mesCelula = dados[i][5]; // coluna F = Mês
    if (meses.includes(mesCelula)) {
      sheet.deleteRow(i + 2); // +2: linha 1 é header, array é 0-indexed
    }
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function atualizarDashboard(ss) {
  let dash = ss.getSheetByName(NOME_DASHBOARD);
  if (!dash) {
    dash = ss.insertSheet(NOME_DASHBOARD, 0); // Primeira aba
  }
  dash.clearContents();
  dash.clearFormats();

  // Coleta todos os dados de todas as abas
  let todasTransacoes = [];
  for (const nomeConta of CONTAS) {
    const sheet = ss.getSheetByName(nomeConta);
    if (!sheet || sheet.getLastRow() <= 1) continue;
    const dados = sheet.getRange(2, 1, sheet.getLastRow() - 1, COLUNAS.length).getValues();
    todasTransacoes = todasTransacoes.concat(dados);
  }

  if (todasTransacoes.length === 0) {
    dash.getRange(1, 1).setValue('Nenhum dado importado ainda.');
    return;
  }

  // Extrai meses e categorias únicas
  const mesesSet = new Set();
  const categoriasSet = new Set();

  for (const t of todasTransacoes) {
    if (t[5]) mesesSet.add(t[5]);   // col F = Mês
    if (t[4]) categoriasSet.add(t[4]); // col E = Categoria
  }

  const meses = [...mesesSet].sort();
  const categorias = [...categoriasSet].sort();

  // ── Tabela de SAÍDAS por categoria × mês ─────────────────────────────────

  let linha = 1;

  // Título
  dash.getRange(linha, 1).setValue('SAÍDAS POR CATEGORIA');
  dash.getRange(linha, 1).setFontWeight('bold').setFontSize(12);
  linha++;

  // Header: Categoria | Mês1 | Mês2 | ... | Total
  const headerRow = ['Categoria', ...meses, 'Total'];
  dash.getRange(linha, 1, 1, headerRow.length).setValues([headerRow]);
  dash.getRange(linha, 1, 1, headerRow.length)
    .setFontWeight('bold')
    .setBackground(COR_HEADER)
    .setFontColor(COR_HEADER_TEXTO);
  linha++;

  // Mapa de saídas: categoria → mês → total
  const saidasMap = {};
  for (const t of todasTransacoes) {
    const tipo = t[3]; // col D
    if (tipo !== 'saída') continue;
    const cat = t[4];
    const mes = t[5];
    const val = t[2];
    if (!saidasMap[cat]) saidasMap[cat] = {};
    if (!saidasMap[cat][mes]) saidasMap[cat][mes] = 0;
    saidasMap[cat][mes] += Math.abs(val);
  }

  // Linhas de categorias
  for (const cat of categorias) {
    if (!saidasMap[cat]) continue;
    const row = [cat];
    let totalCat = 0;
    for (const mes of meses) {
      const val = saidasMap[cat]?.[mes] || 0;
      row.push(val > 0 ? val : '');
      totalCat += val;
    }
    row.push(totalCat > 0 ? totalCat : '');
    dash.getRange(linha, 1, 1, row.length).setValues([row]);
    linha++;
  }

  // Linha de TOTAL SAÍDAS
  const totalSaidasRow = ['TOTAL SAÍDAS'];
  let grandTotalSaidas = 0;
  for (const mes of meses) {
    let totalMes = 0;
    for (const cat of categorias) {
      totalMes += saidasMap[cat]?.[mes] || 0;
    }
    totalSaidasRow.push(totalMes > 0 ? totalMes : '');
    grandTotalSaidas += totalMes;
  }
  totalSaidasRow.push(grandTotalSaidas);
  dash.getRange(linha, 1, 1, totalSaidasRow.length)
    .setValues([totalSaidasRow])
    .setFontWeight('bold')
    .setBackground('#f4cccc');
  linha += 2;

  // ── Tabela de ENTRADAS ────────────────────────────────────────────────────

  dash.getRange(linha, 1).setValue('ENTRADAS');
  dash.getRange(linha, 1).setFontWeight('bold').setFontSize(12);
  linha++;

  const headerEntradas = ['Categoria', ...meses, 'Total'];
  dash.getRange(linha, 1, 1, headerEntradas.length).setValues([headerEntradas]);
  dash.getRange(linha, 1, 1, headerEntradas.length)
    .setFontWeight('bold')
    .setBackground(COR_HEADER)
    .setFontColor(COR_HEADER_TEXTO);
  linha++;

  const entradasMap = {};
  for (const t of todasTransacoes) {
    if (t[3] !== 'entrada') continue;
    const cat = t[4];
    const mes = t[5];
    const val = t[2];
    if (!entradasMap[cat]) entradasMap[cat] = {};
    if (!entradasMap[cat][mes]) entradasMap[cat][mes] = 0;
    entradasMap[cat][mes] += val;
  }

  for (const cat of categorias) {
    if (!entradasMap[cat]) continue;
    const row = [cat];
    let totalCat = 0;
    for (const mes of meses) {
      const val = entradasMap[cat]?.[mes] || 0;
      row.push(val > 0 ? val : '');
      totalCat += val;
    }
    row.push(totalCat > 0 ? totalCat : '');
    dash.getRange(linha, 1, 1, row.length).setValues([row]);
    linha++;
  }

  // Total entradas
  const totalEntradasRow = ['TOTAL ENTRADAS'];
  let grandTotalEntradas = 0;
  for (const mes of meses) {
    let totalMes = 0;
    for (const cat of categorias) {
      totalMes += entradasMap[cat]?.[mes] || 0;
    }
    totalEntradasRow.push(totalMes > 0 ? totalMes : '');
    grandTotalEntradas += totalMes;
  }
  totalEntradasRow.push(grandTotalEntradas);
  dash.getRange(linha, 1, 1, totalEntradasRow.length)
    .setValues([totalEntradasRow])
    .setFontWeight('bold')
    .setBackground(COR_ENTRADA);
  linha += 2;

  // ── Saldo líquido por mês ─────────────────────────────────────────────────

  dash.getRange(linha, 1).setValue('SALDO LÍQUIDO (Entradas - Saídas)');
  dash.getRange(linha, 1).setFontWeight('bold').setFontSize(12);
  linha++;

  const saldoRow = ['Saldo'];
  for (const mes of meses) {
    let entradas = 0, saidas = 0;
    for (const cat of categorias) {
      entradas += entradasMap[cat]?.[mes] || 0;
      saidas   += saidasMap[cat]?.[mes]   || 0;
    }
    saldoRow.push(entradas - saidas);
  }
  saldoRow.push(grandTotalEntradas - grandTotalSaidas);
  dash.getRange(linha, 1, 1, saldoRow.length)
    .setValues([saldoRow])
    .setFontWeight('bold');

  // Formata valores como moeda
  const numColunas = meses.length + 2;
  dash.getRange(1, 1, linha, numColunas)
    .setFontFamily('Arial')
    .setFontSize(10);

  // Formata colunas de valor como R$
  // (colunas 2 até numColunas)
  dash.getRange(2, 2, linha, numColunas - 1)
    .setNumberFormat('R$ #,##0.00');

  // Ajusta larguras
  dash.setColumnWidth(1, 250);
  for (let c = 2; c <= numColunas; c++) {
    dash.setColumnWidth(c, 120);
  }

  dash.setFrozenRows(0);
  dash.setFrozenColumns(1);
}

// ── Utilidade ─────────────────────────────────────────────────────────────────

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Trigger manual para teste ─────────────────────────────────────────────────
// Rode esta função no editor do Apps Script para recriar o Dashboard manualmente

function reconstruirDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  atualizarDashboard(ss);
  SpreadsheetApp.getUi().alert('Dashboard reconstruído com sucesso!');
}
