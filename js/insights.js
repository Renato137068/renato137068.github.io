(function () {
  'use strict';

  /* ─── P4.4 · Insights de IA Preditiva de Gastos ─────────────────────── */

  const STORE_KEY = 'fp_insights_cache';
  const CACHE_TTL = 3600000; // 1h

  let _cache = null;

  function _loadCache() {
    try {
      const c = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      if (c.ts && Date.now() - c.ts < CACHE_TTL) { _cache = c.data; return true; }
    } catch(e) {}
    return false;
  }

  function _saveCache(data) {
    _cache = data;
    localStorage.setItem(STORE_KEY, JSON.stringify({ ts: Date.now(), data }));
  }

  /* ─── Motor de análise ──────────────────────────────────────────────── */
  function _analisar() {
    if (typeof transacoes === 'undefined' || !transacoes.length) return null;

    const hoje = new Date();
    const mesAtualStr = typeof mesAtual !== 'undefined' ? mesAtual
      : hoje.toISOString().slice(0, 7);
    const [anoAtual, mesNum] = mesAtualStr.split('-').map(Number);
    const fmt = typeof window.fmt === 'function' ? window.fmt : v => 'R$ ' + parseFloat(v).toFixed(2);

    // Agrupar transações por mês
    const porMes = {};
    transacoes.forEach(t => {
      const m = (t.data || '').slice(0, 7);
      if (!m) return;
      if (!porMes[m]) porMes[m] = { receitas: 0, despesas: 0, cats: {}, txs: [] };
      if (t.tipo === 'receita') porMes[m].receitas += t.valor;
      else {
        porMes[m].despesas += t.valor;
        porMes[m].cats[t.categoria] = (porMes[m].cats[t.categoria] || 0) + t.valor;
      }
      porMes[m].txs.push(t);
    });

    const mesesOrdenados = Object.keys(porMes).sort();
    const ultimosMeses = mesesOrdenados.filter(m => m < mesAtualStr).slice(-6);

    if (ultimosMeses.length < 2) return null;

    const insights = [];
    const alertas = [];
    const previsoes = {};

    // 1. Previsão de fechamento do mês
    const txMesAtual = transacoes.filter(t => (t.data || '').startsWith(mesAtualStr));
    if (txMesAtual.length > 0) {
      const diaAtual = hoje.getDate();
      const diasNoMes = new Date(anoAtual, mesNum, 0).getDate();
      const despAtual = txMesAtual.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
      const recAtual = txMesAtual.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);

      if (diaAtual > 0 && diasNoMes > diaAtual) {
        const taxaDiaria = despAtual / diaAtual;
        const prevFechamento = taxaDiaria * diasNoMes;
        previsoes.despesaFechamento = prevFechamento;
        previsoes.despesaAtual = despAtual;
        previsoes.diasRestantes = diasNoMes - diaAtual;

        const mediaMeses = ultimosMeses.reduce((s, m) => s + (porMes[m]?.despesas || 0), 0) / ultimosMeses.length;
        const pctMedia = mediaMeses > 0 ? ((prevFechamento / mediaMeses - 1) * 100) : 0;

        if (pctMedia > 15) {
          alertas.push({
            tipo: 'alerta',
            icone: '⚠️',
            titulo: 'Tendência de gasto alto',
            desc: `No ritmo atual, você deve gastar ${fmt(prevFechamento)} este mês — ${Math.round(pctMedia)}% acima da sua média de ${fmt(mediaMeses)}.`
          });
        } else if (pctMedia < -15) {
          insights.push({
            tipo: 'positivo',
            icone: '🎉',
            titulo: 'Mês mais econômico!',
            desc: `No ritmo atual, você deve gastar ${fmt(prevFechamento)} — ${Math.round(Math.abs(pctMedia))}% abaixo da sua média de ${fmt(mediaMeses)}.`
          });
        }
      }
    }

    // 2. Detectar gastos sazonais (categorias que costumam aparecer neste mês)
    const mesNumStr = String(mesNum).padStart(2, '0');
    const mesesMesmoNum = mesesOrdenados.filter(m => m.endsWith('-' + mesNumStr) && m < mesAtualStr);
    if (mesesMesmoNum.length > 0) {
      // Categorias que aparecem em todos os anos anteriores neste mês
      const catsMesAnterior = {};
      mesesMesmoNum.forEach(m => {
        Object.entries(porMes[m]?.cats || {}).forEach(([cat, val]) => {
          if (!catsMesAnterior[cat]) catsMesAnterior[cat] = [];
          catsMesAnterior[cat].push(val);
        });
      });
      Object.entries(catsMesAnterior).forEach(([cat, vals]) => {
        const media = vals.reduce((s, v) => s + v, 0) / vals.length;
        const jaGastou = txMesAtual.filter(t => t.categoria === cat && t.tipo === 'despesa').reduce((s,t) => s+t.valor, 0);
        if (!jaGastou && media > 50) {
          const catLabel = (typeof CATS_BR_LABEL !== 'undefined' && CATS_BR_LABEL[cat])
            || (typeof CATEGORIAS_LABEL !== 'undefined' && CATEGORIAS_LABEL[cat])
            || cat;
          insights.push({
            tipo: 'lembrete',
            icone: '📌',
            titulo: 'Gasto recorrente esperado',
            desc: `Você costuma ter gastos com ${catLabel} neste mês (média: ${fmt(media)}). Nada registrado ainda.`
          });
        }
      });
    }

    // 3. Top categoria com aumento acima do normal
    if (ultimosMeses.length >= 3) {
      const mediasCats = {};
      ultimosMeses.slice(0, -1).forEach(m => {
        Object.entries(porMes[m]?.cats || {}).forEach(([cat, val]) => {
          if (!mediasCats[cat]) mediasCats[cat] = [];
          mediasCats[cat].push(val);
        });
      });
      const ultimoMes = ultimosMeses[ultimosMeses.length - 1];
      Object.entries(porMes[ultimoMes]?.cats || {}).forEach(([cat, val]) => {
        const hist = mediasCats[cat];
        if (!hist || hist.length < 2) return;
        const media = hist.reduce((s, v) => s + v, 0) / hist.length;
        const pct = media > 0 ? ((val / media - 1) * 100) : 0;
        if (pct > 40 && val > 100) {
          const catLabel = (typeof CATS_BR_LABEL !== 'undefined' && CATS_BR_LABEL[cat])
            || (typeof CATEGORIAS_LABEL !== 'undefined' && CATEGORIAS_LABEL[cat])
            || cat;
          alertas.push({
            tipo: 'alerta',
            icone: '📊',
            titulo: `Pico em ${catLabel}`,
            desc: `No mês passado você gastou ${fmt(val)} com ${catLabel} — ${Math.round(pct)}% acima da sua média (${fmt(media)}).`
          });
        }
      });
    }

    // 4. Sequência de meses com saldo positivo
    const saldosPositivos = ultimosMeses.filter(m => (porMes[m]?.receitas || 0) > (porMes[m]?.despesas || 0)).length;
    if (saldosPositivos === ultimosMeses.length && ultimosMeses.length >= 3) {
      insights.push({
        tipo: 'positivo',
        icone: '🏆',
        titulo: `${ultimosMeses.length} meses no azul!`,
        desc: `Incrível! Você encerrou os últimos ${ultimosMeses.length} meses com saldo positivo. Continue assim!`
      });
    }

    // 5. Sugestão de economia
    if (ultimosMeses.length >= 3) {
      const mediaReceitas = ultimosMeses.reduce((s, m) => s + (porMes[m]?.receitas || 0), 0) / ultimosMeses.length;
      const mediaDespesas = ultimosMeses.reduce((s, m) => s + (porMes[m]?.despesas || 0), 0) / ultimosMeses.length;
      const taxaPoupanca = mediaReceitas > 0 ? ((mediaReceitas - mediaDespesas) / mediaReceitas) * 100 : 0;

      if (taxaPoupanca >= 20) {
        insights.push({
          tipo: 'positivo',
          icone: '💪',
          titulo: `Taxa de poupança: ${Math.round(taxaPoupanca)}%`,
          desc: `Você poupa ${Math.round(taxaPoupanca)}% da sua renda nos últimos ${ultimosMeses.length} meses. Acima de 20% é excelente!`
        });
      } else if (taxaPoupanca < 5 && taxaPoupanca >= 0) {
        alertas.push({
          tipo: 'atencao',
          icone: '💡',
          titulo: 'Taxa de poupança baixa',
          desc: `Você está poupando apenas ${Math.round(taxaPoupanca)}% da sua renda. O ideal é pelo menos 10–20%. Revise suas maiores despesas.`
        });
      }
    }

    // 6. Categoria com maior participação
    const catsMesAtual = {};
    txMesAtual.filter(t => t.tipo === 'despesa').forEach(t => {
      catsMesAtual[t.categoria] = (catsMesAtual[t.categoria] || 0) + t.valor;
    });
    const topCat = Object.entries(catsMesAtual).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
      const totalDesp = Object.values(catsMesAtual).reduce((s, v) => s + v, 0);
      const pctCat = totalDesp > 0 ? (topCat[1] / totalDesp * 100) : 0;
      const catLabel = (typeof CATS_BR_LABEL !== 'undefined' && CATS_BR_LABEL[topCat[0]])
        || (typeof CATEGORIAS_LABEL !== 'undefined' && CATEGORIAS_LABEL[topCat[0]])
        || topCat[0];
      if (pctCat > 40) {
        alertas.push({
          tipo: 'info',
          icone: '📈',
          titulo: `${catLabel} concentra ${Math.round(pctCat)}% dos gastos`,
          desc: `${fmt(topCat[1])} em ${catLabel} este mês. Vale a pena revisar se há oportunidade de redução.`
        });
      }
    }

    return { insights, alertas, previsoes, geradoEm: new Date().toISOString() };
  }

  /* ─── Render ────────────────────────────────────────────────────────── */
  function renderInsights() {
    const el = document.getElementById('insights-panel');
    if (!el) return;

    const dados = _analisar();
    if (!dados) {
      el.innerHTML = '<div class="insights-vazio"><p>📊 Registre transações por pelo menos 2 meses para ativar os insights preditivos.</p></div>';
      return;
    }

    const todos = [...dados.alertas, ...dados.insights];
    if (todos.length === 0) {
      el.innerHTML = '<div class="insights-vazio"><p>✅ Tudo em ordem! Nenhum insight especial para este período.</p></div>';
      return;
    }

    const fmt = typeof window.fmt === 'function' ? window.fmt : v => 'R$ ' + parseFloat(v).toFixed(2);

    let html = '';

    // Card de previsão de fechamento
    if (dados.previsoes.despesaFechamento) {
      const p = dados.previsoes;
      html += `
      <div class="insight-previsao-card">
        <div class="insight-prev-titulo">📅 Previsão de fechamento do mês</div>
        <div class="insight-prev-vals">
          <div class="insight-prev-item">
            <div class="insight-prev-label">Gasto até hoje</div>
            <div class="insight-prev-val">${fmt(p.despesaAtual)}</div>
          </div>
          <div class="insight-prev-seta">→</div>
          <div class="insight-prev-item">
            <div class="insight-prev-label">Previsão final</div>
            <div class="insight-prev-val insight-prev-dest">${fmt(p.despesaFechamento)}</div>
          </div>
        </div>
        <div class="insight-prev-dias">${p.diasRestantes} dias restantes no mês</div>
      </div>`;
    }

    // Alertas
    dados.alertas.forEach(a => {
      html += `
      <div class="insight-card insight-alerta">
        <div class="insight-card-icon">${a.icone}</div>
        <div class="insight-card-body">
          <div class="insight-card-titulo">${a.titulo}</div>
          <div class="insight-card-desc">${a.desc}</div>
        </div>
      </div>`;
    });

    // Positivos
    dados.insights.forEach(i => {
      html += `
      <div class="insight-card insight-positivo">
        <div class="insight-card-icon">${i.icone}</div>
        <div class="insight-card-body">
          <div class="insight-card-titulo">${i.titulo}</div>
          <div class="insight-card-desc">${i.desc}</div>
        </div>
      </div>`;
    });

    html += `<div class="insight-rodape">Gerado em ${new Date(dados.geradoEm).toLocaleString('pt-BR')}</div>`;
    el.innerHTML = html;
  }

  /* ─── Dashboard: mini insights ──────────────────────────────────────── */
  function renderMiniInsights() {
    const el = document.getElementById('mini-insights');
    if (!el) return;
    const dados = _analisar();
    if (!dados || !dados.alertas.length) { el.style.display = 'none'; return; }
    const primeiro = dados.alertas[0];
    el.style.display = '';
    el.innerHTML = `
      <div class="mini-insight-item">
        <span class="mini-insight-icon">${primeiro.icone}</span>
        <span class="mini-insight-texto">${primeiro.titulo}: ${primeiro.desc}</span>
      </div>`;
  }

  window.renderInsights = renderInsights;
  window.renderMiniInsights = renderMiniInsights;
  window._analisarInsights = _analisar;

})();
