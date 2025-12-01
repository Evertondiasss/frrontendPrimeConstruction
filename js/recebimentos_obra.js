// recebimentos_obra.js — upload via backend (multer-s3)
const API_BASE          = 'https://backendprimeconstruction-production.up.railway.app';
const API_RECEBIMENTOS  = `${API_BASE}/api/recebimentos_obra`;
const API_OBRAS         = `${API_BASE}/api/obras`;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES  = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

// ==================================================================
// WRAPPER DE FETCH COM TOKEN + TRATAMENTO DE 401 – OBRIGATÓRIO
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

const moedaBR = (n) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

document.addEventListener('DOMContentLoaded', () => {
  const form            = document.getElementById('recebimentoForm');
  const lista           = document.getElementById('listaRecebimentos');
  const obraSelect      = document.getElementById('obraSelect');
  const tipoRecebimento = document.getElementById('tipoRecebimento');
  const fileInput       = document.getElementById('comprovanteFile');

  const viewModal     = document.getElementById('viewModal');
  const viewBody      = document.getElementById('viewBody');
  const viewClose     = document.getElementById('viewClose');
  const deleteModal   = document.getElementById('deleteModal');
  const deleteCancel  = document.getElementById('deleteCancel');
  const deleteConfirm = document.getElementById('deleteConfirm');

  let deleteTarget = null;
  if (viewModal) viewModal.hidden = true;
  if (deleteModal) deleteModal.hidden = true;

  // Helpers
  const brl = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
      .format(Number(v || 0));

  const dtBR = (iso) => {
    if (!iso) return '-';
    const [y, m, d] = String(iso).split('-');
    if (!y || !m || !d) return '-';
    return `${d}/${m}/${y}`;
  };

  const validarArquivo = (file) => {
    if (!file) return { ok: true };
    if (!ALLOWED_MIMES.includes(file.type)) {
      return { ok: false, msg: 'Arquivo inválido. Use PDF/PNG/JPG/WEBP.' };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { ok: false, msg: 'Arquivo acima de 10MB.' };
    }
    return { ok: true };
  };

  // ==================================================================
  // CARREGAR OBRAS
  // ==================================================================
  async function carregarObras() {
    obraSelect.innerHTML = '<option value="">Carregando...</option>';
    try {
      const r = await authFetch(API_OBRAS);
      const data = await r.json();

      obraSelect.innerHTML = '<option value="">Selecione a obra</option>';
      (Array.isArray(data) ? data : []).forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = `${o.id} - ${o.nome}`;
        obraSelect.appendChild(opt);
      });
    } catch {
      obraSelect.innerHTML = '<option value="">Erro ao carregar obras</option>';
    }
  }

  // Skeleton
  function showSkeleton() {
    lista.innerHTML = `
      <div class="skel card"></div>
      <div class="skel card"></div>
      <div class="skel card"></div>
    `;
  }

  // Render card
  function renderCard(r) {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.tabIndex = 0;
    card.dataset.id = r.id;

    const tipoLabel = r.tipo === 'integral' ? 'Integral' : 'Parcial';
    const linkComprovante = r.comprovante_presigned || r.comprovante_url || null;

    card.innerHTML = `
      <div class="history-head">
        <div>
          <div class="history-id">Obra #${r.obra_id}</div>
          <div class="history-title">${r.obra_nome || ''}</div>
        </div>
        <div class="history-actions">
          <button class="icon-btn act-view" title="Visualizar"><i class="fa-solid fa-eye"></i></button>
          <button class="icon-btn act-delete" title="Excluir"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>

      <div class="history-meta">
        <span class="chip"><i class="fa-solid fa-money-bill"></i> ${brl(r.valor)}</span>
        <span class="chip"><i class="fa-solid fa-tag"></i> ${tipoLabel}</span>
        <span class="chip"><i class="fa-solid fa-calendar-day"></i> ${dtBR(r.data_recebimento)}</span>
        ${
          linkComprovante
            ? `<a href="${linkComprovante}" target="_blank" rel="noopener" class="link">
                 <i class="fa-solid fa-file-arrow-down"></i> Comprovante
               </a>`
            : `<span class="chip"><i class="fa-solid fa-file"></i> Sem comprovante</span>`
        }
      </div>

      ${r.observacoes ? `<div class="history-sub">${r.observacoes}</div>` : ''}
    `;

    card.querySelector('.act-view')?.addEventListener('click', ev => {
      ev.stopPropagation();
      openViewModal(r, linkComprovante);
    });
    card.querySelector('.act-delete')?.addEventListener('click', ev => {
      ev.stopPropagation();
      openDeleteModal(r.id);
    });

    return card;
  }

  // ==================================================================
  // CARREGAR RECEBIMENTOS
  // ==================================================================
  function carregarRecebimentos() {
    showSkeleton();

    authFetch(API_RECEBIMENTOS)
      .then(r => r.json())
      .then(data => {
        lista.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
          lista.innerHTML = '<div class="state">Nenhum recebimento registrado.</div>';
          return;
        }

        data.forEach(r => lista.appendChild(renderCard(r)));
      })
      .catch(() => {
        lista.innerHTML = '<div class="state">Erro ao carregar recebimentos.</div>';
      });
  }

  // ==================================================================
  // MODAL DE VISUALIZAÇÃO
  // ==================================================================
  function openViewModal(r, linkComprovante) {
    viewBody.innerHTML = `
      <div><strong>ID:</strong> ${r.id}</div>
      <div><strong>Obra:</strong> ${r.obra_nome || ''} (#${r.obra_id})</div>
      <div><strong>Valor:</strong> ${brl(r.valor)}</div>
      <div><strong>Tipo:</strong> ${r.tipo}</div>
      <div><strong>Data de recebimento:</strong> ${dtBR(r.data_recebimento)}</div>
      <div><strong>Comprovante:</strong> ${
        linkComprovante
          ? `<a href="${linkComprovante}" target="_blank" rel="noopener">Abrir comprovante</a>`
          : '—'
      }</div>
      <div><strong>Observações:</strong> ${r.observacoes || '—'}</div>
      <div class="muted"><strong>Criado em:</strong> ${r.created_at || '—'}</div>
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
  // MODAL EXCLUSÃO
  // ==================================================================
  function openDeleteModal(id) {
    deleteTarget = id;
    deleteModal.hidden = false;
    document.body.classList.add('modal-open');
  }
  function closeDeleteModal() {
    deleteModal.hidden = true;
    document.body.classList.remove('modal-open');
    deleteTarget = null;
  }
  deleteCancel?.addEventListener('click', closeDeleteModal);
  deleteModal?.addEventListener('click', e => { if (e.target === deleteModal) closeDeleteModal(); });

  deleteConfirm?.addEventListener('click', async () => {
    if (!deleteTarget) return;
    try {
      const res = await authFetch(`${API_RECEBIMENTOS}/${deleteTarget}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Falha ao excluir');
      alert('Recebimento excluído com sucesso!');
      closeDeleteModal();
      carregarRecebimentos();

    } catch (err) {
      alert(err.message || 'Erro ao excluir recebimento.');
    }
  });

  // ==================================================================
  // SUBMIT DO FORMULÁRIO (UPLOAD)
  // ==================================================================
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const obra_id          = obraSelect?.value || '';
    const valor            = parseFloat(document.getElementById('valorRecebido')?.value || '0');
    const tipo             = tipoRecebimento?.value || 'parcial';
    const data_recebimento = document.getElementById('dataRecebimento')?.value || '';
    const observacoes      = document.getElementById('observacoes')?.value || '';
    const file             = fileInput?.files?.[0];

    if (!obra_id || !valor || !data_recebimento) {
      return alert('Preencha todos os campos obrigatórios.');
    }

    const vfile = validarArquivo(file);
    if (!vfile.ok) {
      alert(vfile.msg);
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
      const fd = new FormData();
      fd.append('obra_id', obra_id);
      fd.append('valor', valor);
      fd.append('tipo', tipo);
      fd.append('data_recebimento', data_recebimento);
      fd.append('observacoes', observacoes);
      if (file) fd.append('comprovante', file);

      const res = await authFetch(API_RECEBIMENTOS, {
        method: 'POST',
        body: fd
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'Falha ao salvar recebimento.');

      alert('Recebimento registrado com sucesso!');
      form.reset();
      carregarRecebimentos();

    } catch (err) {
      alert(err.message || 'Erro ao registrar recebimento.');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  // ==================================================================
  // INIT
  // ==================================================================
  carregarObras();
  carregarRecebimentos();
});
