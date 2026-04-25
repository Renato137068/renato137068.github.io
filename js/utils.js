// FinançasPro — Utilitários (modais, toasts, formatação)
// v10.8 — Independente

// MODAL DIALOG UNIVERSAL
// ════════════════════════════════════
let _fpModalCb = null;  // era var — trocado para let (escopo mais seguro)

function _fpModalSetup(icon, msg, showInput, showCancel, okLabel) {
  // Optional chaining defensivo: não quebra se IDs mudarem ou elemento não existir
  const el = id => document.getElementById(id);

  const iconEl = el('fp-modal-icon');
  const titleEl = el('fp-modal-title');
  const msgEl = el('fp-modal-msg');
  const inp = el('fp-modal-input');
  const cancelBtn = el('fp-modal-cancel');
  const okBtn = el('fp-modal-ok');
  const overlay = el('fp-modal-overlay');

  if (iconEl) iconEl.textContent = icon;
  if (titleEl) titleEl.textContent = '';
  if (msgEl) msgEl.textContent = msg;
  if (inp) inp.style.display = showInput ? '' : 'none';
  if (cancelBtn) cancelBtn.style.display = showCancel ? '' : 'none';
  if (okBtn) okBtn.textContent = okLabel;
  if (overlay) overlay.classList.remove('hidden');
}

function fpAlert(msg, icon) {
  _fpModalCb = null;
  _fpModalSetup(icon || 'ℹ️', msg, false, false, 'OK');
}

function fpConfirm(msg, onOk, icon) {
  _fpModalCb = onOk || null;
  _fpModalSetup(icon || '❓', msg, false, true, 'Confirmar');
}

function fpPrompt(msg, defaultVal, onOk, icon, inputType) {
  _fpModalCb = onOk || null;
  _fpModalSetup(icon || '✏️', msg, true, true, 'Confirmar');
  const inp = document.getElementById('fp-modal-input');
  if (!inp) return;
  inp.type = inputType || 'text';
  inp.value = defaultVal || '';
  setTimeout(() => { inp.focus(); inp.select(); }, 120);
}

function fpModalOk() {
  const inp = document.getElementById('fp-modal-input');
  const val = inp && inp.style.display !== 'none' ? inp.value : true;
  const overlay = document.getElementById('fp-modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  const cb = _fpModalCb; _fpModalCb = null;
  if (cb) cb(val);
}

function fpModalCancel() {
  const overlay = document.getElementById('fp-modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  _fpModalCb = null;
}

// Fechar ao clicar no fundo
document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'fp-modal-overlay') fpModalCancel();
});


// ── mostrarToast: alias de showToast (compatibilidade) ───────────────────
function mostrarToast(msg, tipo) {
  showToast(msg, tipo || 'success');
}

// ── Escape fecha qualquer overlay/modal aberto ─────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  // fp-modal
  const mo = document.getElementById('fp-modal-overlay');
  if (mo && !mo.classList.contains('hidden')) { fpModalCancel(); return; }
  // achievement popup
  const ap = document.getElementById('achievement-overlay');
  if (ap && ap.classList.contains('show')) {
    if (typeof closeAchievementPopup === 'function') closeAchievementPopup();
    return;
  }
  // onboarding overlay
  const ob = document.getElementById('onboarding-overlay');
  if (ob && !ob.classList.contains('hidden')) {
    if (typeof fecharOnboarding === 'function') fecharOnboarding();
    return;
  }
  // autocomplete
  const ac = document.getElementById('autocomplete-list');
  if (ac && ac.style.display !== 'none') { ac.style.display = 'none'; return; }
});

// ── Inicialização robusta ──────────────────────────────────────────────────
// Funciona mesmo com scripts carregados via defer ou de forma assíncrona.
// Com defer, DOMContentLoaded pode já ter disparado quando este script roda.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM já está pronto (ex: script carregado após parsing completo)
  init();
}

// ════════════════════════════════════
