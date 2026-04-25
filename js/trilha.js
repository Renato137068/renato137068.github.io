// FinançasPro — P3.2 Trilha de Aprendizado Financeiro
// 3 níveis: Iniciante → Intermediário → Avançado
// Progresso persiste em localStorage: 'fp_trilha'

(function() {
  'use strict';

  const _STORAGE_KEY = 'fp_trilha';

  const TRILHA = [
    {
      nivel: 'iniciante', label: 'Iniciante 🌱', cor: '#16a34a',
      modulos: [
        { id:'i1', titulo:'O que é orçamento?', xp:50,
          conteudo:'Um orçamento é um plano de como você vai usar seu dinheiro. Registre todas as entradas (receitas) e saídas (despesas) para saber exatamente para onde vai cada real. Sem orçamento, o dinheiro "desaparece".',
          missao:'Adicione pelo menos 5 transações ao FinançasPro esta semana.', tipo:'lancamentos', meta:5 },
        { id:'i2', titulo:'Receitas vs. Despesas', xp:50,
          conteudo:'Receita é dinheiro que entra (salário, freelance, aluguel recebido). Despesa é dinheiro que sai. Saldo = Receitas − Despesas. Se o saldo é negativo por vários meses seguidos, você está se endividando.',
          missao:'Registre sua renda mensal nas configurações.', tipo:'config_renda', meta:1 },
        { id:'i3', titulo:'Categorias de Gastos', xp:75,
          conteudo:'Agrupar gastos em categorias (Alimentação, Transporte, Moradia...) revela padrões invisíveis. É comum descobrir que você gasta 3x mais em delivery do que imaginava ao ver os números consolidados.',
          missao:'Categorize 10 transações diferentes.', tipo:'categorias', meta:10 },
        { id:'i4', titulo:'O perigo das dívidas', xp:75,
          conteudo:'Dívidas de cartão rotativo e cheque especial cobram as maiores taxas do mercado (300-400% ao ano). Priorize quitá-las antes de qualquer investimento — nenhuma aplicação rende tanto quanto você paga de juros.',
          missao:'Cadastre qualquer dívida no módulo de Dívidas.', tipo:'divida', meta:1 },
        { id:'i5', titulo:'Reserva de Emergência', xp:100,
          conteudo:'Guarde 3 a 6 meses de despesas mensais em aplicação de liquidez diária (CDB, Tesouro Selic). Essa reserva evita que imprevistos (demissão, saúde, carro) virem dívidas. É a base de toda saúde financeira.',
          missao:'Configure uma meta de Reserva de Emergência.', tipo:'meta', meta:1 },
      ]
    },
    {
      nivel: 'intermediario', label: 'Intermediário 📈', cor: '#3b82f6',
      modulos: [
        { id:'m1', titulo:'Método 50/30/20', xp:100,
          conteudo:'Divida a renda em 50% necessidades, 30% desejos e 20% poupança/investimentos. Use o painel 50/30/20 do FinançasPro para monitorar automaticamente em qual bucket cada gasto se encaixa.',
          missao:'Mantenha o orçamento 50/30/20 dentro dos limites por 30 dias.', tipo:'5030', meta:1 },
        { id:'m2', titulo:'Juros Compostos na Prática', xp:100,
          conteudo:'Use o Simulador do FinançasPro: calcule quanto R$ 500/mês renderia em 10, 20 e 30 anos a 10% a.a. A diferença entre 20 e 30 anos é maior que entre 10 e 20 — a curva exponencial acelera no final.',
          missao:'Execute uma simulação de juros compostos por mais de 10 anos.', tipo:'simulador', meta:1 },
        { id:'m3', titulo:'Renda Fixa Descomplicada', xp:125,
          conteudo:'CDB, LCI, LCA e Tesouro Direto são investimentos de renda fixa — você sabe o quanto vai receber no vencimento. Prefira LCI/LCA para médio prazo (isentas de IR). Para emergência, Tesouro Selic ou CDB de liquidez diária.',
          missao:'Adicione um ativo de renda fixa à sua carteira de investimentos.', tipo:'investimento', meta:1 },
        { id:'m4', titulo:'Cartões de Crédito sem Medo', xp:125,
          conteudo:'Cartão de crédito não é renda extra — é débito futuro. Use a funcionalidade de cartões do FinançasPro para monitorar fatura e limite. Quite o total todo mês para aproveitar o prazo de graça sem pagar juros.',
          missao:'Cadastre seu cartão e monitore o limite disponível.', tipo:'cartao', meta:1 },
        { id:'m5', titulo:'Metas Financeiras SMART', xp:150,
          conteudo:'Transforme sonhos em projetos: defina valor, prazo e aporte mensal necessário. "Quero viajar para Europa em 2 anos" → calcule o custo, divida por 24 meses e configure a meta no FinançasPro.',
          missao:'Crie 2 metas financeiras com prazo definido.', tipo:'metas', meta:2 },
      ]
    },
    {
      nivel: 'avancado', label: 'Avançado 🏆', cor: '#f59e0b',
      modulos: [
        { id:'a1', titulo:'Diversificação de Carteira', xp:200,
          conteudo:'Combine renda fixa, ações, FIIs e reserva. Uma carteira balanceada para o Brasil: 40% renda fixa (proteção), 30% ações (crescimento), 20% FIIs (renda), 10% internacional (proteção cambial). Rebalanceie anualmente.',
          missao:'Cadastre ativos de pelo menos 3 classes diferentes em Investimentos.', tipo:'diversificacao', meta:3 },
        { id:'a2', titulo:'Planejamento de Aposentadoria', xp:200,
          conteudo:'Calcule quanto precisa acumular: despesas mensais × 12 × 25 (Regra dos 4%). Para R$ 5.000/mês, o alvo é R$ 1.500.000. Use a Calculadora de Aposentadoria do FinançasPro e defina o aporte mensal necessário.',
          missao:'Execute a calculadora de aposentadoria e defina uma meta de longo prazo.', tipo:'calc_aposent', meta:1 },
        { id:'a3', titulo:'Otimização Fiscal', xp:200,
          conteudo:'Declare despesas médicas, dependentes e previdência (PGBL até 12% da renda). Ações: isenção de IR até R$ 20k/mês em vendas. Planeje resgates para cair na faixa de IR menor. Legal e eficiente.',
          missao:'Exporte e revise seu relatório financeiro mensal.', tipo:'relatorio', meta:1 },
        { id:'a4', titulo:'Análise de Fluxo de Caixa', xp:250,
          conteudo:'O gráfico de cashflow diário revela padrões: você gasta mais na semana 1 do mês (pós-salário)? Há dias negativos recorrentes? Use essa análise para ajustar pagamentos e evitar saldo negativo em dias específicos.',
          missao:'Analise o gráfico de cashflow diário por pelo menos 2 meses consecutivos.', tipo:'cashflow', meta:1 },
        { id:'a5', titulo:'Independência Financeira', xp:300,
          conteudo:'Independência financeira = renda passiva ≥ despesas. Calcule sua "taxa de poupança" (poupança ÷ renda): 10% → FI em ~40 anos; 25% → ~32 anos; 50% → ~17 anos. Cada percentual a mais reduz anos de trabalho.',
          missao:'Atinja score de saúde financeira acima de 80 por 3 meses consecutivos.', tipo:'score', meta:80 },
      ]
    }
  ];

  let _progresso = {}; // { modulo_id: true }

  function _carregar() {
    try { _progresso = JSON.parse(localStorage.getItem(_STORAGE_KEY) || '{}'); }
    catch(e) { _progresso = {}; }
  }

  function _salvar() { localStorage.setItem(_STORAGE_KEY, JSON.stringify(_progresso)); }

  function _xpTotal() {
    let xp = 0;
    TRILHA.forEach(n => n.modulos.forEach(m => { if (_progresso[m.id]) xp += m.xp; }));
    return xp;
  }

  function concluirModulo(id) {
    if (_progresso[id]) return;
    const modulo = TRILHA.flatMap(n => n.modulos).find(m => m.id === id);
    if (!modulo) return;
    _progresso[id] = true;
    _salvar();
    // Dar XP
    if (typeof config !== 'undefined') {
      config.xp = (config.xp || 0) + modulo.xp;
      if (typeof _persistConfig === 'function') _persistConfig();
      if (typeof renderLevel === 'function') renderLevel();
    }
    if (typeof mostrarToast === 'function') mostrarToast('🎓 Módulo concluído! +' + modulo.xp + ' XP', 'achievement');
    renderTrilha();
  }
  window.concluirModulo = concluirModulo;

  function verModulo(id) {
    const modulo = TRILHA.flatMap(n => n.modulos).find(m => m.id === id);
    if (!modulo) return;
    const concluido = !!_progresso[id];
    const modal = document.getElementById('trilha-modal');
    if (!modal) return;
    document.getElementById('trilha-modal-titulo').textContent = modulo.titulo;
    document.getElementById('trilha-modal-conteudo').textContent = modulo.conteudo;
    document.getElementById('trilha-modal-missao').textContent = '🎯 Missão: ' + modulo.missao;
    document.getElementById('trilha-modal-xp').textContent = '+' + modulo.xp + ' XP';
    const btn = document.getElementById('trilha-modal-btn');
    if (btn) {
      btn.textContent = concluido ? '✅ Concluído' : '✔ Marcar como concluído';
      btn.disabled = concluido;
      btn.onclick = concluido ? null : () => { concluirModulo(id); fecharTrilhaModal(); };
    }
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('open'));
  }
  window.verModulo = verModulo;

  function fecharTrilhaModal() {
    const m = document.getElementById('trilha-modal');
    if (!m) return;
    m.classList.remove('open');
    setTimeout(() => { m.style.display = 'none'; }, 280);
  }
  window.fecharTrilhaModal = fecharTrilhaModal;

  function renderTrilha() {
    const el = document.getElementById('trilha-panel');
    if (!el) return;

    const totalMod = TRILHA.reduce((s, n) => s + n.modulos.length, 0);
    const concluidos = Object.keys(_progresso).filter(k => _progresso[k]).length;
    const xpTotal = _xpTotal();
    const pct = Math.round(concluidos / totalMod * 100);

    let html = '<div class="trilha-resumo">' +
      '<div class="trilha-prog-bar-bg"><div class="trilha-prog-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="trilha-prog-label">' + concluidos + '/' + totalMod + ' módulos — ' + pct + '% — ' + xpTotal + ' XP obtidos</div>' +
    '</div>';

    TRILHA.forEach(nivel => {
      const concl = nivel.modulos.filter(m => _progresso[m.id]).length;
      const total = nivel.modulos.length;
      html += '<div class="trilha-nivel">' +
        '<div class="trilha-nivel-header" style="border-left:4px solid ' + nivel.cor + '">' +
          '<span class="trilha-nivel-label">' + nivel.label + '</span>' +
          '<span class="trilha-nivel-progresso" style="color:' + nivel.cor + '">' + concl + '/' + total + '</span>' +
        '</div>' +
        '<div class="trilha-modulos">' +
        nivel.modulos.map(m => {
          const done = !!_progresso[m.id];
          return '<div class="trilha-modulo ' + (done ? 'done' : '') + '" onclick="verModulo(\'' + m.id + '\')">' +
            '<span class="trilha-modulo-icon">' + (done ? '✅' : '📚') + '</span>' +
            '<div class="trilha-modulo-info">' +
              '<span class="trilha-modulo-titulo">' + m.titulo + '</span>' +
              '<span class="trilha-modulo-xp">+' + m.xp + ' XP</span>' +
            '</div>' +
            '<span class="trilha-modulo-chevron">›</span>' +
          '</div>';
        }).join('') +
        '</div></div>';
    });

    el.innerHTML = html;
  }
  window.renderTrilha = renderTrilha;

  function _init() { _carregar(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else { _init(); }

})();
