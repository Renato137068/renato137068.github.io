// FinancasPro - Service Worker (PWA offline-first, stale-while-revalidate)

const CACHE_NAME = 'financaspro-v11.1-swr';
const urlsParaCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/design-system.css',
  '/css/critical-inline.css',
  '/css/style.css',
  '/js/utilities/focus-trap.js',
  '/js/utilities/aria-live.js',
  '/js/pin-guard.js',
  '/js/core/config.js',
  '/js/core/utils.js',
  '/js/core/domUtils.js',
  '/js/core/dom-safe.js',
  '/js/core/validations.js',
  '/js/core/events-catalog.js',
  '/js/core/event-bus.js',
  '/js/core/dados.js',
  '/js/core/store.js',
  '/js/core/lifecycle.js',
  '/js/categories.js',
  '/js/categorizador.js',
  '/js/auto-categorizer.js',
  '/js/aprendizado.js',
  '/js/parser.js',
  '/js/score.js',
  '/js/pipeline.js',
  '/js/services/actions.js',
  '/js/services/transactionService.js',
  '/js/services/budgetService.js',
  '/js/services/healthService.js',
  '/js/transacoes.js',
  '/js/contas.js',
  '/js/orcamento.js',
  '/js/automacao.js',
  '/js/render-core.js',
  '/js/components/_base.js',
  '/js/components/EmptyState.js',
  '/js/components/ProgressBar.js',
  '/js/components/ComparacaoMes.js',
  '/js/components/CardTransacao.js',
  '/js/components/CardOrcamento.js',
  '/js/components/AlertaCard.js',
  '/js/components/LegendaChart.js',
  '/js/components/BarChart6M.js',
  '/js/components/DonutChart.js',
  '/js/components/Indicador.js',
  '/js/render-dashboard.js',
  '/js/render.js',
  '/js/ai-engine.js',
  '/js/previsao.js',
  '/js/alertas.js',
  '/js/ocr.js',
  '/js/insights.js',
  '/js/config-user.js',
  '/js/pin.js',
  '/js/authController.js',
  '/js/app-bootstrap.js',
  '/js/modules/init-navigation.js',
  '/js/modules/init-modals.js',
  '/js/modules/init-form.js',
  '/js/modules/init-extrato.js',
  '/js/modules/init-config.js',
  '/js/init.js',
  '/js/shortcuts.js',
  '/js/sw-register.js',
  '/js/skeleton.js',
  '/js/onboarding.js',
  '/js/micro-interactions.js',
  '/icons/logo.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsParaCache).catch(() => {})),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames.map((name) => (name !== CACHE_NAME ? caches.delete(name) : null)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event && event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isOrigem = url.origin === self.location.origin;
  const isNavigation = event.request.mode === 'navigate';
  const isApi = isOrigem && url.pathname.startsWith('/api/');

  if (isApi) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (!isOrigem) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || new Response('Offline', { status: 503 }))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => null);

      if (cached) {
        networkFetch.catch(() => {});
        return cached;
      }

      return networkFetch.then((res) => {
        if (res) return res;
        if (isNavigation) return caches.match('/index.html');
        return new Response('Offline', { status: 503 });
      });
    }),
  );
});
