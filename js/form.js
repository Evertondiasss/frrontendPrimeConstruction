/* =========================================
 * Prime Construções – Formulário de Compras
 * Protegido com JWT + Sessão + Expiração
 * ========================================= */

const API_BASE         = 'https://backendprimeconstruction-production.up.railway.app';
const API_COMPRAS      = `${API_BASE}/api/compras`;
const API_OBRAS        = `${API_BASE}/api/obras`;
const API_FORNECEDORES = `${API_BASE}/api/fornecedores`;
const API_FUNCIONARIOS = `${API_BASE}/api/funcionarios`;
const API_PRODUTOS     = `${API_BASE}/api/produtos`;
const API_CATEGORIAS   = `${API_BASE}/api/categorias`;

// ===== TRATAMENTO GLOBAL DE 401 =====
function handleAuthError(response) {
  if (response.status === 401) {
    alert("Sessão expirada. Faça login novamente.");
    logout(); // função do auth.js
    throw new Error("Sessão expirada");
  }
  return response;
}

// ==== FETCH AUTENTICADO ====
function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...getAuthHeaders(), // token JWT
    },
  }).then((r) => {
    handleAuthError(r);
    return r;
  });
}

document.addEventListener('DOMContentLoaded', () => {

  // Elementos
  const form = document.getElementById('purchaseForm');
  const obraSelect = document.getElementById('obra');
  const fornecedorSelect = document.getElementById('fornecedor');
  const funcionarioSelect = document.getElementById('funcionario');
  const parcelasInput = document.getElementById('parcelas');
  const formaPagamento = document.getElementById('formaPagamento');

  const addItemBtn = document.getElementById('addItemBtn');
  const itensTable = document.getElementById('itensTable');
  const itemTpl = document.getElementById('itemRowTemplate');
  const subtotalTxt = document.getElementById('subtotalTxt');
  const descontoTotI = document.getElementById('descontoTotal');
  const totalFinalEl = document.getElementById('totalFinal');

  // --- Uploader (mantive tudo)
  const uploadBox   = document.getElementById('uploadBox');
  const fileInput   = document.getElementById('fileInput');
  const btnPick     = document.getElementById('btnPick');
  const btnPickIdle = document.getElementById('btnPickIdle');
  const btnRemove   = document.getElementById('btnRemove');
  const uIdle       = document.getElementById('uIdle');
  const uFileName   = document.getElementById('uFileName');
  const uFileSize   = document.getElementById('uFileSize');
  const uBadge      = document.getElementById('uBadge');
  const uProgress   = document.getElementById('uProgress');
  const uBar        = document.getElementById('uBar');

  const MAX_FILE_BYTES = 10 * 1024 * 1024;
  const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

  // Helpers
  const brl = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
  const dtBR = iso => (iso && iso.includes('-')) ? iso.split('-').reverse().join('/') : (iso || '');
  const toMB = b => (b/1024/1024).toFixed(2).replace('.', ',') + ' MB';
  const parseBRL = str => parseFloat(String(str || '').replace(/[R$\s.]/g, '').replace(',', '.')) || 0;

  // Máscaras
  const maskCNPJ = v => v.replace(/\D/g,'')
    .replace(/^(\d{2})(\d)/,'$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3')
    .replace(/\.(\d{3})(\d)/,'.$1/$2')
    .replace(/(\d{4})(\d{1,2}).*/,'$1-$2');

  const maskTel = v => v.replace(/\D/g,'')
    .replace(/^(\d{2})(\d)/,'($1) $2')
    .replace(/(\d{5})(\d)/,'$1-$2');

    // --- Uploader: wiring (cole dentro do DOMContentLoaded, depois das consts do uploader) ---
  if (btnPickIdle) btnPickIdle.addEventListener('click', () => fileInput.click());
  if (btnPick)     btnPick.addEventListener('click', () => fileInput.click());

  if (fileInput) {
    fileInput.addEventListener('change', (ev) => {
      const file = ev.target.files?.[0] || null;
      const err = validateFileOptional(file);
      if (err) {
        // mostra erro e limpa
        if (uBadge) { uBadge.textContent = err; uBadge.className = 'u-badge error'; }
        fileInput.value = '';
        setUploaderIdle();
        return;
      }
      if (file) {
        setUploaderFile(file);
        if (uBadge) { uBadge.textContent = 'Arquivo selecionado'; uBadge.className = 'u-badge ok'; }
      } else {
        setUploaderIdle();
      }
    });
  }

if (btnRemove) {
  btnRemove.addEventListener('click', () => {
    fileInput.value = '';
    setUploaderIdle();
    if (uBadge) { uBadge.textContent = ''; uBadge.className = 'u-badge'; }
  });
}

// Se quiser iniciar com estado consistente (opcional)
setUploaderIdle();


  // ----- Uploader -----
  function setUploaderIdle() {
    if (uIdle) uIdle.hidden = false;
    if (uploadBox) uploadBox.hidden = true;
    if (uProgress) uProgress.hidden = true;
    if (uBar) uBar.style.width = '0%';
    if (uBadge) { uBadge.className = 'u-badge'; uBadge.textContent = ''; }
  }
  function setUploaderFile(file) {
    if (uIdle) uIdle.hidden = true;
    if (uploadBox) uploadBox.hidden = false;
    if (uProgress) uProgress.hidden = false;
    if (uBar) uBar.style.width = '0%';

    uFileName.textContent = file.name;
    uFileSize.textContent = toMB(file.size);
  }
  function validateFileOptional(file) {
    if (!file) return null;
    if (!ACCEPTED_TYPES.includes(file.type)) return "Formato inválido (PDF, PNG ou JPG).";
    if (file.size > MAX_FILE_BYTES) return "Arquivo maior que 10 MB.";
    return null;
  }

  // ====== SELECTS PROTEGIDOS ======
  function carregarSelect(url, select, label, { withNovo=false } = {}) {
    select.innerHTML = `<option value="">Carregando ${label}...</option>`;

    authFetch(url)
      .then(r => r.json())
      .then(data => {
        select.innerHTML = `<option value="">Selecione ${label}</option>`;
        data.forEach(item => {
          const opt = document.createElement('option');
          opt.value = item.id;
          opt.textContent = item.nome;
          select.appendChild(opt);
        });
        if (withNovo) {
          const opt = document.createElement('option');
          opt.value = '__new__';
          opt.textContent = `+ Novo ${label}…`;
          select.appendChild(opt);
        }
      })
      .catch(() => {
        select.innerHTML = `<option value="">Erro ao carregar ${label}</option>`;
      });
  }

  // ====== PRODUTOS CACHE ======
  let produtosCache = [];
  async function carregarProdutosCache() {
    const r = await authFetch(API_PRODUTOS);
    produtosCache = await r.json().catch(() => []);
  }

  function preencherSelectProduto(sel) {
    sel.innerHTML = `<option value="">Selecione</option>`;
    produtosCache.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nome;
      sel.appendChild(opt);
    });

    const novo = document.createElement('option');
    novo.value = '__new__';
    novo.textContent = "+ Novo produto…";
    sel.appendChild(novo);
  }

  // ====== LISTA DE COMPRAS PROTEGIDA ======
  function carregarCompras() {
    const tabela = document.getElementById('listaCompras');
    tabela.innerHTML = '<tr><td colspan="4" style="text-align:center;">Carregando...</td></tr>';

    authFetch(API_COMPRAS)
      .then(r => r.json())
      .then(data => {
        tabela.innerHTML = '';
        if (!data.length) {
          tabela.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhuma compra registrada.</td></tr>';
          return;
        }

        data.forEach(c => {
          const tr = document.createElement('tr');
          const nItens = c.qtd_itens ?? c.itens?.length ?? 0;

          tr.innerHTML = `
            <td>#${c.id}</td>
            <td>${c.obra_nome || '-'}</td>
            <td>${dtBR(c.data_compra)}</td>
            <td>${nItens}</td>
          `;
          tr.addEventListener('click', () => abrirModalCompra(c));
          tabela.appendChild(tr);
        });
      })
      .catch(() => {
        tabela.innerHTML = '<tr><td colspan="4" style="text-align:center;">Erro ao carregar</td></tr>';
      });
  }

  // ====== FIX MELHORADO: Modal Novo Produto com seleção automática ======
