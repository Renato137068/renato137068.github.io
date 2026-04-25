// FinançasPro — Gamificação: Níveis, Conquistas, Missões, Retenção
// Depende de: config.js, dados.js

// MÓDULO 4: RETENÇÃO — Daily Goal + Streak
// ════════════════════════════════════
function initDailyGoal() {
  const hoje = new Date().toISOString().slice(0, 10);
  if (config.dailyDate !== hoje) {
    config.dailyTxs = 0;
    config.dailyDate = hoje;
    _persistConfig();
  }
  renderDailyGoal();
  checkRetentionNotice();
}

function renderDailyGoal() {
  const goal = PLANO.DAILY_GOAL_TXS;
  const done = config.dailyTxs || 0;
  const pct  = Math.min(100, Math.round(done / goal * 100));
  const completed = done >= goal;
  const streak = config.streak || 0;

  const badge = document.getElementById('goal-badge');
  const desc  = document.getElementById('goal-desc');
  const fill  = document.getElementById('goal-fill');
  const pts   = document.getElementById('goal-pts');

  if (badge) {
    badge.textContent = completed ? 'Concluído!' : 'Pendente';
    badge.className = 'daily-goal-badge ' + (completed ? 'done' : 'pending');
  }
  if (desc) {
    desc.textContent = completed
      ? 'Meta diária concluída! Sequência: ' + streak + ' dias 🔥 Volte amanhã para manter o hábito.'
      : 'Registre ' + goal + ' transações hoje para manter sua sequência e ganhar bônus de XP.';
  }
  if (fill) fill.style.width = pct + '%';
  if (pts) pts.textContent = done + ' / ' + goal + ' hoje';
}

function checkRetentionNotice() {
  const notice = document.getElementById('retention-notice');
  if (!notice) return;
  const hoje = new Date().toISOString().slice(0, 10);
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const anteontem = new Date(Date.now() - 172800000).toISOString().slice(0, 10);

  // Verificar se não registrou hoje ainda
  const jáRegistrouHoje = config.dailyDate === hoje && (config.dailyTxs || 0) >= 1;
  if (jáRegistrouHoje) { notice.classList.add('hidden'); return; }

  const icon = document.getElementById('ret-icon');
  const title = document.getElementById('ret-title');
  const sub = document.getElementById('ret-sub');

  if (config.lastEntry === ontem) {
    // Estava ativo ontem, não fez hoje — risco de perder sequência
    if (icon) icon.textContent = '🔥';
    if (title) title.textContent = 'Sua sequência está em risco!';
    if (sub) sub.textContent = 'Você tem uma sequência de ' + (config.streak || 0) + ' dias. Registre UMA transação hoje para não perder.';
  } else if (config.lastEntry === anteontem) {
    // Ficou 1 dia sem registrar
    if (icon) icon.textContent = '😟';
    if (title) title.textContent = 'Há 1 dia sem registrar…';
    if (sub) sub.textContent = 'Você estava indo tão bem! Volte agora e mantenha o controle das suas finanças.';
  } else if (config.lastEntry && config.lastEntry < anteontem) {
    // Ficou muito tempo ausente
    if (icon) icon.textContent = '💡';
    if (title) title.textContent = 'Sentimos sua falta, ' + (config.nome || 'usuário') + '!';
    if (sub) sub.textContent = 'Quanto tempo sem registrar. Retome agora — cada dia de registro vale XP e saúde financeira.';
  } else {
    // Nunca registrou ou primeiro dia
    if (icon) icon.textContent = '🎯';
    if (title) title.textContent = 'Sua meta diária está aguardando!';
    if (sub) sub.textContent = 'Registre sua primeira transação hoje e comece a construir o hábito.';
  }

  notice.classList.remove('hidden');
}

function showRetentionNotice(show) {
  const notice = document.getElementById('retention-notice');
  if (!notice) return;
  if (show) notice.classList.remove('hidden');
  else notice.classList.add('hidden');
}

function incrementDailyGoal() {
  const hoje = new Date().toISOString().slice(0, 10);
  if (config.dailyDate !== hoje) { config.dailyTxs = 0; config.dailyDate = hoje; }
  config.dailyTxs = (config.dailyTxs || 0) + 1;
  _persistConfig();

  if (config.dailyTxs === PLANO.DAILY_GOAL_TXS) {
    showToast('🎯 Meta diária concluída! +25 XP 🌱', 'success');
    lancarConfete(20);
  }
  showRetentionNotice(false);
  renderDailyGoal();
}

