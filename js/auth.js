// FinançasPro — Autenticação (Supabase)
// v10.8 — Resiliente: app sempre funciona, auth é complementar
// Fluxo: boot → renderizar app → verificar sessão async → enriquecer se logado

// ════════════════════════════════════
// MÓDULO 0: SUPABASE AUTH
// ════════════════════════════════════
const SUPABASE_URL = 'https://nubvlksibmpryltkfpei.supabase.co';
// Esta é a anon key (chave pública) — não é segredo expô-la no cliente.
// A segurança real vem das Row Level Security policies no Supabase Dashboard.
const SUPABASE_KEY = 'sb_publishable_dEMKnabVEInkS0kC-tNz8w_cvN4yXv9';
let sb = null;
let _sbInitialized = false;   // guard: nunca inicializar duas vezes
let currentUser = null;
let _loginTab = 'entrar';

// ── Rate limiting progressivo (P1.2) ──
// Escalona o cooldown a cada falha consecutiva: 5s → 30s → 120s → 300s
let _loginFailCount  = 0;
let _loginCooldownUntil = 0;
const _COOLDOWN_STEPS = [5, 30, 120, 300]; // segundos por nível de falha

// ── Session timeout (P1.3) ──
let _sessionTimer    = null;  // timer de logout automático
let _sessionWarnTimer= null;  // timer de aviso antecipado
const SESSION_TIMEOUT_MS   = 30 * 60 * 1000; // 30 min
const SESSION_WARN_BEFORE_MS = 2 * 60 * 1000; // aviso 2 min antes

// ════════════════════════════════════
// INICIALIZAÇÃO SEGURA (não bloqueante)
// ════════════════════════════════════

function initSupabase() {
  // Guard: evita múltiplos onAuthStateChange e re-inicializações
  if (_sbInitialized) {
    console.warn('[Auth] initSupabase chamado mais de uma vez — ignorado.');
    return;
  }
  _sbInitialized = true;

  if (typeof supabase === 'undefined') {
    console.warn('[Auth] CDN Supabase indisponível — modo visitante ativo.');
    return;
  }

  try {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    console.log('[Auth] Cliente Supabase criado.');
  } catch (e) {
    console.warn('[Auth] Falha ao criar cliente Supabase:', e.message);
    sb = null;
    return;
  }

  // Listener único — trata todos os eventos de auth
  sb.auth.onAuthStateChange((event, session) => {
    console.log('[Auth] evento:', event);

    // Erros de token inválido → limpar silenciosamente, continuar como visitante
    if (event === 'TOKEN_REFRESH_FAILED') {
      console.warn('[Auth] Refresh token inválido — limpando sessão silenciosamente.');
      _limparTokensLocais();
      sb.auth.signOut().catch(() => {});
      return;
    }

    // Logout explícito
    if (event === 'SIGNED_OUT') {
      _aplicarModoVisitante();
      return;
    }

    // Sessão inicial ou login bem-sucedido
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (session && session.user) {
        _aplicarModoLogado(session.user);
      } else if (event === 'INITIAL_SESSION') {
        // Sem sessão válida no boot — limpar possíveis tokens corrompidos
        _limparTokensLocais();
        console.log('[Auth] Nenhuma sessão ativa — modo visitante.');
      }
    }
  });
}

// ════════════════════════════════════
// HELPERS INTERNOS
// ════════════════════════════════════

// Remove tokens Supabase corrompidos do localStorage sem quebrar o app
// Inclui check de disponibilidade do localStorage (modo privado em alguns browsers)
function _limparTokensLocais() {
  try {
    if (typeof localStorage === 'undefined') return;
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-') || k.includes('supabase.auth'))
      .forEach(k => localStorage.removeItem(k));
  } catch (e) { /* silencioso */ }
}

