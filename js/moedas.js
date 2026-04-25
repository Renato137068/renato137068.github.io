(function () {
  'use strict';

  /* ─── P3.11 · Suporte a Múltiplas Moedas ─────────────────────────────── */

  const MOEDAS_SUPORTADAS = {
    BRL: { simbolo: 'R$', nome: 'Real Brasileiro', icone: '🇧🇷', decimais: 2 },
    USD: { simbolo: '$',  nome: 'Dólar Americano', icone: '🇺🇸', decimais: 2 },
    EUR: { simbolo: '€',  nome: 'Euro',            icone: '🇪🇺', decimais: 2 },
    GBP: { simbolo: '£',  nome: 'Libra Esterlina', icone: '🇬🇧', decimais: 2 },
    ARS: { simbolo: '$',  nome: 'Peso Argentino',  icone: '🇦🇷', decimais: 2 },
    BTC: { simbolo: '₿',  nome: 'Bitcoin',         icone: '₿',   decimais: 8 },
    ETH: { simbolo: 'Ξ',  nome: 'Ethereum',        icone: 'Ξ',   decimais: 6 },
  };

  const STORE_KEY = 'fp_moedas';
  const RATES_KEY = 'fp_cotacoes';
  const RATES_TTL = 3600000; // 1 hora em ms

  let _taxas = {}; // { USD: 5.12, EUR: 5.54, ... } em relação ao BRL
  let _moedaVisual = 'BRL'; // moeda de exibição atual (interface)

  /* ─── Persistência ──────────────────────────────────────────────────── */
  function _loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      _moedaVisual = s.moedaVisual || 'BRL';
    } catch (e) { _moedaVisual = 'BRL'; }
  }

  function _saveState() {
    localStorage.setItem(STORE_KEY, JSON.stringify({ moedaVisual: _moedaVisual }));
  }

  /* ─── Cache de cotações ─────────────────────────────────────────────── */
  function _loadRatesCache() {
    try {
      const c = JSON.parse(localStorage.getItem(RATES_KEY) || '{}');
      if (c.ts && Date.now() - c.ts < RATES_TTL && c.rates) {
        _taxas = c.rates;
        return true;
      }
    } catch (e) {}
    return false;
  }

  function _saveRatesCache(rates) {
    _taxas = rates;
    localStorage.setItem(RATES_KEY, JSON.stringify({ ts: Date.now(), rates }));
  }

  /* ─── Busca cotações via ExchangeRate-API (open/free endpoint) ──────── */
  async function buscarCotacoes() {
    if (_loadRatesCache()) return _taxas;

    // Tenta ExchangeRate-API gratuita (sem chave, BRL base)
    const urls = [
      'https://open.er-api.com/v6/latest/BRL',
      'https://api.exchangerate-api.com/v4/latest/BRL'
    ];

    for (const url of urls) {
      try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!resp.ok) continue;
        const data = await resp.json();
        const rates = data.rates || data.rates;
        if (rates && rates.USD) {
          // Converter: rates aqui são "quanto de X = 1 BRL"
          // queremos "quanto de BRL = 1 moeda estrangeira"
          const taxasBRL = {};
          for (const moeda of ['USD', 'EUR', 'GBP', 'ARS']) {
            if (rates[moeda]) taxasBRL[moeda] = 1 / rates[moeda];
          }
          // Bitcoin via CoinGecko (fallback estático se falhar)
          taxasBRL['BTC'] = await _buscarBTC();
          taxasBRL['ETH'] = await _buscarETH();
          _saveRatesCache(taxasBRL);
          return taxasBRL;
        }
      } catch (e) { /* tenta próxima */ }
    }

    // Fallback: taxas aproximadas hardcoded
    const fallback = { USD: 5.1, EUR: 5.5, GBP: 6.4, ARS: 0.006, BTC: 320000, ETH: 18000 };
    _saveRatesCache(fallback);
    return fallback;
  }

  async function _buscarBTC() {
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl',
        { signal: AbortSignal.timeout(4000) });
      if (!r.ok) return 320000;
      const d = await r.json();
      return d.bitcoin?.brl || 320000;
    } catch (e) { return 320000; }
  }

  async function _buscarETH() {
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=brl',
        { signal: AbortSignal.timeout(4000) });
      if (!r.ok) return 18000;
      const d = await r.json();
      return d.ethereum?.brl || 18000;
    } catch (e) { return 18000; }
  }

  /* ─── Conversão ─────────────────────────────────────────────────────── */
  /**
   * Converte valor de moedaOrigem para moedaDestino
   * Sempre passa por BRL como pivot
   */
  function converter(valor, moedaOrigem, moedaDestino) {
    if (moedaOrigem === moedaDestino) return valor;
    const val = parseFloat(valor) || 0;

    // Para BRL (origem)
    let emBRL = val;
    if (moedaOrigem !== 'BRL') {
      const taxa = _taxas[moedaOrigem] || 1;
      emBRL = val * taxa;
    }

    // De BRL para destino
    if (moedaDestino === 'BRL') return emBRL;
    const taxaDest = _taxas[moedaDestino] || 1;
    return emBRL / taxaDest;
  }

  /**
   * Formata valor em moeda específica
   */
  function formatarMoeda(valor, moeda) {
    moeda = moeda || _moedaVisual;
    const m = MOEDAS_SUPORTADAS[moeda];
    if (!m) return 'R$ ' + parseFloat(valor).toFixed(2);
    return m.simbolo + ' ' + parseFloat(valor).toFixed(m.decimais);
  }

  /* ─── Render do painel de moedas ───────────────────────────────────── */
  function renderMoedas() {
    const el = document.getElementById('moedas-panel');
    if (!el) return;

    const taxasDisponiveis = Object.keys(_taxas).length > 0;
    const baseVal = 1000; // R$ 1.000 como referência

    el.innerHTML = `
      <div class="moedas-header">
        <h3>💱 Cotações em Tempo Real</h3>
        <button class="btn btn-sm btn-outline" onclick="atualizarCotacoes()">🔄 Atualizar</button>
      </div>
      <p class="moedas-desc">Cotações em relação ao Real (BRL). Atualização automática a cada hora.</p>

      ${taxasDisponiveis ? `
      <div class="cotacoes-grid">
        ${Object.entries(MOEDAS_SUPORTADAS).filter(([k]) => k !== 'BRL').map(([codigo, m]) => {
          const taxa = _taxas[codigo];
          if (!taxa) return '';
          const comprar = taxa;
          const dec = codigo === 'BTC' ? 2 : (codigo === 'ETH' ? 2 : 4);
          return `
          <div class="cotacao-card">
            <div class="cotacao-icon">${m.icone}</div>
            <div class="cotacao-info">
              <div class="cotacao-codigo">${codigo}</div>
              <div class="cotacao-nome">${m.nome}</div>
            </div>
            <div class="cotacao-valor">
              <div class="cotacao-brl">R$ ${comprar.toFixed(dec)}</div>
              <div class="cotacao-sub">por 1 ${codigo}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
      ` : '<p class="moedas-loading">⏳ Carregando cotações...</p>'}

      <div class="conversor-section">
        <h4>🔄 Conversor</h4>
        <div class="conversor-form">
          <div class="conversor-row">
            <input type="number" id="conv-valor" class="form-control" value="100" min="0" step="0.01"
              oninput="calcularConversao()" placeholder="Valor">
            <select id="conv-origem" class="form-control" onchange="calcularConversao()">
              ${Object.entries(MOEDAS_SUPORTADAS).map(([k, m]) =>
                `<option value="${k}" ${k === 'BRL' ? 'selected' : ''}>${m.icone} ${k}</option>`
              ).join('')}
            </select>
          </div>
          <div class="conversor-resultado" id="conv-resultado">
            <span class="conv-igualdade">▼</span>
          </div>
          <div class="conversor-row">
            <input type="number" id="conv-resultado-val" class="form-control conv-output" readonly>
            <select id="conv-destino" class="form-control" onchange="calcularConversao()">
              ${Object.entries(MOEDAS_SUPORTADAS).map(([k, m]) =>
                `<option value="${k}" ${k === 'USD' ? 'selected' : ''}>${m.icone} ${k}</option>`
              ).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="moedas-timestamp">
        Última atualização: ${_taxas._ts ? new Date(_taxas._ts).toLocaleString('pt-BR') : 'agora'}
      </div>
    `;

    // Calcular conversão inicial
    setTimeout(calcularConversao, 50);
  }

  function calcularConversao() {
    const valor = parseFloat(document.getElementById('conv-valor')?.value) || 0;
    const origem = document.getElementById('conv-origem')?.value || 'BRL';
    const destino = document.getElementById('conv-destino')?.value || 'USD';
    const resultEl = document.getElementById('conv-resultado-val');
    if (!resultEl) return;

    const resultado = converter(valor, origem, destino);
    const m = MOEDAS_SUPORTADAS[destino] || { simbolo: '', decimais: 2 };
    resultEl.value = resultado.toFixed(m.decimais);
  }

  async function atualizarCotacoes() {
    localStorage.removeItem(RATES_KEY);
    const btn = document.querySelector('[onclick="atualizarCotacoes()"]');
    if (btn) { btn.textContent = '⏳ Buscando...'; btn.disabled = true; }
    await buscarCotacoes();
    renderMoedas();
    if (typeof showToast === 'function') showToast('💱 Cotações atualizadas!', 'success');
  }

  /* ─── Inicialização ─────────────────────────────────────────────────── */
  _loadState();
  _loadRatesCache();

  // Busca assíncrona ao carregar (não bloqueia)
  if (Object.keys(_taxas).length === 0) {
    buscarCotacoes().then(() => {
      const el = document.getElementById('moedas-panel');
      if (el && el.closest('.tab-panel.active')) renderMoedas();
    });
  }

  // Expor globalmente
  window.MOEDAS_SUPORTADAS = MOEDAS_SUPORTADAS;
  window.buscarCotacoes = buscarCotacoes;
  window.converter = converter;
  window.formatarMoeda = formatarMoeda;
  window.renderMoedas = renderMoedas;
  window.calcularConversao = calcularConversao;
  window.atualizarCotacoes = atualizarCotacoes;

})();
