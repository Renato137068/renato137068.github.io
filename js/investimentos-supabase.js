// FinançasPro — Sincronização Supabase para Investimentos
// v11.0 — Integração cloud para módulo investimentos-avancado.js
// Depende de: auth.js (sb, currentUser), investimentos-avancado.js (_investimentos)

let _syncInProgress = false;
let _lastSyncTime = 0;
const SYNC_DEBOUNCE_MS = 2000; // Não sincronizar mais que 1x a cada 2s

// ════════════════════════════════════════════════════════
// 1. CARREGAR DO SUPABASE (primeira vez)
// ════════════════════════════════════════════════════════

async function carregarInvestimentosDoSupabase() {
  if (!sb || !currentUser) {
    console.log('[Investimentos Supabase] Supabase não disponível — skip');
    return [];
  }

  console.log('[Investimentos Supabase] 📥 Carregando do Supabase...');

  try {
    const { data, error } = await sb
      .from('investimentos')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Investimentos Supabase] Erro ao carregar:', error.message);
      return [];
    }

    // Converter snake_case do BD para camelCase do JS
    const investimentos = (data || []).map(row => ({
      id: row.id,
      tipo: row.tipo,
      descricao: row.descricao,
      valorInicial: parseFloat(row.valor_inicial),
      valorAtual: parseFloat(row.valor_atual),
      rentabilidadeEsperada: parseFloat(row.rentabilidade_esperada),
      dataAquisicao: row.data_aquisicao,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    console.log('[Investimentos Supabase] ✅ Carregados', investimentos.length, 'investimentos');
    return investimentos;
  } catch (err) {
    console.error('[Investimentos Supabase] Erro de rede:', err);
    return [];
  }
}

// ════════════════════════════════════════════════════════
// 2. SINCRONIZAR COM SUPABASE (upsert)
// ════════════════════════════════════════════════════════

async function sincronizarInvestimentosComSupabase() {
  if (!sb || !currentUser) {
    console.log('[Investimentos Supabase] Supabase não disponível — skip sync');
    return false;
  }

  // Debounce: não sincronizar muito frequentemente
  const agora = Date.now();
  if (_syncInProgress || (agora - _lastSyncTime) < SYNC_DEBOUNCE_MS) {
    console.log('[Investimentos Supabase] Sync em debounce...');
    return false;
  }

  _syncInProgress = true;
  _lastSyncTime = agora;

  try {
    const investimentos = getInvestimentos();

    if (investimentos.length === 0) {
      console.log('[Investimentos Supabase] Nenhum investimento para sincronizar');
      return true;
    }

    // Converter para formato Supabase (snake_case)
    const payload = investimentos.map(inv => ({
      id: inv.id,
      user_id: currentUser.id,
      tipo: inv.tipo,
      descricao: inv.descricao,
      valor_inicial: inv.valorInicial,
      valor_atual: inv.valorAtual,
      rentabilidade_esperada: inv.rentabilidadeEsperada,
      data_aquisicao: inv.dataAquisicao,
      created_at: inv.createdAt,
      updated_at: inv.updatedAt
    }));

    console.log('[Investimentos Supabase] ☁️ Sincronizando', payload.length, 'investimentos...');

    // Upsert: insere ou atualiza se já existe
    const { error } = await sb
      .from('investimentos')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('[Investimentos Supabase] Erro ao sincronizar:', error.message);
      return false;
    }

    console.log('[Investimentos Supabase] ✅ Sincronizado com sucesso');
    mostrarToast('☁️ Sincronizado com nuvem', 'success');
    return true;
  } catch (err) {
    console.error('[Investimentos Supabase] Erro de rede:', err);
    return false;
  } finally {
    _syncInProgress = false;
  }
}

window.sincronizarInvestimentosComSupabase = sincronizarInvestimentosComSupabase;

// ════════════════════════════════════════════════════════
// 3. LISTENER DE MUDANÇAS EM TEMPO REAL
// ════════════════════════════════════════════════════════

function inscreverAtualizacoesInTempo() {
  if (!sb || !currentUser) {
    console.log('[Investimentos Supabase] Supabase não disponível — sem sync realtime');
    return;
  }

  console.log('[Investimentos Supabase] 🔔 Inscrito em atualizações em tempo real...');

  // Inscrever-se em mudanças na tabela investimentos (do usuário)
  const subscription = sb
    .channel(`investimentos:${currentUser.id}`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'investimentos',
        filter: `user_id=eq.${currentUser.id}`
      },
      (payload) => {
        console.log('[Investimentos Supabase] 🔄 Mudança detectada:', payload.eventType);

        // Se mudança foi de outro dispositivo, recarregar
        if (payload.eventType === 'INSERT') {
          const novoInv = payload.new;
          const jaExiste = getInvestimentos().some(i => i.id === novoInv.id);
          if (!jaExiste) {
            console.log('[Investimentos Supabase] 📥 Novo investimento detectado em outro dispositivo');
            // TODO: Carregar novamente e atualizar UI
            // carregarInvestimentosDoSupabase().then(invs => {
            //   setInvestimentos(invs);
            //   renderTudo();
            // });
          }
        }
      }
    )
    .subscribe();

  window._investimentosSubscription = subscription;
}

