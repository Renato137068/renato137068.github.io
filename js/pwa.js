// FinançasPro — PWA: Dark Mode · BCB Rates · Calculadora Inline · Atalhos · Haptic
// ════════════════════════════════════════════════════════════════════════════════

// ── 1. SERVICE WORKER (com UI de atualização) ────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        console.debug('[PWA] Service Worker registrado:', reg.scope);

        // Checa atualização a cada 30min
        setInterval(() => reg.update(), 30 * 60 * 1000);

        // Detecta quando há um novo SW pronto para ativar
        function _onNewSW(worker) {
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              _showUpdateBanner(worker);
            }
          });
        }

        if (reg.waiting) {
          _showUpdateBanner(reg.waiting);
        }
        if (reg.installing) {
          _onNewSW(reg.installing);
        }
        reg.addEventListener('updatefound', () => {
          if (reg.installing) _onNewSW(reg.installing);
        });
      })
      .catch(err => console.warn('[PWA] Service Worker nao registrado:', err));

    // Recarrega quando o novo SW assume controle
    let _refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!_refreshing) { _refreshing = true; location.reload(); }
    });
  });
}

function _showUpdateBanner(worker) {
  // Remove banner anterior se existir
  const old = document.getElementById('sw-update-banner');
  if (old) old.remove();

  const banner = document.createElement('div');
  banner.id = 'sw-update-banner';
  banner.className = 'sw-update-banner';
  // DOM seguro — sem innerHTML
  const icon = document.createElement('span');
  icon.className = 'sw-update-icon'; icon.textContent = '\ud83d\udd04';
  const txt = document.createElement('span');
  txt.className = 'sw-update-text'; txt.textContent = 'Nova vers\u00e3o dispon\u00edvel!';
  const btnAccept = document.createElement('button');
  btnAccept.className = 'sw-update-btn'; btnAccept.textContent = 'Atualizar';
  const btnDismiss = document.createElement('button');
  btnDismiss.className = 'sw-update-dismiss'; btnDismiss.textContent = '\u2715';
  banner.append(icon, txt, btnAccept, btnDismiss);
  document.body.appendChild(banner);

  btnAccept.addEventListener('click', () => {
    worker.postMessage('SKIP_WAITING');
    banner.remove();
  });
  btnDismiss.addEventListener('click', () => {
    banner.remove();
  });
}

// ── 2. DARK MODE ───────────────────────────────────────────────────────────────
const DARK_KEY = 'fp_dark_mode';

function initDarkMode() {
  const saved = localStorage.getItem(DARK_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved !== null ? saved === 'true' : prefersDark;
  applyDarkMode(isDark, false);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem(DARK_KEY) === null) applyDarkMode(e.matches, true);
  });
}

function applyDarkMode(dark, animate = true) {
  if (animate) {
    document.documentElement.classList.add('theme-transitioning');
    setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 400);
  }
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  localStorage.setItem(DARK_KEY, String(dark));
  const btn = document.getElementById('dark-mode-toggle');
  if (btn) {
    btn.textContent = dark ? '\u2600\ufe0f' : '\ud83c\udf19';
    btn.title = dark ? 'Modo claro' : 'Modo escuro';
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#0f172a' : '#16a34a';
}

function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyDarkMode(!isDark);
  haptic(30);
}

// ── 3. TAXAS DO BANCO CENTRAL (API gratuita) ───────────────────────────────────
const BCB_KEY = 'fp_bcb_rates';
const BCB_TTL = 3600000; // 1 hora em ms

// FIX: variavel de modulo em vez de expando no DOM (simTaxa._bcbFilled)
let _simTaxaFilled = false;

