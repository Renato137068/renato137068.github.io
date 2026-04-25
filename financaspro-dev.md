---
name: financaspro-development
description: >-
  FinançasPro v11.0 development guide. Use this skill whenever working on the FinançasPro SaaS — adding features, fixing bugs, debugging, or extending any module. This skill documents the full architecture, module dependencies, data structures, development patterns, and real code examples. Replaces the need to re-read the entire project each time you work on it.
compatibility: "No external tools required"
---

# FinançasPro v11.0 Development Guide

**Context: SaaS de finanças pessoais em HTML + vanilla JavaScript (41 módulos, ~10k linhas)**
**Goal: Document architecture once so you never have to reread the entire project again.**

---

## 📐 Arquitetura em 30 segundos

```
index.html (89KB - tudo junto)
├── 41 módulos JavaScript (js/)
│   ├── Tier 0: config.js, dados.js (carregados primeiro)
│   ├── Tier 1: auth.js, utils.js (dependem de Tier 0)
│   └── Tier 2: contas.js, categorias.js, transacoes.js, render.js, etc
├── CSS (css/)
├── Manifest + PWA (manifest.json, sw.js)
└── Dados: localStorage (local) + Supabase (cloud)
```

**Princípios:**
- ✅ Offline-first: "app sempre funciona, auth é complementar"
- ✅ Modular: cada módulo tem responsabilidade clara
- ✅ Vanilla JS: sem framework, sem build step
- ✅ Resiliente: guards, try-catch, safe chaining

---

## 🗂️ Estrutura de Dados Principal

### Transação
```javascript
{
  id: string,                    // UUID gerado
  descricao: string,             // "Café - Starbucks"
  valor: number,                 // 25.50
  tipo: 'receita' | 'despesa',
  categoria: string,             // 'alimentacao', 'transporte', etc
  data: string,                  // 'YYYY-MM-DD'
  conta_id?: string,             // link para conta
  cartao_id?: string,            // link para cartão
  recorrencia: 'unica' | 'mensal' | 'semanal',
  tag?: string,                  // 'ajuste', etc
  nota?: string,
  createdAt: string,
  updatedAt: string
}
```

### Conta
```javascript
{
  id: string,
  nome: string,                  // "Conta Corrente Banco X"
  tipo: 'corrente' | 'poupanca' | 'investimento' | 'digital' | 'carteira',
  saldo: number,
  icon: string,                  // emoji
  createdAt: string,
  updatedAt: string
}
```

### Config (localStorage)
```javascript
{
  renda: number,                 // 5000
  metaPoupanca: number,          // 20 (%)
  metaGastos: number,            // 80 (%)
  streak: number,                // dias de entrada consecutivos
  score: number,                 // pontuação gamificação
  achievements: string[],        // IDs de conquistas
  categorias_custom: [{v: 'custom1', l: 'Label'}],
  lastEntry: string,             // data último lançamento
  // ... mais campos
}
```

### Orcamentos
```javascript
{
  categoria: limit,              // {'alimentacao': 500, 'transporte': 200}
  // Estrutura simples: categoria → limit mensal
}
```

---

## 🔧 Padrões de Desenvolvimento

### 1. Cabeçalho de Módulo
Cada arquivo `.js` começa assim:
```javascript
// FinançasPro — [Responsabilidade]
// v11.0 — Depende de: config.js, dados.js, utils.js

// Comentário sobre padrões/notas importantes
```

### 2. Guards & Safety
```javascript
// Guard: evita re-inicializações
if (_sbInitialized) {
  console.warn('[Auth] initSupabase chamado mais de uma vez — ignorado.');
  return;
}

// Optional chaining defensivo
const el = id => document.getElementById(id);
if (el('some-id')) { /* ... */ }
```

### 3. Cached Values
Para evitar recálculos:
```javascript
let _doMesCache = null, _doMesCacheKey = '';

function doMes(mes) {
  const key = target + '_' + transacoes.length + '_' + (lastTx?.updatedAt || '');
  if (_doMesCache && _doMesCacheKey === key && !mes) return _doMesCache;
  // ... calcular
  if (!mes) { _doMesCache = result; _doMesCacheKey = key; }
  return result;
}
```

