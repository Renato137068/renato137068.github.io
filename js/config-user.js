/**
 * config-user.js - User Configuration and Settings
 * Tier 1: Depends on config.js, dados.js, utils.js
 */

const CONFIG_USER = {
  init() {
    this.setupEventListeners();
    this.renderConfig();
  },
  
  setupEventListeners() {
    const btnSalvar = UTILS.$('#btn-salvar-config');
    const btnExportar = UTILS.$('#btn-exportar-dados');
    const btnLimpar = UTILS.$('#btn-limpar-dados');
    
    if (btnSalvar) {
      btnSalvar.addEventListener('click', () => this.salvarConfiguracao());
    }
    
    if (btnExportar) {
      btnExportar.addEventListener('click', () => this.exportarDados());
    }
    
    if (btnLimpar) {
      btnLimpar.addEventListener('click', () => this.limparDados());
    }
  },
  
  renderConfig() {
    const config = DADOS.getConfig();
    const container = UTILS.$('#config-content');
    
    if (!container) return;
    
    const html = `
      <div class="config-form">
        <div class="form-group">
          <label for="config-nome">Nome</label>
          <input type="text" id="config-nome" value="${config.nome || ''}" placeholder="Seu nome">
        </div>
        
        <div class="form-group">
          <label for="config-moeda">Moeda</label>
          <select id="config-moeda">
            <option value="BRL" ${config.moeda === 'BRL' ? 'selected' : ''}>BRL (R$)</option>
            <option value="USD" ${config.moeda === 'USD' ? 'selected' : ''}>USD ($)</option>
            <option value="EUR" ${config.moeda === 'EUR' ? 'selected' : ''}>EUR (€)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="config-tema">Tema</label>
          <select id="config-tema">
            <option value="light" ${config.tema === 'light' ? 'selected' : ''}>Claro</option>
            <option value="dark" ${config.tema === 'dark' ? 'selected' : ''}>Escuro</option>
          </select>
        </div>
        
        <button id="btn-salvar-config" class="btn-primary">Salvar Configurações</button>
      </div>
      
      <div class="config-section">
        <h3>Dados</h3>
        <p class="info-text">Exporte seus dados para backup ou use em outro dispositivo.</p>
        <button id="btn-exportar-dados" class="btn-secondary">Exportar Dados</button>
      </div>
      
      <div class="config-section danger">
        <h3>Zona de Perigo</h3>
        <p class="info-text">Esta ação é irreversível. Todos os dados serão apagados.</p>
        <button id="btn-limpar-dados" class="btn-danger">Limpar Todos os Dados</button>
      </div>
    `;
    
    container.innerHTML = html;
    this.setupEventListeners();
  },
  
  salvarConfiguracao() {
    const nome = UTILS.$('#config-nome')?.value || 'Usuário';
    const moeda = UTILS.$('#config-moeda')?.value || 'BRL';
    const tema = UTILS.$('#config-tema')?.value || 'light';
    
    DADOS.salvarConfig({
      nome,
      moeda,
      tema,
      ultimoExportoDados: new Date().toISOString()
    });
    
    UTILS.mostrarToast('Configurações salvas com sucesso!', 'success');
    
    // Aplicar tema
    if (tema === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  },
  
  exportarDados() {
    const dados = DADOS.exportarDados();
    const json = JSON.stringify(dados, null, 2);
    
    // Criar arquivo de download
    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(json));
    element.setAttribute('download', `financaspro-backup-${new Date().toISOString().split('T')[0]}.json`);
    element.style.display = 'none';
    
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    UTILS.mostrarToast('Dados exportados com sucesso!', 'success');
    
    DADOS.salvarConfig({
      ultimoExportoDados: new Date().toISOString()
    });
  },
  
  limparDados() {
    const confirmacao = confirm('Tem certeza? Esta ação não pode ser desfeita. Todos os seus dados serão apagados.');
    
    if (confirmacao) {
      DADOS.limparTodos();
      TRANSACOES.init();
      ORCAMENTO.init();
      
      UTILS.mostrarToast('Todos os dados foram apagados.', 'warning');
      
      // Recarregar a página
      setTimeout(() => {
        location.reload();
      }, 1500);
    }
  },
  
  aplicarTema() {
    const config = DADOS.getConfig();
    if (config.tema === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG_USER;
}
