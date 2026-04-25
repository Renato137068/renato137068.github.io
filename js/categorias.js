// FinançasPro — Categorias, Autocomplete e CSV
// Depende de: config.js, dados.js, utils.js

// MÓDULO E: CATEGORIZAÇÃO INTELIGENTE
// ════════════════════════════════════
const REGRAS_AUTOCATEGORIA = [
  { regex: /ifood|rappi|uber.?eats|delivery|restaurante|lanchonete|padaria|mercado|supermercado|hortifruti|carrefour|extra|pao.de.acucar|assai|atacadao/i, cat: 'alimentacao' },
  { regex: /uber|99|lyft|cabify|taxi|metro|onibus|combustivel|gasolina|etanol|posto|estacionamento|pedagio/i, cat: 'transporte' },
  { regex: /netflix|spotify|amazon|prime|disney|hbo|globoplay|deezer|youtube|steam|playstation|xbox|cinema|teatro|show|ingresso/i, cat: 'lazer' },
  { regex: /farmacia|droga|remedios?|medico|dentista|clinica|hospital|plano.de.saude|laboratorio|exame|consulta/i, cat: 'saude' },
  { regex: /escola|faculdade|curso|udemy|alura|mensalidade|material.escolar/i, cat: 'educacao' },
  { regex: /aluguel|condominio|iptu|energia|luz|agua|gas encanado|internet|telefone|celular|tim|claro|vivo|oi/i, cat: 'moradia' },
  { regex: /renner|c&a|zara|shein|riachuelo|marisa|americanas|magazine|roupas|calcados|tenis|sapato/i, cat: 'vestuario' },
  { regex: /salario|pagamento|holerite|remuneracao|ferias|bonus|comissao/i, cat: 'salario' },
  { regex: /freela|freelance|projeto|servico.prestado|honorario|autonomo/i, cat: 'freelance' },
  { regex: /tesouro|cdb|lci|lca|fundo|dividendo|rendimento/i, cat: 'investimentos' },
];

function getCategoriaSugerida(desc) {
  if (!desc || desc.length < 2) return null;
  // Regras por palavra-chave (prioridade)
  for (const regra of REGRAS_AUTOCATEGORIA) { if (regra.regex.test(desc)) return regra.cat; }
  const descLower = desc.toLowerCase();
  const freq = {};
  transacoes.forEach(t => {
    if (!t.descricao || !t.categoria) return;
    if (t.descricao.toLowerCase().includes(descLower) || descLower.includes(t.descricao.toLowerCase().slice(0,4))) {
      freq[t.categoria] = (freq[t.categoria] || 0) + 1;
    }
  });
  const entries = Object.entries(freq).sort((a,b) => b[1]-a[1]);
  return entries.length > 0 ? entries[0][0] : null;
}

function getHistoricoDescricoes() {
  const seen = {};
  return transacoes
    .filter(t => t.descricao && t.categoria)
    .sort((a,b) => (b.data||'').localeCompare(a.data||''))
    .filter(t => {
      if (seen[t.descricao]) return false;
      seen[t.descricao] = true;
      return true;
    })
    .slice(0, 100);
}

function onDescInput(val) {
  const listEl = document.getElementById('autocomplete-list');
  if (!listEl) return;
  if (!val || val.length < 2) { listEl.style.display = 'none'; return; }

  const valLower = val.toLowerCase();
  const historico = getHistoricoDescricoes();
  const matches = historico.filter(t => t.descricao.toLowerCase().includes(valLower)).slice(0, 6);

  if (matches.length === 0) { listEl.style.display = 'none'; return; }

  listEl.style.display = '';
  listEl.innerHTML = matches.map(t => {
    const catIcon = (CATEGORIAS_ICON[t.categoria] || '📦');
    return `<div class="autocomplete-item" onclick="selecionarAutoComplete('${t.descricao.replace(/'/g,"\\'")}','${t.categoria}')">
      <span>${t.descricao}</span>
      <span class="autocomplete-cat">${catIcon} ${getCatNome(t.categoria)}</span>
    </div>`;
  }).join('');
}

