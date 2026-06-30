// backend/lib/authCookies.js — cookies HttpOnly para tokens JWT
import CONFIG from '../config.js';
import { parseDurationMs } from './jwt.js';

export const ACCESS_COOKIE = 'fp_access_token';
export const REFRESH_COOKIE = 'fp_refresh_token';

export function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie;
  if (!header) return out;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  });
  return out;
}

function baseAttrs(maxAgeSec, cookiePath = '/') {
  const parts = [
    `Path=${cookiePath}`,
    'HttpOnly',
    `SameSite=${CONFIG.auth.cookieSameSite || 'Lax'}`,
    `Max-Age=${maxAgeSec}`,
  ];
  if (CONFIG.isProd) parts.push('Secure');
  return parts.join('; ');
}

export function setAuthCookies(res, tokens) {
  const accessMax = Math.max(60, Math.floor(parseDurationMs(CONFIG.auth.accessExpiresIn) / 1000));
  const refreshMax = Math.max(3600, Math.floor(parseDurationMs(CONFIG.auth.refreshExpiresIn) / 1000));

  res.append(
    'Set-Cookie',
    `${ACCESS_COOKIE}=${encodeURIComponent(tokens.accessToken)}; ${baseAttrs(accessMax)}`,
  );
  res.append(
    'Set-Cookie',
    `${REFRESH_COOKIE}=${encodeURIComponent(tokens.refreshToken)}; ${baseAttrs(refreshMax, '/api/v1/auth')}`,
  );
}

export function clearAuthCookies(res) {
  const secure = CONFIG.isProd ? '; Secure' : '';
  res.append('Set-Cookie', `${ACCESS_COOKIE}=; Path=/; HttpOnly; Max-Age=0${secure}`);
  res.append(
    'Set-Cookie',
    `${REFRESH_COOKIE}=; Path=/api/v1/auth; HttpOnly; Max-Age=0${secure}`,
  );
}

export function getAccessToken(req) {
  const cookies = parseCookies(req);
  if (cookies[ACCESS_COOKIE]) return cookies[ACCESS_COOKIE];
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export function getRefreshToken(req) {
  const cookies = parseCookies(req);
  if (cookies[REFRESH_COOKIE]) return cookies[REFRESH_COOKIE];
  return req.body?.refreshToken || '';
}
