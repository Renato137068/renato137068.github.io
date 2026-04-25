// ════════════════════════════════════════════════════════════════════
// FinançasPro — Método de Orçamento 50/30/20 (P2.4)
// ════════════════════════════════════════════════════════════════════

// Mapeamento de categorias para os buckets 50/30/20
const _BUCKET_MAP = {
  // Necessidades (50%)
  'moradia':      'necessidades', 'aluguel':    'necessidades',
  'alimentacao':  'necessidades', 'saude':      'necessidades',
  'transporte':   'necessidades', 'educacao':   'necessidades',
  'agua':         'necessidades', 'energia':    'necessidades',
  'telefone':     'necessidades', 'internet':   'necessidades',
  'seguros':      'necessidades', 'remedio':    'necessidades',
  // Desejos (30%)
  'lazer':        'desejos', 'restaurante': 'desejos',
  'roupas':       'desejos', 'assinaturas': 'desejos',
  'viagem':       'desejos', 'beleza':      'desejos',
  'entretenimento':'desejos','pet':         'desejos',
  'presentes':    'desejos', 'games':       'desejos',
  // Poupança/Dívidas (20%)
  'poupanca':     'poupanca', 'investimento': 'poupanca',
  'dividas':      'poupanca', 'reserva':      'poupanca',
};

function _getBucket(categoria) {
  if (!categoria) return 'desejos';
  const c = categoria.toLowerCase().replace(/[^a-z]/g,'');
  for (const [key, bucket] of Object.entries(_BUCKET_MAP)) {
    if (c.includes(key) || key.includes(c)) return bucket;
  }
  return 'outros';
}

function calcular5030(mesAtual) {
  const renda = config.renda || 0;
  if (renda <= 0) return null;

  const m = mesAtual || doMes(getMesAtual());

  // Sugestões
  const limites = {
    necessidades: renda * 0.50,
    desejos:      renda * 0.30,
    poupanca:     renda * 0.20,
  };

  // Real gasto por bucket
  const gastos = { necessidades: 0, desejos: 0, poupanca: 0, outros: 0 };
  Object.entries(m.porCategoria).forEach(([cat, val]) => {
    const bucket = _getBucket(cat);
    gastos[bucket] = (gastos[bucket] || 0) + val;
  });

  return { limites, gastos, renda };
}

function render5030() {
  const el = document.getElementById('orc-5030-panel');
  if (!el) return;

  const renda = config.renda || 0;
  if (renda <= 0) {
    el.innerHTML = '<p class="orc-5030-hint">Configure sua renda mensal nas ⚙️ Configurações para ver a análise 50/30/20.</p>';
    return;
  }

  const dados = calcular5030();
  if (!dados) { el.style.display = 'none'; return; }

  const { limites, gastos } = dados;

  const buckets = [
    { key: 'necessidades', icon: '🏠', label: 'Necessidades',  desc: 'Moradia, alimentação, saúde, transporte',  pct: 50, cor: '#6366f1' },
    { key: 'desejos',      icon: '🎬', label: 'Desejos',       desc: 'Lazer, restaurantes, roupas, assinaturas', pct: 30, cor: '#f59e0b' },
    { key: 'poupanca',     icon: '💰', label: 'Poupança/Dívidas', desc: 'Investimentos, reserva, quitação',      pct: 20, cor: '#10b981' },
  ];

  el.innerHTML = buckets.map(b => {
    const lim   = limites[b.key];
    const gasto = gastos[b.key] || 0;
    const barPct = lim > 0 ? Math.min((gasto / lim) * 100, 100) : 0;
    const restante = lim - gasto;
    const overBudget = gasto > lim;
    return `
      <div class="orc-5030-bucket">
        <div class="orc-5030-bucket-header">
          <span class="orc-5030-bucket-icon">${b.icon}</span>
          <div class="orc-5030-bucket-info">
            <div class="orc-5030-bucket-label">${b.label} <span class="orc-5030-pct">${b.pct}%</span></div>
            <div class="orc-5030-bucket-desc">${b.desc}</div>
          </div>
          <div class="orc-5030-bucket-values">
            <div class="orc-5030-gasto ${overBudget ? 'over' : ''}">${fmt(gasto)}</div>
            <div class="orc-5030-limite">de ${fmt(lim)}</div>
          </div>
        </div>
        <div class="orc-5030-bar-bg">
          <div class="orc-5030-bar-fill" style="width:${barPct}%;background:${overBudget ? 'var(--danger)' : b.cor};"></div>
        </div>
        <div class="orc-5030-restante ${overBudget ? 'over' : 'ok'}">
          ${overBudget
            ? '⚠️ Acima do limite em ' + fmt(Math.abs(restante))
            : '✅ Ainda disponível: ' + fmt(restante)
          }
        </div>
      </div>`;
  }).join('');

  // Aviso de categorias "outros" (não classificadas)
  if (gastos.outros > 0) {
    el.innerHTML += `<div class="orc-5030-outros">ℹ️ ${fmt(gastos.outros)} em categorias não classificadas (incluídas como "Desejos" no cálculo).</div>`;
  }
}

// Expor globalmente
window.render5030 = render5030;
window.calcular5030 = calcular5030;

// ── Informações detalhadas 50/30/20 ────────────────────────────
function mostrarInfo5030() {
  const renda = (typeof config !== 'undefined' ? config.renda : 0) || 0;
  const msg = renda > 0
    ? 'Método 50/30/20:\n• 50% Necessidades: R$ ' + (renda*0.5).toLocaleString('pt-BR',{minimumFractionDigits:2}) +
      '\n• 30% Desejos: R$ ' + (renda*0.3).toLocaleString('pt-BR',{minimumFractionDigits:2}) +
      '\n• 20% Poupança/Dívidas: R$ ' + (renda*0.2).toLocaleString('pt-BR',{minimumFractionDigits:2})
    : 'Configure sua renda mensal em Configurações para usar o método 50/30/20.';
  if (typeof fpAlert === 'function') fpAlert(msg);
  else alert(msg);
}
window.mostrarInfo5030 = mostrarInfo5030;
