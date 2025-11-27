// Função principal que processa as requisições
function doGet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboardSheet = ss.getSheetByName('Dashboard');
    
    // Busca o valor total de despesas (célula B2)
    const totalDespesas = dashboardSheet.getRange('B2').getValue();
    
    // Busca os meses (C6:N6)
    const months = dashboardSheet.getRange('C6:N6').getValues()[0];
    
    // Busca os valores mensais (C7:N7)
    const monthlyValues = dashboardSheet.getRange('C7:N7').getValues()[0];
    
    // Prepara o objeto de resposta
    const response = {
      totalDespesas: totalDespesas,
      months: months,
      monthlyValues: monthlyValues
    };
    
    // Retorna os dados como JSON
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Em caso de erro, retorna um objeto de erro
    return ContentService.createTextOutput(JSON.stringify({
      error: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

// Função para buscar dados do dashboard com filtros
function getDashboardData(params) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Dashboard');
  
  if (!sheet) {
    throw new Error('Aba Dashboard não encontrada');
  }

  // Aplica os filtros (mês, ano, obra)
  var dados = filtrarDados(sheet, params);
  
  // Retorna os dados em formato JSON
  return ContentService.createTextOutput(JSON.stringify(dados))
    .setMimeType(ContentService.MimeType.JSON);
}

// Função para filtrar os dados baseado nos parâmetros
function filtrarDados(sheet, params) {
  // Obtém todos os dados da planilha
  var range = sheet.getDataRange();
  var values = range.getValues();
  var headers = values[0];
  
  // Índices das colunas (ajuste conforme sua planilha)
  var colMes = headers.indexOf('Mês');
  var colAno = headers.indexOf('Ano');
  var colObra = headers.indexOf('Obra');
  var colValor = headers.indexOf('Valor');
  
  // Filtra os dados
  var dadosFiltrados = values.slice(1).filter(function(row) {
    var passouFiltroMes = !params.mes || row[colMes].toString() === params.mes;
    var passouFiltroAno = !params.ano || row[colAno].toString() === params.ano;
    var passouFiltroObra = !params.obra || row[colObra].toString() === params.obra;
    
    return passouFiltroMes && passouFiltroAno && passouFiltroObra;
  });
  
  // Calcula os totais
  var totais = calcularTotais(dadosFiltrados, colValor);
  
  // Prepara dados para os gráficos
  var dadosGraficos = prepararDadosGraficos(dadosFiltrados, headers);
  
  return {
    clientes: totais.clientes,
    vendas: totais.vendas,
    produtos: totais.produtos,
    pedidos: totais.pedidos,
    dadosGraficos: dadosGraficos
  };
}

// Função para calcular totais
function calcularTotais(dados, colValor) {
  return {
    clientes: dados.length, // Número de registros únicos
    vendas: dados.reduce(function(total, row) {
      return total + (row[colValor] || 0);
    }, 0),
    produtos: new Set(dados.map(function(row) { return row[5]; })).size, // Assumindo que produtos estão na coluna 5
    pedidos: new Set(dados.map(function(row) { return row[6]; })).size  // Assumindo que pedidos estão na coluna 6
  };
}

// Função para preparar dados dos gráficos
function prepararDadosGraficos(dados, headers) {
  // Prepara dados para o gráfico de vendas mensais
  var vendasPorMes = {};
  dados.forEach(function(row) {
    var mes = row[headers.indexOf('Mês')];
    var valor = row[headers.indexOf('Valor')] || 0;
    vendasPorMes[mes] = (vendasPorMes[mes] || 0) + valor;
  });
  
  // Prepara dados para o gráfico de distribuição
  var distribuicaoPorCategoria = {};
  dados.forEach(function(row) {
    var categoria = row[headers.indexOf('Categoria')];
    var valor = row[headers.indexOf('Valor')] || 0;
    distribuicaoPorCategoria[categoria] = (distribuicaoPorCategoria[categoria] || 0) + valor;
  });
  
  return {
    vendas: {
      labels: Object.keys(vendasPorMes),
      valores: Object.values(vendasPorMes)
    },
    distribuicao: {
      labels: Object.keys(distribuicaoPorCategoria),
      valores: Object.values(distribuicaoPorCategoria)
    }
  };
}

// Função para buscar lista de obras
function getObras() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Obras'); // Assume que existe uma aba 'Obras'
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      'obras': []
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = sheet.getDataRange().getValues();
  var obras = data.slice(1).map(function(row) {
    return {
      id: row[0].toString(),
      nome: row[1]
    };
  });
  
  return ContentService.createTextOutput(JSON.stringify({
    'obras': obras
  })).setMimeType(ContentService.MimeType.JSON);
}

// Função para permitir CORS
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setContent('');
} 