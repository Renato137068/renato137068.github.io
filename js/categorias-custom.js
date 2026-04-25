(function () {
  'use strict';

  /* ─── P4.3 · Categorias Personalizadas ──────────────────────────────── */

  const STORE_KEY = 'fp_cats_custom';

  // Paleta de cores para seleção rápida
  const CORES_PALETA = [
    '#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316',
    '#eab308','#22c55e','#14b8a6','#0ea5e9','#64748b'
  ];

  // Emojis sugeridos por categoria
  const EMOJIS_SUGERIDOS = ['🏷️','🛍️','🎭','🎸','🌿','🏋️','🚀','💎','🔥','⚡',
    '🌊','🍕','🎓','🏆','💡','🎯','🌍','🐾','🎨','🔧'];

  let customCats = [];

  function _load() {
    try { customCats = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
    catch(e) { customCats = []; }
  }

  function _save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(customCats));
    _sincronizarGlobal();
  }

  /* ─── Sincronizar com objetos globais de config.js ──────────────────── */
  function _sincronizarGlobal() {
    // Extende CATEGORIAS_ICON e CATEGORIAS_LABEL globais com as customizadas
    customCats.forEach(c => {
      if (typeof CATS_BR_ICON !== 'undefined') CATS_BR_ICON[c.id] = c.emoji;
      if (typeof CATS_BR_LABEL !== 'undefined') CATS_BR_LABEL[c.id] = c.nome;
      // Também nos objetos originais se não-frozen
      try {
        if (typeof CATEGORIAS_ICON !== 'undefined' && !Object.isFrozen(CATEGORIAS_ICON)) {
          CATEGORIAS_ICON[c.id] = c.emoji;
        }
        if (typeof CATEGORIAS_LABEL !== 'undefined' && !Object.isFrozen(CATEGORIAS_LABEL)) {
          CATEGORIAS_LABEL[c.id] = c.nome;
        }
      } catch(e) {}
    });
  }

  /* ─── CRUD ──────────────────────────────────────────────────────────── */
  function adicionarCatCustom(dados) {
    _load();
    // Normalizar ID: minúsculas, sem espaços
    const id = (dados.nome || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      || 'cat_' + Date.now();

    // Verificar duplicata
    if (customCats.find(c => c.id === id)) {
      if (typeof showToast === 'function') showToast('⚠️ Já existe uma categoria com esse nome', 'warning');
      return;
    }

    customCats.push({
      id,
      nome: dados.nome,
      emoji: dados.emoji || '🏷️',
      cor: dados.cor || '#6366f1',
      criadoEm: new Date().toISOString(),
      custom: true
    });
    _save();
    renderCatsCustom();
    if (typeof showToast === 'function') showToast('✅ Categoria criada!', 'success');
  }

  function editarCatCustom(id, novoNome, novoEmoji, novaCor) {
    _load();
    const c = customCats.find(c => c.id === id);
    if (!c) return;
    if (novoNome) c.nome = novoNome;
    if (novoEmoji) c.emoji = novoEmoji;
    if (novaCor) c.cor = novaCor;
    _save();
    renderCatsCustom();
  }

  function removerCatCustom(id) {
    _load();
    const c = customCats.find(c => c.id === id);
    if (!c) return;

    // Contar transações afetadas
    const afetadas = typeof transacoes !== 'undefined'
      ? transacoes.filter(t => t.categoria === id).length : 0;

    const msg = afetadas > 0
      ? `Excluir categoria "${c.nome}"?\n${afetadas} transação(ões) serão movidas para "Outros".`
      : `Excluir categoria "${c.nome}"?`;

    if (!confirm(msg)) return;

    // Migrar transações
    if (afetadas > 0 && typeof transacoes !== 'undefined') {
      transacoes.forEach(t => { if (t.categoria === id) t.categoria = 'outros'; });
      if (typeof salvarDados === 'function') salvarDados();
    }

    customCats = customCats.filter(c => c.id !== id);
    _save();
    renderCatsCustom();
    if (typeof showToast === 'function') showToast('🗑️ Categoria removida', 'info');
  }

  /* ─── Modal ─────────────────────────────────────────────────────────── */
  function abrirModalCatCustom() {
    const el = document.getElementById('modal-cat-custom');
    if (!el) return;
    const nomeEl = document.getElementById('cat-custom-nome');
    const emojiEl = document.getElementById('cat-custom-emoji');
    const corEl = document.getElementById('cat-custom-cor');
    if (nomeEl) nomeEl.value = '';
    if (emojiEl) emojiEl.value = '🏷️';
    if (corEl) corEl.value = '#6366f1';
    el.style.display = 'flex';
    renderEmojiPicker();
  }

  function fecharModalCatCustom() {
    const el = document.getElementById('modal-cat-custom');
    if (el) el.style.display = 'none';
  }

  function renderEmojiPicker() {
    const el = document.getElementById('cat-emoji-picker');
    if (!el) return;
    el.innerHTML = EMOJIS_SUGERIDOS.map(e =>
      `<button class="emoji-pick-btn" onclick="document.getElementById('cat-custom-emoji').value='${e}';document.querySelectorAll('.emoji-pick-btn').forEach(b=>b.classList.remove('selected'));this.classList.add('selected')">${e}</button>`
    ).join('');
  }

  function renderCorPicker() {
    const el = document.getElementById('cat-cor-picker');
    if (!el) return;
    el.innerHTML = CORES_PALETA.map(cor =>
      `<button class="cor-pick-btn" style="background:${cor}" onclick="document.getElementById('cat-custom-cor').value='${cor}';document.querySelectorAll('.cor-pick-btn').forEach(b=>b.classList.remove('selected'));this.classList.add('selected')" title="${cor}"></button>`
    ).join('');
  }

  function salvarCatCustom() {
    const nome = document.getElementById('cat-custom-nome')?.value?.trim();
    const emoji = document.getElementById('cat-custom-emoji')?.value || '🏷️';
    const cor = document.getElementById('cat-custom-cor')?.value || '#6366f1';
    if (!nome || nome.length < 2) {
      if (typeof showToast === 'function') showToast('⚠️ Nome deve ter pelo menos 2 caracteres', 'warning');
      return;
    }
    adicionarCatCustom({ nome, emoji, cor });
    fecharModalCatCustom();
  }

  /* ─── Render painel ─────────────────────────────────────────────────── */
  function renderCatsCustom() {
    _load();
    const el = document.getElementById('cats-custom-panel');
    if (!el) return;

    if (customCats.length === 0) {
      el.innerHTML = `<p class="cats-custom-empty">Nenhuma categoria personalizada criada. Use o botão acima para adicionar.</p>`;
      return;
    }

    el.innerHTML = `<div class="cats-custom-grid">` +
      customCats.map(c => {
        const txCount = typeof transacoes !== 'undefined'
          ? transacoes.filter(t => t.categoria === c.id).length : 0;
        return `
        <div class="cat-custom-card" style="--cat-cor:${c.cor}">
          <div class="cat-custom-emoji">${c.emoji}</div>
          <div class="cat-custom-nome">${c.nome}</div>
          <div class="cat-custom-count">${txCount} transação(ões)</div>
          <button class="btn btn-sm btn-danger-ghost" onclick="removerCatCustom('${c.id}')">🗑️</button>
        </div>`;
      }).join('') + `</div>`;
  }

  /* ─── Init ──────────────────────────────────────────────────────────── */
  _load();
  _sincronizarGlobal();

  window.customCats = customCats;
  window.adicionarCatCustom = adicionarCatCustom;
  window.editarCatCustom = editarCatCustom;
  window.removerCatCustom = removerCatCustom;
  window.renderCatsCustom = renderCatsCustom;
  window.abrirModalCatCustom = abrirModalCatCustom;
  window.fecharModalCatCustom = fecharModalCatCustom;
  window.salvarCatCustom = salvarCatCustom;
  window.renderEmojiPicker = renderEmojiPicker;
  window.renderCorPicker = renderCorPicker;

})();
