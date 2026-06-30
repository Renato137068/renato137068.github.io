/**
 * EmptyState.js — Reusable empty state component
 * Displays empty states with animations and configurable CTA buttons
 * @version 11.0
 * @requires UI._utils
 * @module UI.EmptyState
 */

(function() {
  var UI = window.UI || {};

  /**
   * Empty state component with animations and configurable CTA
   * @namespace UI.EmptyState
   */
  UI.EmptyState = {
    /**
     * Renders an empty state as a DOM element
     * Accepts two formats:
     *   render(emoji, texto, aba?) — legacy format
     *   render({ emoji, titulo, subtitulo, aba, ctaTexto, animado }) — object config
     * @param {Object|string} config - Configuration object or emoji string (legacy)
     * @param {string} [texto] - Title text (legacy format)
     * @param {string} [aba] - Tab to switch to when CTA is clicked (legacy format)
     * @param {string} [config.emoji] - Emoji icon to display
     * @param {string} [config.titulo] - Title text
     * @param {string} [config.subtitulo] - Subtitle text
     * @param {string} [config.aba] - Tab to switch to when CTA is clicked
     * @param {string} [config.ctaTexto] - CTA button text
     * @param {boolean} [config.animado=true] - Whether to show animations
     * @returns {HTMLElement} The rendered empty state element
     */
    render: function(config, texto, aba) {
      var cfg = _normalizarConfig(config, texto, aba);

      var wrapper = document.createElement('div');
      wrapper.className = 'empty-state' + (cfg.animado !== false ? ' empty-state--animado' : '');

      var iconEl = document.createElement('div');
      iconEl.className = 'empty-emoji' + (cfg.animado !== false ? ' empty-emoji--float' : '');
      iconEl.setAttribute('aria-hidden', 'true');
      iconEl.textContent = cfg.emoji || '📭';
      wrapper.appendChild(iconEl);

      if (cfg.titulo) {
        var titleEl = document.createElement('p');
        titleEl.className = 'empty-titulo';
        titleEl.textContent = cfg.titulo;
        wrapper.appendChild(titleEl);
      }

      if (cfg.subtitulo) {
        var subEl = document.createElement('p');
        subEl.className = 'empty-texto';
        subEl.textContent = cfg.subtitulo;
        wrapper.appendChild(subEl);
      }

      if (cfg.aba) {
        var btn = document.createElement('button');
        btn.className = 'btn-empty-cta';
        btn.type = 'button';
        btn.setAttribute('data-mudar-aba', cfg.aba);
        btn.textContent = cfg.ctaTexto || '➕ Começar agora';
        wrapper.appendChild(btn);
      }

      return wrapper;
    },

    /**
     * Renders an empty state as an HTML string
     * Accepts two formats:
     *   html(emoji, texto, aba?) — legacy format
     *   html({ emoji, titulo, subtitulo, aba, ctaTexto, animado }) — object config
     * @param {Object|string} config - Configuration object or emoji string (legacy)
     * @param {string} [texto] - Title text (legacy format)
     * @param {string} [aba] - Tab to switch to when CTA is clicked (legacy format)
     * @param {string} [config.emoji] - Emoji icon to display
     * @param {string} [config.titulo] - Title text
     * @param {string} [config.subtitulo] - Subtitle text
     * @param {string} [config.aba] - Tab to switch to when CTA is clicked
     * @param {string} [config.ctaTexto] - CTA button text
     * @param {boolean} [config.animado=true] - Whether to show animations
     * @returns {string} The rendered empty state HTML string
     */
    html: function(config, texto, aba) {
      var esc = UI._utils.esc;
      var cfg = _normalizarConfig(config, texto, aba);

      var animClass  = cfg.animado !== false ? ' empty-state--animado' : '';
      var floatClass = cfg.animado !== false ? ' empty-emoji--float'   : '';
      var ctaTexto   = cfg.ctaTexto || '➕ Começar agora';

      return '<div class="empty-state' + animClass + '">' +
        '<div class="empty-emoji' + floatClass + '" aria-hidden="true">' + (cfg.emoji || '📭') + '</div>' +
        (cfg.titulo    ? '<p class="empty-titulo">' + esc(cfg.titulo)    + '</p>' : '') +
        (cfg.subtitulo ? '<p class="empty-texto">'  + esc(cfg.subtitulo) + '</p>' : '') +
        (cfg.aba
          ? '<button class="btn-empty-cta" type="button" data-mudar-aba="' + esc(cfg.aba) + '">' + esc(ctaTexto) + '</button>'
          : '') +
      '</div>';
    }
  };

  /**
   * Normalizes configuration from both legacy and object formats
   * @private
   * @param {Object|string} config - Configuration object or emoji string
   * @param {string} [texto] - Title text (legacy format)
   * @param {string} [aba] - Tab to switch to (legacy format)
   * @returns {Object} Normalized configuration object
   */
  function _normalizarConfig(config, texto, aba) {
    if (config && typeof config === 'object' && !Array.isArray(config)) {
      return config;
    }
    return {
      emoji:    config,
      titulo:   texto,
      subtitulo: null,
      aba:      aba,
      ctaTexto: null,
      animado:  true
    };
  }

  window.UI = UI;
})();
