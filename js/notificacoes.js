// FinançasPro — P2.12 Notificações (Web Notifications API + lembretes locais)
// Usa Notification API nativa (não requer servidor Push para lembretes locais)
// Para push server-side, o service worker sw.js já tem o handler 'push'

(function() {
  'use strict';

  const _STORAGE_KEY = 'fp_notif_config';
  let _config = { lembretes: true, resumoDiario: false, vencimentos: true, hora: '09:00' };
  let _timerID  = null;

  // ── Persistência ────────────────────────────────────────────
  function _carregar() {
    try {
      const s = localStorage.getItem(_STORAGE_KEY);
      if (s) _config = { ..._config, ...JSON.parse(s) };
    } catch(e) {}
  }

  function _salvar() {
    localStorage.setItem(_STORAGE_KEY, JSON.stringify(_config));
  }

  // ── Solicitar permissão ─────────────────────────────────────
  async function solicitarPermissaoNotif() {
    if (!('Notification' in window)) {
      if (typeof mostrarToast === 'function') mostrarToast('Notificações não suportadas neste navegador.', 'warn');
      return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      if (typeof mostrarToast === 'function') mostrarToast('Notificações bloqueadas. Habilite nas configurações do navegador.', 'warn');
      return false;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      if (typeof mostrarToast === 'function') mostrarToast('Notificações ativadas! 🔔', 'success');
      _iniciarAgendamento();
      return true;
    }
    return false;
  }
  window.solicitarPermissaoNotif = solicitarPermissaoNotif;

  // ── Disparar notificação local ──────────────────────────────
  function notificar(titulo, corpo, icon) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = new Notification(titulo, {
      body: corpo,
      icon: icon || 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'fp-lembrete'
    });
    n.onclick = () => { window.focus(); n.close(); };
    setTimeout(() => n.close(), 8000);
  }
  window.notificar = notificar;

  // ── Verificar vencimentos próximos ──────────────────────────
  function _checarVencimentos() {
    if (!_config.vencimentos) return;
    try {
      const vencs = JSON.parse(localStorage.getItem('fp_vencimentos') || '[]');
      const hoje  = new Date().getDate();
      const proximos = vencs.filter(v => v.dia === hoje + 1 || v.dia === hoje + 3 || v.dia === hoje);
      proximos.forEach(v => {
        const dias = v.dia - hoje;
        const msg  = dias === 0
          ? 'Vence HOJE: ' + v.descricao
          : 'Vence em ' + dias + ' dia(s): ' + v.descricao + (v.valor ? ' (R$ ' + parseFloat(v.valor).toFixed(2) + ')' : '');
        notificar('📅 FinançasPro — Vencimento', msg);
      });
    } catch(e) {}
  }

  // ── Resumo diário ───────────────────────────────────────────
  function _resumoDiario() {
    if (!_config.resumoDiario) return;
    const mes = new Date().toISOString().slice(0,7);
    const tx  = (typeof transacoes !== 'undefined' ? transacoes : []).filter(t => t.data && t.data.startsWith(mes));
    const rec  = tx.filter(t => t.tipo === 'receita').reduce((s,t) => s+t.valor, 0);
    const desp = tx.filter(t => t.tipo === 'despesa').reduce((s,t) => s+t.valor, 0);
    const saldo = rec - desp;
    notificar(
      '📊 FinançasPro — Resumo do mês',
      'Receitas: R$ ' + rec.toFixed(2) + ' | Despesas: R$ ' + desp.toFixed(2) + ' | Saldo: ' + (saldo>=0?'+':'') + 'R$ ' + saldo.toFixed(2)
    );
  }

  // ── Lembrete de lançamento ──────────────────────────────────
  function _lembreteRegistro() {
    if (!_config.lembretes) return;
    const hoje  = new Date().toISOString().slice(0,10);
    const temHoje = (typeof transacoes !== 'undefined' ? transacoes : []).some(t => t.data === hoje);
    if (!temHoje) {
      notificar('💰 FinançasPro — Lembrete', 'Você ainda não registrou nenhuma transação hoje. Mantenha seu controle em dia!');
    }
  }

  // ── Agendamento local (checar a cada hora) ──────────────────
  function _iniciarAgendamento() {
    if (_timerID) clearInterval(_timerID);
    // Checar imediatamente
    _checarVencimentos();
    // Depois a cada hora
    _timerID = setInterval(() => {
      const agora = new Date();
      const [h, m] = (_config.hora || '09:00').split(':').map(Number);
      if (agora.getHours() === h && agora.getMinutes() < 5) {
        _checarVencimentos();
        _resumoDiario();
        _lembreteRegistro();
      }
    }, 60 * 1000); // checar a cada minuto
  }

  // ── UI: salvar configuração de notificações ─────────────────
  function salvarConfigNotif() {
    const lem  = document.getElementById('notif-lembretes');
    const res  = document.getElementById('notif-resumo');
    const venc = document.getElementById('notif-vencimentos');
    const hora = document.getElementById('notif-hora');
    if (lem)  _config.lembretes    = lem.checked;
    if (res)  _config.resumoDiario = res.checked;
    if (venc) _config.vencimentos  = venc.checked;
    if (hora) _config.hora         = hora.value;
    _salvar();
    if (typeof mostrarToast === 'function') mostrarToast('Configuração de notificações salva!', 'success');
  }
  window.salvarConfigNotif = salvarConfigNotif;

  // ── Render UI no painel de configurações ────────────────────
  function renderNotifConfig() {
    const el = document.getElementById('notif-config-panel');
    if (!el) return;

    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const permLabel = { granted: '\u2705 Permitidas', denied: '\u274c Bloqueadas', default: '\u23f3 N\u00e3o solicitadas', unsupported: '\u26a0\ufe0f Sem suporte' }[perm] || perm;

    // DOM seguro
    el.textContent = '';

    const statusDiv = document.createElement('div');
    statusDiv.className = 'notif-status';
    statusDiv.appendChild(document.createTextNode('Status: '));
    const strong = document.createElement('strong');
    strong.textContent = permLabel;
    statusDiv.appendChild(strong);

    if (perm !== 'granted') {
      statusDiv.appendChild(document.createTextNode(' \u2014 '));
      const btnAtivar = document.createElement('button');
      btnAtivar.className = 'btn btn-sm btn-primary';
      btnAtivar.textContent = 'Ativar notifica\u00e7\u00f5es';
      btnAtivar.addEventListener('click', function(){ solicitarPermissaoNotif().then(renderNotifConfig); });
      statusDiv.appendChild(btnAtivar);
    }
    el.appendChild(statusDiv);

    if (perm === 'granted') {
      const opcoes = document.createElement('div');
      opcoes.className = 'notif-opcoes';

      function mkCheck(id, checked, texto) {
        const lbl = document.createElement('label');
        lbl.className = 'notif-label';
        const inp = document.createElement('input');
        inp.type = 'checkbox'; inp.id = id; inp.checked = checked;
        lbl.appendChild(inp);
        lbl.appendChild(document.createTextNode(' ' + texto));
        return lbl;
      }

      opcoes.appendChild(mkCheck('notif-lembretes', _config.lembretes, 'Lembrete di\u00e1rio de lan\u00e7amento'));
      opcoes.appendChild(mkCheck('notif-resumo', _config.resumoDiario, 'Resumo financeiro di\u00e1rio'));
      opcoes.appendChild(mkCheck('notif-vencimentos', _config.vencimentos, 'Alerta de vencimentos'));

      const fgHora = document.createElement('div');
      fgHora.className = 'form-group'; fgHora.style.marginTop = '8px';
      const lblHora = document.createElement('label');
      lblHora.c