/* =========================================
 * Prime Construções – Formulário de Compras
 * Suporte a múltiplos itens (Produto + Quantidade + Valor)
 * Comprovante OPCIONAL
 * ========================================= */

const API_BASE         = 'https://backendprimeconstruction-production.up.railway.app';
const API_COMPRAS      = `${API_BASE}/api/compras`;
const API_OBRAS        = `${API_BASE}/api/obras`;
const API_FORNECEDORES = `${API_BASE}/api/fornecedores`;
const API_FUNCIONARIOS = `${API_BASE}/api/funcionarios`;
const API_PRODUTOS     = `${API_BASE}/api/produtos`;
const API_CATEGORIAS   = `${API_BASE}/api/categorias`;

document.addEventListener('DOMContentLoaded', () => {
  // ----- Refs gerais
  const form = document.getElementById('purchaseForm');
  const obraSelect = document.getElementById('obra');
  const fornecedorSelect = document.getElementById('fornecedor');
  const funcionarioSelect = document.getElementById('funcionario');
  const parcelasInput = document.getElementById('parcelas');
  const formaPagamento = document.getElementById('formaPagamento');

  // Itens
  const addItemBtn   = document.getElementById('addItemBtn');
  const itensTable   = document.getElementById('itensTable');
  const itemTpl      = document.getElementById('itemRowTemplate');
  const subtotalTxt  = document.getElementById('subtotalTxt');
  const descontoTotI = document.getElementById('descontoTotal');
  const totalFinalEl = document.getElementById('totalFinal');

  // ----- Modais "Novo"
  const mf = {
    root: document.getElementById('modalFornecedor'),
    nome: document.getElementById('nf_nome'),
    cnpj: document.getElementById('nf_cnpj'),
    tel:  document.getElementById('nf_tel'),
    end:  document.getElementById('nf_end'),
    cancel: document.getElementById('nf_cancel'),
    save:   document.getElementById('nf_save'),
  };
  const mp = {
    root: document.getElementById('modalProduto'),
    nome: document.getElementById('np_nome'),
    cat:  document.getElementById('np_categoria'),
    cancel: document.getElementById('np_cancel'),
    save:   document.getElementById('np_save'),
  };

  // ----- Uploader (IDs alinhados ao HTML)
  const uploadBox   = document.getElementById('uploadBox');
  const fileInput   = document.getElementById('fileInput');
  const btnPick     = document.getElementById('btnPick');
  const btnPickIdle = document.getElementById('btnPickIdle'); // se existir
  const btnRemove   = document.getElementById('btnRemove');
  const uIdle       = document.getElementById('uIdle');
  const uFileName   = document.getElementById('uFileName');
  const uFileSize   = document.getElementById('uFileSize');
  const uBadge      = document.getElementById('uBadge');
  const uProgress   = document.getElementById('uProgress');
  const uBar        = document.getElementById('uBar');

  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
  const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

  // Helpers
  const brl = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
  const dtBR = iso => (iso && iso.includes('-')) ? iso.split('-').reverse().join('/') : (iso || '');
  const toMB = b => (b/1024/1024).toFixed(2).replace('.', ',') + ' MB';
  const parseBRL = str => parseFloat(String(str || '').replace(/[R$\s.]/g, '').replace(',', '.')) || 0;

  // Máscaras rápidas
  const maskCNPJ = v => v.replace(/\D/g,'')
    .replace(/^(\d{2})(\d)/,'$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3')
    .replace(/\.(\d{3})(\d)/,'.$1/$2')
    .replace(/(\d{4})(\d{1,2}).*/,'$1-$2');
  const maskTel = v => v.replace(/\D/g,'')
    .replace(/^(\d{2})(\d)/,'($1) $2')
    .replace(/(\d{5})(\d)/,'$1-$2');

  function authHeader() {
    const t = localStorage.getItem("token");
    return { "Authorization": `Bearer ${t}` };
  }


  // ===== Uploader (OPCIONAL)
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
    if (uFileName) uFileName.textContent = file.name;
    if (uFileSize) uFileSize.textContent = toMB(file.size);
    if (uBadge) { uBadge.className = 'u-badge u-badge--ok'; uBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Pronto para enviar'; }
  }
  function setUploaderError(msg) {
    if (uIdle) uIdle.hidden = true;
    if (uploadBox) uploadBox.hidden = false;
    if (uProgress) uProgress.hidden = true;
    if (uBar) uBar.style.width = '0%';
    if (uBadge) { uBadge.className = 'u-badge u-badge--err'; uBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}`; }
  }
  // ⚠️ Valida só se houver arquivo. Se for null, é válido (opcional).
  function validateFileOptional(file) {
    if (!file) return null; // opcional
    if (!ACCEPTED_TYPES.includes(file.type)) return 'Formato inválido (PDF, PNG ou JPG).';
    if (file.size > MAX_FILE_BYTES) return 'Arquivo maior que 10 MB.';
    return null;
  }

  // ===== Carregar selects e lista
  function appendNovoOption(select, label) {
    const opt = document.createElement('option');
    opt.value = '__new__';
    opt.textContent = `+ Novo ${label}…`;
    opt.className = 'opt-new';
    select.appendChild(opt);
  }

  function carregarSelect(url, select, label, { withNovo=false } = {}) {
    select.innerHTML = `<option value="">Carregando ${label}...</option>`;
    fetch(url, { headers: authHeader() })
      .then(r => r.json())
      .then(data => {
        select.innerHTML = `<option value="">Selecione ${label}</option>`;
        (data || []).forEach(item => {
          const opt = document.createElement('option');
          opt.value = item.id;
          opt.textContent = item.nome;
          select.appendChild(opt);
        });
        if (withNovo) appendNovoOption(select, label);
      })
      .catch(() => select.innerHTML = `<option value="">Erro ao carregar ${label}</option>`);
  }

  function carregarCategoriasQuick() {
    mp.cat.innerHTML = `<option value="">Carregando categorias...</option>`;
    fetch(API_CATEGORIAS, { headers: authHeader() })

      .then(r => r.json())
      .then(data => {
        mp.cat.innerHTML = `<option value="">Selecione a categoria</option>`;
        (data || []).forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id; opt.textContent = c.nome;
          mp.cat.appendChild(opt);
        });
      })
      .catch(() => mp.cat.innerHTML = `<option value="">Erro ao carregar categorias</option>`);
  }

  // Cache de produtos
  let produtosCache = [];
  async function carregarProdutosCache() {
    const token = localStorage.getItem("token");

    try {
      const r = await fetch(API_PRODUTOS, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await r.json();

      if (!r.ok || !Array.isArray(data)) {
        console.error("Erro ao carregar produtos:", data);
        produtosCache = [];
        return;
      }

      produtosCache = data;
    } catch (e) {
      console.error("Falha ao buscar produtos:", e);
      produtosCache = [];
    }
  }

    function preencherSelectProduto(selectEl) {
      selectEl.innerHTML = `<option value="">Selecione</option>`;
      if (!Array.isArray(produtosCache)) {
          console.warn("produtosCache não é array:", produtosCache);
          return;
        }
        produtosCache.forEach(p => {

        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nome;
        opt.dataset.unidadeId = p.unidade_sigla || '';
        selectEl.appendChild(opt);
      });
    appendNovoOption(selectEl, 'produto');
  }

  function carregarCompras() {
    const tabela = document.getElementById('listaCompras');
    tabela.innerHTML = '<tr><td colspan="4" style="text-align:center;">Carregando...</td></tr>';

      fetch(API_COMPRAS, { headers: authHeader() })

      .then(r => r.json())
      .then(data => {
        tabela.innerHTML = '';
        if (!data || data.length === 0) {
          tabela.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhuma compra registrada.</td></tr>';
          return;
        }

        data.forEach(c => {
          const itensCount = (c.qtd_itens ?? (Array.isArray(c.itens) ? c.itens.length : null));
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>#${c.id}</td>
            <td>${c.obra_nome || '-'}</td>
            <td>${dtBR(c.data_compra)}</td>
            <td>${itensCount != null ? itensCount : '—'}</td>
          `;
          tr.addEventListener('click', () => abrirModalCompra(c));
          tabela.appendChild(tr);
        });
      })
      .catch(() => {
        tabela.innerHTML = '<tr><td colspan="4" style="text-align:center;">Erro ao carregar compras.</td></tr>';
      });
  }

  // ==== Modal Detalhes (carrega itens por ID) ====
  async function abrirModalCompra(compraLite) {
    const modal = document.getElementById('modalCompra');
    const conteudo = document.getElementById('modalCompraConteudo');
    console.log('JSON da compra:', compraLite); // 👈 Adiciona isso aqui

    // Busca detalhes pelo ID (para garantir itens)
    let compra = compraLite;
    try {
      const r = await fetch(`${API_COMPRAS}/${compraLite.id}`, {
        headers: authHeader()
      });
      if (r.ok) compra = await r.json();
    } catch (_) { /* mantém lite se falhar */ }

    // Normalização dos itens para diferentes formatos do backend
    const itens = Array.isArray(compra.itens) ? compra.itens
               : Array.isArray(compra.items) ? compra.items
               : [];

    const getNome = (it) =>
      it.produto_nome || it.nome || it.produto?.nome || `Produto #${it.produtoId ?? it.produto_id ?? ''}`;

    const getQtd = (it) =>
      Number(it.quantidade ?? it.qtd ?? it.qtde ?? 0);

    const getVU = (it) =>
      Number(
        it.valor_unit ??
        it.precoUnit ??
        it.preco_unit ??
        it.preco_unitario ??
        it.valor_unitario ??
        it.valor ??
        it.preco ??
        0
      );


    const linhas = itens.map((it) => {
      const nome = getNome(it);
      const q   = getQtd(it);
      const vu  = getVU(it);
      const parc = q * vu;
      return `
        <tr>
          <td>${nome}</td>
          <td style="text-align:right;">${q.toLocaleString('pt-BR')}</td>
          <td style="text-align:right;">${brl(vu)}</td>
          <td style="text-align:right;">${brl(parc)}</td>
        </tr>`;
    }).join('');

    const tabelaItens = itens.length
      ? `
        <div style="margin:.6rem 0 0.2rem 0;"><strong>Itens (${itens.length}):</strong></div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f7fafc;">
                <th style="text-align:left;padding:.5rem .75rem;border-bottom:1px solid #eef2f6;">Produto</th>
                <th style="text-align:right;padding:.5rem .75rem;border-bottom:1px solid #eef2f6;">Qtd</th>
                <th style="text-align:right;padding:.5rem .75rem;border-bottom:1px solid #eef2f6;">Valor unit.</th>
                <th style="text-align:right;padding:.5rem .75rem;border-bottom:1px solid #eef2f6;">Parcial</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>`
      : `<p><strong>Itens:</strong> 0</p>`;

    conteudo.innerHTML = `
      <p><strong>Obra:</strong> ${compra.obra_nome || '-'}</p>
      <p><strong>Fornecedor:</strong> ${compra.fornecedor_nome || '-'}</p>
      <p><strong>Funcionário:</strong> ${compra.funcionario_nome || '-'}</p>
      <p><strong>Data da Compra:</strong> ${dtBR(compra.data_compra)}</p>
      <p><strong>Data de Vencimento:</strong> ${dtBR(compra.data_vencimento)}</p>
      <p><strong>Forma de Pagamento:</strong> ${compra.forma_pagamento}</p>
      ${tabelaItens}
      <p style="margin-top:.6rem;"><strong>Total:</strong> ${brl(compra.total_liquido || compra.valor_total)}</p>
      ${compra.comprovante_url ? `<p><a href="${compra.comprovante_url}" target="_blank"><i class="fa-solid fa-paperclip"></i> Ver comprovante</a></p>` : ''}
      <p><strong>Observações:</strong> ${compra.observacoes || '-'}</p>
    `;

    modal.hidden = false;
    document.body.classList.add('modal-open');
  }

  document.getElementById('fecharModalCompra').addEventListener('click', () => {
    document.getElementById('modalCompra').hidden = true;
    document.body.classList.remove('modal-open');
  });

  // ===== Unidade do produto (dataset.unidadeId)
  document.addEventListener('change', e => {
    if (e.target.classList.contains('item-produto')) {
      const select = e.target;
      const unidade = select.selectedOptions[0]?.dataset.unidadeId || '';

      const row = select.closest('tr');
      let unidadeSpan = row.querySelector('.item-unidade');

      if (!unidadeSpan) {
        unidadeSpan = document.createElement('span');
        unidadeSpan.className = 'item-unidade';
        unidadeSpan.style.marginLeft = '0.3rem';
        const qtdCell = row.cells[1];
        qtdCell.style.display = 'flex';
        qtdCell.style.alignItems = 'center';
        qtdCell.appendChild(unidadeSpan);
      }

      unidadeSpan.textContent = unidade;
    }
  });

  // ===== Regras de parcelas x forma
  formaPagamento.addEventListener('change', () => {
    if (['pix', 'dinheiro'].includes(formaPagamento.value)) {
      parcelasInput.value = 1;
      parcelasInput.disabled = true;
    } else {
      parcelasInput.disabled = false;
    }
  });

  // ===== Uploader – interações (ambos botões levam ao fileInput)
  if (btnPickIdle) btnPickIdle.addEventListener('click', () => fileInput.click());
  if (btnPick) btnPick.addEventListener('click', () => fileInput.click());
  if (btnRemove) btnRemove.addEventListener('click', () => { fileInput.value = ''; setUploaderIdle(); });

  ['dragenter', 'dragover'].forEach(evt =>
    uploadBox?.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); uploadBox.classList.add('drag'); })
  );
  ['dragleave', 'drop'].forEach(evt =>
    uploadBox?.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); uploadBox.classList.remove('drag'); })
  );
  uploadBox?.addEventListener('drop', e => {
    const file = e.dataTransfer.files?.[0];
    const err = validateFileOptional(file);
    if (err) { setUploaderError(err); return; }
    fileInput.files = e.dataTransfer.files;
    setUploaderFile(file);
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    const err = validateFileOptional(file);
    if (err) { setUploaderError(err); return; }
    if (file) setUploaderFile(file); else setUploaderIdle();
  });

  // ===== Cadastro rápido – Fornecedor
  function openModalFornecedor() { mf.root.hidden = false; document.body.classList.add('modal-open'); }
  function closeModalFornecedor() { mf.root.hidden = true; document.body.classList.remove('modal-open'); }
  mf.cancel.addEventListener('click', closeModalFornecedor);
  mf.cnpj.addEventListener('input', e => e.target.value = maskCNPJ(e.target.value));
  mf.tel.addEventListener('input',  e => e.target.value = maskTel(e.target.value));

  mf.save.addEventListener('click', async () => {
    const nome = mf.nome.value.trim();
    const cnpjRaw = mf.cnpj.value.trim();
    const telRaw  = mf.tel.value.trim();
    const end     = mf.end.value.trim();

    if (!nome) return alert('Informe pelo menos o nome do fornecedor.');

    if (cnpjRaw) {
      const cnpj = cnpjRaw.replace(/\D/g, '');
      if (cnpj.length !== 14) return alert('CNPJ inválido (14 dígitos).');
    }
    if (telRaw) {
      const tel = telRaw.replace(/\D/g, '');
      if (tel.length < 10 || tel.length > 11) return alert('Telefone inválido.');
    }

    mf.save.disabled = true;
    try {
      const payload = {
        nome,
        ...(cnpjRaw ? { cnpj: cnpjRaw } : {}),
        ...(telRaw  ? { telefone: telRaw } : {}),
        ...(end     ? { endereco: end } : {}),
      };

      const r = await fetch(API_FORNECEDORES, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Falha ao cadastrar fornecedor');

      await carregarSelect(API_FORNECEDORES, fornecedorSelect, 'fornecedor', { withNovo: true });
      fornecedorSelect.value = j.id;
      closeModalFornecedor();
    } catch (err) {
      alert(err.message || 'Erro ao cadastrar fornecedor.');
    } finally {
      mf.save.disabled = false;
    }
  });

  fornecedorSelect.addEventListener('change', () => {
    if (fornecedorSelect.value === '__new__') {
      fornecedorSelect.value = '';
      openModalFornecedor();
    }
  });

  // ===== Cadastro rápido – Produto
  function openModalProduto() { mp.root.hidden = false; document.body.classList.add('modal-open'); }
  function closeModalProduto() { mp.root.hidden = true; document.body.classList.remove('modal-open'); }
  mp.cancel.addEventListener('click', closeModalProduto);

  mp.save.addEventListener('click', async () => {
    const nome = mp.nome.value.trim();
    const categoria_id = mp.cat.value;
    if (!nome || !categoria_id) return alert('Informe nome e categoria.');

    mp.save.disabled = true;
    try {
      const r = await fetch(API_PRODUTOS, {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          ...authHeader()
        },
        body: JSON.stringify({ nome, categoria_id })
      });

      const j = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(j?.error || 'Falha ao cadastrar produto');

      // atualiza cache e todos os selects de item
      await carregarProdutosCache();
      document.querySelectorAll('select.item-produto').forEach(sel => preencherSelectProduto(sel));
      // seleciona o recém-criado na última linha
      const last = [...document.querySelectorAll('select.item-produto')].pop();
      if (last) last.value = j.id;

      closeModalProduto();
    } catch (err) {
      alert(err.message || 'Erro ao cadastrar produto.');
    } finally {
      mp.save.disabled = false;
    }
  });

  // ===== Itens da compra
  function formatBRLInput(el) {
    let v = String(el.value || '').replace(/\D/g, '');
    v = (Number(v || 0) / 100).toFixed(2);
    v = v.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    el.value = 'R$ ' + v;
  }

  function calcTotais() {
    let subtotal = 0;
    document.querySelectorAll('#itensTable tr').forEach(tr => {
      const qtd   = parseFloat((tr.querySelector('.item-qtd').value || '0').replace(',', '.')) || 0;
      const valor = parseBRL(tr.querySelector('.item-valor').value);
      subtotal += qtd * valor;
    });
    subtotalTxt.textContent = brl(subtotal);

    const descGeral = parseBRL(descontoTotI.value);
    const total = Math.max(subtotal - descGeral, 0);
    totalFinalEl.textContent = brl(total);
    return { subtotal, total };
  }

  function onChangeMoney(e) { formatBRLInput(e.target); calcTotais(); }

  function addItemRow(prefill = {}) {
    const row = itemTpl.content.firstElementChild.cloneNode(true);

    const selProd = row.querySelector('.item-produto');
    const inQtd   = row.querySelector('.item-qtd');
    const inVal   = row.querySelector('.item-valor');
    const btnDel  = row.querySelector('.item-remove');

    // Preenche produtos do cache
    preencherSelectProduto(selProd);

    // “+ Novo produto…”
    selProd.addEventListener('change', () => {
      if (selProd.value === '__new__') {
        selProd.value = '';
        carregarCategoriasQuick();
        openModalProduto();
      }
    });

    // Prefill opcional
    if (prefill.produto_id) selProd.value = prefill.produto_id;
    if (prefill.quantidade) inQtd.value = prefill.quantidade;
    if (prefill.valor)      inVal.value = brl(prefill.valor);

    // Eventos
    inQtd.addEventListener('input', calcTotais);
    inVal.addEventListener('input', onChangeMoney);
    btnDel.addEventListener('click', () => { row.remove(); calcTotais(); });

    itensTable.appendChild(row);
    calcTotais();
  }

  addItemBtn.addEventListener('click', () => addItemRow());
  descontoTotI.addEventListener('input', onChangeMoney);

  // ===== Submit com XHR + progresso (comprovante opcional)
  form.addEventListener('submit', e => {
    e.preventDefault();

    const file = fileInput.files?.[0];
    const fileErr = validateFileOptional(file);
    if (fileErr) { setUploaderError(fileErr); return; }

    // Coleta e valida itens
    const itens = [];
    document.querySelectorAll('#itensTable tr').forEach(tr => {
      const produto_id = tr.querySelector('.item-produto').value;
      const quantidade = parseFloat((tr.querySelector('.item-qtd').value || '0').replace(',', '.')) || 0;
      const precoUnit  = parseBRL(tr.querySelector('.item-valor').value);

      if (produto_id && quantidade > 0 && precoUnit > 0) {
        itens.push({
          produtoId: Number(produto_id),
          quantidade,
          precoUnit
        });
      }
    });

    if (itens.length === 0) {
      alert('Adicione ao menos 1 item válido (produto, quantidade e valor).');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    const { total } = calcTotais();

    const formData = new FormData();
    formData.append('obra_id', obraSelect.value);
    formData.append('fornecedor_id', fornecedorSelect.value);
    formData.append('funcionario_id', funcionarioSelect.value);
    formData.append('data_compra', document.getElementById('dataCompra').value);
    formData.append('forma_pagamento', formaPagamento.value);
    formData.append('parcelas', parcelasInput.value);
    formData.append('data_vencimento', document.getElementById('dataVencimento').value);
    formData.append('observacoes', document.getElementById('observacoes').value.trim());
    formData.append('desconto_total', String(parseBRL(descontoTotI.value)));
    formData.append('total_liquido', String(total));
    formData.append('itens', JSON.stringify(itens));
    // Só anexa comprovante se existir
    if (file) formData.append('comprovante', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_COMPRAS, true);
    xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("token")}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        if (uProgress) uProgress.hidden = false;
        if (uBar) uBar.style.width = `${pct}%`;
        if (pct >= 100 && uBadge) {
          uBadge.className = 'u-badge u-badge--ok';
          uBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Upload concluído';
        }
      }
    };

    xhr.onload = () => {
      btn.disabled = false;
      btn.textContent = original;

      if (xhr.status >= 200 && xhr.status < 300) {
        alert('Compra registrada com sucesso!');
        form.reset();
        itensTable.innerHTML = '';
        addItemRow();
        setUploaderIdle(); // volta ao estado sem arquivo
        calcTotais();
        carregarCompras();
      } else {
        setUploaderError('Erro ao registrar');
        alert('Erro ao registrar compra.');
      }
    };

    xhr.onerror = () => {
      btn.disabled = false;
      btn.textContent = original;
      setUploaderError('Falha de conexão');
      alert('Erro de conexão.');
    };

    xhr.send(formData);
  });

  

  // ===== Inicialização
  carregarSelect(API_OBRAS, obraSelect, 'obra');
  carregarSelect(API_FORNECEDORES, fornecedorSelect, 'fornecedor', { withNovo:true });
  carregarSelect(API_FUNCIONARIOS, funcionarioSelect, 'funcionário');
  carregarCompras();

  carregarProdutosCache().then(() => {
    addItemRow();
  });

  // Estado inicial do uploader
  setUploaderIdle();
});
