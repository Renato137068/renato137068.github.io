/**
 * dados.js - Data Persistence Layer
 * Tier 0: No dependencies
 */

const DADOS = {
  // Initialize once per session
  _initialized: false,
  
  init() {
    if (this._initialized) return;
    this._initialized = true;
    
    // Create default structure if not exists
    if (!localStorage.getItem(CONFIG.STORAGE_TRANSACOES)) {
      localStorage.setItem(CONFIG.STORAGE_TRANSACOES, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(CONFIG.STORAGE_CONFIG)) {
      localStorage.setItem(CONFIG.STORAGE_CONFIG, JSON.stringify(CONFIG.DEFAULT_CONFIG));
    }
  },
  
  // Transações CRUD
  getTransacoes() {
    const data = localStorage.getItem(CONFIG.STORAGE_TRANSACOES);
    return data ? JSON.parse(data) : [];
  },
  
  salvarTransacao(transacao) {
    const transacoes = this.getTransacoes();
    transacao.id = transacao.id || Date.now().toString();
    transacao.dataCriacao = transacao.dataCriacao || new Date().toISOString();
    
    const index = transacoes.findIndex(t => t.id === transacao.id);
    if (index >= 0) {
      transacoes[index] = transacao;
    } else {
      transacoes.push(transacao);
    }
    
    localStorage.setItem(CONFIG.STORAGE_TRANSACOES, JSON.stringify(transacoes));
    return transacao;
  },
  
  deletarTransacao(id) {
    const transacoes = this.getTransacoes();
    const index = transacoes.findIndex(t => t.id === id);
    if (index >= 0) {
      transacoes.splice(index, 1);
      localStorage.setItem(CONFIG.STORAGE_TRANSACOES, JSON.stringify(transacoes));
      return true;
    }
    return false;
  },
  
  // Config CRUD
  getConfig() {
    const data = localStorage.getItem(CONFIG.STORAGE_CONFIG);
    return data ? JSON.parse(data) : CONFIG.DEFAULT_CONFIG;
  },
  
  salvarConfig(config) {
    const atual = this.getConfig();
    const merged = { ...atual, ...config };
    localStorage.setItem(CONFIG.STORAGE_CONFIG, JSON.stringify(merged));
    return merged;
  },
  
  // Utilities
  limparTodos() {
    localStorage.removeItem(CONFIG.STORAGE_TRANSACOES);
    localStorage.removeItem(CONFIG.STORAGE_CONFIG);
    this._initialized = false;
    this.init();
  },
  
  exportarDados() {
    return {
      transacoes: this.getTransacoes(),
      config: this.getConfig(),
      dataExportacao: new Date().toISOString()
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DADOS;
}
