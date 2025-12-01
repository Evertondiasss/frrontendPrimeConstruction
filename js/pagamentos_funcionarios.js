// ===== Config =====
const API_BASE           = 'https://backendprimeconstruction-production.up.railway.app';
const API_FUNCIONARIOS   = `${API_BASE}/api/funcionarios`;
const API_PAGAMENTOS     = `${API_BASE}/api/pagamentos-funcionarios`;
const API_OBRAS          = `${API_BASE}/api/obras`;

const MAX_FILE_BYTES  = 10 * 1024 * 1024;
const ALLOWED_MIMES   = ['application/pdf', 'image/png', 'image/jpeg'];

// ===== Helpers =====
function formatarCPF(cpf) {
  const n = (cpf || '').replace(/\D/g, '');
  return n.length === 11 ? n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf || '';
}
const moedaBR = (n) => Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function formatarBRL(v) { return moedaBR(v); }

function validarArquivo(file) {
  if (!file) return { ok: true };
  if (!ALLOWED_MIMES.includes(file.type)) return { ok: false, msg: 'Tipo de arquivo inválido.' };
  if (file.size > MAX_FILE_BYTES) return { ok: false, msg: 'Arquivo acima de 10MB.' };
  return { ok: true };
}

// ===== AUTH FETCH =====
async function authFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    ...getAuthHeaders(),
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    alert("Sessão expirada. Faça login novamente.");
    logout();
    return;
  }

  return res;
}

// ===== Modal =====
function ensureModal() {
  let modal = document.getElementById('pgtoModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'pgtoModal';
  modal.innerHTML = `
    <div id="pgtoBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.35)"></div>
    <div id="pgtoDialog" style="position:fixed;inset:0;display:grid;place-items:center;padding:1rem;">
      <div style="background:#fff;border-radius:14px;max-height:85vh;overflow:auto;width:min(920px,95vw);">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:1rem;border-bottom:1px solid #eee">
          <h3 id="pgtoTitle">Detalhes do pagamento</h3>
          <button id="pgtoClose" style="background:#eee;border:0;padding:.45rem .7rem;border-radius:8px;cursor:pointer">✕</button>
        </div>
        <div id="pgtoBody" style="padding:1rem"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#pgtoClose').addEventListener('click', close);
  modal.querySelector('#pgtoBackdrop').addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('pgtoModal')) close();
  });

  return modal;
}

function renderExtrasTable(extras = []) {
  if (!extras.length) {
    return `<div style="padding:.75rem;border:1px solid #eee;border-radius:8px;background:#fafafa;">Nenhuma hora extra.</div>`;
  }

  const rows = extras.map((x, i) => {
    const obra = x.obra_nome || x.obra || `Obra #${x.obra_id}`;
    const horas = Number(x.horas_qtd || 0);
    const vh = Number(x.valor_hora || 0);
    const total = horas * vh;

    return `
      <tr>
        <td>${i+1}</td>
        <td>${obra}</td>
        <td style="text-align:right">${horas.toFixed(2)} h</td>
        <td style="text-align:right">${formatarBRL(vh)}</td>
        <td style="text-align:right"><b>${formatarBRL(total)}</b></td>
      </tr>`;
  }).join('');

  const totalHoras = extras.reduce((s, x) => s + Number(x.horas_qtd || 0), 0);
  const totalValor = extras.reduce((s, x) => s + (Number(x.horas_qtd||0) * Number(x.valor_hora||0)), 0);

  return `
    <table style="width:100%;border-collapse:collapse;margin-top:1rem">
      <thead>
        <tr style="background:#fafafa">
          <th>#</th><th>Obra</th><th>Horas</th><th>R$/h</th><th>Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="text-align:right"><b>Totais:</b></td>
          <td style="text-align:right"><b>${totalHoras.toFixed(2)} h</b></td>
          <td></td>
          <td style="text-align:right"><b>${formatarBRL(totalValor)}</b></td>
        </tr>
      </tfoot>
    </table>
  `;
}

