// FinançasPro — Configuração e Constantes
// v11.0 — Independente: carregado primeiro

const APP_VERSION = '11.0';

// ── CONFIGURAÇÃO DO PLANO ──
// Object.freeze: impede mutação acidental por outros módulos
const PLANO = Object.freeze({
  TRIAL_DAYS: 36500,          // gratuito para sempre
  DAILY_GOAL_TXS: 3,
  PREMIUM_HISTORICO_MESES: 99,
  CHECKOUT_URL: '#',          // TODO: substituir pela URL do Hotmart/checkout
});

// Helper: retorna URL de checkout (facilita substituição futura)
function getCheckoutUrl(plano) {
  return PLANO.CHECKOUT_URL || '#';
}

// ── CATEGORIAS ──
// Object.freeze: evita sobrescrever ícones/labels em runtime
const CATEGORIAS_ICON = Object.freeze({
  alimentacao:'🍔', moradia:'🏠', transporte:'🚗', saude:'💊', educacao:'📚',
  lazer:'🎮', vestuario:'👕', salario:'💼', freelance:'💻', investimentos:'📈',
  outros:'📦', '':'📌'
});

const CATEGORIAS_LABEL = Object.freeze({
  alimentacao:'Alimentação', moradia:'Moradia', transporte:'Transporte', saude:'Saúde',
  educacao:'Educação', lazer:'Lazer', vestuario:'Vestuário', salario:'Salário',
  freelance:'Freelance', investimentos:'Investimentos', outros:'Outros'
});

// ════════════════════════════════════