### 4. CRUD Simples
```javascript
// Salvar/Atualizar
function salvarConta() {
  const nome = document.getElementById('mconta-nome').value.trim();
  const id = document.getElementById('modal-conta-id').value;
  if (id) {
    const c = contas.find(c => c.id === id);
    if (c) { c.nome = nome; /* ... */ }
  } else {
    contas.push({ id: gerarId(), nome /* ... */ });
  }
  salvarDados();      // persiste localStorage
  fecharModal();      // fecha modal
  renderTudo();       // atualiza UI
}

// Deletar com confirmação
function deletarConta(id) {
  fpConfirm('Remover esta conta?', function() {
    contas = contas.filter(c => c.id !== id);
    salvarDados();
    renderTudo();
    mostrarToast('🗑️ Conta removida');
  }, '🗑️');
}
```

### 5. Renderização Condicional
```javascript
function renderContas() {
  const listEl = document.getElementById('config-contas-list');
  if (listEl) {
    if (contas.length === 0) {
      listEl.innerHTML = '<div>Nenhuma conta</div>';
    } else {
      listEl.innerHTML = contas.map(c => `
        <div class="config-conta-item">
          <div>${c.icon} ${c.nome}</div>
          <button onclick="deletarConta('${c.id}')">✕</button>
        </div>`).join('');
    }
  }
}
```

### 6. Formatação de Números
```javascript
fmt(25.50)  // → "R$ 25,50"
escHtml('<script>')  // → "&lt;script&gt;"
```

---

## 📋 CATEGORIAS: Padrões

### Categoria Padrão
```javascript
const CATEGORIAS_ICON = Object.freeze({
  alimentacao:'🍔', moradia:'🏠', transporte:'🚗',
  // ... congelado para evitar mutação
});

const CATEGORIAS_LABEL = Object.freeze({
  alimentacao:'Alimentação', moradia:'Moradia', // ...
});
```

### Regras de Auto-Categorização (categorias.js)
```javascript
const REGRAS_AUTOCATEGORIA = [
  { regex: /ifood|rappi|delivery/i, cat: 'alimentacao' },
  { regex: /uber|99|taxi/i, cat: 'transporte' },
  // ... mais regras
];

function getCategoriaSugerida(desc) {
  // 1. Checa regex
  for (const regra of REGRAS_AUTOCATEGORIA) {
    if (regra.regex.test(desc)) return regra.cat;
  }
  // 2. Checa histórico (frequência)
  // ... score das categorias usadas com descrições similares
  return entries[0]?.[0] || null;
}
```

---

## 🚀 Guia: Adicionar Nova Categoria

### Passo 1: Adicionar ícone e label
**Arquivo: `js/config.js`**
```javascript
const CATEGORIAS_ICON = Object.freeze({
  alimentacao:'🍔',
  moradia:'🏠',
  NOVA_CATEGORIA: '🆕',  // ← adicionar aqui
});

const CATEGORIAS_LABEL = Object.freeze({
  alimentacao:'Alimentação',
  moradia:'Moradia',
  nova_categoria: 'Minha Nova Categoria',  // ← adicionar aqui
});
```

### Passo 2: Adicionar regras de auto-categorização (opcional)
**Arquivo: `js/categorias.js`**
```javascript
const REGRAS_AUTOCATEGORIA = [
  // ... regras existentes
  { regex: /palavra1|palavra2|palavra3/i, cat: 'nova_categoria' },
];
```

### Passo 3: Atualizar filtros de categoria por tipo
**Arquivo: `js/init.js`**
```javascript
// Se for despesa:
const CATS_DESPESA = [
  { v:'alimentacao', l:'🍔 Alimentação' },
  // ... outras
  { v:'nova_categoria', l:'🆕 Minha Nova Categoria' },
];
```

### Passo 4: Testar
- Abrir app
- Lançar transação
- Verificar se categoria aparece no dropdown
- Testar auto-categorização digitando a palavra-chave

