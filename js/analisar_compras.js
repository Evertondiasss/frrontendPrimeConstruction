/* compras.js — com authFetch igual aos outros módulos */

const API_BASE      = 'https://backendprimeconstruction-production.up.railway.app';
const API_COMPRAS   = `${API_BASE}/api/compras`;
const API_PARCELAS  = `${API_BASE}/api/parcelas`;
const API_PAGAR     = id => `${API_BASE}/api/parcelas/${id}/pagar`;

/* ===========================================================
   AUTH FETCH – usa token + trata 401
=========================================================== */
async function authFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    ...getAuthHeaders(), // vem do auth.js
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    alert("Sessão expirada. Faça login novamente.");
    logout(); // vem do auth.js
    return;
  }

  return res;
}

/* ===========================================================
   HELPERS
=========================================================== */
const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(Number(v || 0));

async function fetchJsonAuth(url) {
  const r = await authFetch(url);
  if (!r || !r.ok) throw new Error(`Erro HTTP ${r?.status}`);
  return r.json();
}

/* ===========================================================
   DOM
=========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const container         = document.getElementById('compras-container');
  const totalComprasEl    = document.getElementById('totalCompras');
  const totalPagasEl      = document.getElementById('totalPagas');
  const totalPendentesEl  = document.getElementById('totalPendentes');

  /* ===========================================================
     CARREGAR COMPRAS + PARCELAS
  =========================================================== */
  async function carregar() {
    container.innerHTML = '<p class="loading">Carregando compras...</p>';

    try {
      const [compras, parcelas] = await Promise.all([
        fetchJsonAuth(API_COMPRAS),
        fetchJsonAuth(API_PARCELAS),
      ]);

      /* Estatísticas */
      const totalCompras = compras.reduce(
        (acc, c) => acc + Number((c.total_liquido ?? c.valor_total) || 0),
        0
      );
      const pagas     = parcelas.filter(p => p.status_pagamento === 'pago').length;
      const pendentes = parcelas.filter(p => p.status_pagamento === 'pendente').length;

      totalComprasEl.textContent   = brl(totalCompras);
      totalPagasEl.textContent     = pagas;
      totalPendentesEl.textContent = pendentes;

      /* Renderização */
      container.innerHTML = '';
      if (!compras.length) {
        container.innerHTML = '<p class="loading">Nenhuma compra encontrada.</p>';
        return;
      }

      compras.forEach(c => {
        const tipo = (Number(c.parcelas) > 1) ? 'parcelada' : 'avista';
        const valor = (c.total_liquido ?? c.valor_total ?? 0);

        const itensLabel =
          (c.qtd_itens != null)
            ? `${c.qtd_itens} item${c.qtd_itens === 1 ? '' : 's'}`
            : '';

        const card = document.createElement('div');
        card.className = `compra-card ${tipo}`;
        card.innerHTML = `
          <div class="compra-header">
            <h3><i class="fas fa-file-invoice"></i> #${c.id} - ${c.fornecedor_nome ?? ''}</h3>
            <span>${c.data_compra ?? ''}</span>
          </div>
          <div class="compra-body">
            <b>Obra:</b> ${c.obra_nome ?? ''}<br>
            ${itensLabel ? `<b>Itens:</b> ${itensLabel}<br>` : ''}
            <b>Valor Total:</b> ${brl(valor)}<br>
            <b>Forma:</b> ${(c.forma_pagamento || '').toUpperCase()} (${tipo === 'parcelada' ? (c.parcelas + 'x') : 'À vista'})
            ${c.comprovante_url
              ? `<br><b>Comprovante:</b> <a href="${c.comprovante_url}" target="_blank" rel="noopener">Abrir</a>`
              : ''
            }
          </div>
        `;

        /* Parcelas desta compra */
        const parcelasCompra = parcelas.filter(p => p.compra_id === c.id);
        if (parcelasCompra.length) {
          const list = document.createElement('div');
          list.className = 'parcelas';
          list.innerHTML = `<b>Parcelas:</b>`;

          parcelasCompra.forEach(p => {
            const item = document.createElement('div');
            item.className = 'parcela-item';
            if (p.status_pagamento === 'pago') item.classList.add('pago');

            item.innerHTML = `
              <span>
                <i class="fas ${p.status_pagamento === 'pago' ? 'fa-check-circle' : 'fa-clock'}"></i>
                ${p.numero_parcela}ª - ${brl(p.valor_parcela)} - Venc: ${p.data_vencimento}
              </span>
            `;

            /* Botão de pagar */
            if (p.status_pagamento === 'pendente') {
              const btn = document.createElement('button');
              btn.textContent = 'Marcar Pago';
              btn.onclick = async () => {
                if (!confirm('Confirmar pagamento desta parcela?')) return;

                const r = await authFetch(API_PAGAR(p.id), { method: 'PUT' });

                if (!r || !r.ok) {
                  alert('Erro ao marcar como paga.');
                  return;
                }

                alert('Parcela marcada como paga!');
                carregar();
              };
              item.appendChild(btn);

            } else {
              item.innerHTML += `<span><i class="fas fa-check" style="color:green"></i> Pago</span>`;
            }

            list.appendChild(item);
          });

          card.appendChild(list);
        }

        container.appendChild(card);
      });

    } catch (err) {
      console.error(err);
      container.innerHTML = '<p class="loading">Erro ao carregar dados.</p>';
      totalComprasEl.textContent = brl(0);
      totalPagasEl.textContent = '0';
      totalPendentesEl.textContent = '0';
    }
  }

  carregar();
});
