// FinançasPro — Contas, Cartões, Patrimônio
// Depende de: config.js, dados.js, utils.js

// MÓDULO A: CONTAS E CARTÕES
// ════════════════════════════════════

const CONTA_TIPOS = { corrente:'Corrente', poupanca:'Poupança', investimento:'Investimento', digital:'Digital', carteira:'Carteira' };


// ── CONTAS ──────────────────────────
function salvarConta() {
  const nome = document.getElementById('mconta-nome').value.trim();
  const tipo = document.getElementById('mconta-tipo').value;
  const saldo = parseFloat(document.getElementById('mconta-saldo').value) || 0;
  const icon = document.getElementById('mconta-icon').value;
  if (!nome) { mostrarToast('⚠️ Informe o nome da conta'); return; }
  const id = document.getElementById('modal-conta-id').value;
  if (id) {
    const c = contas.find(c => c.id === id);
    if (c) { c.nome = nome; c.tipo = tipo; c.saldo = saldo; c.icon = icon; }
  } else {
    contas.push({ id: gerarId(), nome, tipo, saldo, icon });
  }
  salvarDados();
  fecharModal('modal-conta');
  renderTudo();
}

function abrirModalConta(id) {
  document.getElementById('modal-conta-id').value = '';
  document.getElementById('mconta-nome').value = '';
  document.getElementById('mconta-tipo').value = 'corrente';
  document.getElementById('mconta-saldo').value = '';
  document.getElementById('mconta-icon').value = '\uD83C\uDFE6';
  document.getElementById('modal-conta-titulo').textContent = 'Nova Conta';
  if (id) {
    const c = contas.find(c => c.id === id);
    if (c) {
      document.getElementById('modal-conta-id').value = c.id;
      document.getElementById('mconta-nome').value = c.nome;
      document.getElementById('mconta-tipo').value = c.tipo;
      document.getElementById('mconta-saldo').value = c.saldo;
      document.getElementById('mconta-icon').value = c.icon;
      document.getElementById('modal-conta-titulo').textContent = 'Editar Conta';
    }
  }
  document.getElementById('modal-conta').classList.remove('hidden');
}

function deletarConta(id) {
  fpConfirm('Remover esta conta?', function() {
    contas = contas.filter(c => c.id !== id);
    salvarDados();
    renderTudo();
    mostrarToast('🗑️ Conta removida');
  }, '🗑️');
}

function renderContas() {
  // Config section
  const listEl = document.getElementById('config-contas-list');
  if (listEl) {
    if (contas.length === 0) {
      listEl.innerHTML = '<div style="font-size:.82rem;color:var(--text-muted);grid-column:1/-1;">Nenhuma conta cadastrada.</div>';
    } else {
      listEl.innerHTML = contas.map(c => `
        <div class="config-conta-item">
          <div class="config-conta-icon">${c.icon}</div>
          <div class="config-conta-info">
            <div class="config-conta-nome">${c.nome}</div>
            <div class="config-conta-saldo">${fmt(c.saldo)}</div>
          </div>
          <button onclick="ajustarSaldo('${c.id}')" title="Ajustar saldo" style="background:none;border:1px solid var(--primary);color:var(--primary);border-radius:6px;padding:3px 8px;font-size:.72rem;font-weight:600;cursor:pointer;margin-right:4px;">Ajustar</button>
          <button class="config-conta-del" onclick="deletarConta('${c.id}')">✕</button>
        </div>`).join('');
    }
  }
  // Evolução patrimônio tab
  const evEl = document.getElementById('contas-resumo-evolucao');
  if (evEl) {
    evEl.innerHTML = contas.map(c => `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;">
        <div>${c.icon} <strong>${c.nome}</strong> <span style="font-size:.75rem;color:var(--text-muted);">${CONTA_TIPOS[c.tipo]||c.tipo}</span></div>
        <div style="font-weight:600;color:var(--primary-dark);">${fmt(c.saldo)}</div>
      </div>`).join('') || '<div style="color:var(--text-muted);font-size:.85rem;">Nenhuma conta cadastrada.</div>';
  }
}

