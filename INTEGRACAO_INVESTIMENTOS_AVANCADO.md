# 🔧 Guia de Integração: Módulo Investimentos Avançado

**Data:** 2026-04-25  
**Versão:** v11.0  
**Status:** Pronto para Integração

---

## 📋 Arquivos Criados

✅ `js/investimentos-avancado.js` (700+ linhas)  
✅ `css/investimentos-avancado.css` (300+ linhas)  
✅ Este documento

---

## 🔌 Passos de Integração

### PASSO 1: Adicionar Link CSS no `index.html`

**Localizei:** Na seção `<head>` após `<link rel="stylesheet" href="css/style.css">`

**Adicionar:**
```html
<link rel="stylesheet" href="css/investimentos-avancado.css">
```

**Local Exato (após linha ~34 do index.html):**
```html
<!-- Estilo -->
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/investimentos-avancado.css">  <!-- ← ADICIONAR AQUI -->
</head>
```

---

### PASSO 2: Adicionar Container HTML no `index.html`

**Encontrar:** A aba (tab) para "investimentos" no `index.html`

**Procurar por:** `id="tab-investimentos"` ou similar

**Adicionar Container:**
```html
<div id="investimentos-avancado-panel" class="tab-panel" style="display:none;">
  <!-- Renderizado dinamicamente pelo JS -->
</div>
```

**Ou**, se preferir integrar com a aba existente de investimentos:
- Limpar/substituir o conteúdo anterior
- Renderizar o novo módulo no mesmo local

---

### PASSO 3: Registrar Script no `index.html`

**Localizei:** Scripts carregados no final do `index.html` ou antes do `</body>`

**Adicionar ANTES do `init.js`:**
```html
<script src="js/investimentos-avancado.js"></script>
<!-- Ordem importa! Dependências:
     1. config.js (Tier 0)
     2. dados.js (Tier 0)
     3. auth.js, utils.js (Tier 1)
     4. investimentos-avancado.js (Tier 2) ← AQUI
     5. init.js (Carregado por último)
-->
```

**Ordem Completa (exemplo):**
```html
<script src="js/config.js"></script>
<script src="js/dados.js"></script>
<script src="js/auth.js"></script>
<script src="js/utils.js"></script>
<!-- ... outros módulos tier 2 ... -->
<script src="js/investimentos-avancado.js"></script>
<script src="js/init.js"></script>
</body>
</html>
```

---

### PASSO 4: Integrar em `renderTudo()` (render.js)

**Localizei:** `render.js`, linha ~157

**Encontrar:**
```javascript
function renderTudo() {
  _doMesCache = null;
  const m = doMes();
  // ... outras renders ...
  renderMetas();
  renderCategoriasCustom();
  verificarAlertas();
}
```

**Adicionar ANTES do fechamento da função:**
```javascript
function renderTudo() {
  _doMesCache = null;
  const m = doMes();
  // ... outras renders ...
  renderMetas();
  renderCategoriasCustom();
  verificarAlertas();
  
  // Novo módulo de investimentos
  if (typeof renderInvestimentosAvancado === 'function') {
    renderInvestimentosAvancado();
  }
  
  // Sincronizar com dados.js (opcional)
  if (typeof sincronizarInvestimentosComDados === 'function') {
    sincronizarInvestimentosComDados();
  }
}
```

---

### PASSO 5: Inicializar no `init.js` (Opcional - automático)

**Status:** ✅ O módulo já chama `initInvestimentos()` automaticamente no `DOMContentLoaded`

**Se preferir inicializar explicitamente em `init.js`, adicionar:**
```javascript
// No final do init.js, antes do último evento
if (typeof initInvestimentos === 'function') {
  initInvestimentos();
}
```

---

### PASSO 6: Adicionar ao Menu de Navegação (Index.html)

**Localizei:** Drawer de navegação (bottom nav ou menu lateral)

**Procurar por:** `onclick="switchTabFromDrawer('investimentos')"`

**Verificar:** Se o item já existe, senão adicionar:
```html
<div class="mais-drawer-item" onclick="switchTabFromDrawer('investimentos')">
  <span class="md-icon">💼</span>Investimentos
</div>
```

---

## ✅ Checklist de Integração

- [ ] **1. CSS Registrado** — Link adicionado no `<head>` do index.html
- [ ] **2. Container HTML** — Div `#investimentos-avancado-panel` existe
- [ ] **3. Script Carregado** — `investimentos-avancado.js` está em `<script>` tags
- [ ] **4. Ordem Correta** — Config → Dados → Auth/Utils → Investimentos → Init
- [ ] **5. renderTudo() Atualizado** — `renderInvestimentosAvancado()` chamado
- [ ] **6. Menu Navegação** — Tab acessível na bottom nav ou drawer
- [ ] **7. Teste Offline** — Desligar internet, adicionar investimento
- [ ] **8. Teste Cloud** — Verificar sincronização com Supabase