(function() {
  const modal = document.getElementById('modalProduto');
  if (!modal) return;

  const inpNome   = document.getElementById('np_nome');
  const selCat    = document.getElementById('np_categoria');
  const btnCancel = document.getElementById('np_cancel');
  const btnSave   = document.getElementById('np_save');

  if (btnCancel) btnCancel.type = 'button';
  if (btnSave)   btnSave.type   = 'button';

  // guarda o select que pediu "novo produto"
  let lastRequester = null;

  // intercepta todas as mudanças que abrem o modal (existem vários selects .item-produto)
  // e marca o seletor que originou a ação.
  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t && t.classList && t.classList.contains('item-produto') && t.value === '__new__') {
      lastRequester = t;            // guarda referência
      t.value = '';                 // limpa a seleção
      // carrega categorias para modal (já fazia isso em addItemRow, mas reforça)
      carregarSelect(API_CATEGORIAS, selCat, 'categoria');
      modal.hidden = false;
    }
  });

  function close() {
    modal.hidden = true;
    if (inpNome) inpNome.value = '';
    if (selCat)  selCat.value = '';
    lastRequester = null;
  }

  if (btnCancel) btnCancel.addEventListener('click', (ev) => { ev.preventDefault(); close(); });

  if (btnSave) btnSave.addEventListener('click', async (ev) => {
    ev.preventDefault();
    const nome = (inpNome?.value || '').trim();
    const categoriaId = selCat?.value;

    if (!nome) { alert('Informe o nome do produto.'); return; }
    if (!categoriaId) { alert('Selecione a categoria.'); return; }

    try {
      btnSave.disabled = true;
      const original = btnSave.textContent;
      btnSave.textContent = 'Cadastrando...';

      const payload = { nome, categoria_id: Number(categoriaId) };

      const r = await authFetch(API_PRODUTOS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (r.status === 401) { alert('Sessão expirada.'); logout(); return; }
      if (!(r.status >= 200 && r.status < 300)) {
        const err = await r.json().catch(()=>({}));
        alert(err.error || 'Erro ao cadastrar produto.');
        return;
      }

      const novoRaw = await r.json();

      // Normaliza retorno: usa o nome enviado se a API não devolver o nome.
      const novo = {
        id: novoRaw.id ?? novoRaw.insertId ?? novoRaw.ID ?? null,
        nome: (novoRaw.nome ?? novoRaw.name ?? novoRaw.nome_produto ?? '').toString().trim() || nome
      };

      if (!novo.id) {
        console.warn('Resposta da API sem id:', novoRaw);
        // mesmo sem id, criamos uma option com value vazio para não quebrar a UI
      }

      produtosCache.push(novo);

      document.querySelectorAll('.item-produto').forEach(sel => {
        if (novo.id && Array.from(sel.options).some(o => String(o.value) === String(novo.id))) return;

        const opt = document.createElement('option');
        opt.value = novo.id ?? '';
        opt.textContent = novo.nome || (`Produto #${novo.id ?? ''}`);
        const novoOpt = Array.from(sel.options).find(o => o.value === '__new__');
        if (novoOpt) sel.insertBefore(opt, novoOpt);
        else sel.appendChild(opt);
      });

      if (lastRequester && novo.id) {
        lastRequester.value = novo.id;
        lastRequester.dispatchEvent(new Event('change', { bubbles: true }));
      }

      alert('Produto cadastrado.');
      close();
    } catch (err) {
      console.error('Erro ao cadastrar produto', err);
      alert('Erro de conexão ao cadastrar produto.');
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = 'Cadastrar';
    }
  });


  // fechar clicando fora
  modal.addEventListener('click', (ev) => { if (ev.target === modal) close(); });
})();



  // ====== MODAL DETALHES ======
  // ====== MODAL DETALHES (substitua pela versão abaixo) ======
