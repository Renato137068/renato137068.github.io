/**
 * utils.js - Utility Functions
 * Tier 1: Depends on config.js
 */

const UTILS = {
  // Formatação
  formatarMoeda(valor, moeda = 'BRL') {
    const config = CONFIG.MOEDA_FORMATACAO[moeda] || CONFIG.MOEDA_FORMATACAO.BRL;
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency
    }).format(valor);
  },
  
  formatarData(data) {
    if (typeof data === 'string') {
      data = new Date(data);
    }
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(data);
  },
  
  formatarDataHora(data) {
    if (typeof data === 'string') {
      data = new Date(data);
    }
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(data);
  },
  
  // Validação
  validarTransacao(transacao) {
    if (!transacao.valor || transacao.valor <= 0) {
      return { valido: false, erro: 'Valor deve ser maior que 0' };
    }
    if (!transacao.tipo || ![CONFIG.TIPO_RECEITA, CONFIG.TIPO_DESPESA].includes(transacao.tipo)) {
      return { valido: false, erro: 'Tipo inválido' };
    }
    if (!transacao.categoria) {
      return { valido: false, erro: 'Categoria obrigatória' };
    }
    if (!transacao.data) {
      return { valido: false, erro: 'Data obrigatória' };
    }
    return { valido: true };
  },
  
  // DOM helpers
  $(selector) {
    return document.querySelector(selector);
  },
  
  $$(selector) {
    return document.querySelectorAll(selector);
  },
  
  mostrarToast(mensagem, tipo = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
  
  // Cálculos
  calcularSaldo(transacoes) {
    return transacoes.reduce((acc, t) => {
      if (t.tipo === CONFIG.TIPO_RECEITA) {
        return acc + t.valor;
      } else {
        return acc - t.valor;
      }
    }, 0);
  },
  
  // Filtros
  filtrarPorMês(transacoes, mes, ano) {
    return transacoes.filter(t => {
      const data = new Date(t.data);
      return data.getMonth() === mes - 1 && data.getFullYear() === ano;
    });
  },
  
  filtrarPorTipo(transacoes, tipo) {
    return transacoes.filter(t => t.tipo === tipo);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UTILS;
}
