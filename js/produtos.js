const API_CATEGORIAS = 'https://backendprimeconstruction-production.up.railway.app/api/categorias';
const API_PRODUTOS   = 'https://backendprimeconstruction-production.up.railway.app/api/produtos';

document.addEventListener('DOMContentLoaded', () => {
  const form             = document.getElementById('produtoForm');
  const lista            = document.getElementById('listaProdutos');
  const categoriaSelect  = document.getElementById('categoriaSelect');

  // ===== Modal de AÇÃO ===== (reuso do padrão de obras)
  const modal       = document.getElementById('actionModal');
  const modalTitle  = document.getElementById('modalTitle');
  const modalDesc   = document.getElementById('modalDesc');
  const modalMotivo = document.getElementById('modalMotivo');
  const btnMCancel  = document.getElementById('modalCancel');
  const btnMConfirm = document.getElementById('modalConfirm');
  if (modal) modal.hidden = true;
  let currentAction = null; // { type:'remover', id:number }

  // ===== Modal de DETALHES =====
  const viewModal = document.getElementById('viewModal');
  const viewBody  = document.getElementById('viewBody');
  const viewClose = document.getElementById('viewClose');
  if (viewModal) viewModal.hidden = true;

  // ===== Helpers (mesmo espírito do obras.js) =====
  function showSkeleton() {
    lista.innerHTML = `
      <div class="skel card"></div>
      <div class="skel card"></div>
      <div class="skel card"></div>
    `;
  }

  function renderActions(p) {
    // Para produtos, padronizamos "remover" (com confirmação).
    return `
      <button class="icon-btn act-remover" data-id="${p.id}" title="Remover">
        <i class="fa-solid fa-trash"></i>
      </button>
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


  // ===== API =====
  function carregarCategorias() {
    fetch(API_CATEGORIAS)
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

  function carregarProdutos() {
    showSkeleton();
    fetch(API_PRODUTOS)
      .then(r => r.json())
      .then(data => {
        lista.innerHTML = '';
        if (!Array.isArray(data) || data.length === 0) {
          lista.innerHTML = '<div class="state">Nenhum produto cadastrado.</div>';
          return;
        }
        data.forEach(p => lista.appendChild(renderCard(p)));
      })
      .catch(() => { lista.innerHTML = '<div class="state">Erro ao carregar produtos.</div>'; });
  }

  // (1) Atualize a função de deleção para usar DELETE sem body
async function deleteProduto(id) {
  const res = await fetch(`${API_PRODUTOS}/${id}`, { method: 'DELETE' });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error || 'Falha ao remover produto');
  return payload;
}


  // ===== Modal AÇÃO =====
  function openModal({ title, desc, action, id }) {
    if (!modal) return;
    currentAction = { type: action, id };
    if (modalTitle) modalTitle.textContent = title;
    if (modalDesc)  modalDesc.textContent  = desc;
    if (modalMotivo) modalMotivo.value = '';
    modal.hidden = false;
    document.body.classList.add('modal-open');
  }
  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    currentAction = null;
  }
  btnMCancel && btnMCancel.addEventListener('click', closeModal);
  modal && modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal && !modal.hidden) closeModal(); });

  btnMConfirm && btnMConfirm.addEventListener('click', async () => {
    if (!currentAction) return;
    btnMConfirm.disabled = true;
    const motivo = (modalMotivo && modalMotivo.value || '').trim();
    try {
      if (currentAction.type === 'remover') {
        await deleteProduto(currentAction.id, motivo);
      }
      closeModal();
      carregarProdutos();
    } catch (err) {
      alert(err.message || 'Erro ao aplicar ação.');
    } finally {
      btnMConfirm.disabled = false;
    }
  });

  function handleActionClick(btn) {
    const id = Number(btn.dataset.id);
    if (!id) return;
    if (btn.classList.contains('act-remover')) {
      openModal({
        title: 'Remover produto',
        desc: 'Tem certeza que deseja remover este produto? Esta ação é permanente e pode falhar se o produto estiver vinculado a outros registros.',
        action: 'remover',
        id
      });

    }
  }

  // ===== Modal DETALHES =====
  function openViewModal(p) {
    if (!viewModal || !viewBody) return;
    viewBody.innerHTML = `
      <div><strong>ID:</strong> ${p.id}</div>
      <div><strong>Nome:</strong> ${p.nome}</div>
      <div><strong>Categoria:</strong> ${p.categoria_nome || '—'}</div>
    `;
    viewModal.hidden = false;
    document.body.classList.add('modal-open');
  }
  function closeViewModal() {
    if (!viewModal) return;
    viewModal.hidden = true;
    document.body.classList.remove('modal-open');
  }
  viewClose && viewClose.addEventListener('click', closeViewModal);
  viewModal && viewModal.addEventListener('click', (e) => { if (e.target === viewModal) closeViewModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && viewModal && !viewModal.hidden) closeViewModal(); });

  // ===== Submit =====
  form.addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = document.getElementById('nomeProduto').value.trim();
  const categoria_id = categoriaSelect.value;
  const unidade_id = document.getElementById('unidadeMedida').value; // 👈 ADICIONE ESTA LINHA

  if (!nome || !categoria_id || !unidade_id) {
    return alert('Preencha todos os campos!');
  }

  const btn = form.querySelector('button[type="submit"]');
  const original = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

  fetch(API_PRODUTOS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome,
      categoria_id,
      unidade_id // 👈 agora existe
    })
  })
    .then(async r => {
      const payload = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(payload?.error || 'Falha ao salvar');
      return payload;
    })
    .then(() => {
      alert('Produto cadastrado com sucesso!');
      form.reset();
      carregarProdutos();
    })
    .catch(err => alert(err.message || 'Erro ao cadastrar produto.'))
    .finally(() => {
      btn.disabled = false;
      btn.textContent = original;
    });
});

const unidadeSelect = document.getElementById('unidadeMedida');

function carregarUnidades() {
  fetch('https://backendprimeconstruction-production.up.railway.app/api/unidades_medida')
    .then(r => r.json())
    .then(data => {
      unidadeSelect.innerHTML = '<option value="">Selecione a unidade</option>';
      data.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id; // 👈 envia o ID para o backend
        opt.textContent = `${u.descricao} (${u.sigla})`; // mostra descrição e sigla
        unidadeSelect.appendChild(opt);
      });
    })
    .catch(() => {
      unidadeSelect.innerHTML = '<option value="">Erro ao carregar unidades</option>';
    });
}

carregarUnidades();
carregarCategorias();
carregarProdutos();


  // Init
  carregarCategorias();
  carregarProdutos();
});
