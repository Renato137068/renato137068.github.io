/**
 * logger.js — Sistema de logging condicional
 * Desativa logs em produção para evitar poluição do console
 */

var Logger = {
  enabled: window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'file:',
  
  error: function() {
    if (this.enabled && console && console.error) {
      console.error.apply(console, arguments);
    }
  },
  
  warn: function() {
    if (this.enabled && console && console.warn) {
      console.warn.apply(console, arguments);
    }
  },
  
  info: function() {
    if (this.enabled && console && console.info) {
      console.info.apply(console, arguments);
    }
  },
  
  log: function() {
    if (this.enabled && console && console.log) {
      console.log.apply(console, arguments);
    }
  },
  
  debug: function() {
    if (this.enabled && console && console.debug) {
      console.debug.apply(console, arguments);
    }
  }
};

// Exportar para uso global
window.Logger = Logger;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logger;
}
