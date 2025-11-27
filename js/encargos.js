// encargos.js

const API_BASE   = 'https://backendprimeconstruction-production.up.railway.app';
const API_OBRAS  = `${API_BASE}/api/obras`;
const API_ENCARGOS = `${API_BASE}/api/encargos`;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES  = ['application/pdf', 'image/png', 'image/jpeg'];

// Utils
function formatarBRL(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function validarArquivo(file) {
  if (!file) return { ok: true }; // opcional
  if (!ALLOWED_MIMES.includes(file.type)) return { ok: false, msg: 'Tipo de arquivo inválido (PDF/PNG/JPG).' };
  if (file.size > MAX_FILE_BYTES) return { ok: false, msg: 'Arquivo acima de 10MB.' };
  return { ok: true };
}

document.addEventListener('DOMContentLoaded', () => {
  const form         = document.getElementById('encargoForm');
  const lista        = document.getElementById('listaEncargos');
  const obraSelect   = document.getElementById('obraSelect');
  const tipoSelect   = document.getElementById('tipoEncargo');
  const valorInp     = document.getElementById('valorEncargo');
  const fileInp      = document.getElementById('comprovanteEncargo');
  const atualizarBtn = document.getElementById('atualizarEncargos');

  // Carrega obras (id, nome)
  function carregarObras() {
    obraSelect.innerHTML = '<option value="">Carregando obras...</option>';
    fetch(API_OBRAS)
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

  // Lista os encargos já registrados
function carregarEncargos() {
  lista.classList.add('history');
  lista.innerHTML = '<li>Carregando...</li>';

  fetch(API_ENCARGOS)
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

        // ✅ use 'e' (não 'p')
        const href =
          e.comprovante_presigned                              // preferir URL assinada
          || (e.comprovante_public || null)                    // opcional (se backend expôs)
          || (e.comprovante_url?.startsWith('http') ? e.comprovante_url : null); // fallback absoluto

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


  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const obra_id = obraSelect.value;
    const tipo    = tipoSelect.value;
    const valor   = valorInp.value;
    const file    = fileInp.files?.[0];

    if (!obra_id || !tipo || !valor) {
      alert('Preencha todos os campos obrigatórios!');
      return;
    }
    if (Number(valor) <= 0) {
      alert('Informe um valor válido.');
      return;
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
      fd.append('tipo', tipo);
      fd.append('valor', valor);
      if (file) fd.append('comprovante', file, file.name);

      // logs de diagnóstico (remova em produção)
      console.log('fileInp.files:', fileInp.files);
      console.log('file selecionado:', file);
      for (const [k, v] of fd.entries()) {
        console.log('FD ->', k, v instanceof File ? { name: v.name, type: v.type, size: v.size } : v);
      }

      const r = await fetch(API_ENCARGOS, {
        method: 'POST',
        body: fd, // não setar Content-Type manualmente
      });

      if (!r.ok) {
        let msg = 'Erro ao registrar encargo.';
        try {
          const j = await r.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }

      await r.json();
      alert('Encargo registrado com sucesso!');
      form.reset();
      carregarEncargos();
    } catch (err) {
      alert(err.message || 'Erro ao registrar encargo.');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  // Init
  atualizarBtn?.addEventListener('click', carregarEncargos);
  carregarObras();
  carregarEncargos();
});
