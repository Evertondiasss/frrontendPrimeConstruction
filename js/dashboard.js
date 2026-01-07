// URL base da sua API Node (ajuste se estiver em outra porta/domínio)
const API_BASE_URL = 'https://backendprimeconstruction-production.up.railway.app';

// ======================
// AUTH (JWT)
// ======================
function getToken() {
  // Ajuste aqui se você salvou com outro nome no login
  return localStorage.getItem('usuario');
}

function getAuthHeaders(extra = {}) {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function handleUnauthorized(response) {
  if (response.status === 401) {
    // Token ausente/expirado/invalidado
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Se você tiver uma página de login, descomente e ajuste:
    // window.location.href = '/login.html';
  }
}

// Estado global dos filtros
let filtrosAtuais = {
  mes: '',
  ano: '',
  obra: ''
};

// Gráficos (declarados no escopo global para podermos atualizar depois)
let areaChart;
let donutChart;

// Helper de moeda
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

// Busca dados do dashboard no backend
async function fetchDashboardData(filtros = {}) {
  try {
    const params = new URLSearchParams({
      mes: filtros.mes || '',
      ano: filtros.ano || '',
      obra: filtros.obra || ''
    });

    const response = await fetch(`${API_BASE_URL}/api/dashboard?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' })
    });

    if (!response.ok) {
      handleUnauthorized(response);
      const txt = await response.text();
      throw new Error(`Erro ao buscar dados do dashboard: ${response.status} - ${txt}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    return null;
  }
}

// Busca lista de obras para o select
async function fetchObras() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/obras`, {
      method: 'GET',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' })
    });

    if (!response.ok) {
      handleUnauthorized(response);
      const txt = await response.text();
      throw new Error(`Erro ao buscar obras: ${response.status} - ${txt}`);
    }

    const data = await response.json();

    // Se a API devolver { obras: [...] }
    if (Array.isArray(data.obras)) return data.obras;

    // Se a API devolver diretamente um array [...]
    if (Array.isArray(data)) return data;

    console.warn('Formato inesperado de /api/obras:', data);
    return [];
  } catch (error) {
    console.error('Erro ao buscar obras:', error);
    return [];
  }
}

// Preenche o select de obras
async function preencherSelectObras() {
  const obras = await fetchObras();
  const selectObra = document.getElementById('filterObra');

  if (!selectObra) return;

  selectObra.innerHTML = '<option value="">Todas</option>';

  obras.forEach(obra => {
    const option = document.createElement('option');
    option.value = obra.id;
    option.textContent = obra.nome;
    selectObra.appendChild(option);
  });
}

// Helper para atualizar indicadores de tendência (setinha + %)
function atualizarTrendPercent(el, valor, { bomQuandoMenor = false } = {}) {
  if (!el) return;

  el.classList.remove('positive', 'negative');

  if (valor === null || valor === undefined || isNaN(Number(valor))) {
    el.textContent = '--';
    return;
  }

  const v = Number(valor);

  let isPositive;
  if (bomQuandoMenor) isPositive = v <= 0;
  else isPositive = v >= 0;

  el.classList.toggle('positive', isPositive);
  el.classList.toggle('negative', !isPositive);

  const arrow =
    bomQuandoMenor
      ? (v <= 0 ? 'down' : 'up')
      : (v >= 0 ? 'up' : 'down');

  el.innerHTML = `
    <i class="fas fa-arrow-${arrow}"></i>
    ${v.toFixed(1)}%
  `;
}

// Atualiza indicador numérico simples (obras, sem %)
function atualizarTrendNumero(el, valor) {
  if (!el) return;

  el.classList.remove('positive', 'negative');

  if (valor === null || valor === undefined || isNaN(Number(valor))) {
    el.textContent = '--';
    return;
  }

  const v = Number(valor);
  el.classList.toggle('positive', v >= 0);
  el.classList.toggle('negative', v < 0);

  const arrow = v >= 0 ? 'up' : 'down';

  el.innerHTML = `
    <i class="fas fa-arrow-${arrow}"></i>
    ${v}
  `;
}

// Atualiza cards, gráficos e tabelas
async function atualizarDashboard() {
  const dados = await fetchDashboardData(filtrosAtuais);
  if (!dados) return;

  const resumo = dados.resumo || {};
  const graficos = dados.graficos || {};
  const proximosPagamentos = dados.proximosPagamentos || [];
  const topProdutos = dados.topProdutos || [];
  const topSalarios = dados.topSalarios || [];

  // ==== CARDS ====
  const cardReceita = document.querySelector('.card.sales .number');
  const cardDespesa = document.querySelector('.card.customers .number');
  const cardLucro   = document.querySelector('.card.products .number');
  const cardObras   = document.querySelector('.card.orders .number');

  if (cardReceita) cardReceita.textContent = formatCurrency(resumo.receitaTotal);
  if (cardDespesa) cardDespesa.textContent = formatCurrency(resumo.despesaTotal);
  if (cardLucro)   cardLucro.textContent   = formatCurrency(resumo.lucroTotal);
  if (cardObras)   cardObras.textContent   = (resumo.totalObrasAtivas || 0).toLocaleString('pt-BR');

  // ==== TENDÊNCIAS ====
  const receitaTrend = document.getElementById('receitaTrend');
  const despesaTrend = document.getElementById('despesaTrend');
  const lucroTrend   = document.getElementById('lucroTrend');
  const obrasTrend   = document.getElementById('obrasTrend');

  atualizarTrendPercent(receitaTrend, resumo.variacaoReceitaPercentual, { bomQuandoMenor: false });
  atualizarTrendPercent(despesaTrend, resumo.variacaoDespesaPercentual, { bomQuandoMenor: true });

  if (lucroTrend) {
    const receita = Number(resumo.receitaTotal || 0);
    const despesa = Number(resumo.despesaTotal || 0);
    const lucro   = Number(resumo.lucroTotal   || 0);

    let percLucro;
    if (receita === 0 && despesa === 0) percLucro = 0;
    else if (receita !== 0) percLucro = (lucro / Math.abs(receita)) * 100;
    else percLucro = -100;

    atualizarTrendPercent(lucroTrend, percLucro, { bomQuandoMenor: false });
  }

  atualizarTrendNumero(obrasTrend, resumo.variacaoObrasAtivas);

  // ==== GRÁFICO DE ÁREA ====
  if (graficos.financeiroMensal && areaChart) {
    const labels   = graficos.financeiroMensal.labels || [];
    const receitas = graficos.financeiroMensal.receitas || [];
    const despesas = graficos.financeiroMensal.despesas || [];

    areaChart.data.labels = labels;
    areaChart.data.datasets[0].data = receitas;
    areaChart.data.datasets[1].data = despesas;
    areaChart.update();
  }

  // ==== GRÁFICO DE ROSCA ====
  if (graficos.distribuicaoDespesas && donutChart) {
    const labels = graficos.distribuicaoDespesas.labels || [];
    const valores = graficos.distribuicaoDespesas.valores || [];

    donutChart.data.labels = labels;
    donutChart.data.datasets[0].data = valores;
    donutChart.update();
  }

  // ==== TABELA ÚLTIMAS DESPESAS ====
  const tbody = document.getElementById('tabelaProximosPagamentos');
  if (tbody) {
    tbody.innerHTML = '';
    proximosPagamentos.forEach(item => {
      const tr = document.createElement('tr');

      const statusClass =
        item.status === 'pago' ? 'completed' :
        item.status === 'pendente' ? 'pending' :
        'processing';

      tr.innerHTML = `
        <td>${item.fornecedor}</td>
        <td>${item.obra}</td>
        <td>${item.parcela}ª</td>
        <td>${formatCurrency(item.valor)}</td>
        <td>${item.vencimento}</td>
        <td><span class="status ${statusClass}">${String(item.status || '').toUpperCase()}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ==== LISTA MATERIAIS MAIS COMPRADOS ====
  const listaTop = document.getElementById('listaTopProdutos');
  if (listaTop) {
    listaTop.innerHTML = '';
    topProdutos.forEach(prod => {
      const div = document.createElement('div');
      div.classList.add('product-item');

      const percentual = prod.percentualBarra != null ? prod.percentualBarra : 50;

      div.innerHTML = `
        <div class="product-info">
          <h4>${prod.produto}</h4>
          <p>${(prod.quantidade || 0).toLocaleString('pt-BR')} unid. • ${formatCurrency(prod.custoTotal)}</p>
        </div>
        <div class="product-progress">
          <div class="progress-bar" style="width: ${percentual}%"></div>
        </div>
      `;
      listaTop.appendChild(div);
    });
  }

  // ==== LISTA DOS MAIORES SALÁRIOS ====
  const salariosBox = document.getElementById('listaTopSalarios');
  if (salariosBox) {
    salariosBox.innerHTML = '';
    topSalarios.forEach(s => {
      const div = document.createElement('div');
      div.classList.add('salario-item');

      div.innerHTML = `
        <h4>${s.funcionario}</h4>
        <p>${s.cargo} • ${s.obra}</p>
        <strong>${formatCurrency(s.totalPago)}</strong>
      `;
      salariosBox.appendChild(div);
    });
  }
}

// Inicialização dos gráficos
function inicializarGraficos() {
  const areaEl  = document.getElementById('areaChart');
  const donutEl = document.getElementById('donutChart');
  if (!areaEl || !donutEl) return;

  const areaCtx  = areaEl.getContext('2d');
  const donutCtx = donutEl.getContext('2d');

  areaChart = new Chart(areaCtx, {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'Receitas', data: [], fill: true, backgroundColor: 'rgba(0, 145, 211, 0.1)', borderColor: '#0091d3', tension: 0.4, pointBackgroundColor: '#fff', pointBorderColor: '#0091d3', pointRadius: 4, pointHoverRadius: 6 },
      { label: 'Despesas', data: [], fill: true, backgroundColor: 'rgba(220, 53, 69, 0.1)', borderColor: '#dc3545', tension: 0.4, pointBackgroundColor: '#fff', pointBorderColor: '#dc3545', pointRadius: 4, pointHoverRadius: 6 }
    ]},
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: value => 'R$ ' + value.toLocaleString('pt-BR'), font: { size: 11 } }, grid: { drawBorder: false } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } }
      },
      layout: { padding: { top: 10, right: 10, bottom: 10, left: 10 } }
    }
  });

  donutChart = new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: ['#0091d3', '#36d17f', '#982898', '#99d2eb'],
        borderWidth: 0
      }]
    },
    plugins: [ChartDataLabels],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        datalabels: {
          color: '#000',
          font: { weight: 'bold', size: 14 },
          formatter: (value, ctx) => {
            const dataset = ctx.chart.data.datasets[0];
            const total = dataset.data.reduce((a, b) => a + b, 0);
            const percent = total ? (value / total * 100) : 0;
            return percent.toFixed(0) + '%';
          }
        },
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 13 },
            generateLabels(chart) {
              const data = chart.data;
              return data.labels.map((label, i) => ({
                text: `${label}`,
                fillStyle: data.datasets[0].backgroundColor[i],
                strokeStyle: data.datasets[0].backgroundColor[i],
                index: i
              }));
            }
          }
        }
      },
      cutout: '70%'
    }
  });
}

