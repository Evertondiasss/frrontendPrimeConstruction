const API_BASE = 'https://backendprimeconstruction-production.up.railway.app/api/categorias';

document.addEventListener('DOMContentLoaded', () => {
  const form  = document.getElementById('categoriaForm');
  const lista = document.getElementById('listaCategorias');

  // skeleton
  function showSkeleton(){
    lista.innerHTML = `
      <div class="skel card"></div>
      <div class="skel card"></div>
      <div class="skel card"></div>
    `;
  }

  // card
  function renderCard(c){
    const card = document.createElement('div');
    card.className = 'data-card';
    card.innerHTML = `
      <div class="avatar">
        <i class="fa-solid fa-layer-group"></i>
      </div>
      <div>
        <div class="title">${c.nome}</div>
        <div class="subtitle">ID: #${c.id}</div>
        <div class="meta">
          <span class="badge"><i class="fa-solid fa-folder-tree"></i> Categoria</span>
          <!-- espaço para métricas futuras, ex.: qtd. de produtos -->
        </div>
      </div>
      <div class="actions">
        <!-- Botões futuros (editar/excluir) -->
        <!-- <button class="icon-btn" title="Editar"><i class="fa-solid fa-pen"></i></button> -->
      </div>
    `;
    return card;
  }

  function carregar(){
    showSkeleton();
    fetch(API_BASE)
      .then(r => r.json())
      .then(data => {
        lista.innerHTML = '';
        if (!Array.isArray(data) || data.length === 0){
          lista.innerHTML = '<div class="state">Nenhuma categoria cadastrada.</div>';
          return;
        }
        data.forEach(c => lista.appendChild(renderCard(c)));
      })
      .catch(() => {
        lista.innerHTML = '<div class="state">Erro ao carregar categorias.</div>';
      });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('nomeCategoria').value.trim();
    if (!nome) return alert('Por favor, preencha o nome da categoria.');

    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    })
      .then(async r => {
        const body = await r.json().catch(()=>({}));
        if (!r.ok) throw new Error(body?.error || 'Erro ao cadastrar categoria.');
        return body;
      })
      .then(() => {
        alert('Categoria cadastrada com sucesso!');
        form.reset();
        carregar();
      })
      .catch(err => alert(err.message || 'Erro ao cadastrar categoria (nome pode já existir).'))
      .finally(() => { btn.disabled = false; btn.textContent = original; });
  });

  carregar();
});