async function abrirModalPagamento(id) {
  const modal = ensureModal();
  const body = modal.querySelector('#pgtoBody');
  const title = modal.querySelector('#pgtoTitle');

  body.innerHTML = 'Carregando...';
  title.textContent = `Pagamento #${id}`;

  try {
    const r = await authFetch(`${API_PAGAMENTOS}/${id}`);
    if (!r) return;
    const p = await r.json();

    const nome = p.nome_funcionario ?? p.nome ?? '—';
    const cpf  = p.cpf_funcionario ? formatarCPF(p.cpf_funcionario) : '—';
    const cargo = p.cargo_funcionario ?? p.cargo ?? '—';

    const val = formatarBRL(p.valor_pago);
    const comp = p.competencia || '—';
    const data = p.data_pagamento || '—';

    let extras = [];
    if (Array.isArray(p.extras)) extras = p.extras;
    else if (typeof p.extras_json === 'string') {
      try { extras = JSON.parse(p.extras_json); } catch {}
    }

    body.innerHTML = `
      <div><b>Funcionário:</b> ${nome}</div>
      <div><b>CPF:</b> ${cpf} • <b>Cargo:</b> ${cargo}</div>
      <div><b>Competência:</b> ${comp}</div>
      <div><b>Pago em:</b> ${data}</div>
      <div><b>Valor:</b> ${val}</div>
      <hr>
      <h4>Horas extras</h4>
      ${renderExtrasTable(extras)}
    `;
  } catch {
    body.innerHTML = `<div style="color:red">Erro ao carregar detalhes.</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('pagamentoForm');
  const lista = document.getElementById('listaPagamentos');
  const nomeSelect = document.getElementById('nomeSelect');
  const cpfInput = document.getElementById('cpfFuncionario');
  const cargoInput = document.getElementById('cargoFuncionario');
  const compInp = document.getElementById('competencia');
  const dataInp = document.getElementById('dataPagamento');
  const valorInp = document.getElementById('valorPagamento');
  const fileInp = document.getElementById('comprovantePagamento');

  const extrasContainer = document.getElementById('extrasContainer');
  const extrasHorasTotal = document.getElementById('extrasHorasTotal');
  const extrasValorTotal = document.getElementById('extrasValorTotal');

  // ===== Carregar Funcionários
  function carregarFuncionarios() {
    nomeSelect.innerHTML = '<option>Carregando...</option>';

    authFetch(API_FUNCIONARIOS)
      .then(r => r?.json())
      .then(data => {
        nomeSelect.innerHTML = '<option value="">Selecione</option>';
        (data || []).forEach(f => {
          const opt = document.createElement('option');
          opt.value = f.id;
          opt.textContent = f.nome;
          opt.dataset.cpf = f.cpf || '';
          opt.dataset.cargo = f.cargo || '';
          nomeSelect.appendChild(opt);
        });
      })
      .catch(() => nomeSelect.innerHTML = '<option>Erro</option>');
  }

  // ===== Carregar Obras
  let obrasCache = [];
  async function carregarObras() {
    const r = await authFetch(API_OBRAS);
    if (!r) return;
    const data = await r.json();
    obrasCache = Array.isArray(data) ? data : [];
  }

  // ===== HE - nova linha
  function novaLinhaExtra(values = {}) {
    const div = document.createElement('div');
    div.className = 'extra-row';
    div.style.cssText = 'display:grid;grid-template-columns:1.5fr .7fr .7fr .8fr auto;gap:.5rem;';

    const opts = ['<option value="">Selecione a obra</option>']
      .concat(obrasCache.map(o => `<option value="${o.id}">${o.nome}</option>`));

    div.innerHTML = `
      <select class="extra-obra form-control">${opts}</select>
      <input type="number" class="extra-horas form-control" step="0.01" min="0" placeholder="Horas">
      <input type="number" class="extra-valor form-control" step="0.01" min="0" placeholder="R$/h">
      <input type="text" class="extra-total form-control" readonly>
      <button type="button" class="btn-remove-extra">Remover</button>
    `;

    div.querySelector('.btn-remove-extra').onclick = () => {
      div.remove();
      recomputarTotaisExtras();
    };

    extrasContainer.appendChild(div);
  }

  function recomputarTotaisExtras() {
    let horas = 0, valor = 0;
    [...extrasContainer.querySelectorAll('.extra-row')].forEach(row => {
      const h = Number(row.querySelector('.extra-horas').value || 0);
      const v = Number(row.querySelector('.extra-valor').value || 0);
      horas += h;
      valor += h * v;
    });

    extrasHorasTotal.textContent = horas.toFixed(2);
    extrasValorTotal.textContent = valor.toLocaleString('pt-BR',{minimumFractionDigits:2});
  }

  document.getElementById('btnAddExtra')?.addEventListener('click', () => novaLinhaExtra());

  // ===== Cabeçalho
  nomeSelect.addEventListener('change', () => {
    const o = nomeSelect.selectedOptions[0];
    cpfInput.value = o?.dataset?.cpf ? formatarCPF(o.dataset.cpf) : '';
    cargoInput.value = o?.dataset?.cargo || '';
  });

  // ===== Lista
  function carregarPagamentos() {
    lista.innerHTML = '<li>Carregando...</li>';

    authFetch(API_PAGAMENTOS)
      .then(r => r?.json())
      .then(data => {
        lista.innerHTML = '';

        (data || []).forEach(p => {
          const li = document.createElement('li');
          li.className = 'history-card';
          li.dataset.id = p.id;

          const nome = p.nome_funcionario ?? p.nome ?? '—';
          const cpf  = p.cpf_funcionario ? formatarCPF(p.cpf_funcionario) : '—';
          const cargo = p.cargo_funcionario ?? p.cargo ?? '—';
          const comp = p.competencia || '—';
          const dataPg = p.data_pagamento || '—';
          const val = formatarBRL(p.valor_pago);

          li.innerHTML = `
            <div class="history-head">
              <span>#${p.id}</span>
              <span class="chip">${val}</span>
            </div>
            <div class="history-title">${nome}</div>
            <div class="history-sub">CPF: ${cpf} • Cargo: ${cargo}</div>
            <div class="history-meta">Competência: ${comp} • Pago: ${dataPg}</div>
          `;

          li.onclick = () => abrirModalPagamento(p.id);
          lista.appendChild(li);
        });
      })
      .catch(() => lista.innerHTML = '<li>Erro</li>');
  }

  // ===== Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const funcionario_id = nomeSelect.value;
    const competencia = compInp.value;
    const data_pagamento = dataInp.value;
    const valor_pago = valorInp.value;
    const file = fileInp.files?.[0];

    if (!funcionario_id || !competencia || !data_pagamento || !valor_pago)
      return alert('Preencha tudo');

    const fd = new FormData();
    fd.append('funcionario_id', funcionario_id);
    fd.append('competencia', competencia);
    fd.append('data_pagamento', data_pagamento);
    fd.append('valor_pago', valor_pago);
    fd.append('extras', JSON.stringify([]));
    if (file) fd.append('comprovante', file, file.name);

    const btn = form.querySelector('button');
    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
      const r = await authFetch(API_PAGAMENTOS, { method: 'POST', body: fd });
      if (!r) return;
      const payload = await r.json();

      if (!r.ok) throw new Error(payload?.error || 'Erro');

      alert('Pagamento registrado');
      form.reset();
      carregarPagamentos();

    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  // ===== Init =====
  carregarFuncionarios();
  carregarObras();
  carregarPagamentos();
});
