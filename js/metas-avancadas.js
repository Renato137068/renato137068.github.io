(function () {
  'use strict';

  /* ─── P4.2 · Metas Financeiras Avançadas ────────────────────────────── */

  const STORE_KEY = 'fp_metas_av';

  const ICONES_META = {
    viagem: '✈️', casa: '🏠', carro: '🚗', educacao: '📚',
    casamento: '💍', bebe: '👶', emergencia: '🛡️', aposentadoria: '🏖️',
    eletronico: '📱', reforma: '🔨', negocio: '💼', outro: '⭐'
  };

  let metas = [];

  function _load() {
    try { metas = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
    catch(e) { metas = []; }
  }

  function _save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(metas));
  }

  /* ─── Cálculos ──────────────────────────────────────────────────────── */
  function _calcAporte(meta) {
    const falta = meta.valorAlvo - meta.valorAtual;
    if (falta <= 0) return { aporte: 0, meses: 0 };
    if (!meta.prazo) return { aporte: null, meses: null };

    const hoje = new Date();
    const prazo = new Date(meta.prazo + '-01');
    const meses = Math.max(1, Math.round((prazo - hoje) / (1000 * 60 * 60 * 24 * 30.4)));
    // Com rendimento de 0.7% ao mês (poupança/CDB conservador)
    const taxa = meta.rendimento ? (meta.rendimento / 100) : 0.007;
    let aporte;
    if (taxa > 0) {
      aporte = falta * taxa / (Math.pow(1 + taxa, meses) - 1);
    } else {
      aporte = falta / meses;
    }
    return { aporte: Math.ceil(aporte), meses };
  }

  function _pct(meta) {
    if (!meta.valorAlvo) return 0;
    return Math.min(100, Math.round((meta.valorAtual / meta.valorAlvo) * 100));
  }

  /* ─── CRUD ──────────────────────────────────────────────────────────── */
  function adicionarMeta(dados) {
    _load();
    const m = {
      id: Date.now(),
      nome: dados.nome || 'Minha Meta',
      icone: dados.icone || 'outro',
      valorAlvo: parseFloat(dados.valorAlvo) || 0,
      valorAtual: parseFloat(dados.valorAtual) || 0,
      prazo: dados.prazo || null,
      rendimento: parseFloat(dados.rendimento) || 0.7,
      cor: dados.cor || '#6366f1',
      criadoEm: new Date().toISOString(),
      concluida: false
    };
    metas.push(m);
    _save();
    renderMetasAvancadas();
    if (typeof showToast === 'function') showToast('🎯 Meta criada!', 'success');
  }

  function aportarMeta(id, valor) {
    _load();
    const m = metas.find(m => m.id === id);
    if (!m) return;
    valor = parseFloat(valor) || 0;
    m.valorAtual = Math.min(m.valorAlvo, m.valorAtual + valor);
    if (m.valorAtual >= m.valorAlvo) {
      m.concluida = true;
      m.concluidaEm = new Date().toISOString();
      if (typeof showToast === 'function') showToast('🎉 Parabéns! Meta "' + m.nome + '" atingida!', 'achievement');
      if (typeof lancarConfete === 'function') lancarConfete(60);
      if (typeof ganharCoins === 'function') ganharCoins(200, 'meta-concluida');
    }
    _save();
    renderMetasAvancadas();
  }

  function removerMeta(id) {
    _load();
    metas = metas.filter(m => m.id !== id);
    _save();
    renderMetasAvancadas();
  }

  /* ─── Modal ─────────────────────────────────────────────────────────── */
  function abrirModalMeta() {
    const el = document.getElementById('modal-nova-meta');
    if (!el) return;
    ['meta-nome','meta-alvo','meta-atual','meta-rendimento'].forEach(id => {
      const f = document.getElementById(id); if (f) f.value = '';
    });
    const rend = document.getElementById('meta-rendimento');
    if (rend) rend.value = '0.7';
    el.style.display = 'flex';
  }

  function fecharModalMeta() {
    const el = document.getElementById('modal-nova-meta');
    if (el) el.style.display = 'none';
  }

  function abrirModalAporte(id) {
    const m = metas.find(m => m.id === id);
    if (!m) return;
    const val = prompt('💰 Quanto aportar na meta "' + m.nome + '"?\n(Falta: R$ ' + (m.valorAlvo - m.valorAtual).toFixed(2) + ')');
    if (!val) return;
    const valor = parseFloat(val.replace(',', '.'));
    if (valor > 0) aportarMeta(id, valor);
  }

  function salvarNovaMeta() {
    const nome = document.getElementById('meta-nome')?.value?.trim();
    const alvo = parseFloat(document.getElementById('meta-alvo')?.value);
    const atual = parseFloat(document.getElementById('meta-atual')?.value) || 0;
    const prazo = document.getElementById('meta-prazo')?.value || null;
    const icone = document.getElementById('meta-icone')?.value || 'outro';
    const rendimento = parseFloat(document.getElementById('meta-rendimento')?.value) || 0.7;
    const cor = document.getElementById('meta-cor')?.value || '#6366f1';

    if (!nome || !alvo || alvo <= 0) {
      if (typeof showToast === 'function') showToast('⚠️ Preencha nome e valor alvo', 'warning');
      return;
    }
    adicionarMeta({ nome, valorAlvo: alvo, valorAtual: atual, prazo, icone, rendimento, cor });
    fecharModalMeta();
  }

  /* ─── Render ────────────────────────────────────────────────────────── */
  function renderMetasAvancadas() {
    _load();
    const el = document.getElementById('metas-avancadas-panel');
    if (!el) return;

    const fmt = typeof window.fmt === 'function' ? window.fmt : v => 'R$ ' + parseFloat(v).toFixed(2);
    const ativas = metas.filter(m => !m.concluida);
    const concluidas = metas.filter(m => m.concluida);

    let html = '';

    if (metas.length === 0) {
      html = `<div class="meta-empty">
        <div class="empty-icon">🎯</div>
        <h3>Nenhuma meta criada</h3>
        <p>Defina seus objetivos financeiros: viagem, casa, carro, reserva de emergência.</p>
      </div>`;
    }

    ativas.forEach(m => {
      const pct = _pct(m);
      const { aporte, meses } = _calcAporte(m);
      const icone = ICONES_META[m.icone] || '⭐';
      const falta = Math.max(0, m.valorAlvo - m.valorAtual);
      const prazoStr = m.prazo ? new Date(m.prazo + '-15').toLocaleDateString('pt-BR', { month:'long', year:'numeric' }) : null;

      html += `
      <div class="meta-card" style="--meta-cor:${m.cor}">
        <div class="meta-card-header">
          <div class="meta-icone-grande">${icone}</div>
          <div class="meta-info">
            <div class="meta-nome">${m.nome}</div>
            ${prazoStr ? '<div class="meta-prazo">📅 ' + prazoStr + '</div>' : ''}
          </div>
          <button class="btn btn-sm btn-danger-ghost" onclick="removerMeta(${m.id})" title="Excluir">🗑️</button>
        </div>

        <div class="meta-valores">
          <div class="meta-val-item">
            <div class="meta-val-label">Acumulado</div>
            <div class="meta-val-num" style="color:var(--success)">${fmt(m.valorAtual)}</div>
          </div>
          <div class="meta-val-sep">→</div>
          <div class="meta-val-item">
            <div class="meta-val-label">Objetivo</div>
            <div class="meta-val-num">${fmt(m.valorAlvo)}</div>
          </div>
          <div class="meta-val-sep"></div>
          <div class="meta-val-item">
            <div class="meta-val-label">Falta</div>
            <div class="meta-val-num" style="color:var(--danger)">${fmt(falta)}</div>
          </div>
        </div>

        <div class="meta-progress-track">
          <div class="meta-progress-fill" style="width:${pct}%;background:${m.cor}"></div>
        </div>
        <div class="meta-pct-label">${pct}% concluído</div>

        ${aporte !== null ? `
        <div class="meta-aporte-sugerido">
          💡 Aporte sugerido: <strong>${fmt(aporte)}/mês</strong>
          ${meses ? ' por <strong>' + meses + ' meses</strong>' : ''}
          <span class="meta-aporte-taxa">(c/ rendimento ${m.rendimento}% a.m.)</span>
        </div>` : ''}

        <button class="btn btn-primary btn-sm meta-aportar-btn" onclick="abrirModalAporte(${m.id})">
          💰 Registrar Aporte
        </button>
      </div>`;
    });

    if (concluidas.length > 0) {
      html += '<div class="meta-section-titulo">✅ Metas Concluídas</div>';
      concluidas.forEach(m => {
        const icone = ICONES_META[m.icone] || '⭐';
        const dt = m.concluidaEm ? new Date(m.concluidaEm).toLocaleDateString('pt-BR') : '';
        html += `
        <div class="meta-card meta-card-concluida">
          <div class="meta-card-header">
            <div class="meta-icone-grande">${icone}</div>
            <div class="meta-info">
              <div class="meta-nome">${m.nome} ✅</div>
              ${dt ? '<div class="meta-prazo">Concluída em ' + dt + '</div>' : ''}
            </div>
            <div class="meta-val-num" style="color:var(--success)">${fmt(m.valorAlvo)}</div>
          </div>
        </div>`;
      });
    }

    el.innerHTML = html;
  }

  window.metas_av = metas;
  window.adicionarMeta = adicionarMeta;
  window.removerMeta = removerMeta;
  window.aportarMeta = aportarMeta;
  window.abrirModalAporte = abrirModalAporte;
  window.renderMetasAvancadas = renderMetasAvancadas;
  window.abrirModalMeta = abrirModalMeta;
  window.fecharModalMeta = fecharModalMeta;
  window.salvarNovaMeta = salvarNovaMeta;
  window.ICONES_META = ICONES_META;

})();
