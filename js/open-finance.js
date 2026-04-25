(function () {
  'use strict';

  /* ─── P4.9 · Open Finance + Leitor QR PIX ───────────────────────────── */

  /* ─── Parser de QR Code PIX (padrão EMVCo BR Code) ─────────────────── */
  function _parsePIX(rawStr) {
    if (!rawStr || typeof rawStr !== 'string') return null;
    rawStr = rawStr.trim();

    const result = { raw: rawStr, valor: null, nome: null, cidade: null, txid: null, descricao: null };

    // Função para extrair TLV (Tag-Length-Value)
    function _tlv(str, offset) {
      if (offset >= str.length - 4) return null;
      const tag = str.slice(offset, offset + 2);
      const len = parseInt(str.slice(offset + 2, offset + 4), 10);
      if (isNaN(len)) return null;
      const val = str.slice(offset + 4, offset + 4 + len);
      return { tag, len, val, next: offset + 4 + len };
    }

    // Extrair campos EMVCo
    let pos = 0;
    while (pos < rawStr.length) {
      const item = _tlv(rawStr, pos);
      if (!item) break;

      // 54 = Transaction Amount
      if (item.tag === '54') result.valor = parseFloat(item.val) || null;
      // 59 = Merchant Name
      if (item.tag === '59') result.nome = item.val;
      // 60 = Merchant City
      if (item.tag === '60') result.cidade = item.val;
      // 62 = Additional Data Field Template (contém TXID)
      if (item.tag === '62') {
        let subPos = 0;
        while (subPos < item.val.length) {
          const sub = _tlv(item.val, subPos);
          if (!sub) break;
          if (sub.tag === '05') result.txid = sub.val;
          if (sub.tag === '02') result.descricao = sub.val; // Purpose of Transaction
          subPos = sub.next;
        }
      }
      // 26/27/28 = Merchant Account Info (chave PIX embutida)
      if (['26','27','28'].includes(item.tag)) {
        let subPos = 0;
        while (subPos < item.val.length) {
          const sub = _tlv(item.val, subPos);
          if (!sub) break;
          if (sub.tag === '00') {} // GUI
          if (sub.tag === '01') result.chave = sub.val; // chave PIX
          subPos = sub.next;
        }
      }

      pos = item.next;
    }

    // Fallback: PIX Copia e Cola simplificado (sem TLV completo)
    if (!result.valor && !result.nome) {
      // Tenta extrair de formatos alternativos
      const valMatch = rawStr.match(/5404(\d+\.\d{2})/);
      if (valMatch) result.valor = parseFloat(valMatch[1]);
      const nomeMatch = rawStr.match(/59(\d{2})([A-Za-zÀ-ú\s]+)/);
      if (nomeMatch) result.nome = nomeMatch[2].slice(0, parseInt(nomeMatch[1]));
    }

    return result.nome || result.chave ? result : null;
  }

  /* ─── Leitor QR via câmera (BarcodeDetector API) ────────────────────── */
  let _scannerStream = null;

  async function iniciarScannerPIX() {
    const el = document.getElementById('pix-scanner-area');
    if (!el) return;

    // Verificar suporte
    if (!('BarcodeDetector' in window)) {
      el.innerHTML = `
        <div class="pix-no-support">
          <p>📷 Seu navegador não suporta leitura de QR Code automática.</p>
          <p>Cole o código PIX manualmente no campo abaixo:</p>
          <textarea id="pix-manual-input" class="form-control" rows="4" placeholder="Cole aqui o código PIX Copia e Cola..."></textarea>
          <button class="btn btn-primary" onclick="processarPIXManual()">Processar PIX</button>
        </div>`;
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      _scannerStream = stream;

      el.innerHTML = `
        <div class="pix-scanner-container">
          <video id="pix-video" autoplay playsinline style="width:100%;border-radius:12px;"></video>
          <div class="pix-scan-overlay">
            <div class="pix-scan-frame"></div>
            <p class="pix-scan-hint">Aponte para o QR Code PIX</p>
          </div>
          <button class="btn btn-sm btn-outline pix-fechar-scanner" onclick="pararScannerPIX()">✕ Fechar</button>
        </div>`;

      const video = document.getElementById('pix-video');
      video.srcObject = stream;

      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const intervalo = setInterval(async () => {
        if (!video.videoWidth) return;
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            clearInterval(intervalo);
            pararScannerPIX();
            processarPIXString(barcodes[0].rawValue);
          }
        } catch(e) {}
      }, 500);

      // Guardar intervalo para cleanup
      el.dataset.scanInterval = intervalo;

    } catch(e) {
      el.innerHTML = `<p class="pix-error">⚠️ Não foi possível acessar a câmera. Verifique as permissões.</p>`;
    }
  }

  function pararScannerPIX() {
    if (_scannerStream) {
      _scannerStream.getTracks().forEach(t => t.stop());
      _scannerStream = null;
    }
    const el = document.getElementById('pix-scanner-area');
    if (el) {
      if (el.dataset.scanInterval) clearInterval(parseInt(el.dataset.scanInterval));
      el.innerHTML = '';
    }
  }

  function processarPIXManual() {
    const input = document.getElementById('pix-manual-input');
    if (!input?.value?.trim()) return;
    processarPIXString(input.value.trim());
  }

  function processarPIXString(str) {
    const dados = _parsePIX(str);

    if (!dados) {
      if (typeof showToast === 'function') showToast('⚠️ QR Code PIX não reconhecido', 'warning');
      return;
    }

    // Pré-preencher formulário principal
    if (dados.descricao || dados.nome) {
      const descEl = document.getElementById('tx-desc');
      if (descEl) {
        descEl.value = dados.descricao || dados.nome || 'PIX';
        if (typeof autoCategoria === 'function') autoCategoria(descEl.value);
      }
    }

    if (dados.valor) {
      const valEl = document.getElementById('tx-valor');
      if (valEl) valEl.value = dados.valor.toFixed(2);
    }

    // Tipo = despesa (pagamento via PIX)
    if (typeof setTipo === 'function') setTipo('despesa');

    // Ir para dashboard para confirmar
    if (typeof switchTab === 'function') switchTab(null, 'dashboard');

    const msg = dados.nome
      ? `✅ PIX de ${dados.nome}${dados.valor ? ' — R$ ' + dados.valor.toFixed(2) : ''} pré-preenchido!`
      : '✅ PIX processado! Confira os dados.';
    if (typeof showToast === 'function') showToast(msg, 'success');
  }

  /* ─── Render painel Open Finance ────────────────────────────────────── */
  function renderOpenFinance() {
    const el = document.getElementById('open-finance-panel');
    if (!el) return;

    el.innerHTML = `
      <div class="of-section">
        <h3 class="of-titulo">📷 Pagar/Registrar via QR Code PIX</h3>
        <p class="of-desc">Aponte a câmera para um QR Code PIX para pré-preencher automaticamente o valor e a descrição da transação.</p>
        <div id="pix-scanner-area"></div>
        <div class="of-pix-btns">
          <button class="btn btn-primary" onclick="iniciarScannerPIX()">📷 Escanear QR PIX</button>
          <button class="btn btn-outline" onclick="mostrarInputManualPIX()">⌨️ Colar Código PIX</button>
        </div>
        <div id="pix-manual-area" style="display:none;margin-top:12px;">
          <textarea id="pix-manual-input" class="form-control" rows="4" placeholder="Cole aqui o código PIX Copia e Cola..."></textarea>
          <button class="btn btn-primary" style="margin-top:8px;" onclick="processarPIXManual()">✅ Processar</button>
        </div>
      </div>

      <div class="of-section of-roadmap">
        <h3 class="of-titulo">🏦 Open Finance — Roadmap</h3>
        <p class="of-desc">Conecte suas contas bancárias automaticamente via Open Finance (Banco Central do Brasil).</p>
        <div class="of-status-grid">
          ${[
            { banco: '🟣 Nubank', status: 'Em breve', cor: '#6366f1' },
            { banco: '🟠 Itaú', status: 'Em breve', cor: '#f97316' },
            { banco: '🔴 Bradesco', status: 'Em breve', cor: '#ef4444' },
            { banco: '🔵 Banco do Brasil', status: 'Em breve', cor: '#3b82f6' },
            { banco: '🟤 Caixa', status: 'Em breve', cor: '#78350f' },
            { banco: '🔴 Santander', status: 'Em breve', cor: '#dc2626' },
            { banco: '🟠 Inter', status: 'Em breve', cor: '#ea580c' },
            { banco: '⚫ C6 Bank', status: 'Em breve', cor: '#374151' },
          ].map(b => `
            <div class="of-banco-card" style="border-color:${b.cor}20">
              <span class="of-banco-nome">${b.banco}</span>
              <span class="of-banco-status" style="background:${b.cor}20;color:${b.cor}">${b.status}</span>
            </div>`
          ).join('')}
        </div>
        <div class="of-notice">
          <strong>ℹ️ Como funciona:</strong> O Open Finance BR (regulamentado pelo BACEN) permite compartilhar
          seus extratos bancários diretamente com o FinançasPro, sem precisar de CSV.
          A integração será disponibilizada conforme as APIs dos bancos ficarem disponíveis.
        </div>
        <button class="btn btn-outline of-notif-btn" onclick="inscreverOpenFinance()">🔔 Me avise quando disponível</button>
        <div id="of-notif-confirmacao" style="display:none;" class="of-notif-ok">
          ✅ Você será notificado quando o Open Finance estiver disponível!
        </div>
      </div>
    `;
  }

  function mostrarInputManualPIX() {
    const el = document.getElementById('pix-manual-area');
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }

  function inscreverOpenFinance() {
    localStorage.setItem('fp_of_inscrito', '1');
    const el = document.getElementById('of-notif-confirmacao');
    if (el) el.style.display = 'block';
    const btn = document.querySelector('.of-notif-btn');
    if (btn) btn.style.display = 'none';
  }

  window.iniciarScannerPIX = iniciarScannerPIX;
  window.pararScannerPIX = pararScannerPIX;
  window.processarPIXManual = processarPIXManual;
  window.processarPIXString = processarPIXString;
  window.mostrarInputManualPIX = mostrarInputManualPIX;
  window.renderOpenFinance = renderOpenFinance;
  window.inscreverOpenFinance = inscreverOpenFinance;
  window._parsePIX = _parsePIX;

})();
