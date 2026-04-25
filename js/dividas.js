// FinançasPro — P2.1 Módulo de Gestão de Dívidas
// Métodos: Bola de Neve (menor saldo primeiro) e Avalanche (maior juro primeiro)
// Persiste em localStorage com chave 'fp_dividas'

(function() {
  'use strict';

  // ── Dados ───────────────────────────────────────────────────
  let _dividas = [];
  const _STORAGE_KEY = 'fp_dividas';

  function _carregar() {
    try { _dividas = JSON.parse(localStorage.getItem(_STORAGE_KEY) || '[]'); }
    catch(e) { _dividas = []; }
  }

  function _salvar() {
    localStorage.setItem(_STORAGE_KEY, JSON.stringify(_dividas));
  }

  // ── CRUD ────────────────────────────────────────────────────
  function adicionarDivida(nome, saldo, taxa, pagamentoMin) {
    const nova = {
      id: Date.now(),
      nome: nome,
      saldo: parseFloat(saldo) || 0,
      taxa: parseFloat(taxa) || 0,      // % ao mês
      pagamentoMin: parseFloat(pagamentoMin) || 0,
      criadaEm: new Date().toISOString()
    };
    _dividas.push(nova);
    _salvar();
    renderDividas();
    fecharModalDivida();
    if (typeof mostrarToast === 'function') mostrarToast('Dívida adicionada!', 'success');
  }
  window.adicionarDivida = adicionarDivida;

  function removerDivida(id) {
    if (typeof fpConfirm === 'function') {
      fpConfirm('Remover esta dívida?', () => {
        _dividas = _dividas.filter(d => d.id !== id);
        _salvar();
        renderDividas();
      });
    } else {
      _dividas = _dividas.filter(d => d.id !== id);
      _salvar();
      renderDividas();
    }
  }
  window.removerDivida = removerDivida;

  function pagarDivida(id) {
    const d = _dividas.find(d => d.id === id);
    if (!d) return;
    const pgto = parseFloat(prompt('Valor pago (mínimo R$ ' + d.pagamentoMin.toFixed(2) + '):', d.pagamentoMin)) || 0;
    if (pgto <= 0) return;
    // Juros do mês aplicados antes do pagamento
    const juros = d.saldo * (d.taxa / 100);
    d.saldo = Math.max(0, d.saldo + juros - pgto);
    if (d.saldo === 0) {
      if (typeof mostrarToast === 'function') mostrarToast('🎉 Dívida ' + d.nome + ' quitada!', 'achievement');
      _dividas = _dividas.filter(x => x.id !== id);
    }
    _salvar();
    renderDividas();
  }
  window.pagarDivida = pagarDivida;

  // ── Simulação ───────────────────────────────────────────────
  function _simular(metodo, extraPorMes) {
    if (_dividas.length === 0) return [];
    let divs = _dividas.map(d => ({ ...d })); // cópia profunda
    const extra = parseFloat(extraPorMes) || 0;

    // Ordenar conforme método
    if (metodo === 'avalanche') {
      divs.sort((a, b) => b.taxa - a.taxa);
    } else {
      divs.sort((a, b) => a.saldo - b.saldo); // bola de neve
    }

    const plan = [];
    let mes = 0;
    const MAX_MESES = 360;

    while (divs.some(d => d.saldo > 0) && mes < MAX_MESES) {
      mes++;
      // Juros mensais
      divs.forEach(d => { d.saldo += d.saldo * (d.taxa / 100); });
      // Pagamento mínimo em todas
      divs.forEach(d => {
        const pgto = Math.min(d.pagamentoMin, d.saldo);
        d.saldo -= pgto;
      });
      // Dinheiro extra na primeira dívida da lista ainda com saldo
      let sobra = extra;
      for (const d of divs) {
        if (d.saldo > 0 && sobra > 0) {
          const pgto = Math.min(sobra, d.saldo);
          d.saldo -= pgto;
          sobra -= pgto;
        }
      }
      // Remover quitadas
      divs = divs.filter(d => d.saldo > 0);
      plan.push({ mes, restantes: divs.length, totalSaldo: divs.reduce((s, d) => s + d.saldo, 0) });
    }
    return plan;
  }

  // ── Render ──────────────────────────────────────────────────
  let _metodo = 'bolaneve';

  function setMetodoDivida(m, btn) {
    _metodo = m;
    document.querySelectorAll('.divida-metodo-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderDividas();
  }
  window.setMetodoDivida = setMetodoDivida;

  function renderDividas() {
    const panel = document.getElementById('dividas-panel');
    if (!panel) return;

    if (_dividas.length === 0) {
      panel.innerHTML =
        '<div class="divida-empty">' +
        '<div style="font-size:2.5rem;margin-bottom:8px;">🎉</div>' +
        '<p style="color:var(--text-secondary);">Nenhuma dívida cadastrada.<br>Adicione para começar o plano!</p>' +
        '</div>';
      const sim = document.getElementById('dividas-simulacao');
      if (sim) sim.style.display = 'none';
      return;
    }

    // Ordenar
    const sorted = [..._dividas].sort((a, b) =>
      _metodo === 'avalanche' ? b.taxa - a.taxa : a.saldo - b.saldo
    );

    const totalSaldo = _dividas.reduce((s, d) => s + d.saldo, 0);
    const jurosTotal  = _dividas.reduce((s, d) => s + d.saldo * (d.taxa / 100), 0);

    panel.innerHTML =
      '<div class="divida-resumo">' +
        '<div class="divida-resumo-item"><span>Total em dívidas</span><strong style="color:var(--danger);">R$ ' +
        totalSaldo.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</strong></div>' +
        '<div class="divida-resumo-item"><span>Juros/mês estimado</span><strong style="color:var(--warning);">R$ ' +
        jurosTotal.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '</strong></div>' +
      '</div>' +
      '<div class="divida-list">' +
      sorted.map((d, i) => {
        const pct = Math.min(100, Math.round((1 - d.saldo / Math.max(d.saldo, 1)) * 100));
        const ordem = i === 0 ? ' <span class="divida-prioridade">🎯 Foco</span>' : '';
        return '<div class="divida-card">' +
          '<div class="divida-card-header">' +
            '<span class="divida-nome">' + escHtml(d.nome) + ordem + '</span>' +
            '<button class="btn btn-sm btn-danger" onclick="removerDivida(' + d.id + ')" aria-label="Remover dívida">🗑️</button>' +
          '</div>' +
          '<div class="divida-info">' +
            '<span>Saldo: <strong>R$ ' + d.saldo.toLocaleString('pt-BR',{minimumFractionDigits:2}) + '</strong></span>' +
            '<span>Taxa: <strong>' + d.taxa.toFixed(1) + '% a.m.</strong></span>' +
            '<span>Mín/mês: <strong>R$ ' + d.pagamentoMin.toFixed(2).replace('.',',') + '</strong></span>' +
          '</div>' +
          '<div class="divida-bar-bg"><div class="divida-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<button class="btn btn-sm btn-outline" style="width:100%;margin-top:8px;" onclick="pagarDivida(' + d.id + ')">💳 Registrar Pagamento</button>' +
        '</div>';
      }).join('') +
      '</div>';

    // Simulação
    _renderSimulacao();
  }
  window.renderDividas = renderDividas;

  function _renderSimulacao() {
    const extra = parseFloat((document.getElementById('dividas-extra-input') || {}).value) || 0;
    const plan  = _simular(_metodo, extra);
    const sim   = document.getElementById('dividas-simulacao');
    if (!sim) return;
    sim.style.display = '';

    if (plan.length === 0) { sim.innerHTML = ''; return; }

    const meses = plan.length;
    const anos  = Math.floor(meses / 12);
    const resto = meses % 12;
    const tempo = anos > 0 ? anos + ' ano(s) e ' + resto + ' mês(es)' : meses + ' mês(es)';

    sim.innerHTML =
      '<div class="divida-sim-header">📊 Projeção — ' +
        (_metodo === 'avalanche' ? 'Avalanche (maior juro primeiro)' : 'Bola de Neve (menor saldo primeiro)') +
      '</div>' +
      '<div class="divida-sim-resultado">' +
        '<div class="divida-sim-item">' +
          '<span class="divida-sim-label">Tempo para quitar tudo</span>' +
          '<span class="divida-sim-valor" style="color:var(--success);">' + tempo + '</span>' +
        '</div>' +
        '<div class="divida-sim-item">' +
          '<span class="divida-sim-label">Total de meses</span>' +
          '<span class="divida-sim-valor">' + meses + '</span>' +
        '</div>' +
      '</div>' +
      '<p class="divida-sim-tip">' +
        '💡 ' + (_metodo === 'avalanche'
          ? 'Avalanche economiza mais em juros no total.'
          : 'Bola de Neve gera vitórias rápidas e motivação.') +
      '</p>';
  }

  function atualizarSimulacao() { _renderSimulacao(); }
  window.atualizarSimulacao = atualizarSimulacao;

  // ── Modal de adição ─────────────────────────────────────────
  function abrirModalDivida() {
    const m = document.getElementById('modal-nova-divida');
    if (m) { m.style.display = 'flex'; requestAnimationFrame(() => m.classList.add('open')); }
  }
  window.abrirModalDivida = abrirModalDivida;

  function fecharModalDivida() {
    const m = document.getElementById('modal-nova-divida');
    if (!m) return;
    m.classList.remove('open');
    setTimeout(() => { m.style.display = 'none'; }, 280);
    ['divida-nome-input','divida-saldo-input','divida-taxa-input','divida-min-input']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  }
  window.fecharModalDivida = fecharModalDivida;

  function salvarNovaDivida() {
    const nome  = (document.getElementById('divida-nome-input')?.value || '').trim();
    const saldo = document.getElementById('divida-saldo-input')?.value;
    const taxa  = document.getElementById('divida-taxa-input')?.value;
    const min   = document.getElementById('divida-min-input')?.value;
    if (!nome) { if (typeof mostrarToast==='function') mostrarToast('Informe o nome da dívida.','warn'); return; }
    if (!saldo || parseFloat(saldo) <= 0) { if (typeof mostrarToast==='function') mostrarToast('Saldo inválido.','warn'); return; }
    adicionarDivida(nome, saldo, taxa, min);
  }
  window.salvarNovaDivida = salvarNovaDivida;

  // ── Helpers ─────────────────────────────────────────────────
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Init ────────────────────────────────────────────────────
  function _init() {
    _carregar();
    renderDividas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
