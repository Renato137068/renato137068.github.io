// FinançasPro — Gráficos (Chart.js)
// Depende de: config.js, dados.js

// MÓDULO H: GRÁFICOS (Chart.js)
// ════════════════════════════════════

// Variáveis de instância dos gráficos — declaradas explicitamente para evitar
// globais implícitos que quebram em strict mode e geram erros silenciosos.
let chartRecDesp = null, chartCategorias = null, chartSaldo = null, chartPatrimonio = null;
let chartPeriodo = 6;

function getMesesAnteriores(n) {
  const meses = [];
  const now = new Date();
  for (let i = n-1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    meses.push(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'));
  }
  return meses;
}

// getMesLabel está em render.js (canônica). Aqui usamos formato curto só para eixos dos gráficos.
function _getMesLabelCurto(mesStr) {
  const parts = mesStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, 1);
  return d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
}

// Pré-computa receitas e despesas por mês em uma única passagem O(n) —
// elimina múltiplos .filter() por mês que eram O(n * meses).
function _somarPorMes(meses) {
  const rec = {}, desp = {};
  meses.forEach(m => { rec[m] = 0; desp[m] = 0; });
  transacoes.forEach(t => {
    if (!t.data) return;
    const m = t.data.slice(0, 7);
    if (!(m in rec)) return;
    if (t.tipo === 'receita') rec[m] += t.valor;
    else if (t.tipo === 'despesa') desp[m] += t.valor;
  });
  return { rec, desp };
}

