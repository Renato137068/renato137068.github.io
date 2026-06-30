/**
 * design-tokens.js — Exported design tokens for JavaScript use
 * Provides access to CSS custom properties as JavaScript values
 * Usage: import { colors, spacing, typography } from './design-tokens.js';
 */

const DesignTokens = {
  /**
   * Get CSS custom property value
   * @param {string} property - CSS variable name (e.g., '--color-primary')
   * @param {string} [element=document.documentElement] - Element to get value from
   * @returns {string} The computed value of the CSS variable
   */
  get: function(property, element) {
    element = element || document.documentElement;
    return getComputedStyle(element).getPropertyValue(property).trim();
  },

  /**
   * Color tokens
   */
  colors: {
    primary: {
      50: () => DesignTokens.get('--color-primary-50'),
      100: () => DesignTokens.get('--color-primary-100'),
      200: () => DesignTokens.get('--color-primary-200'),
      300: () => DesignTokens.get('--color-primary-300'),
      400: () => DesignTokens.get('--color-primary-400'),
      500: () => DesignTokens.get('--color-primary-500'),
      600: () => DesignTokens.get('--color-primary-600'),
      700: () => DesignTokens.get('--color-primary-700'),
      800: () => DesignTokens.get('--color-primary-800'),
      900: () => DesignTokens.get('--color-primary-900'),
    },
    success: {
      bg: () => DesignTokens.get('--color-success-bg'),
      light: () => DesignTokens.get('--color-success-light'),
      dark: () => DesignTokens.get('--color-success-dark'),
    },
    danger: {
      bg: () => DesignTokens.get('--color-danger-bg'),
      light: () => DesignTokens.get('--color-danger-light'),
      dark: () => DesignTokens.get('--color-danger-dark'),
    },
    warning: {
      bg: () => DesignTokens.get('--color-warning-bg'),
      light: () => DesignTokens.get('--color-warning-light'),
      dark: () => DesignTokens.get('--color-warning-dark'),
    },
    text: {
      primary: () => DesignTokens.get('--color-text-primary'),
      secondary: () => DesignTokens.get('--color-text-secondary'),
      muted: () => DesignTokens.get('--color-text-muted'),
      inverse: () => DesignTokens.get('--color-text-inverse'),
    },
    background: {
      page: () => DesignTokens.get('--color-bg-page'),
      card: () => DesignTokens.get('--color-bg-card'),
      dark: {
        page: () => DesignTokens.get('--color-bg-dark-page'),
        card: () => DesignTokens.get('--color-bg-dark-card'),
      }
    },
    border: {
      light: () => DesignTokens.get('--color-border-light'),
      default: () => DesignTokens.get('--color-border'),
    }
  },

  /**
   * Spacing tokens
   */
  spacing: {
    0: () => DesignTokens.get('--space-0'),
    1: () => DesignTokens.get('--space-1'),
    2: () => DesignTokens.get('--space-2'),
    3: () => DesignTokens.get('--space-3'),
    4: () => DesignTokens.get('--space-4'),
    5: () => DesignTokens.get('--space-5'),
    6: () => DesignTokens.get('--space-6'),
    8: () => DesignTokens.get('--space-8'),
    10: () => DesignTokens.get('--space-10'),
    12: () => DesignTokens.get('--space-12'),
    16: () => DesignTokens.get('--space-16'),
    20: () => DesignTokens.get('--space-20'),
    24: () => DesignTokens.get('--space-24'),
  },

  /**
   * Typography tokens
   */
  typography: {
    fontFamily: {
      sans: () => DesignTokens.get('--font-family-sans'),
      display: () => DesignTokens.get('--font-family-display'),
    },
    fontSize: {
      xs: () => DesignTokens.get('--font-size-xs'),
      sm: () => DesignTokens.get('--font-size-sm'),
      base: () => DesignTokens.get('--font-size-base'),
      lg: () => DesignTokens.get('--font-size-lg'),
      xl: () => DesignTokens.get('--font-size-xl'),
      '2xl': () => DesignTokens.get('--font-size-2xl'),
      '3xl': () => DesignTokens.get('--font-size-3xl'),
      '4xl': () => DesignTokens.get('--font-size-4xl'),
    },
    fontWeight: {
      normal: () => DesignTokens.get('--font-weight-normal'),
      medium: () => DesignTokens.get('--font-weight-medium'),
      semibold: () => DesignTokens.get('--font-weight-semibold'),
      bold: () => DesignTokens.get('--font-weight-bold'),
      extrabold: () => DesignTokens.get('--font-weight-extrabold'),
    },
    lineHeight: {
      tight: () => DesignTokens.get('--line-height-tight'),
      normal: () => DesignTokens.get('--line-height-normal'),
      relaxed: () => DesignTokens.get('--line-height-relaxed'),
    },
    letterSpacing: {
      normal: () => DesignTokens.get('--letter-spacing-normal'),
      wide: () => DesignTokens.get('--letter-spacing-wide'),
      wider: () => DesignTokens.get('--letter-spacing-wider'),
    }
  },

  /**
   * Border radius tokens
   */
  borderRadius: {
    none: () => DesignTokens.get('--radius-none'),
    sm: () => DesignTokens.get('--radius-sm'),
    md: () => DesignTokens.get('--radius-md'),
    lg: () => DesignTokens.get('--radius-lg'),
    xl: () => DesignTokens.get('--radius-xl'),
    '2xl': () => DesignTokens.get('--radius-2xl'),
    full: () => DesignTokens.get('--radius-full'),
  },

  /**
   * Shadow tokens
   */
  shadows: {
    xs: () => DesignTokens.get('--shadow-xs'),
    sm: () => DesignTokens.get('--shadow-sm'),
    md: () => DesignTokens.get('--shadow-md'),
    lg: () => DesignTokens.get('--shadow-lg'),
    xl: () => DesignTokens.get('--shadow-xl'),
    '2xl': () => DesignTokens.get('--shadow-2xl'),
    card: () => DesignTokens.get('--shadow-card'),
    'card-premium': () => DesignTokens.get('--shadow-card-premium'),
    'card-hover': () => DesignTokens.get('--shadow-card-hover'),
  },

  /**
   * Transition tokens
   */
  transitions: {
    fast: () => DesignTokens.get('--transition-fast'),
    normal: () => DesignTokens.get('--transition-normal'),
    slow: () => DesignTokens.get('--transition-slow'),
    smooth: () => DesignTokens.get('--transition-smooth'),
  },

  /**
   * Z-index tokens
   */
  zIndex: {
    base: () => DesignTokens.get('--z-base'),
    dropdown: () => DesignTokens.get('--z-dropdown'),
    sticky: () => DesignTokens.get('--z-sticky'),
    modal: () => DesignTokens.get('--z-modal'),
    popover: () => DesignTokens.get('--z-popover'),
    tooltip: () => DesignTokens.get('--z-tooltip'),
    top: () => DesignTokens.get('--z-top'),
  },

  /**
   * Breakpoint tokens
   */
  breakpoints: {
    mobileSmall: 360,
    mobile: 420,
    mobileLarge: 480,
    tablet: 768,
    desktop: 1024,
    desktopLarge: 1280,
    desktopXL: 1440,
  }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DesignTokens;
}
