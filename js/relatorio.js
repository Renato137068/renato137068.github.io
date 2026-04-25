// FinançasPro — P2.11 Relatório PDF via jsPDF
// Gera relatório mensal completo sem window.print

(function() {
  'use strict';

  const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

  // ── Carregar jsPDF sob demanda ───────────────────────────────
  function _carregarJsPDF() {
    return new Promise((resolve, reject) => {
      if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
      const s = document.createElement('script');
      s.src = JSPDF_CDN;
      s.onload  = () => resolve(window.jspdf.jsPDF);
      s.onerror = () => reject(new Error('Falha ao carregar jsPDF'));
      document.head.appendChild(s);
    });
  }

  // ── Helpers ──────────────────────────────────────────────────
  function _fmt(v) {
    return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  function _mesLabel(mesStr) {
    if (!mesStr) return '';
    const [a, m] = mesStr.split('-').map(Number);
    return new Date(a, m-1, 1).toLocaleDateString('pt-BR', {month:'long', year:'numeric'});
  }

  function _doMes(mesStr) {
    const txMes = (typeof transacoes !== 'undefined' ? transacoes : [])
      .filter(t => t.data && t.data.startsWith(mesStr));
    const receitas  = txMes.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
    const despesas  = txMes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
    const porCategoria = {};
    txMes.filter(t => t.tipo === 'despesa').forEach(t => {
      porCategoria[t.categoria || 'outros'] = (porCategoria[t.categoria || 'outros'] || 0) + t.valor;
    });
    return { txMes, receitas, despesas, saldo: receitas - despesas, porCategoria };
  }

  // ── Gerador principal ────────────────────────────────────────
  async function gerarRelatorioMensal(mesStr) {
    const mes = mesStr || (typeof mesAtual !== 'undefined' ? mesAtual : null) || new Date().toISOString().slice(0,7);

    if (typeof mostrarToast === 'function') mostrarToast('Gerando PDF...', 'info');

    let JsPDF;
    try {
      JsPDF = await _carregarJsPDF();
    } catch(e) {
      if (typeof mostrarToast === 'function') mostrarToast('Erro ao carregar gerador de PDF. Verifique sua conexão.', 'danger');
      return;
    }

    const doc     = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W       = 210; // mm
    const MARGIN  = 15;
    const CONTENT = W - MARGIN * 2;
    let y         = MARGIN;

    const { txMes, receitas, despesas, saldo, porCategoria } = _doMes(mes);
    const nomeApp = 'FinançasPro';
    const nomeUsr = (typeof config !== 'undefined' && config.nome) ? config.nome : '';
    const titulo  = 'Relatório Financeiro — ' + _mesLabel(mes).charAt(0).toUpperCase() + _mesLabel(mes).slice(1);

    // ── Paleta ──
    const VERDE  = [22, 163, 74];
    const VERM   = [239, 68, 68];
    const CINZA  = [107, 114, 128];
    const ESCURO = [17, 24, 39];
    const CLARO  = [249, 250, 251];

    // ── Header ──────────────────────────────────────────────────
    doc.setFillColor(...VERDE);
    doc.rect(0, 0, W, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(nomeApp, MARGIN, 13);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(titulo, MARGIN, 21);
    if (nomeUsr) doc.text(nomeUsr, W - MARGIN, 21, { align: 'right' });
    y = 36;

    // ── Resumo 3 cards ─────────────────────────────────────────
    const cardW = (CONTENT - 8) / 3;
    const cardsData = [
      { label: 'Receitas', valor: receitas, cor: VERDE },
      { label: 'Despesas', valor: despesas, cor: VERM },
      { label: 'Saldo',    valor: saldo,    cor: saldo >= 0 ? VERDE : VERM },
    ];
    cardsData.forEach((c, i) => {
      const cx = MARGIN + i * (cardW + 4);
      doc.setFillColor(...CLARO);
      doc.roundedRect(cx, y, cardW, 22, 2, 2, 'F');
      doc.setTextColor(...c.cor);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(_fmt(c.valor), cx + cardW/2, y + 13, { align: 'center' });
      doc.setTextColor(...CINZA);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(c.label, cx + cardW/2, y + 19, { align: 'center' });
    });
    y += 30;

    // ── Gastos por categoria ────────────────────────────────────
    const cats = Object.entries(porCategoria).sort((a,b) => b[1]-a[1]);
    if (cats.length > 0) {
      doc.setTextColor(...ESCURO);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Gastos por Categoria', MARGIN, y);
      y += 6;

      doc.setFillColor(...CLARO);
      doc.rect(MARGIN, y, CONTENT, cats.length * 8 + 4, 'F');
      y += 4;

      const catLabel = typeof CATEGORIAS_LABEL !== 'undefined' ? CATEGORIAS_LABEL : {};
      cats.forEach(([cat, val]) => {
        const pct = despesas > 0 ? (val / despesas * 100) : 0;
        doc.setTextColor(...ESCURO);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text((catLabel[cat] || cat), MARGIN + 2, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.text(_fmt(val), W - MARGIN - 30, y + 5);
        doc.setTextColor(...CINZA);
        doc.setFont('helvetica', 'normal');
        doc.text(pct.toFixed(1) + '%', W - MARGIN - 2, y + 5, { align: 'right' });

        // Barra de progresso
        const barW = CONTENT * 0.5;
        const barX = MARGIN + 50;
        doc.setFillColor(229, 231, 235);
        doc.rect(barX, y + 1, barW, 3, 'F');
        doc.setFillColor(...VERM);
        doc.rect(barX, y + 1, barW * pct / 100, 3, 'F');

        y += 8;
      });
      y += 4;
    }

    // ── Transações do mês ───────────────────────────────────────
    if (txMes.length > 0) {
      if (y > 230) { doc.addPage(); y = MARGIN; }

      doc.setTextColor(...ESCURO);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Lançamentos do Mês (' + txMes.length + ')', MARGIN, y);
      y += 6;

      // Cabeçalho tabela
      doc.setFillColor(...ESCURO);
      doc.rect(MARGIN, y, CONTENT, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Data',       MARGIN + 2,  y + 5);
      doc.text('Descrição',  MARGIN + 20, y + 5);
      doc.text('Categoria',  MARGIN + 90, y + 5);
      doc.text('Valor',      W - MARGIN - 2, y + 5, { align: 'right' });
      y += 7;

      const catLabel = typeof CATEGORIAS_LABEL !== 'undefined' ? CATEGORIAS_LABEL : {};
      txMes.slice().sort((a,b) => (a.data||'').localeCompare(b.data||'')).forEach((t, i) => {
        if (y > 272) { doc.addPage(); y = MARGIN + 10; }
        doc.setFillColor(i % 2 === 0 ? 255 : 247, i % 2 === 0 ? 255 : 249, i % 2 === 0 ? 255 : 251);
        doc.rect(MARGIN, y, CONTENT, 7, 'F');
        doc.setTextColor(...ESCURO);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const dataLabel = (t.data || '').split('-').reverse().join('/');
        doc.text(dataLabel,                                          MARGIN + 2,  y + 5);
        doc.text((t.descricao || '').slice(0, 35),                   MARGIN + 20, y + 5);
        doc.text((catLabel[t.categoria] || t.categoria || '').slice(0,18), MARGIN + 90, y + 5);
        const valorStr = (t.tipo === 'receita' ? '+' : '-') + _fmt(t.valor);
        doc.setTextColor(...(t.tipo === 'receita' ? VERDE : VERM));
        doc.setFont('helvetica', 'bold');
        doc.text(valorStr, W - MARGIN - 2, y + 5, { align: 'right' });
        y += 7;
      });
    }

    // ── Rodapé ──────────────────────────────────────────────────
    const pages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setTextColor(...CINZA);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(
        nomeApp + ' — Gerado em ' + new Date().toLocaleDateString('pt-BR') + ' — Página ' + p + '/' + pages,
        W / 2, 292, { align: 'center' }
      );
    }

    // ── Salvar ──────────────────────────────────────────────────
    const filename = 'financaspro_' + mes + '.pdf';
    doc.save(filename);
    if (typeof mostrarToast === 'function') mostrarToast('PDF gerado: ' + filename, 'success');
  }
  window.gerarRelatorioMensal = gerarRelatorioMensal;

  // ── Botão rápido de relatório ────────────────────────────────
  function gerarRelatorioAtual() {
    const mes = (typeof mesAtual !== 'undefined' ? mesAtual : null) || new Date().toISOString().slice(0,7);
    gerarRelatorioMensal(mes);
  }
  window.gerarRelatorioAtual = gerarRelatorioAtual;

})();