function ajustarSaldo(contaId) {
  const conta = contas.find(c => c.id === contaId);
  if (!conta) return;
  fpPrompt('Saldo real em "' + conta.nome + '" conforme extrato:', conta.saldo.toFixed(2), function(val) {
    const novoSaldo = parseFloat(val);
    if (isNaN(novoSaldo)) return;
    const diff = novoSaldo - conta.saldo;
    if (Math.abs(diff) < 0.01) { mostrarToast('✅ Saldo já está correto'); return; }
    transacoes.push({ id: gerarId(), descricao: 'Ajuste de saldo — ' + conta.nome,
      valor: Math.abs(diff), tipo: diff > 0 ? 'receita' : 'despesa',
      categoria: 'outros', data: new Date().toISOString().slice(0,10),
      recorrencia: 'unica', conta_id: contaId, tag: 'ajuste', nota: 'Reconciliacao manual' });
    conta.saldo = novoSaldo;
    salvarDados();
    renderTudo();
    mostrarToast('✅ Saldo de "' + conta.nome + '" ajustado para ' + fmt(novoSaldo));
  }, '💰', 'number');
}

function getSaldoContas() {
  return contas.reduce((s, c) => s + (c.saldo || 0), 0);
}

// ── CARTÕES ──────────────────────────
function salvarCartao() {
  const nome = document.getElementById('mc-nome').value.trim();
  const bandeira = document.getElementById('mc-bandeira').value;
  const limite = parseFloat(document.getElementById('mc-limite').value) || 0;
  const fechamento = parseInt(document.getElementById('mc-fechamento').value) || 23;
  const vencimento = parseInt(document.getElementById('mc-vencimento').value) || 3;
  const cor = document.getElementById('mc-cor').value;
  if (!nome) { mostrarToast('⚠️ Informe o nome do cartão'); return; }
  const id = document.getElementById('modal-cartao-id').value;
  if (id) {
    const c = cartoes.find(c => c.id === id);
    if (c) { c.nome = nome; c.bandeira = bandeira; c.limite = limite; c.fechamento = fechamento; c.vencimento = vencimento; c.cor = cor; }
  } else {
    cartoes.push({ id: gerarId(), nome, bandeira, limite, fechamento, vencimento, cor });
  }
  salvarDados();
  fecharModal('modal-cartao');
  renderTudo();
}

function abrirModalCartao(id) {
  document.getElementById('modal-cartao-id').value = '';
  document.getElementById('mc-nome').value = '';
  document.getElementById('mc-bandeira').value = 'Visa';
  document.getElementById('mc-limite').value = '';
  document.getElementById('mc-fechamento').value = '23';
  document.getElementById('mc-vencimento').value = '3';
  document.getElementById('mc-cor').value = '#1e293b';
  document.getElementById('modal-cartao-titulo').textContent = 'Novo Cartão';
  if (id) {
    const c = cartoes.find(c => c.id === id);
    if (c) {
      document.getElementById('modal-cartao-id').value = c.id;
      document.getElementById('mc-nome').value = c.nome;
      document.getElementById('mc-bandeira').value = c.bandeira;
      document.getElementById('mc-limite').value = c.limite;
      document.getElementById('mc-fechamento').value = c.fechamento;
      document.getElementById('mc-vencimento').value = c.vencimento;
      document.getElementById('mc-cor').value = c.cor || '#1e293b';
      document.getElementById('modal-cartao-titulo').textContent = 'Editar Cartão';
    }
  }
  document.getElementById('modal-cartao').classList.remove('hidden');
}

function fecharModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function deletarCartao(id) {
  fpConfirm('Remover este cartão?', function() {
    cartoes = cartoes.filter(c => c.id !== id);
    salvarDados();
    renderTudo();
    mostrarToast('🗑️ Cartão removido');
  }, '🗑️');
}


