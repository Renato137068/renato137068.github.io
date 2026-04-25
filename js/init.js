// FinançasPro — Inicialização e Event Listeners
// Carregado por último

// MÓDULO I: DRAG DROP DROPZONE
// ════════════════════════════════════
function initDropzone() {
  const dz = document.getElementById('csv-dropzone');
  if (!dz) return;
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) importarCSV({ target: { files:[file], value:'' } });
  });
}


// ── toggleQuickEntry ────────────────────────────────────
function toggleQuickEntry() {
  const extra = document.getElementById('quick-entry-extra');
  const btn = document.getElementById('quick-entry-toggle-btn');
  if (!extra || !btn) return;
  const expanded = extra.classList.toggle('expanded');
  btn.textContent = expanded ? '▲ Menos opções' : '▼ Mais opções';
}

// ════════════════════════════════════
// CORREÇÕES v10.1
// ════════════════════════════════════

// ── Categorias filtradas por tipo ──────────────────────────────────────────
const CATS_DESPESA = [
  {v:'alimentacao',l:'🍔 Alimentação'},{v:'moradia',l:'🏠 Moradia'},
  {v:'transporte',l:'🚗 Transporte'},{v:'saude',l:'💊 Saúde'},
  {v:'educacao',l:'📚 Educação'},{v:'lazer',l:'🎮 Lazer'},
  {v:'vestuario',l:'👕 Vestuário'},{v:'outros',l:'📦 Outros'}
];
const CATS_RECEITA = [
  {v:'salario',l:'💼 Salário'},{v:'freelance',l:'💻 Freelance'},
  {v:'investimentos',l:'📈 Investimentos'},{v:'outros',l:'📦 Outros'}
];

function atualizarCatsPorTipo(tipo) {
  const sel = document.getElementById('tx-categoria');
  if (!sel) return;
  const custom = (config.categorias_custom || []);
  const base = tipo === 'receita' ? CATS_RECEITA : CATS_DESPESA;
  const opts = [{ v:'', l:'Selecionar...' }, ...base,
    ...custom.map(c => ({v:c.id, l: c.icon+' '+c.nome}))];
  sel.innerHTML = opts.map(o => `<option value="${o.v}">${o.l}</option>`).join('');
}

// ── setTipo override (mostra/oculta campos de cartao) ─────────────────────
function setTipo(tipo) {
  _tipoAtual = tipo;
  document.getElementById('btn-receita').className = 'tipo-btn ' + (tipo==='receita'?'active-receita':'');
  document.getElementById('btn-despesa').className = 'tipo-btn ' + (tipo==='despesa'?'active-despesa':'');
  atualizarCatsPorTipo(tipo);
  const cartaoGroup = document.getElementById('tx-cartao-group');
  const parcelasGroup = document.getElementById('tx-parcelas-group');
  const contaGroup = document.getElementById('tx-conta-group');
  if (cartaoGroup) cartaoGroup.style.display = tipo === 'despesa' ? '' : 'none';
  if (parcelasGroup) parcelasGroup.style.display = 'none';
  if (contaGroup) contaGroup.style.display = tipo === 'receita' ? '' : 'none';
  atualizarSelectContas();
  atualizarSelectCartoes();
}

function onCartaoChange() {
  const cartaoId = (document.getElementById('tx-cartao')||{}).value;
  const parcelasGroup = document.getElementById('tx-parcelas-group');
  if (parcelasGroup) parcelasGroup.style.display = cartaoId ? '' : 'none';
}

function atualizarSelectContas() {
  const sel = document.getElementById('tx-conta');
  if (!sel) return;
  sel.innerHTML = '<option value="">Sem conta</option>' +
    contas.map(c => `<option value="${c.id}">${c.icon} ${c.nome}</option>`).join('');
}

function atualizarSelectCartoes() {
  const sel = document.getElementById('tx-cartao');
  if (!sel) return;
  sel.innerHTML = '<option value="">Sem cartão</option>' +
    cartoes.map(c => `<option value="${c.id}">${c.nome} (${c.bandeira})</option>`).join('');
}

