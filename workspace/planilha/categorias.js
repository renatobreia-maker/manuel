// Regras de categorização por ordem de prioridade
// A primeira regra que bater é usada

const REGRAS = [
  // ── ENTRADAS ─────────────────────────────────────────────────────────────
  { padrao: /PAGTO SALARIO/i,                  categoria: 'Salário',           tipo: 'entrada' },
  { padrao: /PAGTO EM CONTA CORREN/i,          categoria: 'Dividendos Nord',   tipo: 'entrada' },
  { padrao: /VENCIMENTO (LCA|LCI|CDB|CRI|CRA)/i, categoria: 'Rendimentos',    tipo: 'entrada' },
  { padrao: /REND PAGO APLIC/i,                categoria: 'Rendimentos',       tipo: 'entrada' },
  { padrao: /(RESGATE|DI RESGATE) CDB/i,       categoria: 'Resgate CDB',       tipo: 'entrada' },
  { padrao: /TBI.*Nord/i,                      categoria: 'Dividendos Nord',   tipo: 'entrada' },
  { padrao: /TED.*RENATO/i,                    categoria: 'Transferência Própria', tipo: 'entrada' },
  { padrao: /AFL MED/i,                        categoria: 'Reembolso',         tipo: 'entrada' },
  { padrao: /SISPAG G4 EDUCACAO/i,             categoria: 'Reembolso',         tipo: 'entrada' },
  { padrao: /PIX TRANSF PRIME F/i,             categoria: 'Reembolso',         tipo: 'entrada' },

  // ── SAÍDAS: Transferências próprias ──────────────────────────────────────
  { padrao: /PIX TRANSF RENATO/i,              categoria: 'Transferência Própria', tipo: 'saída' },
  { padrao: /TED.*RENATO L V/i,                categoria: 'Transferência Própria', tipo: 'saída' },

  // ── SAÍDAS: Investimentos ─────────────────────────────────────────────────
  { padrao: /APLICACAO CDB/i,                  categoria: 'Aplicação CDB',     tipo: 'saída' },
  { padrao: /LCA APLICACAO/i,                  categoria: 'Aplicação LCA',     tipo: 'saída' },
  { padrao: /PIX.*MERCADO BIT/i,               categoria: 'Cripto',            tipo: 'saída' },

  // ── SAÍDAS: Obra / Reforma ────────────────────────────────────────────────
  { padrao: /CALACAT/i,                        categoria: 'Obra/Reforma',      tipo: 'saída' },
  { padrao: /PAG.*898033777000/i,              categoria: 'Obra/Reforma',      tipo: 'saída' }, // Calacatta boleto alternativo

  // ── SAÍDAS: Cartão de crédito (faturas) ──────────────────────────────────
  { padrao: /PERS BLACK/i,                     categoria: 'Fatura Cartão Itaú',tipo: 'saída' },
  { padrao: /INT AZUL VISA/i,                  categoria: 'Fatura Cartão Azul',tipo: 'saída' },
  { padrao: /INT PAG TIT/i,                    categoria: 'Fatura Cartão',     tipo: 'saída' },
  { padrao: /PAG TIT INT/i,                    categoria: 'Fatura Cartão',     tipo: 'saída' },

  // ── SAÍDAS: Contas fixas ──────────────────────────────────────────────────
  { padrao: /DA VIVO/i,                        categoria: 'Telecomunicações',  tipo: 'saída' },
  { padrao: /DA CLARO/i,                       categoria: 'Telecomunicações',  tipo: 'saída' },
  { padrao: /PAINEIRAS/i,                      categoria: 'Clube Paineiras',   tipo: 'saída' },
  { padrao: /ESPORTE CLU/i,                    categoria: 'Clube ECP',         tipo: 'saída' },
  { padrao: /PIX QRS ESPORTE CLU/i,            categoria: 'Clube ECP',         tipo: 'saída' },
  { padrao: /YELUM SEGUROS/i,                  categoria: 'Seguro',            tipo: 'saída' },
  { padrao: /XP VIDA E PREVID/i,               categoria: 'Previdência',       tipo: 'saída' },

  // ── SAÍDAS: Transferências fixas mensais ──────────────────────────────────
  // FERNAND: aluguel ou pensão — confirmar com Renato
  { padrao: /PIX TRANSF FERNAND/i,             categoria: '⚠ A Confirmar - FERNAND', tipo: 'saída' },
  // DMW: confirmar natureza
  { padrao: /PIX TRANSF DMW/i,                 categoria: '⚠ A Confirmar - DMW',     tipo: 'saída' },
  // LR-PR: confirmar
  { padrao: /PIX.*LR - PR/i,                   categoria: '⚠ A Confirmar - LR-PR',   tipo: 'saída' },
  // Glaucia: funcionária doméstica?
  { padrao: /PIX TRANSF GLAUCIA/i,             categoria: 'Serviços Domésticos',     tipo: 'saída' },

  // ── SAÍDAS: Clínica esposa ────────────────────────────────────────────────
  { padrao: /BR PACK/i,                        categoria: 'Clínica Esposa',    tipo: 'saída' },
  { padrao: /VILE EMBALAGENS/i,                categoria: 'Clínica Esposa',    tipo: 'saída' },
  { padrao: /FOGOES SHOP/i,                    categoria: 'Clínica Esposa',    tipo: 'saída' },
  { padrao: /CADPREST/i,                       categoria: 'Clínica Esposa',    tipo: 'saída' },
  { padrao: /CSP COPIAS/i,                     categoria: 'Clínica Esposa',    tipo: 'saída' },
  // EQUATORIAL pode ser energia casa ou clínica — padrão: clínica
  { padrao: /EQUATORIAL/i,                     categoria: 'Clínica Esposa',    tipo: 'saída' },

  // ── SAÍDAS: Alimentação / Mercado ────────────────────────────────────────
  { padrao: /HORTUS/i,                         categoria: 'Alimentação',       tipo: 'saída' },
  { padrao: /SHOPPER/i,                        categoria: 'Alimentação',       tipo: 'saída' },

  // ── SAÍDAS: Saúde ─────────────────────────────────────────────────────────
  { padrao: /FARMACI/i,                        categoria: 'Saúde/Farmácia',    tipo: 'saída' },
  { padrao: /MSF CAF/i,                        categoria: 'Saúde',             tipo: 'saída' },

  // ── SAÍDAS: Transporte ────────────────────────────────────────────────────
  { padrao: /POSTO DE SE/i,                    categoria: 'Combustível',       tipo: 'saída' },
  { padrao: /Licenciamento de Ve/i,            categoria: 'IPVA/Licenciamento',tipo: 'saída' },

  // ── SAÍDAS: Viagens ───────────────────────────────────────────────────────
  { padrao: /AZUL LINHAS/i,                    categoria: 'Viagens/Passagens', tipo: 'saída' },
  { padrao: /LUSOVIN/i,                        categoria: 'Viagens/Vinho',     tipo: 'saída' },

  // ── SAÍDAS: Lazer ────────────────────────────────────────────────────────
  { padrao: /1900 JARDIN/i,                    categoria: 'Restaurante',       tipo: 'saída' },
  { padrao: /WINE BR/i,                        categoria: 'Vinho',             tipo: 'saída' },

  // ── SAÍDAS: Educação ─────────────────────────────────────────────────────
  { padrao: /G4 EDUCACAO/i,                    categoria: 'Educação',          tipo: 'saída' },
  { padrao: /LR - PR/i,                        categoria: 'Educação',          tipo: 'saída' },
  { padrao: /NOVO AM/i,                        categoria: 'Educação',          tipo: 'saída' },
  { padrao: /FACAPE/i,                         categoria: 'Educação',          tipo: 'saída' },
  { padrao: /YARA TE/i,                        categoria: 'Educação',          tipo: 'saída' },
  { padrao: /PORTELL/i,                        categoria: 'Educação',          tipo: 'saída' },

  // ── Impostos ─────────────────────────────────────────────────────────────
  { padrao: /^IOF$/i,                          categoria: 'IOF',               tipo: 'saída' },

  // ── IGNORA (não é transação real) ────────────────────────────────────────
  { padrao: /SALDO DO DIA/i,                   categoria: null,                tipo: null },
];

function categorizar(descricao, valor) {
  for (const regra of REGRAS) {
    if (regra.padrao.test(descricao)) {
      if (regra.categoria === null) return null; // ignorar
      // Verifica consistência: entrada deve ter valor positivo, saída negativo
      const isEntrada = valor > 0;
      const tipo = isEntrada ? 'entrada' : 'saída';
      return { categoria: regra.categoria, tipo };
    }
  }
  // Sem regra: categoriza como "Outros" com tipo baseado no sinal
  return { categoria: 'Outros', tipo: valor > 0 ? 'entrada' : 'saída' };
}

module.exports = { categorizar, REGRAS };
