// FinançasPro — Sistema de Trial
// Depende de: config.js, dados.js

// MÓDULO TRIAL — 7 dias gratuitos
// ════════════════════════════════════

// FIX: referência do timer — evita múltiplos intervals se checkTrial() for chamado mais de uma vez
let _trialTimer = null;

/**
 * Inicializa o trial. Salva o timestamp no primeiro acesso.
 */
function checkTrial() {
  if (!localStorage.getItem('trial_start_date')) {
    localStorage.setItem('trial_start_date', String(Date.now()));
  }
  if (isTrialExpired()) {
    renderBlockScreen();
  } else {
    renderTrialBanner();
    // Atualizar contador a cada hora
    if (_trialTimer) clearInterval(_trialTimer); // FIX: cancela interval anterior
    _trialTimer = setInterval(renderTrialBanner, 3600000);
  }
}

/**
 * Retorna dias restantes do trial (0 se expirado).
 */
function getRemainingDays() {
  const start = parseInt(localStorage.getItem('trial_start_date') || '0');
  const elapsed = Date.now() - start;
  const days = Math.ceil((PLANO.TRIAL_DAYS * 86400000 - elapsed) / 86400000);
  return Math.max(0, days);
}

/**
 * Retorna true se o trial expirou.
 */
function isTrialExpired() {
  const start = parseInt(localStorage.getItem('trial_start_date') || '0');
  if (!start) return false;
  return (Date.now() - start) > PLANO.TRIAL_DAYS * 86400000;
}

/**
 * Renderiza o banner discreto de trial no topo.
 */
function renderTrialBanner() {
  var banner = document.getElementById("trial-banner");
  var badgeText = document.getElementById("trial-badge-text");
  if (banner) banner.style.display = "none";
  if (badgeText) badgeText.textContent = "100% Gratuito";
}

/**
 * Exibe a tela de bloqueio quando o trial expira.
 */
function renderBlockScreen() {
  const screen = document.getElementById('trial-block-screen');
  const app = document.getElementById('app-container');
  if (screen) {
    const btn = document.getElementById('trial-block-btn');
    if (btn) btn.href = PLANO.CHECKOUT_URL;
    screen.style.display = 'flex';
  }
  if (app) app.style.display = 'none';
}

/**
 * Reseta o trial (uso administrativo / testes).
 */
function resetTrial() {
  // FIX: location.reload() em vez de init() — evita double-initialization
  // de event listeners, timers e outros efeitos colaterais de init().
  localStorage.removeItem('trial_start_date');
  showToast('Trial resetado — recarregando…', 'success');
  setTimeout(() => location.reload(), 800);
}

// ════════════════════════════════════
// MÓDULO 2: FREEMIUM + CONVERSÃO
// ════════════════════════════════════
// Token secreto — troque a cada 3 meses para proteger o acesso


// ════════════════════════════════════
