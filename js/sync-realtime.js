(function () {
  'use strict';

  /* ─── P4.5 · Sync Supabase Realtime + Fila Offline ──────────────────── */

  const QUEUE_KEY = 'fp_sync_queue';
  const SYNC_STATUS_KEY = 'fp_sync_status';

  let _canal = null;
  let _online = navigator.onLine;
  let _syncEmAndamento = false;

  /* ─── Fila offline ──────────────────────────────────────────────────── */
  function _getQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
    catch(e) { return []; }
  }

  function _setQueue(q) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    _atualizarIndicador();
  }

  function enfileirarSync(operacao, dados) {
    const q = _getQueue();
    q.push({ operacao, dados, ts: Date.now(), id: Math.random().toString(36).slice(2) });
    _setQueue(q);
  }

  /* ─── Flush da fila ─────────────────────────────────────────────────── */
  async function flushQueue() {
    if (_syncEmAndamento || !_online) return;
    const q = _getQueue();
    if (q.length === 0) return;

    // Verificar se Supabase está disponível
    if (typeof supabase === 'undefined' || typeof usuarioAtual === 'undefined' || !usuarioAtual) return;

    _syncEmAndamento = true;
    _setStatus('syncing');
    let falhas = [];

    for (const item of q) {
      try {
        if (item.operacao === 'upsert_tx') {
          const { error } = await supabase.from('transactions').upsert({
            ...item.dados, user_id: usuarioAtual.id
          });
          if (error) throw error;
        } else if (item.operacao === 'delete_tx') {
          const { error } = await supabase.from('transactions').delete()
            .eq('id', item.dados.id).eq('user_id', usuarioAtual.id);
          if (error) throw error;
        }
      } catch (e) {
        falhas.push(item);
      }
    }

    _setQueue(falhas);
    _syncEmAndamento = false;
    _setStatus(falhas.length === 0 ? 'synced' : 'error');

    if (falhas.length === 0 && q.length > 0) {
      if (typeof showToast === 'function') showToast('☁️ Dados sincronizados!', 'success');
    }
  }

  /* ─── Canal Realtime ────────────────────────────────────────────────── */
  function iniciarRealtime() {
    if (typeof supabase === 'undefined' || typeof usuarioAtual === 'undefined' || !usuarioAtual) return;
    if (_canal) { supabase.removeChannel(_canal); }

    _canal = supabase
      .channel('financaspro-sync-' + usuarioAtual.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: 'user_id=eq.' + usuarioAtual.id
      }, _handleRemoteChange)
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          _setStatus('synced');
          console.log('[Realtime] Conectado');
        } else if (status === 'CHANNEL_ERROR') {
          _setStatus('error');
        }
      });
  }

  function _handleRemoteChange(payload) {
    const { eventType, new: nova, old: antiga } = payload;
    if (typeof transacoes === 'undefined') return;

    if (eventType === 'INSERT') {
      if (!transacoes.find(t => t.id === nova.id)) {
        transacoes.unshift({ ...nova });
        if (typeof renderTudo === 'function') renderTudo();
        _atualizarIndicador();
      }
    } else if (eventType === 'UPDATE') {
      const idx = transacoes.findIndex(t => t.id === nova.id);
      if (idx >= 0) {
        transacoes[idx] = { ...nova };
        if (typeof renderTudo === 'function') renderTudo();
      }
    } else if (eventType === 'DELETE') {
      const len = transacoes.length;
      if (typeof transacoes !== 'undefined') {
        for (let i = transacoes.length - 1; i >= 0; i--) {
          if (transacoes[i].id === antiga.id) transacoes.splice(i, 1);
        }
        if (transacoes.length !== len && typeof renderTudo === 'function') renderTudo();
      }
    }
  }

  /* ─── Status indicator ──────────────────────────────────────────────── */
  function _setStatus(s) {
    localStorage.setItem(SYNC_STATUS_KEY, s);
    _atualizarIndicador();
  }

  function _atualizarIndicador() {
    const el = document.getElementById('sync-status-indicator');
    if (!el) return;
    const status = localStorage.getItem(SYNC_STATUS_KEY) || 'idle';
    const queue = _getQueue();
    const pendentes = queue.length;

    const config = {
      synced:  { icon: '☁️', label: 'Sincronizado', cls: 'sync-ok' },
      syncing: { icon: '🔄', label: 'Sincronizando…', cls: 'sync-loading' },
      error:   { icon: '⚠️', label: 'Erro de sync', cls: 'sync-error' },
      offline: { icon: '📴', label: 'Offline', cls: 'sync-offline' },
      idle:    { icon: '💾', label: 'Local', cls: 'sync-idle' },
    };
    const c = config[_online ? status : 'offline'];
    el.className = 'sync-status-badge ' + c.cls;
    el.innerHTML = c.icon + ' ' + c.label + (pendentes > 0 ? ` (${pendentes} pendente${pendentes>1?'s':''})` : '');
  }

  /* ─── Eventos online/offline ────────────────────────────────────────── */
  window.addEventListener('online', () => {
    _online = true;
    _setStatus('syncing');
    flushQueue();
    iniciarRealtime();
  });

  window.addEventListener('offline', () => {
    _online = false;
    _setStatus('offline');
    _atualizarIndicador();
  });

  /* ─── Init após autenticação ────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
      iniciarRealtime();
      flushQueue();
      _atualizarIndicador();
    }, 3000);
  });

  window.iniciarRealtime = iniciarRealtime;
  window.flushQueue = flushQueue;
  window.enfileirarSync = enfileirarSync;
  window.getSyncQueue = _getQueue;

})();