// ====== MODAL DETALHES (substitua a função existente por esta) ======
// ====== MODAL DETALHES (somente link, sem preview) ======
async function abrirModalCompra(compraLite) {
  const modal = document.getElementById('modalCompra');
  const conteudo = document.getElementById('modalCompraConteudo');

  let compra = compraLite;
  try {
    const r = await authFetch(`${API_COMPRAS}/${compraLite.id}`);
    compra = await r.json();
  } catch (_) {}

  const itens = compra.itens || compra.items || [];

  const linhas = itens.map(it => `
    <tr>
      <td>${it.produto_nome || it.nome || '-'}</td>
      <td style="text-align:right;">${it.quantidade ?? '-'}</td>
      <td style="text-align:right;">${brl(it.valor_unit || it.precoUnit || 0)}</td>
      <td style="text-align:right;">${brl(((it.quantidade||0) * (it.valor_unit || it.precoUnit || 0)))}</td>
    </tr>
  `).join('');

  const url = compra.comprovante_url || null;

  let comprovanteHtml = `<p><strong>Comprovante:</strong> —</p>`;
  if (url) {
    comprovanteHtml = `
      <p><strong>Comprovante:</strong>
        <a href="${url}" target="_blank" rel="noopener">Abrir comprovante</a>
      </p>
    `;
  }

  conteudo.innerHTML = `
    <p><strong>Obra:</strong> ${compra.obra_nome}</p>
    <p><strong>Fornecedor:</strong> ${compra.fornecedor_nome}</p>
    <p><strong>Funcionário:</strong> ${compra.funcionario_nome}</p>
    <p><strong>Data Compra:</strong> ${dtBR(compra.data_compra)}</p>
    <p><strong>Total:</strong> ${brl(compra.total_liquido || 0)}</p>

    ${comprovanteHtml}

    ${
      itens.length
        ? `
          <table style="width:100%;border-collapse:collapse;margin-top:.8rem;">
            <thead>
              <tr>
                <th style="text-align:left">Produto</th>
                <th style="text-align:right">Qtd</th>
                <th style="text-align:right">Unit</th>
                <th style="text-align:right">Parcial</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>`
        : '<p>Nenhum item</p>'
    }
  `;

  modal.hidden = false;
  document.body.classList.add('modal-open');
}




  document.getElementById('fecharModalCompra').addEventListener('click', () => {
    document.getElementById('modalCompra').hidden = true;
    document.body.classList.remove('modal-open');
  });

  // ====== TOTALIZAÇÃO ======
  function calcTotais() {
    let subtotal = 0;

    document.querySelectorAll('#itensTable tr').forEach(tr => {
      const qtd = parseFloat(tr.querySelector('.item-qtd').value || 0);
      const preco = parseBRL(tr.querySelector('.item-valor').value);
      subtotal += qtd * preco;
    });

    subtotalTxt.textContent = brl(subtotal);

    const desc = parseBRL(descontoTotI.value);
    const total = Math.max(subtotal - desc, 0);
    totalFinalEl.textContent = brl(total);

    return { subtotal, total };
  }

  // ====== ADICIONAR ITEM ======
  function addItemRow(pref = {}) {
    const row = itemTpl.content.firstElementChild.cloneNode(true);

    const selProd = row.querySelector('.item-produto');
    const qtdEl = row.querySelector('.item-qtd');
    const valEl = row.querySelector('.item-valor');

    preencherSelectProduto(selProd);

    selProd.addEventListener('change', () => {
      if (selProd.value === '__new__') {
        selProd.value = "";
        carregarSelect(API_CATEGORIAS, document.getElementById('np_categoria'), 'categoria');
        document.getElementById('modalProduto').hidden = false;
      }
    });

    qtdEl.addEventListener('input', calcTotais);
    valEl.addEventListener('input', () => { 
      const v = valEl.value.replace(/\D/g,'');
      valEl.value = brl(v/100);
      calcTotais();
    });

    itensTable.appendChild(row);
    calcTotais();
  }

  // ====== REMOVER ITEM ======
  itensTable.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.item-remove');
    if (!btn) return;

    const row = btn.closest('tr');
    if (!row) return;

    row.remove();
    calcTotais();
  });


  addItemBtn.addEventListener('click', () => addItemRow());
  descontoTotI.addEventListener('input', calcTotais);

  // ====== SUBMIT COMPRA ======
  form.addEventListener('submit', e => {
    e.preventDefault();

    const file = fileInput.files?.[0];
    const err = validateFileOptional(file);
    if (err) {
      alert(err);
      return;
    }

    const itens = [];
    document.querySelectorAll('#itensTable tr').forEach(tr => {
      const prod = tr.querySelector('.item-produto').value;
      const q = parseFloat(tr.querySelector('.item-qtd').value || 0);
      const v = parseBRL(tr.querySelector('.item-valor').value);

      if (prod && q > 0 && v > 0) {
        itens.push({ produtoId: Number(prod), quantidade: q, precoUnit: v });
      }
    });

    if (!itens.length) {
      alert("Adicione pelo menos um item.");
      return;
    }

    const { total } = calcTotais();

    const fd = new FormData();
    fd.append("obra_id", obraSelect.value);
    fd.append("fornecedor_id", fornecedorSelect.value);
    fd.append("funcionario_id", funcionarioSelect.value);
    fd.append("data_compra", document.getElementById('dataCompra').value);
    fd.append("forma_pagamento", formaPagamento.value);
    fd.append("parcelas", parcelasInput.value);
    fd.append("data_vencimento", document.getElementById('dataVencimento').value);
    fd.append("observacoes", document.getElementById('observacoes').value.trim());
    fd.append("desconto_total", parseBRL(descontoTotI.value));
    fd.append("total_liquido", total);
    fd.append("itens", JSON.stringify(itens));
    if (file) fd.append("comprovante", file);

    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    // usa AJAX para enviar FormData + header Authorization
    const xhr = new XMLHttpRequest();
    xhr.open("POST", API_COMPRAS);

    const token = localStorage.getItem("token");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.onload = () => {
      btn.disabled = false;
      btn.textContent = original;

      if (xhr.status === 401) {
        alert("Sessão expirada.");
        logout();
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        alert("Compra registrada com sucesso!");
        form.reset();
        itensTable.innerHTML = '';
        addItemRow();
        setUploaderIdle();
        carregarCompras();
      } else {
        alert("Erro ao registrar compra.");
      }
    };

    xhr.onerror = () => {
      btn.disabled = false;
      btn.textContent = original;
      alert("Erro de conexão.");
    };

    xhr.send(fd);
  });

  // ===== INIT =====
  carregarSelect(API_OBRAS, obraSelect, "obra");
  carregarSelect(API_FORNECEDORES, fornecedorSelect, "fornecedor", { withNovo:true });

    fornecedorSelect.addEventListener('change', () => {
      if (fornecedorSelect.value === '__new__') {
        fornecedorSelect.value = '';
        document.getElementById('modalFornecedor').hidden = false;
      }
    });
  carregarSelect(API_FUNCIONARIOS, funcionarioSelect, "funcionário");
  carregarCompras();

  carregarProdutosCache().then(() => addItemRow());

  setUploaderIdle();
});
