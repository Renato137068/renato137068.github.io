// FinançasPro — P3.6 Temas Visuais + FP Coins / P3.7 Relatório Anual Wrapped

(function() {
  'use strict';

  // ── Temas disponíveis ────────────────────────────────────────
  const TEMAS = [
    {
      id: 'padrao', nome: 'Padrão', emoji: '🌿', preco: 0, desbloqueado: true,
      vars: {}
    },
    {
      id: 'oceano', nome: 'Oceano', emoji: '🌊', preco: 500,
      vars: { '--primary':'#0369a1', '--primary-light':'rgba(3,105,161,.12)', '--success':'#0891b2' }
    },
    {
      id: 'flamingo', nome: 'Flamingo', emoji: '🦩', preco: 500,
      vars: { '--primary':'#db2777', '--primary-light':'rgba(219,39,119,.12)', '--success':'#e879f9' }
    },
    {
      id: 'aurora', nome: 'Aurora', emoji: '🌌', preco: 800,
      vars: { '--primary':'#7c3aed', '--primary-light':'rgba(124,58,237,.12)', '--success':'#06b6d4', '--warning':'#f97316' }
    },
    {
      id: 'terra', nome: 'Terra', emoji: '🌍', preco: 600,
      vars: { '--primary':'#92400e', '--primary-light':'rgba(146,64,14,.12)', '--success':'#15803d' }
    },
    {
      id: 'neon', nome: 'Neon', emoji: '⚡', preco: 1000,
      vars: { '--primary':'#84cc16', '--primary-light':'rgba(132,204,22,.12)', '--success':'#22d3ee',
              '--bg':'#0a0a0a', '--surface':'#111827', '--text-primary':'#f9fafb', '--border-light':'rgba(255,255,255,.1)' }
    },
  ];

  const _COINS_KEY = 'fp_coins';
  const _TEMA_KEY  = 'fp_tema_ativo';
  const _DESBL_KEY = 'fp_temas_desbloqueados';

  function _getCoins()   { return parseInt(localStorage.getItem(_COINS_KEY) || '0'); }
  function _setCoins(v)  { localStorage.setItem(_COINS_KEY, String(Math.max(0, v))); }
  function _getTemaId()  { return localStorage.getItem(_TEMA_KEY) || 'padrao'; }
  function _getDesbl()   { try { return JSON.parse(localStorage.getItem(_DESBL_KEY) || '["padrao"]'); } catch(e) { return ['padrao']; } }
  function _setDesbl(v)  { localStorage.setItem(_DESBL_KEY, JSON.stringify(v)); }

  // ── Aplicar tema ao document ─────────────────────────────────
  function aplicarTema(id) {
    const tema = TEMAS.find(t => t.id === id) || TEMAS[0];
    const root = document.documentElement;
    // Reset custom props
    TEMAS.forEach(t => Object.keys(t.vars || {}).forEach(k => root.style.removeProperty(k)));
    // Apply
    Object.entries(tema.vars || {}).forEach(([k, v]) => root.style.setProperty(k, v));
    localStorage.setItem(_TEMA_KEY, id);
    if (typeof mostrarToast === 'function') mostrarToast('Tema ' + tema.nome + ' ativado ' + tema.emoji, 'success');
    renderTemas();
  }
  window.aplicarTema = aplicarTema;

  // ── Comprar tema ─────────────────────────────────────────────
  function comprarTema(id) {
    const tema = TEMAS.find(t => t.id === id);
    if (!tema) return;
    const desbl = _getDesbl();
    if (desbl.includes(id)) { aplicarTema(id); return; }
    const coins = _getCoins();
    if (coins < tema.preco) {
      if (typeof mostrarToast === 'function') mostrarToast('FP Coins insuficientes! Você tem ' + coins + ', precisa de ' + tema.preco + '.', 'warn');
      return;
    }
    if (typeof fpConfirm === 'function') {
      fpConfirm('Desbloquear tema ' + tema.nome + ' por ' + tema.preco + ' FP Coins?', () => {
        _setCoins(coins - tema.preco);
        desbl.push(id);
        _setDesbl(desbl);
        aplicarTema(id);
        renderTemas();
      });
    } else {
      _setCoins(coins - tema.preco);
      desbl.push(id);
      _setDesbl(desbl);
      aplicarTema(id);
    }
  }
  window.comprarTema = comprarTema;

  // ── Ganhar FP Coins (chamado por outras partes do app) ───────
  function ganharCoins(qtd, motivo) {
    const atual = _getCoins();
    _setCoins(atual + qtd);
    if (typeof mostrarToast === 'function') mostrarToast('🪙 +' + qtd + ' FP Coins' + (motivo ? ' — ' + motivo : ''), 'success');
    renderTemas();
  }
  window.ganharCoins = ganharCoins;

  // ── Render painel de temas ───────────────────────────────────
  function renderTemas() {
    const el = document.getElementById('temas-panel');
    if (!el) return;
    const coins  = _getCoins();
    const desbl  = _getDesbl();
    const ativo  = _getTemaId();

    el.innerHTML =
      '<div class="temas-coins">' +
        '🪙 <strong>' + coins + ' FP Coins</strong>' +
        '<span class="temas-coins-dica">Ganhe coins ao atingir conquistas, concluir desafios e manter sequências!</span>' +
      '</div>' +
      '<div class="temas-grid">' +
      TEMAS.map(t => {
        const possuido = desbl.includes(t.id);
        const isAtivo  = t.id === ativo;
        return '<div class="tema-card ' + (isAtivo ? 'ativo' : '') + '">' +
          '<div class="tema-emoji">' + t.emoji + '</div>' +
          '<div class="tema-nome">' + t.nome + '</div>' +
          (t.preco > 0 ? '<div class="tema-preco">🪙 ' + t.preco + '</div>' : '<div class="tema-preco" style="color:var(--success)">Grátis</div>') +
          (isAtivo
            ? '<button class="btn btn-sm btn-primary" disabled>✅ Ativo</button>'
            : possuido
              ? '<button class="btn btn-sm btn-outline" onclick="aplicarTema(\'' + t.id + '\')">Ativar</button>'
              : coins >= t.preco
                ? '<button class="btn btn-sm btn-primary" onclick="comprarTema(\'' + t.id + '\')">🪙 Desbloquear</button>'
                : '<button class="btn btn-sm btn-outline" disabled title="Coins insuficientes">🔒 ' + t.preco + '</button>') +
        '</div>';
      }).join('') +
      '</div>';
  }
  window.renderTemas = renderTemas;

  // ── P3.7 — Relatório anual "Wrapped" ────────────────────────
  function gerarWrapped() {
    const ano = new Date().getFullYear();
    const tx  = (typeof transacoes !== 'undefined' ? transacoes : [])
      .filter(t => t.data && t.data.startsWith(String(ano)));

    if (tx.length === 0) {
      if (typeof fpAlert === 'function') fpAlert('Nenhuma transação registrada em ' + ano + ' ainda!', '📅');
      return;
    }

    const totalRec  = tx.filter(t => t.tipo === 'receita').reduce((s,t) => s+t.valor, 0);
    const totalDesp = tx.filter(t => t.tipo === 'despesa').reduce((s,t) => s+t.valor, 0);
    const saldo     = totalRec - totalDesp;
    const txCount   = tx.length;
    const streak    = (typeof config !== 'undefined' ? config.streak : 0) || 0;

    // Top categorias
    const porCat = {};
    tx.filter(t => t.tipo==='despesa').forEach(t => {
      porCat[t.categoria||'outros'] = (porCat[t.categoria||'outros']||0) + t.valor;
    });
    const topCats = Object.entries(porCat).sort((a,b) => b[1]-a[1]).slice(0,3);
    const catLabel = typeof CATEGORIAS_LABEL !== 'undefined' ? CATEGORIAS_LABEL : {};

    // Mês mais econômico
    const porMes = {};
    tx.forEach(t => {
      if (!t.data) return;
      const m = t.data.slice(0,7);
      if (!porMes[m]) porMes[m] = { r:0, d:0 };
      if (t.tipo==='receita') porMes[m].r += t.valor;
      else porMes[m].d += t.valor;
    });
    const melhorMes = Object.entries(porMes)
      .map(([m, v]) => ({ mes:m, saldo:v.r - v.d }))
      .sort((a,b) => b.saldo - a.saldo)[0];

    const el = document.getElementById('wrapped-panel');
    if (!el) return;

    const mesLabel = melhorMes ? new Date(melhorMes.mes+'-01').toLocaleDateString('pt-BR',{month:'long'}) : '';
    const fmt = v => 'R$ ' + parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0});

    el.innerHTML =
      '<div class="wrapped-card">' +
        '<div class="wrapped-ano">✨ Seu ' + ano + ' em Números</div>' +
        '<div class="wrapped-stats">' +
          '<div class="wrapped-stat"><span class="wrapped-stat-emoji">💸</span><div class="wrapped-stat-val">' + fmt(totalDesp) + '</div><div class="wrapped-stat-label">gastos no ano</div></div>' +
          '<div class="wrapped-stat"><span class="wrapped-stat-emoji">💰</span><div class="wrapped-stat-val">' + fmt(totalRec) + '</div><div class="wrapped-stat-label">receitas no ano</div></div>' +
          '<div class="wrapped-stat"><span class="wrapped-stat-emoji">' + (saldo>=0?'📈':'📉') + '</span><div class="wrapped-stat-val" style="color:' + (saldo>=0?'var(--success)':'var(--danger)') + '">' + fmt(Math.abs(saldo)) + '</div><div class="wrapped-stat-label">' + (saldo>=0?'saldo positivo':'saldo negativo') + '</div></div>' +
          '<div class="wrapped-stat"><span class="wrapped-stat-emoji">📋</span><div class="wrapped-stat-val">' + txCount + '</div><div class="wrapped-stat-label">lançamentos</div></div>' +
          '<div class="wrapped-stat"><span class="wrapped-stat-emoji">🔥</span><div class="wrapped-stat-val">' + streak + '</div><div class="wrapped-stat-label">dias de sequência</div></div>' +
          (melhorMes ? '<div class="wrapped-stat"><span class="wrapped-stat-emoji">🏆</span><div class="wrapped-stat-val">' + mesLabel.charAt(0).toUpperCase()+mesLabel.slice(1) + '</div><div class="wrapped-stat-label">mês mais econômico</div></div>' : '') +
        '</div>' +
        (topCats.length > 0
          ? '<div class="wrapped-top">' +
              '<div class="wrapped-top-titulo">Top 3 categorias de gastos:</div>' +
              topCats.map(([c,v],i) => '<div class="wrapped-top-item"><span>' + ['🥇','🥈','🥉'][i] + ' ' + (catLabel[c]||c) + '</span><strong>' + fmt(v) + '</strong></div>').join('') +
            '</div>' : '') +
        '<button class="btn btn-outline btn-sm" style="margin-top:16px;width:100%;" onclick="compartilharWrapped()">📤 Compartilhar (sem valores)</button>' +
      '</div>';
  }
  window.gerarWrapped = gerarWrapped;

  // ── Compartilhar Wrapped (sem valores sensíveis) ─────────────
  function compartilharWrapped() {
    const streak = (typeof config !== 'undefined' ? config.streak : 0) || 0;
    const ano    = new Date().getFullYear();
    const tx = (typeof transacoes !== 'undefined' ? transacoes : []).filter(t => t.data && t.data.startsWith(String(ano)));
    const texto = '✨ Meu ' + ano + ' financeiro com FinançasPro:\n' +
      '📋 ' + tx.length + ' lançamentos registrados\n' +
      '🔥 ' + streak + ' dias de sequência\n' +
      '💪 Controlando minhas finanças! #FinançasPro';

    if (navigator.share) {
      navigator.share({ title: 'Meu ' + ano + ' Financeiro', text: texto });
    } else {
      navigator.clipboard?.writeText(texto).then(() => {
        if (typeof mostrarToast === 'function') mostrarToast('Texto copiado para a área de transferência!', 'success');
      });
    }
  }
  window.compartilharWrapped = compartilharWrapped;

  // ── Init ────────────────────────────────────────────────────
  function _init() {
    const temaId = _getTemaId();
    if (temaId && temaId !== 'padrao') {
      const tema = TEMAS.find(t => t.id === temaId);
      if (tema) Object.entries(tema.vars || {}).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
    }
    // Dar coins por conquistas existentes
    const coins = _getCoins();
    if (coins === 0) {
      const streak = (typeof config !== 'undefined' ? config.streak : 0) || 0;
      if (streak >= 7) _setCoins(streak * 10); // seed inicial
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else { _init(); }

})();
