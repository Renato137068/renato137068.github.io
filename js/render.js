// FinançasPro — Renderização do Dashboard e Transações
// Depende de: config.js, dados.js, utils.js

// MÓDULO 6: LÓGICA FINANCEIRA
// ════════════════════════════════════
let _doMesCache = null, _doMesCacheKey = '';

function doMes(mes) {
  const target = mes || mesAtual;
  const lastTx = transacoes.length ? transacoes[transacoes.length - 1] : null;
  const key = target + '_' + transacoes.length + '_' + (lastTx?.updatedAt || lastTx?.createdAt || '');
  if (_doMesCache && _doMesCacheKey === key && !mes) return _doMesCache;
  const txMes = transacoes.filter(t => t.data && t.data.startsWith(target));
  const receitas = txMes.filter(t => t.tipo === 'receita').reduce((s,t) => s+t.valor, 0);
  const despesas = txMes.filter(t => t.tipo === 'despesa').reduce((s,t) => s+t.valor, 0);
  const porCategoria = {};
  txMes.filter(t => t.tipo === 'despesa').forEach(t => {
    const c = t.categoria || 'outros';
    porCategoria[c] = (porCategoria[c] || 0) + t.valor;
  });
  const result = { txMes, receitas, despesas, saldo: receitas - despesas, porCategoria };
  if (!mes) { _doMesCache = result; _doMesCacheKey = key; }
  return result;
}

function getMesesDisponiveis() {
  const set = new Set(transacoes.filter(t => t.data).map(t => t.data.substring(0, 7)));
  return Array.from(set).sort();
}

function calcScore() {
  const m = doMes();
  let poupancaPts = 0, orcPts = 0, engPts = 0;
  if (m.receitas > 0) {
    const taxa = (m.receitas - m.despesas) / m.receitas * 100;
    const meta = config.metaPoupanca || 20;
    poupancaPts = Math.max(0, Math.min(50, Math.round(taxa / meta * 50)));
  }
  const cats = Object.keys(orcamentos);
  if (cats.length > 0) {
    let dentro = cats.filter(c => (m.porCategoria[c] || 0) <= orcamentos[c]).length;
    orcPts = Math.round(dentro / cats.length * 30);
  }
  engPts = Math.min(20, Math.round((config.streak || 0) / 30 * 20));
  // Bonus de meta diaria
  const hojeGoalDone = config.dailyDate === new Date().toISOString().slice(0,10) && (config.dailyTxs||0) >= PLANO.DAILY_GOAL_TXS;
  if (hojeGoalDone) engPts = Math.min(20, engPts + 5);
  return { total: poupancaPts + orcPts + engPts, poupancaPts, orcPts, engPts };
}

function gerarInsights() {
  const m = doMes();
  const { receitas, despesas, saldo } = m;
  const insights = [];

  if (receitas === 0 && despesas === 0) {
    insights.push({ tipo: 'info', icon: '📊', texto: 'Registre suas primeiras transações para ver insights personalizados sobre seus hábitos financeiros.' });
    return insights;
  }

  // Poupanca
  if (receitas > 0) {
    const taxa = (saldo / receitas) * 100;
    const meta = config.metaPoupanca || 20;
    if (taxa >= meta) {
      insights.push({ tipo: 'success', icon: '🎉', texto: '<strong>Parabéns!</strong> Você está poupando <strong>' + taxa.toFixed(1) + '%</strong> da renda — acima da meta de ' + meta + '%. Continue!' });
    } else if (taxa > 0) {
      insights.push({ tipo: 'warning', icon: '📈', texto: 'Você está poupando <strong>' + taxa.toFixed(1) + '%</strong>. Para atingir sua meta de <strong>' + meta + '%</strong>, reduza as despesas em <strong>' + fmt(receitas * (meta - taxa) / 100) + '</strong> esse mes.' });
    } else {
      insights.push({ tipo: 'danger', icon: '⚠️', texto: '<strong>Saldo negativo.</strong> Suas despesas superam a renda em <strong>' + fmt(Math.abs(saldo)) + '</strong>. Veja qual categoria está pesando mais e corte já.' });
    }
  }

  // Categoria mais cara
  const cats = Object.entries(m.porCategoria).sort((a,b) => b[1]-a[1]);
  if (cats.length > 0) {
    const [topCat, topVal] = cats[0];
    const pct = receitas > 0 ? (topVal / receitas * 100).toFixed(1) : '—';
    insights.push({ tipo: 'info', icon: CATEGORIAS_ICON[topCat] || '📦', texto: 'Maior gasto: <strong>' + (CATEGORIAS_LABEL[topCat] || escHtml(topCat)) + '</strong> com <strong>' + fmt(topVal) + '</strong>' + (pct !== '—' ? ' (' + pct + '% da renda)' : '') + '.' });
  }

  // Orcamento estourado
  const estouradas = Object.keys(orcamentos).filter(c => (m.porCategoria[c] || 0) > orcamentos[c]);
  if (estouradas.length > 0) {
    insights.push({ tipo: 'danger', icon: '🚨', texto: '<strong>' + estouradas.length + ' categoria(s) estouraram</strong> o limite: ' + estouradas.map(c => CATEGORIAS_LABEL[c] || escHtml(c)).join(', ') + '. Hora de revisar os habitos.' });
  } else if (Object.keys(orcamentos).length > 0) {
    insights.push({ tipo: 'success', icon: '🎯', texto: 'Você está <strong>dentro do orçamento</strong> em todas as categorias configuradas. Excelente disciplina!' });
  }

  // Projecao de fechamento do mes
  if (receitas > 0 && despesas > 0) {
    const hoje = new Date();
    const diaAtual = hoje.getDate();
    const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const diasRestantes = diasNoMes - diaAtual;
    if (diaAtual >= 5 && diasRestantes >= 1) {
      const projecaoDespesas = (despesas / diaAtual) * diasNoMes;
      const projecaoSaldo = receitas - projecaoDespesas;
      if (projecaoSaldo < 0) {
        insights.push({ tipo: 'warning', icon: '📅', texto: 'Projeção do mês: no ritmo atual, suas despesas chegarão a <strong>' + fmt(projecaoDespesas) + '</strong>. Controle os gastos nos próximos ' + diasRestantes + ' dias.' });
      } else {
        insights.push({ tipo: 'info', icon: '📅', texto: 'Projeção: você deve fechar o mês com <strong>' + fmt(projecaoSaldo) + '</strong> de saldo positivo. ' + diasRestantes + ' dias restantes.' });
      }
    }
  }

  // Streak
  const s = config.streak || 0;
  if (s >= 30) insights.push({ tipo: 'success', icon: '🔥', texto: '<strong>' + s + ' dias de sequência!</strong> Hábito financeiro totalmente consolidado. Você é excepcional.' });
  else if (s >= 7) insights.push({ tipo: 'success', icon: '🔥', texto: 'Sequência de <strong>' + s + ' dias</strong>. Faltam <strong>' + (30 - s) + '</strong> para a conquista "Mês Impecável"!' });

  // Comparativo mês anterior
  const meses = getMesesDisponiveis();
  const idx = meses.indexOf(mesAtual);
  if (idx > 0) {
    const mAnt = doMes(meses[idx-1]);
    if (mAnt.despesas > 0 && despesas > 0) {
      const diff = despesas - mAnt.despesas;
      const pct = Math.abs(diff / mAnt.despesas * 100).toFixed(1);
      if (diff > 50) insights.push({ tipo: 'warning', icon: '📊', texto: 'Gastos subiram <strong>' + pct + '%</strong> vs mês anterior (+' + fmt(diff) + '). Identifique o que mudou.' });
      else if (diff < -50) insights.push({ tipo: 'success', icon: '📉', texto: 'Gastos caíram <strong>' + pct + '%</strong> vs mês anterior. Você economizou <strong>' + fmt(Math.abs(diff)) + '</strong>.' });
    }
  }

  return insights.slice(0, 5);
}