// ════════════════════════════════════════════════════════
// 4. INTEGRAÇÃO COM MÓDULO (Auto-sync após CRUD)
// ════════════════════════════════════════════════════════

// Sobrescrever adicionarInvestimento para sync automático
const _adicionarInvOriginal = window.adicionarInvestimento;
window.adicionarInvestimento = function(dados) {
  const resultado = _adicionarInvOriginal(dados);

  // Se sucesso, tentar sincronizar (async, não-bloqueante)
  if (resultado && typeof sincronizarInvestimentosComSupabase === 'function') {
    // setTimeout garante que UI foi atualizada antes de sync
    setTimeout(() => {
      sincronizarInvestimentosComSupabase().catch(err => {
        console.log('[Investimentos Supabase] Sync falhou (continuando offline):', err);
      });
    }, 100);
  }

  return resultado;
};

// Mesmo para edição
const _editarInvOriginal = window.editarInvestimento;
window.editarInvestimento = function(id, dados) {
  const resultado = _editarInvOriginal(id, dados);

  if (resultado && typeof sincronizarInvestimentosComSupabase === 'function') {
    setTimeout(() => {
      sincronizarInvestimentosComSupabase().catch(err => {
        console.log('[Investimentos Supabase] Sync falhou (continuando offline):', err);
      });
    }, 100);
  }

  return resultado;
};

// E para deleção (precisa sobrescrever o fpConfirm callback)
const _deletarInvOriginal = window.deletarInvestimento;
window.deletarInvestimento = function(id) {
  fpConfirm('Remover este investimento?', () => {
    setInvestimentos(getInvestimentos().filter(i => i.id !== id));
    salvarDados();
    renderTudo();
    mostrarToast('🗑️ Investimento removido', 'success');

    // Sync com Supabase
    if (typeof sincronizarInvestimentosComSupabase === 'function') {
      setTimeout(() => {
        sincronizarInvestimentosComSupabase().catch(err => {
          console.log('[Investimentos Supabase] Sync falhou (continuando offline):', err);
        });
      }, 100);
    }
  }, '🗑️');
};

// ════════════════════════════════════════════════════════
// 5. INICIALIZAÇÃO (Chamada após login)
// ════════════════════════════════════════════════════════

async function inicializarSupabaseInvestimentos() {
  if (!currentUser) {
    console.log('[Investimentos Supabase] Usuário não autenticado — skip');
    return;
  }

  console.log('[Investimentos Supabase] 🚀 Inicializando sincronização...');

  // 1. Carregar investimentos do Supabase
  const investimentosCloud = await carregarInvestimentosDoSupabase();

  // 2. Merge com local (cloud tem prioridade se mais recente)
  const investimentosLocal = getInvestimentos();
  const investimentosMerged = _mergeInvestimentos(investimentosLocal, investimentosCloud);

  // 3. Atualizar estado global
  setInvestimentos(investimentosMerged);
  salvarDados();

  // 4. Se mudou algo, fazer sync de volta
  if (investimentosMerged.length !== investimentosLocal.length) {
    console.log('[Investimentos Supabase] Sincronizando mudanças locais para cloud...');
    await sincronizarInvestimentosComSupabase();
  }

  // 5. Inscrever em mudanças em tempo real
  inscreverAtualizacoesInTempo();

  console.log('[Investimentos Supabase] ✅ Inicialização concluída');
}

window.inicializarSupabaseInvestimentos = inicializarSupabaseInvestimentos;

// ════════════════════════════════════════════════════════
// 6. MERGE STRATEGY (local + cloud)
// ════════════════════════════════════════════════════════

function _mergeInvestimentos(local, cloud) {
  // Criar mapa de investimentos
  const merged = {};

  // Adicionar todos os locais
  local.forEach(inv => {
    merged[inv.id] = inv;
  });

  // Mesclar com cloud (cloud tem prioridade se mais recente)
  cloud.forEach(invCloud => {
    if (!merged[invCloud.id]) {
      // Novo no cloud
      merged[invCloud.id] = invCloud;
    } else {
      // Existe em ambos — usar versão mais recente
      const local = merged[invCloud.id];
      const localTime = new Date(local.updatedAt).getTime();
      const cloudTime = new Date(invCloud.updatedAt).getTime();

      if (cloudTime > localTime) {
        merged[invCloud.id] = invCloud;
      }
    }
  });

  return Object.values(merged);
}

// ════════════════════════════════════════════════════════
// 7. AUTO-INICIALIZAR AO FAZER LOGIN
// ════════════════════════════════════════════════════════

// Detectar login via auth.js (usa mutation de currentUser)
const checkLoginInterval = setInterval(() => {
  if (currentUser && !window._investimentosSuperbaseInitialized) {
    window._investimentosSuperbaseInitialized = true;
    console.log('[Investimentos Supabase] Login detectado — inicializando...');
    inicializarSupabaseInvestimentos().catch(err => {
      console.error('[Investimentos Supabase] Erro na inicialização:', err);
    });
  }
}, 1000);

console.log('[Investimentos Supabase] ✅ Módulo carregado');