// ════════════════════════════════════
// MÓDULO 5: GAMIFICAÇÃO — NÍVEIS, MISSÕES, CONQUISTAS
// ════════════════════════════════════

// ── SISTEMA DE NÍVEIS ──────────────
const LEVELS = [
  { min: 0,    max: 99,   emoji: '🌱', nome: 'Iniciante',          sub: 'Começando a jornada financeira' },
  { min: 100,  max: 299,  emoji: '🌿', nome: 'Aprendiz',           sub: 'Desenvolvendo consciência financeira' },
  { min: 300,  max: 699,  emoji: '🌳', nome: 'Consistente',        sub: 'Hábito financeiro em formação' },
  { min: 700,  max: 1499, emoji: '💼', nome: 'Disciplinado',       sub: 'Controle financeiro consolidado' },
  { min: 1500, max: Infinity, emoji: '🏦', nome: 'Mestre Financeiro', sub: 'Domínio total das finanças pessoais' },
];

function calcXP() {
  const txPts    = transacoes.length * 10;
  const streakPts = (config.streak || 0) * 5;
  const achPts   = (config.achievements || []).length * 50;
  const dailyBonus = (() => {
    const today = new Date().toISOString().slice(0, 10);
    return (config.dailyDate === today && (config.dailyTxs || 0) >= PLANO.DAILY_GOAL_TXS) ? 25 : 0;
  })();
  return txPts + streakPts + achPts + dailyBonus;
}

function getLevel(xp) {
  const x = (xp === undefined) ? calcXP() : xp;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (x >= LEVELS[i].min) return { ...LEVELS[i], index: i };
  }
  return { ...LEVELS[0], index: 0 };
}

function renderLevel() {
  const xp  = calcXP();
  const lv  = getLevel(xp);
  const next = LEVELS[lv.index + 1];
  const pct  = next ? Math.min(100, Math.round((xp - lv.min) / (next.min - lv.min) * 100)) : 100;

  // Header badge
  const hdrEmoji = document.getElementById('hdr-level-emoji');
  const hdrName  = document.getElementById('hdr-level-name');
  if (hdrEmoji) hdrEmoji.textContent = lv.emoji;
  if (hdrName)  hdrName.textContent  = lv.nome;

  // Conquistas tab
  const bigEmoji = document.getElementById('level-big-emoji');
  const bigName  = document.getElementById('level-big-name');
  const bigSub   = document.getElementById('level-big-sub');
  const fill     = document.getElementById('level-xp-fill');
  const cur      = document.getElementById('level-xp-current');
  const nxt      = document.getElementById('level-xp-next');
  if (bigEmoji) bigEmoji.textContent = lv.emoji;
  if (bigName)  bigName.textContent  = lv.nome;
  if (bigSub)   bigSub.textContent   = lv.sub;
  if (fill)     fill.style.width     = pct + '%';
  if (cur)      cur.textContent      = xp + ' XP';
  if (nxt)      nxt.textContent      = next ? ('Próximo: ' + next.min + ' XP (' + next.nome + ')') : 'Nível máximo atingido 🎉';
}

