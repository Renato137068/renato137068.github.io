/**
 * transacoes.js - Transaction Management
 * Tier 1: Depends on config.js, dados.js, utils.js
 */

const TRANSACOES = {
  _cache: null,
  
  init() {
    this._cache = DADOS.getTransacoes();
  },
  
  // Criar nova transação
  criar(tipo, valor, categoria, data, descricao = '') {
    const validacao = UTILS.validarTransacao({
      tipo,
      valor: parseFloat(valor),
      categoria,
      data
    });
    
    if (!validacao.valido) {
      throw new Error(validacao.erro);
    }
    
    const transacao = {
      id: Date.now().toString(),
      tipo,
      valor: parseFloat(valor),
      categoria,
      data,
      descricao,
      dataCriacao: new Date().toISOString()
    };
    
    const salva = DADOS.salvarTransacao(transacao);
    this._cache = DADOS.getTransacoes();
    return salva;
  },
  
  // Obter transações com filtros
  obter(filtros = {}) {
    let resultado = [...this._cache];
    
    if (filtros.mes && filtros.ano) {
      resultado = UTILS.filtrarPorMês(resultado, filtros.mes, filtros.ano);
    }
    
    if (filtros.tipo) {
      resultado = UTILS.filtrarPorTipo(resultado, filtros.tipo);
    }
    
    if (filtros.categoria) {
      resultado = resultado.filter(t => t.categoria === filtros.categoria);
    }
    
    if (filtros.ordenarPor === 'data-desc') {
      resultado.sort((a, b) => new Date(b.data) - new Date(a.data));
    } else {
      resultado.sort((a, b) => new Date(b.data) - new Date(a.data));
    }
    
    return resultado;
  },
  
  // Obter uma transação
  obterPorId(id) {
    return this._cache.find(t => t.id === id);
  },
  
  // Atualizar transação
  atualizar(id, updates) {
    const transacao = this.obterPorId(id);
    if (!transacao) {
      throw new Error('Transação não encontrada');
    }
    
    const updated = { ...transacao, ...updates };
    const validacao = UTILS.validarTransacao(updated);
    
    if (!validacao.valido) {
      throw new Error(validacao.erro);
    }
    
    DADOS.salvarTransacao(updated);
    this._cache = DADOS.getTransacoes();
    return updated;
  },
  
  // Deletar transação
  deletar(id) {
    const resultado = DADOS.deletarTransacao(id);
    this._cache = DADOS.getTransacoes();
    return resultado;
  },
  
  // Resumo do mês
  obterResumoMês(mes, ano) {
    const transacoesMês = this.obter({ mes, ano });
    
    const receitas = transacoesMês
      .filter(t => t.tipo === CONFIG.TIPO_RECEITA)
      .reduce((sum, t) => sum + t.valor, 0);
    
    const despesas = transacoesMês
      .filter(t => t.tipo === CONFIG.TIPO_DESPESA)
      .reduce((sum, t) => sum + t.valor, 0);
    
    return {
      receitas,
      despesas,
      saldo: receitas - despesas,
      total: transacoesMês.length
    };
  },
  
  // Resumo por categoria
  obterResumoPorCategoria(mes, ano) {
    const transacoesMês = this.obter({ mes, ano });
    const resumo = {};
    
    transacoesMês.forEach(t => {
      if (!resumo[t.categoria]) {
        resumo[t.categoria] = { receita: 0, despesa: 0 };
      }
      if (t.tipo === CONFIG.TIPO_RECEITA) {
        resumo[t.categoria].receita += t.valor;
      } else {
        resumo[t.categoria].despesa += t.valor;
      }
    });
    
    return resumo;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TRANSACOES;
}