function selecionarAutoComplete(desc, cat) {
  const descEl = document.getElementById('tx-desc');
  const catEl = document.getElementById('tx-categoria');
  if (descEl) descEl.value = desc;
  if (catEl) catEl.value = cat;
  // Expandir Mais opções para mostrar categoria preenchida
  var qExtra = document.getElementById('quick-entry-extra');
  var qBtn   = document.getElementById('quick-entry-toggle-btn');
  if (qExtra && !qExtra.classList.contains('expanded')) {
    qExtra.classList.add('expanded');
    if (qBtn) qBtn.textContent = '▲ Menos opções';
  }
  const listEl = document.getElementById('autocomplete-list');
  if (listEl) listEl.style.display = 'none';
  if (catEl) catEl.focus();
}

document.addEventListener('click', function(e) {
  const listEl = document.getElementById('autocomplete-list');
  if (listEl && !listEl.contains(e.target) && e.target.id !== 'tx-desc') {
    listEl.style.display = 'none';
  }
});

// ════════════════════════════════════
// MÓDULO F: CATEGORIAS CUSTOMIZÁVEIS
// ════════════════════════════════════
function renderCategoriasCustom() {
  const el = document.getElementById('cat-custom-list');
  if (!el) return;
  const custom = (config.categorias_custom || []);
  const builtIn = [
    {id:'alimentacao',nome:'Alimentação',icon:'🍔'},{id:'moradia',nome:'Moradia',icon:'🏠'},
    {id:'transporte',nome:'Transporte',icon:'🚗'},{id:'saude',nome:'Saúde',icon:'💊'},
    {id:'educacao',nome:'Educação',icon:'📚'},{id:'lazer',nome:'Lazer',icon:'🎮'},
    {id:'vestuario',nome:'Vestuário',icon:'👕'},{id:'salario',nome:'Salário',icon:'💼'},
    {id:'freelance',nome:'Freelance',icon:'💻'},{id:'investimentos',nome:'Investimentos',icon:'📈'},
    {id:'outros',nome:'Outros',icon:'📦'}
  ];
  const all = [...builtIn, ...custom];
  el.innerHTML = all.map(c => `
    <div class="cat-item">
      <div class="cat-item-icon">${c.icon}</div>
      <div class="cat-item-nome">${c.nome}</div>
      ${!builtIn.find(b => b.id === c.id)
        ? `<button class="cat-item-del" onclick="deletarCategoria('${c.id}')">✕</button>`
        : '<span style="font-size:.7rem;color:var(--text-muted);">padrão</span>'}
    </div>`).join('');
}

function adicionarCategoria() {
  const nome = (document.getElementById('cat-new-nome').value || '').trim();
  const icon = (document.getElementById('cat-new-icon').value || '🏷️').trim();
  if (!nome) { mostrarToast('⚠️ Informe o nome da categoria'); return; }
  if (!config.categorias_custom) config.categorias_custom = [];
  const id = nome.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'') + '_' + Date.now().toString(36);
  config.categorias_custom.push({ id, nome, icon });
  document.getElementById('cat-new-nome').value = '';
  document.getElementById('cat-new-icon').value = '';
  salvarDados();
  renderCategoriasCustom();
  atualizarSelectCategorias();
}

function deletarCategoria(id) {
  if (!config.categorias_custom) return;
  config.categorias_custom = config.categorias_custom.filter(c => c.id !== id);
  salvarDados();
  renderCategoriasCustom();
  atualizarSelectCategorias();
}

