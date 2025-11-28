// ===============================
// Login - Prime Construções
// ===============================

const API_URL = 'https://backendprimeconstruction-production.up.railway.app/api/login';

document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.querySelector('.login-form');  
  const loginButton = document.querySelector('.login-button');

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.querySelector('input[name="username"]').value.trim();
    const password = document.querySelector('input[name="password"]').value.trim();

    if (!username || !password) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Usuário ou senha inválidos.');
      }

      // ================================
      // SALVA TOKEN
      // ================================
      localStorage.setItem('token', result.token);

      // Salva dados do usuário (opcional)
      localStorage.setItem('usuario', JSON.stringify({
        id: result.id,
        login: result.login,
        nome: result.nome
      }));

      loginButton.innerHTML = '<i class="fas fa-check"></i> Sucesso!';
      setTimeout(() => {
        window.location.href = 'form.html';
      }, 500);

    } catch (error) {
      console.error('Erro no login:', error);
      alert(error.message || 'Erro ao fazer login. Por favor, tente novamente.');
      loginButton.disabled = false;
      loginButton.innerHTML = 'Entrar';
    }
  });
});
