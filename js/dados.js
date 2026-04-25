// FinançasPro — Dados, localStorage e Cloud Sync
// v10.8 — Depende de: config.js, auth.js

// MÓDULO 1: DADOS
// ════════════════════════════════════
let transacoes = [], config = {}, orcamentos = {};
let contas = [], cartoes = [], csvDados = [];
let mesAtual = '', filtroTipo = 'todos', pendingId = null;
let txPageOffset = 0, txPageSize = 30;

// ── PERSISTÊNCIA LOCAL ──────────────────────────────────────────────────────
// _salvarLocal: função unificada — elimina timer duplo do cloud sync.
// salvarTransacoes / salvarDados são aliases para compatibilidade com outros módulos.

function _salvarLocal() {
  try { localStorage.setItem('fp_transacoes', JSON.stringify(transacoes)); } catch(e) {}
  try { localStorage.setItem('fp_contas',     JSON.stringify(contas));      } catch(e) {}
  try { localStorage.setItem('fp_cartoes',    JSON.stringify(cartoes));     } catch(e) {}
  saveToCloud();  // debounced — dispara 1 único timer mesmo se chamado várias vezes
}

// Aliases públicos — mantém compatibilidade com chamadas em outros módulos
function salvarTransacoes() { _salvarLocal(); }
function salvarDados()      { _salvarLocal(); }

function carregarTransacoes() {
  try {
    const r = localStorage.getItem('fp_transacoes');
    transacoes = r ? JSON.parse(r) : [];
    if (!Array.isArray(transacoes)) transacoes = [];
  } catch(e) { transacoes = []; }
}

function _persistConfig() {
  localStorage.setItem('fp_config', JSON.stringify(config));
  saveToCloud();
}

function carregarConfig() {
  try { const r = localStorage.getItem('fp_config'); config = r ? JSON.parse(r) : {}; }
  catch(e) { config = {}; }
  config.renda             = config.renda             || 0;
  config.metaPoupanca      = config.metaPoupanca      || 20;
  config.metaGastos        = config.metaGastos        || 80;
  config.streak            = config.streak            || 0;
  config.lastEntry         = config.lastEntry         || '';
  config.score             = config.score             || 0;
  config.achievements      = config.achievements      || [];
  config.leads             = config.leads             || [];
  config.exportCount       = config.exportCount       || 0;
  config.exportMonth       = config.exportMonth       || '';
  config.dailyTxs          = config.dailyTxs          || 0;
  config.dailyDate         = config.dailyDate         || '';
  config.selectedPlan      = config.selectedPlan      || 'anual';
  config.isPremiumUser     = config.isPremiumUser     || false;
  config.savedAt           = config.savedAt           || '';  // usado no merge inteligente
  if (config.onboarded === undefined) config.onboarded = false;
}

function salvarOrcamentos() {
  localStorage.setItem('fp_orcamentos', JSON.stringify(orcamentos));
  saveToCloud();
}

function carregarContasCartoes() {
  try {
    const r = localStorage.getItem('fp_contas');
    contas = r ? JSON.parse(r) : [];
    if (!Array.isArray(contas)) contas = [];
  } catch(e) { contas = []; }
  try {
    const r = localStorage.getItem('fp_cartoes');
    cartoes = r ? JSON.parse(r) : [];
    if (!Array.isArray(cartoes)) cartoes = [];
  } catch(e) { cartoes = []; }
}

function carregarOrcamentos() {
  try {
    const r = localStorage.getItem('fp_orcamentos');
    orcamentos = r ? JSON.parse(r) : {};
    if (typeof orcamentos !== 'object' || Array.isArray(orcamentos)) orcamentos = {};
  } catch(e) { orcamentos = {}; }
}

// ── CLOUD SYNC (Supabase) ───────────────────────────────────────────────────
let _cloudSaveTimer = null;

function saveToCloud() {
  if (typeof currentUser === 'undefined' || !currentUser) return;
  if (typeof sb === 'undefined' || !sb) return;
  // Debounce: cancela timer anterior → garante 1 único save após 2s de inatividade
  clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer = setTimeout(_doSaveToCloud, 2000);
}

