// FinançasPro — Loader para Módulo de Investimentos Avançado
// Este script carrega dinamicamente o módulo investimentos-avancado.js
// Útil quando o HTML principal é monolithic

(function() {
  'use strict';

  // Esperar que config.js e dados.js estejam prontos
  function verificarDependencias() {
    if (typeof config === 'undefined' || typeof dados === 'undefined') {
      setTimeout(verificarDependencias, 100);
      return;
    }

    // Dependências prontas, carregar módulo
    carregarModuloInvestimentos();
  }

  function carregarModuloInvestimentos() {
    // Verificar se já foi carregado
    if (typeof initInvestimentos !== 'undefined') {
      console.log('[Investimentos] Módulo já carregado');
      return;
    }

    // Carregar script dynamicamente
    const script = document.createElement('script');
    script.src = 'js/investimentos-avancado.js';
    script.type = 'text/javascript';
    script.async = true;

    script.onload = function() {
      console.log('[Investimentos] Módulo carregado com sucesso');

      // Inicializar
      if (typeof initInvestimentos === 'function') {
        initInvestimentos();
        console.log('[Investimentos] Módulo inicializado');
      }

      // Renderizar se estamos na aba correta
      if (document.querySelector('#tab-investimentos.active') &&
          typeof renderInvestimentosAvancado === 'function') {
        renderInvestimentosAvancado();
      }
    };

    script.onerror = function() {
      console.error('[Investimentos] Erro ao carregar módulo');
    };

    // Carregar antes de init.js
    document.head.appendChild(script);
  }

  // Iniciar verificação quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verificarDependencias);
  } else {
    verificarDependencias();
  }
})();