// ── adicionarTransacao override ───────────────────────────────────────────
function adicionarTransacao() {
  const descEl = document.getElementById('tx-desc');
  const valorEl = document.getElementById('tx-valor');
  const dataEl = document.getElementById('tx-data');
  const desc = (descEl.value || '').trim();
  const valor = parseFloat(valorEl.value);
  const data = dataEl.value;

  [descEl, valorEl, dataEl].forEach(e => e.classList.remove('error'));
  let ok = true;
  if (!desc) { descEl.classList.add('error'); ok = false; }
  if (!valor || valor <= 0 || isNaN(valor)) { valorEl.classList.add('error'); ok = false; }
  if (!data) { dataEl.classList.add('error'); ok = false; }
  if (!ok) { showToast('Preencha todos os campos obrigatórios', 'danger'); return; }

  const categoria = (document.getElementById('tx-categoria')||{}).value || 'outros';
  const recorrencia = (document.getElementById('tx-recorrencia')||{}).value || 'unica';
  const tag = ((document.getElementById('tx-tag')||{}).value || '').trim();
  const contaId = (document.getElementById('tx-conta')||{}).value || '';
  const cartaoId = (document.getElementById('tx-cartao')||{}).value || '';
  const numParcelas = parseInt((document.getElementById('tx-parcelas')||{}).value || '1');

  const nivelAntes = getLevel(calcXP()).index;
  if (pendingId !== null) {
    const idx = transacoes.findIndex(t => t.id === pendingId);
    if (idx !== -1) {
      transacoes[idx] = { ...transacoes[idx], descricao: desc, valor, data,
        categoria, recorrencia, tag, tipo: _tipoAtual,
        conta_id: contaId, cartao_id: cartaoId,
        updatedAt: new Date().toISOString() };
    }
    pendingId = null;
    document.getElementById('btn-salvar-txt').textContent = '+ Adicionar';
    showToast('Transação atualizada!', 'success');
  } else {
    if (cartaoId && numParcelas > 1 && _tipoAtual === 'despesa') {
      // Gerar parcelas automaticamente
      const valorParcela = parseFloat((valor / numParcelas).toFixed(2));
      const dataBase = new Date(data + 'T12:00:00');
      for (let p = 1; p <= numParcelas; p++) {
        const d = new Date(dataBase);
        d.setMonth(d.getMonth() + (p - 1));
        const dataP = d.toISOString().slice(0, 10);
        transacoes.push({
          id: gerarId(), tipo: 'despesa', descricao: desc + ' (' + p + '/' + numParcelas + ')',
          valor: valorParcela, data: dataP, categoria, recorrencia: 'unica',
          tag, cartao_id: cartaoId, conta_id: contaId,
          parcelas: numParcelas, parcela_atual: p,
          createdAt: new Date().toISOString()
        });
      }
      showToast('💳 ' + numParcelas + 'x de ' + fmt(valorParcela) + ' lançadas no cartão!', 'success');
    } else {
      const nova = {
        id: gerarId(), tipo: _tipoAtual, descricao: desc, valor, data,
        categoria, recorrencia, tag,
        conta_id: contaId, cartao_id: cartaoId,
        createdAt: new Date().toISOString()
      };
      transacoes.push(nova);
      // Atualizar saldo da conta dinamicamente
      if (contaId) {
        const conta = contas.find(c => c.id === contaId);
        if (conta) {
          conta.saldo = (conta.saldo || 0) + (_tipoAtual === 'receita' ? valor : -valor);
        }
      }
      atualizarStreak();
      incrementDailyGoal();
      showToast((_tipoAtual==='receita'?'💚 +':'💸 -') + fmt(valor) + ' registrado! +10 XP 🌱', 'success');
    }
  }

  salvarTransacoes();
  limparForm();
  setTimeout(() => { const d = document.getElementById('tx-desc'); if (d) d.focus(); }, 100);
  txPageOffset = 0;
  renderTudo();
  // Verificar subida de nivel
  const nivelDepois = getLevel(calcXP()).index;
  if (nivelDepois > nivelAntes) {
    const novoLv = getLevel(calcXP());
    setTimeout(() => {
      showToast('⬆️ Subiu de nível! ' + novoLv.emoji + ' ' + novoLv.nome, 'achievement');
      lancarConfete(50);
    }, 400);
  }
}