// ── CONQUISTAS ──────────────────────
const ACHIEVEMENTS = [
  { id: 'primeira_transacao',   icon: '🌱', nome: 'Primeiros Passos',     desc: 'Registrou sua primeira transação — a jornada começa aqui.' },
  { id: 'dez_transacoes',       icon: '💪', nome: 'Em Ritmo',             desc: '10 transações registradas. O hábito está nascendo.' },
  { id: 'cinquenta_transacoes', icon: '🚀', nome: 'Mestre dos Registros', desc: '50 transações — comprometimento de verdade.' },
  { id: 'cem_transacoes',       icon: '💯', nome: 'Centenário',           desc: '100 transações. Hábito totalmente formado.' },
  { id: 'streak_7',             icon: '🔥', nome: 'Semana Perfeita',      desc: '7 dias consecutivos de registro. Sem falhar.' },
  { id: 'streak_30',            icon: '🏅', nome: 'Mês Impecável',        desc: '30 dias sem interrupção. Disciplina extraordinária.' },
  { id: 'poupanca_20',          icon: '💰', nome: 'Poupador',             desc: 'Taxa de poupança acima de 20% neste mês.' },
  { id: 'poupanca_50',          icon: '🤑', nome: 'Super Poupador',       desc: 'Metade da renda guardada. Resultados chegando.' },
  { id: 'orcamento_configurado',icon: '📊', nome: 'Planejador',           desc: 'Configurou o primeiro limite de orçamento.' },
  { id: 'sem_estouro',          icon: '🎯', nome: 'Dentro do Orçamento',  desc: 'Terminou o mês sem estourar nenhuma categoria.' },
  { id: 'saldo_positivo_3',     icon: '📈', nome: 'Tendência Positiva',   desc: 'Saldo positivo por 3 meses seguidos.' },
  { id: 'score_100',            icon: '🌟', nome: 'Saúde Perfeita',       desc: '100 pontos de saúde financeira. Excelência total.' },
];

function renderConquistasPreview() {
  const el = document.getElementById('achievements-preview');
  if (!el) return;
  const unlocked = config.achievements || [];
  el.innerHTML = ACHIEVEMENTS.map(a => {
    const u = unlocked.includes(a.id);
    return '<div class="achievement-card ' + (u ? 'unlocked' : '') + '" title="' + a.desc + '">' +
      '<div class="achievement-icon">' + a.icon + '</div>' +
      '<div class="achievement-name">' + a.nome + '</div>' +
      '<div class="achievement-desc">' + (u ? a.desc : 'Complete o desafio para revelar') + '</div>' +
      '</div>';
  }).join('');
}

function checkAchievements() {
  const unlocked = config.achievements;
  const n = transacoes.length;
  const streak = config.streak || 0;
  const m = doMes();
  const taxa = m.receitas > 0 ? (m.saldo / m.receitas * 100) : 0;
  let novos = 0;

  const checks = [
    { id: 'primeira_transacao',   ok: n >= 1 },
    { id: 'dez_transacoes',       ok: n >= 10 },
    { id: 'cinquenta_transacoes', ok: n >= 50 },
    { id: 'cem_transacoes',       ok: n >= 100 },
    { id: 'streak_7',             ok: streak >= 7 },
    { id: 'streak_30',            ok: streak >= 30 },
    { id: 'poupanca_20',          ok: taxa >= 20 },
    { id: 'poupanca_50',          ok: taxa >= 50 },
    { id: 'orcamento_configurado',ok: Object.keys(orcamentos).length >= 1 },
    { id: 'score_100',            ok: calcScore().total >= 100 },
    { id: 'sem_estouro', ok: (() => {
        const cats = Object.keys(orcamentos);
        if (cats.length === 0) return false;
        return cats.every(c => (m.porCategoria[c] || 0) <= orcamentos[c]);
      })() },
    { id: 'saldo_positivo_3', ok: (() => {
        // FIX: usa _somarPorMes (O(n) único passe) em vez de .filter() por mês (O(n*3)).
        const ultimos3 = getMesesAnteriores(3);
        if (ultimos3.length < 3) return false;
        const { rec, desp } = _somarPorMes(ultimos3);
        return ultimos3.every(mes => (rec[mes] - desp[mes]) > 0);
      })() },
  ];

  checks.forEach(c => {
    if (c.ok && !unlocked.includes(c.id)) {
      unlocked.push(c.id);
      novos++;
      const ach = ACHIEVEMENTS.find(a => a.id === c.id);
      if (ach) setTimeout(() => showAchievementPopup(ach), novos * 700);
    }
  });

  if (novos > 0) _persistConfig();
}

function showAchievementPopup(ach) {
  document.getElementById('ach-popup-icon').textContent = ach.icon;
  document.getElementById('ach-popup-name').textContent = ach.nome;
  document.getElementById('ach-popup-desc').textContent = ach.desc;
  document.getElementById('achievement-overlay').classList.add('show');
  document.getElementById('achievement-popup').classList.add('show');
  showAchievementToast(ach);
  lancarConfete(35);
  showToast(ach.icon + ' Conquista: ' + ach.nome, 'achievement');
}
function closeAchievementPopup() {
  document.getElementById('achievement-overlay').classList.remove('show');
  document.getElementById('achievement-popup').classList.remove('show');
}

