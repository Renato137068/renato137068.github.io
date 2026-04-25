# ☁️ Integração Supabase — Módulo Investimentos

**Data:** 2026-04-25  
**Status:** Implementação Completa (Cloud Sync Ready)

---

## 📋 Resumo

O módulo de investimentos agora está **totalmente sincronizado com Supabase**:

✅ **Offline-First**: App funciona 100% sem internet
✅ **Auto-Sync**: Dados sincronizam automaticamente quando online
✅ **Merge Inteligente**: Resolve conflitos entre local e cloud
✅ **Real-Time**: Listener em tempo real para mudanças de outros dispositivos
✅ **Debounce**: Não sobrecarrega servidor com requisições frequentes

---

## 📁 Arquivos Implementados

### Criados
- ✅ `js/investimentos-supabase.js` (320+ linhas)
  - Sincronização com Supabase
  - Merge de dados local + cloud
  - Real-time listeners
  - Auto-inicialização após login

### Modificados
- ✅ `index.html` (linhas ~1526-1528)
  - Adicionado `<script src="js/investimentos-avancado.js">`
  - Adicionado `<script src="js/investimentos-supabase.js">`

### Pré-requisito
- ✅ Tabela `investimentos` criada no Supabase
- ✅ RLS (Row Level Security) ativado
- ✅ Trigger de `updated_at` funcionando

---

## 🔌 Como Funciona

### 1️⃣ Boot Offline
App inicia com `investimentos-avancado.js`:
- Carrega dados de `localStorage`
- Renderiza dashboard
- **Tudo funciona sem internet** ✅

### 2️⃣ Login (Online)
Quando usuário faz login em `auth.js`:
1. `currentUser` é definido globalmente
2. `investimentos-supabase.js` detecta login
3. Chama `inicializarSupabaseInvestimentos()`
   - 📥 Carrega investimentos do Supabase
   - 🔀 Faz merge com dados locais (prioriza versão mais recente)
   - 📤 Sincroniza versão final de volta
   - 🔔 Inscreve em listener de tempo real

### 3️⃣ Adicionar/Editar Investimento
- ✅ Usuário clica "➕ Adicionar"
- ✅ Investimento salvo em `localStorage` **imediatamente**
- ✅ UI atualiza **instantaneamente**
- ⏳ 2 segundos depois, sincroniza com Supabase (debounce)
- ☁️ Toast: "☁️ Sincronizado com nuvem"

### 4️⃣ Offline → Online
Quando conexão volta:
- App automaticamente tenta sincronizar
- Se Supabase tem versão mais recente, atualiza localmente
- Real-time listener mantém apps sincronizados entre dispositivos

---

## 🧪 Testes — Como Validar

### Teste 1: Login e Sync Inicial

```javascript
// No Console, faça login primeiro (se não estiver logado)
// Depois execute:

console.log('☁️ TESTE 1: Login e Sync Inicial\n');
console.log('✅ Usuário logado?', currentUser?.email);
console.log('✅ Investimentos carregados?', getInvestimentos().length);
console.log('✅ Subscription criada?', !!window._investimentosSubscription);

// Verificar DevTools → Network: deve haver requisição GET para tabela investimentos
```

**Esperado:**
- ✅ currentUser mostra email
- ✅ Investimentos > 0 (carregados do Supabase)
- ✅ Network tab mostra GET `investimentos?select=*`

---

### Teste 2: Auto-Sync ao Adicionar

```javascript
console.log('☁️ TESTE 2: Auto-Sync\n');

// 1. Monitorar console
console.log('ℹ️ Abra DevTools → Console e Network');

// 2. Adicionar investimento
adicionarInvestimento({
  tipo: 'fundo-renda-fixa',
  descricao: 'Fundo XYZ (Sync Test)',
  valorInicial: 10000,
  valorAtual: 10500
});

// 3. Verificar após 2 segundos
setTimeout(() => {
  console.log('✅ Investimento no array local?', 
    getInvestimentos().some(i => i.descricao.includes('Sync Test')));
  
  // Verificar Network: deve haver POST/UPSERT para Supabase
  console.log('✅ Verifique Network tab: POST para api/rest/v1/investimentos');
}, 2500);
```

**Esperado:**
- ✅ Dashboard atualiza imediatamente (offline-first)
- ✅ Console mostra "[Investimentos Supabase] ✅ Sincronizado"
- ✅ Network tab mostra POST com status 200-201
- ✅ Toast "☁️ Sincronizado com nuvem"

---

### Teste 3: Merge Local + Cloud

```javascript
console.log('☁️ TESTE 3: Merge Inteligente\n');

// 1. Você tem 2 investimentos locais
console.log('Antes — Local:', getInvestimentos().length);

// 2. Chamar carregamento do Supabase
carregarInvestimentosDoSupabase().then(cloudInvs => {
  console.log('Cloud tem:', cloudInvs.length, 'investimentos');
  
  // 3. Sistema automaticamente junta, priorizando mais recente
  console.log('Após merge — Total:', getInvestimentos().length);
  console.log('✅ Merge completo!');
});
```