function getParcelasCartao(cartaoId) {
  return transacoes.filter(t => t.cartao_id === cartaoId && t.parcelas && t.parcela_atual && t.parcela_atual < t.parcelas);
}

function renderParcelamentosGlobal() {
  const el = document.getElementById('parcelas-global-lista');
  const totalEl = document.getElementById('parcelas-total-label');
  if (!el) return;
  // Buscar todas parcelas em aberto (parcela_atual < parcelas)
  const todas = transacoes.filter(t => t.parcelas && t.parcela_atual && t.parcela_atual < t.parcelas && t.tipo === 'despesa');
  if (todas.length === 0) {
    el.innerHTML = '<div style="font-size:.82rem;color:var(--text-muted);padding:12px 0;text-align:center;">Nenhum parcelamento em aberto. 🎉</div>';
    if (totalEl) totalEl.textContent = '';
    return;
  }
  // Agrupar por cartao
  const grupos = {};
  todas.forEach(t => {
    const cId = t.cartao_id || 'sem_cartao';
    if (!grupos[cId]) grupos[cId] = [];
    grupos[cId].push(t);
  });
  let totalRestante = 0;
  let html = '';
  Object.entries(grupos).forEach(([cId, txs]) => {
    const cartao = cartoes.find(c => c.id === cId);
    const nomeCartao = cartao ? cartao.nome : 'Sem cartão';
    html += '<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);padding:8px 0 4px;">' + nomeCartao + '</div>';
    txs.forEach(t => {
      const parcelasRestantes = t.parcelas - t.parcela_atual;
      const totalTx = t.valor * parcelasRestantes;
      totalRestante += totalTx;
      const pctFeito = Math.round((t.parcela_atual / t.parcelas) * 100);
      html += '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f3f4f6;">';
      html += '<div style="flex:1;min-width:0;">';
      html += '<div style="font-size:.82rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + t.descricao + '</div>';
      html += '<div style="display:flex;align-items:center;gap:6px;margin-top:3px;">';
      html += '<div style="font-size:.7rem;color:var(--text-muted);white-space:nowrap;">' + t.parcela_atual + '/' + t.parcelas + 'x de ' + fmt(t.valor) + '</div>';
      html += '<div style="flex:1;height:3px;background:#e5e7eb;border-radius:2px;"><div style="height:100%;width:' + pctFeito + '%;background:var(--primary);border-radius:2px;"></div></div>';
      html += '</div></div>';
      html += '<div style="text-align:right;white-space:nowrap;">';
      html += '<div style="font-size:.82rem;font-weight:700;color:var(--danger);">' + fmt(totalTx) + '</div>';
      html += '<div style="font-size:.68rem;color:var(--text-muted);">' + parcelasRestantes + ' restantes</div>';
      html += '</div></div>';
    });
  });
  el.innerHTML = html;
  if (totalEl) totalEl.textContent = 'Total: ' + fmt(totalRestante);
}

