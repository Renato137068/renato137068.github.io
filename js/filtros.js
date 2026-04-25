// ════════════════════════════════════════════════════════════════════
// FinançasPro — Filtros Avançados do Extrato (P2.6)
// ════════════════════════════════════════════════════════════════════

let _filtrosAtivos = {
  tipo:      'todos',   // todos | receita | despesa
  mes:       '',        // YYYY-MM
  categoria: '',        // categoria key
  conta:     '',        // conta_id
  cartao:    '',        // cartao_id
  tag:       '',        // tag string
  valorMin:  '',        // number string
  valorMax:  '',        // number string
  busca:     '',        // text search
};

function getFiltrosAtivos() { return _filtrosAtivos; }

function setFiltroAvancado(campo, valor) {
  _filtrosAtivos[campo] = valor;
  if (typeof renderTransacoes === 'function') renderTransacoes();
}

function limparFiltrosAvancados() {
  _filtrosAtivos = { tipo:'todos', mes:'', categoria:'', conta:'', cartao:'', tag:'', valorMin:'', valorMax:'', busca:'' };
  // Resetar UI
  ['tx-filtro-cat','tx-filtro-conta','tx-filtro-tag','tx-filtro-valor-min','tx-filtro-valor-max'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  if (typeof renderTransacoes === 'function') renderTransacoes();
}

function aplicarFiltrosAvancados(transacoes) {
  const f = _filtrosAtivos;
  return transacoes.filter(t => {
    if (f.tipo !== 'todos' && t.tipo !== f.tipo) return false;
    if (f.mes && !(t.data || '').startsWith(f.mes)) return false;
    if (f.categoria && t.categoria !== f.categoria) return false;
    if (f.conta && t.conta_id !== f.conta) return false;
    if (f.cartao && t.cartao_id !== f.cartao) return false;
    if (f.tag && !(t.tag || '').toLowerCase().includes(f.tag.toLowerCase())) return false;
    if (f.valorMin !== '' && t.valor < parseFloat(f.valorMin)) return false;
    if (f.valorMax !== '' && t.valor > parseFloat(f.valorMax)) return false;
    if (f.busca) {
      const h = ((t.descricao || '') + ' ' + (t.categoria || '') + ' ' + (t.tag || '') + ' ' + (t.nota || '')).toLowerCase();
      if (!h.includes(f.busca.toLowerCase())) return false;
    }
    return true;
  });
}

function renderFiltrosAvancados() {
  const painel = document.getElementById('filtros-avancados-painel');
  if (!painel) return;

  // Preencher categorias
  const catSel = document.getElementById('tx-filtro-cat');
  if (catSel && catSel.options.length <= 1) {
    const cats = typeof getCategorias === 'function' ? getCategorias() : [];
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      const icon = (typeof CATEGORIAS_ICON !== 'undefined' && CATEGORIAS_ICON[c.id]) || '';
      const label = (typeof CATEGORIAS_LABEL !== 'undefined' && CATEGORIAS_LABEL[c.id]) || c.id;
      opt.textContent = icon + ' ' + label;
      catSel.appendChild(opt);
    });
  }

  // Preencher contas
  const contaSel = document.getElementById('tx-filtro-conta');
  if (contaSel && contas && contaSel.options.length <= 1) {
    contas.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = (c.icon || '🏦') + ' ' + c.nome;
      contaSel.appendChild(opt);
    });
  }

  // Contador de filtros ativos
  const f = _filtrosAtivos;
  const ativos = [f.categoria, f.conta, f.cartao, f.tag, f.valorMin, f.valorMax].filter(Boolean).length;
  const badge = document.getElementById('filtros-badge');
  if (badge) {
    badge.textContent = ativos > 0 ? ativos : '';
    badge.style.display = ativos > 0 ? 'inline-flex' : 'none';
  }
}

function toggleFiltrosAvancados() {
  const painel = document.getElementById('filtros-avancados-painel');
  if (!painel) return;
  const aberto = painel.style.display !== 'none' && painel.style.display !== '';
  painel.style.display = aberto ? 'none' : 'block';
  if (!aberto) renderFiltrosAvancados();
}

window.getFiltrosAtivos = getFiltrosAtivos;
window.setFiltroAvancado = setFiltroAvancado;
window.limparFiltrosAvancados = limparFiltrosAvancados;
window.aplicarFiltrosAvancados = aplicarFiltrosAvancados;
window.renderFiltrosAvancados = renderFiltrosAvancados;
window.toggleFiltrosAvancados = toggleFiltrosAvancados;

// ── P2.13 — Exportar CSV filtrado ───────────────────────────────
function exportarCSVFiltrado() {
  const tx = (typeof transacoes !== 'undefined' ? transacoes : []);
  const filtradas = aplicarFiltrosAvancados(tx);
  if (filtradas.length === 0) {
    if (typeof mostrarToast === 'function') mostrarToast('Nenhuma transação para exportar com os filtros atuais.', 'warn');
    else alert('Nenhuma transação encontrada.');
    return;
  }

  const linhas = [
    ['Data','Descrição','Tipo','Categoria','Conta','Tag','Valor'].join(';'),
    ...filtradas.map(t => [
      t.data || '',
      '"' + (t.descricao || '').replace(/"/g,'""') + '"',
      t.tipo || '',
      t.categoria || '',
      t.conta || '',
      t.tag || '',
      (t.valor || 0).toFixed(2).replace('.',',')
    ].join(';'))
  ];

  const bom   = '\uFEFF'; // BOM para Excel reconhecer UTF-8
  const blob  = new Blob([bom + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = 'financaspro_filtrado_' + new Date().toISOString().slice(0,10) + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);

  if (typeof mostrarToast === 'function') mostrarToast(filtradas.length + ' transações exportadas!', 'success');
}
window.exportarCSVFiltrado = exportarCSVFiltrado;
