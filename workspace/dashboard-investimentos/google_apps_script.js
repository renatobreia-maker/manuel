function criarDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ========== ABA 1: DASHBOARD ==========
  var dash = ss.getSheetByName("Dashboard") || ss.insertSheet("Dashboard");
  dash.clear();
  dash.setColumnWidth(1, 280);
  dash.setColumnWidth(2, 160);
  dash.setColumnWidth(3, 160);
  dash.setColumnWidth(4, 160);
  dash.setColumnWidth(5, 120);

  // Header
  dash.getRange("A1").setValue("DASHBOARD DE PATRIMONIO").setFontSize(18).setFontWeight("bold").setFontColor("#1a1a2e");
  dash.getRange("A2").setValue("Data: 12/03/2026 | Cambio: R$ 5,15/USD").setFontSize(10).setFontColor("#666666");

  // Patrimonio Total
  dash.getRange("A4").setValue("PATRIMONIO TOTAL").setFontSize(14).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("white");
  dash.getRange("B4:E4").setBackground("#1a1a2e");

  var patrimonioData = [
    ["Regiao", "Moeda Original", "Valor BRL", "%"],
    ["Onshore (Brasil)", "R$ 14.604.645", "R$ 14.604.645", "76,7%"],
    ["Offshore (Avenue)", "US$ 862.906", "R$ 4.443.963", "23,3%"],
    ["TOTAL", "", "R$ 19.048.608", "100,0%"]
  ];
  dash.getRange(5, 1, 4, 4).setValues(patrimonioData);
  dash.getRange("A5:D5").setFontWeight("bold").setBackground("#e8eaf6");
  dash.getRange("A8:D8").setFontWeight("bold").setBackground("#c8e6c9");

  // Alocacao por Classe
  dash.getRange("A10").setValue("ALOCACAO POR CLASSE DE ATIVO").setFontSize(14).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("white");
  dash.getRange("B10:E10").setBackground("#1a1a2e");

  var classeData = [
    ["Classe", "Valor BRL", "%", "Meta %"],
    ["Renda Variavel Brasil", "R$ 8.780.202", "46,1%", ""],
    ["Renda Variavel Global", "R$ 2.460.824", "12,9%", ""],
    ["RF Pos-fixado (CDI)", "R$ 3.221.704", "16,9%", ""],
    ["RF Pre-fixado", "R$ 2.071.853", "10,9%", ""],
    ["RF IPCA+", "R$ 390.416", "2,0%", ""],
    ["Bonds Globais", "R$ 1.735.756", "9,1%", ""],
    ["RF Curto Prazo Global", "R$ 247.385", "1,3%", ""],
    ["Multimercado", "R$ 138.796", "0,7%", ""],
    ["Caixa", "R$ 6.203", "0,0%", ""],
    ["TOTAL", "R$ 19.053.139", "100,0%", ""]
  ];
  dash.getRange(11, 1, 11, 4).setValues(classeData);
  dash.getRange("A11:D11").setFontWeight("bold").setBackground("#e8eaf6");
  dash.getRange("A21:D21").setFontWeight("bold").setBackground("#c8e6c9");

  // Grafico de Classe de Ativo
  var chartDataClasse = [
    ["Classe", "Valor"],
    ["RV Brasil", 8780202],
    ["RV Global", 2460824],
    ["RF Pos (CDI)", 3221704],
    ["RF Pre", 2071853],
    ["RF IPCA+", 390416],
    ["Bonds Global", 1735756],
    ["RF CP Global", 247385],
    ["Multimercado", 138796],
    ["Caixa", 6203]
  ];
  dash.getRange("F10:G19").setValues(chartDataClasse);

  var chart1 = dash.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(dash.getRange("F10:G19"))
    .setPosition(10, 6, 0, 0)
    .setOption("title", "Alocacao por Classe de Ativo")
    .setOption("pieHole", 0.4)
    .setOption("width", 500)
    .setOption("height", 350)
    .setOption("colors", ["#1565c0", "#42a5f5", "#4caf50", "#66bb6a", "#ff9800", "#7b1fa2", "#ab47bc", "#ef5350", "#bdbdbd"])
    .build();
  dash.insertChart(chart1);

  // Exposicao Cambial
  dash.getRange("A23").setValue("EXPOSICAO CAMBIAL").setFontSize(14).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("white");
  dash.getRange("B23:C23").setBackground("#1a1a2e");

  var cambialData = [
    ["Moeda", "Valor BRL", "%"],
    ["BRL", "R$ 14.604.645", "76,7%"],
    ["USD", "R$ 4.443.963", "23,3%"]
  ];
  dash.getRange(24, 1, 3, 3).setValues(cambialData);
  dash.getRange("A24:C24").setFontWeight("bold").setBackground("#e8eaf6");

  // Grafico Cambial
  var chartDataCambial = [
    ["Moeda", "Valor"],
    ["BRL", 14604645],
    ["USD", 4443963]
  ];
  dash.getRange("F23:G25").setValues(chartDataCambial);

  var chart2 = dash.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(dash.getRange("F23:G25"))
    .setPosition(23, 6, 0, 0)
    .setOption("title", "Exposicao Cambial")
    .setOption("pieHole", 0.4)
    .setOption("width", 400)
    .setOption("height", 250)
    .setOption("colors", ["#1565c0", "#4caf50"])
    .build();
  dash.insertChart(chart2);

  // Liquidez
  dash.getRange("A28").setValue("LIQUIDEZ").setFontSize(14).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("white");
  dash.getRange("B28:C28").setBackground("#1a1a2e");

  var liqData = [
    ["Prazo", "Valor BRL", "%"],
    ["D+0 a D+1", "R$ 1.230.774", "6,5%"],
    ["D+2 a D+5", "R$ 8.704.637", "45,7%"],
    ["Ate 35 dias", "R$ 56.284", "0,3%"],
    ["Ate 1 ano", "R$ 1.286.680", "6,8%"],
    ["1 a 5 anos", "R$ 2.057.299", "10,8%"],
    ["Acima de 5 anos", "R$ 1.268.972", "6,7%"],
    ["Offshore (liquidez variada)", "R$ 4.443.963", "23,3%"]
  ];
  dash.getRange(29, 1, 8, 3).setValues(liqData);
  dash.getRange("A29:C29").setFontWeight("bold").setBackground("#e8eaf6");

  // ========== ABA 2: RENDA VARIAVEL ==========
  var rv = ss.getSheetByName("Renda Variavel") || ss.insertSheet("Renda Variavel");
  rv.clear();
  rv.setColumnWidth(1, 250);
  rv.setColumnWidth(2, 100);
  rv.setColumnWidth(3, 80);
  rv.setColumnWidth(4, 120);
  rv.setColumnWidth(5, 120);
  rv.setColumnWidth(6, 120);
  rv.setColumnWidth(7, 80);
  rv.setColumnWidth(8, 100);

  rv.getRange("A1").setValue("RENDA VARIAVEL").setFontSize(18).setFontWeight("bold").setFontColor("#1a1a2e");
  rv.getRange("A2").setValue("Total: R$ 11.241.026 | 59,0% do patrimonio").setFontSize(10).setFontColor("#666666");

  // Brasil
  rv.getRange("A4").setValue("BRASIL — R$ 8.780.202 (46,1% do total)").setFontSize(13).setFontWeight("bold").setBackground("#1565c0").setFontColor("white");
  rv.getRange("B4:H4").setBackground("#1565c0");

  var rvBrData = [
    ["Ativo", "Tipo", "Instituicao", "Valor BRL", "% da RV", "% do Total"],
    ["LANS EQUITIES FI ACOES IE", "Fundo Acoes", "BTG", "R$ 8.672.839", "77,2%", "45,5%"],
    ["ACS Absolute Pace Prev FIC FIA RL", "VGBL", "BTG", "R$ 107.364", "1,0%", "0,6%"],
    ["Subtotal Brasil", "", "", "R$ 8.780.202", "78,1%", "46,1%"]
  ];
  rv.getRange(5, 1, 4, 6).setValues(rvBrData);
  rv.getRange("A5:F5").setFontWeight("bold").setBackground("#e8eaf6");
  rv.getRange("A8:F8").setFontWeight("bold").setBackground("#c8e6c9");

  // Global
  rv.getRange("A10").setValue("GLOBAL — US$ 477.830 (12,9% do total)").setFontSize(13).setFontWeight("bold").setBackground("#4caf50").setFontColor("white");
  rv.getRange("B10:H10").setBackground("#4caf50");

  var rvGlData = [
    ["Ativo", "Ticker", "Qtd", "P. Medio", "P. Atual", "Valor USD", "VAR %", "% Total"],
    ["Vanguard S&P 500 ETF", "VOO", "292,40", "$381,41", "$631,04", "$184.517", "+65,4%", "9,7%"],
    ["Taiwan Semiconductor", "TSM", "263,50", "$120,56", "$374,58", "$98.702", "+210,7%", "5,2%"],
    ["Netflix Inc.", "NFLX", "540,92", "$27,83", "$96,24", "$52.058", "+245,8%", "2,7%"],
    ["MercadoLibre Inc", "MELI", "26,59", "$1.333,65", "$1.757,58", "$46.742", "+31,8%", "2,5%"],
    ["Primoris Services Corp", "PRIM", "200,00", "$25,48", "$150,72", "$30.144", "+491,5%", "1,6%"],
    ["Microsoft Corporation", "MSFT", "52,52", "$376,92", "$392,74", "$20.626", "+4,2%", "1,1%"],
    ["Tesla Inc", "TSLA", "44,72", "$430,14", "$402,51", "$18.000", "-6,4%", "0,9%"],
    ["Halozyme Therapeutics", "HALO", "230,00", "$72,15", "$69,53", "$15.992", "-3,6%", "0,8%"],
    ["Brookfield Corp", "BN", "252,00", "$42,14", "$43,84", "$11.048", "+4,0%", "0,6%"],
    ["TOTAL", "", "", "", "", "$477.830", "", "12,9%"]
  ];
  rv.getRange(11, 1, 11, 8).setValues(rvGlData);
  rv.getRange("A11:H11").setFontWeight("bold").setBackground("#e8eaf6");
  rv.getRange("A21:H21").setFontWeight("bold").setBackground("#c8e6c9");

  // Concentracao
  rv.getRange("A23").setValue("TOP 5 POSICOES (CONCENTRACAO)").setFontSize(13).setFontWeight("bold").setBackground("#e53935").setFontColor("white");
  rv.getRange("B23:D23").setBackground("#e53935");

  var concData = [
    ["Posicao", "Valor BRL", "% Total"],
    ["LANS EQUITIES FI ACOES IE", "R$ 8.672.839", "45,5%"],
    ["VOO (S&P 500)", "R$ 950.314", "5,0%"],
    ["TSM (Taiwan Semi)", "R$ 508.314", "2,7%"],
    ["NFLX (Netflix)", "R$ 268.101", "1,4%"],
    ["MELI (MercadoLibre)", "R$ 240.723", "1,3%"],
    ["Top 5 Total", "R$ 10.640.291", "55,9%"]
  ];
  rv.getRange(24, 1, 7, 3).setValues(concData);
  rv.getRange("A24:C24").setFontWeight("bold").setBackground("#e8eaf6");
  rv.getRange("A30:C30").setFontWeight("bold").setBackground("#ffcdd2");

  // ========== ABA 3: RENDA FIXA BRASIL ==========
  var rfbr = ss.getSheetByName("RF Brasil") || ss.insertSheet("RF Brasil");
  rfbr.clear();
  rfbr.setColumnWidth(1, 200);
  rfbr.setColumnWidth(2, 180);
  rfbr.setColumnWidth(3, 100);
  rfbr.setColumnWidth(4, 130);
  rfbr.setColumnWidth(5, 110);
  rfbr.setColumnWidth(6, 140);

  rfbr.getRange("A1").setValue("RENDA FIXA BRASIL").setFontSize(18).setFontWeight("bold").setFontColor("#1a1a2e");
  rfbr.getRange("A2").setValue("Total: R$ 5.683.974 | 29,8% do patrimonio").setFontSize(10).setFontColor("#666666");

  // Pos-fixado
  rfbr.getRange("A4").setValue("POS-FIXADO (CDI) — R$ 3.221.704 (16,9%)").setFontSize(13).setFontWeight("bold").setBackground("#4caf50").setFontColor("white");
  rfbr.getRange("B4:F4").setBackground("#4caf50");

  var posData = [
    ["Produto", "Emissor", "Instituicao", "Taxa", "Vencimento", "Valor Bruto"],
    ["BTG Tesouro Selic FIRF", "BTG", "BTG", "D+0", "D+0", "R$ 384.262"],
    ["BTG Digital Tesouro Selic", "BTG", "BTG", "D+0", "D+0", "R$ 104.878"],
    ["BTG CDB Plus FIRF CrPr", "BTG", "BTG", "D+0", "D+0", "R$ 217.801"],
    ["CDB", "BTG Pactual", "BTG", "CDI", "07/12/26", "R$ 273.776"],
    ["CDB", "BTG Pactual", "BTG", "CDI", "15/09/27", "R$ 32.104"],
    ["CDB", "BTG Pactual", "BTG", "CDI", "20/12/27", "R$ 9.773"],
    ["CDB", "BTG Pactual", "BTG", "CDI", "16/09/27", "R$ 64.173"],
    ["CDB", "BTG Pactual", "BTG", "CDI", "02/02/28", "R$ 101.443"],
    ["CDB", "Banco BMG", "BTG", "110,70% CDI", "01/10/29", "R$ 40.890"],
    ["CDB", "Banco BMG", "BTG", "109,20% CDI", "01/09/28", "R$ 9.438"],
    ["LCA", "Sicoob", "BTG", "95% CDI", "31/03/26", "R$ 33.736"],
    ["LCA", "BTG Pactual", "BTG", "93% CDI", "29/07/27", "R$ 280.705"],
    ["LCA", "Sicoob", "BTG", "95% CDI", "30/06/27", "R$ 248.948"],
    ["LCA", "Sicoob", "BTG", "95% CDI", "24/03/26", "R$ 22.547"],
    ["LCA", "ABC Brasil", "BTG", "91,50% CDI", "01/12/27", "R$ 206.604"],
    ["LCA", "Rabobank", "BTG", "94,25% CDI", "25/08/27", "R$ 38.676"],
    ["LCI", "Caixa Federal", "BTG", "92,76% CDI", "29/03/27", "R$ 283.677"],
    ["LCI", "Caixa Federal", "BTG", "12,35% a.a.", "25/01/27", "R$ 1.015.780"],
    ["LCA", "Itau", "Itau", "90,75% CDI", "25/05/26", "R$ 139.621"],
    ["LCA", "Itau", "Itau", "12,46% a.d.", "10/08/26", "R$ 131.278"],
    ["LCA", "Itau", "Itau", "96,50% DI", "16/03/26", "R$ 31.798"],
    ["LCA", "Itau", "Itau", "91,75% CDI", "15/05/28", "R$ 27.795"],
    ["CDB", "Itau", "Itau", "100% CDI", "04/12/30", "R$ 258.433"],
    ["CDB", "Itau", "Itau", "100% CDI", "27/11/30", "R$ 193.257"],
    ["Subtotal Pos-fixado", "", "", "", "", "R$ 3.221.704"]
  ];
  rfbr.getRange(5, 1, 26, 6).setValues(posData);
  rfbr.getRange("A5:F5").setFontWeight("bold").setBackground("#e8eaf6");
  rfbr.getRange("A30:F30").setFontWeight("bold").setBackground("#c8e6c9");

  // Pre-fixado
  var rowPre = 32;
  rfbr.getRange(rowPre, 1).setValue("PRE-FIXADO — R$ 2.071.853 (10,9%)").setFontSize(13).setFontWeight("bold").setBackground("#ff9800").setFontColor("white");
  rfbr.getRange(rowPre, 2, 1, 5).setBackground("#ff9800");

  var preData = [
    ["Produto", "Emissor", "Instituicao", "Taxa", "Vencimento", "Valor Bruto"],
    ["LTN", "BACEN", "BTG", "13,69% a.a.", "01/01/32", "R$ 924.795"],
    ["LCI", "Itau", "Itau", "91,75% CDI", "24/04/28", "R$ 67.197"],
    ["LCI", "Itau", "Itau", "91,75% CDI", "03/04/28", "R$ 56.322"],
    ["LCI", "Itau", "Itau", "91,75% CDI", "03/06/27", "R$ 93.848"],
    ["Subtotal Pre-fixado", "", "", "", "", "R$ 2.071.853"]
  ];
  rfbr.getRange(rowPre+1, 1, 6, 6).setValues(preData);
  rfbr.getRange(rowPre+1, 1, 1, 6).setFontWeight("bold").setBackground("#e8eaf6");
  rfbr.getRange(rowPre+6, 1, 1, 6).setFontWeight("bold").setBackground("#c8e6c9");

  // IPCA+
  var rowIpca = 40;
  rfbr.getRange(rowIpca, 1).setValue("IPCA+ (INFLACAO) — R$ 390.416 (2,0%)").setFontSize(13).setFontWeight("bold").setBackground("#7b1fa2").setFontColor("white");
  rfbr.getRange(rowIpca, 2, 1, 5).setBackground("#7b1fa2");

  var ipcaData = [
    ["Produto", "Emissor", "Instituicao", "Taxa", "Vencimento", "Valor Bruto"],
    ["CRA", "Caramuru", "BTG", "IPCA + 7,44%", "16/07/29", "R$ 84.833"],
    ["CRA", "FS Bio", "BTG", "IPCA + 7,68%", "15/05/29", "R$ 171.077"],
    ["CRA", "Minerva Foods", "BTG", "IPCA + 7,14%", "17/04/28", "R$ 36.489"],
    ["CRI", "Grupo Hapvida", "BTG", "IPCA + 8,36%", "15/12/31", "R$ 71.367"],
    ["Debenture", "Engie Brasil", "BTG", "IPCA + 7,25%", "15/01/32", "R$ 26.651"],
    ["Subtotal IPCA+", "", "", "", "", "R$ 390.416"]
  ];
  rfbr.getRange(rowIpca+1, 1, 7, 6).setValues(ipcaData);
  rfbr.getRange(rowIpca+1, 1, 1, 6).setFontWeight("bold").setBackground("#e8eaf6");
  rfbr.getRange(rowIpca+7, 1, 1, 6).setFontWeight("bold").setBackground("#c8e6c9");

  // ========== ABA 4: RF GLOBAL ==========
  var rfgl = ss.getSheetByName("RF Global") || ss.insertSheet("RF Global");
  rfgl.clear();
  rfgl.setColumnWidth(1, 250);
  rfgl.setColumnWidth(2, 100);
  rfgl.setColumnWidth(3, 100);
  rfgl.setColumnWidth(4, 100);
  rfgl.setColumnWidth(5, 120);
  rfgl.setColumnWidth(6, 80);
  rfgl.setColumnWidth(7, 100);

  rfgl.getRange("A1").setValue("RENDA FIXA GLOBAL").setFontSize(18).setFontWeight("bold").setFontColor("#1a1a2e");
  rfgl.getRange("A2").setValue("Total: US$ 385.076 (R$ 1.983.140) | Yield medio: 6,79% | Duration: 1,07 anos").setFontSize(10).setFontColor("#666666");

  rfgl.getRange("A4").setValue("BONDS CORPORATIVOS — US$ 253.898").setFontSize(13).setFontWeight("bold").setBackground("#1565c0").setFontColor("white");
  rfgl.getRange("B4:G4").setBackground("#1565c0");

  var bondsData = [
    ["Ativo", "Cupom", "Vencimento", "Qtd", "Valor USD", "VAR %", "Peso"],
    ["XP Inc 6.75%", "6,75%", "02/07/29", "48", "$49.632", "+3,1%", "5,75%"],
    ["Rede D'Or 4.5%", "4,50%", "22/01/30", "43", "$41.951", "+6,7%", "4,86%"],
    ["Movida 7.85%", "7,85%", "11/04/29", "43", "$41.925", "+1,3%", "4,86%"],
    ["Axia Energia 6.5%", "6,50%", "11/01/35", "35", "$36.442", "+6,8%", "4,22%"],
    ["Natura 6%", "6,00%", "19/04/29", "30", "$29.538", "+0,9%", "3,42%"],
    ["Suzano 2.5%", "2,50%", "15/09/28", "30", "$28.758", "+14,2%", "3,33%"],
    ["Bank of America 5.518%", "5,52%", "25/10/35", "15", "$15.449", "+3,3%", "1,79%"],
    ["Caixa Federal 5.625%", "5,63%", "13/05/30", "10", "$10.204", "+2,2%", "1,18%"],
    ["Subtotal Bonds", "", "", "", "$253.898", "", ""]
  ];
  rfgl.getRange(5, 1, 10, 7).setValues(bondsData);
  rfgl.getRange("A5:G5").setFontWeight("bold").setBackground("#e8eaf6");
  rfgl.getRange("A14:G14").setFontWeight("bold").setBackground("#c8e6c9");

  // Fundos RF
  rfgl.getRange("A16").setValue("FUNDOS DE RENDA FIXA — US$ 83.142").setFontSize(13).setFontWeight("bold").setBackground("#42a5f5").setFontColor("white");
  rfgl.getRange("B16:G16").setBackground("#42a5f5");

  var fundosRfData = [
    ["Fundo", "Codigo", "Qtd", "Valor USD", "VAR %", "Peso"],
    ["PIMCO GIS Income E USD Acc", "PIMXZ", "2.029", "$36.636", "+3,4%", "4,25%"],
    ["JPM Global Bond Opps A USD", "JBBNZ", "197", "$31.204", "+1,5%", "3,62%"],
    ["PIMCO GIS Glb Hi Yld Bd", "PFDAZ", "530", "$15.302", "+2,0%", "1,77%"]
  ];
  rfgl.getRange(17, 1, 4, 6).setValues(fundosRfData);
  rfgl.getRange("A17:F17").setFontWeight("bold").setBackground("#e8eaf6");

  // Calendario de Cupons
  rfgl.getRange("A22").setValue("CALENDARIO DE CUPONS (prox 12 meses)").setFontSize(13).setFontWeight("bold").setBackground("#ff9800").setFontColor("white");
  rfgl.getRange("B22:C22").setBackground("#ff9800");

  var cuponsData = [
    ["Mes", "Juros USD"],
    ["MAR/26", "$375"],
    ["ABR/26", "$3.002"],
    ["MAI/26", "$281"],
    ["JUN/26", "$0"],
    ["JUL/26", "$3.725"],
    ["AGO/26", "$0"],
    ["SET/26", "$375"],
    ["OUT/26", "$3.002"],
    ["NOV/26", "$281"],
    ["DEZ/26", "$0"],
    ["JAN/27", "$3.725"],
    ["FEV/27", "$0"],
    ["Total 12m", "$14.766"]
  ];
  rfgl.getRange(23, 1, 14, 2).setValues(cuponsData);
  rfgl.getRange("A23:B23").setFontWeight("bold").setBackground("#e8eaf6");
  rfgl.getRange("A36:B36").setFontWeight("bold").setBackground("#c8e6c9");

  // ========== ABA 5: VENCIMENTOS ==========
  var venc = ss.getSheetByName("Vencimentos") || ss.insertSheet("Vencimentos");
  venc.clear();
  venc.setColumnWidth(1, 200);
  venc.setColumnWidth(2, 150);
  venc.setColumnWidth(3, 130);
  venc.setColumnWidth(4, 110);
  venc.setColumnWidth(5, 140);

  venc.getRange("A1").setValue("CALENDARIO DE VENCIMENTOS").setFontSize(18).setFontWeight("bold").setFontColor("#1a1a2e");

  venc.getRange("A3").setValue("RESUMO POR ANO").setFontSize(13).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("white");
  venc.getRange("B3:C3").setBackground("#1a1a2e");

  var vencAnoData = [
    ["Ano", "Valor BRL", "Qtd Ativos"],
    ["2026", "R$ 599.021", "5"],
    ["2027", "R$ 2.249.266", "8"],
    ["2028", "R$ 298.684", "5"],
    ["2029", "R$ 255.910", "2"],
    ["2030", "R$ 492.579", "3"],
    ["2031", "R$ 71.367", "1"],
    ["2032", "R$ 951.446", "2"],
    ["TOTAL", "R$ 4.918.272", "26"]
  ];
  venc.getRange(4, 1, 9, 3).setValues(vencAnoData);
  venc.getRange("A4:C4").setFontWeight("bold").setBackground("#e8eaf6");
  venc.getRange("A12:C12").setFontWeight("bold").setBackground("#c8e6c9");

  // Grafico vencimentos por ano
  var chartDataVenc = [
    ["Ano", "Valor"],
    ["2026", 599021],
    ["2027", 2249266],
    ["2028", 298684],
    ["2029", 255910],
    ["2030", 492579],
    ["2031", 71367],
    ["2032", 951446]
  ];
  venc.getRange("E3:F10").setValues(chartDataVenc);

  var chart3 = venc.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(venc.getRange("E3:F10"))
    .setPosition(3, 5, 0, 0)
    .setOption("title", "Vencimentos por Ano")
    .setOption("width", 500)
    .setOption("height", 300)
    .setOption("colors", ["#1565c0"])
    .setOption("legend", {position: "none"})
    .build();
  venc.insertChart(chart3);

  // Proximos vencimentos
  venc.getRange("A14").setValue("PROXIMOS VENCIMENTOS (ate 90 dias)").setFontSize(13).setFontWeight("bold").setBackground("#e53935").setFontColor("white");
  venc.getRange("B14:E14").setBackground("#e53935");

  var proxVencData = [
    ["Produto", "Emissor", "Vencimento", "Valor", "Dias"],
    ["LCA 96,50% DI", "Itau", "16/03/26", "R$ 31.798", "4"],
    ["LCA 95% CDI", "Sicoob", "24/03/26", "R$ 22.547", "12"],
    ["LCA 95% CDI", "Sicoob", "31/03/26", "R$ 33.736", "19"],
    ["LCA 90,75% CDI", "Itau", "25/05/26", "R$ 139.621", "74"]
  ];
  venc.getRange(15, 1, 5, 5).setValues(proxVencData);
  venc.getRange("A15:E15").setFontWeight("bold").setBackground("#e8eaf6");
  venc.getRange("A16:E16").setBackground("#ffcdd2"); // urgente
  venc.getRange("A17:E17").setBackground("#ffcdd2"); // urgente

  // ========== ABA 6: HISTORICO ==========
  var hist = ss.getSheetByName("Historico Mensal") || ss.insertSheet("Historico Mensal");
  hist.clear();
  hist.setColumnWidth(1, 100);
  for (var c = 2; c <= 10; c++) hist.setColumnWidth(c, 130);

  hist.getRange("A1").setValue("HISTORICO MENSAL").setFontSize(18).setFontWeight("bold").setFontColor("#1a1a2e");
  hist.getRange("A2").setValue("Preencher mensalmente ao receber os relatorios").setFontSize(10).setFontColor("#666666");

  var histData = [
    ["Mes", "Onshore BRL", "Offshore USD", "Cambio", "Offshore BRL", "Total BRL", "Var Mensal", "RV %", "RF %", "Caixa %"],
    ["Mar/26", "14.604.645", "862.906", "5,15", "4.443.963", "19.048.608", "", "59,0%", "40,3%", "0,0%"],
    ["Abr/26", "", "", "", "", "", "", "", "", ""],
    ["Mai/26", "", "", "", "", "", "", "", "", ""],
    ["Jun/26", "", "", "", "", "", "", "", "", ""],
    ["Jul/26", "", "", "", "", "", "", "", "", ""],
    ["Ago/26", "", "", "", "", "", "", "", "", ""],
    ["Set/26", "", "", "", "", "", "", "", "", ""],
    ["Out/26", "", "", "", "", "", "", "", "", ""],
    ["Nov/26", "", "", "", "", "", "", "", "", ""],
    ["Dez/26", "", "", "", "", "", "", "", "", ""],
    ["Jan/27", "", "", "", "", "", "", "", "", ""],
    ["Fev/27", "", "", "", "", "", "", "", "", ""]
  ];
  hist.getRange(4, 1, 13, 10).setValues(histData);
  hist.getRange("A4:J4").setFontWeight("bold").setBackground("#1a1a2e").setFontColor("white");
  hist.getRange("A5:J5").setBackground("#e8f5e9");

  // Performance Offshore
  hist.getRange("A19").setValue("PERFORMANCE OFFSHORE vs BENCHMARKS").setFontSize(13).setFontWeight("bold").setBackground("#4caf50").setFontColor("white");
  hist.getRange("B19:E19").setBackground("#4caf50");

  var perfData = [
    ["Mes", "Carteira", "S&P 500", "S&P Agg Bond"],
    ["Mar/25", "-4,80%", "-5,80%", "0,00%"],
    ["Abr/25", "3,30%", "-0,80%", "0,40%"],
    ["Mai/25", "5,30%", "6,20%", "-0,60%"],
    ["Jun/25", "3,60%", "5,00%", "1,50%"],
    ["Jul/25", "1,90%", "2,20%", "-0,30%"],
    ["Ago/25", "0,00%", "1,90%", "1,20%"],
    ["Set/25", "4,00%", "3,50%", "1,10%"],
    ["Out/25", "-0,30%", "2,30%", "0,60%"],
    ["Nov/25", "-2,10%", "0,10%", "0,60%"],
    ["Dez/25", "-1,00%", "-0,10%", "-0,30%"],
    ["Jan/26", "1,60%", "1,40%", "0,30%"],
    ["Fev/26", "0,80%", "-0,90%", "1,30%"],
    ["Total 12m", "12,50%", "15,50%", "5,90%"]
  ];
  hist.getRange(20, 1, 14, 4).setValues(perfData);
  hist.getRange("A20:D20").setFontWeight("bold").setBackground("#e8eaf6");
  hist.getRange("A33:D33").setFontWeight("bold").setBackground("#c8e6c9");

  // ========== ABA 7: ALERTAS ==========
  var alertas = ss.getSheetByName("Alertas") || ss.insertSheet("Alertas");
  alertas.clear();
  alertas.setColumnWidth(1, 250);
  alertas.setColumnWidth(2, 150);
  alertas.setColumnWidth(3, 300);

  alertas.getRange("A1").setValue("ALERTAS E PONTOS DE ATENCAO").setFontSize(18).setFontWeight("bold").setFontColor("#e53935");

  alertas.getRange("A3").setValue("CONCENTRACAO").setFontSize(13).setFontWeight("bold").setBackground("#e53935").setFontColor("white");
  alertas.getRange("B3:C3").setBackground("#e53935");

  var alertaConc = [
    ["Item", "Valor", "Observacao"],
    ["LANS EQUITIES = 45,5% do total", "R$ 8.672.839", "Risco alto de concentracao em um unico fundo"],
    ["Top 5 posicoes = 55,9%", "R$ 10.640.291", "Mais da metade em 5 ativos"],
    ["Exposicao USD = 23,3%", "R$ 4.443.963", "Adequado para diversificacao cambial"]
  ];
  alertas.getRange(4, 1, 4, 3).setValues(alertaConc);
  alertas.getRange("A4:C4").setFontWeight("bold").setBackground("#e8eaf6");
  alertas.getRange("A5:C5").setBackground("#ffcdd2");

  alertas.getRange("A9").setValue("VENCIMENTOS PROXIMOS (30 dias)").setFontSize(13).setFontWeight("bold").setBackground("#ff9800").setFontColor("white");
  alertas.getRange("B9:C9").setBackground("#ff9800");

  var alertaVenc = [
    ["Produto", "Vencimento", "Valor"],
    ["LCA Itau 96,50% DI", "16/03/26 (4 dias!)", "R$ 31.798"],
    ["LCA Sicoob 95% CDI", "24/03/26 (12 dias)", "R$ 22.547"],
    ["LCA Sicoob 95% CDI", "31/03/26 (19 dias)", "R$ 33.736"]
  ];
  alertas.getRange(10, 1, 4, 3).setValues(alertaVenc);
  alertas.getRange("A10:C10").setFontWeight("bold").setBackground("#e8eaf6");
  alertas.getRange("A11:C11").setBackground("#ffcdd2");

  alertas.getRange("A15").setValue("OPORTUNIDADES").setFontSize(13).setFontWeight("bold").setBackground("#4caf50").setFontColor("white");
  alertas.getRange("B15:C15").setBackground("#4caf50");

  var alertaOport = [
    ["Item", "Atual", "Comentario"],
    ["Previdencia", "1,3% (R$ 246k)", "Espaco para aumentar - beneficio fiscal no IR"],
    ["Multimercado offshore", "0%", "Avenue sugere 15% - considerar diversificar"],
    ["RF IPCA+", "2,0%", "Baixo para protecao inflacionaria de longo prazo"]
  ];
  alertas.getRange(16, 1, 4, 3).setValues(alertaOport);
  alertas.getRange("A16:C16").setFontWeight("bold").setBackground("#e8eaf6");

  // Remover Sheet1 padrao se existir
  var sheet1 = ss.getSheetByName("Sheet1") || ss.getSheetByName("Planilha1");
  if (sheet1 && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet1);
  }

  // Ativar aba Dashboard
  ss.setActiveSheet(dash);

  SpreadsheetApp.getUi().alert("Dashboard criado com sucesso! 7 abas configuradas.");
}