// ════════════════════════════════════
// MÓDULO 7: UI / RENDERIZACAO
// ════════════════════════════════════
function fmt(v) {
  if (v === undefined || v === null || isNaN(v)) return 'R$ 0,00';
  return 'R$ ' + Math.abs(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function fmtDate(iso) {
  if (!iso) return '';
  const p = iso.split('-');
  return p.length < 3 ? iso : p[2] + '/' + p[1] + '/' + p[0];
}
function getMesLabel(iso) {
  if (!iso) return '';
  const [ano, mes] = iso.split('-');
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return (nomes[parseInt(mes,10)-1] || mes) + ' ' + ano;
}
function escHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}

function _isTabActive(name) {
  const p = document.getElementById('tab-' + name);
  return p ? p.classList.contains('active') : false;
}

function renderTudo() {
  _doMesCache = null;
  const m = doMes();
  renderHeader(m);
  renderResumo(m);
  renderScore(m);
  renderInsights(m);
  renderTransacoes();
  renderOrcamento(m);
  if (typeof render5030 === 'function') render5030();
  renderNarrativaMensal();
  if (typeof renderDicaDia === 'function') renderDicaDia();
  if (typeof renderMiniInsights === 'function') renderMiniInsights();
  // Lazy: retrospectiva iterates all months — só roda quando a aba está visível
  if (_isTabActive('evolucao')) renderRetrospectiva();
  renderConquistasPreview();
  renderConfig();
  checkAchievements();
  renderDailyGoal();
  renderLevel();
  renderMissions();
  renderPatrimonio();
  renderProjecao();
  renderContas();
  renderCartoes();
  renderMetas();
  renderCategoriasCustom();
  // Novo módulo: Investimentos Avançado
  if (typeof renderInvestimentosAvancado === 'function') {
    renderInvestimentosAvancado();
  }
  verificarAlertas();
  // renderNudgeBanner() desativado v10.2
}

function renderHeader(m) {
  document.getElementById('mes-label').textContent = getMesLabel(mesAtual);
  document.getElementById('hdr-receitas').textContent = fmt(m.receitas);
  document.getElementById('hdr-despesas').textContent = fmt(m.despesas);
  const sel = document.getElementById('hdr-saldo');
  sel.textContent = fmt(m.saldo);
  sel.style.color = m.saldo >= 0 ? 'var(--success)' : 'var(--danger)';
  document.getElementById('hdr-streak').textContent = config.streak || 0;
  document.getElementById('hdr-score').textContent = calcScore().total;
  renderTrialBanner();
}

function renderResumo(m) {
  document.getElementById('sum-receita').textContent = fmt(m.receitas);
  document.getElementById('sum-receita-qtd').textContent = m.txMes.filter(t => t.tipo==='receita').length + ' transações';
  document.getElementById('sum-despesa').textContent = fmt(m.despesas);
  document.getElementById('sum-despesa-qtd').textContent = new Set(m.txMes.filter(t => t.tipo==='despesa').map(t => t.categoria)).size + ' categoria(s)';
  document.getElementById('sum-saldo').textContent = fmt(m.saldo);
  document.getElementById('sum-saldo-card').className = 'summary-card saldo ' + (m.saldo >= 0 ? 'positivo' : 'negativo');
  document.getElementById('sum-saldo-sub').textContent = m.saldo >= 0 ? 'disponível' : 'no negativo';
  const taxa = m.receitas > 0 ? Math.max(0, m.saldo / m.receitas * 100) : 0;
  document.getElementById('taxa-poupanca-val').textContent = taxa.toFixed(1) + '%';
  const bar = document.getElementById('taxa-poupanca-bar');
  bar.style.width = Math.min(100, taxa) + '%';
  bar.style.background = taxa >= (config.metaPoupanca||20) ? 'var(--success)' : taxa > 0 ? 'var(--warning)' : 'var(--danger)';
  document.getElementById('meta-poupanca-display').textContent = (config.metaPoupanca||20) + '%';
}

function renderScore(m) {
  const s = calcScore();
  document.getElementById('score-total').textContent = s.total + ' pts';
  let g = '';
  if (s.total>=90) g = '🌟 Excelente — controle financeiro total';
  else if (s.total>=70) g = '💚 Muito Bom — no caminho certo';
  else if (s.total>=50) g = '📈 Bom — pequenos ajustes fazem a diferença';
  else if (s.total>=30) g = '⚠️ Regular — revise orçamentos e hábitos';
  else g = '🔴 Atenção — registre transações e configure limites';
  document.getElementById('score-grade').textContent = g;
  document.getElementById('score-breakdown').innerHTML = [
    { label: '💰 Poupança', pts: s.poupancaPts, max: 50 },
    { label: '📊 Orçamento', pts: s.orcPts, max: 30 },
    { label: '🔥 Sequência', pts: s.engPts, max: 20 },
  ].map(r => '<div class="score-row"><span class="score-row-label">'+r.label+'</span><div class="score-row-bar"><div class="score-row-fill" style="width:'+Math.round(r.pts/r.max*100)+'%"></div></div><span class="score-row-pts">'+r.pts+'/'+r.max+'</span></div>').join('');
}

function renderInsights(m) {
  const insights = gerarInsights();
  const el = document.getElementById('insights-list');
  if (!el) return;
  el.innerHTML = insights.map(i => '<div class="insight-item ' + i.tipo + '"><span class="insight-icon">' + i.icon + '</span><span class="insight-text">' + i.texto + '</span></div>').join('') || '<div class="insight-item info"><span class="insight-icon">📊</span><span class="insight-text">Sem dados suficientes para insights.</span></div>';
}

function preencherFiltroMeses() {
  const sel = document.getElementById('tx-mes-filtro');
  if (!sel) return;
  const meses = getMesesDisponiveis();
  const atual = sel.value;
  sel.innerHTML = '<option value="">Todos os meses</option>' +
    meses.map(m => {
      const [ano, mes] = m.split('-');
      const label = new Date(+ano, +mes - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      return '<option value="' + m + '"' + (m === atual ? ' selected' : '') + '>' + label + '</option>';
    }).join('');
}

function renderTransacoes() {
  preencherFiltroMeses();
  // Sincronizar filtros básicos → _filtrosAtivos (P2.6)
  const search = (document.getElementById('tx-search') ? document.getElementById('tx-search').value : '');
  const mesFiltro = (document.getElementById('tx-mes-filtro') ? document.getElementById('tx-mes-filtro').value : '');
  if (typeof setFiltroAvancado === 'function') {
    _filtrosAtivos.busca = search;
    _filtrosAtivos.mes   = mesFiltro;
    _filtrosAtivos.tipo  = filtroTipo;
  }
  let filtered = (typeof aplicarFiltrosAvancados === 'function'
    ? aplicarFiltrosAvancados(transacoes)
    : transacoes.filter(t => {
        if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false;
        if (mesFiltro && !(t.data||'').startsWith(mesFiltro)) return false;
        if (search) { const h = ((t.descricao||'') + ' ' + (t.categoria||'') + ' ' + (t.tag||'')).toLowerCase(); if (!h.includes(search.toLowerCase())) return false; }
        return true;
      })
  ).sort((a,b) => (b.data||'').localeCompare(a.data||'') || (b.id||0)-(a.id||0));
  if (typeof renderFiltrosAvancados === 'function') renderFiltrosAvancados();

  const visible = filtered.slice(0, txPageOffset + txPageSize);
  const el = document.getElementById('tx-list');
  if (!el) return;

  if (filtered.length === 0) {
    const isEmpty = transacoes.length === 0;
    el.textContent = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'tx-empty-state';

    // SVG ilustrativo
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 120 100');
    svg.setAttribute('width', '120');
    svg.setAttribute('height', '100');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.margin = '0 auto 12px'; svg.style.display = 'block'; svg.style.opacity = '.6';

    if (isEmpty) {
      // Ilustração: carteira vazia
      const rect = document.createElementNS(svgNS, 'rect');
      Object.entries({x:'20',y:'25',width:'80',height:'55',rx:'10',fill:'none',stroke:'var(--primary)','stroke-width':'2.5'}).forEach(([k,v])=>rect.setAttribute(k,v));
      const line1 = document.createElementNS(svgNS, 'line');
      Object.entries({x1:'35',y1:'45',x2:'75',y2:'45',stroke:'var(--border)','stroke-width':'2','stroke-linecap':'round'}).forEach(([k,v])=>line1.setAttribute(k,v));
      const line2 = document.createElementNS(svgNS, 'line');
      Object.entries({x1:'35',y1:'55',x2:'60',y2:'55',stroke:'var(--border)','stroke-width':'2','stroke-linecap':'round'}).forEach(([k,v])=>line2.setAttribute(k,v));
      const circle = document.createElementNS(svgNS, 'circle');
      Object.entries({cx:'85',cy:'52',r:'8',fill:'var(--primary-light)',stroke:'var(--primary)','stroke-width':'1.5'}).forEach(([k,v])=>circle.setAttribute(k,v));
      const plus = document.createElementNS(svgNS, 'text');
      plus.setAttribute('x','85'); plus.setAttribute('y','56');
      plus.setAttribute('text-anchor','middle'); plus.setAttribute('font-size','12');
      plus.setAttribute('font-weight','700'); plus.setAttribute('fill','var(--primary)');
      plus.textContent = '+';
      svg.append(rect, line1, line2, circle, plus);
    } else {
      // Ilustração: lupa sem resultados
      const circle = document.createElementNS(svgNS, 'circle');
      Object.entries({cx:'50',cy:'42',r:'22',fill:'none',stroke:'var(--text-muted)','stroke-width':'2.5'}).forEach(([k,v])=>circle.setAttribute(k,v));
      const line = document.createElementNS(svgNS, 'line');
      Object.entries({x1:'66',y1:'58',x2:'82',y2:'74',stroke:'var(--text-muted)','stroke-width':'3','stroke-linecap':'round'}).forEach(([k,v])=>line.setAttribute(k,v));
      const dash = document.createElementNS(svgNS, 'line');
      Object.entries({x1:'40',y1:'42',x2:'60',y2:'42',stroke:'var(--border)','stroke-width':'2','stroke-linecap':'round'}).forEach(([k,v])=>dash.setAttribute(k,v));
      svg.append(circle, line, dash);
    }
    wrapper.appendChild(svg);

    const h3 = document.createElement('h3');
    h3.textContent = isEmpty ? 'Nenhuma transa\u00e7\u00e3o ainda' : 'Nenhum resultado';
    wrapper.appendChild(h3);

    const p = document.createElement('p');
    p.textContent = isEmpty
      ? 'Comece registrando sua primeira receita ou despesa. \u00c9 r\u00e1pido e vai te dar clareza sobre seus gastos.'
      : 'Tente outros filtros ou termos de busca.';
    wrapper.appendChild(p);

    const actions = document.createElement('div');
    actions.className = 'empty-actions';
    const btn = document.createElement('button');
    btn.className = isEmpty ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
    btn.textContent = isEmpty ? '\u26a1 Fazer primeiro lan\u00e7amento' : 'Limpar filtros';
    btn.addEventListener('click', function() {
      if (isEmpty) {
        switchTab(null, 'dashboard');
        setTimeout(function(){ var d = document.getElementById('tx-desc'); if(d) d.focus(); }, 100);
      } else {
        setFiltro('todos');
        var s = document.getElementById('tx-search'); if (s) s.value = '';
        renderTransacoes();
      }
    });
    actions.appendChild(btn);
    wrapper.appendChild(actions);
    el.appendChild(wrapper);

    document.getElementById('tx-pagination').style.display = 'none';
    return;
  }

  // Agrupar por data
  const groups = {};
  visible.forEach(t => { const d = t.data || 'sem-data'; if (!groups[d]) groups[d] = []; groups[d].push(t); });
  const sortedDates = Object.keys(groups).sort((a,b) => b.localeCompare(a));

  let html = '';
  sortedDates.forEach(data => {
    const txs = groups[data];
    const totalGrupo = txs.reduce((s,t) => s + (t.tipo==='receita' ? t.valor : -t.valor), 0);
    const cls = totalGrupo >= 0 ? 'positivo' : 'negativo';
    html += '<div class="date-group-header"><span>' + (data !== 'sem-data' ? fmtDate(data) : 'Sem data') + '</span><span class="date-group-total ' + cls + '">' + (totalGrupo >= 0 ? '+' : '') + fmt(totalGrupo) + '</span></div>';
    html += txs.map(t => {
      const icon = CATEGORIAS_ICON[t.categoria] || (t.tipo==='receita' ? '💰' : '💸');
      return '<div class="tx-item" id="tx-' + t.id + '"><div class="tx-icon ' + t.tipo + '">' + icon + '</div><div class="tx-details"><div class="tx-desc">' + escHtml(t.descricao||'Sem descrição') + '</div><div class="tx-meta">' + (t.categoria ? '<span>' + (CATEGORIAS_LABEL[t.categoria]||t.categoria) + '</span>' : '') + (t.tag ? '<span class="tx-tag">' + escHtml(t.tag) + '</span>' : '') + '</div></div><div class="tx-amount ' + t.tipo + '">' + (t.tipo==='receita' ? '+' : '-') + fmt(t.valor) + '</div><div class="tx-actions"><button class="btn btn-sm btn-outline" aria-label=\"Editar transação\" onclick="abrirModalEdicao(' + t.id + ')">✏️</button><button class="btn btn-sm btn-danger" aria-label=\"Remover transação\" onclick="removerTx(' + t.id + ')">🗑️</button></div></div>';
    }).join('');
  });
  el.innerHTML = html;

  const pg = document.getElementById('tx-pagination');
  if (filtered.length > visible.length) { pg.style.display = 'block'; document.getElementById('tx-load-more').textContent = 'Ver mais (' + (filtered.length - visible.length) + ')'; }
  else pg.style.display = 'none';
}
function loadMoreTx() { txPageOffset += txPageSize; renderTransacoes(); }

function renderOrcamento(m) {
  const label = document.getElementById('orcamento-mes-label');
  if (label) label.textContent = getMesLabel(mesAtual);
  const list = document.getElementById('orcamento-list');
  if (!list) return;
  const cats = Object.keys(orcamentos);
  const badge = document.getElementById('orcamento-count-badge');
  if (badge) badge.textContent = cats.length + ' categorias';

  list.innerHTML = cats.length === 0 ? '<div class="tx-empty" style="padding:20px;"><div>📊</div><p>Nenhum limite configurado ainda.</p></div>' :
    cats.map(cat => {
      const lim = orcamentos[cat], gasto = m.porCategoria[cat] || 0;
      const pct = Math.min(100, Math.round(gasto/lim*100));
      return '<div class="budget-row"><div class="budget-header"><span class="budget-label">'+(CATEGORIAS_ICON[cat]||'📦')+' '+(CATEGORIAS_LABEL[cat]||cat)+'</span><div style="display:flex;align-items:center;gap:8px;"><span class="budget-values">'+fmt(gasto)+' / '+fmt(lim)+' ('+pct+'%)</span><button class="btn btn-sm btn-danger" onclick="removerOrcamento(\''+cat+'\')" style="padding:3px 8px;">✕</button></div></div><div class="budget-bar"><div class="budget-fill '+(pct>=100?'danger':pct>=80?'warning':'')+'" style="width:'+pct+'%"></div></div></div>';
    }).join('');
}

function renderRetrospectiva() {
  const el = document.getElementById('retro-list');
  if (!el) return;
  const meses = getMesesDisponiveis();
  const limit = PLANO.PREMIUM_HISTORICO_MESES;
  const todos = meses.slice().reverse();
  const livres = todos.slice(0, limit);
  const bloqueados = todos.slice(limit);

  let html = livres.map(mes => {
    const m = doMes(mes);
    const cls = m.saldo >= 0 ? 'positivo' : 'negativo';
    return '<div class="retro-month-card" onclick="verDetalheMes(\''+mes+'\')"><h4>'+getMesLabel(mes)+'</h4><div>Receitas: <strong>'+fmt(m.receitas)+'</strong></div><div>Despesas: <strong>'+fmt(m.despesas)+'</strong></div><div class="retro-saldo '+cls+'">'+(m.saldo>=0?'+':'')+fmt(m.saldo)+'</div></div>';
  }).join('');
    el.innerHTML = html || '<p style="text-align:center;color:var(--text-muted);padding:20px;">Nenhum dado disponível ainda.</p>';
}

// ── P2.10 — Narrativa automática de comparação entre meses ──────
function gerarNarrativaMensal() {
  const meses = getMesesDisponiveis().slice().reverse(); // mais recente primeiro
  if (meses.length < 2) return null;

  const mesAtual = meses[0];
  const mAtual   = doMes(mesAtual);

  // Média dos últimos 3 meses (excluindo o atual)
  const mesesRef = meses.slice(1, 4);
  if (mesesRef.length === 0) return null;

  const mediaCats = {};
  mesesRef.forEach(mes => {
    const m = doMes(mes);
    Object.entries(m.porCategoria).forEach(([cat, val]) => {
      mediaCats[cat] = (mediaCats[cat] || 0) + val / mesesRef.length;
    });
  });

  // Calcular variações por categoria
  const variacoes = [];
  const todasCats = new Set([
    ...Object.keys(mAtual.porCategoria),
    ...Object.keys(mediaCats)
  ]);

  todasCats.forEach(cat => {
    const atual  = mAtual.porCategoria[cat] || 0;
    const media  = mediaCats[cat] || 0;
    if (media < 10) return; // ignora categorias com média muito baixa
    const diff   = atual - media;
    const pct    = media > 0 ? (diff / media) * 100 : 0;
    if (Math.abs(diff) > 10) variacoes.push({ cat, atual, media, diff, pct });
  });

  variacoes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  // Top 3 maiores variações
  const top = variacoes.slice(0, 5);
  const aumentos  = top.filter(v => v.diff > 0).slice(0, 3);
  const reducoes  = top.filter(v => v.diff < 0).slice(0, 3);

  // Frases narrativas
  const frases = [];

  // Saldo do mês
  const saldoMesAnterior = doMes(meses[1]);
  const diffSaldo = mAtual.saldo - saldoMesAnterior.saldo;
  if (Math.abs(diffSaldo) > 10) {
    const sinal = diffSaldo > 0 ? 'melhor' : 'pior';
    frases.push({
      tipo: diffSaldo > 0 ? 'success' : 'warning',
      icon: diffSaldo > 0 ? '📈' : '📉',
      texto: 'Seu saldo este mês é <strong>' + fmt(Math.abs(diffSaldo)) + ' ' + sinal + '</strong> que no mês anterior.'
    });
  }

  // Categorias com maior aumento
  aumentos.forEach(v => {
    const nome  = (typeof CATEGORIAS_LABEL !== 'undefined' ? CATEGORIAS_LABEL[v.cat] : null) || v.cat;
    const icon  = (typeof CATEGORIAS_ICON  !== 'undefined' ? CATEGORIAS_ICON[v.cat]  : null) || '📦';
    frases.push({
      tipo: 'warning',
      icon: icon,
      texto: 'Você gastou <strong>' + fmt(Math.abs(v.diff)) + ' a mais</strong> em ' + nome +
             ' (' + (v.pct > 0 ? '+' : '') + v.pct.toFixed(0) + '% vs média de ' + mesesRef.length + ' meses).'
    });
  });

  // Categorias com redução
  reducoes.forEach(v => {
    const nome  = (typeof CATEGORIAS_LABEL !== 'undefined' ? CATEGORIAS_LABEL[v.cat] : null) || v.cat;
    const icon  = (typeof CATEGORIAS_ICON  !== 'undefined' ? CATEGORIAS_ICON[v.cat]  : null) || '📦';
    frases.push({
      tipo: 'success',
      icon: icon,
      texto: 'Você economizou <strong>' + fmt(Math.abs(v.diff)) + '</strong> em ' + nome +
             ' (' + v.pct.toFixed(0) + '% vs média de ' + mesesRef.length + ' meses). Ótimo!'
    });
  });

  return { mesLabel: getMesLabel(mesAtual), frases, variacoes };
}

function renderNarrativaMensal() {
  const el = document.getElementById('narrativa-mensal');
  if (!el) return;
  const resultado = gerarNarrativaMensal();
  if (!resultado || resultado.frases.length === 0) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  el.innerHTML =
    '<div class="narrativa-header">📝 Análise de ' + resultado.mesLabel + '</div>' +
    resultado.frases.map(f =>
      '<div class="narrativa-item narrativa-' + f.tipo + '">' +
      '<span class="narrativa-icon">' + f.icon + '</span>' +
      '<span class="narrativa-texto">' + f.texto + '</span></div>'
    ).join('');
}

function verDetalheMes(mes) {
  const m = doMes(mes);
  const detalhe = document.getElementById('retro-detalhe');
  document.getElementById('retro-detalhe-titulo').textContent = '📅 ' + getMesLabel(mes);
  const cats = Object.entries(m.porCategoria).sort((a,b) => b[1]-a[1]);
  document.getElementById('retro-detalhe-content').innerHTML =
    '<div class="summary-grid" style="margin-bottom:16px;"><div class="summary-card receita"><div class="summary-label">Receitas</div><div class="summary-value">'+fmt(m.receitas)+'</div></div><div class="summary-card despesa"><div class="summary-label">Despesas</div><div class="summary-value">'+fmt(m.despesas)+'</div></div><div class="summary-card '+(m.saldo>=0?'positivo':'negativo')+'"><div class="summary-label">Saldo</div><div class="summary-value">'+fmt(m.saldo)+'</div></div></div>' +
    (cats.length > 0 ? '<div style="font-weight:700;margin-bottom:8px;font-size:.85rem;color:var(--text-secondary);">GASTOS POR CATEGORIA</div>' + cats.map(([c,v]) => '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-light);"><span>'+(CATEGORIAS_ICON[c]||'📦')+' '+(CATEGORIAS_LABEL[c]||c)+'</span><strong>'+fmt(v)+'</strong></div>').join('') : '<p style="color:var(--text-muted);">Nenhum gasto neste mês.</p>');
  detalhe.classList.remove('hidden');
  detalhe.scrollIntoView({ behavior:'smooth', block:'start' });
}

function renderConfig() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('cfg-nome', config.nome);
  set('cfg-renda', config.renda);
  set('cfg-meta-poupanca', config.metaPoupanca || 20);
  set('cfg-meta-gastos', config.metaGastos || 80);
  const plano = document.getElementById('cfg-plano-nome');
  if (plano) plano.textContent = 'Plano Gratuito — acesso completo ✓';
  const txc = document.getElementById('cfg-tx-count');
  if (txc) txc.textContent = transacoes.length;
}

// ════════════════════════════════════
// MÓDULO 8: EVENTOS
// ════════════════════════════════════
let _tipoAtual = 'receita';

// setTipo, adicionarTransacao, editarTx e limparForm definidas em init.js (versão completa com cartão/parcelas)

function removerTx(id) {
  fpConfirm('Remover esta transação?', function() {
    transacoes = transacoes.filter(t => t.id !== id);
    salvarTransacoes();
    txPageOffset = 0;
    renderTudo();
    mostrarToast('🗑️ Transação removida');
  }, '🗑️');
}

function switchTab(ev, tab) {
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.remove('active');
    p.setAttribute('aria-hidden', 'true');
  });
  document.querySelectorAll('[role="tab"]').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
    b.setAttribute('tabindex', '-1');
  });
  const panel = document.getElementById('tab-' + tab);
  if (panel) {
    panel.classList.add('active');
    panel.setAttribute('aria-hidden', 'false');
    if (!panel.getAttribute('role')) panel.setAttribute('role', 'tabpanel');
  }
  // Ativar todas as tabs que apontam para este painel (desktop + mobile)
  document.querySelectorAll('[data-tab="' + tab + '"]').forEach(b => {
    b.classList.add('active');
    b.setAttribute('aria-selected', 'true');
    b.setAttribute('tabindex', '0');
    b.setAttribute('aria-controls', 'tab-' + tab);
  });
  txPageOffset = 0;
  if (tab === 'transacoes') renderTransacoes();
  // track daily dashboard visit for missions
  if (tab === 'dashboard') { if (typeof renderDicaDia === 'function') renderDicaDia(); }
  if (tab === 'dashboard' || tab === 'transacoes' || tab === 'orcamento') {
    const today = new Date().toISOString().slice(0, 10);
    if (config.visitedDash !== today) {
      config.visitedDash = today;
      _persistConfig();
      renderMissions();
    }
  }
  // refresh missions/level when conquistas tab opened
  if (tab === 'conquistas') { renderLevel(); renderMissions(); }
  if (tab === 'evolucao') { renderGraficos(); renderGraficoCashflow(); }
  if (tab === 'orcamento') { if (typeof render5030 === 'function') render5030(); renderNarrativaMensal(); }
  if (tab === 'cartoes') { renderCartoes(); }
  if (tab === 'calendario') { if (typeof renderCalendario === 'function') renderCalendario(); }
  if (tab === 'dividas') { if (typeof renderDividas === 'function') renderDividas(); }
  if (tab === 'investimentos') { if (typeof renderInvestimentos === 'function') renderInvestimentos(); }
  if (tab === 'trilha') { if (typeof renderTrilha === 'function') renderTrilha(); }
  if (tab === 'desafios') { if (typeof renderDesafios === 'function') renderDesafios(); }
  if (tab === 'temas') { if (typeof renderTemas === 'function') renderTemas(); }
  if (tab === 'calculadoras') { if (typeof renderCalculadoras === 'function') renderCalculadoras(); }
  if (tab === 'moedas') { if (typeof renderMoedas === 'function') renderMoedas(); }
  if (tab === 'glossario') { if (typeof renderGlossario === 'function') renderGlossario(); }
  if (tab === 'recorrentes') { if (typeof renderRecorrentes === 'function') renderRecorrentes(); }
  if (tab === 'metas') { if (typeof renderMetasAvancadas === 'function') renderMetasAvancadas(); }
  if (tab === 'insights') { if (typeof renderInsights === 'function') renderInsights(); }
  if (tab === 'relatorio-mm') { if (typeof renderRelatorioMultimes === 'function') renderRelatorioMultimes(); }
  if (tab === 'irpf') { if (typeof renderIRPF === 'function') renderIRPF(); }
  if (tab === 'open-finance') { if (typeof renderOpenFinance === 'function') renderOpenFinance(); }
  if (tab === 'configuracoes') {
    if (typeof renderCatsCustom === 'function') renderCatsCustom();
    if (typeof renderCorPicker === 'function') {} // modal only
  }
}

