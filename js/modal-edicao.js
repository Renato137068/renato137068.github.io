// FinançasPro — P2.7 Modal Dedicado de Edição de Transações
// Substitui o fluxo de "preencher o form do dashboard" por um
// sheet modal inline, sem mudar de aba.

(function() {
  'use strict';

  // ── Cria o modal no DOM (lazy, uma só vez) ──────────────────
  function _criarModalEdicao() {
    if (document.getElementById('tx-edit-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'tx-edit-modal';
    modal.className = 'tx-edit-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'tx-edit-modal-titulo');
    modal.innerHTML = `
      <div class="tx-edit-sheet" role="document">
        <div class="tx-edit-header">
          <h3 id="tx-edit-modal-titulo" style="margin:0;font-size:1.1rem;">✏️ Editar Transação</h3>
          <button class="tx-edit-close-btn" onclick="fecharModalEdicao()" aria-label="Fechar modal de edição">✕</button>
        </div>
        <div class="tx-edit-body">
          <!-- Tipo -->
          <div class="tx-edit-tipo-btns">
            <button id="med-btn-receita" class="med-tipo-btn" onclick="medSetTipo('receita')">📈 Receita</button>
            <button id="med-btn-despesa" class="med-tipo-btn active" onclick="medSetTipo('despesa')">📉 Despesa</button>
          </div>
          <!-- Descrição -->
          <div class="form-group" style="margin-top:12px;">
            <label class="form-label" for="med-desc">Descrição</label>
            <input type="text" id="med-desc" class="form-control" maxlength="80" autocomplete="off" placeholder="Ex: Supermercado, Salário...">
          </div>
          <!-- Valor + Data -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px;">
            <div class="form-group">
              <label class="form-label" for="med-valor">Valor (R$)</label>
              <input type="number" id="med-valor" class="form-control" min="0.01" step="0.01" placeholder="0,00">
            </div>
            <div class="form-group">
              <label class="form-label" for="med-data">Data</label>
              <input type="date" id="med-data" class="form-control">
            </div>
          </div>
          <!-- Categoria -->
          <div class="form-group" style="margin-top:8px;">
            <label class="form-label" for="med-categoria">Categoria</label>
            <select id="med-categoria" class="form-control">
              <option value="">Selecionar...</option>
            </select>
          </div>
          <!-- Conta -->
          <div class="form-group" style="margin-top:8px;">
            <label class="form-label" for="med-conta">Conta</label>
            <select id="med-conta" class="form-control">
              <option value="">Sem conta</option>
            </select>
          </div>
          <!-- Tag -->
          <div class="form-group" style="margin-top:8px;">
            <label class="form-label" for="med-tag">Tag / Rótulo</label>
            <input type="text" id="med-tag" class="form-control" placeholder="Ex: trabalho, casa">
          </div>
          <!-- Recorrência -->
          <div class="form-group" style="margin-top:8px;">
            <label class="form-label" for="med-recorrencia">Recorrência</label>
            <select id="med-recorrencia" class="form-control">
              <option value="unica">Única</option>
              <option value="mensal">Mensal</option>
              <option value="semanal">Semanal</option>
            </select>
          </div>
        </div>
        <div class="tx-edit-footer">
          <button class="btn btn-outline" style="flex:1;" onclick="fecharModalEdicao()">Cancelar</button>
          <button class="btn btn-primary" style="flex:1;" onclick="salvarModalEdicao()">💾 Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Fechar ao clicar no backdrop
    modal.addEventListener('click', function(e) {
      if (e.target === modal) fecharModalEdicao();
    });

    // Fechar com Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.style.display !== 'none' && !modal.classList.contains('hidden')) {
        fecharModalEdicao();
      }
    });
  }

  // ── Popula categorias no select ─────────────────────────────
  function _popularCategorias(tipo) {
    const sel = document.getElementById('med-categoria');
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecionar...</option>';
    const cats = typeof CATEGORIAS !== 'undefined' ? CATEGORIAS : [];
    cats.filter(c => !tipo || c.tipo === tipo || c.tipo === 'ambos').forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = (c.icon || '') + ' ' + (c.nome || c.id);
      sel.appendChild(opt);
    });
  }

  // ── Popula contas no select ─────────────────────────────────
  function _popularContas() {
    const sel = document.getElementById('med-conta');
    if (!sel) return;
    sel.innerHTML = '<option value="">Sem conta</option>';
    const cs = typeof contas !== 'undefined' ? contas : [];
    cs.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = (c.nome || 'Conta');
      sel.appendChild(opt);
    });
  }

  // ── Tipo dentro do modal ────────────────────────────────────
  let _medTipoAtual = 'despesa';
  function medSetTipo(tipo) {
    _medTipoAtual = tipo;
    ['receita','despesa'].forEach(t => {
      const btn = document.getElementById('med-btn-' + t);
      if (btn) btn.classList.toggle('active', t === tipo);
    });
    _popularCategorias(tipo);
  }
  window.medSetTipo = medSetTipo;

  // ── ID em edição ────────────────────────────────────────────
  let _medEditId = null;

  // ── Abrir modal preenchido com a transação ──────────────────
  function abrirModalEdicao(id) {
    const tx = (typeof transacoes !== 'undefined' ? transacoes : []).find(t => t.id === id);
    if (!tx) return;
    _criarModalEdicao();
    _medEditId = id;

    medSetTipo(tx.tipo || 'despesa');
    _popularContas();

    document.getElementById('med-desc').value   = tx.descricao  || '';
    document.getElementById('med-valor').value  = tx.valor      || '';
    document.getElementById('med-data').value   = tx.data       || '';
    document.getElementById('med-tag').value    = tx.tag        || '';

    const recEl = document.getElementById('med-recorrencia');
    if (recEl) recEl.value = tx.recorrencia || 'unica';

    // Categoria: popular primeiro, depois setar
    const catEl = document.getElementById('med-categoria');
    if (catEl) catEl.value = tx.categoria || '';

    const contaEl = document.getElementById('med-conta');
    if (contaEl) contaEl.value = tx.conta_id || '';

    const modal = document.getElementById('tx-edit-modal');
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('open'));

    // Focus na descrição
    setTimeout(() => {
      const d = document.getElementById('med-desc');
      if (d) d.focus();
    }, 150);
  }
  window.abrirModalEdicao = abrirModalEdicao;

  // ── Fechar modal ────────────────────────────────────────────
  function fecharModalEdicao() {
    const modal = document.getElementById('tx-edit-modal');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 280);
    _medEditId = null;
  }
  window.fecharModalEdicao = fecharModalEdicao;

  // ── Salvar edição ───────────────────────────────────────────
  function salvarModalEdicao() {
    if (_medEditId === null) return;
    const desc  = (document.getElementById('med-desc').value || '').trim();
    const valor = parseFloat(document.getElementById('med-valor').value);
    const data  = document.getElementById('med-data').value;
    const cat   = document.getElementById('med-categoria').value;
    const conta = document.getElementById('med-conta').value;
    const tag   = (document.getElementById('med-tag').value || '').trim();
    const rec   = document.getElementById('med-recorrencia').value;

    if (!desc) { if (typeof mostrarToast==='function') mostrarToast('Preencha a descrição.','warn'); return; }
    if (!valor || valor <= 0) { if (typeof mostrarToast==='function') mostrarToast('Valor inválido.','warn'); return; }
    if (!data) { if (typeof mostrarToast==='function') mostrarToast('Selecione uma data.','warn'); return; }

    const idx = (typeof transacoes !== 'undefined' ? transacoes : []).findIndex(t => t.id === _medEditId);
    if (idx === -1) return;

    transacoes[idx] = Object.assign({}, transacoes[idx], {
      tipo: _medTipoAtual,
      descricao: desc,
      valor: valor,
      data: data,
      categoria: cat,
      conta_id: conta,
      tag: tag,
      recorrencia: rec,
      editadoEm: new Date().toISOString()
    });

    if (typeof salvarTransacoes === 'function') salvarTransacoes();
    if (typeof renderTudo       === 'function') renderTudo();
    if (typeof mostrarToast     === 'function') mostrarToast('Transação atualizada!', 'success');
    fecharModalEdicao();
  }
  window.salvarModalEdicao = salvarModalEdicao;

})();
