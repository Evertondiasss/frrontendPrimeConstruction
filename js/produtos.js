// produtos.js — protegido com authFetch
const API_CATEGORIAS = 'https://backendprimeconstruction-production.up.railway.app/api/categorias';
const API_PRODUTOS   = 'https://backendprimeconstruction-production.up.railway.app/api/produtos';
const API_UNIDADES   = 'https://backendprimeconstruction-production.up.railway.app/api/unidades_medida';

// ==================================================================
// AUTH WRAPPER — usa token + trata 401
// ==================================================================
function handleAuthError(res) {
  if (res.status === 401) {
    alert("Sessão expirada. Faça login novamente.");
    logout();
    throw new Error("Sessão expirada");
  }
}

function authFetch(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    ...getAuthHeaders()
  };
  return fetch(url, options).then(res => {
    handleAuthError(res);
    return res;
  });
}
// ==================================================================

document.addEventListener('DOMContentLoaded', () => {

  const form            = document.getElementById('produtoForm');
  const lista           = document.getElementById('listaProdutos');
  const categoriaSelect = document.getElementById('categoriaSelect');
  const unidadeSelect   = document.getElementById('unidadeMedida');

  // ===== Modais =====
  const modal       = document.getElementById('actionModal');
  const modalTitle  = document.getElementById('modalTitle');
  const modalDesc   = document.getElementById('modalDesc');
  const modalMotivo = document.getElementById('modalMotivo');
  const btnMCancel  = document.getElementById('modalCancel');
  const btnMConfirm = document.getElementById('modalConfirm');

  if (modal) modal.hidden = true;
  let currentAction = null;

  const viewModal = document.getElementById('viewModal');
  const viewBody  = document.getElementById('viewBody');
  const viewClose = document.getElementById('viewClose');
  if (viewModal) viewModal.hidden = true;

  // ===== Helpers =====
  function showSkeleton() {
    lista.innerHTML = `
      <div class="skel card"></div>
      <div class="skel card"></div>
      <div class="skel card"></div>
    `;
  }

  function renderCard(p) {
    const card = document.createElement('div');
    card.className = 'data-card';

    card.innerHTML = `
      <div class="avatar"><i class="fa-solid fa-tags"></i></div>
      <div>
        <div class="title" title="${p.nome}">#${p.id} — ${p.nome}</div>
        <div class="subtitle">${p.categoria_nome || 'Sem categoria'}</div>
      </div>
    `;

    return card;
  }

  function renderActions(p) {
    return `
      <button class="icon-btn act-remover" data-id="${p.id}" title="Remover">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;
  }

  // ==================================================================
  // CARREGAR CATEGORIAS
  // ==================================================================
  function carregarCategorias() {
    authFetch(API_CATEGORIAS)
      .then(r => r.json())
      .then(data => {
        categoriaSelect.innerHTML = '<option value="">Selecione a categoria</option>';
        (data || []).forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.nome;
          categoriaSelect.appendChild(opt);
        });
      })
      .catch(() => {
        categoriaSelect.innerHTML = '<option value="">Erro ao carregar categorias</option>';
      });
  }

  // ==================================================================
  // CARREGAR UNIDADES
  // ==================================================================
  function carregarUnidades() {
    authFetch(API_UNIDADES)
      .then(r => r.json())
      .then(data => {
        unidadeSelect.innerHTML = '<option value="">Selecione a unidade</option>';
        (data || []).forEach(u => {
          const opt = document.createElement('option');
          opt.value = u.id;
          opt.textContent = `${u.descricao} (${u.sigla})`;
          unidadeSelect.appendChild(opt);
        });
      })
      .catch(() => {
        unidadeSelect.innerHTML = '<option value="">Erro ao carregar unidades</option>';
      });
  }

  // ==================================================================
  // CARREGAR PRODUTOS
  // ==================================================================
  function carregarProdutos() {
    showSkeleton();

    authFetch(API_PRODUTOS)
      .then(r => r.json())
      .then(data => {
        lista.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
          lista.innerHTML = '<div class="state">Nenhum produto cadastrado.</div>';
          return;
        }

        data.forEach(p => lista.appendChild(renderCard(p)));
      })
      .catch(() => {
        lista.innerHTML = '<div class="state">Erro ao carregar produtos.</div>';
      });
  }

  // ==================================================================
  // DELETAR PRODUTO
  // ==================================================================
  async function deleteProduto(id) {
    const res = await authFetch(`${API_PRODUTOS}/${id}`, { method: 'DELETE' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.error || "Falha ao remover produto.");
    return payload;
  }

  // ==================================================================
  // MODAL AÇÃO
  // ==================================================================
  function openModal({ title, desc, action, id }) {
    currentAction = { type: action, id };
    modalTitle.textContent = title;
    modalDesc.textContent  = desc;
    modalMotivo.value      = '';
    modal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    currentAction = null;
  }

  btnMCancel?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  btnMConfirm?.addEventListener('click', async () => {
    if (!currentAction) return;

    btnMConfirm.disabled = true;

    try {
      if (currentAction.type === 'remover') {
        await deleteProduto(currentAction.id);
      }
      closeModal();
      carregarProdutos();
    } catch (err) {
      alert(err.message || "Erro ao aplicar ação.");
    }

    btnMConfirm.disabled = false;
  });

  // ==================================================================
  // MODAL DETALHES
  // ==================================================================
  function openViewModal(p) {
    viewBody.innerHTML = `
      <div><strong>ID:</strong> ${p.id}</div>
      <div><strong>Nome:</strong> ${p.nome}</div>
      <div><strong>Categoria:</strong> ${p.categoria_nome || '—'}</div>
    `;
    viewModal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeViewModal() {
    viewModal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  viewClose?.addEventListener('click', closeViewModal);
  viewModal?.addEventListener('click', e => { if (e.target === viewModal) closeViewModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !viewModal.hidden) closeViewModal(); });

  // ==================================================================
  // SUBMIT FORM
  // ==================================================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome         = document.getElementById('nomeProduto').value.trim();
    const categoria_id = categoriaSelect.value;
    const unidade_id   = unidadeSelect.value;

    if (!nome || !categoria_id || !unidade_id)
      return alert("Preencha todos os campos!");

    const btn      = form.querySelector('button[type="submit"]');
    const original = btn.textContent;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
      const res = await authFetch(API_PRODUTOS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ nome, categoria_id, unidade_id })
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(payload?.error || "Falha ao salvar");

      alert("Produto cadastrado com sucesso!");
      form.reset();
      carregarProdutos();

    } catch (err) {
      alert(err.message || "Erro ao cadastrar produto.");
    }

    btn.disabled = false;
    btn.textContent = original;
  });

  // ==================================================================
  // INIT
  // ==================================================================
  carregarUnidades();
  carregarCategorias();
  carregarProdutos();
});