function switchTabLocked(ev, tab) { switchTab(ev, tab); }

function setFiltro(tipo) {
  filtroTipo = tipo;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  const idx = ['todos','receita','despesa'].indexOf(tipo);
  const btns = document.querySelectorAll('.filter-btn');
  if (btns[idx]) btns[idx].classList.add('active');
  txPageOffset = 0;
  renderTransacoes();
}

function mudarMes(delta) {
  const [ano, mes] = mesAtual.split('-').map(Number);
  const d = new Date(ano, mes - 1 + delta, 1);
  mesAtual = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  renderTudo();
}

function atualizarStreak() {
  const hoje = new Date().toISOString().slice(0, 10);
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (config.lastEntry === hoje) return;
  if (config.lastEntry === ontem) { config.streak = (config.streak || 0) + 1; }
  else { config.streak = 1; }
  config.lastEntry = hoje;
  _persistConfig();

  if (config.streak === 3) showToast('🔥 3 dias! Hábito começando a se formar!', 'success');
  if (config.streak === 7) { showToast('🔥 7 dias de sequência! Você é dedicado!', 'achievement'); lancarConfete(30); }
  if (config.streak === 14) showToast('🔥 2 semanas de sequência! Impressionante!', 'achievement');
  if (config.streak === 30) { showToast('🏅 30 dias! Hábito consolidado! Parabéns!', 'achievement'); lancarConfete(60); }
}

