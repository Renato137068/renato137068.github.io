/**
 * render.js - UI Rendering
 * Tier 1: Depends on config.js, dados.js, utils.js, transacoes.js, orcamento.js
 */

const RENDER = {
  init() {
    this.renderResumo();
    this.renderExtrato();
    this.renderOrcamento();
    this.renderFormCategories();
    this.atualizarHeaderSaldo();
  },
  
  // Renderizar resumo do mês
  renderResumo() {
    const agora = new Date();
    const resumo = TRANSACOES.obterResumoMês(agora.getMonth() + 1, agora.getFullYear());
    
    const container = UTILS.$('#resumo-content');
    if (!container) return;
    
    const receitas = UTILS.formatarMoeda(resumo.receitas);
    const despesas = UTILS.formatarMoeda(resumo.despesas);
    const saldo = UTILS.formatarMoeda(resumo.saldo);
    
    const html = `
      <div class="resumo-cards">
        <div class="card">
          <div class="card-label">Receitas</div>
          <div class="card-value receita">${receitas}</div>
        </div>
        <div class="card">
          <div class="card-label">Despesas</div>
          <div class="card-value despesa">${despesas}</div>
        </div>
        <div class="card">
          <div class="card-label">Saldo</div>
          <div class="card-value ${resumo.saldo >= 0 ? 'receita' : 'despesa'}">${saldo}</div>
        </div>
      </div>
      <div class="resumo-transacoes">
        <h3>Últimas transações</h3>
        <div id="resumo-list"></div>
      </div>
    `;
    
    container.innerHTML = html;
    this.renderUltimasTransacoes();
  },
  
  renderUltimasTransacoes() {
    const transacoes = TRANSACOES.obter({});
    const ultimas = transacoes.slice(0, 5);
    const list = UTILS.$('#resumo-list');
    
    if (!list) return;
    
    if (ultimas.length === 0) {
      list.innerHTML = '<p class="empty">Nenhuma transação</p>';
      return;
    }
    
    const html = ultimas.map(t => `
      <div class="transacao-item">
        <div class="transacao-info">
          <div class="transacao-categoria">${t.categoria}</div>
          <div class="transacao-data">${UTILS.formatarData(t.data)}</div>
        </div>
        <div class="transacao-valor ${t.tipo}">
          ${t.tipo === CONFIG.TIPO_RECEITA ? '+' : '-'} ${UTILS.formatarMoeda(t.valor)}
        </div>
      </div>
    `).join('');
    
    list.innerHTML = html;
  },
  
  // Renderizar extrato
  renderExtrato() {
    const transacoes = TRANSACOES.obter({});
    const container = UTILS.$('#extrato-content');
    
    if (!container) return;
    
    if (transacoes.length === 0) {
      container.innerHTML = '<p class="empty">Nenhuma transação</p>';
      return;
    }
    
    const html = transacoes.map(t => `
      <div class="transacao-item-full">
        <div class="transacao-info-full">
          <div class="transacao-categoria">${t.categoria}</div>
          <div class="transacao-descricao">${t.descricao || '-'}</div>
          <div class="transacao-data">${UTILS.formatarData(t.data)}</div>
        </div>
        <div class="transacao-actions">
          <div class="transacao-valor ${t.tipo}">
            ${t.tipo === CONFIG.TIPO_RECEITA ? '+' : '-'} ${UTILS.formatarMoeda(t.valor)}
          </div>
          <button class="btn-delete" onclick="TRANSACOES.deletar('${t.id}'); RENDER.renderExtrato(); RENDER.atualizarHeaderSaldo();">×</button>
        </div>
      </div>
    `).join('');
    
    container.innerHTML = html;
  },
  
  // Renderizar orçamento
  renderOrcamento() {
    const agora = new Date();
    const status = ORCAMENTO.obterStatusTodos(agora.getMonth() + 1, agora.getFullYear());
    const container = UTILS.$('#orcamento-content');
    
    if (!container) return;
    
    if (status.length === 0) {
      container.innerHTML = '<p class="empty">Nenhum orçamento definido</p>';
      return;
    }
    
    const html = status.map(s => {
      const porcentagem = s.percentual;
      const corBarra = s.status === 'excedido' ? '#ef5350' : s.status === 'alerta' ? '#ffa726' : '#66bb6a';
      
      return `
        <div class="orcamento-item">
          <div class="orcamento-header">
            <span class="orcamento-categoria">${s.categoria}</span>
            <span class="orcamento-valor">${UTILS.formatarMoeda(s.gasto)} / ${UTILS.formatarMoeda(s.limite)}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min(porcentagem, 100)}%; background-color: ${corBarra};"></div>
          </div>
          <div class="orcamento-footer">
            <span class="status-${s.status}">${porcentagem}%</span>
            <button class="btn-small" onclick="ORCAMENTO.deletarLimite('${s.categoria}'); RENDER.renderOrcamento();">Remover</button>
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
  },
  
  // Renderizar opções de categoria no formulário
  renderFormCategories() {
    const tipoSelect = UTILS.$('#tipo-transacao');
    if (!tipoSelect) return;
    
    tipoSelect.addEventListener('change', (e) => {
      this.atualizarCategorias(e.target.value);
    });
    
    this.atualizarCategorias(CONFIG.TIPO_DESPESA);
  },
  
  atualizarCategorias(tipo) {
    const categorias = tipo === CONFIG.TIPO_RECEITA 
      ? CONFIG.CATEGORIAS_RECEITA 
      : CONFIG.CATEGORIAS_DESPESA;
    
    const select = UTILS.$('#categoria-transacao');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione a categoria</option>' +
      categorias.map(cat => `<option value="${cat}">${cat}</option>`).join('');
  },
  
  // Atualizar saldo no header
  atualizarHeaderSaldo() {
    const saldo = UTILS.calcularSaldo(TRANSACOES.obter({}));
    const elemento = UTILS.$('.saldo-valor');
    
    if (elemento) {
      elemento.textContent = UTILS.formatarMoeda(saldo);
      elemento.className = `saldo-valor ${saldo >= 0 ? 'positivo' : 'negativo'}`;
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RENDER;
}
