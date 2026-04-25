-- ══════════════════════════════════════════════════════════════
-- FinançasPro — Row Level Security (RLS) para Supabase
-- Executar no Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════
-- INSTRUÇÕES:
-- 1. Abrir https://supabase.com/dashboard/project/<seu-projeto>/sql
-- 2. Colar e executar este script completo
-- 3. Verificar em Authentication → Policies que todas as policies aparecem
-- ══════════════════════════════════════════════════════════════

-- ── 1. Habilitar RLS em todas as tabelas ─────────────────────
ALTER TABLE IF EXISTS public.perfis         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dados_usuario  ENABLE ROW LEVEL SECURITY;

-- ── 2. Remover policies antigas (idempotente) ─────────────────
DROP POLICY IF EXISTS "perfis_select_own"  ON public.perfis;
DROP POLICY IF EXISTS "perfis_insert_own"  ON public.perfis;
DROP POLICY IF EXISTS "perfis_update_own"  ON public.perfis;
DROP POLICY IF EXISTS "perfis_delete_own"  ON public.perfis;

DROP POLICY IF EXISTS "dados_select_own"   ON public.dados_usuario;
DROP POLICY IF EXISTS "dados_insert_own"   ON public.dados_usuario;
DROP POLICY IF EXISTS "dados_update_own"   ON public.dados_usuario;
DROP POLICY IF EXISTS "dados_delete_own"   ON public.dados_usuario;

-- ── 3. TABELA: perfis ─────────────────────────────────────────
-- Cada usuário só lê, cria e edita o próprio perfil

CREATE POLICY "perfis_select_own"
  ON public.perfis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "perfis_insert_own"
  ON public.perfis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "perfis_update_own"
  ON public.perfis FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "perfis_delete_own"
  ON public.perfis FOR DELETE
  USING (auth.uid() = user_id);

-- ── 4. TABELA: dados_usuario ──────────────────────────────────
-- Cada usuário só acessa seus próprios dados financeiros

CREATE POLICY "dados_select_own"
  ON public.dados_usuario FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "dados_insert_own"
  ON public.dados_usuario FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dados_update_own"
  ON public.dados_usuario FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dados_delete_own"
  ON public.dados_usuario FOR DELETE
  USING (auth.uid() = user_id);

-- ── 5. Garantir que service_role ignora RLS (padrão Supabase) ─
-- (service_role key NUNCA deve ser exposta no cliente frontend)
-- Usar apenas em Edge Functions server-side.

-- ── 6. Verificação ───────────────────────────────────────────
-- Executar após aplicar e verificar resultado:
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_ativo
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('perfis', 'dados_usuario');

-- Listar todas as policies criadas:
SELECT
  tablename,
  policyname,
  cmd AS operacao,
  qual AS condicao
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('perfis', 'dados_usuario')
ORDER BY tablename, policyname;

-- ══════════════════════════════════════════════════════════════
-- PRÓXIMOS PASSOS (fazer manualmente no Supabase Dashboard):
-- 1. Authentication → Settings → Rate Limits:
--    - Email signups per hour: 10
--    - Login attempts per 5 min: 5 (habilitar CAPTCHA hCaptcha)
-- 2. Authentication → Email Templates:
--    - Personalizar template de confirmação de e-mail
-- 3. Authentication → Settings → Session:
--    - JWT expiry: 3600 (1 hora)
--    - Refresh token rotation: ENABLED
--    - Reuse interval: 10 seconds
-- ══════════════════════════════════════════════════════════════