function salvarOrcamento() {

  const cat = document.getElementById('orc-categoria').value;
  const lim = parseFloat(document.getElementById('orc-limite').value);
  if (!cat) { showToast('Selecione uma categoria', 'danger'); return; }
  if (!lim || lim <= 0) { showToast('Insira um limite válido', 'danger'); return; }
  orcamentos[cat] = lim;
  salvarOrcamentos();
  document.getElementById('orc-categoria').value = '';
  document.getElementById('orc-limite').value = '';
  showToast('Orçamento salvo para ' + (CATEGORIAS_LABEL[cat] || cat), 'success');
  renderTudo();
  checkAchievements();
}

function removerOrcamento(cat) {
  delete orcamentos[cat];
  salvarOrcamentos();
  renderTudo();
  showToast('Orçamento removido', 'warning');
}

function salvarCfg() {
  config.nome = document.getElementById('cfg-nome').value.trim() || config.nome;
  config.renda = parseFloat(document.getElementById('cfg-renda').value) || 0;
  config.metaPoupanca = parseFloat(document.getElementById('cfg-meta-poupanca').value) || 20;
  config.metaGastos = parseFloat(document.getElementById('cfg-meta-gastos').value) || 80;
  _persistConfig();
  mostrarToast('✅ Configurações salvas!', 'success');
  renderTudo();
}

