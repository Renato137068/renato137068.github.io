// FinançasPro — Módulo de Investimentos Avançado
// v11.0 — Depende de: config.js, dados.js, utils.js
//
// Funcionalidades:
// - CRUD completo: tesouro direto, CDB, fundos, ações, cripto
// - Dashboard "Evolução Patrimonial" (patrimônio total)
// - Cálculo de rentabilidade e projeções
// - Benchmarks (Selic, CDI, Ibovespa)
// - Cache de valores para performance
// - Suporte offline-first (localStorage + Supabase sync)

let _investimentosInicializado = false;
let _investimentos = []; // Estado global
let _benchmarks = {}; // Cache de benchmarks
let _patrimonioCacheKey = '';
let _patrimonioCache = null;

// ════════════════════════════════════════════════════════
// 1. CONSTANTS & BENCHMARKS
// ════════════════════════════════════════════════════════

const TIPOS_INVESTIMENTOS = Object.freeze({
  'tesouro-direto': { label: 'Tesouro Direto', icon: '🇧🇷', cor: '#6366f1', descricao: 'Títulos públicos federais' },
  'cdb': { label: 'CDB', icon: '🏦', cor: '#10b981', descricao: 'Certificado de Depósito Bancário' },
  'cdb-liquido': { label: 'CDB com Liquidez Diária', icon: '🏦', cor: '#34d399', descricao: 'CDB com saque a qualquer momento' },
  'fundo-renda-fixa': { label: 'Fundo Renda Fixa', icon: '📊', cor: '#3b82f6', descricao: 'Fundo de investimento em renda fixa' },
  'fundo-imobiliario': { label: 'FII', icon: '🏢', cor: '#f59e0b', descricao: 'Fundo de Investimento Imobiliário' },
  'acoes': { label: 'Ações', icon: '📈', cor: '#ef4444', descricao: 'Ações negociadas em bolsa' },
  'fundo-acoes': { label: 'Fundo Ações', icon: '📈', cor: '#fca5a5', descricao: 'Fundo de investimento em ações' },
  'cripto': { label: 'Criptomoedas', icon: '₿', cor: '#f97316', descricao: 'Bitcoin, Ethereum, etc' },
  'ouro': { label: 'Ouro', icon: '🟡', cor: '#fbbf24', descricao: 'Investimento em ouro' },
  'outros': { label: 'Outros', icon: '📦', cor: '#6b7280', descricao: 'Outros tipos de investimento' }
});

// Benchmark padrão (cache local)
const BENCHMARKS_PADRAO = {
  'selic': { label: 'Selic', icon: '📌', rentabilidade: 10.5, descricao: 'Taxa de juros benchmark (Brasil)' },
  'cdi': { label: 'CDI', icon: '💹', rentabilidade: 10.3, descricao: 'Certificado de Depósito Interbancário' },
  'ibovespa': { label: 'Ibovespa', icon: '📊', rentabilidade: 8.2, descricao: 'Índice de ações (Bolsa)' },
  'ipca': { label: 'IPCA', icon: '📈', rentabilidade: 5.8, descricao: 'Inflação oficial (acumulada)' }
};

// ════════════════════════════════════════════════════════
// 2. INICIALIZAÇÃO
// ════════════════════════════════════════════════════════

function initInvestimentos() {
  if (_investimentosInicializado) return; // Guard
  _investimentosInicializado = true;

  _carregarInvestimentos();
  _inicializarBenchmarks();

  if (typeof console !== 'undefined' && console.log) {
    console.log('[Investimentos] Módulo inicializado com', _investimentos.length, 'ativos');
  }
}

function _carregarInvestimentos() {
  try {
    // Prioridade: dados.js global > localStorage
    if (typeof investimentos !== 'undefined' && Array.isArray(investimentos)) {
      _investimentos = investimentos;
    } else {
      const stored = localStorage.getItem('fp_investimentos_avancado');
      _investimentos = stored ? JSON.parse(stored) : [];
    }
  } catch(e) {
    console.error('[Investimentos] Erro ao carregar:', e);
    _investimentos = [];
  }
}