---

## 🚀 Guia: Adicionar Novo Módulo

### Passo 1: Criar arquivo `js/meu-modulo.js`
```javascript
// FinançasPro — [Responsabilidade Clara]
// v11.0 — Depende de: config.js, dados.js, utils.js

// MÓDULO X: [NOME DO MÓDULO]
// ════════════════════════════════════

// Guard global (se for inicializar algo)
let _meuModuloInicializado = false;

function initMeuModulo() {
  if (_meuModuloInicializado) return;
  _meuModuloInicializado = true;
  // ... seu código
}

// Funções principais
function fazerAlgo() {
  // ...
}

function renderMeuModulo() {
  const el = document.getElementById('meu-container');
  if (el) {
    el.innerHTML = `<div>Seu conteúdo</div>`;
  }
}
```

### Passo 2: Registrar em `index.html`
Depois do `<script src="js/utils.js"></script>`, adicionar:
```html
<script src="js/meu-modulo.js"></script>
```

**Ordem importa!** Dependências têm que estar antes.

### Passo 3: Chamar init (se necessário)
Em `js/init.js`, no final:
```javascript
initMeuModulo();
// ... outras inits
```

### Passo 4: Integrar com render
Em `js/render.js` ou em `renderTudo()`:
```javascript
function renderTudo() {
  renderContas();
  renderMeuModulo();  // ← adicionar aqui
  renderTransacoes();
  // ... etc
}
```

---

## 🔌 Guia: Integrar com Supabase

### 1. Salvar na nuvem (já implementado)
**Arquivo: `js/dados.js`**
```javascript
function saveToCloud() {
  // Debounced — dispara 1 único timer mesmo se chamado várias vezes
  if (!sb || !currentUser) return;
  
  // Sincronizar transacoes
  sb.from('transacoes').insert(novasTransacoes).catch(e => {
    console.error('[Cloud] Erro ao salvar:', e);
    // Continua offline — não quebra app
  });
}
```

### 2. Sincronizar em tempo real (já implementado)
**Arquivo: `js/sync-realtime.js`**
```javascript
// Subscriber que escuta mudanças na tabela
sb.channel('realtime:transacoes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'transacoes' },
    payload => {
      console.log('Mudança recebida:', payload);
      // Mergear com dados locais
    })
  .subscribe();
```

### 3. Query de dados (exemplo)
```javascript
async function buscarHistorico() {
  if (!sb || !currentUser) return [];
  
  const { data, error } = await sb
    .from('transacoes')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('data', { ascending: false })
    .limit(100);
  
  if (error) {
    console.error('Erro:', error);
    return [];  // Volta vazio, continua com dados locais
  }
  return data || [];
}
```

---

## 📍 Estrutura de Pastas (Completa)

```
C:\Users\renat\Downloads\financaspro\
├── index.html              (89KB — HTML + inline CSS)
├── manifest.json           (PWA config)
├── sw.js                   (Service Worker)
├── supabase-rls.sql        (RLS policies)
├── js/                     (41 módulos)
│   ├── config.js           (Tier 0: constantes, categorias)
│   ├── dados.js            (Tier 0: gerenciamento dados, localStorage)
│   ├── auth.js             (Tier 1: Supabase auth)
│   ├── utils.js            (Tier 1: modais, toasts, formatação)
│   ├── render.js           (Renderização do dashboard)
│   ├── contas.js           (CRUD de contas)
│   ├── categorias.js       (Auto-categorização, regex)
│   ├── transacoes.js       (Lógica de transações)
│   ├── orcamento5030.js    (Orçamento 50/30/20)
│   ├── gamificacao.js      (Achievements, streak, score)
│   ├── graficos.js         (Charts)
│   ├── relatorio.js        (Relatórios)
│   ├── insights.js         (Análises inteligentes)
│   ├── pwa.js              (PWA install, offline)
│   ├── sync-realtime.js    (Sync em tempo real)
│   ├── init.js             (Carregado por último)
│   └── ... (e 24 outros)
├── css/                    (estilos)
├── icons/                  (PWA icons)
└── .nojekyll               (Git Pages)
```

