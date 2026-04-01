// ============================================================
// ATUALIZA PU LTN 2032 - Google Apps Script
// Cole em: Extensões > Apps Script (dentro da planilha)
// Fonte: Tesouro Transparente (dados abertos, sem Cloudflare)
// ============================================================

const SHEET_GID = 67962559;   // aba "Carteira Ações"
const CELL_PU   = "F20";      // célula do Preço (ut) LTN 2032

// URL pública do CSV - atualizada diariamente com preços da manhã
const CSV_URL = "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";

// ---- Função fórmula: use =getLTN2032PU() na célula F20 ----
function getLTN2032PU() {
  return buscarPU();
}

// ---- Função trigger: atualiza a célula automaticamente ----
function atualizaPULtn2032() {
  const pu = buscarPU();
  if (!pu) { console.warn("PU não encontrado."); return; }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const sheet = sheets.find(s => s.getSheetId() === SHEET_GID);

  if (!sheet) { console.error("Aba gid " + SHEET_GID + " não encontrada."); return; }

  sheet.getRange(CELL_PU).setValue(pu);
  console.log("PU LTN 2032 atualizado: " + pu + " em " + new Date().toLocaleString("pt-BR"));
}

// ---- Busca o PU no CSV do Tesouro Transparente ----
function buscarPU() {
  const resp = UrlFetchApp.fetch(CSV_URL, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    console.error("Erro HTTP: " + resp.getResponseCode());
    return null;
  }

  const linhas = resp.getContentText("windows-1252").split("\n");
  // Colunas: Tipo;Vencimento;DataBase;TaxaCompra;TaxaVenda;PUCompra;PUVenda;PUBase

  let melhorData = "";
  let melhorPU = null;

  for (const linha of linhas) {
    const cols = linha.trim().split(";");
    if (cols.length < 7) continue;
    if (cols[0] === "Tesouro Prefixado" && cols[1] === "01/01/2032") {
      const dataBase = cols[2]; // DD/MM/AAAA
      if (dataBase > melhorData) {
        melhorData = dataBase;
        melhorPU = parseFloat(cols[6].replace(",", ".")); // PU Venda Manha
      }
    }
  }

  if (melhorPU) console.log("LTN 2032 PU Venda em " + melhorData + ": " + melhorPU);
  return melhorPU;
}

// ---- Instala trigger de 10 min (rode UMA VEZ manualmente) ----
function instalarTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "atualizaPULtn2032")
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger("atualizaPULtn2032")
    .timeBased()
    .everyMinutes(10)
    .create();

  console.log("Trigger instalado: roda a cada 10 minutos.");
}
