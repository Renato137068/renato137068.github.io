(function () {
  'use strict';

  /* ─── P4.8 · Relatório Comparativo Multi-Mês + Exportação XLSX ──────── */

  /* ─── Helpers ───────────────────────────────────────────────────────── */
  function _mesesDisponiveis() {
    if (typeof transacoes === 'undefined') return [];
    const set = new Set(transacoes.map(t => (t.data || '').slice(0, 7)).filter(m => m.length === 7));
    return Array.from(set).sort().reverse();
  }

  function _dadosPorMes(mes) {
    if (typeof transacoes === 'undefined') return { receitas: 0, despesas: 0, saldo: 0, cats: {} };
    const txs = transacoes.filter(t => (t.data || '').startsWith(mes));
    const receitas = txs.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
    const despesas = txs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
    const cats = {};
    txs.filter(t => t.tipo === 'despesa').forEach(t => {
      cats[t.categoria] = (cats[t.categoria] || 0) + t.valor;
    });
    return { receitas, despesas, saldo: receitas - despesas, cats, count: txs.length };
  }

  function _labelMes(mesStr) {
    if (!mesStr) return '';
    const [ano, mes] = mesStr.split('-');
    const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return nomes[parseInt(mes) - 1] + '/' + ano.slice(2);
  }

  /* ─── Render painel ─────────────────────────────────────────────────── */
  function renderRelatorioMultimes() {
    const el = document.getElementById('relatorio-multimes-panel');
    if (!el) return;

    const meses = _mesesDisponiveis();
    if (meses.length < 2) {
      el.innerHTML = '<div class="rel-empty"><p>📊 Registre transações por pelo menos 2 meses para ver o relatório comparativo.</p></div>';
      return;
    }

    const periodoSel = document.getElementById('rel-periodo')?.value || '6';
    const nMeses = Math.min(parseInt(periodoSel), meses.length);
    const mesesSel = meses.slice(0, nMeses).reverse(); // cronológico

    const dados = mesesSel.map(m => ({ mes: m, label: _labelMes(m), ..._dadosPorMes(m) }));
    const fmt = typeof window.fmt === 'function' ? window.fmt : v => 'R$ ' + parseFloat(v).toFixed(2);

    // Totais do período
    const totRec = dados.reduce((s, d) => s + d.receitas, 0);
    const totDesp = dados.reduce((s, d) => s + d.despesas, 0);
    const totSaldo = totRec - totDesp;
    const mediaMensal = totDesp / nMeses;

    // Top categorias acumuladas
    const catsAcum = {};
    dados.forEach(d => {
      Object.entries(d.cats).forEach(([cat, val]) => {
        catsAcum[cat] = (catsAcum[cat] || 0) + val;
      });
    });
    const topCats = Object.entries(catsAcum).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Melhor e pior mês
    const melhor = dados.reduce((b, d) => d.saldo > b.saldo ? d : b, dados[0]);
    const pior = dados.reduce((b, d) => d.saldo < b.saldo ? d : b, dados[0]);

    el.innerHTML = `
      <!-- Seletor de período -->
      <div class="rel-controles">
        <select id="rel-periodo" class="form-control rel-periodo-sel" onchange="renderRelatorioMultimes()">
          <option value="3" ${periodoSel==='3'?'selected':''}>Últimos 3 meses</option>
          <option value="6" ${periodoSel==='6'?'selected':''}>Últimos 6 meses</option>
          <option value="12" ${periodoSel==='12'?'selected':''}>Últimos 12 meses</option>
          <option value="24" ${periodoSel==='24'?'selected':''}>Últimos 24 meses</option>
        </select>
        <button class="btn btn-sm btn-outline" onclick="exportarXLSX()">📊 Exportar Excel</button>
      </div>

      <!-- KPIs do período -->
      <div class="rel-kpis">
        <div class="rel-kpi">
          <div class="rel-kpi-val" style="color:var(--success)">${fmt(totRec)}</div>
          <div class="rel-kpi-label">Receitas (${nMeses}m)</div>
        </div>
        <div class="rel-kpi">
          <div class="rel-kpi-val" style="color:var(--danger)">${fmt(totDesp)}</div>
          <div class="rel-kpi-label">Despesas (${nMeses}m)</div>
        </div>
        <div class="rel-kpi">
          <div class="rel-kpi-val" style="color:${totSaldo>=0?'var(--success)':'var(--danger)'}">${fmt(totSaldo)}</div>
          <div class="rel-kpi-label">Saldo acumulado</div>
        </div>
        <div class="rel-kpi">
          <div class="rel-kpi-val">${fmt(mediaMensal)}</div>
          <div class="rel-kpi-label">Média mensal</div>
        </div>
      </div>

      <!-- Tabela comparativa -->
      <div class="rel-tabela-wrap">
        <table class="rel-tabela">
          <thead>
            <tr>
              <th>Mês</th>
              <th>Receitas</th>
              <th>Despesas</th>
              <th>Saldo</th>
              <th>Txs</th>
            </tr>
          </thead>
          <tbody>
            ${dados.map(d => `
            <tr class="${d.mes === melhor.mes ? 'rel-melhor' : ''} ${d.mes === pior.mes ? 'rel-pior' : ''}">
              <td><strong>${d.label}</strong>${d.mes===melhor.mes?' 🏆':''}${d.mes===pior.mes?' ⚠️':''}</td>
              <td style="color:var(--success)">${fmt(d.receitas)}</td>
              <td style="color:var(--danger)">${fmt(d.despesas)}</td>
              <td style="color:${d.saldo>=0?'var(--success)':'var(--danger)'};font-weight:700">${fmt(d.saldo)}</td>
              <td>${d.count}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- Gráfico de barras multi-mês via Chart.js -->
      <div class="rel-grafico-wrap">
        <canvas id="chart-multimes" height="180"></canvas>
      </div>

      <!-- Top categorias do período -->
      <div class="rel-top-cats">
        <h4 class="rel-section-titulo">🏆 Top Categorias do Período</h4>
        ${topCats.map(([cat, val]) => {
          const pct = totDesp > 0 ? (val / totDesp * 100) : 0;
          const label = (typeof CATS_BR_LABEL !== 'undefined' && CATS_BR_LABEL[cat])
            || (typeof CATEGORIAS_LABEL !== 'undefined' && CATEGORIAS_LABEL[cat]) || cat;
          return `
          <div class="rel-cat-row">
            <div class="rel-cat-nome">${label}</div>
            <div class="rel-cat-bar-track"><div class="rel-cat-bar-fill" style="width:${pct}%"></div></div>
            <div class="rel-cat-val">${fmt(val)} (${pct.toFixed(0)}%)</div>
          </div>`;
        }).join('')}
      </div>
    `;

    // Renderizar gráfico Chart.js
    setTimeout(() => _renderGraficoMultimes(dados), 100);
  }

  function _renderGraficoMultimes(dados) {
    const canvas = document.getElementById('chart-multimes');
    if (!canvas || typeof Chart === 'undefined') return;
    if (canvas._chartInst) canvas._chartInst.destroy();

    canvas._chartInst = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: dados.map(d => d.label),
        datasets: [
          {
            label: 'Receitas',
            data: dados.map(d => d.receitas),
            backgroundColor: 'rgba(34,197,94,0.7)',
            borderRadius: 6
          },
          {
            label: 'Despesas',
            data: dados.map(d => d.despesas),
            backgroundColor: 'rgba(239,68,68,0.7)',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: { ticks: { callback: v => 'R$ ' + (v >= 1000 ? (v/1000).toFixed(1) + 'k' : v) } }
        }
      }
    });
  }

  /* ─── Exportação XLSX via SheetJS ───────────────────────────────────── */
  async function exportarXLSX() {
    // Carregar SheetJS dinamicamente
    if (typeof XLSX === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      document.head.appendChild(script);
      await new Promise(r => { script.onload = r; script.onerror = r; });
    }

    if (typeof XLSX === 'undefined') {
      if (typeof showToast === 'function') showToast('⚠️ Não foi possível carregar SheetJS', 'warning');
      return;
    }

    if (typeof transacoes === 'undefined' || transacoes.length === 0) {
      if (typeof showToast === 'function') showToast('⚠️ Nenhuma transação para exportar', 'warning');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Aba 1: Transações completas
    const txRows = transacoes.map(t => ({
      Data: t.data || '',
      Tipo: t.tipo || '',
      Descrição: t.descricao || '',
      Categoria: (typeof CATS_BR_LABEL !== 'undefined' && CATS_BR_LABEL[t.categoria]) || t.categoria || '',
      Valor: t.tipo === 'despesa' ? -t.valor : t.valor,
      Conta: t.conta || '',
      Tag: t.tag || ''
    }));
    const ws1 = XLSX.utils.json_to_sheet(txRows);
    ws1['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 35 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Transações');

    // Aba 2: Resumo mensal
    const meses = _mesesDisponiveis();
    const resumoRows = meses.map(m => {
      const d = _dadosPorMes(m);
      return { Mês: _labelMes(m), Receitas: d.receitas, Despesas: d.despesas, Saldo: d.saldo, Transações: d.count };
    });
    const ws2 = XLSX.utils.json_to_sheet(resumoRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumo Mensal');

    // Aba 3: Por categoria (acumulado)
    const catsAcum = {};
    transacoes.filter(t => t.tipo === 'despesa').forEach(t => {
      catsAcum[t.categoria] = (catsAcum[t.categoria] || 0) + t.valor;
    });
    const catRows = Object.entries(catsAcum).sort((a, b) => b[1] - a[1]).map(([cat, val]) => ({
      Categoria: (typeof CATS_BR_LABEL !== 'undefined' && CATS_BR_LABEL[cat]) || cat,
      'Total Gasto': val,
      '% do Total': (val / Object.values(catsAcum).reduce((s, v) => s + v, 0) * 100).toFixed(1) + '%'
    }));
    const ws3 = XLSX.utils.json_to_sheet(catRows);
    XLSX.utils.book_append_sheet(wb, ws3, 'Por Categoria');

    const fileName = 'FinancasPro_' + new Date().toISOString().slice(0, 10) + '.xlsx';
    XLSX.writeFile(wb, fileName);
    if (typeof showToast === 'function') showToast('📊 Excel exportado: ' + fileName, 'success');
  }

  window.renderRelatorioMultimes = renderRelatorioMultimes;
  window.exportarXLSX = exportarXLSX;

})();
