// ═══════════════════════════════════════════════
// CONSULTORIA FINANCEIRA — VITOR DAVANZO CFP®
// app.js — Lógica completa do sistema
// ═══════════════════════════════════════════════

const PAGES = ['page-dados','page-dividas','page-diagnostico','page-estrategia','page-relatorio'];
const TITLES = ['Dados do Cliente','Mapeamento de Dívidas','Diagnóstico Financeiro','Estratégia Recomendada','Relatório Final'];
const SUBS   = ['Passo 1 de 5 — Identificação e renda','Passo 2 de 5 — Raio-X das dívidas','Passo 3 de 5 — Análise automática','Passo 4 de 5 — Seleção do plano','Passo 5 de 5 — Exportação do relatório'];

let estrategiaSelecionada = 'avalanche';

// ── FORMATAÇÃO MONETÁRIA NOS INPUTS ───────────
// Armazena o valor numérico puro em data-raw e exibe formatado
function formatarInputMonetario(input) {
  // Remove tudo que não for dígito
  let raw = input.value.replace(/\D/g, '');
  if (!raw) { input.value = ''; input.dataset.raw = '0'; return; }
  // Converte para número com 2 casas decimais
  let num = parseInt(raw, 10) / 100;
  input.dataset.raw = num;
  // Formata no padrão brasileiro
  input.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getValorInput(input) {
  if (input.dataset.raw) return parseFloat(input.dataset.raw) || 0;
  // fallback: tenta parsear o valor exibido
  const v = input.value.replace(/\./g, '').replace(',', '.');
  return parseFloat(v) || 0;
}

function ativarFormatacao(input) {
  input.addEventListener('input', () => formatarInputMonetario(input));
  input.addEventListener('blur',  () => formatarInputMonetario(input));
  // Se já tiver valor numérico preenchido programaticamente
  if (input.value && !isNaN(input.value)) {
    let num = parseFloat(input.value);
    input.dataset.raw = num;
    input.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

// ── NAVEGAÇÃO ─────────────────────────────────
function goPage(id) {
  PAGES.forEach((p, i) => {
    const sec  = document.getElementById(p);
    const nav  = document.querySelector(`.nav-item[data-page="${p}"]`);
    const pill = document.querySelector(`.step-pill[data-step="${i}"]`);
    if (!sec) return;
    const isActive = p === id;
    sec.classList.toggle('active', isActive);
    if (nav)  nav.classList.toggle('active', isActive);
    if (pill) {
      pill.classList.toggle('active', isActive);
      pill.classList.toggle('done', !isActive && PAGES.indexOf(id) > i);
    }
  });
  const idx = PAGES.indexOf(id);
  document.getElementById('topbar-title').textContent = TITLES[idx];
  document.getElementById('topbar-sub').textContent   = SUBS[idx];
  if (id === 'page-diagnostico') gerarDiagnostico();
  if (id === 'page-estrategia')  gerarEstrategia();
  if (id === 'page-relatorio')   gerarRelatorio();
  window.scrollTo(0, 0);
}

function proximoPasso() {
  const active = PAGES.find(p => document.getElementById(p)?.classList.contains('active'));
  const idx = PAGES.indexOf(active);
  if (idx < PAGES.length - 1) goPage(PAGES[idx + 1]);
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => goPage(el.dataset.page));
});
document.querySelectorAll('.step-pill').forEach(el => {
  el.addEventListener('click', () => goPage(PAGES[+el.dataset.step]));
});

// ── HELPERS FINANCEIROS ────────────────────────
function fmt(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function pct(v) { return Number(v).toFixed(1) + '%'; }

function urgenciaColor(juros) {
  if (juros >= 10) return 'var(--red)';
  if (juros >= 5)  return 'var(--orange)';
  return 'var(--green)';
}
function urgenciaLabel(juros) {
  if (juros >= 10) return 'ALTO RISCO';
  if (juros >= 5)  return 'ATENÇÃO';
  return 'CONTROLÁVEL';
}
function semClass(juros) {
  if (juros >= 10) return 'sem-red';
  if (juros >= 5)  return 'sem-yellow';
  return 'sem-green';
}

// ── COLETA DE DADOS ───────────────────────────
function getDados() {
  const rendas = [...document.querySelectorAll('.renda-row')].map(r => ({
    desc: r.querySelector('.renda-desc')?.value || '',
    val:  getValorInput(r.querySelector('.renda-val')),
  })).filter(r => r.val > 0);

  const despesas = [...document.querySelectorAll('.desp-row')].map(r => ({
    desc: r.querySelector('.desp-desc')?.value || '',
    val:  getValorInput(r.querySelector('.desp-val')),
  })).filter(d => d.val > 0);

  const dividas = [...document.querySelectorAll('.divida-row')].map(r => ({
    credor:        r.querySelector('.div-credor')?.value  || '—',
    saldo:         getValorInput(r.querySelector('.div-saldo')),
    juros:         parseFloat(r.querySelector('.div-juros')?.value?.replace(',','.')) || 0,
    parcela:       getValorInput(r.querySelector('.div-parcela')),
    totalParcelas: parseInt(r.querySelector('.div-total-parcelas')?.value) || 0,
    pagasParcelas: parseInt(r.querySelector('.div-pagas')?.value) || 0,
  })).filter(d => d.saldo > 0);

  const totalRenda      = rendas.reduce((a, r) => a + r.val, 0);
  const totalDespesas   = despesas.reduce((a, d) => a + d.val, 0);
  const totalParcelas   = dividas.reduce((a, d) => a + d.parcela, 0);
  const totalDividas    = dividas.reduce((a, d) => a + d.saldo, 0);
  const comprometimento = totalRenda > 0 ? (totalParcelas / totalRenda * 100) : 0;
  const saldoLivre      = totalRenda - totalDespesas - totalParcelas;

  return { rendas, despesas, dividas, totalRenda, totalDespesas, totalParcelas, totalDividas, comprometimento, saldoLivre };
}

function custaInerciaTotal(dividas) {
  return dividas.reduce((acc, d) => {
    const meses = 24, r = d.juros / 100;
    if (r === 0) return acc;
    if (d.parcela <= d.saldo * r) return acc + d.saldo * r * 24;
    const total = d.saldo * (r * Math.pow(1+r, meses)) / (Math.pow(1+r, meses) - 1) * meses;
    return acc + Math.max(0, total - d.saldo);
  }, 0);
}

// ── SIMULAÇÕES ────────────────────────────────
function simular(dividas, saldoLivre, ordem) {
  if (!dividas.length || saldoLivre <= 0) return { meses: 0, jurosTotal: 0 };
  let divs = dividas.map(d => ({ ...d, atual: d.saldo }));
  if (ordem === 'avalanche') divs.sort((a,b) => b.juros - a.juros);
  else divs.sort((a,b) => a.saldo - b.saldo);
  let mes = 0, jurosTotal = 0;
  while (divs.some(d => d.atual > 0.01) && mes < 600) {
    mes++;
    for (const d of divs) {
      if (d.atual <= 0) continue;
      const j = d.atual * (d.juros / 100);
      jurosTotal += j;
      d.atual += j;
      d.atual = Math.max(0, d.atual - Math.min(d.parcela, d.atual));
    }
    const alvo = divs.find(d => d.atual > 0);
    if (alvo && saldoLivre > 0) alvo.atual = Math.max(0, alvo.atual - saldoLivre);
  }
  return { meses: mes, jurosTotal: Math.round(jurosTotal) };
}

// ── CRIAR INPUT MONETÁRIO ─────────────────────
function criarInputMonetario(placeholder, className, extraStyle = '') {
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.placeholder = placeholder;
  input.className = className;
  if (extraStyle) input.style.cssText = extraStyle;
  ativarFormatacao(input);
  return input;
}

// ── ADICIONAR / REMOVER LINHAS ─────────────────
function adicionarRenda() {
  const el = document.getElementById('rendas-list');
  const row = document.createElement('div');
  row.className = 'renda-row';

  const descWrap = document.createElement('div'); descWrap.className = 'field';
  const descInput = document.createElement('input');
  descInput.type = 'text'; descInput.placeholder = 'Ex: Salário CLT'; descInput.className = 'renda-desc';
  descWrap.appendChild(descInput);

  const valWrap = document.createElement('div'); valWrap.className = 'field';
  const valInput = criarInputMonetario('R$ 0,00', 'renda-val');
  valWrap.appendChild(valInput);

  const btn = document.createElement('button');
  btn.className = 'btn-remove'; btn.innerHTML = '<i class="ti ti-x"></i>';
  btn.setAttribute('tabindex', '-1');
  btn.onclick = () => row.remove();

  row.appendChild(descWrap); row.appendChild(valWrap); row.appendChild(btn);
  el.appendChild(row);
}

// ── DESPESAS PADRÃO ───────────────────────────
const DESPESAS_PADRAO = [
  'Aluguel', 'Condomínio', 'Água', 'Luz', 'Gás',
  'Telefone', 'Internet', 'Plano de saúde', 'Mercado', 'Escola / Faculdade'
];

function adicionarDesp(descricao = '') {
  const el = document.getElementById('despesas-list');
  const row = document.createElement('div');
  row.className = 'desp-row renda-row';

  const descWrap = document.createElement('div'); descWrap.className = 'field';
  const descInput = document.createElement('input');
  descInput.type = 'text'; descInput.placeholder = 'Descrição'; descInput.className = 'desp-desc';
  if (descricao) descInput.value = descricao;
  descWrap.appendChild(descInput);

  const valWrap = document.createElement('div'); valWrap.className = 'field';
  const valInput = criarInputMonetario('R$ 0,00', 'desp-val');
  valWrap.appendChild(valInput);

  const btn = document.createElement('button');
  btn.className = 'btn-remove'; btn.innerHTML = '<i class="ti ti-x"></i>';
  btn.setAttribute('tabindex', '-1');
  btn.onclick = () => row.remove();

  // TAB inteligente: se descrição já preenchida, pula direto para valor
  descInput.addEventListener('keydown', e => {
    if (e.key === 'Tab' && !e.shiftKey && descInput.value.trim()) {
      e.preventDefault();
      valInput.focus();
      valInput.select();
    }
  });

  row.appendChild(descWrap); row.appendChild(valWrap); row.appendChild(btn);
  el.appendChild(row);
}

function inicializarDespesasPadrao() {
  DESPESAS_PADRAO.forEach(desc => adicionarDesp(desc));
}

function adicionarDivida() {
  const el = document.getElementById('dividas-list');
  const row = document.createElement('div');
  row.className = 'divida-row';

  const credorWrap = document.createElement('div'); credorWrap.className = 'field';
  const credorInput = document.createElement('input');
  credorInput.type = 'text'; credorInput.placeholder = 'Ex: Cartão Nubank'; credorInput.className = 'div-credor';
  credorWrap.appendChild(credorInput);

  const saldoWrap = document.createElement('div'); saldoWrap.className = 'field';
  const saldoInput = criarInputMonetario('R$ 0,00', 'div-saldo');
  saldoWrap.appendChild(saldoInput);

  const jurosWrap = document.createElement('div'); jurosWrap.className = 'field';
  const jurosInput = document.createElement('input');
  jurosInput.type = 'number'; jurosInput.placeholder = '0,0'; jurosInput.step = '0.1'; jurosInput.min = '0';
  jurosInput.className = 'div-juros';
  jurosWrap.appendChild(jurosInput);

  const parcelaWrap = document.createElement('div'); parcelaWrap.className = 'field';
  const parcelaInput = criarInputMonetario('R$ 0,00', 'div-parcela');
  parcelaWrap.appendChild(parcelaInput);

  const totalParcelasWrap = document.createElement('div'); totalParcelasWrap.className = 'field';
  const totalParcelasLabel = document.createElement('label'); totalParcelasLabel.textContent = 'Qtd. parcelas';
  const totalParcelasInput = document.createElement('input');
  totalParcelasInput.type = 'number'; totalParcelasInput.placeholder = '0'; totalParcelasInput.min = '0';
  totalParcelasInput.className = 'div-total-parcelas';
  totalParcelasWrap.appendChild(totalParcelasLabel);
  totalParcelasWrap.appendChild(totalParcelasInput);

  const pagasWrap = document.createElement('div'); pagasWrap.className = 'field';
  const pagasLabel = document.createElement('label'); pagasLabel.textContent = 'Pagas';
  const pagasInput = document.createElement('input');
  pagasInput.type = 'number'; pagasInput.placeholder = '0'; pagasInput.min = '0';
  pagasInput.className = 'div-pagas';
  pagasWrap.appendChild(pagasLabel);
  pagasWrap.appendChild(pagasInput);

  const btn = document.createElement('button');
  btn.className = 'btn-remove'; btn.innerHTML = '<i class="ti ti-x"></i>';
  btn.setAttribute('tabindex', '-1');
  btn.onclick = () => row.remove();

  row.appendChild(credorWrap); row.appendChild(saldoWrap);
  row.appendChild(jurosWrap);  row.appendChild(parcelaWrap);
  row.appendChild(totalParcelasWrap); row.appendChild(pagasWrap);
  row.appendChild(btn);
  el.appendChild(row);
}


// ── PÁGINA 3: DIAGNÓSTICO ─────────────────────
function gerarDiagnostico() {
  const d = getDados();
  const inertia = custaInerciaTotal(d.dividas);
  const saldo   = d.saldoLivre;

  let alertHTML = '';
  if (d.comprometimento > 50) {
    alertHTML = `<div class="alert-box alert-danger"><i class="ti ti-alert-triangle"></i><div><strong>Comprometimento crítico:</strong> ${pct(d.comprometimento)} da renda está comprometida com dívidas. Intervenção urgente necessária.</div></div>`;
  } else if (d.comprometimento > 30) {
    alertHTML = `<div class="alert-box alert-warning"><i class="ti ti-alert-circle"></i><div><strong>Atenção:</strong> ${pct(d.comprometimento)} da renda comprometida. Acima do limite saudável de 30%.</div></div>`;
  } else if (d.comprometimento > 0) {
    alertHTML = `<div class="alert-box alert-ok"><i class="ti ti-circle-check"></i><div>Comprometimento dentro do limite aceitável. A estratégia de quitação pode ser aplicada com tranquilidade.</div></div>`;
  }

  const dividasOrdenadas = [...d.dividas].sort((a,b) => b.juros - a.juros);
  const listaHTML = dividasOrdenadas.map(div => `
    <div class="div-item">
      <div class="div-item-name">${div.credor}</div>
      <div style="font-weight:600;color:var(--red);">${fmt(div.saldo)}</div>
      <div style="color:#888;">${pct(div.juros)} a.m.</div>
      <div>
        <span class="semaforo ${semClass(div.juros)}"></span>
        <span style="font-size:10px;font-weight:700;color:${urgenciaColor(div.juros)}">${urgenciaLabel(div.juros)}</span>
      </div>
    </div>`).join('');

  document.getElementById('diagnostico-content').innerHTML = `
    ${alertHTML}
    <div class="diagnostico-grid">
      <div class="diag-card">
        <div class="diag-val txt-green">${fmt(d.totalRenda)}</div>
        <div class="diag-label">Renda mensal total</div>
      </div>
      <div class="diag-card">
        <div class="diag-val" style="color:${d.comprometimento>30?'var(--red)':'var(--orange)'};">${fmt(d.totalParcelas)}</div>
        <div class="diag-label">Total em parcelas</div>
        <div class="diag-sub" style="color:${d.comprometimento>30?'var(--red)':'var(--orange)'};">${pct(d.comprometimento)} da renda</div>
      </div>
      <div class="diag-card">
        <div class="diag-val txt-red">${fmt(d.totalDividas)}</div>
        <div class="diag-label">Total em dívidas</div>
        <div class="diag-sub txt-ink2">${d.dividas.length} dívida${d.dividas.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="diag-card">
        <div class="diag-val" style="color:${saldo<0?'var(--red)':saldo<500?'var(--orange)':'var(--green)'};">${fmt(saldo)}</div>
        <div class="diag-label">Saldo livre mensal</div>
        <div class="diag-sub" style="color:${saldo<0?'var(--red)':'var(--gold)'};">${saldo<0?'Déficit!':'Para quitação'}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-sort-descending"></i> Dívidas por urgência — maior juro primeiro</div>
      ${listaHTML || '<p style="color:#bbb;font-size:12px;">Nenhuma dívida cadastrada.</p>'}
      <div class="inertia-box">
        <div class="inertia-val">${fmt(inertia)}</div>
        <div class="inertia-label">Custo da inércia: o que este cliente pagará a mais em juros nos próximos 24 meses<br>se nenhuma ação for tomada hoje.</div>
      </div>
    </div>`;
}

// ── PÁGINA 4: ESTRATÉGIA ──────────────────────
function gerarEstrategia() {
  const d  = getDados();
  const sl = Math.max(0, d.saldoLivre);
  const av = simular(d.dividas, sl, 'avalanche');
  const bn = simular(d.dividas, sl, 'bolaneve');
  const hi = { meses: Math.round((av.meses + bn.meses) / 2), jurosTotal: Math.round((av.jurosTotal + bn.jurosTotal) / 2) };

  let recomendada = 'avalanche';
  let justificativa = 'Alta concentração de dívidas com juros elevados. O método Avalanche elimina primeiro as dívidas de maior custo, reduzindo o total de juros pagos.';
  if (bn.meses <= av.meses * 0.85) {
    recomendada = 'bolaneve';
    justificativa = 'Há dívidas de pequeno saldo que podem ser quitadas rapidamente. O método Bola de Neve gera vitórias imediatas, mantendo a motivação do cliente.';
  } else if (d.comprometimento > 40) {
    recomendada = 'hibrido';
    justificativa = 'Comprometimento de renda elevado. A estratégia Híbrida equilibra ganho de motivação com economia de juros, adequada para este perfil.';
  }
  estrategiaSelecionada = recomendada;

  const cardsData = [
    { id: 'avalanche', nome: 'Avalanche',    desc: 'Ataca o maior juro primeiro. Economiza mais no longo prazo.', sim: av, dif: 'Alta' },
    { id: 'bolaneve',  nome: 'Bola de Neve', desc: 'Menor saldo primeiro. Gera motivação com vitórias rápidas.',  sim: bn, dif: 'Média' },
    { id: 'hibrido',   nome: 'Híbrida',      desc: 'Equilíbrio entre economia de juros e motivação comportamental.', sim: hi, dif: 'Média' },
  ];

  const cardsHTML = cardsData.map(c => `
    <div class="est-card ${c.id === recomendada ? 'recommended selected' : ''}" id="est-${c.id}" onclick="selecionarEst('${c.id}')">
      ${c.id === recomendada ? '<div class="est-badge">✦ RECOMENDADA</div>' : ''}
      <div class="est-name">${c.nome}</div>
      <div class="est-desc">${c.desc}</div>
      <div class="est-metric"><span class="est-metric-label">Prazo estimado</span><span class="est-metric-val">${c.sim.meses} meses</span></div>
      <div class="est-metric"><span class="est-metric-label">Juros totais</span><span class="est-metric-val txt-red">${fmt(c.sim.jurosTotal)}</span></div>
      <div class="est-metric"><span class="est-metric-label">Dificuldade</span><span class="est-metric-val">${c.dif}</span></div>
    </div>`).join('');

  const dividasPriorizadas = [...d.dividas].sort((a,b) => recomendada === 'bolaneve' ? a.saldo - b.saldo : b.juros - a.juros);
  const ordemHTML = dividasPriorizadas.map((div, i) => `
    <div class="ordem-item">
      <div class="ordem-num">${i+1}</div>
      <div style="flex:1;font-weight:500;">${div.credor}</div>
      <div style="color:#999;font-size:11px;">${pct(div.juros)} a.m.</div>
      <div style="font-weight:600;color:var(--red);min-width:100px;text-align:right;">${fmt(div.saldo)}</div>
      ${i === 0 ? '<div style="color:var(--green);font-weight:600;font-size:11px;margin-left:8px;">← ATACAR AGORA</div>' : ''}
    </div>`).join('');

  document.getElementById('estrategia-content').innerHTML = `
    <div class="card">
      <div class="tag-gold">Motor de Estratégia</div>
      <div class="card-title"><i class="ti ti-brain"></i> Comparativo automático das estratégias</div>
      <div class="estrategia-cards">${cardsHTML}</div>
      <div class="alert-box alert-ok" style="margin-top:4px;">
        <i class="ti ti-info-circle"></i>
        <div><strong>Justificativa:</strong> ${justificativa}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-list-numbers"></i> Ordem de ataque das dívidas</div>
      ${ordemHTML || '<p style="color:#bbb;font-size:12px;">Nenhuma dívida cadastrada.</p>'}
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-trending-up"></i> Saldo disponível para quitação acelerada</div>
      <div style="font-size:24px;font-weight:700;color:${d.saldoLivre>0?'var(--green)':'var(--red)'};">${fmt(d.saldoLivre)}</div>
      <div style="font-size:12px;color:#aaa;margin-top:4px;">por mês disponível para acelerar as quitações</div>
      ${d.saldoLivre <= 0 ? '<div class="alert-box alert-danger" style="margin-top:12px;"><i class="ti ti-alert-triangle"></i><div>Sem saldo livre. É necessário reduzir despesas ou aumentar renda antes de aplicar qualquer estratégia.</div></div>' : ''}
    </div>`;
}

function selecionarEst(id) {
  estrategiaSelecionada = id;
  ['avalanche','bolaneve','hibrido'].forEach(e => {
    document.getElementById('est-' + e)?.classList.toggle('selected', e === id);
  });
}

// ── PÁGINA 5: RELATÓRIO ───────────────────────
function gerarRelatorio() {
  const nome    = document.getElementById('cli-nome').value    || 'Cliente';
  const cidade  = document.getElementById('cli-cidade').value  || '';
  const prof    = document.getElementById('cli-profissao').value || '';
  const ec      = document.getElementById('cli-estado-civil').value || '';
  const dataRaw = document.getElementById('cli-data').value;
  const dataFmt = dataRaw ? new Date(dataRaw + 'T12:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');

  const d       = getDados();
  const inertia = custaInerciaTotal(d.dividas);
  const sl      = Math.max(0, d.saldoLivre);
  const simAtual = simular(d.dividas, sl, estrategiaSelecionada === 'bolaneve' ? 'bolaneve' : 'avalanche');
  const nomeEst  = { avalanche: 'Avalanche', bolaneve: 'Bola de Neve', hibrido: 'Híbrida' }[estrategiaSelecionada];

  const dividasPriorizadas = [...d.dividas].sort((a,b) => estrategiaSelecionada === 'bolaneve' ? a.saldo - b.saldo : b.juros - a.juros);

  const tabelaDividas = d.dividas.map((div) => `
    <tr>
      <td>${div.credor}</td>
      <td style="text-align:right;font-weight:600;color:var(--red);">${fmt(div.saldo)}</td>
      <td style="text-align:center;font-weight:600;color:${urgenciaColor(div.juros)};">${pct(div.juros)}</td>
      <td style="text-align:right;">${fmt(div.parcela)}</td>
      <td style="text-align:center;font-size:10px;font-weight:700;color:${urgenciaColor(div.juros)};">${urgenciaLabel(div.juros)}</td>
    </tr>`).join('');

  const ordemAtaque = dividasPriorizadas.map((div, i) => `
    <div class="rel-acao-item">
      <div class="rel-acao-num">${i+1}.</div>
      <div>
        <div style="font-weight:600;">${div.credor} — ${fmt(div.saldo)}</div>
        <div class="rel-acao-prazo">${pct(div.juros)} a.m. · ${i===0?'ATACAR AGORA':'Aguardar quitação anterior'}</div>
      </div>
    </div>`).join('');

  document.getElementById('relatorio-content').innerHTML = `
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-bottom:16px;">
      <button class="btn-outline" onclick="window.print()"><i class="ti ti-printer"></i> Imprimir / PDF</button>
    </div>
    <div class="relatorio-preview" id="relatorio-doc">
      <div class="rel-header">
        <div>
          <img src="logo.png" alt="Vitor Davanzo" style="height:60px;display:block;margin-bottom:8px;">
          <div class="rel-brand-title">CONSULTORIA DE PLANEJAMENTO FINANCEIRO</div>
        </div>
        <div class="rel-contact">
          (19) 9.9221-1481<br>Piracicaba – SP<br>@vitor_davanzo_
        </div>
      </div>
      <div style="font-size:17px;font-weight:700;letter-spacing:0.03em;margin-bottom:3px;">PLANO FINANCEIRO ESTRATÉGICO</div>
      <div style="font-size:12px;color:#999;">
        Cliente: <strong style="color:var(--ink);">${nome}</strong>
        ${prof ? ' · ' + prof : ''}${ec ? ' · ' + ec : ''}
        &nbsp;|&nbsp; Data: ${dataFmt}${cidade ? ' · ' + cidade : ''}
      </div>
      <div class="rel-section-title">01. Diagnóstico Financeiro</div>
      <div class="rel-metricas">
        <div class="rel-metrica"><div class="rel-metrica-val txt-green">${fmt(d.totalRenda)}</div><div class="rel-metrica-label">Renda mensal</div></div>
        <div class="rel-metrica"><div class="rel-metrica-val txt-red">${fmt(d.totalDividas)}</div><div class="rel-metrica-label">Total em dívidas</div></div>
        <div class="rel-metrica"><div class="rel-metrica-val" style="color:${d.comprometimento>30?'var(--red)':'var(--green)'};">${pct(d.comprometimento)}</div><div class="rel-metrica-label">Renda comprometida</div></div>
      </div>
      <div class="rel-section-title">02. Raio-X das Dívidas</div>
      <table class="rel-table">
        <thead><tr><th>Credor</th><th style="text-align:right;">Saldo</th><th style="text-align:center;">Juros a.m.</th><th style="text-align:right;">Parcela</th><th style="text-align:center;">Urgência</th></tr></thead>
        <tbody>${tabelaDividas}</tbody>
        <tfoot><tr style="background:var(--ink);color:#fff;">
          <td style="font-weight:700;">TOTAL</td>
          <td style="text-align:right;font-weight:700;color:var(--gold-l);">${fmt(d.totalDividas)}</td>
          <td></td>
          <td style="text-align:right;font-weight:700;color:var(--gold-l);">${fmt(d.totalParcelas)}</td>
          <td></td>
        </tr></tfoot>
      </table>
      <div class="rel-section-title">03. Custo da Inércia</div>
      <div style="font-size:12px;color:var(--ink2);margin-bottom:8px;">Se nenhuma ação for tomada nos próximos 24 meses, este cliente pagará adicionalmente em juros:</div>
      <div style="font-size:22px;font-weight:700;color:var(--red);margin-bottom:4px;">${fmt(inertia)}</div>
      <div style="font-size:11px;color:#aaa;">Este número representa a urgência de agir hoje.</div>
      <div class="rel-section-title">04. Estratégia Recomendada — Método ${nomeEst}</div>
      <div class="rel-metricas" style="margin-bottom:14px;">
        <div class="rel-metrica"><div class="rel-metrica-val txt-gold">${simAtual.meses} meses</div><div class="rel-metrica-label">Prazo estimado</div></div>
        <div class="rel-metrica"><div class="rel-metrica-val txt-red">${fmt(simAtual.jurosTotal)}</div><div class="rel-metrica-label">Juros a pagar</div></div>
        <div class="rel-metrica"><div class="rel-metrica-val" style="color:${sl>0?'var(--green)':'var(--red)'};">${fmt(sl)}</div><div class="rel-metrica-label">Saldo livre/mês</div></div>
      </div>
      <div style="font-size:12px;font-weight:600;color:var(--ink2);margin-bottom:8px;">Ordem de ataque:</div>
      ${ordemAtaque}
      <div class="rel-section-title">05. Plano de Ação Imediato</div>
      <div class="rel-acao-item"><div class="rel-acao-num">①</div><div><div style="font-weight:600;">Renegociar a dívida de maior juro</div><div class="rel-acao-prazo">Imediato — até 7 dias</div></div></div>
      <div class="rel-acao-item"><div class="rel-acao-num">②</div><div><div style="font-weight:600;">Revisar despesas variáveis e eliminar gastos não essenciais</div><div class="rel-acao-prazo">Imediato — até 15 dias</div></div></div>
      <div class="rel-acao-item"><div class="rel-acao-num">③</div><div><div style="font-weight:600;">Iniciar pagamento conforme ordem de ataque</div><div class="rel-acao-prazo">1º dia do próximo mês</div></div></div>
      <div class="rel-acao-item"><div class="rel-acao-num">④</div><div><div style="font-weight:600;">Construir reserva de emergência mínima de R$ 1.000 em paralelo</div><div class="rel-acao-prazo">Até 60 dias</div></div></div>
      <div class="rel-acao-item"><div class="rel-acao-num">⑤</div><div><div style="font-weight:600;">Revisão mensal do plano com o consultor</div><div class="rel-acao-prazo">Todo mês — acompanhamento contínuo</div></div></div>
      <div class="rel-footer">
        <img src="logo.png" alt="Vitor Davanzo" style="height:48px;margin-bottom:8px;">
        <div style="font-size:11px;font-weight:600;letter-spacing:0.04em;">VITOR DAVANZO · Planejador Financeiro CFP®</div>
        <div style="font-size:10px;color:#aaa;margin-top:3px;">(19) 9.9221-1481 · Piracicaba – SP · @vitor_davanzo_</div>
        <div class="rel-footer-tagline">ESTRATÉGIA · PATRIMÔNIO · FUTURO</div>
      </div>
    </div>`;
}

function limparTudo() {
  if (!confirm('Limpar todos os dados e iniciar nova consultoria?')) return;
  document.querySelectorAll('input').forEach(i => { i.value = ''; i.dataset.raw = '0'; });
  document.getElementById('rendas-list').innerHTML   = '';
  document.getElementById('despesas-list').innerHTML = '';
  document.getElementById('dividas-list').innerHTML  = '';
  adicionarRenda();
  inicializarDespesasPadrao();
  adicionarDivida();
  document.getElementById('cli-data').value = new Date().toISOString().split('T')[0];
  goPage('page-dados');
}

// ── INICIALIZAÇÃO ─────────────────────────────
document.getElementById('cli-data').value = new Date().toISOString().split('T')[0];
adicionarRenda();
inicializarDespesasPadrao();
adicionarDivida();