function novaCategoria() {
  fpPrompt('Nome da nova categoria (ex: Academia, Pet, Streaming):', '', function(nome) {
    if (!nome || !nome.trim()) return;
    fpPrompt('Emoji da categoria:', '📋', function(icon) {
      icon = icon || '📋';
      const id = nome.trim().toLowerCase().replace(/[^a-z0-9]/gi, '_').slice(0,20) + '_' + Date.now().toString(36).slice(-3);
      if (!config.categorias_custom) config.categorias_custom = [];
      config.categorias_custom.push({ id, nome: nome.trim(), icon });
      salvarDados();
      atualizarSelectCategorias();
      setTimeout(() => { const s = document.getElementById('tx-categoria'); if (s) s.value = id; }, 50);
      mostrarToast(icon + ' Categoria "' + nome.trim() + '" criada e selecionada');
    }, '😀');
  }, '📋');
}

function atualizarSelectCategorias() {
  const selects = ['tx-categoria', 'orc-categoria'];
  const custom = config.categorias_custom || [];
  const builtInHTML = `
    <option value="">Selecionar...</option>
    <option value="alimentacao">🍔 Alimentacao</option>
    <option value="moradia">🏠 Moradia</option>
    <option value="transporte">🚗 Transporte</option>
    <option value="saude">💊 Saude</option>
    <option value="educacao">📚 Educacao</option>
    <option value="lazer">🎮 Lazer</option>
    <option value="vestuario">👕 Vestuario</option>
    <option value="salario">💼 Salario</option>
    <option value="freelance">💻 Freelance</option>
    <option value="investimentos">📈 Investimentos</option>
    <option value="outros">📦 Outros</option>`;
  const customHTML = custom.map(c => `<option value="${c.id}">${c.icon} ${c.nome}</option>`).join('');
  selects.forEach(sid => {
    const el = document.getElementById(sid);
    if (el) el.innerHTML = builtInHTML + customHTML;
  });
}

// ════════════════════════════════════
// MÓDULO G: IMPORTAÇÃO CSV
// ════════════════════════════════════
function detectarFormatoCSV(linhas) {
  if (!linhas.length) return 'generico';
  const header = linhas[0].toLowerCase();
  if (header.includes('nubank') || (header.includes('data') && header.includes('descricao') && header.includes('valor'))) return 'nubank';
  if (header.includes('lancamento') || header.includes('historico')) return 'bradesco';
  return 'generico';
}

function parseCSVLinha(linha) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < linha.length; i++) {
    if (linha[i] === '"') { inQuotes = !inQuotes; continue; }
    if (linha[i] === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    if (linha[i] === ';' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += linha[i];
  }
  result.push(current.trim());
  return result;
}

function importarCSV(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const linhas = text.replace(/\r/g, '').split('\n').filter(l => l.trim()); // FIX: remove \r de CSVs Windows
    if (linhas.length < 2) { mostrarToast('⚠️ Arquivo CSV inválido ou vazio'); return; }

    const formato = detectarFormatoCSV(linhas);
    csvDados = [];

    for (let i = 1; i < linhas.length; i++) {
      const cols = parseCSVLinha(linhas[i]);
      if (cols.length < 2) continue;
      let data = '', desc = '', valor = 0, tipo = 'despesa';

      if (formato === 'nubank') {
        data = (cols[0]||'').replace(/(\d{2})\/(\d{2})\/(\d{4})/,'$3-$2-$1');
        desc = cols[2] || cols[1] || '';
        valor = Math.abs(parseFloat((cols[3]||'0').replace(',','.')));
        tipo = parseFloat((cols[3]||'0').replace(',','.')) > 0 ? 'receita' : 'despesa';
      } else {
        const dateMatch = (cols[0]||'').match(/(\d{2})[\/-](\d{2})[\/-](\d{4})/);
        if (dateMatch) data = dateMatch[3] + '-' + dateMatch[2] + '-' + dateMatch[1];
        else data = cols[0] || '';
        desc = cols[1] || 'Lancamento';
        const rawVal = parseFloat((cols[cols.length-1]||'0').replace(/[^0-9,.-]/g,'').replace(',','.'));
        valor = Math.abs(rawVal);
        tipo = rawVal < 0 ? 'despesa' : 'receita';
      }

      if (!valor || !data || data.length < 8) continue;
      const catSugerida = getCategoriaSugerida(desc) || 'outros';
      csvDados.push({ data, desc, valor, tipo, categoria: catSugerida, selecionado: true });
    }

    renderCSVPreview();
  };
  reader.readAsText(file, 'UTF-8');
  event.target.value = '';
}

