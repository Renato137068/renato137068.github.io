// FinançasPro — P3.1 Dica do Dia + Glossário Contextual
// Banco de dicas rotativas por dia do ano + tooltips de termos financeiros

(function() {
  'use strict';

  // ── Banco de dicas (30 dicas, ~60 palavras cada) ────────────
  const DICAS = [
    { icon:'💡', titulo:'Reserva de Emergência', texto:'Mantenha de 3 a 6 meses de despesas em aplicação de liquidez diária (Tesouro Selic ou CDB 100% CDI). Essa reserva é sua rede de segurança — nunca invista esse dinheiro em ativos de risco. Sem ela, qualquer imprevisto vira dívida.' },
    { icon:'📊', titulo:'Regra 50/30/20', texto:'Divida sua renda: 50% para necessidades (moradia, alimentação, saúde), 30% para desejos (lazer, assinaturas, restaurantes) e 20% para poupança e investimentos. É um ponto de partida — ajuste conforme sua realidade e metas.' },
    { icon:'⏰', titulo:'Juros Compostos', texto:'Juros sobre juros fazem seu dinheiro crescer exponencialmente. R$ 500/mês a 10% a.a. viram R$ 380 mil em 20 anos. Quanto mais cedo você começa, menos precisa investir para chegar ao mesmo resultado.' },
    { icon:'🎯', titulo:'Metas SMART', texto:'Defina metas Específicas, Mensuráveis, Atingíveis, Relevantes e com Tempo definido. Em vez de "quero economizar mais", prefira "vou guardar R$ 300/mês por 12 meses para a viagem". Metas vagas raramente saem do papel.' },
    { icon:'💳', titulo:'Perigo do Rotativo do Cartão', texto:'O crédito rotativo brasileiro cobra em média 400% ao ano — o mais caro do mundo. Pagar o mínimo da fatura transforma R$ 1.000 em R$ 5.000 em pouco tempo. Quite sempre o valor integral ou parcele em crédito pessoal com taxa menor.' },
    { icon:'📈', titulo:'Diversificação de Carteira', texto:'Não concentre tudo em um único ativo. Combine renda fixa (segurança), ações (crescimento), FIIs (renda passiva) e reserva de emergência. Diversificar reduz o risco sem necessariamente reduzir o retorno esperado.' },
    { icon:'🏠', titulo:'Financiamento vs. Aluguel', texto:'Financiar não é necessariamente melhor que alugar. Some os juros totais do financiamento e compare com o aluguel do mesmo período aplicando o valor da entrada. Em muitas cidades brasileiras, alugar e investir a diferença é matematicamente superior.' },
    { icon:'🔄', titulo:'Inflação Silenciosa', texto:'A inflação corrói o poder de compra do dinheiro parado. R$ 10.000 na poupança rendendo 6% a.a. enquanto a inflação é 8% significa perda real de 2% ao ano. Seu dinheiro precisa render acima da inflação para crescer de verdade.' },
    { icon:'📉', titulo:'Fundo de Emergência Antes de Investir', texto:'Antes de investir em ações ou criptomoedas, tenha sua reserva de emergência completa. Sem ela, você pode ser forçado a vender investimentos no pior momento — justamente quando o mercado caiu — para cobrir imprevistos.' },
    { icon:'🧾', titulo:'IR sobre Investimentos', texto:'Ações: isentas até R$ 20.000/mês em vendas; acima disso, 15% sobre o lucro. Renda fixa: tabela regressiva de 22,5% (até 180 dias) a 15% (acima de 720 dias). Planeje o timing de resgates para pagar menos imposto legalmente.' },
    { icon:'💰', titulo:'Efeito Latte', texto:'Pequenos gastos diários somam muito. R$ 15/dia em café e lanches = R$ 450/mês = R$ 5.400/ano. Isso não significa abrir mão de prazer — significa ter consciência das escolhas para priorizar o que realmente importa para você.' },
    { icon:'🏦', titulo:'CDB vs. Tesouro Direto', texto:'CDB (banco) e Tesouro Direto (governo) são os pilares da renda fixa. Tesouro Selic tem liquidez diária e é ideal para emergência. CDBs de bancos menores pagam mais (até 120% CDI) mas têm cobertura do FGC até R$ 250 mil.' },
    { icon:'🎓', titulo:'Previdência Privada', texto:'PGBL é ideal para quem declara IR no modelo completo (deduz até 12% da renda bruta). VGBL é melhor para os demais. Ambos têm planos progressivos e regressivos de IR — o regressivo é vantajoso para horizontes acima de 10 anos.' },
    { icon:'📱', titulo:'Open Finance', texto:'O Open Finance Brasil permite que você autorize bancos a compartilharem seus dados com outros apps. Isso possibilita importar extratos automaticamente, receber melhores ofertas de crédito e ter uma visão consolidada de todas suas contas.' },
    { icon:'⚖️', titulo:'Dívida Boa vs. Dívida Ruim', texto:'Dívida "boa" financia ativos que se valorizam (imóvel para renda, educação). Dívida "ruim" financia consumo que se desvaloriza imediatamente (roupas no crediário, viagem no rotativo). A diferença não é o valor — é o que você compra com ela.' },
    { icon:'🔑', titulo:'Renda Passiva', texto:'Renda passiva é a que chega sem você trabalhar ativamente: dividendos de ações, aluguéis de FIIs, juros de renda fixa. A liberdade financeira ocorre quando sua renda passiva supera suas despesas. Construa devagar, mas comece hoje.' },
    { icon:'📊', titulo:'P/L de Ações', texto:'O índice Preço/Lucro (P/L) mostra quantos anos de lucro atual você paga pela ação. P/L 10 = 10 anos. Não existe número certo — compare com o histórico da empresa e concorrentes do setor. Ação "barata" nem sempre é boa compra.' },
    { icon:'💵', titulo:'Câmbio e Proteção', texto:'Se você tem gastos ou sonhos em dólar (viagem, produto importado, filhos no exterior), diversifique parte dos investimentos em ativos dolarizados: ETFs como IVVB11 ou BDRs. É proteção cambial, não especulação.' },
    { icon:'🏗️', titulo:'FIIs — Fundos Imobiliários', texto:'FIIs distribuem ao menos 95% do lucro como dividendos mensais, isentos de IR para pessoa física. Você investe em shopping, galpão, hospital ou escritório a partir de R$ 10. Liquidez diária na bolsa, diferente do imóvel físico.' },
    { icon:'⚡', titulo:'Automatize Poupança', texto:'Configure transferência automática no dia do pagamento: salário entrou → R$ X já foram para investimentos. Você gasta o que sobra, não poupa o que sobra. Quem automatiza poupa em média 3x mais que quem tenta poupar manualmente.' },
    { icon:'🌍', titulo:'Custo Real do Crédito', texto:'Antes de parcelar, calcule o Custo Efetivo Total (CET), não só a taxa nominal. Uma compra de R$ 1.000 em 12x de R$ 110 parece razoável, mas o CET pode passar de 30% a.a. Sempre compare o total pago com o preço à vista.' },
    { icon:'📋', titulo:'Declaração de IR', texto:'Guarde comprovantes de investimentos, despesas médicas e receitas por pelo menos 5 anos — prazo de prescrição da Receita Federal. Use o GCAP para calcular ganho de capital em ações. O erro mais comum: esquecer de declarar investimentos no exterior.' },
    { icon:'🎲', titulo:'Risco e Retorno', texto:'Todo investimento tem uma relação risco-retorno. Rendimento acima da média significa maior risco. Se alguém oferece 3% ao mês "garantido", é golpe — nenhum investimento legítimo paga isso de forma sustentável. Desconfie sempre de promessas.' },
    { icon:'🏅', titulo:'Consistência Bate Intensidade', texto:'Investir R$ 300/mês por 30 anos supera R$ 3.000/mês por 3 anos. O tempo no mercado bate o timing do mercado. A melhor estratégia de investimento é a que você consegue manter consistentemente, mesmo nos meses difíceis.' },
    { icon:'💡', titulo:'Orçamento Base Zero', texto:'No orçamento base zero, você justifica cada centavo da renda antes de gastar. Comece do zero todo mês e aloque conscientemente para cada categoria. É mais trabalhoso que o 50/30/20, mas elimina gastos invisíveis que drenam o orçamento.' },
    { icon:'🛡️', titulo:'Seguros Essenciais', texto:'Antes de investir, proteja o patrimônio. Seguro de vida (se tem dependentes), saúde (para não liquidar reserva em emergências) e residencial são prioridade. Seguro não é gasto — é proteção do que você levou anos construindo.' },
    { icon:'📱', titulo:'Finanças Comportamentais', texto:'Nosso cérebro sabota as finanças: evitamos perdas 2x mais do que buscamos ganhos (aversão à perda), e seguimos a maioria mesmo quando está errada (efeito manada). Conhecer esses vieses é o primeiro passo para não cair neles.' },
    { icon:'🔢', titulo:'Taxa SELIC', texto:'A Selic é a taxa básica de juros da economia brasileira, definida pelo COPOM (Banco Central). Ela influencia todos os outros juros: quando sobe, crédito fica caro e renda fixa melhora; quando cai, estímulo ao consumo e às ações.' },
    { icon:'💼', titulo:'Previdência vs. Tesouro', texto:'Para aposentadoria, compare PGBL/VGBL com Tesouro IPCA+. O Tesouro é mais transparente e barato (sem taxa de carregamento). A previdência vence se você está no topo do IR e pode deduzir os 12%. Calcule antes de decidir.' },
    { icon:'🎯', titulo:'Independência Financeira', texto:'FIRE (Financial Independence, Retire Early): calcule sua Independência multiplicando suas despesas anuais por 25 (Regra dos 4%). Despesas de R$ 5.000/mês = R$ 60.000/ano = patrimônio alvo de R$ 1.500.000. Parece muito, mas o tempo trabalha por você.' },
  ];

  // ── Glossário de termos financeiros ────────────────────────
  const GLOSSARIO = {
    'selic':    'Taxa básica de juros definida pelo Banco Central do Brasil, referência para toda a economia.',
    'cdi':      'Certificado de Depósito Interbancário — taxa de referência para investimentos de renda fixa, próxima à Selic.',
    'cdb':      'Certificado de Depósito Bancário — investimento de renda fixa emitido por bancos, garantido pelo FGC até R$ 250 mil.',
    'fgc':      'Fundo Garantidor de Créditos — protege investidores em até R$ 250 mil por instituição em caso de falência do banco.',
    'ipca':     'Índice de Preços ao Consumidor Amplo — principal índice de inflação do Brasil, medido pelo IBGE.',
    'lci':      'Letra de Crédito Imobiliário — renda fixa isenta de IR para pessoas físicas, emitida por bancos.',
    'lca':      'Letra de Crédito do Agronegócio — similar à LCI, porém lastreada no agronegócio. Também isenta de IR.',
    'fii':      'Fundo de Investimento Imobiliário — fundo negociado em bolsa que distribui renda mensal, equivalente a ser "dono" de imóveis.',
    'p/l':      'Preço/Lucro — quantos anos de lucro atual você paga pela ação. Métrica de valuation básica.',
    'pgbl':     'Plano Gerador de Benefício Livre — previdência privada que permite deduzir até 12% da renda bruta no IR.',
    'vgbl':     'Vida Gerador de Benefício Livre — previdência sem dedução de IR, indicada para quem faz declaração simplificada.',
    'etf':      'Exchange Traded Fund — fundo de índice negociado em bolsa. Ex.: IVVB11 replica o S&P 500 americano em reais.',
    'bdr':      'Brazilian Depositary Receipt — recibo de ações estrangeiras negociadas na B3, como Apple, Amazon e Google.',
    'cet':      'Custo Efetivo Total — percentual que inclui juros + tarifas + IOF. Sempre compare o CET, não só a taxa nominal.',
    'copom':    'Comitê de Política Monetária do Banco Central, que define a taxa Selic a cada 45 dias.',
    'fire':     'Financial Independence, Retire Early — movimento de independência financeira antecipada baseado na Regra dos 4%.',
  };

  // ── Dica do dia (rotação por data) ──────────────────────────
  function getDicaHoje() {
    const dia = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return DICAS[dia % DICAS.length];
  }

  function renderDicaDia() {
    const el = document.getElementById('dica-do-dia');
    if (!el) return;
    const d = getDicaHoje();
    el.innerHTML =
      '<div class="dica-header">' +
        '<span class="dica-icon">' + d.icon + '</span>' +
        '<span class="dica-titulo">' + d.titulo + '</span>' +
        '<button class="dica-prox-btn" onclick="proximaDica()" aria-label="Próxima dica" title="Ver outra dica">🔄</button>' +
      '</div>' +
      '<p class="dica-texto">' + _aplicarGlossario(d.texto) + '</p>';
  }
  window.renderDicaDia = renderDicaDia;

  let _dicaOffset = 0;
  function proximaDica() {
    _dicaOffset = (_dicaOffset + 1) % DICAS.length;
    const dia = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const d = DICAS[(dia + _dicaOffset) % DICAS.length];
    const el = document.getElementById('dica-do-dia');
    if (!el) return;
    el.innerHTML =
      '<div class="dica-header">' +
        '<span class="dica-icon">' + d.icon + '</span>' +
        '<span class="dica-titulo">' + d.titulo + '</span>' +
        '<button class="dica-prox-btn" onclick="proximaDica()" aria-label="Próxima dica">🔄</button>' +
      '</div>' +
      '<p class="dica-texto">' + _aplicarGlossario(d.texto) + '</p>';
  }
  window.proximaDica = proximaDica;

  // ── Glossário contextual (sublinha termos e mostra tooltip) ─
  function _aplicarGlossario(texto) {
    let result = texto;
    Object.entries(GLOSSARIO).forEach(([termo, def]) => {
      const re = new RegExp('\\b(' + termo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')\\b', 'gi');
      result = result.replace(re, (m) =>
        '<abbr class="glossario-termo" title="' + def.replace(/"/g,'&quot;') + '">' + m + '</abbr>'
      );
    });
    return result;
  }

  // ── Glossário completo ───────────────────────────────────────
  function renderGlossario() {
    const el = document.getElementById('glossario-panel');
    if (!el) return;
    const busca = (document.getElementById('glossario-busca')?.value || '').toLowerCase();
    const entries = Object.entries(GLOSSARIO)
      .filter(([t, d]) => !busca || t.includes(busca) || d.toLowerCase().includes(busca))
      .sort((a, b) => a[0].localeCompare(b[0]));
    el.innerHTML = entries.length === 0
      ? '<p style="color:var(--text-muted);padding:20px;text-align:center;">Nenhum termo encontrado.</p>'
      : entries.map(([t, d]) =>
          '<div class="glossario-item"><span class="glossario-chave">' + t.toUpperCase() + '</span>' +
          '<p class="glossario-def">' + d + '</p></div>'
        ).join('');
  }
  window.renderGlossario = renderGlossario;

  // ── Init ────────────────────────────────────────────────────
  function _init() { renderDicaDia(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else { _init(); }

})();
