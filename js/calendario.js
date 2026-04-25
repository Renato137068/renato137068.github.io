// FinançasPro — P2.2 Calendário Financeiro Mensal
// Exibe transações por dia + alertas de vencimento futuros
// Persiste vencimentos em localStorage: 'fp_vencimentos'

(function() {
  'use strict';

  let _calMes = null;       // 'YYYY-MM' — mês exibido
  let _vencimentos = [];    // [{id, descricao, dia, tipo, valor, recorrente}]
  const _STORAGE_KEY = 'fp_vencimentos';

  // ── Persistência ────────────────────────────────────────────
  function _carregarVenc() {
    try { _vencimentos = JSON.parse(localStorage.getItem(_STORAGE_KEY) || '[]'); }
    catch(e) { _vencimentos = []; }
  }

  function _salvarVenc() {
    localStorage.setItem(_STORAGE_KEY, JSON.stringify(_vencimentos));
  }

  // ── Navegação de mês ────────────────────────────────────────
  function calNavMes(delta) {
    const [a, m] = (_calMes || new Date().toISOString().slice(0,7)).split('-').map(Number);
    const d = new Date(a, m - 1 + delta, 1);
    _calMes = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    renderCalendario();
  }
  window.calNavMes = calNavMes;

  // ── Render principal ────────────────────────────────────────
  function renderCalendario() {
    const panel = document.getElementById('calendario-panel');
    if (!panel) return;

    if (!_calMes) _calMes = new Date().toISOString().slice(0,7);
    const [ano, mes] = _calMes.split('-').map(Number);

    const primeiroDia = new Date(ano, mes-1, 1).getDay(); // 0=Dom
    const diasNoMes   = new Date(ano, mes, 0).getDate();
    const hoje        = new Date();
    const ehMesAtual  = hoje.getFullYear() === ano && hoje.getMonth()+1 === mes;
    const diaHoje     = ehMesAtual ? hoje.getDate() : -1;

    // Agrupar transações por dia
    const txPorDia = {};
    (typeof transacoes !== 'undefined' ? transacoes : []).forEach(t => {
      if (!t.data || !t.data.startsWith(_calMes)) return;
      const dia = parseInt(t.data.split('-')[2], 10);
      if (!txPorDia[dia]) txPorDia[dia] = [];
      txPorDia[dia].push(t);
    });

    // Agrupar vencimentos por dia
    const vencPorDia = {};
    _vencimentos.forEach(v => {
      const d = v.dia;
      if (!vencPorDia[d]) vencPorDia[d] = [];
      vencPorDia[d].push(v);
    });

    const nomeMes = new Date(ano, mes-1, 1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    const diaSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

    let html = '<div class="cal-header">' +
      '<button class="btn btn-outline btn-sm" onclick="calNavMes(-1)" aria-label="Mês anterior">◀</button>' +
      '<span class="cal-titulo">' + nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1) + '</span>' +
      '<button class="btn btn-outline btn-sm" onclick="calNavMes(1)" aria-label="Próximo mês">▶</button>' +
    '</div>' +
    '<div class="cal-grid">';

    // Cabeçalho dos dias da semana
    diaSemana.forEach(d => {
      html += '<div class="cal-dow">' + d + '</div>';
    });

    // Células vazias antes do primeiro dia
    for (let i = 0; i < primeiroDia; i++) {
      html += '<div class="cal-cell cal-cell-vazio"></div>';
    }

    // Dias do mês
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const txs  = txPorDia[dia] || [];
      const vencs = vencPorDia[dia] || [];
      const rec   = txs.filter(t => t.tipo === 'receita').reduce((s,t) => s+t.valor, 0);
      const desp  = txs.filter(t => t.tipo === 'despesa').reduce((s,t) => s+t.valor, 0);
      const hasVenc = vencs.length > 0;
      const isHoje = dia === diaHoje;
      const isFuturo = ehMesAtual && dia > diaHoje;

      let cls = 'cal-cell';
      if (isHoje) cls += ' cal-hoje';
      if (isFuturo && hasVenc) cls += ' cal-vencimento';

      html += '<div class="' + cls + '" onclick="verDiaCalendario(' + dia + ')">' +
        '<span class="cal-dia-num">' + dia + '</span>';

      if (rec > 0)  html += '<span class="cal-dot cal-dot-rec" title="Receita: R$' + rec.toFixed(0) + '"></span>';
      if (desp > 0) html += '<span class="cal-dot cal-dot-desp" title="Despesa: R$' + desp.toFixed(0) + '"></span>';
      if (hasVenc)  html += '<span class="cal-dot cal-dot-venc" title="Vencimento"></span>';

      html += '</div>';
    }

    html += '</div>';

    // Legenda
    html += '<div class="cal-legenda">' +
      '<span><span class="cal-dot cal-dot-rec"></span> Receita</span>' +
      '<span><span class="cal-dot cal-dot-desp"></span> Despesa</span>' +
      '<span><span class="cal-dot cal-dot-venc"></span> Vencimento</span>' +
    '</div>';

    // Próximos vencimentos
    html += _renderProximosVenc(ano, mes, diaHoje);

    panel.innerHTML = html;
  }
  window.renderCalendario = renderCalendario;

  function _renderProximosVenc(ano, mes, diaHoje) {
    if (_vencimentos.length === 0) return '';
    const ehMesAtual = diaHoje > 0;
    const proximos = _vencimentos
      .filter(v => !ehMesAtual || v.dia >= diaHoje)
      .sort((a, b) => a.dia - b.dia);

    if (proximos.length === 0) return '';

    return '<div class="venc-lista-header">📋 Próximos Vencimentos</div>' +
      '<div class="venc-lista">' +
      proximos.map(v => {
        const diasRestantes = ehMesAtual ? v.dia - diaHoje : v.dia;
        const urgente = diasRestantes >= 0 && diasRestantes <= 3;
        return '<div class="venc-item ' + (urgente ? 'venc-urgente' : '') + '">' +
          '<div class="venc-item-info">' +
            '<span class="venc-dia">Dia ' + v.dia + '</span>' +
            '<span class="venc-nome">' + escHtml(v.descricao) + '</span>' +
            (v.valor ? '<span class="venc-valor">R$ ' + parseFloat(v.valor).toFixed(2).replace('.',',') + '</span>' : '') +
          '</div>' +
          '<button class="btn btn-sm btn-danger" onclick="removerVencimento(' + v.id + ')" aria-label="Remover vencimento">✕</button>' +
        '</div>';
      }).join('') +
      '</div>';
  }

  // ── Detalhe do dia ──────────────────────────────────────────
  function verDiaCalendario(dia) {
    if (!_calMes) return;
    const data = _calMes + '-' + String(dia).padStart(2,'0');
    const txs  = (typeof transacoes !== 'undefined' ? transacoes : []).filter(t => t.data === data);
    const vencs = _vencimentos.filter(v => v.dia === dia);

    let msg = '📅 ' + dia + '/' + _calMes.split('-')[1] + '/' + _calMes.split('-')[0] + '\n\n';
    if (txs.length > 0) {
      msg += 'Transações:\n';
      txs.forEach(t => {
        msg += (t.tipo === 'receita' ? '▲' : '▼') + ' ' + (t.descricao || '') + ': R$ ' + (t.valor||0).toFixed(2) + '\n';
      });
    }
    if (vencs.length > 0) {
      msg += '\nVencimentos:\n';
      vencs.forEach(v => { msg += '• ' + v.descricao + (v.valor ? ' (R$ ' + parseFloat(v.valor).toFixed(2) + ')' : '') + '\n'; });
    }
    if (txs.length === 0 && vencs.length === 0) msg += 'Nenhum registro neste dia.';
    if (typeof fpAlert === 'function') fpAlert(msg, '📅');
    else alert(msg);
  }
  window.verDiaCalendario = verDiaCalendario;

  // ── CRUD vencimentos ────────────────────────────────────────
  function abrirModalVencimento() {
    const m = document.getElementById('modal-vencimento');
    if (m) { m.style.display = 'flex'; requestAnimationFrame(() => m.classList.add('open')); }
  }
  window.abrirModalVencimento = abrirModalVencimento;

  function fecharModalVencimento() {
    const m = document.getElementById('modal-vencimento');
    if (!m) return;
    m.classList.remove('open');
    setTimeout(() => { m.style.display = 'none'; }, 280);
  }
  window.fecharModalVencimento = fecharModalVencimento;

  function salvarVencimento() {
    const desc = (document.getElementById('venc-desc-input')?.value || '').trim();
    const dia  = parseInt(document.getElementById('venc-dia-input')?.value) || 0;
    const val  = document.getElementById('venc-valor-input')?.value || '';
    if (!desc) { if (typeof mostrarToast==='function') mostrarToast('Informe a descrição.','warn'); return; }
    if (dia < 1 || dia > 31) { if (typeof mostrarToast==='function') mostrarToast('Dia inválido (1-31).','warn'); return; }
    _vencimentos.push({ id: Date.now(), descricao: desc, dia, valor: val, recorrente: true });
    _salvarVenc();
    fecharModalVencimento();
    renderCalendario();
    if (typeof mostrarToast==='function') mostrarToast('Vencimento adicionado!','success');
  }
  window.salvarVencimento = salvarVencimento;

  function removerVencimento(id) {
    _vencimentos = _vencimentos.filter(v => v.id !== id);
    _salvarVenc();
    renderCalendario();
  }
  window.removerVencimento = removerVencimento;

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Init ────────────────────────────────────────────────────
  function _init() {
    _carregarVenc();
    _calMes = new Date().toISOString().slice(0,7);
    // Só renderiza se a aba estiver visível
    if (document.getElementById('tab-calendario')?.classList.contains('active')) {
      renderCalendario();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