// Aplicar modo logado: atualizar UI + sincronizar dados + ativar Realtime premium
async function _aplicarModoLogado(user) {
  currentUser = user;
  const nome = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
  const avatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const userInfo = document.getElementById('user-info');
  const btnLogout = document.getElementById('btn-logout');
  if (avatar) avatar.textContent = nome.charAt(0).toUpperCase();
  if (userName) userName.textContent = nome;
  if (userInfo) userInfo.style.display = 'flex';
  if (btnLogout) btnLogout.style.display = 'block';
  console.log('[Auth] Modo logado:', user.email);
  try {
    await sincronizarPerfil();
    await loadFromCloud();
  } catch (e) {
    console.warn('[Auth] Erro ao sincronizar dados da nuvem:', e.message);
  }
  verificarPremiumSupabase();
  _assinarPremiumRealtime(user.id);  // reage em tempo real a upgrades de plano
  _iniciarSessionTimeout();          // P1.3 — timeout de inatividade
}

// Aplicar modo visitante: limpar estado do usuário
function _aplicarModoVisitante() {
  currentUser = null;
  const userInfo = document.getElementById('user-info');
  const btnLogout = document.getElementById('btn-logout');
  if (userInfo) userInfo.style.display = 'none';
  if (btnLogout) btnLogout.style.display = 'none';
  config.isPremiumUser = false;
  _pararSessionTimeout();            // P1.3 — parar timeout de inatividade
  console.log('[Auth] Modo visitante ativo.');
}