// ── limparForm override ───────────────────────────────────────────────────
function limparForm() {
  ['tx-desc','tx-valor','tx-tag'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('error'); }
  });
  const ids = ['tx-categoria','tx-recorrencia','tx-conta','tx-cartao','tx-parcelas'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = el.options[0]?.value || ''; });
  const pg = document.getElementById('tx-parcelas-group');
  if (pg) pg.style.display = 'none';
  pendingId = null;
  const btnTxt = document.getElementById('btn-salvar-txt');
  if (btnTxt) btnTxt.textContent = '+ Adicionar';
  const editBnr = document.getElementById('edit-mode-banner');
  if (editBnr) editBnr.style.display = 'none';  // P1.9
  const al = document.getElementById('autocomplete-list');
  if (al) al.style.display = 'none';
  // Colapsar Mais opcoes ao limpar
  const qExtra = document.getElementById('quick-entry-extra');
  const qBtn = document.getElementById('quick-entry-toggle-btn');
  if (qExtra) qExtra.classList.remove('expanded');
  if (qBtn) qBtn.textContent = '▼ Mais opções';
}

// ── editarTx override ─────────────────────────────────────────────────────
function editarTx(id) {
  const tx = transacoes.find(t => t.id === id);
  if (!tx) return;
  pendingId = id;
  _tipoAtual = tx.tipo;
  setTipo(tx.tipo);
  document.getElementById('tx-desc').value = tx.descricao || '';
  document.getElementById('tx-valor').value = tx.valor || '';
  document.getElementById('tx-data').value = tx.data || '';
  const catEl = document.getElementById('tx-categoria');
  if (catEl) catEl.value = tx.categoria || '';
  const recEl = document.getElementById('tx-recorrencia');
  if (recEl) recEl.value = tx.recorrencia || 'unica';
  const tagEl = document.getElementById('tx-tag');
  if (tagEl) tagEl.value = tx.tag || '';
  const contaEl = document.getElementById('tx-conta');
  if (contaEl) contaEl.value = tx.conta_id || '';
  const cartaoEl = document.getElementById('tx-cartao');
  if (cartaoEl) { cartaoEl.value = tx.cartao_id || ''; onCartaoChange(); }
  document.getElementById('btn-salvar-txt').textContent = '💾 Salvar edição';
  const editBanner = document.getElementById('edit-mode-banner');
  if (editBanner) editBanner.style.display = 'flex';  // P1.9
  switchTab(null, 'dashboard');
  // Auto-expand extra fields when editing
  const extraEl = document.getElementById('quick-entry-extra');
  const toggleBtn = document.getElementById('quick-entry-toggle-btn');
  if (extraEl && !extraEl.classList.contains('expanded')) {
    extraEl.classList.add('expanded');
    if (toggleBtn) toggleBtn.textContent = '▲ Menos opções';
  }
  document.getElementById('tx-desc').focus();
  showToast('Editando — salve ao terminar', 'warning');
}