function setChartPeriodo(n, btn) {
  chartPeriodo = n;
  document.querySelectorAll('.chart-periodo-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderGraficos();
}

function switchEvolucao(tab, btn) {
  document.querySelectorAll('.evolucao-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const sections = ['graficos','historico','patrimonio'];
  sections.forEach(s => {
    const el = document.getElementById('evolucao-' + s);
    if (el) el.style.display = s === tab ? '' : 'none';
  });
  if (tab === 'graficos') renderGraficos();
  if (tab === 'patrimonio') renderGraficoPatrimonio();
  if (tab === 'historico') renderRetrospectiva();
}

function renderGraficos() {
  renderGraficoRecDesp();
  renderGraficoCategorias();
  renderGraficoSaldo();
}

function destroyChart(ref) {
  if (ref) { try { ref.destroy(); } catch(e) {} }
  return null;
}

function renderGraficoRecDesp() {
  const canvas = document.getElementById('chart-recdesp');
  if (!canvas) return;
  chartRecDesp = destroyChart(chartRecDesp);
  const meses = getMesesAnteriores(chartPeriodo);
  const labels = meses.map(_getMesLabelCurto);
  const { rec, desp } = _somarPorMes(meses);
  chartRecDesp = new Chart(canvas, {
    type:'bar',
    data:{
      labels,
      datasets:[
        { label:'Receitas', data:meses.map(m=>rec[m]), backgroundColor:'#16a34a', borderRadius:6 },
        { label:'Despesas', data:meses.map(m=>desp[m]), backgroundColor:'#ef4444', borderRadius:6 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom' } },
      scales:{ y:{ beginAtZero:true, ticks:{ callback:v => 'R$ '+v.toLocaleString('pt-BR') } } }
    }
  });
}

function renderGraficoCategorias() {
  const canvas = document.getElementById('chart-categorias');
  if (!canvas) return;
  chartCategorias = destroyChart(chartCategorias);
  // FIX: usa mesAtual (seleção do usuário) em vez de new Date() que ignorava
  // a navegação de mês, sempre exibindo o mês corrente no gráfico de pizza.
  const mes = mesAtual || new Date().toISOString().slice(0,7);
  const despMes = transacoes.filter(t => t.tipo==='despesa' && t.data && t.data.startsWith(mes));
  const porCat = {};
  despMes.forEach(t => { porCat[t.categoria] = (porCat[t.categoria]||0) + t.valor; });
  const entries = Object.entries(porCat).sort((a,b)=>b[1]-a[1]);
  const colors = ['#16a34a','#ef4444','#3b82f6','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'];
  chartCategorias = new Chart(canvas, {
    type:'doughnut',
    data:{
      labels: entries.map(e => getCatNome(e[0])),
      datasets:[{
        data: entries.map(e=>e[1]),
        // FIX: cores ciclam via módulo — suporta qualquer número de categorias
        // (o slice anterior deixava sem cor quando havia mais de 11 categorias).
        backgroundColor: entries.map((_,i) => colors[i % colors.length]),
        borderWidth:2, borderColor:'#fff'
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ position:'right', labels:{ boxWidth:12, font:{size:11} } },
        tooltip:{ callbacks:{ label: ctx => ' R$ '+ctx.raw.toLocaleString('pt-BR',{minimumFractionDigits:2}) } }
      }
    }
  });
}

function renderGraficoSaldo() {
  const canvas = document.getElementById('chart-saldo');
  if (!canvas) return;
  chartSaldo = destroyChart(chartSaldo);
  const meses = getMesesAnteriores(chartPeriodo);
  const labels = meses.map(_getMesLabelCurto);
  const { rec, desp } = _somarPorMes(meses);
  let saldoAcum = 0;
  const saldos = meses.map(m => {
    saldoAcum += rec[m] - desp[m];
    return saldoAcum;
  });
  chartSaldo = new Chart(canvas, {
    type:'line',
    data:{
      labels,
      datasets:[{
        label:'Saldo Acumulado',
        data:saldos,
        borderColor:'#16a34a',
        backgroundColor:'rgba(22,163,74,.1)',
        fill:true,
        tension:.4,
        pointBackgroundColor:'#16a34a',
        pointRadius:4
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{ y:{ ticks:{ callback:v=>'R$ '+v.toLocaleString('pt-BR') } } }
    }
  });
}

function renderGraficoPatrimonio() {
  const canvas = document.getElementById('chart-patrimonio');
  if (!canvas) return;
  chartPatrimonio = destroyChart(chartPatrimonio);
  // FIX: usa chartPeriodo em vez de 6 fixo — respeita a seleção de período do usuário.
  const meses = getMesesAnteriores(chartPeriodo);
  const labels = meses.map(_getMesLabelCurto);
  const { rec, desp } = _somarPorMes(meses);
  let saldoAcum = 0;
  const patrimonios = meses.map(m => {
    saldoAcum += rec[m] - desp[m];
    return saldoAcum;
  });
  chartPatrimonio = new Chart(canvas, {
    type:'line',
    data:{
      labels,
      datasets:[{
        label:'Patrimônio',
        data:patrimonios,
        borderColor:'#16a34a',
        backgroundColor:'rgba(22,163,74,.15)',
        fill:true, tension:.4,
        pointBackgroundColor:'#16a34a', pointRadius:5
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{ y:{ ticks:{ callback:v=>'R$ '+v.toLocaleString('pt-BR') } } }
    }
  });
}

//

// ── P2.9 — Gráfico Cashflow Diário ──────────────────────────────
let chartCashflow = null;

function renderGraficoCashflow() {
  const canvas = document.getElementById('chart-cashflow');
  if (!canvas) return;
  chartCashflow = destroyChart(chartCashflow);

  const mes = (typeof mesAtual !== 'undefined' ? mesAtual : null) || new Date().toISOString().slice(0,7);
  const [ano, m] = mes.split('-').map(Number);
  const diasNoMes = new Date(ano, m, 0).getDate();

  // Soma receitas e despesas por dia do mês atual
  const rec  = Array(diasNoMes).fill(0);
  const desp = Array(diasNoMes).fill(0);

  transacoes.forEach(t => {
    if (!t.data || !t.data.startsWith(mes)) return;
    const dia = parseInt(t.data.split('-')[2], 10) - 1; // 0-based
    if (dia < 0 || dia >= diasNoMes) return;
    if (t.tipo === 'receita') rec[dia]  += t.valor;
    else if (t.tipo === 'despesa') desp[dia] += t.valor;
  });

  // Saldo líquido diário acumulado
  let acum = 0;
  const saldos = rec.map((r, i) => { acum += r - desp[i]; return acum; });

  const labels = Array.from({length: diasNoMes}, (_, i) => String(i+1).padStart(2,'0'));
  const hoje   = new Date().getDate();

  chartCashflow = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Receitas',
          data: rec,
          backgroundColor: 'rgba(22,163,74,.7)',
          borderRadius: 4,
          order: 2
        },
        {
          type: 'bar',
          label: 'Despesas',
          data: desp.map(v => -v),
          backgroundColor: 'rgba(239,68,68,.7)',
          borderRadius: 4,
          order: 2
        },
        {
          type: 'line',
          label: 'Saldo Acumulado',
          data: saldos,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,.1)',
          fill: false,
          tension: .4,
          pointRadius: 3,
          pointBackgroundColor: '#3b82f6',
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const v = Math.abs(ctx.raw);
              return ' ' + ctx.dataset.label + ': R$ ' + v.toLocaleString('pt-BR', {minimumFractionDigits:2});
            }
          }
        },
        annotation: {}
      },
      scales: {
        x: {
          ticks: {
            callback: (val, i) => (i+1) % 5 === 0 || i === 0 || i === diasNoMes-1 ? labels[i] : '',
            maxRotation: 0
          },
          grid: { display: false }
        },
        y: {
          ticks: { callback: v => 'R$' + (v/1000).toFixed(0) + 'k' },
          grid: { color: 'rgba(0,0,0,.06)' }
        }
      }
    }
  });

  // Linha vertical "hoje" via plugin simples
  if (ano === new Date().getFullYear() && m === new Date().getMonth()+1) {
    const plugin = {
      id: 'todayLine',
      afterDraw(chart) {
        const idx = hoje - 1;
        if (idx < 0 || idx >= chart.data.labels.length) return;
        const x = chart.scales.x.getPixelForValue(idx);
        const ctx2 = chart.ctx;
        ctx2.save();
        ctx2.strokeStyle = '#f59e0b';
        ctx2.lineWidth = 2;
        ctx2.setLineDash([4,4]);
        ctx2.beginPath();
        ctx2.moveTo(x, chart.chartArea.top);
        ctx2.lineTo(x, chart.chartArea.bottom);
        ctx2.stroke();
        ctx2.restore();
      }
    };
    if (!chartCashflow.config.plugins) chartCashflow.config.plugins = [];
    Chart.register(plugin);
    chartCashflow.update();
  }
}
