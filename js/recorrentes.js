(function () {
  'use strict';

  /* ─── P4.1 · Transações Recorrentes ─────────────────────────────────── */

  const STORE_KEY = 'fp_recorrentes';

  const FREQUENCIAS = {
    diaria:    { label: 'Diária',     dias: 1 },
    semanal:   { label: 'Semanal',    dias: 7 },
    quinzenal: { label: 'Quinzenal',  dias: 15 },
    mensal:    { label: 'Mensal',     dias: 30 },
    bimestral: { label: 'Bimestral',  dias: 60 },
    trimestral:{ label: 'Trimestral', dias: 90 },
    semestral: { label: 'Semestral',  dias: 180 },
    anual:     { label: 'Anual',      dias: 365 },
  };

  let recorrentes = [];

  /* ─── Persistência ──────────────────────────────────────────────────── */
  function _load() {
    try { recorrentes = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
    catch(e) { recorrentes = []; }
  }

  function _save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(recorrentes));
  }

  /* ─── Verificar e disparar recorrentes pendentes ────────────────────── */
  function verificarRecorrentes() {
    _load();
    const hoje = new Date().toISOString().slice(0, 10);
    let gerados = 0;

    recorrentes.forEach(r => {
      if (!r.ativo) return;
      const proxima = r.proximaData;
      if (!proxima || proxima > hoje) return;

      // Gerar transação
      const nova = {
        id: Date.now() + Math.random(),
        tipo: r.tipo,
        descricao: r.descricao + ' (automático)',
        valor: r.valor,
        categoria: r.categoria,
        conta: r.conta || '',
        data: proxima,
        tag: 'recorrente',
        criadoEm: new Date().toISOString(),
        recorrenteId: r.id
      };

      if (typeof transacoes !== 'undefined') {
        transacoes.unshift(nova);
        if (typeof salvarDados === 'function') salvarDados();
      }

      // Calcular próxima data
      const freq = FREQUENCIAS[r.frequencia] || FREQUENCIAS.mensal;
      const dt = new Date(proxima + 'T12:00:00');
      dt.setDate(dt.getDate() + freq.dias);
      r.proximaData = dt.toISOString().slice(0, 10);
      r.ultimaGerada = proxima;
      r.totalGeradas = (r.totalGeradas || 0) + 1;
      gerados++;
    });

    if (gerados > 0) {
      _save();
      if (typeof renderTudo === 'function') renderTudo();
      if (typeof showToast === 'function') showToast('🔄 ' + gerados + ' transação(ões) recorrente(s) gerada(s)!', 'info');
    }
  }

  /* ─── CRUD ──────────────────────────────────────────────────────────── */
  function adicionarRecorrente(dados) {
    _load();
    const r = {
      id: Date.now(),
      tipo: dados.tipo || 'despesa',
      descricao: dados.descricao || 'Recorrente',
      valor: parseFloat(dados.valor) || 0,
      categoria: dados.categoria || 'outros',
      conta: dados.conta || '',
      frequencia: dados.frequencia || 'mensal',
      proximaData: dados.proximaData || new Date().toISOString().slice(0, 10),
      ativo: true,
      criadoEm: new Date().toISOString(),
      totalGeradas: 0
    };
    recorrentes.push(r);
    _save();
    renderRecorrentes();
    if (typeof showToast === 'function') showToast('✅ Recorrente criada!', 'success');
  }

  function removerRecorrente(id) {
    _load();
    recorrentes = recorrentes.filter(r => r.id !== id);
    _save();
    renderRecorrentes();
  }

  function toggleRecorrente(id) {
    _load();
    const r = recorrentes.find(r => r.id === id);
    if (r) { r.ativo = !r.ativo; _save(); renderRecorrentes(); }
  }

  /* ─── Modal ─────────────────────────────────────────────────────────── */
  function abrirModalRecorrente() {
    const el = document.getElementById('modal-recorrente');
    if (!el) return;
    // Reset form
    ['rec-desc','rec-valor','rec-proxima'].forEach(id => {
      const f = document.getElementById(id);
      if (f) f.value = '';
    });
    const hoje = new Date().toISOString().slice(0, 10);
    const proxEl = document.getElementById('rec-proxima');
    if (proxEl) proxEl.value = hoje;
    // Tipo default
    const tipoBtns = document.querySelectorAll('.rec-tipo-btn');
    tipoBtns.forEach(b => b.classList.remove('active-receita','active-despesa'));
    const despBtn = document.querySelector('.rec-tipo-btn[data-tipo="despesa"]');
    if (despBtn) despBtn.classList.add('active-despesa');
    el.style.display = 'flex';
  }

  function fecharModalRecorrente() {
    const el = document.getElementById('modal-recorrente');
    if (el) el.style.display = 'none';
  }

  function setTipoRecorrente(tipo) {
    document.querySelectorAll('.rec-tipo-btn').forEach(b => {
      b.classList.remove('active-receita','active-despesa');
    });
    const btn = document.querySelector('.rec-tipo-btn[data-tipo="' + tipo + '"]');
    if (btn) btn.classList.add('active-' + tipo);
  }

  function salvarNovaRecorrente() {
    const tipoBtn = document.querySelector('.rec-tipo-btn.active-receita, .rec-tipo-btn.active-despesa');
    const tipo = tipoBtn ? tipoBtn.dataset.tipo : 'despesa';
    const desc = document.getElementById('rec-desc')?.value?.trim();
    const valor = parseFloat(document.getElementById('rec-valor')?.value);
    const cat = document.getElementById('rec-cat')?.value || 'outros';
    const freq = document.getElementById('rec-freq')?.value || 'mensal';
    const proxima = document.getElementById('rec-proxima')?.value;

    if (!desc || !valor || valor <= 0) {
      if (typeof showToast === 'function') showToast('⚠️ Preencha descrição e valor', 'warning');
      return;
    }
    adicionarRecorrente({ tipo, descricao: desc, valor, categoria: cat, frequencia: freq, proximaData: proxima });
    fecharModalRecorrente();
  }

  /* ─── Render ────────────────────────────────────────────────────────── */
  function renderRecorrentes() {
    _load();
    const el = document.getElementById('recorrentes-panel');
    if (!el) return;

    if (recorrentes.length === 0) {
      el.innerHTML = `
        <div class="rec-empty">
          <div class="empty-icon">🔄</div>
          <h3>Nenhuma transação recorrente</h3>
          <p>Cadastre despesas fixas (aluguel, assinaturas) ou receitas regulares (salário) e elas serão lançadas automaticamente.</p>
        </div>`;
      return;
    }

    const hoje = new Date().toISOString().slice(0, 10);
    const fmt = typeof window.fmt === 'function' ? window.fmt : v => 'R$ ' + parseFloat(v).toFixed(2);

    el.innerHTML = recorrentes.map(r => {
      const freq = FREQUENCIAS[r.frequencia] || { label: r.frequencia };
      const vencendo = r.proximaData && r.proximaData <= hoje;
      const proxDt = r.proximaData ? new Date(r.proximaData + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
      return `
      <div class="rec-card ${r.ativo ? '' : 'rec-inativo'} ${vencendo && r.ativo ? 'rec-vencendo' : ''}">
        <div class="rec-card-header">
          <div class="rec-icon ${r.tipo}">${r.tipo === 'receita' ? '💚' : '💸'}</div>
          <div class="rec-info">
            <div class="rec-desc">${r.descricao}</div>
            <div class="rec-meta">
              <span class="rec-freq-tag">${freq.label}</span>
              <span class="rec-cat-tag">${r.categoria || 'outros'}</span>
            </div>
          </div>
          <div class="rec-valor ${r.tipo}">${r.tipo === 'receita' ? '+' : '-'}${fmt(r.valor)}</div>
        </div>
        <div class="rec-card-footer">
          <div class="rec-proxima ${vencendo && r.ativo ? 'rec-vencida' : ''}">
            📅 Próx.: ${proxDt}${vencendo && r.ativo ? ' ⚠️ Pendente' : ''}
          </div>
          <div class="rec-acoes">
            <button class="btn btn-sm btn-ghost" onclick="toggleRecorrente(${r.id})" title="${r.ativo ? 'Pausar' : 'Ativar'}">
              ${r.ativo ? '⏸️' : '▶️'}
            </button>
            <button class="btn btn-sm btn-danger" onclick="removerRecorrente(${r.id})" title="Excluir">🗑️</button>
          </div>
        </div>
        <div class="rec-geradas">Geradas: ${r.totalGeradas || 0}x</div>
      </div>`;
    }).join('');
  }

  /* ─── Init: verificar ao carregar ───────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(verificarRecorrentes, 2000); // após dados carregados
  });

  window.recorrentes = recorrentes;
  window.adicionarRecorrente = adicionarRecorrente;
  window.removerRecorrente = removerRecorrente;
  window.toggleRecorrente = toggleRecorrente;
  window.renderRecorrentes = renderRecorrentes;
  window.verificarRecorrentes = verificarRecorrentes;
  window.abrirModalRecorrente = abrirModalRecorrente;
  window.fecharModalRecorrente = fecharModalRecorrente;
  window.setTipoRecorrente = setTipoRecorrente;
  window.salvarNovaRecorrente = salvarNovaRecorrente;
  window.FREQUENCIAS = FREQUENCIAS;

})();