function renderCartoes() {
  const listaEl = document.getElementById('cartoes-lista');
  const configEl = document.getElementById('config-cartoes-list');

  if (listaEl) {
    if (cartoes.length === 0) {
      listaEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:.85rem;">Nenhum cartão cadastrado.<br>Clique em "+ Adicionar" para começar.</div>';
    } else {
      listaEl.innerHTML = cartoes.map(c => {
        const fatura = getFaturaCartao(c.id);
        const pct = c.limite > 0 ? (fatura/c.limite*100) : 0;
        const badgeClass = pct > 80 ? 'cartao-badge-critico' : pct > 50 ? 'cartao-badge-alerta' : 'cartao-badge-ok';
        const badgeText = pct > 80 ? 'Limite alto!' : pct > 50 ? 'Atenção' : 'OK';
        const barColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e';
        const limiteLabel = c.limite > 0 ? fmt(c.limite - fatura) + ' dispon.' : 'Sem limite';
        return `<div class="cartao-item" onclick="exibirDetalheCartao('${c.id}')">
          <div class="cartao-info" style="flex:1;">
            <div class="cartao-item-nome">${c.nome} <span style="font-size:.72rem;color:var(--text-muted);">${c.bandeira}</span></div>
            <div class="cartao-item-detalhe">Fecha dia ${c.fechamento} | Vence dia ${c.vencimento}</div>
            ${c.limite > 0 ? `<div style="margin-top:6px;"><div style="display:flex;justify-content:space-between;font-size:.68rem;color:var(--text-muted);margin-bottom:2px;"><span>${Math.round(pct)}% usado</span><span>${limiteLabel}</span></div><div style="height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${barColor};border-radius:2px;transition:width .4s;"></div></div></div>` : ''}
          </div>
          <div class="cartao-item-fatura">
            <div class="cartao-fatura-valor">${fmt(fatura)}</div>
            <div class="cartao-fatura-label">fatura atual</div>
            <div class="cartao-badge ${badgeClass}" style="margin-top:4px;">${badgeText}</div>
          </div>
        </div>`;
      }).join('');
    }
  }

  if (configEl) {
    configEl.innerHTML = cartoes.map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:.82rem;">
        <span>💳 ${c.nome} (${c.bandeira})</span>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" style="padding:2px 8px;font-size:.75rem;" onclick="abrirModalCartao('${c.id}')">Editar</button>
          <button class="btn btn-danger btn-sm" style="padding:2px 8px;font-size:.75rem;" onclick="deletarCartao('${c.id}')">Remover</button>
        </div>
      </div>`).join('') || '<div style="font-size:.82rem;color:var(--text-muted);">Nenhum cartão cadastrado.</div>';
  }
  renderParcelamentosGlobal();
}

function exibirDetalheCartao(id) {
  const c = cartoes.find(c => c.id === id);
  if (!c) return;
  const fatura = getFaturaCartao(c.id);
  const pct = c.limite > 0 ? Math.min(fatura/c.limite*100, 100) : 0;
  const disponivel = Math.max(c.limite - fatura, 0);
  const cardEl = document.getElementById('cartao-detalhe-card');
  if (cardEl) cardEl.style.display = '';
  const el = id => document.getElementById(id);
  el('cartao-detalhe-titulo').textContent = c.nome;
  el('cartao-vis-bandeira').textContent = c.bandeira;
  el('cartao-vis-nome').textContent = c.nome;
  el('cartao-vis-fatura').textContent = fmt(fatura);
  el('cartao-vis-disponivel').textContent = fmt(disponivel);
  el('cartao-vis-vencimento').textContent = 'Dia ' + c.vencimento;
  el('cartao-progress-fill').style.width = pct + '%';
  el('cartao-progress-fill').style.background = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#4ade80';
  const visual = document.getElementById('cartao-visual-display');
  if (visual) visual.style.background = 'linear-gradient(135deg,' + (c.cor||'#1e293b') + ',' + (c.cor||'#334155') + 'cc)';

  // Parcelas
  const parcelas = getParcelasCartao(c.id);
  const parcelasEl = document.getElementById('parcelas-lista');
  if (parcelasEl) {
    parcelasEl.innerHTML = parcelas.length === 0
      ? '<div style="font-size:.82rem;color:var(--text-muted);padding:8px 0;">Sem parcelas em aberto.</div>'
      : parcelas.map(t => `<div class="parcela-item">
          <div class="parcela-desc">${t.descricao}</div>
          <div class="parcela-valor">${fmt(t.valor)}</div>
          <div class="parcela-info">${t.parcela_atual}/${t.parcelas}x</div>
        </div>`).join('');
  }

  // Gastos do mês
  const now = new Date();
  const mes = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  const gastosMes = transacoes.filter(t => t.tipo === 'despesa' && t.cartao_id === id && t.data && t.data.startsWith(mes));
  const gastosEl = document.getElementById('cartao-gastos-mes');
  if (gastosEl) {
    if (gastosMes.length === 0) {
      gastosEl.innerHTML = '<div style="font-size:.82rem;color:var(--text-muted);padding:12px 0;">Nenhum gasto registrado neste cartão este mês.</div>';
    } else {
      const total = gastosMes.reduce((s,t) => s+t.valor, 0);
      gastosEl.innerHTML = '<div style="font-size:.85rem;font-weight:600;color:var(--danger);margin-bottom:8px;">Total: ' + fmt(total) + '</div>'
        + gastosMes.slice(0,10).map(t => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:.82rem;"><span>${t.descricao}</span><span style="font-weight:600;color:var(--danger);">${fmt(t.valor)}</span></div>`).join('');
    }
  }
}