---

## ⚡ Problemas Comuns & Soluções

### 1. "Eu chamei `salvarDados()` mas não persiste"
**Causa:** Precisa chamar `renderTudo()` depois para atualizar UI.
```javascript
contas.push({...});
salvarDados();      // ← salva em localStorage
renderTudo();       // ← atualiza a tela (IMPORTANTE!)
```

### 2. "Modal não fecha"
**Causa:** Esqueceu de chamar `fecharModal()` ou `fpModalOk()`.
```javascript
function salvarAlgo() {
  // ... fazer algo
  salvarDados();
  fecharModal('meu-modal');   // ← isso
  renderTudo();
}
```

### 3. "App carrega muito lento"
**Causa:** Muitos cálculos em `renderTudo()`. Use cache.
```javascript
// ❌ Ruim: recalcula toda vez
function render() {
  const total = transacoes.reduce((s,t) => s+t.valor, 0);
}

// ✅ Bom: cacheia
let _totalCache = null, _totalCacheKey = '';
function getTotal() {
  const key = transacoes.length + '_' + lastTx?.updatedAt;
  if (_totalCache && _totalCacheKey === key) return _totalCache;
  _totalCache = transacoes.reduce((s,t) => s+t.valor, 0);
  _totalCacheKey = key;
  return _totalCache;
}
```

### 4. "Supabase não sincroniza offline"
**Esperado:** App funciona offline. Sync acontece quando volta online. Não é erro.

### 5. "Erro: contas is not defined"
**Causa:** Módulo foi carregado antes de `dados.js`. Checar ordem em `index.html`.
```html
<script src="js/config.js"></script>
<script src="js/dados.js"></script>   <!-- ← dados.js ANTES de quem depende -->
<script src="js/contas.js"></script>  <!-- ← depois -->
```

---

## 🎯 Checklist: Antes de Commitar

- [ ] Testei no mobile (PWA)?
- [ ] Testei offline (desligar internet)?
- [ ] Chamei `renderTudo()` se mudei dados?
- [ ] Adicionei toast de feedback (`mostrarToast()`)?
- [ ] Removi `console.log()` debug?
- [ ] Chequei ordem de carregamento em `index.html`?
- [ ] Guardei contra undefined: `if (el)` antes de usar?
- [ ] Testei salvar/carregar em localStorage?

---

## 📚 Referência Rápida de Funções Úteis

| Função | Uso |
|--------|-----|
| `fmt(25.50)` | Formata número → "R$ 25,50" |
| `gerarId()` | Gera UUID único |
| `salvarDados()` | Persiste em localStorage + Supabase |
| `renderTudo()` | Atualiza toda a UI |
| `mostrarToast(msg, tipo)` | Notificação (success, error, warning) |
| `fpAlert(msg)` | Modal de alerta |
| `fpConfirm(msg, callback)` | Modal de confirmação |
| `fpPrompt(msg, default, callback)` | Modal de input |
| `fecharModal(id)` | Fecha modal |
| `escHtml(str)` | Escapa HTML (segurança) |
| `abrirModalConta(id)` | Abre modal de conta (para editar) |
| `doMes(mes)` | Calcula financeiro do mês {txMes, receitas, despesas, saldo} |
| `calcScore()` | Calcula pontuação gamificação |

---

## 🤔 Quando Usar Esta Skill

✅ Quando você quer **adicionar uma feature** (ex: "adicionar categoria de imposto")
✅ Quando você quer **debugar um bug** (ex: "por que contas não salvam?")
✅ Quando você quer **estender um módulo** (ex: "adicionar novo relatório")
✅ Quando você quer **refatorar** (ex: "melhorar performance do render")
✅ Quando você está **perdido** no código (use esta skill como GPS)

❌ Quando você precisa de **design/UX feedback** (use design:design-critique)
❌ Quando você quer **fazer deploy** (use engineering:deploy-checklist)
❌ Quando você precisa **estudar JavaScript** (use documentação JavaScript)
