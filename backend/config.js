// backend/config.js — configuração centralizada (ESM)
import 'dotenv/config';

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

function required(key) {
  const value = process.env[key];
  if (!value && isProd) throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
  return value;
}

const CONFIG = {
  env,
  isProd,
  port: parseInt(process.env.PORT) || 4000,

  database: {
    url: process.env.DATABASE_URL || 'postgresql://financaspro:changeme@localhost:5432/financaspro',
  },

  auth: {
    accessSecret: isProd
      ? required('JWT_ACCESS_SECRET')
      : (process.env.JWT_ACCESS_SECRET || 'dev-access-secret'),
    refreshSecret: isProd
      ? required('JWT_REFRESH_SECRET')
      : (process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    cookieSameSite: process.env.COOKIE_SAME_SITE || 'Lax',
    pbkdf2Iterations: parseInt(process.env.PBKDF2_ITERATIONS) || 100000,
    saltLength: 16,
    issuer: process.env.JWT_ISSUER || 'financaspro-api',
    audience: process.env.JWT_AUDIENCE || 'financaspro-client',
    loginMaxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS) || 5,
    loginLockoutMs: parseInt(process.env.LOGIN_LOCKOUT_MS) || 15 * 60 * 1000,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || (isProd ? null : '*'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    credentials: true,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 60,
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 10,
  },

  logging: {
    level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
    pretty: !isProd,
  },

  pagination: {
    defaultLimit: 50,
    maxLimit: 200,
  },

  // Fase 10 — Redis + Filas
  redis: {
    url: process.env.REDIS_URL || null,
  },

  // Fase 10 — Stripe
  stripe: {
    secretKey:     process.env.STRIPE_SECRET_KEY || null,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
  },

  // Fase 10 — E-mail (SMTP)
  email: {
    host:   process.env.SMTP_HOST || null,
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user:   process.env.SMTP_USER || null,
    pass:   process.env.SMTP_PASS || null,
    from:   process.env.SMTP_FROM || 'FinançasPro <noreply@financaspro.com.br>',
  },

  // Fase 10 — URL pública do app (usada em e-mails e portal Stripe)
  appUrl: process.env.APP_URL || 'http://localhost:4000',
};

export default CONFIG;
