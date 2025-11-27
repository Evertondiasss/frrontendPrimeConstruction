// ===== Config =====
const API_BASE           = 'https://backendprimeconstruction-production.up.railway.app';
const API_FUNCIONARIOS   = `${API_BASE}/api/funcionarios`;
const API_PAGAMENTOS     = `${API_BASE}/api/pagamentos-funcionarios`;
const API_OBRAS          = `${API_BASE}/api/obras`;

const MAX_FILE_BYTES  = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES   = ['application/pdf', 'image/png', 'image/jpeg'];

// ===== Helpers =====
const moedaBR = (n) => Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

function formatarCPF(cpf) {
  const n = (cpf || '').replace(/\D/g, '');
  return n.length === 11 ? n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf || '';
}
function formatarDataBR(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}
function formatarBRL(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function validarArquivo(file) {
  if (!file) return { ok: true };
  if (!ALLOWED_MIMES.includes(file.type)) return { ok: false, msg: 'Tipo de arquivo inválido (PDF/PNG/JPG).' };
  if (file.size > MAX_FILE_BYTES) return { ok: false, msg: 'Arquivo acima de 10MB.' };
  return { ok: true };
}

// ===== Modal (cria sob demanda) =====
function ensureModal() {
  let modal = document.getElementById('pgtoModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'pgtoModal';
  modal.innerHTML = `
    <div id="pgtoBackdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.35);backdrop-filter:saturate(120%) blur(1px);"></div>
    <div id="pgtoDialog" role="dialog" aria-modal="true" style="position:fixed;inset:0;display:grid;place-items:center;padding:1rem;">
      <div style="width:min(920px,95vw);max-height:85vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.25);">
        <div style="display:flex;align-items:center;gap:.75rem;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid #eee">
          <h3 id="pgtoTitle" style="margin:0;font-size:1.1rem;">Detalhes do pagamento</h3>
          <button id="pgtoClose" aria-label="Fechar" style="border:0;background:#f4f4f4;padding:.45rem .7rem;border-radius:8px;cursor:pointer">✕</button>
        </div>
        <div id="pgtoBody" style="padding:1rem 1.25rem"></div>
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
  if (!Array.isArray(extras) || extras.length === 0) {
    return `<div class="hint" style="color:#555;background:#fafafa;border:1px solid #eee;border-radius:10px;padding:.75rem;">Nenhuma hora extra lançada.</div>`;
  }
  const rows = extras.map((x, i) => {
    const obra = x.obra_nome || x.obra || `Obra #${x.obra_id || ''}`.trim();
    const horas = Number(x.horas_qtd || x.horas || 0);
    const vh    = Number(x.valor_hora || x.valor || 0);
    const tot   = horas * vh;
    return `
      <tr>
        <td style="padding:.5rem .6rem;border-bottom:1px solid #f0f0f0">${i+1}</td>
        <td style="padding:.5rem .6rem;border-bottom:1px solid #f0f0f0">${obra || '—'}</td>
        <td style="padding:.5rem .6rem;border-bottom:1px solid #f0f0f0;text-align:right">${horas.toFixed(2)} h</td>
        <td style="padding:.5rem .6rem;border-bottom:1px solid #f0f0f0;text-align:right">${formatarBRL(vh)}</td>
        <td style="padding:.5rem .6rem;border-bottom:1px solid #f0f0f0;text-align:right"><b>${formatarBRL(tot)}</b></td>
      </tr>
    `;
  }).join('');

  const totalHoras = extras.reduce((s, x) => s + Number(x.horas_qtd || x.horas || 0), 0);
  const totalValor = extras.reduce((s, x) => s + Number(x.horas_qtd || x.horas || 0) * Number(x.valor_hora || x.valor || 0), 0);

  return `
    <div style="margin-top:1rem">
      <table style="width:100%;border-collapse:collapse;font-size:.95rem">
        <thead>
          <tr style="background:#fafafa">
            <th style="padding:.55rem .6rem;text-align:left;border-bottom:1px solid #eee">#</th>
            <th style="padding:.55rem .6rem;text-align:left;border-bottom:1px solid #eee">Obra</th>
            <th style="padding:.55rem .6rem;text-align:right;border-bottom:1px solid #eee">Horas</th>
            <th style="padding:.55rem .6rem;text-align:right;border-bottom:1px solid #eee">R$/h</th>
            <th style="padding:.55rem .6rem;text-align:right;border-bottom:1px solid #eee">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:.6rem;text-align:right"><b>Totais:</b></td>
            <td style="padding:.6rem;text-align:right"><b>${totalHoras.toFixed(2)} h</b></td>
            <td></td>
            <td style="padding:.6rem;text-align:right"><b>${formatarBRL(totalValor)}</b></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

async function abrirModalPagamento(id) {
  const modal = ensureModal();
  const body  = modal.querySelector('#pgtoBody');
  const title = modal.querySelector('#pgtoTitle');

  body.innerHTML = '<div style="padding:.5rem 0">Carregando...</div>';
  title.textContent = `Detalhes do pagamento #${id}`;

  try {
    const r = await fetch(`${API_PAGAMENTOS}/${id}`);
    if (!r.ok) throw new Error('Falha ao obter detalhes.');
    const p = await r.json();

    const nome  = p.nome_funcionario ?? p.nome ?? '—';
    const cpf   = p.cpf_funcionario ? formatarCPF(p.cpf_funcionario) : (p.cpf ? formatarCPF(p.cpf) : '—');
    const cargo = p.cargo_funcionario ?? p.cargo ?? '—';
    const comp  = p.competencia || '—';
    const data  = p.data_pagamento || '—';

    const val   = formatarBRL(p.valor_pago);
    const link  = p.comprovante_url ? `<a class="link" href="${p.comprovante_url}" target="_blank" rel="noopener"><i class="fa-solid fa-cloud-arrow-down"></i> Abrir comprovante</a>` : '—';

    // Tenta achar extras
    let extras = [];
    if (Array.isArray(p.extras)) extras = p.extras;
    else if (typeof p.extras_json === 'string') {
      try { extras = JSON.parse(p.extras_json || '[]'); } catch { extras = []; }
    }

    body.innerHTML = `
      <div style="display:grid;gap:.35rem;font-size:.98rem">
        <div><b>Funcionário:</b> ${nome}</div>
        <div><b>CPF:</b> ${cpf} &nbsp; • &nbsp; <b>Cargo:</b> ${cargo}</div>
        <div><b>Competência:</b> ${comp} &nbsp; • &nbsp; <b>Pago em:</b> ${data}</div>
        <div><b>Valor pago:</b> ${val}</div>
        <div><b>Comprovante:</b> ${link}</div>
        <hr style="margin:.5rem 0 0.25rem 0;border:none;border-top:1px solid #eee" />
        <h4 style="margin:.25rem 0 .25rem 0;font-size:1rem">Horas extras</h4>
        ${renderExtrasTable(extras)}
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div style="color:#b00020">Não foi possível carregar os detalhes. ${err.message || ''}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // ---- DOM
  const form          = document.getElementById('pagamentoForm');
  const lista         = document.getElementById('listaPagamentos');
  const nomeSelect    = document.getElementById('nomeSelect');
  const cpfInput      = document.getElementById('cpfFuncionario');
  const cargoInput    = document.getElementById('cargoFuncionario');
  const compInp       = document.getElementById('competencia');     // yyyy-mm-dd
  const dataInp       = document.getElementById('dataPagamento');   // yyyy-mm-dd
  const valorInp      = document.getElementById('valorPagamento');
  const fileInp       = document.getElementById('comprovantePagamento');
  const atualizarBtn  = document.getElementById('atualizarLinks');

  const extrasContainer  = document.getElementById('extrasContainer');
  const btnAddExtra      = document.getElementById('btnAddExtra');
  const extrasHorasTotal = document.getElementById('extrasHorasTotal');
  const extrasValorTotal = document.getElementById('extrasValorTotal');

  // ---- Estado
  let obrasCache = [];

  // ---- Carregar funcionários
  function carregarFuncionarios() {
    nomeSelect.innerHTML = '<option value="">Carregando...</option>';
    fetch(API_FUNCIONARIOS)
      .then(r => r.json())
      .then(data => {
        nomeSelect.innerHTML = '<option value="">Selecione um funcionário</option>';
        (data || []).forEach(f => {
          const opt = document.createElement('option');
          opt.value = f.id;
          opt.textContent = f.nome;
          opt.dataset.cpf = f.cpf || '';
          opt.dataset.cargo = f.cargo || '';
          nomeSelect.appendChild(opt);
        });
      })
      .catch(() => {
        nomeSelect.innerHTML = '<option value="">Erro ao carregar funcionários</option>';
      });
  }

  // ---- Carregar obras (para as linhas de HE)
  async function carregarObras() {
    try {
      const r = await fetch(API_OBRAS);
      const data = await r.json();
      obrasCache = Array.isArray(data) ? data : [];
    } catch {
      obrasCache = [];
    }
  }

  // ---- Linhas de Horas Extras
  function novaLinhaExtra(values = {}) {
    const idx = crypto.randomUUID();
    const opts = ['<option value="">Selecione a obra</option>']
      .concat(obrasCache.map(o => `<option value="${o.id}">${o.nome}</option>`))
      .join('');

    const div = document.createElement('div');
    div.className = 'extra-row';
    div.dataset.row = idx;
    div.style.cssText = 'display:grid; grid-template-columns: 1.5fr .7fr .7fr .8fr auto; gap:.5rem; align-items:center;';

    div.innerHTML = `
      <select class="extra-obra form-control" required>${opts}</select>
      <input type="number" class="extra-horas form-control" step="0.01" min="0" placeholder="Horas" required />
      <input type="number" class="extra-valor form-control" step="0.01" min="0" placeholder="R$/h" required />
      <input type="text"   class="extra-total form-control" placeholder="Total" readonly />
      <button type="button" class="btn-remove-extra" style="padding:.35rem .6rem;">Remover</button>
    `;

    if (values.obra_id)     div.querySelector('.extra-obra').value  = String(values.obra_id);
    if (values.horas_qtd)   div.querySelector('.extra-horas').value = Number(values.horas_qtd).toFixed(2);
    if (values.valor_hora)  div.querySelector('.extra-valor').value = Number(values.valor_hora).toFixed(2);

    const recalc = () => {
      const h = Number(div.querySelector('.extra-horas').value || 0);
      const v = Number(div.querySelector('.extra-valor').value || 0);
      const t = h * v;
      div.querySelector('.extra-total').value = moedaBR(t);
      recomputarTotaisExtras();
    };

    div.querySelector('.extra-horas').addEventListener('input', recalc);
    div.querySelector('.extra-valor').addEventListener('input', recalc);
    div.querySelector('.btn-remove-extra').addEventListener('click', () => {
      div.remove();
      recomputarTotaisExtras();
    });

    extrasContainer.appendChild(div);
    recalc();
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
    extrasValorTotal.textContent = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  btnAddExtra?.addEventListener('click', () => novaLinhaExtra());

  // ---- Cabeçalho (sem apontamentos)
  nomeSelect.addEventListener('change', () => {
    const sel = nomeSelect.options[nomeSelect.selectedIndex];
    cpfInput.value   = sel?.dataset?.cpf ? formatarCPF(sel.dataset.cpf) : '';
    cargoInput.value = sel?.dataset?.cargo || '';
  });

  // ---- Lista de pagamentos
  function carregarPagamentos() {
    lista.classList.add('history');
    lista.innerHTML = '<li>Carregando...</li>';
    fetch(API_PAGAMENTOS)
      .then(r => r.json())
      .then(data => {
        lista.innerHTML = '';
        if (!Array.isArray(data) || data.length === 0) {
          lista.innerHTML = '<li>Nenhum pagamento registrado.</li>';
          return;
        }
        data.forEach(p => {
          const li = document.createElement('li');
          li.className = 'history-card';
          li.dataset.id = p.id;               // <-- necessário para abrir o modal
          li.style.cursor = 'pointer';        // feedback de clicável

          const nome  = p.nome_funcionario ?? p.nome ?? '—';
          const cpf   = p.cpf_funcionario ? formatarCPF(p.cpf_funcionario) : (p.cpf ? formatarCPF(p.cpf) : '—');
          const cargo = p.cargo_funcionario ?? p.cargo ?? '—';
          const comp  = p.competencia || '—';
          const data  = p.data_pagamento || '—';
          const val   = formatarBRL(p.valor_pago);
          const link  = p.comprovante_url ? `<a class="link" href="${p.comprovante_url}" target="_blank" rel="noopener"><i class="fa-solid fa-cloud-arrow-down"></i> Comprovante</a>` : '';

          li.innerHTML = `
            <div class="history-head">
              <span class="history-id">#${p.id}</span>
              <span class="chip"><i class="fa-solid fa-sack-dollar"></i> ${val}</span>
            </div>
            <div class="history-title">${nome}</div>
            <div class="history-sub">CPF: ${cpf} • Cargo: ${cargo}</div>
            <div class="history-meta">Competência: ${comp} • Pago em: ${data}</div>
            <div class="history-actions">${link}</div>
          `;
          lista.appendChild(li);
        });
      })
      .catch(() => {
        lista.innerHTML = '<li>Erro ao carregar pagamentos.</li>';
      });
  }

  // Delegação de clique para abrir modal
  lista.addEventListener('click', (e) => {
    if (e.target.closest('a')) return; // deixa o link funcionar sem abrir modal
    const card = e.target.closest('.history-card');
    if (!card) return;
    abrirModalPagamento(card.dataset.id);
  });


  // ---- Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const funcionario_id = nomeSelect.value;
    const competencia    = compInp.value;    // YYYY-MM-DD
    const data_pagamento = dataInp.value;    // YYYY-MM-DD
    const valor_pago     = valorInp.value;
    const file           = fileInp.files?.[0];

    if (!funcionario_id || !competencia || !data_pagamento || !valor_pago) {
      alert('Preencha todos os campos obrigatórios!');
      return;
    }
    if (Number(valor_pago) <= 0) {
      alert('Informe um valor válido.');
      return;
    }
    const vfile = validarArquivo(file);
    if (!vfile.ok) {
      alert(vfile.msg);
      return;
    }

    const apontamento_ids = []; // sem módulo de apontamentos

    // linhas de HE
    const extras = [...extrasContainer.querySelectorAll('.extra-row')].map(row => {
      const obra_id = row.querySelector('.extra-obra').value;
      const horas   = row.querySelector('.extra-horas').value;
      const valor   = row.querySelector('.extra-valor').value;
      return {
        obra_id: Number(obra_id || 0),
        horas_qtd: Number(horas || 0),
        valor_hora: Number(valor || 0),
      };
    }).filter(x => x.obra_id > 0 && x.horas_qtd > 0 && x.valor_hora >= 0);

    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
      const fd = new FormData();
      fd.append('funcionario_id', funcionario_id);
      fd.append('competencia', competencia);
      fd.append('data_pagamento', data_pagamento);
      fd.append('valor_pago', valor_pago);
      fd.append('apontamento_ids', JSON.stringify(apontamento_ids));
      fd.append('extras', JSON.stringify(extras));
      if (file) fd.append('comprovante', file, file.name);

      const r = await fetch(API_PAGAMENTOS, { method: 'POST', body: fd });
      if (!r.ok) {
        let msg = 'Erro ao registrar pagamento.';
        try { const j = await r.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      await r.json();
      alert('Pagamento registrado com sucesso!');
      form.reset();
      cpfInput.value = '';
      cargoInput.value = '';
      extrasContainer.innerHTML = '';
      extrasHorasTotal.textContent = '0.00';
      extrasValorTotal.textContent = '0,00';
      carregarPagamentos();
    } catch (err) {
      alert(err.message || 'Erro ao registrar pagamento.');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  // ---- Init
  atualizarBtn?.addEventListener('click', carregarPagamentos);
  carregarFuncionarios();
  carregarObras();        // popular obras nas linhas de HE
  carregarPagamentos();
});