async function fetchBCBRates() {
  try {
    const raw = localStorage.getItem(BCB_KEY);
    if (raw) {
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts < BCB_TTL) { renderBCBRates(data); return; }
    }
  } catch(e) {}

  // FIX: AbortController com timeout de 8s + Promise.allSettled para resiliencia parcial
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const settled = await Promise.allSettled([
      fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json',   { signal: controller.signal }).then(r => r.ok ? r.json() : null),
      fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json',   { signal: controller.signal }).then(r => r.ok ? r.json() : null),
      fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json', { signal: controller.signal }).then(r => r.ok ? r.json() : null)
    ]);
    clearTimeout(timer);

    const get     = res => res.status === 'fulfilled' && res.value ? parseFloat(res.value[0].valor) : null;
    const getDate = res => res.status === 'fulfilled' && res.value ? res.value[0].data  : null;

    const selic = get(settled[0]);
    const cdi   = get(settled[1]);
    const ipca  = get(settled[2]);
    const dataRef = getDate(settled[0]) || getDate(settled[1]) || getDate(settled[2])
                    || new Date().toLocaleDateString('pt-BR');

    if (selic === null && cdi === null && ipca === null) throw new Error('Todas as requisicoes BCB falharam');

    const data = { selic: selic !== null ? selic : 0, cdi: cdi !== null ? cdi : 0, ipca: ipca !== null ? ipca : 0, data: dataRef };
    localStorage.setItem(BCB_KEY, JSON.stringify({ data, ts: Date.now() }));
    renderBCBRates(data);
  } catch(e) {
    clearTimeout(timer);
    console.warn('[BCB] Nao foi possivel carregar taxas:', e);
    const el = document.getElementById('bcb-rates-content');
    if (el) el.innerHTML = '<span style="font-size:.8rem;color:var(--text-muted);">Taxas indisponiveis no momento</span>';
  }
}

function renderBCBRates(rates) {
  const el = document.getElementById('bcb-rates-content');
  if (!el) return;
  const ipcaClass = rates.ipca > 6 ? 'rate-danger' : rates.ipca > 4 ? 'rate-warning' : 'rate-ok';

  // DOM seguro — sem innerHTML
  el.textContent = '';
  const items = [
    { icon: '\ud83c\udfe6', label: 'Selic',  value: rates.selic.toFixed(2), cls: 'rate-ok',  sub: 'Taxa b\u00e1sica de juros' },
    { icon: '\ud83d\udcb0', label: 'CDI',    value: rates.cdi.toFixed(2),   cls: 'rate-ok',  sub: 'Refer\u00eancia renda fixa' },
    { icon: '\ud83d\udcc8', label: 'IPCA',   value: rates.ipca.toFixed(2),  cls: ipcaClass,  sub: 'Infla\u00e7\u00e3o acumulada 12m' }
  ];
  items.forEach(function(d) {
    const div = document.createElement('div');
    div.className = 'bcb-rate-item';
    const lbl = document.createElement('div');
    lbl.className = 'bcb-rate-label'; lbl.textContent = d.icon + ' ' + d.label;
    const val = document.createElement('div');
    val.className = 'bcb-rate-value ' + d.cls; val.textContent = d.value + '% a.a.';
    const sub = document.createElement('div');
    sub.className = 'bcb-rate-sub'; sub.textContent = d.sub;
    div.append(lbl, val, sub);
    el.appendChild(div);
  });
  const footer = document.createElement('div');
  footer.className = 'bcb-rates-footer';
  footer.textContent = 'Atualizado em ' + rates.data + ' \u00b7 Fonte: Banco Central do Brasil';
  el.appendChild(footer);

  const simTaxa = document.getElementById('sim-taxa');
  if (simTaxa && !_simTaxaFilled) {
    const cdiMensal = (Math.pow(1 + rates.cdi / 100, 1/12) - 1) * 100;
    simTaxa.placeholder = cdiMensal.toFixed(4) + ' (CDI atual)';
    _simTaxaFilled = true;
  }
}

