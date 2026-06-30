/**
 * lucide-init.js — inicialização local dos ícones Lucide (sem CDN).
 */
(function() {
  if (window.location.protocol === 'file:') {
    var manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) manifestLink.remove();
  }

  var _iconRenderDebounce = null;

  window.renderLucideIcons = function(container) {
    if (_iconRenderDebounce) clearTimeout(_iconRenderDebounce);
    _iconRenderDebounce = setTimeout(function() {
      if (typeof lucide !== 'undefined') {
        var root = container || document.body;
        lucide.createIcons({ root: root });
        root.querySelectorAll('i[data-lucide]').forEach(function(icon) {
          if (!icon.hasAttribute('aria-label') && !icon.hasAttribute('aria-hidden')) {
            icon.setAttribute('aria-hidden', 'true');
          }
        });
      }
    }, 50);
  };

  document.addEventListener('DOMContentLoaded', function() {
    window.renderLucideIcons();
  });
})();
