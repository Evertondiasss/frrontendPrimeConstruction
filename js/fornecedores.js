// fornecedores.js
const API_BASE = 'https://backendprimeconstruction-production.up.railway.app/api/fornecedores';

// --- Função padrão para lidar com 401 ---
function handleAuthError(res) {
  if (res.status === 401) {
    alert("Sessão expirada. Faça login novamente.");
    logout();
    throw new Error("Sessão expirada");
  }
}

// --- Wrapper de fetch com token ---
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

document.addEventListener('DOMContentLoaded', () => {
  const form  = document.getElementById('fornecedorForm');
  const lista = document.getElementById('listaFornecedores');

  // === Helpers de formatação ===
  const soNumeros = (str) => (str || '').replace(/\D/g, '');

  const formataCNPJ = (v) =>
    v.replace(/\D/g, '')
     .replace(/^(\d{2})(\d)/, '$1.$2')
     .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
     .replace(/\.(\d{3})(\d)/, '.$1/$2')
     .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
     .slice(0, 18);

  const formataTelefone = (v) =>
    v.replace(/\D/g, '')
     .replace(/^(\d{2})(\d)/, '($1) $2')
     .replace(/(\d{5})(\d)/, '$1-$2')
     .slice(0, 15);

  // === Máscaras nos inputs ===
  const cnpjInput = document.getElementById('cnpjFornecedor');
  const telInput  = document.getElementById('telefoneFornecedor');
  cnpjInput.addEventListener('input', e => e.target.value = formataCNPJ(e.target.value));
  telInput.addEventListener('input',  e => e.target.value  = formataTelefone(e.target.value));

  // === Função de carregamento dos fornecedores ===
  function carregar() {
    lista.innerHTML = `
      <div class="skel card"></div>
      <div class="skel card"></div>
      <div class="skel card"></div>
    `;

    authFetch(API_BASE)
      .then(r => r.json())
      .then(data => {
        lista.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
          lista.innerHTML = '<div class="state">Nenhum fornecedor cadastrado.</div>';
          return;
        }

        const maskCNPJ = v => (v ? formataCNPJ(v) : null);
        const maskTel  = v => {
          if (!v) return null;
          const n = v.replace(/\D/g, '');
          if (n.length === 11) return n.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
          if (n.length === 10) return n.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
          return v;
        };

        data.forEach(f => {
          const card = document.createElement('div');
          card.className = 'data-card';

          const cnpjFmt = maskCNPJ(f.cnpj || '');
          const telFmt  = maskTel(f.telefone || '');
          const temCNPJ = !!cnpjFmt;
          const temTel  = !!telFmt;
          const temEnd  = !!(f.endereco && f.endereco.trim());

          const chips = [];
          if (temCNPJ) chips.push(`<span class="badge"><i class="fa-solid fa-id-card"></i><span class="truncate">${cnpjFmt}</span></span>`);
          if (temTel)  chips.push(`<span class="badge"><i class="fa-solid fa-phone"></i><span class="truncate">${telFmt}</span></span>`);
          if (temEnd)  chips.push(`<span class="badge"><i class="fa-solid fa-location-dot"></i><span class="truncate">${f.endereco}</span></span>`);

          card.innerHTML = `
            <div class="avatar"><i class="fa-solid fa-building"></i></div>
            <div class="title">#${f.id} — ${f.nome}</div>
            <div class="meta">
              ${chips.length ? chips.join('') : '<span class="badge"><i class="fa-solid fa-circle-info"></i><span>Sem detalhes</span></span>'}
            </div>
          `;
          lista.appendChild(card);
        });
      })
      .catch(() => {
        lista.innerHTML = '<div class="state">Erro ao carregar fornecedores.</div>';
      });
  }

  // === Envio do formulário ===
  form.addEventListener('submit', e => {
    e.preventDefault();

    const nome     = document.getElementById('nomeFornecedor').value.trim();
    const cnpjTxt  = document.getElementById('cnpjFornecedor').value.trim();
    const endereco = document.getElementById('enderecoFornecedor').value.trim();
    const telTxt   = document.getElementById('telefoneFornecedor').value.trim();

    if (!nome) {
      alert('Informe pelo menos o nome do fornecedor.');
      return;
    }

    const cnpj     = cnpjTxt ? soNumeros(cnpjTxt) : null;
    const telefone = telTxt  ? soNumeros(telTxt)  : null;

    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    authFetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        cnpj,
        endereco: endereco || null,
        telefone
      })
    })
      .then(async r => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.error || 'Falha ao salvar.');
        return body;
      })
      .then((body) => {
        alert('Fornecedor cadastrado com sucesso!');

        // dispara evento global com dados do fornecedor criado
        window.dispatchEvent(new CustomEvent('fornecedor:criado', {
          detail: {
            id: body.id,
            nome
          }
        }));

  form.reset();
  carregar();
})

      .catch(err => {
        alert(err.message || 'Erro ao cadastrar fornecedor.');
      })
      .finally(() => {
        btn.disabled = false;
        btn.textContent = original;
      });
  });

  // === Inicialização ===
  carregar();
});