// ── 4. CALCULADORA INLINE no campo Valor ──────────────────────────────────────
// Parser matemático seguro (sem eval/Function) — suporta +, -, *, /, ()
function _safeCalc(expr) {
  const tokens = [];
  let i = 0;
  const s = expr.replace(/\s/g, '');
  while (i < s.length) {
    if ('0123456789.'.includes(s[i])) {
      let num = '';
      while (i < s.length && '0123456789.'.includes(s[i])) { num += s[i]; i++; }
      tokens.push({ type: 'num', value: parseFloat(num) });
      if (isNaN(tokens[tokens.length-1].value)) return NaN;
    } else if ('+-*/()'.includes(s[i])) {
      tokens.push({ type: 'op', value: s[i] }); i++;
    } else { return NaN; }
  }
  let pos = 0;
  function peek() { return pos < tokens.length ? tokens[pos] : null; }
  function consume() { return tokens[pos++]; }
  function parseExpr() {
    let left = parseTerm();
    while (peek() && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }
  function parseTerm() {
    let left = parseFactor();
    while (peek() && (peek().value === '*' || peek().value === '/')) {
      const op = consume().value;
      const right = parseFactor();
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }
  function parseFactor() {
    const t = peek();
    if (!t) return NaN;
    if (t.type === 'num') { consume(); return t.value; }
    if (t.value === '(') {
      consume();
      const val = parseExpr();
      if (peek() && peek().value === ')') consume();
      return val;
    }
    // Suporte a número negativo: -5
    if (t.value === '-') {
      consume();
      return -parseFactor();
    }
    if (t.value === '+') {
      consume();
      return parseFactor();
    }
    return NaN;
  }
  const result = parseExpr();
  return pos === tokens.length ? result : NaN;
}

function initInlineCalc() {
  const input = document.getElementById('tx-valor');
  if (!input) return;

  const hint = document.createElement('div');
  hint.id = 'calc-hint';
  hint.className = 'calc-hint';
  hint.innerHTML = '\u2328\ufe0f Pressione <kbd>Enter</kbd> ou <kbd>=</kbd> para calcular';
  hint.style.display = 'none';
  input.parentNode.insertBefore(hint, input.nextSibling);

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === '=') {
      const expr = input.value.replace(',', '.').replace(/[^0-9+\-*/.()]/g, '');
      if (/[+\-*\/]/.test(expr)) {
        e.preventDefault();
        const result = _safeCalc(expr);
        if (isFinite(result) && result > 0) {
          input.value = parseFloat(result.toFixed(2));
          hint.style.display = 'none';
          input.classList.add('calc-flash');
          setTimeout(() => input.classList.remove('calc-flash'), 500);
          haptic([20, 50, 20]);
        } else {
          input.classList.add('calc-error');
          setTimeout(() => input.classList.remove('calc-error'), 500);
        }
      }
    }
  });

  input.addEventListener('input', () => {
    const hasOp = /[+\-*\/]/.test(input.value);
    hint.style.display = hasOp ? 'block' : 'none';
  });
}

// ── 5. ATALHOS DE TECLADO ─────────────────────────────────────────────────────
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    const tag = e.target.tagName;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      switch(e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          switchTab(null, 'dashboard');
          setTimeout(() => document.getElementById('tx-desc') && document.getElementById('tx-desc').focus(), 100);
          break;
        case 'e':
          e.preventDefault();
          switchTab(null, 'transacoes');
          break;
        case 'd':
          e.preventDefault();
          switchTab(null, 'dashboard');
          break;
      }
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
      const fp = document.getElementById('fp-modal-overlay');
      if (fp && !fp.classList.contains('hidden')) fp.classList.add('hidden');
      const ob = document.getElementById('onboarding-overlay');
      if (ob && !ob.classList.contains('hidden')) ob.classList.add('hidden');
    }
  });
}

// ── 6. HAPTIC FEEDBACK ───────────────────────────────────────────────────────
function haptic(pattern) {
  if (pattern === undefined) pattern = 30;
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// ── 7. BANNER DE INSTALACAO PWA ──────────────────────────────────────────────
let _deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredPrompt = e;
  showInstallBanner();
});

function showInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.style.display = 'flex';
    setTimeout(() => { banner.style.display = 'none'; }, 15000);
  }
}

function instalarPWA() {
  if (!_deferredPrompt) return;
  _deferredPrompt.prompt();
  _deferredPrompt.userChoice.then(function(result) {
    if (result.outcome === 'accepted') mostrarToast('App instalado com sucesso!', 'success');
    _deferredPrompt = null;
    var b = document.getElementById('pwa-install-banner');
    if (b) b.style.display = 'none';
  });
}

// ── INIT ─────────────────────────────────────────────────────────────────────
// FIX: readyState check — com scripts defer, DOMContentLoaded pode ja ter
// disparado quando este modulo executa. O padrao abaixo cobre ambos os casos.
function _initPwa() {
  initDarkMode();
  initInlineCalc();
  initKeyboardShortcuts();
  fetchBCBRates();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initPwa);
} else {
  _initPwa();
}
