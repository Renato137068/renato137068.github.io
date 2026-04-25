(function () {
  'use strict';

  /* ─── P3.10 · Categorias Brasileiras Expandidas + Sugestão por Keyword ── */

  // Extensão das categorias existentes (definidas em config.js como frozen)
  // Usamos janela de compatibilidade: se já frozen, criamos mapa alternativo
  const CATS_BR_ICON = {
    /* existentes */
    alimentacao: '🍔', moradia: '🏠', transporte: '🚗', saude: '💊',
    educacao: '📚', lazer: '🎮', vestuario: '👕', salario: '💼',
    freelance: '💻', investimentos: '📈', outros: '📦',
    /* novas categorias brasileiras */
    streaming: '📺',
    delivery: '🛵',
    farmacia: '💊',
    academia: '🏋️',
    pet: '🐾',
    seguro: '🛡️',
    combustivel: '⛽',
    telefone: '📱',
    condominio: '🏢',
    plano_saude: '🏥',
    iptu: '🏛️',
    ipva: '🚘',
    impostos: '📋',
    viagem: '✈️',
    presente: '🎁',
    beleza: '💅',
    assinatura: '🔄',
    alimentacao_fora: '🍽️',
    mercado: '🛒',
    poupanca: '🐷',
    aluguel: '🔑',
    luz: '💡',
    agua: '💧',
    internet: '🌐',
    '': '📌'
  };

  const CATS_BR_LABEL = {
    alimentacao: 'Alimentação', moradia: 'Moradia', transporte: 'Transporte',
    saude: 'Saúde', educacao: 'Educação', lazer: 'Lazer', vestuario: 'Vestuário',
    salario: 'Salário', freelance: 'Freelance', investimentos: 'Investimentos',
    outros: 'Outros',
    streaming: 'Streaming', delivery: 'Delivery', farmacia: 'Farmácia',
    academia: 'Academia', pet: 'Pet', seguro: 'Seguro', combustivel: 'Combustível',
    telefone: 'Telefone/Celular', condominio: 'Condomínio', plano_saude: 'Plano de Saúde',
    iptu: 'IPTU', ipva: 'IPVA', impostos: 'Impostos/Taxas', viagem: 'Viagem/Turismo',
    presente: 'Presentes', beleza: 'Beleza/Estética', assinatura: 'Assinaturas',
    alimentacao_fora: 'Alimentação Fora', mercado: 'Supermercado',
    poupanca: 'Poupança/Reserva', aluguel: 'Aluguel', luz: 'Energia Elétrica',
    agua: 'Água/Saneamento', internet: 'Internet/TV'
  };

  // Palavras-chave → categoria (ordem importa: mais específico primeiro)
  const KEYWORDS = [
    // Streaming
    [/netflix|spotify|prime\s?video|disney\+?|hbo\s?max|globo\s?play|paramount|deezer|apple\s?tv|crunchyroll|youtube\s?premium/i, 'streaming'],
    // Delivery
    [/ifood|rappi|uber\s?eats|james|99food|goomer|aiqfome/i, 'delivery'],
    // Transporte / Ride
    [/uber|99\s?taxi|cabify|lyft|indriver|valet|estacionamento|pedágio|pedagio|zona\s?azul/i, 'transporte'],
    // Combustível
    [/posto|gasolina|etanol|diesel|combustível|gnv|br\s?distribui/i, 'combustivel'],
    // Mercado / Supermercado
    [/extra|carrefour|mercado\s?livre|walmart|assaí|assai|atacadão|atacadao|hiper\s?bom|pão\s?de\s?açúcar|pao\s?de\s?acucar|dia\s?super|coop\s?super|perini|sams\s?club|costco|st\s?marche/i, 'mercado'],
    // Alimentação fora
    [/mc\s?donalds|burger\s?king|subway|bob.s\b|kfc|pizza\s?hut|dominos|giraffas|madero|outback|bk\b|restaurante|lanchonete|pizzaria|sushi|starbucks|drinks/i, 'alimentacao_fora'],
    // Farmácia
    [/drogasil|droga\s?raia|panvel|ultrafarma|drogaria|farmácia|farmacia|ultrafarma|medifarma/i, 'farmacia'],
    // Internet / Telecom
    [/vivo|claro|tim\b|oi\b|nextel|algar|sky\b|net\b|gvt|brisanet|internet|banda\s?larga|fibra/i, 'internet'],
    // Telefone / Celular
    [/recarga|crédito\s?celular|credito\s?celular|celular|whatsapp|linha\s?movel/i, 'telefone'],
    // Academia / Esporte
    [/academia|smartfit|bluefit|bodytech|crossfit|natação|natacao|musculação|gym|fitness/i, 'academia'],
    // Plano de Saúde
    [/unimed|amil|bradesco\s?saúde|bradesco\s?saude|sulamerica\s?saude|notre\s?dame|hapvida|porto\s?seguro\s?saude|convenio|plano\s?saude|plano\s?de\s?saúde/i, 'plano_saude'],
    // Seguro
    [/seguro\s?auto|seguro\s?vida|seguro\s?residencial|porto\s?seguro|tokio|liberty\s?mutual|suhai|generali|mapfre/i, 'seguro'],
    // IPTU
    [/iptu|prefeitura|tributo\s?imov/i, 'iptu'],
    // IPVA
    [/ipva|detran|licenciamento|vistoria\s?veic/i, 'ipva'],
    // Impostos / Taxas
    [/receita\s?federal|irpf|das\s?mei|simples\s?nacional|inss|fgts|taxas?\s?federal|guia\s?darf|gps\s?inss/i, 'impostos'],
    // Condomínio / Moradia
    [/condomínio|condominio|taxa\s?cond|administradora|síndico/i, 'condominio'],
    // Aluguel
    [/aluguel|alugar|locação|locacao|quitinete|zap\s?imov|viva\s?real/i, 'aluguel'],
    // Luz / Energia
    [/cemig|copel|enel|light\b|cpfl|energisa|coelba|celpe|celesc|conta\s?luz|energia\s?elet/i, 'luz'],
    // Água / Saneamento
    [/sabesp|cagece|copasa|caesb|sanepar|caerd|aguas\b|saneamento|conta\s?agua/i, 'agua'],
    // Pet
    [/veterinário|veterinario|pet\s?shop|cobasi|petz|racao|ração|banho\s?tosa|castracao/i, 'pet'],
    // Beleza
    [/salão|salao|cabeleireiro|barbearia|manicure|estetica|estética|spa\b|depilação|depilacao|botox/i, 'beleza'],
    // Viagem
    [/hotel|pousada|hostel|airbnb|booking|decolar|latam|gol\b|azul\b|avianca|passagem|voo\b|aeroporto|rodoviaria|embarque/i, 'viagem'],
    // Presente
    [/presente|gift|aniversario|natal|casamento|chá\s?de\s?bebê/i, 'presente'],
    // Assinaturas genéricas
    [/assinatura|mensalidade|anuidade|subscription/i, 'assinatura'],
    // Educação
    [/escola|faculdade|universidade|udemy|coursera|alura|rocketseat|curso|mensalidade\s?escolar|creche|material\s?escolar/i, 'educacao'],
    // Poupança / Reserva (transferências internas)
    [/poupança|poupanca|reserva\s?emergência|tesouro\s?direto|cdb|lci|lca|fundo\s?investimento/i, 'investimentos'],
    // Salário / Receita
    [/salário|salario|holerite|contra-cheque|pagamento\s?empresa|folha\s?pagamento/i, 'salario'],
    // Freelance / Renda extra
    [/freelance|freela|bico|renda\s?extra|recebimento\s?pix|honorários|honorarios/i, 'freelance'],
    // Lazer
    [/cinema|teatro|show\b|parque|balada|festa|ingresso|jogo\b|bar\b|pub\b/i, 'lazer'],
    // Vestuário
    [/roupa|calçado|calcado|tenis|tênis|camisa|calça|vestido|loja\s?moda|renner|c&a|hering|riachuelo|zara/i, 'vestuario'],
    // Saúde genérica
    [/medico|médico|dentista|exame|laboratorio|laboratório|clínica|clinica|consulta|hospital/i, 'saude'],
    // Alimentação genérica
    [/mercadinho|feira|hortifruti|padaria|açougue|acougue/i, 'alimentacao'],
    // Transporte público
    [/metrô|metro|ônibus|onibus|trem\b|brt\b|bilhete|cartão\s?trans|cartao\s?trans/i, 'transporte'],
  ];

  /**
   * Sugere categoria com base na descrição da transação
   * @param {string} desc - descrição/texto da transação
   * @returns {string} - chave de categoria ou '' se não reconhecer
   */
  function sugerirCategoria(desc) {
    if (!desc || typeof desc !== 'string') return '';
    const texto = desc.trim();
    for (const [regex, cat] of KEYWORDS) {
      if (regex.test(texto)) return cat;
    }
    return '';
  }

  /**
   * Retorna lista de todas as categorias (existentes + novas BR)
   */
  function getTodasCategorias() {
    return Object.keys(CATS_BR_LABEL).filter(k => k !== '');
  }

  /**
   * Auto-fill campo categoria no formulário principal
   * @param {string} descricao - valor do campo descrição
   */
  function autoCategoria(descricao) {
    const sugestao = sugerirCategoria(descricao);
    if (!sugestao) return;
    const sel = document.getElementById('tx-cat');
    if (sel && sel.value === '' && sugestao) {
      // Verifica se a opção existe no select
      const opt = sel.querySelector('option[value="' + sugestao + '"]');
      if (opt) {
        sel.value = sugestao;
        sel.style.borderColor = 'var(--success)';
        setTimeout(() => { sel.style.borderColor = ''; }, 2000);
      }
    }
  }

  /**
   * Popula um <select> com todas as categorias BR
   */
  function popularSelectCategorias(selectEl, valorAtual) {
    if (!selectEl) return;
    const grupos = {
      'Receitas': ['salario', 'freelance', 'investimentos', 'poupanca'],
      'Alimentação': ['alimentacao', 'alimentacao_fora', 'mercado', 'delivery'],
      'Moradia': ['moradia', 'aluguel', 'condominio', 'luz', 'agua', 'internet', 'iptu'],
      'Transporte': ['transporte', 'combustivel', 'ipva', 'seguro'],
      'Saúde': ['saude', 'farmacia', 'plano_saude', 'academia'],
      'Entretenimento': ['lazer', 'streaming', 'assinatura'],
      'Educação': ['educacao'],
      'Pessoal': ['vestuario', 'beleza', 'pet', 'presente'],
      'Impostos': ['impostos', 'impostos'],
      'Outros': ['telefone', 'viagem', 'outros']
    };

    selectEl.innerHTML = '<option value="">📌 Selecione...</option>';
    for (const [grupo, cats] of Object.entries(grupos)) {
      const og = document.createElement('optgroup');
      og.label = grupo;
      const seen = new Set();
      for (const cat of cats) {
        if (seen.has(cat) || !CATS_BR_LABEL[cat]) continue;
        seen.add(cat);
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = (CATS_BR_ICON[cat] || '') + ' ' + CATS_BR_LABEL[cat];
        if (cat === valorAtual) opt.selected = true;
        og.appendChild(opt);
      }
      selectEl.appendChild(og);
    }
  }

  // Expor globalmente
  window.CATS_BR_ICON = CATS_BR_ICON;
  window.CATS_BR_LABEL = CATS_BR_LABEL;
  window.sugerirCategoria = sugerirCategoria;
  window.autoCategoria = autoCategoria;
  window.getTodasCategorias = getTodasCategorias;
  window.popularSelectCategorias = popularSelectCategorias;

  // Hook automático: ao digitar descrição, sugerir categoria
  document.addEventListener('DOMContentLoaded', function () {
    const descInput = document.getElementById('tx-desc');
    if (descInput) {
      descInput.addEventListener('blur', function () {
        autoCategoria(this.value);
      });
      // Também ao pressionar Tab ou Enter
      descInput.addEventListener('keydown', function (e) {
        if (e.key === 'Tab' || e.key === 'Enter') {
          autoCategoria(this.value);
        }
      });
    }
  });

})();