function finalizarOnboarding() {
  var nomeEl  = document.getElementById('ob-nome-static') || document.getElementById('ob-nome');
  var rendaEl = document.getElementById('ob-renda-static') || document.getElementById('ob-renda');
  config.nome = (nomeEl ? nomeEl.value.trim() : '') || 'Usuário';
  config.renda = parseFloat(rendaEl ? rendaEl.value : 0) || 0;
  config.metaPoupanca = parseFloat((document.getElementById('ob-meta-poupanca') || {}).value) || 20;
  config.metaGastos   = parseFloat((document.getElementById('ob-meta-gastos')   || {}).value) || 80;
  config.onboarded = true;
  _persistConfig();
  var om = document.getElementById('onboarding-overlay');
  if (om) om.classList.add('hidden');
  mostrarToast('Bem-vindo ao FinançasPro, ' + config.nome + '!');
  renderTudo();
}

function pularOnboarding() {
  config.onboarded = true;
  _persistConfig();
  var om = document.getElementById('onboarding-overlay');
  if (om) om.classList.add('hidden');
  renderTudo();
}

// ── Export / Import ──
// ════════════════════════════════════
// METAS FINANCEIRAS
// ════════════════════════════════════
function toggleMetaForm() {
  const el = document.getElementById('meta-form-wrap');
  if (!el) return;
  const open = el.style.display === 'none' || el.style.display === '';
  el.style.display = open ? '' : 'none';
  if (open) {
    // Preset prazo para daqui 6 meses
    const d = new Date(); d.setMonth(d.getMonth() + 6);
    const prazoEl = document.getElementById('meta-prazo');
    if (prazoEl && !prazoEl.value) prazoEl.value = d.toISOString().slice(0,7);
    const iconEl = document.getElementById('meta-icon');
    if (iconEl && !iconEl.value) iconEl.value = '🎯';
    setTimeout(() => { const n = document.getElementById('meta-nome'); if (n) n.focus(); }, 100);
  }
}