function _inicializarBenchmarks() {
  _benchmarks = JSON.parse(JSON.stringify(BENCHMARKS_PADRAO));
  // TODO: Buscar benchmarks reais de API (BCE, CoinGecko, etc)
}

// ════════════════════════════════════════════════════════
// 3. CRUD — ADICIONAR/EDITAR/DELETAR
// ════════════════════════════════════════════════════════

function adicionarInvestimento(dados) {
  // dados = { tipo, descricao, valorInicial, valorAtual, dataAquisicao, rentabilidadeEsperada }
  if (!dados.tipo || !dados.valorInicial) {
    mostrarToast('Preencha tipo e valor inicial', 'warn');
    return false;
  }

  const novoInvest = {
    id: gerarId(),
    tipo: dados.tipo,
    descricao: dados.descricao || '',
    valorInicial: parseFloat(dados.valorInicial) || 0,
    valorAtual: parseFloat(dados.valorAtual) || parseFloat(dados.valorInicial) || 0,
    rentabilidadeEsperada: parseFloat(dados.rentabilidadeEsperada) || 0,
    dataAquisicao: dados.dataAquisicao || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  _investimentos.push(novoInvest);
  _invalidarCaches();
  salvarDados(); // Persiste localStorage + Supabase async
  renderTudo();
  mostrarToast('✅ Investimento adicionado', 'success');
  return true;
}
window.adicionarInvestimento = adicionarInvestimento;

function editarInvestimento(id, dados) {
  const invest = _investimentos.find(i => i.id === id);
  if (!invest) {
    mostrarToast('Investimento não encontrado', 'warn');
    return false;
  }

  Object.keys(dados).forEach(key => {
    if (key !== 'id' && key !== 'createdAt') {
      invest[key] = dados[key];
    }
  });
  invest.updatedAt = new Date().toISOString();

  _invalidarCaches();
  salvarDados();
  renderTudo();
  mostrarToast('✅ Investimento atualizado', 'success');
  return true;
}
window.editarInvestimento = editarInvestimento;

function deletarInvestimento(id) {
  fpConfirm('Remover este investimento?', () => {
    _investimentos = _investimentos.filter(i => i.id !== id);
    _invalidarCaches();
    salvarDados();
    renderTudo();
    mostrarToast('🗑️ Investimento removido', 'success');
  }, '🗑️');
}
window.deletarInvestimento = deletarInvestimento;

// ════════════════════════════════════════════════════════
// 4. CÁLCULOS DE RENTABILIDADE & PATRIMÔNIO
// ════════════════════════════════════════════════════════

function calcularRentabilidade(invest) {
  if (!invest.valorInicial || invest.valorInicial <= 0) return 0;
  return ((invest.valorAtual - invest.valorInicial) / invest.valorInicial) * 100;
}

function calcularGanho(invest) {
  return invest.valorAtual - invest.valorInicial;
}

function calcularPatrimonioTotal() {
  return _investimentos.reduce((sum, i) => sum + i.valorAtual, 0);
}

function calcularPatrimonioInicial() {
  return _investimentos.reduce((sum, i) => sum + i.valorInicial, 0);
}

function calcularRentabilidadePatrimonio() {
  const inicial = calcularPatrimonioInicial();
  if (inicial <= 0) return 0;
  const ganhoTotal = _investimentos.reduce((sum, i) => sum + calcularGanho(i), 0);
  return (ganhoTotal / inicial) * 100;
}

// Projeção: qual será o patrimônio em N meses?
function projetarPatrimonio(meses = 12, rentabilidadeMedia = null) {
  const patrimonioAtual = calcularPatrimonioTotal();
  const rentabilidade = rentabilidadeMedia || (calcularRentabilidadePatrimonio() / 12); // mensal
  const taxa = 1 + (rentabilidade / 100);
  return patrimonioAtual * Math.pow(taxa, meses);
}

// Alocação por tipo (para gráfico pizza)
function calcularAlocacaoPorTipo() {
  const alocacao = {};
  _investimentos.forEach(invest => {
    const tipo = invest.tipo;
    if (!alocacao[tipo]) {
      alocacao[tipo] = { tipo, valorAtual: 0, investimentos: [] };
    }
    alocacao[tipo].valorAtual += invest.valorAtual;
    alocacao[tipo].investimentos.push(invest);
  });
  return alocacao;
}

// Comparação vs benchmarks
function compararVsBenchmark(benchmarkKey = 'selic') {
  const rentabilidadeCarteira = calcularRentabilidadePatrimonio();
  const benchmarkInfo = _benchmarks[benchmarkKey] || BENCHMARKS_PADRAO[benchmarkKey];
  if (!benchmarkInfo) return null;

  return {
    carteira: rentabilidadeCarteira,
    benchmark: benchmarkInfo.rentabilidade,
    diferenca: rentabilidadeCarteira - benchmarkInfo.rentabilidade,
    comparacao: rentabilidadeCarteira >= benchmarkInfo.rentabilidade ? 'acima' : 'abaixo'
  };
}

// ════════════════════════════════════════════════════════
// 5. RENDER — DASHBOARD "EVOLUÇÃO PATRIMONIAL"
// ════════════════════════════════════════════════════════

function renderInvestimentosAvancado() {
  const container = document.getElementById('investimentos-avancado-panel');
  if (!container) return; // Safety check

  // Cache: evitar re-render se dados não mudaram
  const cacheKey = _investimentos.length + '_' +
    (_investimentos[0]?.updatedAt || '');
  if (_patrimonioCache && _patrimonioCacheKey === cacheKey) {
    return; // Cache hit
  }

  let html = '<div class="inv-adv-container">';

  if (_investimentos.length === 0) {
    html += '<div class="inv-adv-empty">' +
      '<div style="font-size:2.5rem;">📊</div>' +
      '<p>Nenhum investimento cadastrado</p>' +
      '<p style="font-size:0.9rem;color:var(--text-muted);">Clique no botão abaixo para adicionar sua carteira</p>' +
      '</div>';
    container.innerHTML = html;
    return;
  }

  // 1. RESUMO PATRIMONIAL
  const patrimonioAtual = calcularPatrimonioTotal();
  const patrimonioInicial = calcularPatrimonioInicial();
  const ganhoTotal = patrimonioAtual - patrimonioInicial;
  const rentabilidade = calcularRentabilidadePatrimonio();
  const projecao12m = projetarPatrimonio(12);

  html += '<div class="inv-adv-section inv-adv-resumo">' +
    '<h3 class="inv-adv-title">💼 Evolução Patrimonial</h3>' +
    _renderCardResumo('Patrimônio Atual', fmt(patrimonioAtual), 'primary') +
    _renderCardResumo('Investimento Inicial', fmt(patrimonioInicial), 'muted') +
    _renderCardResumo('Ganho Total', fmt(ganhoTotal), ganhoTotal >= 0 ? 'success' : 'danger') +
    _renderCardResumo('Rentabilidade', (rentabilidade >= 0 ? '+' : '') + rentabilidade.toFixed(2) + '%',
                     rentabilidade >= 0 ? 'success' : 'danger') +
    _renderCardResumo('Projeção (12m)', fmt(projecao12m), 'info') +
    '</div>';

  // 2. ALOCAÇÃO POR TIPO
  const alocacao = calcularAlocacaoPorTipo();
  const tiposOrdenados = Object.entries(alocacao)
    .sort((a, b) => b[1].valorAtual - a[1].valorAtual);

  html += '<div class="inv-adv-section">' +
    '<h3 class="inv-adv-title">📂 Alocação por Tipo</h3>' +
    '<div class="inv-adv-alocacao">';

  tiposOrdenados.forEach(([tipo, dados]) => {
    const info = TIPOS_INVESTIMENTOS[tipo] || TIPOS_INVESTIMENTOS['outros'];
    const percentual = patrimonioAtual > 0 ? (dados.valorAtual / patrimonioAtual * 100) : 0;
    const rentTipo = dados.investimentos.length > 0
      ? dados.investimentos.reduce((sum, inv) => sum + calcularRentabilidade(inv), 0) / dados.investimentos.length
      : 0;

    html += '<div class="inv-adv-alocacao-item">' +
      '<div class="inv-adv-alocacao-header">' +
        '<span class="inv-adv-icon">' + info.icon + '</span>' +
        '<div>' +
          '<div class="inv-adv-alocacao-nome">' + info.label + '</div>' +
          '<div class="inv-adv-alocacao-meta">' + dados.investimentos.length + ' ativo(s)</div>' +
        '</div>' +
      '</div>' +
      '<div class="inv-adv-alocacao-bar">' +
        '<div class="inv-adv-alocacao-fill" style="width:' + percentual + '%;background:' + info.cor + '"></div>' +
      '</div>' +
      '<div class="inv-adv-alocacao-stats">' +
        '<span>' + percentual.toFixed(1) + '%</span>' +
        '<span style="color:' + (rentTipo >= 0 ? 'var(--success)' : 'var(--danger)') + '">' +
        (rentTipo >= 0 ? '+' : '') + rentTipo.toFixed(2) + '%' +
        '</span>' +
      '</div>' +
      '</div>';
  });

  html += '</div></div>';

  // 3. COMPARAÇÃO COM BENCHMARKS
  html += '<div class="inv-adv-section">' +
    '<h3 class="inv-adv-title">📊 Desempenho vs Benchmarks</h3>' +
    '<div class="inv-adv-benchmarks">';

  ['selic', 'cdi', 'ibovespa'].forEach(benchKey => {
    const comp = compararVsBenchmark(benchKey);
    if (comp) {
      const emoji = comp.diferenca > 0 ? '📈' : '📉';
      html += '<div class="inv-adv-benchmark-item">' +
        '<span>' + emoji + ' ' + (_benchmarks[benchKey]?.label || benchKey.toUpperCase()) + '</span>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:0.9rem;color:var(--text-muted);">' +
            'Benchmark: ' + comp.benchmark.toFixed(2) + '%' +
          '</div>' +
          '<div style="font-weight:600;color:' + (comp.diferenca > 0 ? 'var(--success)' : 'var(--danger)') + '">' +
            (comp.diferenca > 0 ? '+' : '') + comp.diferenca.toFixed(2) + '%' +
          '</div>' +
        '</div>' +
      '</div>';
    }
  });

  html += '</div></div>';

  // 4. LISTA DE INVESTIMENTOS
  html += '<div class="inv-adv-section">' +
    '<h3 class="inv-adv-title">📋 Investimentos</h3>' +
    '<div class="inv-adv-lista">';

  _investimentos.forEach(invest => {
    const info = TIPOS_INVESTIMENTOS[invest.tipo] || TIPOS_INVESTIMENTOS['outros'];
    const rent = calcularRentabilidade(invest);
    const ganho = calcularGanho(invest);

    html += '<div class="inv-adv-card">' +
      '<div class="inv-adv-card-header">' +
        '<div>' +
          '<div style="font-weight:600;display:flex;align-items:center;gap:6px;">' +
            '<span>' + info.icon + '</span>' +
            '<span>' + escHtml(invest.descricao || info.label) + '</span>' +
          '</div>' +
          '<div style="font-size:0.85rem;color:var(--text-muted);">' +
            invest.dataAquisicao +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;">' +
          '<button class="btn btn-sm btn-outline" onclick="abrirModalEditarInvestimento(\'' + invest.id + '\')" aria-label="Editar">✏️</button>' +
          '<button class="btn btn-sm btn-danger" onclick="deletarInvestimento(\'' + invest.id + '\')" aria-label="Remover">🗑️</button>' +
        '</div>' +
      '</div>' +
      '<div class="inv-adv-card-body">' +
        _renderInvestRow('Investido', fmt(invest.valorInicial)) +
        _renderInvestRow('Valor Atual', fmt(invest.valorAtual)) +
        _renderInvestRow('Resultado',
          '<span style="color:' + (ganho >= 0 ? 'var(--success)' : 'var(--danger)') + '">' +
          (ganho >= 0 ? '+' : '') + fmt(ganho) + ' (' + (rent >= 0 ? '+' : '') + rent.toFixed(2) + '%)' +
          '</span>') +
      '</div>' +
    '</div>';
  });

  html += '</div></div>';

  // Botão flutuante para adicionar
  html += '<div class="inv-adv-action">' +
    '<button class="btn btn-primary btn-full" onclick="abrirModalAdicionarInvestimento()">' +
      '➕ Adicionar Investimento' +
    '</button>' +
  '</div>';

  html += '</div>';

  container.innerHTML = html;

  // Cache
  _patrimonioCache = html;
  _patrimonioCacheKey = cacheKey;
}

// Helpers de render
function _renderCardResumo(label, valor, estilo = 'muted') {
  const cores = {
    'primary': 'var(--primary)',
    'success': 'var(--success)',
    'danger': 'var(--danger)',
    'muted': 'var(--text-muted)',
    'info': 'var(--info, #3b82f6)'
  };
  return '<div class="inv-adv-resumo-card">' +
    '<div style="font-size:0.85rem;color:var(--text-muted);">' + label + '</div>' +
    '<div style="font-size:1.3rem;font-weight:700;color:' + cores[estilo] + '">' + valor + '</div>' +
  '</div>';
}

function _renderInvestRow(label, valor) {
  return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light);">' +
    '<span style="color:var(--text-muted);">' + label + '</span>' +
    '<strong>' + valor + '</strong>' +
  '</div>';
}

