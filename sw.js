// FinançasPro — Service Worker v3
// Cache offline para funcionar sem internet
const CACHE_NAME = 'financaspro-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  // ── JS Core ──
  './js/config.js',
  './js/utils.js',
  './js/auth.js',
  './js/dados.js',
  './js/render.js',
  './js/init.js',
  './js/pwa.js',
  // ── JS Funcionalidades ──
  './js/trial.js',
  './js/gamificacao.js',
  './js/contas.js',
  './js/alertas.js',
  './js/categorias.js',
  './js/categorias-br.js',
  './js/categorias-custom.js',
  './js/graficos.js',
  './js/tour.js',
  './js/modal-edicao.js',
  './js/filtros.js',
  './js/orcamento5030.js',
  './js/atalhos.js',
  './js/dividas.js',
  './js/calendario.js',
  './js/investimentos.js',
  './js/relatorio.js',
  './js/relatorio-multimes.js',
  './js/notificacoes.js',
  './js/dica.js',
  './js/trilha.js',
  './js/calculadoras.js',
  './js/desafios.js',
  './js/temas.js',
  './js/compartilhar.js',
  './js/moedas.js',
  './js/parsers-csv.js',
  './js/recorrentes.js',
  './js/metas-avancadas.js',
  './js/insights.js',
  './js/sync-realtime.js',
  './js/irpf.js',
  './js/offline-queue.js',
  './js/open-finance.js',
  // ── Assets ──
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/logo.svg'
];

// Instala e faz cache dos assets estáticos
// NÃO chama skipWaiting() automaticamente — o usuário decide quando atualizar
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Remove caches antigos quando atualizar
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k \!== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estratégia: Stale-While-Revalidate para assets locais, Network Only para API
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Nunca cachear chamadas ao Supabase, BCB, Google OAuth ou CDN externo
  const url = e.request.url;
  if (url.includes('supabase.co') || url.includes('bcb.gov.br') ||
      url.includes('accounts.google') || url.includes('googleapis') ||
      url.includes('cdn.jsdelivr.net') ||
      url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      // Stale-while-revalidate: retorna cache imediatamente, atualiza em background
      const fetchPromise = fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => {
        // Offline: retorna index.html para navegação
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });

      return cached || fetchPromise;
    })
  );
});

// Recebe mensagem para forçar atualização do cache
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

// ── Push Notifications ───────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'FinançasPro', body: 'Lembrete financeiro!', icon: './icons/icon-192.png' };
  try {
    const payload = e.data ? e.data.json() : {};
    data = { ...data, ...payload };
  } catch(_) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'fp-notif',
      data: { url: data.url || './' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const url = e.notification.data?.url || './';
      for (const client of list) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