function salvarMeta() {
  const nome = (document.getElementById('meta-nome')||{}).value||'';
  const icon = (document.getElementById('meta-icon')||{}).value||'🎯';
  const alvo = parseFloat((document.getElementById('meta-alvo')||{}).value||'0');
  const atual = parseFloat((document.getElementById('meta-atual')||{}).value||'0');
  const prazo = (document.getElementById('meta-prazo')||{}).value||'';
  if (!nome.trim()) { mostrarToast('⚠️ Informe o nome da meta'); return; }
  if (alvo <= 0) { mostrarToast('⚠️ Informe um valor maior que zero'); return; }
  if (!config.metas) config.metas = [];
  config.metas.push({ id: gerarId(), nome: nome.trim(), icon: icon||'🎯', valorAlvo: alvo, valorAtual: Math.min(atual, alvo), prazo });
  salvarDados();
  // Limpar form
  ['meta-nome','meta-icon','meta-alvo','meta-atual','meta-prazo'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('meta-form-wrap').style.display = 'none';
  renderMetas();
  mostrarToast('🎯 Meta "' + nome.trim() + '" criada');
}

function atualizarProgressoMeta(id) {
  const meta = (config.metas||[]).find(m => m.id === id);
  if (!meta) return;
  fpPrompt('Valor atual economizado para "' + meta.nome + '":', meta.valorAtual.toFixed(2), function(val) {
    const novoVal = parseFloat(val);
    if (isNaN(novoVal) || novoVal < 0) return;
    meta.valorAtual = Math.min(novoVal, meta.valorAlvo);
    salvarDados();
    renderMetas();
    if (meta.valorAtual >= meta.valorAlvo) {
      mostrarToast('🎉 Meta "' + meta.nome + '" concluída!');
    } else {
      mostrarToast('✅ Progresso atualizado: ' + fmt(meta.valorAtual) + ' de ' + fmt(meta.valorAlvo));
    }
  }, '🎯', 'number');
}

function deletarMeta(id) {
  fpConfirm('Remover esta meta?', function() {
    config.metas = (config.metas||[]).filter(m => m.id !== id);
    salvarDados();
    renderMetas();
    mostrarToast('🗑️ Meta removida');
  }, '🗑️');
}

function renderMetas() {
  const el = document.getElementById('metas-lista');
  if (!el) return;
  const metas = config.metas || [];
  if (metas.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:.85rem;">🎯 Nenhuma meta criada.<br>Defina um objetivo e acompanhe seu progresso.</div>';
    return;
  }
  el.innerHTML = metas.map(m => {
    const pct = m.valorAlvo > 0 ? Math.min(100, Math.round(m.valorAtual / m.valorAlvo * 100)) : 0;
    const restante = m.valorAlvo - m.valorAtual;
    const barColor = pct >= 100 ? '#16a34a' : pct >= 60 ? '#22c55e' : pct >= 30 ? '#f59e0b' : '#94a3b8';
    const prazoLabel = m.prazo ? (() => { const d = new Date(m.prazo + '-01'); return d.toLocaleDateString('pt-BR',{month:'short',year:'numeric'}); })() : '';
    // Calcular meses restantes e quanto poupar por mes
    let dicaPoupanca = '';
    if (m.prazo && restante > 0) {
      const hoje = new Date(); const alvoDate = new Date(m.prazo + '-01');
      const mesesRestantes = Math.max(1, (alvoDate.getFullYear()-hoje.getFullYear())*12 + (alvoDate.getMonth()-hoje.getMonth()));
      const porMes = restante / mesesRestantes;
      dicaPoupanca = ' — poupar ' + fmt(porMes) + '/mês';
    }
    return '<div class="meta-item">' +
      '<div class="meta-icon">' + (m.icon||'🎯') + '</div>' +
      '<div class="meta-body">' +
        '<div class="meta-nome">' + escHtml(m.nome) + '</div>' +
        '<div class="meta-prazo">' + (prazoLabel ? 'Até ' + prazoLabel + dicaPoupanca : dicaPoupanca||'Sem prazo') + '</div>' +
        '<div class="meta-bar-wrap"><div class="meta-bar-fill" style="width:' + pct + '%;background:' + barColor + ';"></div></div>' +
      '</div>' +
      '<div class="meta-valores">' +
        '<div class="meta-atual">' + fmt(m.valorAtual) + '</div>' +
        '<div class="meta-alvo">de ' + fmt(m.valorAlvo) + '</div>' +
        '<div class="meta-pct" style="color:' + barColor + ';">' + pct + '%</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:4px;margin-left:6px;">' +
        '<button onclick="atualizarProgressoMeta(\'' + m.id + '\')" title="Atualizar progresso" style="background:var(--primary);color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:.7rem;cursor:pointer;">+;Valor</button>' +
        '<button onclick="deletarMeta(\'' + m.id + '\')" title="Remover" style="background:none;border:1px solid #fca5a5;color:#ef4444;border-radius:6px;padding:4px 8px;font-size:.7rem;cursor:pointer;">X</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function gerarRelatorioMensal() {
  const m = doMes();
  const hoje = new Date();
  const nomeMes = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const txMes = transacoes.filter(t => t.data && t.data.startsWith(mesAtual));
  const despMes = txMes.filter(t => t.tipo === 'despesa').sort((a,b) => b.valor - a.valor);
  const recMes = txMes.filter(t => t.tipo === 'receita');

  // Gastos por categoria
  const catTotais = {};
  despMes.forEach(t => { catTotais[t.categoria] = (catTotais[t.categoria]||0) + t.valor; });
  const catSorted = Object.entries(catTotais).sort((a,b) => b[1]-a[1]);
  const maxCat = catSorted.length ? catSorted[0][1] : 1;

  // Orcamentos
  const orcRows = Object.entries(orcamentos).map(([cat, limite]) => {
    const gasto = catTotais[cat] || 0;
    const pct = Math.min(Math.round(gasto/limite*100), 100);
    const cor = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';
    return { cat, limite, gasto, pct, cor };
  });

  const taxa = m.receitas > 0 ? (m.saldo/m.receitas*100).toFixed(1) : '0';
  const saldoColor = m.saldo >= 0 ? '#16a34a' : '#ef4444';

  const html = `<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'>
<title>Relatório ${nomeMes} - FinançasPro</title>
<style>
  * { margin:0;padding:0;box-sizing:border-box; }
  body { font-family:Inter,system-ui,sans-serif;color:#1e293b;padding:32px;max-width:700px;margin:0 auto; }
  .header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #16a34a; }
  .logo { font-size:1.4rem;font-weight:800;color:#16a34a; }
  .periodo { font-size:.85rem;color:#64748b;margin-top:4px; }
  .kpis { display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px; }
  .kpi { background:#f8fafc;border-radius:10px;padding:14px 16px;border:1px solid #e2e8f0; }
  .kpi-label { font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:4px; }
  .kpi-valor { font-size:1.3rem;font-weight:800; }
  .kpi-sub { font-size:.72rem;color:#94a3b8;margin-top:2px; }
  h3 { font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin:20px 0 10px; }
  .cat-row { display:flex;align-items:center;gap:10px;margin-bottom:7px; }
  .cat-nome { width:120px;font-size:.82rem;font-weight:500;flex-shrink:0; }
  .cat-bar-wrap { flex:1;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden; }
  .cat-bar { height:100%;border-radius:4px;background:#16a34a; }
  .cat-val { width:80px;text-align:right;font-size:.82rem;font-weight:700;flex-shrink:0; }
  .orc-row { display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:.82rem; }
  .tx-row { display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f8fafc;font-size:.8rem; }
  .footer { margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:.7rem;color:#94a3b8;display:flex;justify-content:space-between; }
  @media print { body { padding:16px; } button { display:none; } }
</head><body>
<div class='header'>
  <div><div class='logo'>💰 FinançasPro</div><div class='periodo'>Relatório de ${nomeMes}</div></div>
  <button onclick='window.print()' style='background:#16a34a;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:.82rem;font-weight:600;cursor:pointer;'>Imprimir / Salvar PDF</button>
</div>
<div class='kpis'>
  <div class='kpi'><div class='kpi-label'>Receitas</div><div class='kpi-valor' style='color:#16a34a;'>${fmt(m.receitas)}</div><div class='kpi-sub'>${recMes.length} lançamentos</div></div>
  <div class='kpi'><div class='kpi-label'>Despesas</div><div class='kpi-valor' style='color:#ef4444;'>${fmt(m.despesas)}</div><div class='kpi-sub'>${despMes.length} lançamentos</div></div>
  <div class='kpi'><div class='kpi-label'>Saldo</div><div class='kpi-valor' style='color:${saldoColor};'>${fmt(m.saldo)}</div><div class='kpi-sub'>Taxa de poupança: ${taxa}%</div></div>
</div>
${catSorted.length ? `<h3>Gastos por Categoria</h3>` + catSorted.map(([cat,val]) => `<div class='cat-row'><div class='cat-nome'>${getCatNome(cat)}</div><div class='cat-bar-wrap'><div class='cat-bar' style='width:${Math.round(val/maxCat*100)}%;'></div></div><div class='cat-val'>${fmt(val)}</div></div>`).join('') : ''}
${orcRows.length ? `<h3>Orçamentos</h3>` + orcRows.map(r => `<div class='orc-row'><div style='flex:1;'>${getCatNome(r.cat)}</div><div style='width:120px;font-size:.7rem;color:#64748b;text-align:right;'>${fmt(r.gasto)} de ${fmt(r.limite)}</div><div style='width:48px;text-align:right;font-weight:700;color:${r.cor};'>${r.pct}%</div></div>`).join('') : ''}
${despMes.length ? `<h3>Maiores Despesas</h3>` + despMes.slice(0,12).map(t => `<div class='tx-row'><span>${t.data.slice(8)} ${t.descricao.slice(0,38)}</span><span style='font-weight:600;color:#ef4444;'>-${fmt(t.valor)}</span></div>`).join('') : ''}
<div class='footer'><span>FinançasPro v${APP_VERSION}</span><span>Gerado em ${new Date().toLocaleDateString('pt-BR')}</span></div>
</body></html>`;

  const w = window.open('', '_blank', 'width=750,height=900');
  if (w) { w.document.write(html); w.document.close(); }
  else { mostrarToast('⚠️ Permita pop-ups para gerar o relatório'); }
}

function exportarCSV() {
  const header = 'Data,Tipo,Descrição,Valor,Categoria,Tag\n';
  const rows = transacoes.map(t => [t.data, t.tipo, '"' + (t.descricao||'').replace(/"/g,'""') + '"', t.valor.toFixed(2), t.categoria||'', t.tag||''].join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + header + rows], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'financas_pro_' + mesAtual + '.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exportado!', 'success');
}

function exportarJSON() {
  const data = { versao: APP_VERSION, exportadoEm: new Date().toISOString(), transacoes, orcamentos, contas, cartoes };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'financas_backup_' + new Date().toISOString().slice(0,10) + '.json'; a.click();
  URL.revokeObjectURL(url);
  showToast('Backup JSON exportado!', 'success');
}

function importarJSON(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.transacoes || !Array.isArray(data.transacoes)) { showToast('Arquivo inválido', 'danger'); return; }
      fpConfirm('Importar ' + data.transacoes.length + ' transações? Duplicatas serão ignoradas.', function() {
        const ids = new Set(transacoes.map(t => t.id));
        const novas = data.transacoes.filter(t => !ids.has(t.id));
        transacoes = [...transacoes, ...novas];
        if (data.orcamentos) orcamentos = { ...orcamentos, ...data.orcamentos };
        if (data.contas  && Array.isArray(data.contas))  contas  = data.contas;
        if (data.cartoes && Array.isArray(data.cartoes)) cartoes = data.cartoes;
        salvarTransacoes(); salvarOrcamentos();
        renderTudo();
        mostrarToast('✅ ' + novas.length + ' transações importadas!');
      }, '📥');
    } catch(err) { showToast('Erro ao importar arquivo', 'danger'); }
  };
  reader.readAsText(file);
}

function resetarDados() {
  // P1.5 — Auto-backup JSON antes de apagar qualquer coisa
  fpConfirm('Apagar TODOS os dados? Um backup automático será salvo antes.', function() {
    // Gerar backup automático
    try {
      const backup = {
        transacoes, config, orcamentos,
        contas: contas || [], cartoes: cartoes || [],
        exportadoEm: new Date().toISOString(), versao: '10.8'
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = 'financas_backup_pre_reset_' + new Date().toISOString().slice(0,10) + '.json';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch(e) { console.warn('[Reset] Falha ao gerar backup:', e); }

    // Confirmação digitada — P1.5
    const confirmado = window.prompt('Para confirmar, digite EXCLUIR (em maiúsculas):');
    if (confirmado !== 'EXCLUIR') {
      mostrarToast('⚠️ Reset cancelado — texto incorreto.', 'warning');
      return;
    }
    ['fp_transacoes','fp_config','fp_orcamentos','fp_contas','fp_cartoes'].forEach(k => localStorage.removeItem(k));
    location.reload();
  }, '⚠️');
}

// ── Simulador ──
function calcularSimulacao() {
  const capital = parseFloat(document.getElementById('sim-capital').value) || 0;
  const aporte = parseFloat(document.getElementById('sim-aporte').value) || 0;
  const taxa = parseFloat(document.getElementById('sim-taxa').value) / 100 || 0;
  const meses = parseInt(document.getElementById('sim-meses').value) || 12;
  if (meses < 1 || meses > 360) { showToast('Período entre 1 e 360 meses', 'danger'); return; }

  let total = capital, investido = capital;
  const tabela = [];
  for (let i = 1; i <= meses; i++) {
    total = total * (1 + taxa) + aporte;
    investido += aporte;
    if (i % Math.max(1, Math.floor(meses/12)) === 0 || i === meses) {
      tabela.push({ mes: i, total, investido, rendimento: total - investido });
    }
  }

  document.getElementById('sim-total').textContent = fmt(total);
  document.getElementById('sim-rendimento').textContent = fmt(total - investido);
  document.getElementById('sim-investido').textContent = fmt(investido);
  document.getElementById('sim-retorno').textContent = investido > 0 ? ((total-investido)/investido*100).toFixed(1) + '%' : '0%';
  document.getElementById('sim-result').style.display = 'block';

  // Tabela detalhada — disponivel durante trial
  const premiumCta = document.getElementById('sim-premium-cta');
  const tabelaWrap = document.getElementById('sim-tabela-wrap');
  if (premiumCta) premiumCta.style.display = 'none';
  if (tabelaWrap) tabelaWrap.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:.8rem;"><thead><tr style="background:var(--primary-light);color:var(--primary);"><th style="padding:8px;text-align:left;">Mês</th><th style="padding:8px;text-align:right;">Total</th><th style="padding:8px;text-align:right;">Investido</th><th style="padding:8px;text-align:right;">Rendimento</th></tr></thead><tbody>' +
        tabela.map((r,i) => '<tr style="background:'+(i%2===0?'var(--surface2)':'var(--surface)')+';"><td style="padding:6px 8px;">'+r.mes+'</td><td style="padding:6px 8px;text-align:right;font-weight:600;">'+fmt(r.total)+'</td><td style="padding:6px 8px;text-align:right;">'+fmt(r.investido)+'</td><td style="padding:6px 8px;text-align:right;color:var(--success);">+'+fmt(r.rendimento)+'</td></tr>').join('') + '</tbody></table>';
}

// ── Toast ──
function showToast(msg, tipo) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success:'✅', danger:'❌', warning:'⚠️', achievement:'🏆', urgent:'🚨', info:'ℹ️' };
  const t = document.createElement('div');
  t.className = 'toast ' + (tipo || 'info');
  t.setAttribute('role', 'alert');
  t.setAttribute('aria-live', 'polite');
  t.innerHTML = '<span class="toast-icon">' + (icons[tipo] || 'ℹ️') + '</span><span>' + msg + '</span>';
  container.appendChild(t);
  setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 350); }, 3800);
}