---

## 🧪 Testes Recomendados

### Teste 1: Funcionalidade Básica
1. Abrir app
2. Clicar em "Investimentos"
3. Clicar "➕ Adicionar Investimento"
4. Preencher dados
5. Verificar se aparece no dashboard

### Teste 2: Persistência (Offline-First)
1. Adicionar investimento
2. Desligar internet (F12 → Network → Offline)
3. Recarregar página
4. Verificar se investimento ainda aparece

### Teste 3: Renderização Mobile (PWA)
1. Instalar como PWA (F12 → Application → Install)
2. Abrir no app instalado
3. Verificar responsividade dos cards
4. Testar toque/clique nos botões

### Teste 4: Sync Supabase
1. Adicionar investimento
2. Abrir DevTools (F12 → Network)
3. Verificar requisição POST para Supabase
4. Confirmar sincronização assíncrona

---

## 📊 Estrutura de Dados: Investimento

```javascript
{
  id: string,                    // UUID único
  tipo: string,                  // 'tesouro-direto', 'cdb', 'acoes', etc
  descricao: string,             // "Tesouro Selic 2027"
  valorInicial: number,          // R$ investido
  valorAtual: number,            // Valor de mercado atual
  rentabilidadeEsperada: number, // % a.a. esperada
  dataAquisicao: string,         // 'YYYY-MM-DD'
  createdAt: string,             // ISO 8601
  updatedAt: string              // ISO 8601
}
```

**Será armazenado em:**
- `localStorage['fp_investimentos_avancado']` (local)
- `Supabase table 'investimentos'` (cloud) — TODO: criar tabela

---

## 🔧 Funções Disponíveis (API Pública)

### Adicionar
```javascript
adicionarInvestimento({
  tipo: 'tesouro-direto',
  descricao: 'Tesouro Selic 2030',
  valorInicial: 1000,
  valorAtual: 1050
});
```

### Editar
```javascript
editarInvestimento(id, {
  valorAtual: 1100,
  rentabilidadeEsperada: 11.5
});
```

### Deletar
```javascript
deletarInvestimento(id); // Mostra confirmação
```

### Cálculos
```javascript
calcularPatrimonioTotal();           // Soma de todos os valores atuais
calcularRentabilidade(investimento); // % de ganho
projetarPatrimonio(12);              // Projeção em 12 meses
compararVsBenchmark('selic');        // Vs Selic, CDI, Ibovespa
```

### Render Manual
```javascript
renderInvestimentosAvancado(); // Force re-render (normalmente chamado por renderTudo())
```

---

## 🐛 Troubleshooting

### Problema: "renderInvestimentosAvancado is not defined"
**Solução:** Verificar se `investimentos-avancado.js` está carregado ANTES de `init.js`

### Problema: Investimentos desaparecem após refresh
**Solução:** Verificar localStorage em DevTools:
```javascript
localStorage.getItem('fp_investimentos_avancado')
```

### Problema: Botões não respondem
**Solução:** Verificar se `utils.js` está carregado (fpConfirm, mostrarToast)

### Problema: CSS não aplica
**Solução:** 
- Verificar se `investimentos-avancado.css` está linkado
- Limpar cache (Ctrl+Shift+Delete)
- Abrir DevTools → Elements → procurar por `.inv-adv-`

---

## 📝 Próximos Passos (Roadmap)

### Fase 1.1: Integração Completa (Agora)
- [x] Criar módulo base
- [ ] Integrar no index.html
- [ ] Testar offline-first
- [ ] Documentação

### Fase 1.2: Integração API (Próximas 2-3 semanas)
- [ ] Criar tabela `investimentos` no Supabase
- [ ] Implementar `saveToCloud()` em `dados.js`
- [ ] Sincronização em tempo real
- [ ] Replicação em múltiplos dispositivos

### Fase 1.3: Benchmarks Dinâmicos (Próximas 4-6 semanas)
- [ ] Integrar API CoinGecko (cripto)
- [ ] Integrar API Alpha Vantage (ações)
- [ ] Fetch Selic/CDI de API BCB
- [ ] Cache com TTL

---

## 👤 Contato & Dúvidas

Se encontrar problemas durante a integração:
1. Verificar este documento
2. Consultar a skill `anthropic-skills:financaspro-development`
3. Abrir DevTools (F12) para debug

---

**Criado em:** 2026-04-25  
**Versão do Módulo:** 1.0  
**Compatibilidade:** FinançasPro v11.0+
