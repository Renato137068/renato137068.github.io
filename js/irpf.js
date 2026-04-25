(function () {
  'use strict';

  /* ─── P4.6 · Helper IRPF Brasileiro ─────────────────────────────────── */

  const STORE_KEY = 'fp_irpf';

  // Tabela progressiva 2024 (base anual)
  const TABELA_IRPF_2024 = [
    { ate: 24511.92,   aliquota: 0,    deducao: 0 },
    { ate: 33919.80,   aliquota: 0.075, deducao: 1838.39 },
    { ate: 45012.60,   aliquota: 0.15,  deducao: 4382.38 },
    { ate: 55976.16,   aliquota: 0.225, deducao: 7758.17 },
    { ate: Infinity,   aliquota: 0.275, deducao: 10557.13 },
  ];

  const DEDUCAO_DEPENDENTE_2024 = 2275.08; // por ano por dependente
  const DEDUCAO_EDUCACAO_MAX = 3561.50;    // por ano (limite)

  let _state = {
    rendimentos: { salario: 0, aluguel: 0, freelance: 0, dividendos: 0, outros_trib: 0 },
    isentos: { poupanca: 0, fgts: 0, indenizacao: 0, lci_lca: 0, outros_isentos: 0 },
    deducoes: { inss: 0, saude: 0, educacao: 0, dependentes: 0, pensao: 0, outros_ded: 0 },
    irRetido: 0,
    ano: 2024
  };

  function _load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      if (s.rendimentos) _state = s;
    } catch(e) {}
  }

  function _save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(_state));
  }

  /* ─── Cálculo do IRPF ───────────────────────────────────────────────── */
  function calcularIRPF() {
    const s = _state;

    const totalRendimentos = Object.values(s.rendimentos).reduce((a, b) => a + b, 0);
    const totalIsentos = Object.values(s.isentos).reduce((a, b) => a + b, 0);

    // Deduções legais
    const dedInss = s.deducoes.inss;
    const dedSaude = s.deducoes.saude;
    const dedEducacao = Math.min(s.deducoes.educacao, DEDUCAO_EDUCACAO_MAX);
    const dedDependentes = s.deducoes.dependentes * DEDUCAO_DEPENDENTE_2024;
    const dedPensao = s.deducoes.pensao;
    const dedOutros = s.deducoes.outros_ded;
    const totalDeducoes = dedInss + dedSaude + dedEducacao + dedDependentes + dedPensao + dedOutros;

    const baseCalculo = Math.max(0, totalRendimentos - totalDeducoes);

    // Calcular imposto pela tabela progressiva
    let imposto = 0;
    for (const faixa of TABELA_IRPF_2024) {
      if (baseCalculo <= faixa.ate) {
        imposto = baseCalculo * faixa.aliquota - faixa.deducao;
        break;
      }
    }
    imposto = Math.max(0, imposto);

    const irRetido = s.irRetido;
    const saldo = imposto - irRetido;

    const aliquotaEfetiva = totalRendimentos > 0 ? (imposto / totalRendimentos) * 100 : 0;

    return {
      totalRendimentos,
      totalIsentos,
      totalDeducoes,
      baseCalculo,
      impostoDevido: imposto,
      irRetido,
      saldo, // positivo = a pagar, negativo = a restituir
      aliquotaEfetiva,
      detalheDeducoes: {
        inss: dedInss, saude: dedSaude, educacao: dedEducacao,
        dependentes: dedDependentes, pensao: dedPensao, outros: dedOutros
      }
    };
  }

  /* ─── Preencher automaticamente com dados das transações ────────────── */
  function preencherDeTransacoes() {
    if (typeof transacoes === 'undefined') return;

    const anoFiltro = _state.ano || new Date().getFullYear() - 1;
    const txAno = transacoes.filter(t => (t.data || '').startsWith(String(anoFiltro)));

    const rendSalario = txAno.filter(t => t.tipo === 'receita' && t.categoria === 'salario')
      .reduce((s, t) => s + t.valor, 0);
    const rendFreelance = txAno.filter(t => t.tipo === 'receita' && t.categoria === 'freelance')
      .reduce((s, t) => s + t.valor, 0);

    const despSaude = txAno.filter(t => t.tipo === 'despesa' && (t.categoria === 'saude' || t.categoria === 'plano_saude'))
      .reduce((s, t) => s + t.valor, 0);
    const despEducacao = txAno.filter(t => t.tipo === 'despesa' && t.categoria === 'educacao')
      .reduce((s, t) => s + t.valor, 0);

    if (rendSalario > 0) _state.rendimentos.salario = rendSalario;
    if (rendFreelance > 0) _state.rendimentos.freelance = rendFreelance;
    if (despSaude > 0) _state.deducoes.saude = despSaude;
    if (despEducacao > 0) _state.deducoes.educacao = Math.min(despEducacao, DEDUCAO_EDUCACAO_MAX);
  }

  /* ─── Atualizar campo ───────────────────────────────────────────────── */
  function updateIRPFField(grupo, campo, valor) {
    if (!_state[grupo]) _state[grupo] = {};
    _state[grupo][campo] = parseFloat(valor) || 0;
    _save();
    renderResultadoIRPF();
  }

  /* ─── Render ────────────────────────────────────────────────────────── */
  function renderIRPF() {
    _load();
    preencherDeTransacoes();
    renderResultadoIRPF();

    // Preencher campos
    _preencherCampos('irpf-sal', _state.rendimentos.salario);
    _preencherCampos('irpf-aluguel', _state.rendimentos.aluguel);
    _preencherCampos('irpf-freela', _state.rendimentos.freelance);
    _preencherCampos('irpf-outros-trib', _state.rendimentos.outros_trib);
    _preencherCampos('irpf-inss', _state.deducoes.inss);
    _preencherCampos('irpf-saude', _state.deducoes.saude);
    _preencherCampos('irpf-educ', _state.deducoes.educacao);
    _preencherCampos('irpf-dep', _state.deducoes.dependentes);
    _preencherCampos('irpf-ir-retido', _state.irRetido);
    _preencherCampos('irpf-ano', _state.ano);
  }

  function _preencherCampos(id, val) {
    const el = document.getElementById(id);
    if (el && el.value === '' && val) el.value = val;
  }

  function renderResultadoIRPF() {
    const el = document.getElementById('irpf-resultado');
    if (!el) return;

    const r = calcularIRPF();
    const fmt = typeof window.fmt === 'function' ? window.fmt : v => 'R$ ' + parseFloat(v).toFixed(2);

    const saldoCor = r.saldo > 0 ? 'var(--danger)' : 'var(--success)';
    const saldoLabel = r.saldo > 0 ? '📤 A PAGAR' : '📥 A RESTITUIR';
    const saldoVal = fmt(Math.abs(r.saldo));

    el.innerHTML = `
      <div class="irpf-resultado-header">
        <div class="irpf-res-titulo">Simulação IRPF ${_state.ano}</div>
        <div class="irpf-aliquota">Alíquota efetiva: ${r.aliquotaEfetiva.toFixed(1)}%</div>
      </div>
      <div class="irpf-res-grid">
        <div class="irpf-res-item">
          <div class="irpf-res-label">Rendimentos tributáveis</div>
          <div class="irpf-res-val">${fmt(r.totalRendimentos)}</div>
        </div>
        <div class="irpf-res-item">
          <div class="irpf-res-label">Total de deduções</div>
          <div class="irpf-res-val" style="color:var(--success)">- ${fmt(r.totalDeducoes)}</div>
        </div>
        <div class="irpf-res-item irpf-res-destaque">
          <div class="irpf-res-label">Base de cálculo</div>
          <div class="irpf-res-val">${fmt(r.baseCalculo)}</div>
        </div>
        <div class="irpf-res-item">
          <div class="irpf-res-label">Imposto calculado</div>
          <div class="irpf-res-val">${fmt(r.impostoDevido)}</div>
        </div>
        <div class="irpf-res-item">
          <div class="irpf-res-label">IR retido na fonte</div>
          <div class="irpf-res-val" style="color:var(--success)">- ${fmt(r.irRetido)}</div>
        </div>
      </div>
      <div class="irpf-saldo-final" style="background:${r.saldo > 0 ? '#fef2f2' : '#f0fdf4'};border-color:${saldoCor}">
        <div class="irpf-saldo-label">${saldoLabel}</div>
        <div class="irpf-saldo-val" style="color:${saldoCor}">${saldoVal}</div>
      </div>
      <div class="irpf-isentos-box">
        <strong>📋 Rendimentos isentos:</strong> ${fmt(r.totalIsentos)}
        <span class="irpf-isentos-nota">(não entram na base de cálculo)</span>
      </div>
      <p class="irpf-aviso">⚠️ Simulação estimativa. Use o programa oficial da Receita Federal para a declaração definitiva.</p>
    `;
    el.classList.add('visible');
  }

  window.renderIRPF = renderIRPF;
  window.updateIRPFField = updateIRPFField;
  window.calcularIRPF = calcularIRPF;
  window.renderResultadoIRPF = renderResultadoIRPF;
  window.TABELA_IRPF_2024 = TABELA_IRPF_2024;

})();