// ── Confete ──
function lancarConfete(qtd) {
  const colors = ['#16a34a','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899'];
  for (let i = 0; i < qtd; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = 'left:'+(10+Math.random()*80)+'vw;top:-20px;background:'+colors[Math.floor(Math.random()*colors.length)]+';width:'+(6+Math.random()*8)+'px;height:'+(6+Math.random()*8)+'px;animation-duration:'+(1.5+Math.random()*2)+'s;animation-delay:'+(Math.random()*0.5)+'s;';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
}

// ════════════════════════════════════
// INIT
// ════════════════════════════════════
function init() {
  initSupabase();
  checkTrial();
  if (isTrialExpired()) return;
  carregarConfig();
  carregarTransacoes();
  carregarOrcamentos();
  carregarContasCartoes(); // ← deve vir antes de renderTudo() e setTipo()

  const hoje = new Date();
  mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
  const dataEl = document.getElementById('tx-data');
  if (dataEl) dataEl.value = hoje.toISOString().slice(0, 10);

  setTipo('despesa'); // padrão: despesa (mais comum); selects já têm contas/cartões
  initDailyGoal();
  processarRecorrencias();
  renderTudo();
  // Nota: syncUserData() removido — auth.js gerencia via onAuthStateChange

  console.log('[FinançasPro v' + APP_VERSION + '] Iniciado. Modo: 100% Gratuito.');
  initDropzone();
  atualizarSelectCategorias();
  atualizarSelectContas();
  atualizarSelectCartoes();

  // Enter key para submeter lançamento rápido
  ['tx-desc', 'tx-valor', 'tx-data'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); adicionarTransacao(); }
    });
  });

  // Enter nos campos do simulador
  ['sim-capital','sim-aporte','sim-taxa','sim-meses'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); calcularSimulacao(); }
    });
  });

  // Auto-focus na descricao ao iniciar
  setTimeout(function() {
    const d = document.getElementById('tx-desc');
    if (d) d.focus();
  }, 600);

  // Onboarding para usuarios novos
  if (!config.onboarded) {
    setTimeout(iniciarOnboarding, 700);
  } else {
    checkRetentionNotice();
  }
}

// ════════════════════════════════════