// ════════════════════════════════════
// MÓDULO B: PATRIMÔNIO E PROJEÇÃO
// ════════════════════════════════════
function calcularPatrimonio() {
  const saldoContas = getSaldoContas();
  const mesAtualStr = (typeof mesAtual !== 'undefined' && mesAtual) ? mesAtual : new Date().toISOString().slice(0,7);
  const investimentos = transacoes.filter(t => t.tipo === 'receita' && t.categoria === 'investimentos' && t.data && t.data.startsWith(mesAtualStr))
    .reduce((s,t) => s+t.valor, 0);
  const faturas = cartoes.reduce((s, c) => s + getFaturaCartao(c.id), 0);
  return { saldoContas, investimentos, dividas: faturas, total: saldoContas + investimentos - faturas };
}

function renderPatrimonio() {
  const p = calcularPatrimonio();
  const el = id => document.getElementById(id);
  if (el('pat-valor')) el('pat-valor').textContent = fmt(p.total);
  if (el('pat-saldo')) el('pat-saldo').textContent = fmt(p.saldoContas);
  if (el('pat-invest')) el('pat-invest').textContent = fmt(p.investimentos);
  if (el('pat-dividas')) el('pat-dividas').textContent = fmt(p.dividas);
}

function calcularProjecao() {
  const now = new Date();
  const diaAtual = now.getDate();
  const ultimoDia = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const diasRestantes = ultimoDia - diaAtual;
  const mesStr = now.toISOString().slice(0,7);

  const saldoAtual = getSaldoContas();
  const recorrentes = transacoes.filter(t => t.recorrencia && t.recorrencia !== 'unica');
  const mensal = recorrentes.filter(t => t.recorrencia === 'mensal');
  const totalRecDesp = mensal.filter(t => t.tipo === 'despesa').reduce((s,t) => s+t.valor, 0);
  const totalRecRec = mensal.filter(t => t.tipo === 'receita').reduce((s,t) => s+t.valor, 0);

  const saldoProjetado = saldoAtual + (totalRecRec - totalRecDesp) * (diasRestantes / (ultimoDia || 30));
  return { saldoProjetado, totalRecDesp, totalRecRec, diasRestantes };
}

function renderProjecao() {
  const p = calcularProjecao();
  const card = document.getElementById('projecao-card');
  if (!card) return;
  if (contas.length === 0 && transacoes.filter(t => t.recorrencia && t.recorrencia !== 'unica').length === 0) {
    card.style.display = 'none';
    return;
  }
  card.style.display = '';
  const el = id => document.getElementById(id);
  if (el('projecao-valor')) {
    el('projecao-valor').textContent = fmt(p.saldoProjetado);
    el('projecao-valor').style.color = p.saldoProjetado >= 0 ? 'var(--primary-dark)' : 'var(--danger)';
  }
  if (el('projecao-detalhe')) el('projecao-detalhe').textContent = 'Em ' + p.diasRestantes + ' dias | Receitas recorrentes: ' + fmt(p.totalRecRec) + ' | Despesas: ' + fmt(p.totalRecDesp);
}

// ════════════════════════════════════