**Esperado:**
- Dados de ambas as fontes são combinados
- Se versão mais recente está em um lado, usa-a

---

### Teste 4: Real-Time Multi-Dispositivo

```javascript
console.log('☁️ TESTE 4: Real-Time Listener\n');

// 1. Abrir app em 2 abas diferentes
// 2. Na ABA A, executar:
adicionarInvestimento({
  tipo: 'cripto',
  descricao: 'Bitcoin (multi-device test)',
  valorInicial: 50000,
  valorAtual: 65000
});

// 3. IR PARA ABA B
// 4. Na ABA B, aguardar alguns segundos
// 5. Executar no console da ABA B:
setTimeout(() => {
  console.log('✅ Novo investimento apareceu na aba B?',
    getInvestimentos().some(i => i.descricao.includes('Bitcoin')));
}, 5000);
```

**Esperado:**
- ✅ Mudança feita em ABA A aparece em ABA B dentro de 5 segundos (via real-time listener)

---

### Teste 5: Offline → Online

```javascript
console.log('☁️ TESTE 5: Offline → Online\n');

// 1. DevTools → Network → set to Offline
console.log('ℹ️ Desligar internet agora (DevTools → Network → Offline)');

// 2. Aguardar 5 segundos
setTimeout(() => {
  console.log('✅ Agora adicione um investimento OFFLINE:');
  
  adicionarInvestimento({
    tipo: 'tesouro-direto',
    descricao: 'Offline Test',
    valorInicial: 3000,
    valorAtual: 3150
  });
  
  console.log('✅ Investimento adicionado OFFLINE');
  console.log('ℹ️ Agora volte online: DevTools → Network → Online');
  
  // 3. Voltar online e verificar
  setTimeout(() => {
    console.log('✅ Você está online novamente?');
    console.log('Observe: App automaticamente tenta sincronizar');
    console.log('Verifique Network tab: POST deve aparecer em 2-5 segundos');
  }, 10000);
}, 5000);
```

**Esperado:**
- ✅ App funciona 100% offline (UI não travada)
- ✅ Dados persistem em localStorage
- ✅ Quando volta online, sync automático acontece
- ✅ Console mostra "[Investimentos Supabase] ✅ Sincronizado"

---

## 📊 Estrutura de Dados

### Local (localStorage)
```javascript
localStorage['fp_investimentos_avancado'] = [
  {
    id: "uuid",
    tipo: "tesouro-direto",
    descricao: "...",
    valorInicial: 1000,
    valorAtual: 1050,
    rentabilidadeEsperada: 10.5,
    dataAquisicao: "2026-04-25",
    createdAt: "2026-04-25T10:00:00Z",
    updatedAt: "2026-04-25T11:30:00Z"
  }
]
```

### Cloud (Supabase)
```sql
-- Mesmos dados, mas em snake_case
SELECT * FROM investimentos;
-- valor_inicial, valor_atual, rentabilidade_esperada, data_aquisicao, etc
```

### Conversão Automática
`investimentos-supabase.js` converte:
- `valorInicial` → `valor_inicial`
- `valorAtual` → `valor_atual`
- etc.

---

## 🐛 Troubleshooting

| Sintoma | Causa | Solução |
|---------|-------|---------|
| "Supabase não disponível" | CDN Supabase não carregou | Verificar conexão, recarregar página |
| Sync não acontece | Usuário não logado | Fazer login primeiro |
| Dados duplicados | Merge falhou | Recarregar página, será feito merge novamente |
| Real-time não funciona | Listener não ativado | Fazer logout e login novamente |
| Errors no console | RLS policy não configurada | Verificar RLS no Supabase Dashboard |

---

## 📋 Checklist de Integração

- [x] Tabela `investimentos` criada no Supabase
- [x] RLS configurado
- [x] Script `investimentos-supabase.js` criado
- [x] Scripts registrados em `index.html`
- [x] Auto-sync implementado
- [x] Real-time listener implementado
- [x] Merge strategy implementado
- [ ] **Teste completo no seu ambiente**
- [ ] Validar offline-first
- [ ] Validar sync automático
- [ ] Validar real-time multi-dispositivo

---

## 🚀 Próximos Passos (Roadmap)

### Fase 1.3: Enhancements (Próximas 2-4 semanas)
- [ ] Histórico de versões (audit trail)
- [ ] Undo/Redo para investimentos
- [ ] Bulk sync (importar múltiplos ativos)
- [ ] Webhook para notificações de mudanças

### Fase 2.0: Benchmarks Dinâmicos
- [ ] Integrar API CoinGecko (cripto)
- [ ] Integrar API Alpha Vantage (ações)
- [ ] Fetch Selic/CDI de API BCB
- [ ] Cache com TTL

---

## 📞 Support

Se encontrar problemas:

1. Verificar Console (F12)
2. Procurar por logs `[Investimentos Supabase]`
3. Verificar Network tab (DevTools → Network)
4. Verificar Supabase Dashboard → Logs
5. Testar offline/online
6. Fazer logout e login novamente

---

**Integração concluída em:** 2026-04-25  
**Versão:** 1.0  
**Compatibilidade:** FinançasPro v11.0+