// ── FATURA por ciclo de fechamento (CORRETO) ──────────────────────────────
function getFaturaCartao(cartaoId) {
  const cartao = cartoes.find(c => c.id === cartaoId);
  if (!cartao) return 0;
  const now = new Date();
  const diaFechamento = cartao.fechamento || 23;

  // FIX: clampeia o dia ao último dia real do mês para evitar overflow do JS
  // Ex: new Date(2024, 1, 31) → 2 de março (overflow silencioso).
  // _lastDay(y, m) retorna o último dia do mês m (0-indexed) no ano y.
  const _lastDay = (y, m) => new Date(y, m + 1, 0).getDate();
  const y = now.getFullYear(), mo = now.getMonth();

  // Ciclo: de dia_fechamento+1 do mês anterior até dia_fechamento do mês atual
  let cicloInicio, cicloFim;
  if (now.getDate() <= diaFechamento) {
    // Ainda não fechou: ciclo é do mes passado
    cicloFim    = new Date(y, mo,     Math.min(diaFechamento,     _lastDay(y, mo)));
    cicloInicio = new Date(y, mo - 1, Math.min(diaFechamento + 1, _lastDay(y, mo - 1)));
  } else {
    // Já fechou: ciclo é do mes atual (próxima fatura)
    cicloFim    = new Date(y, mo + 1, Math.min(diaFechamento,     _lastDay(y, mo + 1)));
    cicloInicio = new Date(y, mo,     Math.min(diaFechamento + 1, _lastDay(y, mo)));
  }

  const inicio = cicloInicio.toISOString().slice(0,10);
  const fim = cicloFim.toISOString().slice(0,10);

  return transacoes
    .filter(t => t.tipo==='despesa' && t.cartao_id===cartaoId && t.data >= inicio && t.data <= fim)
    .reduce((s,t) => s+t.valor, 0);
}

// ── getSaldoContas dinâmico (baseado em transações) ───────────────────────
function getSaldoContas() {
  if (contas.length === 0) {
    // Sem contas: calcula saldo geral pelas transações
    const mes = new Date().toISOString().slice(0,7);
    const rec = transacoes.filter(t => t.tipo==='receita').reduce((s,t)=>s+t.valor,0);
    const desp = transacoes.filter(t => t.tipo==='despesa').reduce((s,t)=>s+t.valor,0);
    return rec - desp;
  }
  return contas.reduce((s,c) => s + (c.saldo || 0), 0);
}

// ── atualizarSelectCategorias override (inclui custom) ───────────────────
function atualizarSelectCategorias() {
  const custom = (config.categorias_custom || []);
  const orcSel = document.getElementById('orc-categoria');
  if (orcSel) {
    const allCats = [
      {v:'',l:'Selecionar...'},{v:'alimentacao',l:'🍔 Alimentação'},
      {v:'moradia',l:'🏠 Moradia'},{v:'transporte',l:'🚗 Transporte'},
      {v:'saude',l:'💊 Saúde'},{v:'educacao',l:'📚 Educação'},
      {v:'lazer',l:'🎮 Lazer'},{v:'vestuario',l:'👕 Vestuário'},
      {v:'salario',l:'💼 Salário'},{v:'freelance',l:'💻 Freelance'},
      {v:'investimentos',l:'📈 Investimentos'},{v:'outros',l:'📦 Outros'},
      ...custom.map(c => ({v:c.id, l:c.icon+' '+c.nome}))
    ];
    orcSel.innerHTML = allCats.map(o=>`<option value="${o.v}">${o.l}</option>`).join('');
  }
  // tx-categoria is handled by atualizarCatsPorTipo
  atualizarCatsPorTipo(_tipoAtual || 'despesa');
}