// Supabase Realtime: reage imediatamente quando is_premium mudar no banco
// (útil se o usuário pagar em outra aba ou dispositivo — sem precisar relogar)
// Gratuito até 200 conexões simultâneas no Supabase free tier.
let _realtimeChannel = null;
function _assinarPremiumRealtime(userId) {
  if (!sb || !userId) return;
  // Cancela subscription anterior se existir
  if (_realtimeChannel) { sb.removeChannel(_realtimeChannel); }
  _realtimeChannel = sb.channel(`premium-${userId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'perfis',
      filter: `user_id=eq.${userId}`
    }, payload => {
      if (payload.new && payload.new.is_premium && !config.isPremiumUser) {
        console.log('[Auth] Premium ativado via Realtime!');
        config.isPremiumUser = true;
        _persistConfig();
        renderTudo();
        showToast('🎉 Plano Premium ativado!', 'success');
      }
    })
    .subscribe();
}

// ════════════════════════════════════
// FUNÇÕES DE UI — chamadas do HTML
// ════════════════════════════════════

// Usar sem login (modo visitante explícito)
function usarSemConta() {
  currentUser = null;
  const ls = document.getElementById('login-screen');
  if (ls) { ls.style.display = 'none'; ls.classList.add('hidden'); }
  const app = document.getElementById('app-container');
  if (app) app.style.display = 'block';
}

// Abrir tela de login (opcional — para cloud sync)
function mostrarLogin() {
  if (ls) { ls.style.display = 'flex'; ls.classList.remove('hidden'); }
  if (app) app.style.display = 'none';
  if (userInfo) userInfo.style.display = 'none';
  if (btnLogout) btnLogout.style.display = 'none';
}

// Fechar tela de login e voltar ao app
function mostrarApp() {
  if (ls) { ls.style.display = 'none'; ls.classList.add('hidden'); }
  if (app) app.style.display = 'block';
  if (currentUser) {
    if (avatar) avatar.textContent = nome.charAt(0).toUpperCase();
    if (userName) userName.textContent = nome;
    if (userInfo) userInfo.style.display = 'flex';
    if (btnLogout) btnLogout.style.display = 'block';
    verificarPremiumSupabase();
  }
  renderTudo();
}

// ════════════════════════════════════
// PREMIUM
// ════════════════════════════════════

async function verificarPremiumSupabase() {
  if (!currentUser || !sb) return;
  try {
    const { data } = await sb
      .from('perfis')
      .select('is_premium')
      .eq('user_id', currentUser.id)
      .single();
    if (data && data.is_premium) {
      config.isPremiumUser = true;
      _persistConfig();
      renderTudo();
    }
  } catch (e) {
    console.warn('[Auth] Erro ao verificar premium:', e.message);
  }
}

// ════════════════════════════════════
// SINCRONIZAÇÃO DE PERFIL
// ════════════════════════════════════

async function sincronizarPerfil() {
  if (!currentUser || !sb) return;
  try {
    await sb.from('perfis').upsert({
      user_id: currentUser.id,
      email: currentUser.email,
      nome: nome,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id', ignoreDuplicates: false });
  } catch (e) {
    console.warn('[Auth] Erro ao sincronizar perfil:', e.message);
  }
}

// ════════════════════════════════════
// LOGIN / CADASTRO POR EMAIL
// ════════════════════════════════════

function setLoginTab(tab, ev) {
  _loginTab = tab;
  document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
  const btn = ev && ev.target ? ev.target : document.querySelector('.login-tab');
  if (btn) btn.classList.add('active');
  const submitBtn = document.getElementById('login-btn-submit');
  if (submitBtn) submitBtn.textContent = tab === 'entrar' ? 'Entrar' : 'Criar conta';
  loginMsg('', '');
}

function loginMsg(msg, tipo) {
  const el = document.getElementById('login-msg');
  if (!el) return;
  el.textContent = msg;
  el.className = 'login-msg' + (tipo ? ' ' + tipo : '');
}

async function _loginComEmail_base() {
  if (!sb) { loginMsg('Serviço indisponível. Tente mais tarde.', 'error'); return; }

  // Cooldown anti-brute-force client-side (5s entre tentativas com erro)
  if (Date.now() < _loginCooldown) {
    const restante = Math.ceil((_loginCooldown - Date.now()) / 1000);
    loginMsg(`Aguarde ${restante}s antes de tentar novamente.`, 'error');
    return;
  }

  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  if (!email || !senha) { loginMsg('Preencha email e senha.', 'error'); return; }
  if (senha.length < 6) { loginMsg('Senha deve ter ao menos 6 caracteres.', 'error'); return; }
  btn.disabled = true;
  btn.textContent = 'Aguarde...';
  try {
    let result;
    if (_loginTab === 'entrar') {
      result = await sb.auth.signInWithPassword({ email, password: senha });
    } else {
      result = await sb.auth.signUp({ email, password: senha });
      if (!result.error && result.data.user && !result.data.session) {
        loginMsg('Conta criada! Verifique seu email para confirmar.', 'success');
        btn.disabled = false; btn.textContent = 'Criar conta'; return;
      }
    }
    if (result.error) {
      const msgs = {
        'Invalid login credentials': 'Email ou senha incorretos.',
        'Email not confirmed': 'Confirme seu email antes de entrar.',
        'User already registered': 'Email já cadastrado. Tente entrar.',
      };
      loginMsg(msgs[result.error.message] || result.error.message || 'Erro ao entrar.', 'error');
      _registrarFalhaLogin();
    } else {
      // Sucesso — onAuthStateChange cuida do resto
      _resetarFalhasLogin();
    }
  } catch (e) {
    loginMsg('Erro inesperado: ' + e.message, 'error');
    _registrarFalhaLogin();
  } finally {
    btn.disabled = false;
    btn.textContent = _loginTab === 'entrar' ? 'Entrar' : 'Criar conta';
  }
}

// ════════════════════════════════════════════════════════════════════

// ── P1.2 — Rate limiting progressivo ────────────────────────────────────────
function _getCooldownSecs() {
  const idx = Math.min(_loginFailCount, _COOLDOWN_STEPS.length - 1);
  return _COOLDOWN_STEPS[idx];
}
function _registrarFalhaLogin() {
  _loginFailCount++;
  _loginCooldownUntil = Date.now() + _getCooldownSecs() * 1000;
  console.warn('[Auth] Falha #' + _loginFailCount + ' — cooldown ' + _getCooldownSecs() + 's');
}
function _resetarFalhasLogin() {
  _loginFailCount = 0;
  _loginCooldownUntil = 0;
}
function _verificarCooldown() {
  const restante = Math.ceil((_loginCooldownUntil - Date.now()) / 1000);
  if (restante > 0) {
    loginMsg('Aguarde ' + restante + 's antes de tentar novamente.', 'error');
    return true;
  }
  return false;
}

// ── P1.3 — Session timeout por inatividade ───────────────────────────────────
const _SESSION_EVENTS = ['mousemove','keydown','click','touchstart','scroll'];

function _iniciarSessionTimeout() {
  _pararSessionTimeout();
  _SESSION_EVENTS.forEach(ev => window.addEventListener(ev, _resetarSessionTimer, { passive: true }));
  _resetarSessionTimer();
  console.log('[Auth] Session timeout iniciado (30 min)');
}
function _pararSessionTimeout() {
  if (_sessionTimer)     { clearTimeout(_sessionTimer);     _sessionTimer = null; }
  if (_sessionWarnTimer) { clearTimeout(_sessionWarnTimer); _sessionWarnTimer = null; }
  _SESSION_EVENTS.forEach(ev => window.removeEventListener(ev, _resetarSessionTimer));
  _esconderAvisoSessao();
}
function _resetarSessionTimer() {
  if (_sessionTimer)     clearTimeout(_sessionTimer);
  if (_sessionWarnTimer) clearTimeout(_sessionWarnTimer);
  _esconderAvisoSessao();
  _sessionWarnTimer = setTimeout(_mostrarAvisoSessao, SESSION_TIMEOUT_MS - SESSION_WARN_BEFORE_MS);
  _sessionTimer = setTimeout(function() {
    console.log('[Auth] Sessão expirada por inatividade');
    _pararSessionTimeout();
    if (sb) sb.auth.signOut();
    if (typeof mostrarToast === 'function') mostrarToast('Sessão encerrada por inatividade.', 'warning');
  }, SESSION_TIMEOUT_MS);
}
function _mostrarAvisoSessao() {
  const modal = document.getElementById('session-timeout-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  let secs = Math.floor(SESSION_WARN_BEFORE_MS / 1000);
  const countEl = document.getElementById('session-timeout-countdown');
  function fmt(s) { const m = Math.floor(s/60); const r = s%60; return m + ':' + (r < 10 ? '0' : '') + r; }
  if (countEl) countEl.textContent = fmt(secs);
  const interval = setInterval(function() {
    secs--;
    if (countEl) countEl.textContent = secs > 0 ? fmt(secs) : '0:00';
    if (secs <= 0) clearInterval(interval);
  }, 1000);
  modal._countInterval = interval;
}
function _esconderAvisoSessao() {
  const modal = document.getElementById('session-timeout-modal');
  if (!modal) return;
  if (modal._countInterval) clearInterval(modal._countInterval);
  modal.style.display = 'none';
}
function continuarSessao() {
  _esconderAvisoSessao();
  _resetarSessionTimer();
  if (typeof mostrarToast === 'function') mostrarToast('Sessão renovada! ✅', 'success');
}

// ── P1.4 — MFA / 2FA via Supabase TOTP ──────────────────────────────────────
let _mfaFactorId    = null;
let _mfaChallengeId = null;

async function iniciarEnrolamentoMFA() {
  if (!sb || !currentUser) { mostrarToast('Faça login primeiro para ativar o 2FA.', 'warning'); return; }
  try {
    const mfaEnroll = await sb.auth.mfa.enroll({ factorType: 'totp', issuer: 'FinançasPro' });
    if (mfaEnroll.error) throw mfaEnroll.error;
    _mfaFactorId = mfaEnroll.data.id;
    _mfaChallengeId = null;
    const modal  = document.getElementById('mfa-enroll-modal');
    const qrImg  = document.getElementById('mfa-qr-img');
    const secretEl = document.getElementById('mfa-secret');
    const errMsg = document.getElementById('mfa-error-msg');
    if (qrImg)    qrImg.src = mfaEnroll.data.totp.qr_code;
    if (secretEl) secretEl.textContent = mfaEnroll.data.totp.secret;
    if (errMsg)   errMsg.style.display = 'none';
    if (modal)    modal.classList.remove('hidden');
    const ch = await sb.auth.mfa.challenge({ factorId: _mfaFactorId });
    if (ch.error) throw ch.error;
    _mfaChallengeId = ch.data.id;
  } catch (e) {
    mostrarToast('Erro ao iniciar 2FA: ' + e.message, 'danger');
  }
}
async function confirmarEnrolamentoMFA() {
  const codeInput = document.getElementById('mfa-code-input');
  const errMsg    = document.getElementById('mfa-error-msg');
  const code = (codeInput ? codeInput.value : '').replace(/\D/g, '').trim();
  if (code.length !== 6) {
    if (errMsg) { errMsg.textContent = 'Digite o código de 6 dígitos.'; errMsg.style.display = 'block'; }
    return;
  }
  try {
    const verifyRes = await sb.auth.mfa.verify({ factorId: _mfaFactorId, challengeId: _mfaChallengeId, code });
    if (verifyRes.error) throw verifyRes.error;
    fecharMFAModal('mfa-enroll-modal');
    _renderizarStatusMFA(true);
    mostrarToast('🔒 2FA ativado com sucesso!', 'success');
  } catch (e) {
    if (errMsg) { errMsg.textContent = 'Código inválido. Tente novamente.'; errMsg.style.display = 'block'; }
    if (codeInput) { codeInput.value = ''; codeInput.focus(); }
  }
}
async function desativarMFA() {
  if (!sb || !currentUser || !_mfaFactorId) return;
  if (!confirm('Tem certeza que deseja remover o 2FA? Sua conta ficará menos segura.')) return;
  try {
    const unenrollRes = await sb.auth.mfa.unenroll({ factorId: _mfaFactorId });
    if (unenrollRes.error) throw unenrollRes.error;
    _mfaFactorId = null;
    _renderizarStatusMFA(false);
    mostrarToast('2FA removido.', 'warning');
  } catch (e) {
    mostrarToast('Erro ao remover 2FA: ' + e.message, 'danger');
  }
}
async function verificarStatusMFA() {
  if (!sb || !currentUser) return;
  try {
    const factors = await sb.auth.mfa.listFactors();
    const totp = ((factors.data && factors.data.totp) || []).find(function(f) { return f.status === 'verified'; });
    _mfaFactorId = totp ? totp.id : null;
    _renderizarStatusMFA(!!totp);
  } catch (e) {
    console.warn('[MFA] Erro ao verificar status:', e.message);
  }
}
function _renderizarStatusMFA(ativo) {
  const badge      = document.getElementById('mfa-status-badge');
  const btnAtivar  = document.getElementById('mfa-btn-ativar');
  const btnDesativar = document.getElementById('mfa-btn-desativar');
  if (badge) {
    badge.textContent = ativo ? '🔒 2FA Ativo' : '⚠️ 2FA Inativo';
    badge.className   = 'mfa-badge ' + (ativo ? 'mfa-on' : 'mfa-off');
  }
  if (btnAtivar)    btnAtivar.style.display    = ativo ? 'none' : '';
  if (btnDesativar) btnDesativar.style.display = ativo ? ''     : 'none';
}
function fecharMFAModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

// ── P1.2 — loginComEmail com rate limiting ───────────────────────────────────
async function loginComEmail() {
  if (!sb) { loginMsg('Serviço indisponível. Tente mais tarde.', 'error'); return; }
  if (_verificarCooldown()) return;
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const btnEl = document.getElementById('login-btn-submit');
  if (!email || !senha) { loginMsg('Preencha email e senha.', 'error'); return; }
  if (senha.length < 6)  { loginMsg('Senha deve ter ao menos 6 caracteres.', 'error'); return; }
  btnEl.disabled = true;
  btnEl.textContent = 'Aguarde...';
  try {
    let result;
    if (_loginTab === 'entrar') {
      result = await sb.auth.signInWithPassword({ email, password: senha });
    } else {
      result = await sb.auth.signUp({ email, password: senha });
      if (!result.error && result.data.user && !result.data.session) {
        loginMsg('Conta criada! Verifique seu email para confirmar.', 'success');
        _resetarFalhasLogin();
        btnEl.disabled = false;
        btnEl.textContent = 'Criar conta';
        return;
      }
    }
    if (result.error) {
      const errMsgs = {
        'Invalid login credentials': 'Email ou senha incorretos.',
        'Email not confirmed': 'Confirme seu email antes de entrar.',
        'User already registered': 'Email já cadastrado. Tente entrar.',
      };
      loginMsg(errMsgs[result.error.message] || result.error.message || 'Erro ao entrar.', 'error');
      _registrarFalhaLogin();
    } else {
      _resetarFalhasLogin();
    }
  } catch (e) {
    loginMsg('Erro inesperado: ' + e.message, 'error');
    _registrarFalhaLogin();
  } finally {
    btnEl.disabled = false;
    btnEl.textContent = _loginTab === 'entrar' ? 'Entrar' : 'Criar conta';
  }
}
