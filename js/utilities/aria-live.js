/**
 * aria-live.js — ARIA live region manager for dynamic content
 * Announces dynamic content changes to screen readers
 * Usage: AriaLive.announce(message, 'polite') or AriaLive.announce(message, 'assertive')
 */

class AriaLive {
  constructor() {
    this.politeRegion = null;
    this.assertiveRegion = null;
    // Don't init immediately - wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  /**
   * Initialize ARIA live regions
   */
  init() {
    // Check if body exists before creating regions
    if (!document.body) {
      console.warn('ARIA live: document.body not ready, retrying...');
      setTimeout(() => this.init(), 100);
      return;
    }
    
    // Create polite region (for non-urgent announcements)
    this.politeRegion = this.createRegion('polite');
    
    // Create assertive region (for urgent announcements)
    this.assertiveRegion = this.createRegion('assertive');
  }

  /**
   * Create an ARIA live region
   */
  createRegion(politeness) {
    const region = document.createElement('div');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('class', 'sr-only');
    region.style.position = 'absolute';
    region.style.left = '-10000px';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';
    document.body.appendChild(region);
    return region;
  }

  /**
   * Announce a message to screen readers
   * @param {string} message - The message to announce
   * @param {string} politeness - 'polite' or 'assertive'
   */
  announce(message, politeness = 'polite') {
    const region = politeness === 'assertive' ? this.assertiveRegion : this.politeRegion;
    
    if (!region) {
      console.warn('ARIA live region not initialized');
      return;
    }

    // Clear previous message
    region.textContent = '';
    
    // Force browser to process the clear
    region.offsetHeight;
    
    // Set new message
    region.textContent = message;
  }

  /**
   * Announce success message
   */
  announceSuccess(message) {
    this.announce(`Sucesso: ${message}`, 'polite');
  }

  /**
   * Announce error message
   */
  announceError(message) {
    this.announce(`Erro: ${message}`, 'assertive');
  }

  /**
   * Announce loading state
   */
  announceLoading(message = 'Carregando') {
    this.announce(message, 'polite');
  }

  /**
   * Announce toast notification
   */
  announceToast(message, type = 'info') {
    const prefix = type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : type === 'warning' ? 'Aviso' : 'Informação';
    this.announce(`${prefix}: ${message}`, type === 'error' ? 'assertive' : 'polite');
  }
}

// Create singleton instance
const ariaLive = new AriaLive();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ariaLive;
}
