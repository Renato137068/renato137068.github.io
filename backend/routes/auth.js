// backend/routes/auth.js — registro, login, refresh, logout
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateBody, registerSchema, loginSchema } from '../middleware/validate.js';
import { AuthService } from '../domain/services/auth.service.js';
import { setAuthCookies, clearAuthCookies, getRefreshToken, getAccessToken } from '../lib/authCookies.js';
import { verifyAccessToken } from '../lib/jwt.js';

const router = Router();

function clientMeta(req) {
  return {
    ipAddress: req.headers['x-forwarded-for'] ?? req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  };
}

// POST /api/v1/auth/register
router.post('/register', authLimiter, validateBody(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;
  const user = await AuthService.register(name, email, password, clientMeta(req));
  res.status(201).json({ data: user });
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password, clientMeta(req));
  setAuthCookies(res, result);
  res.json({
    data: {
      user: result.user,
      // Tokens via HttpOnly cookies — não expor ao JavaScript.
      accessToken: null,
      refreshToken: null,
    },
  });
});

// POST /api/v1/auth/refresh
router.post('/refresh', authLimiter, async (req, res) => {
  const refreshToken = getRefreshToken(req);
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token ausente' });
  }
  const tokens = await AuthService.refresh(refreshToken, clientMeta(req));
  setAuthCookies(res, tokens);
  res.json({
    data: {
      accessToken: null,
      refreshToken: null,
    },
  });
});

// POST /api/v1/auth/logout — limpa cookies mesmo sem sessão válida
router.post('/logout', async (req, res) => {
  const refreshToken = getRefreshToken(req);
  try {
    const accessToken = getAccessToken(req);
    if (accessToken && refreshToken) {
      const payload = verifyAccessToken(accessToken);
      await AuthService.logout(payload.sub, refreshToken, clientMeta(req));
    }
  } catch {
    // Sessão já expirada — apenas limpar cookies.
  }
  clearAuthCookies(res);
  res.json({ ok: true });
});

// GET /api/v1/auth/me
router.get('/me', authenticate, (req, res) => {
  const { id, name, email, role } = req.user;
  res.json({ data: { id, name, email, role } });
});

export default router;