function renderCSVPreview() {
  const area = document.getElementById('csv-preview-area');
  const list = document.getElementById('csv-preview-list');
  const count = document.getElementById('csv-preview-count');
  if (!area || !list || !count) return;
  if (csvDados.length === 0) { mostrarToast('⚠️ Nenhum lançamento encontrado no arquivo'); return; }

  area.style.display = '';
  count.textContent = csvDados.length + ' lançamentos encontrados';

  const allCats = [
    'alimentacao','moradia','transporte','saude','educacao','lazer',
    'vestuario','salario','freelance','investimentos','outros',
    ...((config.categorias_custom||[]).map(c => c.id))
  ];
  // FIX: catOpts removida — era variável morta (nunca usada)

  list.innerHTML = csvDados.map((r, idx) => `
    <div class="csv-preview-row">
      <input type="checkbox" checked onchange="csvDados[${idx}].selecionado=this.checked" style="flex-shrink:0;">
      <div class="csv-col-data">${r.data}</div>
      <div class="csv-col-desc">${r.desc}</div>
      <div class="csv-col-valor" style="color:${r.tipo==='despesa'?'var(--danger)':'var(--success);'};">${r.tipo==='despesa'?'-':'+'} ${fmt(r.valor)}</div>
      <div class="csv-col-cat">
        <select onchange="csvDados[${idx}].categoria=this.value" style="width:100%;font-size:.75rem;border:1px solid #e5e7eb;border-radius:6px;padding:2px 4px;">
          ${allCats.map(c => `<option value="${c}" ${r.categoria===c?'selected':''}>${getCatNome(c)}</option>`).join('')}
        </select>
      </div>
    </div>`).join('');
}

function confirmarCSV() {
  const selecionados = csvDados.filter(r => r.selecionado);
  if (selecionados.length === 0) { mostrarToast('⚠️ Selecione ao menos um lançamento'); return; }

  // P1.6 — Detecção robusta de duplicatas: data + valor + descrição normalizada
  const _norm = s => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  let importados = 0, duplicados = 0;

  selecionados.forEach(r => {
    const jaExiste = transacoes.some(t =>
      t.data === r.data &&
      Math.abs(t.valor - r.valor) < 0.01 &&
      _norm(t.descricao) === _norm(r.desc)
    );
    if (jaExiste) { duplicados++; return; }
    transacoes.push({
      id: gerarId(), descricao: r.desc, valor: r.valor,
      tipo: r.tipo, categoria: r.categoria, data: r.data,
      recorrencia: 'unica', tag: 'importado', nota: ''
    });
    importados++;
  });

  salvarDados();
  cancelarCSV();
  renderTudo();

  // Feedback detalhado com contagem de duplicatas
  if (duplicados === 0) {
    mostrarToast('✅ ' + importados + ' lançamento' + (importados !== 1 ? 's' : '') + ' importado' + (importados !== 1 ? 's' : '') + ' com sucesso!');
  } else if (importados === 0) {
    mostrarToast('⚠️ Nenhum lançamento importado — todos os ' + duplicados + ' já existem.', 'warning');
  } else {
    mostrarToast('✅ ' + importados + ' importado' + (importados !== 1 ? 's' : '') + ' · ' + duplicados + ' duplicado' + (duplicados !== 1 ? 's' : '') + ' ignorado' + (duplicados !== 1 ? 's' : '') + '.', 'info');
  }
}

function cancelarCSV() {
  csvDados = [];
  const area = document.getElementById('csv-preview-area');
  if (area) area.style.display = 'none';
  const input = document.getElementById('csv-file-input');
  if (input) input.value = '';
}

// ════════════════════════════════════
