/* obras.js */
const API_OBRAS = 'https://backendprimeconstruction-production.up.railway.app/api/obras';
const API_FUNCIONARIOS = 'https://backendprimeconstruction-production.up.railway.app/api/funcionarios';

document.addEventListener('DOMContentLoaded', () => {
  // ========= DOM base =========
  const form       = document.getElementById('obraForm');
  const lista      = document.getElementById('listaObras');
  const respSelect = document.getElementById('responsavelSelect');

  // Inputs do formulário (cache + null-safe)
  const elNomeObra         = document.getElementById('nomeObra');
  const elEnderecoObra     = document.getElementById('enderecoObra');
  const elDataInicioObra   = document.getElementById('dataInicioObra');
  const elDataPrevistaObra = document.getElementById('dataPrevistaObra');
  const elOrcamento        = document.getElementById('orcamentoEstimado');
  const elValorContratual  = document.getElementById('ValorContratual');

  // ========= Modal de AÇÃO (antigo; mantido para desktop) =========
  const modal       = document.getElementById('actionModal');
  const modalTitle  = document.getElementById('modalTitle');
  const modalDesc   = document.getElementById('modalDesc');
  const modalMotivo = document.getElementById('modalMotivo');
  const btnMCancel  = document.getElementById('modalCancel');
  const btnMConfirm = document.getElementById('modalConfirm');
  if (modal) modal.hidden = true;
  let currentAction = null; // { type: 'pausar'|'retomar'|'finalizar'|'cancelar', id:number }

  // ========= Modal de DETALHES =========
  const viewModal = document.getElementById('viewModal');
  const viewBody  = document.getElementById('viewBody');
  const viewClose = document.getElementById('viewClose');
  if (viewModal) viewModal.hidden = true;

  // ========= Modal EDITAR VALORES =========
  const editValuesModal   = document.getElementById('editValuesModal');
  const editOrcamento     = document.getElementById('editOrcamento');
  const editValorInput    = document.getElementById('editValorContratual');
  const editValuesCancel  = document.getElementById('editValuesCancel');
  const editValuesSave    = document.getElementById('editValuesSave');
  if (editValuesModal) editValuesModal.hidden = true;
  let editTarget = null; // { id:number, orcamento:number, valor:number }

  // ===== Modal de STATUS (novo fluxo mobile) =====
  const statusModal      = document.getElementById('statusModal');
  const statusSelect     = document.getElementById('statusSelect');
  const statusMotivo     = document.getElementById('statusMotivo');
  const statusMotivoGp   = document.getElementById('statusMotivoGroup');
  const statusCancel     = document.getElementById('statusCancel');
  const statusSave       = document.getElementById('statusSave');
  if (statusModal) statusModal.hidden = true;
  let statusTarget = null; // { id:number, statusAtual:string }

  // ========= Helpers =========
  const brl = (v) =>
    new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' })
      .format(Number(v || 0));

  const dtBR = (data) => {
    if (!data) return '—';

    // se vier no formato dd/mm/yyyy -> já está pronto
    if (/\d{2}\/\d{2}\/\d{4}/.test(data)) {
      return data;
    }

    // se vier no formato yyyy-mm-dd -> converte
    if (/\d{4}-\d{2}-\d{2}/.test(data)) {
      const [y, m, d] = data.split('-');
      return `${d}/${m}/${y}`;
    }

    return '—';
  };

  function showSkeleton() {
    if (!lista) return;
    lista.innerHTML = `
      <div class="skel card"></div>
      <div class="skel card"></div>
      <div class="skel card"></div>
    `;
  }

  function statusChip(o) {
    const map = {
      ativa: 'fa-circle-play',
      pausada: 'fa-circle-pause',
      concluida: 'fa-circle-check',
      cancelada: 'fa-circle-xmark'
    };
    const icon = map[o.status] || 'fa-info-circle';
    return `
      <span class="badge tap act-status" data-id="${o.id}" data-status="${o.status || ''}">
        <i class="fa-solid ${icon}"></i> ${o.status || '—'}
      </span>
    `;
  }

  function renderActions(o) {
    const b = [];
    if (o.status === 'ativa') {
      b.push(`<button class="icon-btn act-finalizar" data-id="${o.id}" title="Finalizar"><i class="fa-solid fa-flag-checkered"></i></button>`);
      b.push(`<button class="icon-btn act-pausar"    data-id="${o.id}" title="Pausar"><i class="fa-solid fa-pause"></i></button>`);
      b.push(`<button class="icon-btn act-cancelar"  data-id="${o.id}" title="Cancelar"><i class="fa-solid fa-ban"></i></button>`);
    } else if (o.status === 'pausada') {
      b.push(`<button class="icon-btn act-retomar"   data-id="${o.id}" title="Retomar"><i class="fa-solid fa-play"></i></button>`);
      b.push(`<button class="icon-btn act-finalizar" data-id="${o.id}" title="Finalizar"><i class="fa-solid fa-flag-checkered"></i></button>`);
      b.push(`<button class="icon-btn act-cancelar"  data-id="${o.id}" title="Cancelar"><i class="fa-solid fa-ban"></i></button>`);
    }
    return b.join('');
  }

  function renderCard(o) {
    const card = document.createElement('div');
    card.className = 'data-card';
    card.tabIndex = 0;
    card.dataset.id = o.id;

    card.innerHTML = `
      <div class="avatar"><i class="fa-solid fa-building"></i></div>
      <div>
        <div class="title">#${o.id} — ${o.nome}</div>
        <div class="subtitle">${o.endereco || ''}</div>
        <div class="meta">
          ${statusChip(o)}
          <span class="badge"><i class="fa-solid fa-user-tie"></i> ${o.responsavel_nome || '—'}</span>
          <span class="badge"><i class="fa-solid fa-calendar-day"></i> Início ${dtBR(o.data_inicio)}</span>
          <span class="badge"><i class="fa-solid fa-calendar-check"></i> Prevista ${dtBR(o.data_prevista)}</span>
          <span class="badge tap act-edit-orc"   data-id="${o.id}"><i class="fa-solid fa-coins"></i> ${brl(o.orcamento_estimado)}</span>
          <span class="badge tap act-edit-valor" data-id="${o.id}"><i class="fa-solid fa-coins"></i> ${brl(o.valor_contratual)}</span>
        </div>
      </div>

      <!-- Ações visíveis apenas em desktop/hover (seus estilos podem ocultar no mobile) -->
      <div class="actions">${renderActions(o)}</div>
    `;

    // Botões (desktop)
    card.querySelectorAll('.icon-btn').forEach(btn => {
      btn.addEventListener('click', (ev) => { ev.stopPropagation(); handleActionClick(btn); });
      btn.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); handleActionClick(btn); }
      });
    });

    // Chips "tocáveis" (mobile + desktop)
    card.querySelector('.act-status')?.addEventListener('click', (ev) => {
      ev.stopPropagation(); openStatusFromCard(o);
    });
    card.querySelector('.act-edit-orc')?.addEventListener('click', (ev) => {
      ev.stopPropagation(); openEditValuesModal(o, 'orc');
    });
    card.querySelector('.act-edit-valor')?.addEventListener('click', (ev) => {
      ev.stopPropagation(); openEditValuesModal(o, 'val');
    });

    // Clique no card abre detalhes
    if (viewModal && viewBody) {
      const open = () => openViewModal(o);
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    }

    return card;
  }

  // ========= API =========
  function carregarResponsaveis() {
    if (!respSelect) return;
    fetch(API_FUNCIONARIOS)
      .then(r => r.json())
      .then(data => {
        respSelect.innerHTML = '<option value="">Selecione o responsável</option>';
        (data || []).forEach(f => {
          const opt = document.createElement('option');
          opt.value = f.id;
          opt.textContent = `${f.nome} (${f.cargo})`;
          respSelect.appendChild(opt);
        });
      })
      .catch(() => { respSelect.innerHTML = '<option value="">Erro ao carregar</option>'; });
  }

  function carregarObras() {
    if (!lista) return;
    showSkeleton();
    fetch(API_OBRAS)
      .then(r => r.json())
      .then(data => {
        lista.innerHTML = '';
        if (!Array.isArray(data) || data.length === 0) {
          lista.innerHTML = '<div class="state">Nenhuma obra cadastrada.</div>';
          return;
        }
        data.forEach(o => lista.appendChild(renderCard(o)));
      })
      .catch(() => { lista.innerHTML = '<div class="state">Erro ao carregar obras.</div>'; });
  }

  async function getObra(id) {
    const r = await fetch(`${API_OBRAS}/${id}`);
    if (!r.ok) throw new Error('Falha ao obter obra');
    return r.json();
  }

  async function postAcaoObra(type, id, motivo) {
    const urlMap = {
      pausar:    (i) => `/api/obras/${i}/pausar`,
      retomar:   (i) => `/api/obras/${i}/retomar`,
      finalizar: (i) => `/api/obras/${i}/finalizar`,
      cancelar:  (i) => `/api/obras/${i}/cancelar`,
    };
    const url  = `http://localhost:3000${urlMap[type](id)}`;
    const body = (type === 'retomar') ? null : JSON.stringify({ motivo });
    const res = await fetch(url, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.error || 'Falha na ação');
    return payload;
  }

  // ========= Modal de AÇÃO (desktop) =========
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
    const motivo = (modalMotivo?.value || '').trim();
    try {
      await postAcaoObra(currentAction.type, currentAction.id, motivo);
      closeModal();
      carregarObras();
    } catch (err) {
      alert(err.message || 'Erro ao aplicar ação.');
    } finally {
      btnMConfirm.disabled = false;
    }
  });

  // ========= Modal EDITAR VALORES =========
  function openEditValuesModal(o, focusField) {
    if (!editValuesModal) return;
    editTarget = {
      id: o.id,
      orcamento: Number(o.orcamento_estimado || 0),
      valor: Number(o.valor_contratual || 0),
    };
    if (editOrcamento)  editOrcamento.value  = editTarget.orcamento;
    if (editValorInput) editValorInput.value = editTarget.valor;

    editValuesModal.hidden = false;
    document.body.classList.add('modal-open');

    setTimeout(() => {
      if (focusField === 'orc' && editOrcamento)  editOrcamento.focus();
      if (focusField === 'val' && editValorInput) editValorInput.focus();
    }, 50);
  }

  function closeEditValuesModal() {
    if (!editValuesModal) return;
    editValuesModal.hidden = true;
    document.body.classList.remove('modal-open');
    editTarget = null;
  }

  editValuesCancel && editValuesCancel.addEventListener('click', closeEditValuesModal);
  editValuesModal && editValuesModal.addEventListener('click', (e) => {
    if (e.target === editValuesModal) closeEditValuesModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editValuesModal && !editValuesModal.hidden) closeEditValuesModal();
  });

  async function salvarNovosValores() {
    if (!editTarget) return;

    const novoOrc = Number(String(editOrcamento?.value ?? '').trim() || '0');
    const novoVal = Number(String(editValorInput?.value ?? '').trim() || '0');

    if (Number.isNaN(novoOrc) || novoOrc < 0) return alert('Orçamento inválido.');
    if (Number.isNaN(novoVal) || novoVal < 0) return alert('Valor contratual inválido.');

    if (editValuesSave) {
      editValuesSave.disabled = true;
      editValuesSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    }

    try {
      const res = await fetch(`${API_OBRAS}/${editTarget.id}/valores`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orcamento_estimado: novoOrc,
          valor_contratual: novoVal
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'Falha ao atualizar valores');
      alert('Valores atualizados com sucesso!');
      closeEditValuesModal();
      carregarObras();
    } catch (err) {
      alert(err.message || 'Erro ao atualizar valores.');
    } finally {
      if (editValuesSave) {
        editValuesSave.disabled = false;
        editValuesSave.textContent = 'Salvar';
      }
    }
  }
  editValuesSave && editValuesSave.addEventListener('click', salvarNovosValores);

  // ========= Modal STATUS =========
  function openStatusFromCard(o) {
    if (!statusModal || !statusSelect) return;
    statusTarget = { id: o.id, statusAtual: o.status || 'ativa' };
    statusSelect.value = statusTarget.statusAtual;

    const showMotivo = (statusSelect.value === 'pausada' || statusSelect.value === 'cancelada');
    if (statusMotivoGp) statusMotivoGp.style.display = showMotivo ? 'block' : 'none';
    if (statusMotivo) statusMotivo.value = '';

    statusModal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeStatusModal() {
    if (!statusModal) return;
    statusModal.hidden = true;
    document.body.classList.remove('modal-open');
    statusTarget = null;
  }

  statusCancel && statusCancel.addEventListener('click', closeStatusModal);
  statusModal && statusModal.addEventListener('click', (e) => { if (e.target === statusModal) closeStatusModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && statusModal && !statusModal.hidden) closeStatusModal(); });

  statusSelect && statusSelect.addEventListener('change', () => {
    const v = statusSelect.value;
    const showMotivo = (v === 'pausada' || v === 'cancelada');
    if (statusMotivoGp) statusMotivoGp.style.display = showMotivo ? 'block' : 'none';
  });

  statusSave && statusSave.addEventListener('click', async () => {
    if (!statusTarget) return;
    const novo = statusSelect?.value || 'ativa';
    const motivo = (statusMotivo?.value || '').trim();
    const atual = statusTarget.statusAtual;

    try {
      if (novo === 'pausada' && atual === 'ativa') {
        await postAcaoObra('pausar', statusTarget.id, motivo);
      } else if (novo === 'ativa' && atual === 'pausada') {
        await postAcaoObra('retomar', statusTarget.id);
      } else if (novo === 'concluida' && (atual === 'ativa' || atual === 'pausada')) {
        await postAcaoObra('finalizar', statusTarget.id);
      } else if (novo === 'cancelada' && (atual === 'ativa' || atual === 'pausada')) {
        await postAcaoObra('cancelar', statusTarget.id, motivo);
      } else {
        alert('Transição de status não suportada.');
        return;
      }

      alert('Status atualizado com sucesso!');
      closeStatusModal();
      carregarObras();
    } catch (err) {
      alert(err.message || 'Erro ao alterar status.');
    }
  });

  // ========= Ações (desktop) =========
  function handleActionClick(btn) {
    const id = Number(btn.dataset.id);
    if (!id) return;

    if (btn.classList.contains('act-pausar')) {
      openModal({ title:'Pausar obra', desc:'Tem certeza que deseja pausar esta obra? Você poderá retomar depois.', action:'pausar', id });
    } else if (btn.classList.contains('act-retomar')) {
      openModal({ title:'Retomar obra', desc:'Confirmar retomada desta obra?', action:'retomar', id });
    } else if (btn.classList.contains('act-finalizar')) {
      openModal({ title:'Finalizar obra', desc:'Confirma a finalização desta obra? A ação registra a data de conclusão.', action:'finalizar', id });
    } else if (btn.classList.contains('act-cancelar')) {
      openModal({ title:'Cancelar obra', desc:'Tem certeza que deseja cancelar esta obra? Informe o motivo (opcional).', action:'cancelar', id });
    }
  }

  // ========= Modal de DETALHES =========
  function openViewModal(o) {
    if (!viewModal || !viewBody) return;
    viewBody.innerHTML = `
      <div><strong>Nome:</strong> ${o.nome}</div>
      <div><strong>Status:</strong> ${o.status || '—'}</div>
      <div><strong>Responsável:</strong> ${o.responsavel_nome || '—'}</div>
      <div><strong>Endereço:</strong> ${o.endereco || '—'}</div>
      <div><strong>Data de início:</strong> ${dtBR(o.data_inicio)}</div>
      <div><strong>Data prevista:</strong> ${dtBR(o.data_prevista)}</div>
      <div><strong>Orçamento:</strong> ${brl(o.orcamento_estimado)}</div>
      <div><strong>Valor:</strong> ${brl(o.valor_contratual)}</div>
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

  // ========= Cadastro =========
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const nome               = (elNomeObra?.value || '').trim();
      const endereco           = (elEnderecoObra?.value || '').trim();
      const data_inicio        = (elDataInicioObra?.value || '');
      const data_prevista      = (elDataPrevistaObra?.value || '');
      const responsavel_id     = (respSelect?.value || '');
      const orcamento_estimado = (elOrcamento?.value || '').trim();
      const valor_contratual   = (elValorContratual?.value || '').trim();

      if (!nome || !endereco || !data_inicio || !data_prevista || !responsavel_id || !orcamento_estimado || !valor_contratual) {
        return alert('Preencha todos os campos!');
      }
      if (Number(orcamento_estimado) < 0) return alert('Orçamento inválido.');
      if (Number(valor_contratual) < 0 ) return alert('Valor contratual inválido');

      const btn = form.querySelector('button[type="submit"]');
      const original = btn ? btn.textContent : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
      }

      fetch(API_OBRAS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, endereco, data_inicio, data_prevista, responsavel_id, orcamento_estimado, valor_contratual })
      })
        .then(async r => {
          const payload = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(payload?.error || 'Falha ao salvar');
          return payload;
        })
        .then(() => {
          alert('Obra cadastrada com sucesso!');
          form.reset();
          carregarObras();
        })
        .catch(err => alert(err.message || 'Erro ao cadastrar obra.'))
        .finally(() => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = original;
          }
        });
    });
  }

  // ========= Init =========
  carregarResponsaveis();
  carregarObras();
});
