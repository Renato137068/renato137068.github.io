// FinançasPro — P3.4 Desafios Mensais + P3.5 Medalhas de Marco Temporal

(function() {
  'use strict';

  const _STORAGE_KEY = 'fp_desafios';
  const _MEDAL_KEY   = 'fp_medalhas';

  // ── Banco de desafios mensais temáticos ─────────────────────
  const DESAFIOS_BANCO = [
    { id:'d01', emoji:'🚫', titulo:'Mês sem Delivery', desc:'Não registre nenhuma despesa na categoria Delivery/Ifood este mês.', categoria:'delivery', tipo:'zero_cat' },
    { id:'d02', emoji:'☕', titulo:'Café em casa', desc:'Reduza gastos com café e padaria em 50% comparado ao mês anterior.', categoria:'cafe', tipo:'reduzir_50', ref:'cafe' },
    { id:'d03', emoji:'💰', titulo:'Poupança 25%', desc:'Poupe pelo menos 25% da sua renda este mês.', tipo:'poupar_pct', meta:25 },
    { id:'d04', emoji:'📱', titulo:'Detox de Assinaturas', desc:'Cancele pelo menos 1 assinatura que você não usa.', tipo:'manual' },
    { id:'d05', emoji:'🍳', titulo:'Cozinheiro do Mês', desc:'Reduza gastos com alimentação fora de casa em 30%.', tipo:'reduzir_pct', categoria:'alimentacao_fora', meta:30 },
    { id:'d06', emoji:'🛒', titulo:'Lista de Compras', desc:'Registre TODAS as compras de supermercado deste mês.', tipo:'manual' },
    { id:'d07', emoji:'🚗', titulo:'Mês sem Uber', desc:'Use transporte público ou a pé. Zero gastos em Transporte/App.', categoria:'transporte', tipo:'zero_cat' },
    { id:'d08', emoji:'📚', titulo:'Investimento Educação', desc:'Invista pelo menos R$ 50 em um curso ou livro este mês.', tipo:'manual' },
    { id:'d09', emoji:'🎯', titulo:'Meta em Dia', desc:'Faça pelo menos 1 depósito em uma meta financeira ativa.', tipo:'manual' },
    { id:'d10', emoji:'🔢', titulo:'100 Dias Registrando', desc:'Registre pelo menos 1 transação por dia durante todo o mês.', tipo:'streak_30' },
    { id:'d11', emoji:'💳', titulo:'Zero Dívida Nova', desc:'Não contraia nenhuma dívida nova este mês.', tipo:'manual' },
    { id:'d12', emoji:'🏋️', titulo:'Saúde Financeira 70+', desc:'Mantenha o score de saúde financeira acima de 70 por 30 dias.', tipo:'score', meta:70 },
  ];

  // ── Medalhas de marco temporal ───────────────────────────────
  const MEDALHAS_MARCO = [
    { id:'m_streak_30',   emoji:'🔥', titulo:'1 Mês de Sequência',      desc:'30 dias consecutivos registrando', tipo:'streak', meta:30  },
    { id:'m_streak_90',   emoji:'💎', titulo:'3 Meses de Sequência',     desc:'90 dias consecutivos registrando', tipo:'streak', meta:90  },
    { id:'m_streak_180',  emoji:'🏅', titulo:'6 Meses de Sequência',     desc:'180 dias consecutivos',           tipo:'streak', meta:180 },
    { id:'m_streak_365',  emoji:'🏆', titulo:'1 Ano de Sequência!',      desc:'365 dias — lenda das finanças',   tipo:'streak', meta:365 },
    { id:'m_orc_3',       emoji:'🎯', titulo:'3 Meses no Orçamento',     desc:'3 meses sem estourar o orçamento',tipo:'orc_ok', meta:3   },
    { id:'m_orc_6',       emoji:'⭐', titulo:'6 Meses no Orçamento',     desc:'Seis meses de disciplina',        tipo:'orc_ok', meta:6   },
    { id:'m_orc_12',      emoji:'👑', titulo:'1 Ano no Orçamento',       desc:'Mestre do orçamento',             tipo:'orc_ok', meta:12  },
    { id:'m_poupanca_10', emoji:'💰', titulo:'Poupador Iniciante',       desc:'Poupou 10% da renda em um mês',   tipo:'poupar_pct', meta:10 },
    { id:'m_poupanca_20', emoji:'💰💰', titulo:'Poupador Intermediário', desc:'Poupou 20% da renda em um mês',  tipo:'poupar_pct', meta:20 },
    { id:'m_poupanca_30', emoji:'💰💰💰', titulo:'Poupador Avançado',   desc:'Poupou 30% da renda em um mês',   tipo:'poupar_pct', meta:30 },
    { id:'m_score_80',    emoji:'📊', titulo:'Score Excelente',          desc:'Score de saúde acima de 80',      tipo:'score', meta:80  },
    { id:'m_score_90',    emoji:'🌟', titulo:'Score Perfeito',           desc:'Score de saúde acima de 90',      tipo:'score', meta:90  },
    { id:'m_1000tx',      emoji:'📝', titulo:'1.000 Transações',         desc:'Registrou 1000 lançamentos',      tipo:'tx_count', meta:1000 },
    { id:'m_meta_ok',     emoji:'🎉', titulo:'Meta Conquistada',         desc:'Concluiu uma meta financeira',    tipo:'manual' },
    { id:'m_divida_zero', emoji:'🗑️', titulo:'Zerou as Dívidas',        desc:'Quitou todas as dívidas',         tipo:'manual' },
  ];

  let _estado = { // persiste por mês
    mesAtivo: '',
    desafioAtivo: null,
    desafiosConcluidos: [],
    medalhas: []
  };

  function _carregar() {
    try {
      const d = JSON.parse(localStorage.getItem(_STORAGE_KEY) || '{}');
      const m = JSON.parse(localStorage.getItem(_MEDAL_KEY)   || '[]');
      _estado = { mesAtivo:'', desafioAtivo:null, desafiosConcluidos:[], medalhas:[], ...d };
      _estado.medalhas = m.length ? m : _estado.medalhas;
    } catch(e) {}
  }

  function _salvar() {
    localStorage.setItem(_STORAGE_KEY, JSON.stringify(_estado));
    localStorage.setItem(_MEDAL_KEY,   JSON.stringify(_estado.medalhas));
  }

  // ── Verificar medalhas automaticamente ──────────────────────
  function verificarMedalhas() {
    _carregar();
    const streak = (typeof config !== 'undefined' ? config.streak : 0) || 0;
    const score  = (typeof calcScore === 'function' ? calcScore().total : 0) || 0;
    const txCount = (typeof transacoes !== 'undefined' ? transacoes.length : 0);
    const novas  = [];

    MEDALHAS_MARCO.forEach(m => {
      if (_estado.medalhas.includes(m.id)) return;
      let ganhou = false;
      if (m.tipo === 'streak'     && streak   >= m.meta) ganhou = true;
      if (m.tipo === 'score'      && score    >= m.meta) ganhou = true;
      if (m.tipo === 'tx_count'   && txCount  >= m.meta) ganhou = true;
      if (ganhou) { _estado.medalhas.push(m.id); novas.push(m); }
    });

    if (novas.length > 0) {
      _salvar();
      novas.forEach(m => {
        if (typeof mostrarToast === 'function')
          mostrarToast('🏅 Medalha desbloqueada: ' + m.titulo + ' ' + m.emoji, 'achievement');
        if (typeof config !== 'undefined') {
          config.xp = (config.xp || 0) + 100;
          if (typeof _persistConfig === 'function') _persistConfig();
        }
      });
    }
  }
  window.verificarMedalhas = verificarMedalhas;

  function conquistarManual(medalhaId) {
    _carregar();
    if (!_estado.medalhas.includes(medalhaId)) {
      _estado.medalhas.push(medalhaId);
      _salvar();
      const m = MEDALHAS_MARCO.find(x => x.id === medalhaId);
      if (m && typeof mostrarToast === 'function')
        mostrarToast('🏅 ' + m.titulo + ' desbloqueada!', 'achievement');
    }
    renderDesafios();
  }
  window.conquistarManual = conquistarManual;

  function aceitarDesafio(id) {
    _estado.desafioAtivo = id;
    _salvar();
    renderDesafios();
    if (typeof mostrarToast === 'function') mostrarToast('🎯 Desafio aceito! Boa sorte!', 'success');
  }
  window.aceitarDesafio = aceitarDesafio;

  function concluirDesafio(id) {
    if (!_estado.desafiosConcluidos.includes(id)) {
      _estado.desafiosConcluidos.push(id);
      _estado.desafioAtivo = null;
      _salvar();
      if (typeof config !== 'undefined') {
        config.xp = (config.xp || 0) + 200;
        if (typeof _persistConfig === 'function') _persistConfig();
        if (typeof renderLevel === 'function') renderLevel();
      }
      if (typeof mostrarToast === 'function') mostrarToast('🏆 Desafio concluído! +200 XP', 'achievement');
    }
    renderDesafios();
  }
  window.concluirDesafio = concluirDesafio;

  function renderDesafios() {
    const el = document.getElementById('desafios-panel');
    if (!el) return;
    _carregar();

    // Desafio do mês (rotativo por mês)
    const mesIdx = new Date().getMonth();
    const desafioMes = DESAFIOS_BANCO[mesIdx % DESAFIOS_BANCO.length];
    const ativo = _estado.desafioAtivo === desafioMes.id;
    const concluido = _estado.desafiosConcluidos.includes(desafioMes.id);

    // Medalhas conquistadas
    const medalhasGanhas = MEDALHAS_MARCO.filter(m => _estado.medalhas.includes(m.id));
    const medalhasPendentes = MEDALHAS_MARCO.filter(m => !_estado.medalhas.includes(m.id));

    let html = '<div class="desafio-mes-card">' +
      '<div class="desafio-mes-header">' +
        '<span class="desafio-mes-emoji">' + desafioMes.emoji + '</span>' +
        '<div>' +
          '<div class="desafio-mes-titulo">Desafio do Mês</div>' +
          '<div class="desafio-mes-nome">' + desafioMes.titulo + '</div>' +
        '</div>' +
        (concluido ? '<span class="desafio-badge-done">✅ Concluído</span>' :
         ativo ? '<span class="desafio-badge-ativo">Em andamento</span>' : '') +
      '</div>' +
      '<p class="desafio-mes-desc">' + desafioMes.desc + '</p>' +
      (!concluido && !ativo ? '<button class="btn btn-primary btn-sm" onclick="aceitarDesafio(\'' + desafioMes.id + '\')">🎯 Aceitar Desafio +200 XP</button>' : '') +
      (ativo && !concluido  ? '<button class="btn btn-success btn-sm" onclick="concluirDesafio(\'' + desafioMes.id + '\')">✅ Marcar como concluído</button>' : '') +
    '</div>';

    // Medalhas conquistadas
    if (medalhasGanhas.length > 0) {
      html += '<div class="medalhas-titulo">🏅 Suas Medalhas (' + medalhasGanhas.length + ')</div>' +
        '<div class="medalhas-grid">' +
        medalhasGanhas.map(m =>
          '<div class="medalha-card ganho" title="' + m.desc + '">' +
            '<div class="medalha-emoji">' + m.emoji + '</div>' +
            '<div class="medalha-nome">' + m.titulo + '</div>' +
          '</div>'
        ).join('') + '</div>';
    }

    // Próximas medalhas
    html += '<div class="medalhas-titulo">🔒 Próximas Medalhas</div>' +
      '<div class="medalhas-grid">' +
      medalhasPendentes.slice(0,6).map(m =>
        '<div class="medalha-card bloqueado" title="' + m.desc + '">' +
          '<div class="medalha-emoji" style="filter:grayscale(1)">🔒</div>' +
          '<div class="medalha-nome">' + m.titulo + '</div>' +
          '<div class="medalha-desc">' + m.desc + '</div>' +
          (m.tipo === 'manual'
            ? '<button class="btn btn-sm btn-outline" style="margin-top:6px;font-size:.7rem;" onclick="conquistarManual(\'' + m.id + '\')">Marcar</button>'
            : '') +
        '</div>'
      ).join('') + '</div>';

    el.innerHTML = html;
    verificarMedalhas();
  }
  window.renderDesafios = renderDesafios;

  function _init() { _carregar(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else { _init(); }

})();
