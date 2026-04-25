// ════════════════════════════════════════════════════════════════════
// FinançasPro — Tour Guiado Contextual (P1.7)
// Sem biblioteca externa — implementação própria com overlay + tooltips
// ════════════════════════════════════════════════════════════════════

const TOUR_STEPS = [
  {
    target: '#btn-receita',
    title: '💚 Registre receitas',
    body: 'Clique aqui para selecionar o tipo "Receita" — seu salário, freelances e entradas.',
    position: 'bottom'
  },
  {
    target: '#btn-despesa',
    title: '💸 Registre despesas',
    body: 'Clique aqui para registrar gastos como supermercado, aluguel e contas.',
    position: 'bottom'
  },
  {
    target: '#tx-desc',
    title: '✏️ Descrição',
    body: 'Digite o nome do lançamento. O autocomplete sugere baseado no seu histórico.',
    position: 'bottom'
  },
  {
    target: '#quick-entry-toggle-btn',
    title: '⚙️ Mais opções',
    body: 'Expanda para definir categoria, recorrência, conta e até parcelar no cartão.',
    position: 'top'
  },
  {
    target: '[data-tab="evolucao"]',
    title: '📈 Evolução financeira',
    body: 'Acompanhe gráficos de saldo, receitas e despesas ao longo dos meses.',
    position: 'top'
  },
  {
    target: '[data-tab="orcamento"]',
    title: '🎯 Orçamentos',
    body: 'Defina limites por categoria e receba alertas ao ultrapassar.',
    position: 'top'
  },
  {
    target: '[data-tab="conquistas"]',
    title: '🏆 Conquistas',
    body: 'Ganhe XP, suba de nível e desbloqueie medalhas ao manter seus hábitos financeiros.',
    position: 'top'
  },
  {
    target: '[data-tab="configuracoes"]',
    title: '⚙️ Configurações',
    body: 'Ajuste renda, metas, importe extratos bancários e ative o 2FA para maior segurança.',
    position: 'top'
  }
];

let _tourStep = 0;
let _tourActive = false;
let _tourOverlay = null;
let _tourTooltip = null;
let _tourHighlight = null;

// ── Iniciar tour ──────────────────────────────────────────────────
function iniciarTour() {
  if (_tourActive) return;
  _tourActive = true;
  _tourStep = 0;
  _criarElementosTour();
  _renderTourStep();
}

// ── Criar elementos DOM do tour ───────────────────────────────────
function _criarElementosTour() {
  // Overlay escuro com buraco para o elemento destacado
  _tourOverlay = document.createElement('div');
  _tourOverlay.id = 'tour-overlay';
  _tourOverlay.className = 'tour-overlay';
  _tourOverlay.addEventListener('click', _tourClickOverlay);
  document.body.appendChild(_tourOverlay);

  // Borda de destaque (highlight ring)
  _tourHighlight = document.createElement('div');
  _tourHighlight.className = 'tour-highlight';
  document.body.appendChild(_tourHighlight);

  // Tooltip
  _tourTooltip = document.createElement('div');
  _tourTooltip.className = 'tour-tooltip';
  document.body.appendChild(_tourTooltip);
}

// ── Renderizar step atual ─────────────────────────────────────────
function _renderTourStep() {
  const step = TOUR_STEPS[_tourStep];
  const target = document.querySelector(step.target);

  // Atualizar tooltip conteúdo
  _tourTooltip.innerHTML = `
    <div class="tour-tooltip-header">
      <span class="tour-tooltip-title">${step.title}</span>
      <button class="tour-close-btn" onclick="encerrarTour()" title="Fechar tour">✕</button>
    </div>
    <p class="tour-tooltip-body">${step.body}</p>
    <div class="tour-tooltip-footer">
      <span class="tour-counter">${_tourStep + 1} / ${TOUR_STEPS.length}</span>
      <div style="display:flex;gap:8px;">
        ${_tourStep > 0 ? '<button class="tour-btn tour-btn-outline" onclick="_tourAnterior()">← Anterior</button>' : ''}
        <button class="tour-btn tour-btn-primary" onclick="_tourProximo()">
          ${_tourStep < TOUR_STEPS.length - 1 ? 'Próximo →' : '✅ Concluir'}
        </button>
      </div>
    </div>
  `;

  // Posicionar destaque no elemento alvo
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => _posicionarTour(target, step.position), 200);
  } else {
    _tourHighlight.style.display = 'none';
    _posicionarTooltipCenter();
  }
}

// ── Posicionar highlight + tooltip ───────────────────────────────
function _posicionarTour(target, position) {
  const rect = target.getBoundingClientRect();
  const margin = 6;

  // Highlight ring
  _tourHighlight.style.cssText = `
    display: block;
    top: ${rect.top + window.scrollY - margin}px;
    left: ${rect.left + window.scrollX - margin}px;
    width: ${rect.width + margin * 2}px;
    height: ${rect.height + margin * 2}px;
  `;

  // Tooltip position
  const ttW = Math.min(280, window.innerWidth - 32);
  let top, left;
  const gap = 14;

  if (position === 'bottom') {
    top = rect.bottom + window.scrollY + gap;
    left = rect.left + window.scrollX + rect.width / 2 - ttW / 2;
  } else {
    top = rect.top + window.scrollY - gap - 170; // approx tooltip height
    left = rect.left + window.scrollX + rect.width / 2 - ttW / 2;
  }

  // Clamp horizontal
  left = Math.max(16, Math.min(left, window.innerWidth - ttW - 16));
  // Clamp vertical
  top = Math.max(16, top);

  _tourTooltip.style.cssText = `
    display: block;
    top: ${top}px;
    left: ${left}px;
    width: ${ttW}px;
  `;
}

function _posicionarTooltipCenter() {
  const ttW = Math.min(280, window.innerWidth - 32);
  _tourTooltip.style.cssText = `
    display: block;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: ${ttW}px;
  `;
}

// ── Navegação ─────────────────────────────────────────────────────
function _tourProximo() {
  if (_tourStep < TOUR_STEPS.length - 1) {
    _tourStep++;
    _renderTourStep();
  } else {
    encerrarTour();
  }
}

function _tourAnterior() {
  if (_tourStep > 0) {
    _tourStep--;
    _renderTourStep();
  }
}

function _tourClickOverlay(e) {
  // Clicar no overlay avança o tour (facilita UX mobile)
  _tourProximo();
}

// ── Encerrar tour ─────────────────────────────────────────────────
function encerrarTour() {
  _tourActive = false;
  if (_tourOverlay)    { _tourOverlay.remove();    _tourOverlay = null; }
  if (_tourTooltip)    { _tourTooltip.remove();    _tourTooltip = null; }
  if (_tourHighlight)  { _tourHighlight.remove();  _tourHighlight = null; }
  // Marcar como visto
  try { localStorage.setItem('fp_tour_done', '1'); } catch(e) {}
  if (typeof mostrarToast === 'function') mostrarToast('Tour concluído! Bom controle financeiro. 🚀', 'success');
}

// ── Reposicionar em resize/scroll ─────────────────────────────────
window.addEventListener('resize', () => {
  if (_tourActive && _tourHighlight) {
    const step = TOUR_STEPS[_tourStep];
    const target = document.querySelector(step.target);
    if (target) _posicionarTour(target, step.position);
  }
});

// ── Botão de tour na interface ────────────────────────────────────
// Chamado pelo botão na UI. Verifica se já foi feito antes de mostrar.
function abrirTourOuDica() {
  iniciarTour();
}
