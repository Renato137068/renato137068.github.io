// ════════════════════════════════════════════════════════════════════
// FinançasPro — Atalhos de Teclado (P2.5)
// ════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ── Ctrl/⌘+N → focar campo de descrição + ir para dashboard ────
  document.addEventListener('keydown', function(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    const tag  = (document.activeElement.tagName || '').toLowerCase();
    const inInput = tag === 'input' || tag === 'textarea' || tag === 'select';

    // Ctrl+N — novo lançamento
    if (ctrl && e.key === 'n') {
      e.preventDefault();
      if (typeof switchTab === 'function') switchTab(null, 'dashboard');
      setTimeout(function() {
        const desc = document.getElementById('tx-desc');
        if (desc) { desc.focus(); desc.select(); }
      }, 80);
      return;
    }

    // Ctrl+S — salvar lançamento (quando em edição/digitação)
    if (ctrl && e.key === 's' && inInput) {
      const form = document.getElementById('btn-salvar');
      if (form) { e.preventDefault(); form.click(); }
      return;
    }

    // Escape — limpar formulário / fechar modals
    if (e.key === 'Escape') {
      // Fechar modais abertos
      const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
      modals.forEach(function(m) {
        if (m.style.display !== 'none') {
          const handle = m.querySelector('[onclick*="fecharModal"],button[onclick*="fechar"]');
          if (handle) handle.click();
        }
      });
      // Limpar form se em modo edição
      const banner = document.getElementById('edit-mode-banner');
      if (banner && banner.style.display !== 'none') {
        if (typeof limparForm === 'function') limparForm();
      }
      return;
    }

    // Shift+/ (?) → abrir tour
    if (e.key === '?' && !inInput) {
      e.preventDefault();
      if (typeof iniciarTour === 'function') iniciarTour();
      return;
    }
  });

  // ── Enter em #tx-valor → move foco para data, não salva ainda ──
  document.addEventListener('DOMContentLoaded', function() {
    const valor = document.getElementById('tx-valor');
    if (valor) {
      valor.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const dataEl = document.getElementById('tx-data');
          if (dataEl) dataEl.focus();
        }
      });
    }

    // Enter em #tx-data → focar categoria
    const dataEl = document.getElementById('tx-data');
    if (dataEl) {
      dataEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          // Expandir "Mais opções" se fechado
          const extra = document.getElementById('quick-entry-extra');
          if (extra && !extra.classList.contains('expanded')) {
            const toggleBtn = document.getElementById('quick-entry-toggle-btn');
            if (toggleBtn) toggleBtn.click();
          }
          setTimeout(function() {
            const cat = document.getElementById('tx-categoria');
            if (cat) cat.focus();
          }, 50);
        }
      });
    }

    // Enter em #tx-categoria → salvar
    const catEl = document.getElementById('tx-categoria');
    if (catEl) {
      catEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const btn = document.getElementById('btn-salvar');
          if (btn) btn.click();
        }
      });
    }

    // Exibir dica de atalhos no rodapé do formulário
    _injetarDicaAtalhos();
  });

  function _injetarDicaAtalhos() {
    const actions = document.querySelector('.entry-actions');
    if (!actions || document.getElementById('atalhos-dica')) return;
    const dica = document.createElement('div');
    dica.id = 'atalhos-dica';
    dica.className = 'atalhos-dica';
    const isMac = /Mac/.test(navigator.platform);
    const mod = isMac ? '⌘' : 'Ctrl';
    dica.innerHTML = '<kbd>' + mod + '+N</kbd> novo &nbsp;·&nbsp; <kbd>' + mod + '+S</kbd> salvar &nbsp;·&nbsp; <kbd>Esc</kbd> limpar &nbsp;·&nbsp; <kbd>?</kbd> tour';
    actions.insertAdjacentElement('afterend', dica);
  }
})();
