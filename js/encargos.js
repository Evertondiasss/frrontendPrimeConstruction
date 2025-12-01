// encargos.js — protegido com authFetch

const API_BASE      = 'https://backendprimeconstruction-production.up.railway.app';
const API_OBRAS     = `${API_BASE}/api/obras`;
const API_ENCARGOS  = `${API_BASE}/api/encargos`;

const MAX_FILE_BYTES = 10 * 1024 * 1024; 
const ALLOWED_MIMES  = ['application/pdf', 'image/png', 'image/jpeg'];

// ======================================================
// HELPERS
// ======================================================
function formatarBRL(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function validarArquivo(file) {
  if (!file) return { ok: true };
  if (!ALLOWED_MIMES.includes(file.type)) return { ok: false, msg: 'Tipo de arquivo inválido (PDF/PNG/JPG).' };
  if (file.size > MAX_FILE_BYTES) return { ok: false, msg: 'Arquivo acima de 10MB.' };
  return { ok: true };
}

// ======================================================
// AUTH WRAPPER
// ======================================================
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

// ======================================================
// MAIN
// ======================================================
document.addEventListener('DOMContentLoaded', () => {

  const form         = document.getElementById('encargoForm');
  const lista        = document.getElementById('listaEncargos');
  const obraSelect   = document.getElementById('obraSelect');
  const tipoSelect   = document.getElementById('tipoEncargo');
  const valorInp     = document.getElementById('valorEncargo');
  const fileInp      = document.getElementById('comprovanteEncargo');
  const atualizarBtn = document.getElementById('atualizarEncargos');

  // ======================================================
  // CARREGAR OBRAS
  // ======================================================
  function carregarObras() {
    obraSelect.innerHTML = '<option value="">Carregando obras...</option>';

    authFetch(API_OBRAS)
      .then(r => r.json())
      .then(data => {
        obraSelect.innerHTML = '<option value="">Selecione a Obra</option>';
        (data || []).forEach(o => {
          const opt = document.createElement('option');
          opt.value = o.id;
          opt.textContent = o.nome || `Obra #${o.id}`;
          obraSelect.appendChild(opt);
        });
      })
      .catch(() => {
        obraSelect.innerHTML = '<option value="">Erro ao carregar obras</option>';
      });
  }

  // ======================================================
  // LISTAR ENCARGOS
  // ======================================================
  function carregarEncargos() {
    lista.classList.add('history');
    lista.innerHTML = '<li>Carregando...</li>';

    authFetch(API_ENCARGOS)
      .then(r => r.json())
      .then(data => {
        lista.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
          lista.innerHTML = '<li>Nenhum encargo registrado.</li>';
          return;
        }

        data.forEach(e => {
          const li = document.createElement('li');
          li.className = 'history-card';

          const id     = e.id ?? '—';
          const obra   = e.obra_nome ?? e.obra?.nome ?? `Obra #${e.obra_id ?? '—'}`;
          const tipo   = e.tipo ?? '—';
          const valor  = formatarBRL(e.valor ?? e.valor_encargo);
          const dataCr = e.criado_em || e.created_at || e.data || '';

          const href =
            e.comprovante_presigned ||
            e.comprovante_public ||
            (e.comprovante_url?.startsWith('http') ? e.comprovante_url : null);

          const link = href
            ? `<a class="link" href="${href}" target="_blank" rel="noopener"><i class="fa-solid fa-cloud-arrow-down"></i> Comprovante</a>`
            : '';

          li.innerHTML = `
            <div class="history-head">
              <span class="history-id">#${id}</span>
              <span class="chip"><i class="fa-solid fa-sack-dollar"></i> ${valor}</span>
            </div>
            <div class="history-title">${obra}</div>
            <div class="history-sub">Tipo: ${tipo}</div>
            ${dataCr ? `<div class="history-meta">Registrado em: ${new Date(dataCr).toLocaleString('pt-BR')}</div>` : ''}
            <div class="history-actions">${link}</div>
          `;
          lista.appendChild(li);
        });
      })
      .catch(() => {
        lista.innerHTML = '<li>Erro ao carregar encargos.</li>';
      });
  }

  // ======================================================
  // SUBMIT
  // ======================================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const obra_id = obraSelect.value;
    const tipo    = tipoSelect.value;
    const valor   = valorInp.value;
    const file    = fileInp.files?.[0];

    if (!obra_id || !tipo || !valor)
      return alert('Preencha todos os campos obrigatórios!');

    if (Number(valor) <= 0)
      return alert('Informe um valor válido.');

    const vfile = validarArquivo(file);
    if (!vfile.ok)
      return alert(vfile.msg);

    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
      const fd = new FormData();
      fd.append('obra_id', obra_id);
      fd.append('tipo', tipo);
      fd.append('valor', valor);
      if (file) fd.append('comprovante', file, file.name);

      const r = await authFetch(API_ENCARGOS, {
        method: 'POST',
        body: fd
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || 'Erro ao registrar encargo.');
      }

      alert('Encargo registrado com sucesso!');
      form.reset();
      carregarEncargos();

    } catch (err) {
      alert(err.message || 'Erro ao registrar encargo.');
    }

    btn.disabled = false;
    btn.textContent = original;
  });

  // ======================================================
  // INIT
  // ======================================================
  atualizarBtn?.addEventListener('click', carregarEncargos);
  carregarObras();
  carregarEncargos();
});
