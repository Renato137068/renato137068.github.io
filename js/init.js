/**
 * init.js - Application Initialization
 * Tier 2: Depends on all other modules (last to load)
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize modules in dependency order
  DADOS.init();
  TRANSACOES.init();
  ORCAMENTO.init();
  
  // Render UI
  RENDER.init();
  CONFIG_USER.init();
  CONFIG_USER.aplicarTema();
  
  // Setup event listeners for navigation
  setupNavigation();
  setupFormSubmit();
});

function setupNavigation() {
  const abas = document.querySelectorAll('[data-aba]');
  const navButtons = document.querySelectorAll('.nav-btn');
  
  if (navButtons.length === 0) return;
  
  navButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const abaName = this.getAttribute('data-aba');
      
      // Remove active class from all
      navButtons.forEach(b => b.classList.remove('active'));
      abas.forEach(a => a.classList.remove('active'));
      
      // Add active class to clicked
      this.classList.add('active');
      const abaElement = document.querySelector(`[data-aba="${abaName}"]`);
      if (abaElement) {
        abaElement.classList.add('active');
      }
    });
  });
  
  // Ativar primeira aba por padrão
  if (navButtons.length > 0) {
    navButtons[0].click();
  }
}

function setupFormSubmit() {
  const form = document.getElementById('form-nova-transacao');
  
  if (!form) return;
  
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    try {
      const tipo = UTILS.$('#tipo-transacao')?.value;
      const valor = UTILS.$('#valor-transacao')?.value;
      const categoria = UTILS.$('#categoria-transacao')?.value;
      const data = UTILS.$('#data-transacao')?.value;
      const descricao = UTILS.$('#descricao-transacao')?.value;
      
      if (!tipo || !valor || !categoria || !data) {
        UTILS.mostrarToast('Preencha todos os campos obrigatórios', 'error');
        return;
      }
      
      TRANSACOES.criar(tipo, valor, categoria, data, descricao);
      
      UTILS.mostrarToast('Transação registrada com sucesso!', 'success');
      
      // Limpar formulário
      form.reset();
      
      // Atualizar UI
      RENDER.renderResumo();
      RENDER.renderExtrato();
      RENDER.renderOrcamento();
      RENDER.atualizarHeaderSaldo();
      
    } catch (erro) {
      UTILS.mostrarToast(erro.message, 'error');
    }
  });
  
  // Setup de adicionar orçamento
  const formOrcamento = document.getElementById('form-novo-orcamento');
  if (formOrcamento) {
    formOrcamento.addEventListener('submit', function(e) {
      e.preventDefault();
      
      try {
        const categoria = UTILS.$('#orcamento-categoria')?.value;
        const limite = UTILS.$('#orcamento-limite')?.value;
        
        if (!categoria || !limite) {
          UTILS.mostrarToast('Preencha todos os campos', 'error');
          return;
        }
        
        ORCAMENTO.definirLimite(categoria, limite);
        UTILS.mostrarToast('Orçamento definido com sucesso!', 'success');
        
        formOrcamento.reset();
        RENDER.renderOrcamento();
        
      } catch (erro) {
        UTILS.mostrarToast(erro.message, 'error');
      }
    });
  }
}

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(err => {
    console.log('Service Worker registration failed:', err);
  });
}