// Ajusta tamanho dos gráficos
function resizeCharts() {
  const chartContainers = document.querySelectorAll('.card.chart-area, .card.chart-donut');
  chartContainers.forEach(container => {
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    const containerHeight = container.offsetHeight - 40;
    canvas.style.height = containerHeight + 'px';
    canvas.height = containerHeight;
  });
  if (areaChart) areaChart.resize();
  if (donutChart) donutChart.resize();
}

document.addEventListener('DOMContentLoaded', async () => {
  // Se não tiver token, não adianta tentar buscar dashboard
  // (Opcional: redirecionar pro login)
  // if (!getToken()) window.location.href = '/login.html';

  await preencherSelectObras();

  const today = new Date();
  const anoAtual = today.getFullYear().toString();
  const mesAtual = (today.getMonth() + 1).toString();

  const selectAno = document.getElementById('filterAno');
  const selectMes = document.getElementById('filterMes');

  if (selectAno && Array.from(selectAno.options).some(o => o.value === anoAtual)) {
    selectAno.value = anoAtual;
    filtrosAtuais.ano = anoAtual;
  }

  if (selectMes) {
    selectMes.value = mesAtual;
    filtrosAtuais.mes = mesAtual;
  }

  inicializarGraficos();
  await atualizarDashboard();

  document.getElementById('aplicarFiltros').addEventListener('click', async () => {
    filtrosAtuais = {
      mes: document.getElementById('filterMes').value,
      ano: document.getElementById('filterAno').value,
      obra: document.getElementById('filterObra').value
    };
    await atualizarDashboard();
  });

  setTimeout(resizeCharts, 100);
  window.addEventListener('resize', resizeCharts);
});
