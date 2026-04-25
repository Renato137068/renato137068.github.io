// FinançasPro — P2.3 Rastreamento de Investimentos
// Carteira com rentabilidade, alocação por classe e projeção
// Persiste em localStorage: 'fp_investimentos'

(function() {
  'use strict';

  let _ativos = [];
  const _STORAGE_KEY = 'fp_investimentos';

  function _carregar() {
    try { _ativos = JSON.parse(localStorage.getItem(_STORAGE_KEY) || '[]'); }
    catch(e) { _ativos = []; }
  }

  function _salvar() {
    localStorage.setItem(_STORAGE_KEY, JSON.stringify(_ativos));
  }

  // ── Classes de ativos ────────────────────────────────────────
  const CLASSES = {
    'renda-fixa':    { label: 'Renda Fixa',    icon: '🏦', cor: '#16a34a' },
    'acoes':         { label: 'Ações',          icon: '📈', cor: '#3b82f6' },
    'fiis':          { label: 'FIIs',           icon: '🏢', cor: '#f59e0b' },
    'criptomoedas':  { label: 'Criptomoedas',  icon: '₿',  cor: '#f97316' },
    'tesouro':       { label: 'Tesouro Direto', icon: '🇧🇷', cor: '#8b5cf6' },
    'internacional': { label: 'Internacional',  icon: '🌍', cor: '#06b6d4' },
    'outros':        { label: 'Outros',         icon: '📦', cor: '#6b7280' },
  };

  // ── CRUD ────────────────────────────────────────────────────
  function adicionarAtivo(nome, classe, valorInvestido, valorAtual, rendaAnual) {
    _ativos.push({
      id: Date.now(),
      nome: nome,
      classe: classe,
      valorInvestido: parseFloat(valorInvestido) || 0,
      valorAtual: parseFloat(valorAtual) || parseFloat(valorInvestido) || 0,
      rendaAnual: parseFloat(rendaAnual) || 0,   // % a.a.
      criadoEm: new Date().toISOString()
    });
    _salvar();
    fecharModalAtivo();
    renderInvestimentos();
    if (typeof mostrarToast === 'function') mostrarToast('Ativo adicionado!', 'success');
  }
  window.adicionarAtivo = adicionarAtivo;

  function removerAtivo(id) {
    if (typeof fpConfirm === 'function') {
      fpConfirm('Remover este ativo?', () => {
        _ativos = _ativos.filter(a => a.id !== id);
        _salvar();
        renderInvestimentos();
      });
    } else {
      _ativos = _ativos.filter(a => a.id !== id);
      _salvar();
      renderInvestimentos();
    }
  }
  window.removerAtivo = removerAtivo;

  function editarValorAtivo(id) {
    const a = _ativos.find(x => x.id === id);
    if (!a) return;
    const novoVal = parseFloat(prompt('Novo valor de mercado (R$):', a.valorAtual));
    if (isNaN(novoVal) || novoVal < 0) return;
    a.valorAtual = novoVal;
    _salvar();
    renderInvestimentos();
    if (typeof mostrarToast === 'function') mostrarToast('Valor atualizado!', 'success');
  }
  window.editarValorAtivo = editarValorAtivo;

  // ── Render ──────────────────────────────────────────────────
  function renderInvestimentos() {
    const panel = document.getElementById('investimentos-panel');
    if (!panel) return;

    if (_ativos.length === 0) {
      panel.innerHTML =
        '<div class="inv-empty"><div style="font-size:2.5rem;">📊</div>' +
        '<p style="color:var(--text-secondary);">Nenhum ativo cadastrado.<br>Adicione sua carteira para acompanhar a rentabilidade!</p></div>';
      return;
    }

    const totalInv = _ativos.reduce((s, a) => s + a.valorInvestido, 0);
    const totalAtual = _ativos.reduce((s, a) => s + a.valorAtual, 0);
    const lucro = totalAtual - totalInv;
    const rent  = totalInv > 0 ? (lucro / totalInv * 100) : 0;

    // Resumo geral
    let html = '<div class="inv-resumo">' +
      _card('💼 Total Investido', 'R$ ' + totalInv.toLocaleString('pt-BR',{minimumFractionDigits:2}), '') +
      _card('📊 Valor Atual', 'R$ ' + totalAtual.toLocaleString('pt-BR',{minimumFractionDigits:2}), '') +
      _card((lucro>=0?'📈':'📉') + ' Rentabilidade', (lucro>=0?'+':'') + rent.toFixed(2) + '%',
            lucro >= 0 ? 'style="color:var(--success)"' : 'style="color:var(--danger)"') +
    '</div>';

    // Alocação por classe
    const porClasse = {};
    _ativos.forEach(a => {
      porClasse[a.classe] = (porClasse[a.classe] || 0) + a.valorAtual;
    });
    const classesOrdenadas = Object.entries(porClasse).sort((a,b) => b[1]-a[1]);

    html += '<div class="inv-alocacao-header">📂 Alocação por Classe</div>' +
      '<div class="inv-alocacao">' +
      classesOrdenadas.map(([cls, val]) => {
        const info = CLASSES[cls] || CLASSES['outros'];
        const pct  = totalAtual > 0 ? (val / totalAtual * 100) : 0;
        return '<div class="inv-classe-row">' +
          '<span class="inv-classe-icon">' + info.icon + '</span>' +
          '<span class="inv-classe-nome">' + info.label + '</span>' +
          '<div class="inv-classe-bar-bg"><div class="inv-classe-bar-fill" style="width:' + pct.toFixed(1) + '%;background:' + info.cor + '"></div></div>' +
          '<span class="inv-classe-pct">' + pct.toFixed(1) + '%</span>' +
        '</div>';
      }).join('') +
    '</div>';

    // Lista de ativos
    html += '<div class="inv-lista-header">📋 Ativos</div>' +
      '<div class="inv-lista">' +
      _ativos.map(a => {
        const info = CLASSES[a.classe] || CLASSES['outros'];
        const lucroA = a.valorAtual - a.valorInvestido;
        const rentA  = a.valorInvestido > 0 ? (lucroA / a.valorInvestido * 100) : 0;
        return '<div class="inv-card">' +
          '<div class="inv-card-header">' +
            '<span class="inv-card-nome">' + info.icon + ' ' + escHtml(a.nome) + '</span>' +
            '<div style="display:flex;gap:6px;">' +
              '<button class="btn btn-sm btn-outline" onclick="editarValorAtivo(' + a.id + ')" aria-label="Atualizar valor">✏️</button>' +
              '<button class="btn btn-sm btn-danger" onclick="removerAtivo(' + a.id + ')" aria-label="Remover ativo">🗑️</button>' +
            '</div>' +
          '</div>' +
          '<div class="inv-card-body">' +
            '<div class="inv-row"><span>Investido</span><strong>R$ ' + a.valorInvestido.toLocaleString('pt-BR',{minimumFractionDigits:2}) + '</strong></div>' +
            '<div class="inv-row"><span>Valor Atual</span><strong>R$ ' + a.valorAtual.toLocaleString('pt-BR',{minimumFractionDigits:2}) + '</strong></div>' +
            '<div class="inv-row"><span>Resultado</span>' +
              '<strong style="color:' + (lucroA>=0?'var(--success)':'var(--danger)') + '">' +
              (lucroA>=0?'+':'') + 'R$ ' + Math.abs(lucroA).toLocaleString('pt-BR',{minimumFractionDigits:2}) +
              ' (' + (rentA>=0?'+':'') + rentA.toFixed(2) + '%)' +
            '</strong></div>' +
            (a.rendaAnual > 0
              ? '<div class="inv-row"><span>Renda/ano</span><strong>' + a.rendaAnual + '% a.a.</strong></div>'
              : '') +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';

    panel.innerHTML = html;
  }
  window.renderInvestimentos = renderInvestimentos;

  function _card(label, valor, extra) {
    return '<div class="inv-resumo-card"><div class="inv-resumo-label">' + label + '</div>' +
      '<div class="inv-resumo-valor" ' + extra + '>' + valor + '</div></div>';
  }

  // ── Modal ────────────────────────────────────────────────────
  function abrirModalAtivo() {
    const m = document.getElementById('modal-novo-ativo');
    if (m) { m.style.display = 'flex'; requestAnimationFrame(() => m.classList.add('open')); }
  }
  window.abrirModalAtivo = abrirModalAtivo;

  function fecharModalAtivo() {
    const m = document.getElementById('modal-novo-ativo');
    if (!m) return;
    m.classList.remove('open');
    setTimeout(() => { m.style.display = 'none'; }, 280);
    ['inv-nome-input','inv-vinv-input','inv-vatual-input','inv-renda-input']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  }
  window.fecharModalAtivo = fecharModalAtivo;

  function salvarNovoAtivo() {
    const nome   = (document.getElementById('inv-nome-input')?.value || '').trim();
    const classe = document.getElementById('inv-classe-sel')?.value || 'outros';
    const vinv   = document.getElementById('inv-vinv-input')?.value;
    const vatual = document.getElementById('inv-vatual-input')?.value;
    const renda  = document.getElementById('inv-renda-input')?.value;
    if (!nome) { if (typeof mostrarToast==='function') mostrarToast('Informe o nome do ativo.','warn'); return; }
    if (!vinv || parseFloat(vinv) < 0) { if (typeof mostrarToast==='function') mostrarToast('Valor investido inválido.','warn'); return; }
    adicionarAtivo(nome, classe, vinv, vatual || vinv, renda || 0);
  }
  window.salvarNovoAtivo = salvarNovoAtivo;

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Init ────────────────────────────────────────────────────
  function _init() { _carregar(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
