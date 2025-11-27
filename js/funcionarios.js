const API_BASE_FUNC = 'https://backendprimeconstruction-production.up.railway.app/api/funcionarios';
const API_BASE_OBRAS = 'https://backendprimeconstruction-production.up.railway.app/api/obras';

document.addEventListener('DOMContentLoaded', () => {
  const form  = document.getElementById('funcionarioForm');
  const lista = document.getElementById('listaFuncionarios');
  const obraSelect = document.getElementById('obraFuncionario');

  // ===== Helpers =====
  const soNumeros = (s='') => s.replace(/\D/g, '');
  const maskCPF = v => v.replace(/\D/g,'')
    .replace(/^(\d{3})(\d)/,'$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3')
    .replace(/\.(\d{3})(\d)/,'.$1-$2')
    .slice(0,14);
  const maskTel = v => v.replace(/\D/g,'')
    .replace(/^(\d{2})(\d)/,'($1) $2')
    .replace(/(\d{5})(\d)/,'$1-$2')
    .slice(0,15);

  const brl   = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
  const brDate= iso => (iso && iso.includes('-')) ? iso.split('-').reverse().join('/') : (iso||'');
  const viewCPF = cpf => (cpf||'').replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,'$1.$2.$3-$4');
  const viewTel = t => {
    const n = (t||'').replace(/\D/g,'');
    if(n.length===11) return n.replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3');
    if(n.length===10) return n.replace(/^(\d{2})(\d{4})(\d{4})$/,'($1) $2-$3');
    return t||'';
  };

  // Avatar
  const getInitials = nome => nome.trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase() || 'F';
  const colorFromName = nome => {
    let h=0; for (let i=0;i<nome.length;i++) h = (h*31 + nome.charCodeAt(i)) % 360;
    return `hsl(${h} 70% 45%)`;
  };

  // Máscaras
  document.getElementById('cpfFuncionario').addEventListener('input', e => e.target.value = maskCPF(e.target.value));
  document.getElementById('telefoneFuncionario').addEventListener('input', e => e.target.value = maskTel(e.target.value));

  // ===== Carregar Obras =====
  function carregarObras(){
    fetch(API_BASE_OBRAS)
      .then(r => r.json())
      .then(obras => {
        obraSelect.innerHTML = '<option value="">Selecione uma obra</option>';
        obras.forEach(o => {
          const opt = document.createElement('option');
          opt.value = o.id;
          opt.textContent = o.nome;
          obraSelect.appendChild(opt);
        });
      })
      .catch(() => {
        obraSelect.innerHTML = '<option value="">Erro ao carregar obras</option>';
      });
  }

  // ===== Skeleton =====
  function showSkeleton(){
    lista.innerHTML = `
      <div class="skel card"></div>
      <div class="skel card"></div>
      <div class="skel card"></div>
    `;
  }

  // ===== Render Card =====
  function renderCard(f){
    const card = document.createElement('div');
    card.className = 'data-card';
    const cor = colorFromName(f.nome);
    const iniciais = getInitials(f.nome);

    card.innerHTML = `
      <div class="avatar" style="--avatar-color:${cor}">
        <span>${iniciais}</span>
      </div>
      <div>
        <div class="title">${f.nome}</div>
        <div class="subtitle">Admissão: ${brDate(f.data_admissao)} • ${f.cargo}</div>
        <div class="meta">
          <span class="badge"><i class="fa-solid fa-id-card"></i> ${viewCPF(f.cpf)}</span>
          <a class="badge badge-link" href="tel:${soNumeros(f.telefone)}" title="Ligar">
            <i class="fa-solid fa-phone"></i> ${viewTel(f.telefone)}
          </a>
          <span class="chip-salary" title="Salário">
            <i class="fa-solid fa-coins"></i> ${brl(f.salario)}
          </span>
        </div>
        ${f.obra_nome ? `<div class="meta"><i class="fa-solid fa-building"></i> ${f.obra_nome}</div>` : ''}
      </div>
    `;
    return card;
  }

  // ===== Carregar Funcionários =====
  function carregarFuncionarios(){
    showSkeleton();
    fetch(API_BASE_FUNC)
      .then(r => r.json())
      .then(data => {
        lista.innerHTML = '';
        if (!Array.isArray(data) || data.length===0){
          lista.innerHTML = '<div class="state">Nenhum funcionário cadastrado.</div>';
          return;
        }
        data.forEach(f => lista.appendChild(renderCard(f)));
      })
      .catch(() => {
        lista.innerHTML = '<div class="state">Erro ao carregar funcionários.</div>';
      });
  }

  // ===== Submit =====
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('nomeFuncionario').value.trim();
    const cpf = soNumeros(document.getElementById('cpfFuncionario').value.trim());
    const telefone = soNumeros(document.getElementById('telefoneFuncionario').value.trim());
    const data_admissao = document.getElementById('dataAdmissaoFuncionario').value;
    const cargo = document.getElementById('cargoFuncionario').value.trim();
    const salario = document.getElementById('salarioFuncionario').value.trim();
    const id_obra = obraSelect.value;

    if (!nome || !cpf || !telefone || !data_admissao || !cargo || !salario || !id_obra)
      return alert('Preencha todos os campos e selecione a obra!');

    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    fetch(API_BASE_FUNC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, cpf, telefone, data_admissao, cargo, salario, id_obra })
    })
      .then(async r => {
        const body = await r.json().catch(()=>({}));
        if (!r.ok) throw new Error(body?.error || 'Erro ao cadastrar.');
        return body;
      })
      .then(async (novoFuncionario) => {
        // Cria vínculo com a obra
        const vinculo = {
          funcionario_id: novoFuncionario.id,
          obra_id: id_obra,
          cargo_na_obra: cargo,
          data_inicio: data_admissao,
          custo_hora_base: salario,
          tipo_vinculo: 'CLT',
          ativo: true,
          observacoes: ''
        };

        try {
          const vinculoRes = await fetch('http://localhost:3000/api/funcionario_obras', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vinculo)
          });

          if (!vinculoRes.ok) throw new Error('Erro ao vincular funcionário à obra.');
          console.log('Vínculo criado com sucesso');
        } catch (err) {
          console.error(err);
          alert('Funcionário criado, mas o vínculo com a obra falhou.');
        }

        alert('Funcionário cadastrado com sucesso!');
        form.reset();
        carregarFuncionarios();
      })

      .catch(err => alert(err.message || 'Erro ao cadastrar funcionário.'))
      .finally(() => { btn.disabled = false; btn.textContent = original; });
  });

  // init
  carregarObras();
  carregarFuncionarios();
});