window.renderInvestimentosAvancado = renderInvestimentosAvancado;

// ════════════════════════════════════════════════════════
// 6. MODALS
// ════════════════════════════════════════════════════════

function abrirModalAdicionarInvestimento() {
  fpPrompt('Descrição do investimento', '', (desc) => {
    if (!desc) return;
    fpPrompt('Valor inicial investido (R$)', '', (valor) => {
      if (!valor || isNaN(parseFloat(valor))) {
        mostrarToast('Valor inválido', 'warn');
        return;
      }
      // Simplificado: usuário pode editar depois
      adicionarInvestimento({
        tipo: 'tesouro-direto',
        descricao: desc,
        valorInicial: valor,
        valorAtual: valor
      });
    });
  });
}
window.abrirModalAdicionarInvestimento = abrirModalAdicionarInvestimento;

function abrirModalEditarInvestimento(id) {
  const invest = _investimentos.find(i => i.id === id);
  if (!invest) return;

  fpPrompt('Novo valor atual (R$)', invest.valorAtual.toString(), (novoVal) => {
    if (!novoVal || isNaN(parseFloat(novoVal))) {
      mostrarToast('Valor inválido', 'warn');
      return;
    }
    editarInvestimento(id, { valorAtual: parseFloat(novoVal) });
  });
}
window.abrirModalEditarInvestimento = abrirModalEditarInvestimento;

