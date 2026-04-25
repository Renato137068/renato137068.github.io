(function () {
  'use strict';

  /* ─── P4.7 · Offline-First: IndexedDB Queue + Background Sync ───────── */

  const DB_NAME = 'FinancasProDB';
  const DB_VER  = 1;
  const STORE_TX = 'pending_transactions';

  let _db = null;

  /* ─── IndexedDB setup ───────────────────────────────────────────────── */
  function _openDB() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_TX)) {
          const store = db.createObjectStore(STORE_TX, { keyPath: 'queueId' });
          store.createIndex('ts', 'ts');
        }
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror = e => reject(e.target.error);
    });
  }

  async function enfileirarTransacao(operacao, dados) {
    try {
      const db = await _openDB();
      const tx = db.transaction(STORE_TX, 'readwrite');
      tx.objectStore(STORE_TX).add({
        queueId: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        operacao,
        dados,
        ts: Date.now()
      });
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });

      // Solicitar background sync se disponível
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register('sync-transactions').catch(() => {});
      }
    } catch(e) {
      console.warn('[OfflineQueue] IndexedDB error:', e);
      // Fallback: localStorage
      if (typeof enfileirarSync === 'function') enfileirarSync(operacao, dados);
    }
  }

  async function getPendingQueue() {
    try {
      const db = await _openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_TX, 'readonly');
        const req = tx.objectStore(STORE_TX).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch(e) { return []; }
  }

  async function limparQueue() {
    try {
      const db = await _openDB();
      const tx = db.transaction(STORE_TX, 'readwrite');
      tx.objectStore(STORE_TX).clear();
    } catch(e) {}
  }

  async function removerDaQueue(queueId) {
    try {
      const db = await _openDB();
      const tx = db.transaction(STORE_TX, 'readwrite');
      tx.objectStore(STORE_TX).delete(queueId);
    } catch(e) {}
  }

  /* ─── Flush manual ──────────────────────────────────────────────────── */
  async function flushOfflineQueue() {
    if (typeof supabase === 'undefined' || typeof usuarioAtual === 'undefined' || !usuarioAtual) return;
    if (!navigator.onLine) return;

    const pending = await getPendingQueue();
    if (pending.length === 0) return;

    let ok = 0;
    for (const item of pending) {
      try {
        if (item.operacao === 'upsert_tx') {
          const { error } = await supabase.from('transactions')
            .upsert({ ...item.dados, user_id: usuarioAtual.id });
          if (!error) { await removerDaQueue(item.queueId); ok++; }
        } else if (item.operacao === 'delete_tx') {
          const { error } = await supabase.from('transactions').delete()
            .eq('id', item.dados.id).eq('user_id', usuarioAtual.id);
          if (!error) { await removerDaQueue(item.queueId); ok++; }
        }
      } catch(e) {}
    }

    if (ok > 0 && typeof showToast === 'function') {
      showToast('☁️ ' + ok + ' operação(ões) sincronizada(s) com sucesso!', 'success');
    }
    _atualizarBadgeQueue();
  }

  async function _atualizarBadgeQueue() {
    const pending = await getPendingQueue();
    const el = document.getElementById('offline-queue-badge');
    if (!el) return;
    if (pending.length === 0) { el.style.display = 'none'; return; }
    el.style.display = 'inline-flex';
    el.textContent = pending.length + ' pendente' + (pending.length > 1 ? 's' : '');
  }

  /* ─── Install prompt ────────────────────────────────────────────────── */
  let _installPrompt = null;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _installPrompt = e;
    const btn = document.getElementById('btn-instalar-pwa');
    if (btn) { btn.style.display = 'flex'; }
  });

  window.addEventListener('appinstalled', () => {
    _installPrompt = null;
    const btn = document.getElementById('btn-instalar-pwa');
    if (btn) btn.style.display = 'none';
    if (typeof showToast === 'function') showToast('🎉 App instalado com sucesso!', 'achievement');
    if (typeof ganharCoins === 'function') ganharCoins(100, 'pwa-instalado');
  });

  function mostrarInstallPrompt() {
    if (!_installPrompt) {
      if (typeof showToast === 'function') showToast('💡 Use o menu do navegador para instalar o app', 'info');
      return;
    }
    _installPrompt.prompt();
    _installPrompt.userChoice.then(r => {
      if (r.outcome === 'accepted') {
        _installPrompt = null;
      }
    });
  }

  /* ─── Periodic Background Sync (cotações) ───────────────────────────── */
  async function registrarPeriodicSync() {
    if (!('serviceWorker' in navigator) || !('periodicSync' in ServiceWorkerRegistration.prototype)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (perm.state === 'granted') {
        await reg.periodicSync.register('atualizar-cotacoes', { minInterval: 3600 * 1000 });
        console.log('[PWA] Periodic sync registrado');
      }
    } catch(e) {}
  }

  /* ─── Init ──────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    _openDB().catch(() => {});
    _atualizarBadgeQueue();
    registrarPeriodicSync();

    // Flush ao voltar online
    window.addEventListener('online', () => {
      setTimeout(flushOfflineQueue, 1000);
    });

    // Verificar badge ao abrir
    setTimeout(_atualizarBadgeQueue, 2000);
  });

  window.enfileirarTransacao = enfileirarTransacao;
  window.getPendingQueue = getPendingQueue;
  window.flushOfflineQueue = flushOfflineQueue;
  window.mostrarInstallPrompt = mostrarInstallPrompt;

})();
