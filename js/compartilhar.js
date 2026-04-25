// FinançasPro — P3.8 Canvas Social Card + P3.9 Link de Convite

(function() {
  'use strict';

  // ── P3.8 — Gerar card visual de conquista (Canvas API) ───────
  function gerarCardConquista(titulo, emoji, subtitulo) {
    const canvas = document.createElement('canvas');
    canvas.width  = 800;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');

    // Fundo gradiente
    const grad = ctx.createLinearGradient(0, 0, 800, 420);
    grad.addColorStop(0,   '#166534');
    grad.addColorStop(0.5, '#15803d');
    grad.addColorStop(1,   '#0d9488');
    ctx.fillStyle = grad;
    ctx.roundRect(0, 0, 800, 420, 24);
    ctx.fill();

    // Padrão decorativo (círculos)
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#fff';
    [[700, 80, 180], [100, 350, 120], [650, 350, 80]].forEach(([x, y, r]) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Logo / app name
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FinançasPro', 40, 48);

    // Emoji (grande)
    ctx.font = '110px serif';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, 400, 190);

    // Título
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px system-ui, sans-serif';
    ctx.fillText(titulo, 400, 265);

    // Subtítulo
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText(subtitulo || 'Conquistei no FinançasPro! 🚀', 400, 310);

    // Rodapé
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('#FinançasPro  •  financaspro.app', 400, 385);

    return canvas;
  }

  function compartilharConquista(titulo, emoji, subtitulo) {
    const canvas = gerarCardConquista(titulo, emoji, subtitulo);

    // Mostrar preview e botão de download/share
    const modal = document.getElementById('modal-compartilhar');
    if (modal) {
      const prev = document.getElementById('compartilhar-canvas-preview');
      if (prev) {
        prev.innerHTML = '';
        canvas.style.maxWidth = '100%';
        canvas.style.borderRadius = '12px';
        prev.appendChild(canvas);
      }
      const btn = document.getElementById('compartilhar-download-btn');
      if (btn) {
        btn.onclick = () => {
          canvas.toBlob(blob => {
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'conquista.png', {type:'image/png'})] })) {
              navigator.share({ files: [new File([blob], 'conquista.png', {type:'image/png'})], title: titulo });
            } else {
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'conquista_financaspro.png';
              a.click();
            }
          });
        };
      }
      modal.style.display = 'flex';
      requestAnimationFrame(() => modal.classList.add('open'));
    }
  }
  window.compartilharConquista = compartilharConquista;

  function fecharModalCompartilhar() {
    const m = document.getElementById('modal-compartilhar');
    if (!m) return;
    m.classList.remove('open');
    setTimeout(() => { m.style.display = 'none'; }, 280);
  }
  window.fecharModalCompartilhar = fecharModalCompartilhar;

  // ── P3.9 — Link de convite com XP bônus ─────────────────────
  function gerarLinkConvite() {
    const userId = (typeof config !== 'undefined' && config.userId)
      ? config.userId
      : (localStorage.getItem('fp_convite_id') || _gerarId());

    localStorage.setItem('fp_convite_id', userId);

    // URL com ref (funciona mesmo sem servidor — o app pode detectar o parâmetro)
    const base = window.location.origin + window.location.pathname;
    const link = base + '?ref=' + userId;

    const el = document.getElementById('convite-link');
    if (el) el.value = link;

    // Verificar se o usuário atual veio por convite
    _verificarConvite();
    return link;
  }
  window.gerarLinkConvite = gerarLinkConvite;

  function copiarLinkConvite() {
    const el = document.getElementById('convite-link');
    if (!el) return;
    navigator.clipboard?.writeText(el.value).then(() => {
      if (typeof mostrarToast === 'function') mostrarToast('Link copiado! Compartilhe com amigos 🎉', 'success');
    });
  }
  window.copiarLinkConvite = copiarLinkConvite;

  function _gerarId() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function _verificarConvite() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (!ref) return;
    const jaProcessado = localStorage.getItem('fp_convite_processado');
    if (jaProcessado) return;
    localStorage.setItem('fp_convite_processado', '1');
    // Dar XP bônus ao usuário atual
    if (typeof config !== 'undefined') {
      config.xp = (config.xp || 0) + 50;
      if (typeof _persistConfig === 'function') _persistConfig();
      if (typeof renderLevel === 'function') renderLevel();
    }
    if (typeof ganharCoins === 'function') ganharCoins(100, 'Convite de amigo!');
    if (typeof mostrarToast === 'function') mostrarToast('🎉 +50 XP bônus por vir pelo convite de um amigo!', 'achievement');
  }

  // ── Init ────────────────────────────────────────────────────
  function _init() { _verificarConvite(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else { _init(); }

})();