// ════════════════════════════════════════════════════════
// 7. HELPERS
// ════════════════════════════════════════════════════════

function _invalidarCaches() {
  _patrimonioCache = null;
  _patrimonioCacheKey = '';
}

function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Exports para acesso externo (para salvar com dados.js)
function getInvestimentos() {
  return _investimentos;
}
window.getInvestimentos = getInvestimentos;

function setInvestimentos(novos) {
  _investimentos = novos || [];
  _invalidarCaches();
}
window.setInvestimentos = setInvestimentos;

// Função para integrar com dados.js
function sincronizarInvestimentosComDados() {
  if (typeof window.investimentos === 'undefined') {
    window.investimentos = [];
  }
  window.investimentos = _investimentos;
}

// ════════════════════════════════════════════════════════
// 8. PERSISTÊNCIA
// ════════════════════════════════════════════════════════

function salvarInvestimentosLocal() {
  try {
    localStorage.setItem('fp_investimentos_avancado', JSON.stringify(_investimentos));
  } catch(e) {
    console.error('[Investimentos] Erro ao salvar localStorage:', e);
  }
}

function salvarInvestimentosSupabase() {
  // TODO: Implementar sincronização com Supabase
  // if (!sb || !currentUser) return;
  // sb.from('investimentos').upsert(...)
}

// ════════════════════════════════════════════════════════
// 9. INICIALIZAÇÃO AUTOMÁTICA
// ════════════════════════════════════════════════════════

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initInvestimentos);
} else {
  initInvestimentos();
}
