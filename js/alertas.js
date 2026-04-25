// FinançasPro — Alertas Inteligentes e Recorrências
// Depende de: config.js, dados.js

// MÓDULO C: ALERTAS INTELIGENTES
// ════════════════════════════════════
function verificarAlertas() {
  const alertas = [];
  const now = new Date();
  const mes = now.toISOString().slice(0,7);

  // 1. Orçamento 80%
  Object.keys(orcamentos).forEach(cat => {
    const limite = orcamentos[cat];
    if (!limite) return;
    const gasto = transacoes.filter(t => t.tipo === 'despesa' && t.categoria === cat && t.data && t.data.startsWith(mes))
      .reduce((s,t) => s+t.valor, 0);
    const pct = (gasto / limite) * 100;
    if (pct >= 100) {
      alertas.push({ tipo:'perigo', icon:'🚨', titulo:'Orçamento estourado: ' + getCatNome(cat), texto: fmt(gasto) + ' de ' + fmt(limite) + ' (' + Math.round(pct) + '%)' });
    } else if (pct >= 80) {
      alertas.push({ tipo:'aviso', icon:'⚠️', titulo:'Orçamento quase no limite: ' + getCatNome(cat), texto: fmt(gasto) + ' de ' + fmt(limite) + ' (' + Math.round(pct) + '%)' });
    }
  });

  // 2. Cartão fechando em breve
  // FIX: diasFechamento pode ser negativo quando fechamento < hoje;
  // calcular dias até a próxima ocorrência do dia de fechamento no mês atual/próximo.
  cartoes.forEach(c => {
    const hoje = now.getDate();
    const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const diasFechamento = c.fechamento >= hoje
      ? c.fechamento - hoje
      : c.fechamento + (ultimoDiaMes - hoje);
    if (diasFechamento <= 3) {
      const fatura = getFaturaCartao(c.id);
      alertas.push({ tipo:'aviso', icon:'💳', titulo: c.nome + ' fecha em ' + diasFechamento + (diasFechamento === 1 ? ' dia' : ' dias'), texto: 'Fatura atual: ' + fmt(fatura) });
    }
  });

  // 2b. Fatura vencendo em breve
  cartoes.forEach(c => {
    if (!c.vencimento) return;
    const fatura = getFaturaCartao(c.id);
    if (fatura <= 0) return;
    let dVenc = new Date(now.getFullYear(), now.getMonth(), c.vencimento);
    if (dVenc <= now) dVenc = new Date(now.getFullYear(), now.getMonth() + 1, c.vencimento);
    const diasVenc = Math.ceil((dVenc - now) / 86400000);
    if (diasVenc <= 5 && diasVenc >= 0) {
      const urgencia = diasVenc <= 1 ? 'perigo' : 'aviso';
      const labelV = diasVenc === 0 ? 'vence HOJE' : diasVenc === 1 ? 'vence amanhã' : 'vence em ' + diasVenc + ' dias';
      alertas.push({ tipo: urgencia, icon: diasVenc <= 1 ? '🔴' : '💳', titulo: c.nome + ' — ' + labelV, texto: 'Pagar ' + fmt(fatura) + ' até o dia ' + c.vencimento });
    }
  });

  // 3. Dias sem lancamento
  const txMes = transacoes.filter(t => t.data && t.data.startsWith(mes));
  if (txMes.length > 0) {
    const lastDate = txMes.map(t => t.data).sort().pop();
    const diffDays = Math.floor((now - new Date(lastDate)) / 86400000);
    if (diffDays >= 3) {
      alertas.push({ tipo:'info', icon:'📝', titulo: diffDays + ' dias sem lançamentos', texto:'Mantenha seu extrato atualizado para melhores insights.' });
    }
  }

  // 4. Saldo negativo
  const saldo = getSaldoContas();
  if (contas.length > 0 && saldo < 0) {
    alertas.push({ tipo:'perigo', icon:'📉', titulo:'Saldo negativo nas contas', texto:'Total: ' + fmt(saldo) + '. Revise seus gastos.' });
  }

  renderAlertas(alertas);
}

function getCatNome(cat) {
  // FIX: usa CATEGORIAS_LABEL de config.js diretamente — evita reconstruir
  // objetos a cada chamada (era O(n_custom) por invocação em loops).
  if (typeof CATEGORIAS_LABEL !== 'undefined' && CATEGORIAS_LABEL[cat]) return CATEGORIAS_LABEL[cat];
  if (config.categorias_custom) {
    const c = config.categorias_custom.find(c => c.id === cat);
    if (c) return c.nome;
  }
  return cat;
}

function renderAlertas(alertas) {
  const el = document.getElementById('alertas-container');
  if (!el) return;
  if (alertas.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = alertas.map((a, idx) => `
    <div class="alerta-item alerta-${a.tipo}" id="alerta-${idx}">
      <div class="alerta-icon">${a.icon}</div>
      <div class="alerta-texto">
        <div class="alerta-titulo">${a.titulo}</div>
        <div>${a.texto}</div>
      </div>
      <button class="alerta-fechar" onclick="fecharAlerta(${idx})">✕</button>
    </div>`).join('');
}

function fecharAlerta(idx) {
  const el = document.getElementById('alerta-' + idx);
  if (el) el.remove();
}

// ════════════════════════════════════
// MÓDULO D: RECORRÊNCIAS AUTOMÁTICAS
// ════════════════════════════════════
function processarRecorrencias() {
  const now = new Date();
  const mesAtualStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  let adicionadas = 0;

  const recorrentes = transacoes.filter(t => t.recorrencia && t.recorrencia !== 'unica');
  recorrentes.forEach(t => {
    if (!t.data) return;
    const dataOrigem = new Date(t.data + 'T12:00:00');
    if (dataOrigem >= now) return;

    let novaData = null;
    if (t.recorrencia === 'mensal') {
      const dia = dataOrigem.getDate();
      novaData = mesAtualStr + '-' + String(dia).padStart(2,'0');
    } else if (t.recorrencia === 'semanal') {
      const proximaSemana = new Date(dataOrigem);
      while (proximaSemana < now) {
        proximaSemana.setDate(proximaSemana.getDate() + 7);
      }
      novaData = proximaSemana.toISOString().slice(0,10);
    }

    if (!novaData) return;
    const jaExiste = transacoes.some(tx => tx.gerado_de === t.id && tx.data === novaData);
    if (jaExiste) return;
    if (novaData > now.toISOString().slice(0,10)) return;

    const nova = Object.assign({}, t, {
      id: gerarId(),
      data: novaData,
      gerado_de: t.id,
      recorrencia: 'unica'
    });
    nova.gerado_de = t.id; // FIX: delete redundante removido
    transacoes.push(nova);
    adicionadas++;
  });

  if (adicionadas > 0) salvarDados();
  return adicionadas;
}

// ════════════════════════════════════
