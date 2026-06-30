const fs = require('fs');
const path = require('path');

describe('security guardrails', () => {
  const root = path.join(__dirname, '..');

  test('refresh tokens are hashed before session lookup/storage', () => {
    const jwtLib = fs.readFileSync(path.join(root, 'backend/lib/jwt.js'), 'utf8');
    const sessionRepo = fs.readFileSync(
      path.join(root, 'backend/domain/repositories/session.repository.js'),
      'utf8',
    );

    expect(jwtLib).toContain('createHash');
    expect(jwtLib).toContain("digest('hex')");
    expect(sessionRepo).toContain('hashToken(refreshToken)');
  });

  test('service worker does not cache API responses', () => {
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

    expect(sw).toContain("url.pathname.startsWith('/api/')");
    expect(sw).toContain('event.respondWith(fetch(event.request))');
  });

  test('environment secrets are ignored by git', () => {
    const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');

    expect(gitignore).toMatch(/^\.env$/m);
    expect(gitignore).toContain('*.env.local');
  });

  test('auth sets HttpOnly cookies instead of exposing tokens to JS', () => {
    const authRoutes = fs.readFileSync(path.join(root, 'backend/routes/auth.js'), 'utf8');
    const authCookies = fs.readFileSync(path.join(root, 'backend/lib/authCookies.js'), 'utf8');
    const dados = fs.readFileSync(path.join(root, 'js/core/dados.js'), 'utf8');

    expect(authRoutes).toContain('setAuthCookies');
    expect(authCookies).toContain('HttpOnly');
    expect(dados).toContain('credentials: \'include\'');
    expect(dados).toContain('_limparTokensLegados');
  });

  test('stripe webhook is registered before JSON body parser', () => {
    const server = fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8');
    const webhookIdx = server.indexOf('/api/v1/billing/webhook');
    const jsonIdx = server.indexOf('app.use(express.json');

    expect(webhookIdx).toBeGreaterThan(-1);
    expect(jsonIdx).toBeGreaterThan(webhookIdx);
  });
});
