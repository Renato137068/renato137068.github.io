// backend/server.js — servidor Express enterprise (Fase 5+)
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import CONFIG from './config.js';
import logger from './lib/logger.js';
import prisma from './lib/db.js';
import redis from './lib/redis.js';
import { closeAllQueues } from './lib/queue.js';
import { startWorkers, stopWorkers } from './workers/index.js';
import { appErrorsTotal, activeConnections } from './lib/metrics.js';
import { requestLogger, addTraceContext } from './middleware/requestLogger.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import apiRouter from './routes/index.js';
import healthRouter from './routes/health.js';
import { BillingService } from './domain/services/billing.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR  = path.join(__dirname, '..');

const app = express();

// ─── Trust Proxy ─────────────────────────────────────────────────────────────
// Necessário para que req.ip reflita o IP real atrás de load balancers/proxies
// e para que os rate limiters baseados em IP funcionem corretamente.
app.set('trust proxy', 1);

// ─── Segurança ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: CONFIG.isProd ? undefined : false,
}));

// ─── CORS manual (compatível com credenciais) ─────────────────────────────────
// Access-Control-Allow-Credentials não é enviado com origin '*' — spec CORS.
app.use((req, res, next) => {
  const origin  = req.headers.origin;
  const allowed = CONFIG.cors.origin;

  if (allowed === '*') {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', CONFIG.cors.methods.join(','));
    res.setHeader('Access-Control-Allow-Headers', CONFIG.cors.allowedHeaders.join(', '));
  } else if (origin && origin === allowed) {
    res.setHeader('Access-Control-Allow-Origin',      origin);
    res.setHeader('Access-Control-Allow-Methods',     CONFIG.cors.methods.join(','));
    res.setHeader('Access-Control-Allow-Headers',     CONFIG.cors.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Trace context + Request ID ──────────────────────────────────────────────
// Deve ser o primeiro middleware de aplicação: cria traceId/spanId, configura
// AsyncLocalStorage (todos os logs emitidos dentro da request incluem esses IDs
// automaticamente) e registra métricas HTTP no evento 'finish'.
app.use(addTraceContext);
app.use(requestLogger);

// ─── Rate limit global ────────────────────────────────────────────────────────
app.use(globalLimiter);

// ─── Stripe webhook (corpo raw — ANTES de express.json) ───────────────────────
app.post(
  '/api/v1/billing/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    try {
      const sig = req.headers['stripe-signature'];
      const result = await BillingService.handleWebhook(req.body, sig);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ─── Arquivos estáticos (frontend) ───────────────────────────────────────────
app.use(express.static(ROOT_DIR, {
  index: 'index.html',
  maxAge: '1h',
  setHeaders(res, filePath) {
    if (/\.(png|jpe?g|svg|ico|webp)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  },
}));

// ─── Rotas ────────────────────────────────────────────────────────────────────
app.use('/', healthRouter);
app.use('/api/v1', apiRouter);

// SPA fallback — serve index.html para rotas desconhecidas não-API
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

// ─── Tratamento global de erros ───────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const status = err.status ?? err.statusCode ?? 500;

  // Erros operacionais (AppError) têm mensagem segura para expor ao cliente.
  const message = (err.isOperational || status < 500)
    ? err.message
    : 'Erro interno do servidor';

  const type = err.isOperational ? 'operational' : (status >= 500 ? 'unexpected' : '4xx');
  appErrorsTotal.inc({ type });

  logger.error({ err, traceId: req.traceId, userId: req.user?.id }, err.message);

  res.status(status).json({ error: message });
});

// ─── Inicialização ────────────────────────────────────────────────────────────
async function start() {
  try {
    await prisma.$connect();
    logger.info('Conexão com banco de dados estabelecida');

    // Redis + Workers (opcionais — falham silenciosamente se não configurados)
    await redis.connect();
    await startWorkers();

    const server = app.listen(CONFIG.port, () => {
      logger.info({ port: CONFIG.port, env: CONFIG.env }, 'FinançasPro API iniciada');
    });

    // Rastreia conexões ativas para a métrica active_connections
    server.on('connection', () => activeConnections.inc());
    server.on('close',      () => activeConnections.dec());

    const shutdown = async (signal) => {
      logger.info({ signal }, 'Encerrando servidor...');
      server.close(async () => {
        await stopWorkers();
        await closeAllQueues();
        redis.disconnect();
        await prisma.$disconnect();
        logger.info('Servidor encerrado com sucesso');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
  } catch (err) {
    logger.fatal({ err }, 'Falha ao iniciar servidor');
    await prisma.$disconnect();
    process.exit(1);
  }
}

// ─── Erros não capturados ─────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  appErrorsTotal.inc({ type: 'uncaught_exception' });
  logger.fatal({ err }, 'uncaughtException — encerrando processo');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  appErrorsTotal.inc({ type: 'unhandled_rejection' });
  logger.fatal({ err: reason }, 'unhandledRejection — encerrando processo');
  process.exit(1);
});

start();