// ── MISSÕES DIÁRIAS ─────────────────
function getDailyMissions() {
  const today = new Date().toISOString().slice(0, 10);
  const txsHoje = transacoes.filter(t => t.data === today).length;
  const goalDone = txsHoje >= PLANO.DAILY_GOAL_TXS;
  const visitedDash = config.visitedDash === today;
  const orcSet = Object.keys(orcamentos).length >= 1;
  return [
    {
      id: 'daily_txs',
      icon: '📝',
      nome: 'Registrar ' + PLANO.DAILY_GOAL_TXS + ' transações hoje',
      desc: txsHoje + ' de ' + PLANO.DAILY_GOAL_TXS + ' registradas',
      reward: '+25 XP',
      progress: Math.min(txsHoje, PLANO.DAILY_GOAL_TXS),
      total: PLANO.DAILY_GOAL_TXS,
      done: goalDone,
    },
    {
      id: 'daily_dash',
      icon: '📊',
      nome: 'Revisar o painel financeiro',
      desc: visitedDash ? 'Painel revisado hoje ✓' : 'Acesse o Dashboard hoje',
      reward: '+10 XP',
      progress: visitedDash ? 1 : 0,
      total: 1,
      done: visitedDash,
    },
    {
      id: 'daily_orc',
      icon: '🎯',
      nome: 'Ter pelo menos 1 orçamento ativo',
      desc: orcSet ? 'Orçamento configurado ✓' : 'Configure em Orçamentos',
      reward: '+15 XP',
      progress: orcSet ? 1 : 0,
      total: 1,
      done: orcSet,
    },
  ];
}

function getWeeklyMissions() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  const weekDays = Array.from({length: 7}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const activeDays = weekDays.filter(d => transacoes.some(t => t.data === d)).length;
  const m = doMes();
  const cats = Object.keys(orcamentos);
  const withinBudget = cats.length > 0 && cats.every(c => (m.porCategoria[c] || 0) <= orcamentos[c]);
  const hasOrc = cats.length >= 3;
  return [
    {
      id: 'weekly_active',
      icon: '📅',
      nome: '5 dias ativos esta semana',
      desc: activeDays + ' de 5 dias com registro',
      reward: '+100 XP',
      progress: Math.min(activeDays, 5),
      total: 5,
      done: activeDays >= 5,
    },
    {
      id: 'weekly_budget',
      icon: '✅',
      nome: 'Manter-se dentro do orçamento',
      desc: withinBudget ? 'Dentro do limite em todas as categorias ✓' : (cats.length === 0 ? 'Configure orçamentos primeiro' : 'Alguma categoria ultrapassou o limite'),
      reward: '+75 XP',
      progress: withinBudget ? 1 : 0,
      total: 1,
      done: withinBudget,
    },
    {
      id: 'weekly_categories',
      icon: '🗂️',
      nome: 'Ter 3 ou mais categorias com orçamento',
      desc: cats.length + ' de 3 categorias configuradas',
      reward: '+50 XP',
      progress: Math.min(cats.length, 3),
      total: 3,
      done: hasOrc,
    },
  ];
}

function renderMissions() {
  function missionHTML(m) {
    const pct = Math.round(m.progress / m.total * 100);
    return '<div class="mission-card' + (m.done ? ' done' : '') + '">' +
      '<div class="mission-icon">' + m.icon + '</div>' +
      '<div class="mission-info">' +
        '<div class="mission-name">' + m.nome + '</div>' +
        '<div class="mission-desc">' + m.desc + '</div>' +
        (m.total > 1 ? '<div class="mission-progress"><div class="mission-progress-fill" style="width:' + pct + '%"></div></div>' : '') +
      '</div>' +
      '<div class="mission-reward">' + m.reward + '</div>' +
      '<div class="mission-check">' + (m.done ? '✅' : '⬜') + '</div>' +
      '</div>';
  }

  const daily = document.getElementById('daily-missions-list');
  if (daily) daily.innerHTML = getDailyMissions().map(missionHTML).join('');

  const weekly = document.getElementById('weekly-missions-list');
  if (weekly) weekly.innerHTML = getWeeklyMissions().map(missionHTML).join('');
}

// ════════════════════════════════════
