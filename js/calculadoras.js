// FinançasPro — P3.3 Calculadoras Financeiras Brasileiras
// Reserva de Emergência, Aposentadoria, Financiamento, IR sobre Investimentos

(function() {
  'use strict';

  // ── Utilitário de formatação ─────────────────────────────────
  function _fmt(v) {
    return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  // ── 1. Reserva de Emergência ─────────────────────────────────
  function calcReserva() {
    const desp   = parseFloat(document.getElementById('cal-res-desp')?.value) || 0;
    const meses  = parseInt(document.getElementById('cal-res-meses')?.value) || 6;
    const atual  = parseFloat(document.getElementById('cal-res-atual')?.value) || 0;
    const taxa   = (parseFloat(document.getElementById('cal-res-taxa')?.value) || 8) / 100 / 12;
    const el     = document.getElementById('cal-res-resultado');
    if (!el || desp <= 0) return;

    const meta    = desp * meses;
    const faltam  = Math.max(0, meta - atual);
    const mesesPoupando = faltam > 0 && taxa > 0
      ? Math.ceil(Math.log(1 + faltam * taxa / (desp * 0.1 || 1)) / Math.log(1 + taxa))
      : 0;

    // Sugestão: guardar 10% das despesas por mês
    const aporte = desp * 0.1;
    let mPara = 0;
    if (faltam > 0 && aporte > 0) {
      let acum = atual;
      while (acum < meta && mPara < 240) {
        acum = acum * (1 + taxa) + aporte;
        mPara++;
      }
    }

    el.innerHTML =
      '<div class="calc-resultado-grid">' +
        _crCard('🎯 Meta de reserva', _fmt(meta), 'primary') +
        _crCard('✅ Você já tem', _fmt(atual), atual >= meta ? 'success' : 'warn') +
        _crCard('📉 Ainda falta', _fmt(faltam), faltam > 0 ? 'danger' : 'success') +
        (faltam > 0
          ? _crCard('📅 Guardando 10% das despesas/mês<br><small>(' + _fmt(aporte) + '/mês)</small>', mPara + ' meses', 'info')
          : _crCard('🎉 Reserva completa!', 'Parabéns!', 'success')) +
      '</div>' +
      '<p class="calc-dica">💡 Guarde na conta que rende mais: Tesouro Selic ou CDB de liquidez diária com 100%+ do CDI.</p>';
  }
  window.calcReserva = calcReserva;

  // ── 2. Calculadora de Aposentadoria ─────────────────────────
  function calcAposentadoria() {
    const idadeAtual = parseInt(document.getElementById('cal-apos-idade')?.value) || 30;
    const idadeMeta  = parseInt(document.getElementById('cal-apos-meta')?.value)  || 60;
    const rendaMensal= parseFloat(document.getElementById('cal-apos-renda')?.value)|| 0;
    const taxaAnual  = (parseFloat(document.getElementById('cal-apos-taxa')?.value) || 8) / 100;
    const patrimonioAtual = parseFloat(document.getElementById('cal-apos-atual')?.value) || 0;
    const el = document.getElementById('cal-apos-resultado');
    if (!el || rendaMensal <= 0) return;

    const anos    = Math.max(1, idadeMeta - idadeAtual);
    const meses   = anos * 12;
    const taxaMes = Math.pow(1 + taxaAnual, 1/12) - 1;

    // Patrimônio necessário (Regra dos 4%: multiplica renda anual por 25)
    const metaPatrimonio = rendaMensal * 12 * 25;

    // Valor futuro do patrimônio atual
    const vfAtual = patrimonioAtual * Math.pow(1 + taxaMes, meses);
    const faltaFuturo = Math.max(0, metaPatrimonio - vfAtual);

    // PMT necessário para cobrir o que falta
    let aporteNec = 0;
    if (faltaFuturo > 0 && taxaMes > 0) {
      aporteNec = faltaFuturo * taxaMes / (Math.pow(1 + taxaMes, meses) - 1);
    }

    el.innerHTML =
      '<div class="calc-resultado-grid">' +
        _crCard('💼 Patrimônio necessário<br><small>(Regra dos 4%)</small>', _fmt(metaPatrimonio), 'primary') +
        _crCard('📅 Anos de acumulação', anos + ' anos', 'info') +
        _crCard('💰 Aporte mensal necessário', _fmt(aporteNec), aporteNec > 0 ? 'warn' : 'success') +
        _crCard('🏦 Patrimônio ao final', _fmt(vfAtual + aporteNec * ((Math.pow(1+taxaMes,meses)-1)/taxaMes)), 'success') +
      '</div>' +
      '<p class="calc-dica">💡 A Regra dos 4%: com esse patrimônio você pode sacar 4%/ano sem acabar o dinheiro (baseado no estudo Trinity de 30 anos).</p>';
  }
  window.calcAposentadoria = calcAposentadoria;

  // ── 3. Simulador de Financiamento ────────────────────────────
  function calcFinanciamento() {
    const valor   = parseFloat(document.getElementById('cal-fin-valor')?.value) || 0;
    const entrada = parseFloat(document.getElementById('cal-fin-entrada')?.value) || 0;
    const taxaMes = (parseFloat(document.getElementById('cal-fin-taxa')?.value) || 1) / 100;
    const prazo   = parseInt(document.getElementById('cal-fin-prazo')?.value) || 60;
    const el      = document.getElementById('cal-fin-resultado');
    if (!el || valor <= 0) return;

    const principal = valor - entrada;
    if (principal <= 0) {
      el.innerHTML = '<p style="color:var(--success);text-align:center;">✅ Entrada cobre o valor total!</p>';
      return;
    }

    // SAC (Sistema de Amortização Constante)
    const amortSAC = principal / prazo;
    const primParcelaSAC = amortSAC + principal * taxaMes;
    const ultimaParcelaSAC = amortSAC + amortSAC * taxaMes;
    const totalSAC = amortSAC * prazo + principal * taxaMes * (prazo + 1) / 2;
    const jurosSAC = totalSAC - principal;

    // PRICE (parcelas iguais)
    const parcelaPRICE = principal * taxaMes * Math.pow(1 + taxaMes, prazo) / (Math.pow(1 + taxaMes, prazo) - 1);
    const totalPRICE   = parcelaPRICE * prazo;
    const jurosPRICE   = totalPRICE - principal;

    el.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '<div class="calc-sistema">' +
          '<div class="calc-sistema-titulo">📊 SAC</div>' +
          '<div class="calc-sistema-info">Parcelas decrescentes</div>' +
          _crCard('1ª parcela', _fmt(primParcelaSAC), 'warn') +
          _crCard('Última parcela', _fmt(ultimaParcelaSAC), 'success') +
          _crCard('Total de juros', _fmt(jurosSAC), 'danger') +
          _crCard('Total pago', _fmt(totalSAC), 'primary') +
        '</div>' +
        '<div class="calc-sistema">' +
          '<div class="calc-sistema-titulo">📋 PRICE</div>' +
          '<div class="calc-sistema-info">Parcelas fixas</div>' +
          _crCard('Parcela fixa', _fmt(parcelaPRICE), 'warn') +
          _crCard('Total de juros', _fmt(jurosPRICE), 'danger') +
          _crCard('Total pago', _fmt(totalPRICE), 'primary') +
          _crCard('Você paga a mais', _fmt(jurosPRICE - jurosSAC) + ' no PRICE', 'info') +
        '</div>' +
      '</div>' +
      '<p class="calc-dica">💡 SAC é sempre mais barato que PRICE. A primeira parcela é maior, mas você economiza significativamente em juros.</p>';
  }
  window.calcFinanciamento = calcFinanciamento;

  // ── 4. IR sobre Investimentos ────────────────────────────────
  function calcIR() {
    const tipo    = document.getElementById('cal-ir-tipo')?.value || 'acoes';
    const lucro   = parseFloat(document.getElementById('cal-ir-lucro')?.value) || 0;
    const prazo   = parseInt(document.getElementById('cal-ir-prazo')?.value) || 365;
    const vendas  = parseFloat(document.getElementById('cal-ir-vendas')?.value) || 0; // só para ações
    const el      = document.getElementById('cal-ir-resultado');
    if (!el) return;

    let aliquota = 0, iof = 0, baseCalculo = lucro, observacao = '';

    if (tipo === 'acoes') {
      if (vendas <= 20000) {
        aliquota = 0;
        observacao = '✅ Isenção: vendas de ações até R$ 20.000/mês são isentas de IR para pessoa física.';
      } else {
        aliquota = vendas > 20000 ? 0.15 : 0; // day-trade: 20%
        observacao = 'Vendas acima de R$ 20.000/mês: 15% sobre o lucro (operações normais).';
      }
    } else if (tipo === 'renda-fixa') {
      if (prazo <= 180)      aliquota = 0.225;
      else if (prazo <= 360) aliquota = 0.20;
      else if (prazo <= 720) aliquota = 0.175;
      else                   aliquota = 0.15;
      // IOF regressivo (dias 1-29)
      const diasIOF = [96,93,90,86,83,80,76,73,70,66,63,60,56,53,50,46,43,40,36,33,30,26,23,20,16,13,10,6,3,0];
      if (prazo < 30) iof = lucro * (diasIOF[Math.min(prazo-1, 29)] / 100) * 0.0038;
      observacao = 'Tabela regressiva de IR: ' + (aliquota*100).toFixed(1) + '% para ' + prazo + ' dias.';
    } else if (tipo === 'fii') {
      aliquota = 0.20;
      observacao = 'FIIs: rendimentos mensais isentos de IR para PF; 20% sobre ganho de capital na venda.';
    } else if (tipo === 'lci-lca') {
      aliquota = 0;
      observacao = '✅ LCI/LCA: totalmente isentas de IR para pessoa física, independente do prazo.';
    }

    const irDevido  = baseCalculo * aliquota;
    const liquido   = lucro - irDevido - iof;

    el.innerHTML =
      '<div class="calc-resultado-grid">' +
        _crCard('💰 Lucro bruto', _fmt(lucro), 'primary') +
        _crCard('📊 Alíquota IR', (aliquota * 100).toFixed(1) + '%', 'warn') +
        _crCard('🧾 IR a pagar', _fmt(irDevido), irDevido > 0 ? 'danger' : 'success') +
        _crCard('✅ Lucro líquido', _fmt(liquido), 'success') +
      '</div>' +
      '<p class="calc-dica">' + observacao + '</p>';
  }
  window.calcIR = calcIR;

  // ── Helper card ──────────────────────────────────────────────
  function _crCard(label, valor, tipo) {
    const cores = { primary:'var(--primary)', success:'var(--success)', danger:'var(--danger)',
                    warn:'var(--warning)', info:'#3b82f6' };
    return '<div class="calc-card">' +
      '<div class="calc-card-label">' + label + '</div>' +
      '<div class="calc-card-valor" style="color:' + (cores[tipo]||'var(--text-primary)') + '">' + valor + '</div>' +
    '</div>';
  }

  // ── Render tab de calculadoras ───────────────────────────────
  function renderCalculadoras() { /* panels are always visible, nothing to do */ }
  window.renderCalculadoras = renderCalculadoras;

})();