// Verifica tamanho do payload antes de enviar — evita erro 413 no Supabase free
function _checkPayloadSize(dados) {
  try {
    const size = new Blob([JSON.stringify(dados)]).size;
    if (size > 900_000) {  // alerta acima de 900KB (limite Supabase free ~1MB por row)
      console.warn('[CLOUD] Payload grande:', (size / 1024).toFixed(0) + 'KB');
      if (typeof showToast === 'function') {
        showToast('⚠️ Dados volumosos — considere exportar um backup JSON', 'warning');
      }
    }
  } catch(e) { /* sem suporte a Blob: ignora */ }
}

async function _doSaveToCloud() {
  if (typeof currentUser === 'undefined' || !currentUser) return;
  if (typeof sb === 'undefined' || !sb) return;
  try {
    const agora = new Date().toISOString();
    // Atualiza savedAt no config para o merge inteligente no loadFromCloud
    config.savedAt = agora;
    const dados = {
      transacoes, config, orcamentos, contas, cartoes,
      saved_at: agora
    };
    _checkPayloadSize(dados);
    const { error } = await sb.from('dados_usuario').upsert({
      user_id: currentUser.id,
      dados: dados,
      updated_at: agora
    }, { onConflict: 'user_id', ignoreDuplicates: false });
    if (error) console.error('[CLOUD] Erro ao salvar:', error);
    else console.debug('[CLOUD] Dados salvos na nuvem');
  } catch(e) {
    console.error('[CLOUD] Erro ao salvar:', e);
  }
}

async function loadFromCloud() {
  if (typeof currentUser === 'undefined' || !currentUser) return;
  if (typeof sb === 'undefined' || !sb) return;
  try {
    const { data, error } = await sb
      .from('dados_usuario')
      .select('dados')
      .eq('user_id', currentUser.id)
      .single();
    if (error || !data) return;
    const d = data.dados;

    // ── Merge inteligente por timestamp ──────────────────────────────────
    // Compara quando cada versão foi salva e prevalece a mais recente.
    // Evita que dados locais mais novos (editados offline) sejam sobrescritos.
    const cloudTime = new Date(d.saved_at || 0).getTime();
    const localTime = new Date(config.savedAt || 0).getTime();
    const cloudEhMaisNova = cloudTime > localTime;

    if (d.transacoes && Array.isArray(d.transacoes) && cloudEhMaisNova) {
      transacoes = d.transacoes;
      localStorage.setItem('fp_transacoes', JSON.stringify(transacoes));
    }
    if (d.orcamentos && typeof d.orcamentos === 'object' && cloudEhMaisNova) {
      orcamentos = d.orcamentos;
      localStorage.setItem('fp_orcamentos', JSON.stringify(orcamentos));
    }
    if (d.config && typeof d.config === 'object') {
      // Config faz merge sempre (preserva isPremiumUser local caso já verificado)
      const isPrem = config.isPremiumUser;
      config = Object.assign({}, config, d.config);
      if (isPrem) config.isPremiumUser = true;
      localStorage.setItem('fp_config', JSON.stringify(config));
    }
    if (d.contas && Array.isArray(d.contas) && cloudEhMaisNova) {
      contas = d.contas;
      localStorage.setItem('fp_contas', JSON.stringify(contas));
    }
    if (d.cartoes && Array.isArray(d.cartoes) && cloudEhMaisNova) {
      cartoes = d.cartoes;
      localStorage.setItem('fp_cartoes', JSON.stringify(cartoes));
    }
    console.debug('[CLOUD] Dados carregados da nuvem (cloud mais nova:', cloudEhMaisNova, ')');
    renderTudo();
  } catch(e) {
    console.error('[CLOUD] Erro ao carregar:', e);
  }
}

function syncUserData() { /* gerenciado pelo onAuthStateChange */ }

// ════════════════════════════════════
