(function () {
  'use strict';

  /* ─── P3.12+P3.13 · Parsers CSV Expandidos + Open Finance ───────────── */

  /**
   * Detecta o banco/formato do CSV com base no cabeçalho e conteúdo
   * Sobrescreve a função existente em categorias.js
   */
  function detectarFormatoCSV(linhas) {
    if (!linhas || linhas.length === 0) return 'generico';
    const h = (linhas[0] || '').toLowerCase().replace(/"/g, '');
    const h2 = (linhas[1] || '').toLowerCase().replace(/"/g, '');
    const amostra = linhas.slice(0, 5).join('\n').toLowerCase();

    // Nubank (cartão ou conta)
    if (h.includes('date') && h.includes('transaction') && h.includes('amount')) return 'nubank_en';
    if (h.includes('data') && h.includes('descricao') && h.includes('valor')) return 'nubank';
    if (h.includes('data da compra') || amostra.includes('nubank')) return 'nubank';

    // Itaú — vários formatos
    if (h.includes('data') && h.includes('histórico') && h.includes('docto')) return 'itau';
    if (h.includes('data') && h.includes('historico') && h.includes('docto')) return 'itau';
    if (amostra.includes('banco itau') || amostra.includes('itaú unibanco')) return 'itau';

    // Bradesco
    if (h.includes('lancamento') || h.includes('historico') || h.includes('hist.')) return 'bradesco';
    if (amostra.includes('banco bradesco')) return 'bradesco';

    // Banco do Brasil
    if (h.includes('dependencia origem') || h.includes('data') && h.includes('historico') && h.includes('numero do documento')) return 'bb';
    if (amostra.includes('banco do brasil')) return 'bb';

    // Caixa Econômica Federal
    if (h.includes('data') && (h.includes('lançamento') || h.includes('lancamento')) && h.includes('estabelecimento')) return 'caixa';
    if (amostra.includes('caixa economica') || amostra.includes('caixa econômica')) return 'caixa';

    // Santander
    if (h.includes('data') && h.includes('descricao') && h.includes('valor') && h.includes('saldo')) return 'santander';
    if (amostra.includes('banco santander') || h.includes('santander')) return 'santander';

    // Inter
    if (h.includes('descricao') && h.includes('tipo') && h.includes('valor') && !h.includes('saldo')) return 'inter';
    if (amostra.includes('banco inter')) return 'inter';

    // C6 Bank
    if (h.includes('identificador') && h.includes('descricao') && h.includes('valor')) return 'c6';

    // XP / Rico / Clear
    if (h.includes('produto') && h.includes('movimentacao')) return 'xp';

    // OFX/Open Finance (texto XML-like)
    if (linhas[0].includes('OFXHEADER') || linhas[0].includes('<OFX>')) return 'ofx';

    // Genérico com separador ponto-e-vírgula (BR comum)
    if (h.includes(';') || (linhas[1] || '').includes(';')) return 'generico_br';

    return 'generico';
  }

  /**
   * Normaliza data de vários formatos para YYYY-MM-DD
   */
  function _normData(str) {
    if (!str) return '';
    str = str.trim().replace(/"/g, '');
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    // DD/MM/YYYY ou DD-MM-YYYY
    const m1 = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (m1) return m1[3] + '-' + m1[2] + '-' + m1[1];
    // MM/DD/YYYY (padrão EN)
    const m2 = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (m2) return m2[3] + '-' + m2[1] + '-' + m2[2];
    // YYYYMMDD
    const m3 = str.match(/^(\d{4})(\d{2})(\d{2})/);
    if (m3) return m3[1] + '-' + m3[2] + '-' + m3[3];
    return str;
  }

  /**
   * Normaliza valor numérico (virgula BR ou ponto EN, R$, espaços)
   */
  function _normValor(str) {
    if (!str) return 0;
    str = str.replace(/"/g, '').trim();
    // Remove R$, espaços, pontos de milhar
    str = str.replace(/R\$\s*/g, '').replace(/\s/g, '');
    // Se tem vírgula como decimal (BR): 1.234,56 → 1234.56
    if (/\d{1,3}(\.\d{3})+,\d{2}$/.test(str)) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (/,/.test(str) && !/\./.test(str)) {
      // Somente vírgula: 1234,56
      str = str.replace(',', '.');
    } else if (/,/.test(str) && /\./.test(str)) {
      // Ambos — determina qual é decimal pelo contexto
      const dotPos = str.lastIndexOf('.');
      const commaPos = str.lastIndexOf(',');
      if (commaPos > dotPos) {
        // vírgula é decimal: 1.234,56
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        // ponto é decimal: 1,234.56
        str = str.replace(/,/g, '');
      }
    }
    return parseFloat(str) || 0;
  }

  /**
   * Parsers específicos por banco
   * Retorna array de { data, desc, valor, tipo }
   */
  const PARSERS = {

    nubank: function (linhas) {
      // data,category,title,amount  OU  Data,Descrição,Valor
      const out = [];
      for (let i = 1; i < linhas.length; i++) {
        const cols = _parseCols(linhas[i]);
        if (cols.length < 3) continue;
        const data = _normData(cols[0]);
        const desc = cols[2] || cols[1] || 'Nubank';
        const rawVal = _normValor(cols[cols.length - 1]);
        if (!rawVal || !data) continue;
        out.push({ data, desc, valor: Math.abs(rawVal), tipo: rawVal < 0 ? 'despesa' : 'receita' });
      }
      return out;
    },

    nubank_en: function (linhas) {
      const out = [];
      for (let i = 1; i < linhas.length; i++) {
        const cols = _parseCols(linhas[i]);
        if (cols.length < 3) continue;
        const data = _normData(cols[0]);
        const desc = cols[2] || cols[1] || 'Nubank';
        const rawVal = _normValor(cols[3] || cols[cols.length - 1]);
        if (!rawVal || !data) continue;
        out.push({ data, desc, valor: Math.abs(rawVal), tipo: rawVal < 0 ? 'despesa' : 'receita' });
      }
      return out;
    },

    itau: function (linhas) {
      // Data;Histórico;Docto.;Crédito (R$);Débito (R$);Saldo (R$)
      const out = [];
      for (let i = 1; i < linhas.length; i++) {
        const cols = _parseCols(linhas[i]);
        if (cols.length < 4) continue;
        const data = _normData(cols[0]);
        const desc = (cols[1] || '').trim();
        if (!data || data.length < 8) continue;
        // Crédito na col 3, débito na col 4
        const credito = _normValor(cols[3]);
        const debito = _normValor(cols[4] || '0');
        // Ignorar linha de saldo
        if (desc.toLowerCase().includes('saldo') && !credito && !debito) continue;
        if (credito > 0) {
          out.push({ data, desc, valor: credito, tipo: 'receita' });
        } else if (debito > 0) {
          out.push({ data, desc, valor: debito, tipo: 'despesa' });
        } else {
          const raw = _normValor(cols[cols.length - 2] || cols[2]);
          if (raw !== 0) out.push({ data, desc, valor: Math.abs(raw), tipo: raw < 0 ? 'despesa' : 'receita' });
        }
      }
      return out;
    },

    bradesco: function (linhas) {
      // Data;Lançamento;Histórico;Valor;Saldo
      const out = [];
      for (let i = 1; i < linhas.length; i++) {
        const cols = _parseCols(linhas[i]);
        if (cols.length < 3) continue;
        const data = _normData(cols[0]);
        const desc = (cols[2] || cols[1] || '').trim();
        if (!data || data.length < 8) continue;
        // Valor pode ser na col 3 com sinal, ou separado em crédito/débito
        let rawVal = _normValor(cols[3] || cols[2]);
        if (cols.length >= 5 && !rawVal) {
          const cr = _normValor(cols[3]);
          const db = _normValor(cols[4]);
          rawVal = cr > 0 ? cr : (db > 0 ? -db : 0);
        }
        if (!rawVal || !desc) continue;
        out.push({ data, desc, valor: Math.abs(rawVal), tipo: rawVal < 0 ? 'despesa' : 'receita' });
      }
      return out;
    },

    bb: function (linhas) {
      // Banco do Brasil: Data;Dependência Origem;Histórico;Data Balancete;Número Documento;Valor
      const out = [];
      for (let i = 1; i < linhas.length; i++) {
        const cols = _parseCols(linhas[i]);
        if (cols.length < 5) continue;
        const data = _normData(cols[0]);
        const desc = (cols[2] || '').trim();
        if (!data || data.length < 8) continue;
        const rawVal = _normValor(cols[cols.length - 1]);
        if (!rawVal) continue;
        out.push({ data, desc, valor: Math.abs(rawVal), tipo: rawVal < 0 ? 'despesa' : 'receita' });
      }
      return out;
    },

    caixa: function (linhas) {
      // Caixa: Data;Estabelecimento/Descrição;Valor;Tipo
      // ou:    Data;Lançamento;Valor da Parcela;Valor Total
      const out = [];
      for (let i = 1; i < linhas.length; i++) {
        const cols = _parseCols(linhas[i]);
        if (cols.length < 3) continue;
        const data = _normData(cols[0]);
        const desc = (cols[1] || '').trim();
        if (!data || data.length < 8) continue;
        const rawVal = _normValor(cols[2]);
        const tipoHint = (cols[3] || '').toLowerCase();
        const tipo = tipoHint.includes('crédito') || tipoHint.includes('credit') ? 'receita'
          : tipoHint.includes('débito') || tipoHint.includes('debit') ? 'despesa'
          : rawVal >= 0 ? 'receita' : 'despesa';
        if (!rawVal) continue;
        out.push({ data, desc, valor: Math.abs(rawVal), tipo });
      }
      return out;
    },

    santander: function (linhas) {
      // Data;Descrição;Valor;Saldo
      const out = [];
      for (let i = 1; i < linhas.length; i++) {
        const cols = _parseCols(linhas[i]);
        if (cols.length < 3) continue;
        const data = _normData(cols[0]);
        const desc = (cols[1] || '').trim();
        if (!data || data.length < 8) continue;
        const rawVal = _normValor(cols[2]);
        if (!rawVal) continue;
        out.push({ data, desc, valor: Math.abs(rawVal), tipo: rawVal < 0 ? 'despesa' : 'receita' });
      }
      return out;
    },

    inter: function (linhas) {
      // Descrição;Tipo;Valor
      const out = [];
      for (let i = 1; i < linhas.length; i++) {
        const cols = _parseCols(linhas[i]);
        if (cols.length < 3) continue;
        // Tentar extrair data do campo descrição ou coluna extra
        let data = new Date().toISOString().slice(0, 10);
        const desc = (cols[0] || '').trim();
        const tipoStr = (cols[1] || '').toLowerCase();
        const rawVal = _normValor(cols[2]);
        const tipo = tipoStr.includes('crédit') || tipoStr.includes('entrada') ? 'receita' : 'despesa';
        if (!rawVal) continue;
        out.push({ data, desc, valor: Math.abs(rawVal), tipo });
      }
      return out;
    },

    c6: function (linhas) {
      // Identificador;Data;Descrição;Parcela;Tipo;Valor Nacional
      const out = [];
      for (let i = 1; i < linhas.length; i++) {
        const cols = _parseCols(linhas[i]);
        if (cols.length < 5) continue;
        const data = _normData(cols[1] || cols[0]);
        const desc = (cols[2] || '').trim();
        const tipoStr = (cols[4] || '').toLowerCase();
        const rawVal = _normValor(cols[5] || cols[cols.length - 1]);
        if (!rawVal || !data) continue;
        const tipo = tipoStr.includes('crédito') || rawVal > 0 ? 'receita' : 'despesa';
        out.push({ data, desc, valor: Math.abs(rawVal), tipo });
      }
      return out;
    },

    ofx: function (linhas) {
      // OFX/Open Finance — parsing básico de tags
      const texto = linhas.join('\n');
      const out = [];
      const stmtRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
      let match;
      while ((match = stmtRegex.exec(texto)) !== null) {
        const bloco = match[1];
        const tipoTag = (bloco.match(/<TRNTYPE>([^<]+)/i) || [])[1] || '';
        const dataTag = (bloco.match(/<DTPOSTED>([^<]+)/i) || [])[1] || '';
        const valorTag = (bloco.match(/<TRNAMT>([^<]+)/i) || [])[1] || '0';
        const descTag = (bloco.match(/<MEMO>([^<]+)/i) || (bloco.match(/<NAME>([^<]+)/i)) || [])[1] || 'OFX';
        const data = _normData(dataTag);
        const rawVal = parseFloat(valorTag) || 0;
        if (!rawVal || !data) continue;
        const tipo = rawVal >= 0 ? 'receita' : 'despesa';
        out.push({ data, desc: descTag.trim(), valor: Math.abs(rawVal), tipo });
      }
      return out;
    },

    xp: function (linhas) {
      // XP/Rico: Data;Produto;Movimentação;Quantidade;Preço Unitário;Valor;
      const out = [];
      for (let i = 1; i < linhas.length; i++) {
        const cols = _parseCols(linhas[i]);
        if (cols.length < 5) continue;
        const data = _normData(cols[0]);
        const desc = (cols[1] || '') + ' - ' + (cols[2] || '');
        const rawVal = _normValor(cols[5] || cols[cols.length - 1]);
        if (!rawVal || !data) continue;
        const tipo = rawVal >= 0 ? 'receita' : 'despesa';
        out.push({ data, desc: desc.trim(), valor: Math.abs(rawVal), tipo, categoria: 'investimentos' });
      }
      return out;
    },

    generico_br: function (linhas) {
      return PARSERS.generico(linhas);
    },

    generico: function (linhas) {
      const out = [];
      for (let i = 1; i < linhas.length; i++) {
        const cols = _parseCols(linhas[i]);
        if (cols.length < 2) continue;
        const data = _normData(cols[0]);
        if (!data || data.length < 8) continue;
        const desc = cols[1] || 'Lançamento';
        const rawVal = _normValor(cols[cols.length - 1]);
        if (!rawVal) continue;
        out.push({ data, desc, valor: Math.abs(rawVal), tipo: rawVal < 0 ? 'despesa' : 'receita' });
      }
      return out;
    }
  };

  /** Parser de linha CSV respeitando aspas e ponto-e-vírgula/vírgula */
  function _parseCols(linha) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < linha.length; i++) {
      const ch = linha[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if ((ch === ',' || ch === ';') && !inQuotes) { result.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  }

  /**
   * Função principal de importação — sobrescreve importarCSV de categorias.js
   */
  function importarCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Detectar encoding — tenta UTF-8, fallback para latin-1 (ISO-8859-1)
    const reader = new FileReader();
    reader.onload = function (e) {
      let text = e.target.result;
      const linhas = text.replace(/\r/g, '').split('\n').filter(l => l.trim());

      if (linhas.length < 2) {
        if (typeof mostrarToast === 'function') mostrarToast('⚠️ Arquivo CSV inválido ou vazio');
        return;
      }

      const formato = detectarFormatoCSV(linhas);
      const parser = PARSERS[formato] || PARSERS.generico;
      let registros;

      try {
        registros = parser(linhas);
      } catch (err) {
        console.error('CSV parse error:', err);
        registros = PARSERS.generico(linhas);
      }

      if (!registros || registros.length === 0) {
        if (typeof mostrarToast === 'function') mostrarToast('⚠️ Nenhum lançamento encontrado no arquivo');
        return;
      }

      // Sugerir categorias
      window.csvDados = registros.map(r => ({
        ...r,
        categoria: r.categoria || (typeof sugerirCategoria === 'function' ? sugerirCategoria(r.desc) : null)
          || (typeof getCategoriaSugerida === 'function' ? getCategoriaSugerida(r.desc) : null)
          || 'outros',
        selecionado: true
      }));

      // Mostrar badge do banco detectado
      const badgeEl = document.getElementById('csv-banco-detectado');
      if (badgeEl) {
        const bancoNome = {
          nubank: '🟣 Nubank', nubank_en: '🟣 Nubank', itau: '🟠 Itaú',
          bradesco: '🔴 Bradesco', bb: '🔵 Banco do Brasil', caixa: '🟤 Caixa',
          santander: '🔴 Santander', inter: '🟠 Inter', c6: '⚫ C6 Bank',
          xp: '🟡 XP/Rico', ofx: '🏦 OFX/Open Finance', generico: '🏦 Genérico', generico_br: '🏦 Genérico BR'
        }[formato] || '🏦 ' + formato;
        badgeEl.textContent = 'Formato detectado: ' + bancoNome;
        badgeEl.style.display = 'inline-block';
      }

      if (typeof renderCSVPreview === 'function') renderCSVPreview();
    };

    // Tenta UTF-8 primeiro
    reader.onerror = function () {
      const reader2 = new FileReader();
      reader2.onload = function (e) {
        event.target.result = e.target.result;
        reader.onload(event);
      };
      reader2.readAsText(file, 'ISO-8859-1');
    };

    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  }

  // Sobrescreve função global
  window.importarCSV = importarCSV;
  window.detectarFormatoCSV = detectarFormatoCSV;
  window.PARSERS_CSV = PARSERS;

})();