// ── ACHIEVEMENT TOAST ─────────────────────────────────────────────────────
function showAchievementToast(achievement) {
  let toast = document.getElementById('achievement-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'achievement-toast';
    toast.innerHTML = `<div class="ach-toast-icon"></div>
      <div class="ach-toast-text">
        <div class="ach-toast-title">CONQUISTA DESBLOQUEADA 🎉</div>
        <div class="ach-toast-nome"></div>
        <div class="ach-toast-xp"></div>
      </div>`;
    document.body.appendChild(toast);
  }
  toast.querySelector('.ach-toast-icon').textContent = achievement.icon || '🏆';
  toast.querySelector('.ach-toast-nome').textContent = achievement.nome || '';
  toast.querySelector('.ach-toast-xp').textContent = '+50 XP';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── ONBOARDING ────────────────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  {
    icon: '👋',
    title: 'Bem-vindo ao FinançasPro!',
    desc: 'Controle total das suas finanças em um só lugar. Vamos configurar tudo em 1 minuto.',
    action: 'Começar',
    fields: null
  },
  {
    icon: '💰',
    title: 'Qual é sua renda mensal?',
    desc: 'Usamos esse valor para calcular suas metas de poupança e alertas de gasto.',
    action: 'Continuar',
    fields: `<div class="form-group" style="margin-bottom:12px;">
      <label class="form-label">Renda mensal líquida (R$)</label>
      <input type="number" id="ob-renda" class="form-control" placeholder="Ex: 5000" style="font-size:1.1rem;padding:12px;">
    </div>
    <div class="form-group">
      <label class="form-label">Seu nome</label>
      <input type="text" id="ob-nome" class="form-control" placeholder="Como prefere ser chamado?">
    </div>`
  },
  {
    icon: '🎯',
    title: 'Defina sua meta de poupança',
    desc: 'Recomendamos poupar pelo menos 20% da renda. Você pode ajustar isso a qualquer momento.',
    action: 'Continuar',
    fields: `<div class="form-group" style="margin-bottom:12px;">
      <label class="form-label">Meta de poupança: <strong id="ob-pct-label">20%</strong></label>
      <input type="range" id="ob-meta" min="5" max="50" value="20" step="5"
        oninput="document.getElementById('ob-pct-label').textContent=this.value+'%'"
        style="width:100%;margin-top:8px;accent-color:var(--primary);">
    </div>
    <div style="background:var(--primary-light);border-radius:10px;padding:12px;font-size:.82rem;color:var(--primary-dark);">
      💡 Com <span id="ob-renda-hint">R$ 0</span> de renda e meta de poupança de <span id="ob-meta-hint">20%</span>, você deveria guardar <strong id="ob-valor-hint">R$ 0</strong>/mês.
    </div>`
  },
  {
    icon: '🚀',
    title: 'Registre sua primeira receita!',
    desc: 'Adicione agora o seu salário ou outra entrada de dinheiro. Isso ativa os gráficos e metas.',
    action: '✅ Tudo pronto!',
    fields: `<div class="ob-tx-form">
      <div class="form-group" style="margin-bottom:10px;">
        <label class="form-label">Descrição</label>
        <input type="text" id="ob-tx-desc" class="form-control" placeholder="Ex: Salário maio" value="Salário">
      </div>
      <div class="form-group" style="margin-bottom:10px;">
        <label class="form-label">Valor (R$)</label>
        <input type="number" id="ob-tx-valor" class="form-control" placeholder="Ex: 5000" id="ob-tx-valor">
      </div>
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select id="ob-tx-cat" class="form-control">
          <option value="salario">💼 Salário</option>
          <option value="freelance">💻 Freelance</option>
          <option value="investimento">📈 Investimentos</option>
          <option value="outros">🏷️ Outros</option>
        </select>
      </div>
      <p style="font-size:.75rem;color:var(--text-muted);margin-top:8px;">Você pode pular e adicionar depois clicando em "Pular".</p>
    </div>`
  }
];

let _onboardingStep = 0;

function iniciarOnboarding() {
  if (config.onboarded) return;
  _onboardingStep = 0;
  renderOnboardingStep();
  const ov = document.getElementById('onboarding-overlay');
  if (ov) ov.classList.remove('hidden');
}

function renderOnboardingStep() {
  const step = ONBOARDING_STEPS[_onboardingStep];
  const el = id => document.getElementById(id);
  if (el('ob-icon')) el('ob-icon').textContent = step.icon;
  if (el('ob-title')) el('ob-title').textContent = step.title;
  if (el('ob-desc')) el('ob-desc').textContent = step.desc;
  if (el('ob-action')) el('ob-action').textContent = step.action;
  if (el('ob-fields')) el('ob-fields').innerHTML = step.fields || '';
  // Dots
  const dots = document.querySelectorAll('.onboarding-step-dot');
  dots.forEach((d,i) => d.classList.toggle('active', i === _onboardingStep));
  // Hints para step 2
  if (_onboardingStep === 2) {
    const renda = parseFloat((el('cfg-renda')||{}).value || config.renda || 0);
    if (el('ob-renda-hint')) el('ob-renda-hint').textContent = fmt(renda);
    if (el('ob-meta')) {
      el('ob-meta').addEventListener('input', () => {
        const pct = parseInt(el('ob-meta').value);
        const val = renda * pct / 100;
        if (el('ob-meta-hint')) el('ob-meta-hint').textContent = pct + '%';
        if (el('ob-valor-hint')) el('ob-valor-hint').textContent = fmt(val);
      });
      el('ob-meta').dispatchEvent(new Event('input'));
    }
  }
}

function avancarOnboarding() {
  const step = ONBOARDING_STEPS[_onboardingStep];
  // Salvar dados do step
  if (_onboardingStep === 1) {
    const renda = parseFloat((document.getElementById('ob-renda')||{}).value || 0);
    const nome = ((document.getElementById('ob-nome')||{}).value || '').trim();
    if (renda > 0) { config.renda = renda; const el=document.getElementById('cfg-renda'); if(el) el.value=renda; }
    if (nome) { config.nome = nome; const el=document.getElementById('cfg-nome'); if(el) el.value=nome; }
  }
  if (_onboardingStep === 2) {
    const meta = parseInt((document.getElementById('ob-meta')||{}).value || 20);
    config.metaPoupanca = meta;
    const el=document.getElementById('cfg-meta-poupanca'); if(el) el.value=meta;
    _persistConfig();
    // advance to step 3 (first transaction)
  }
  if (_onboardingStep === 3) {
    // P1.8 — salvar primeira transação se preenchida
    const desc  = (document.getElementById('ob-tx-desc')||{}).value?.trim() || '';
    const valor = parseFloat((document.getElementById('ob-tx-valor')||{}).value || 0);
    const cat   = (document.getElementById('ob-tx-cat')||{}).value || 'salario';
    if (desc && valor > 0) {
      const hoje = new Date().toISOString().slice(0,10);
      transacoes.push({ id: gerarId(), descricao: desc, valor, tipo: 'receita',
        categoria: cat, data: hoje, recorrencia: 'unica', tag: '', nota: '' });
      salvarDados();
      renderTudo();
      showToast('🎉 Primeira receita registrada!', 'success');
    }
    config.onboarded = true;
    _persistConfig();
    fecharOnboarding();
    showToast('Tudo configurado! Bom controle financeiro. 🚀', 'success');
    return;
  }
  _persistConfig();
  _onboardingStep++;
  renderOnboardingStep();
}

function fecharOnboarding() {
  const ov = document.getElementById('onboarding-overlay');
  if (ov) ov.classList.add('hidden');
  config.onboarded = true;
  _persistConfig();
}

// ── NUDGE BANNER (dias 15-21 do trial) ────────────────────────────────────
function renderNudgeBanner() {
  const existing = document.getElementById('nudge-banner');
  if (existing) existing.remove();
  if (isTrialExpired() || !PLANO.TRIAL_DAYS) return;
  const days = getRemainingDays();
  const elapsed = PLANO.TRIAL_DAYS - days;
  if (elapsed < 15 || days <= 0) return;

  const banner = document.createElement('div');
  banner.id = 'nudge-banner';
  banner.className = 'nudge-banner';
  banner.innerHTML = `
    <div class="nudge-banner-text">
      <strong>⏳ ${days} ${days===1?'dia':'dias'} restantes no seu trial</strong>
      <span>Garanta sua assinatura e não perca seu histórico</span>
    </div>
    <button class="nudge-btn" onclick="window.open('${PLANO.CHECKOUT_URL}','_blank')">Ver planos</button>`;
  const alertasEl = document.getElementById('alertas-container');
  if (alertasEl && alertasEl.parentNode) {
    alertasEl.parentNode.insertBefore(banner, alertasEl);
  }
}
