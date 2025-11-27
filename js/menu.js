document.addEventListener('DOMContentLoaded', function() {
    // Verifica se o usuário está logado
    const usuarioLogado = JSON.parse(localStorage.getItem('usuario'));
    if (!usuarioLogado) {
        window.location.href = 'index.html';
        return;
    }

    // Atualiza o nome do usuário no menu
    const userNameElement = document.getElementById('userName');
    userNameElement.textContent = usuarioLogado.nome;

    // Configura o botão de logout
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Remove os dados do usuário do localStorage
        localStorage.removeItem('usuario');
        
        // Redireciona para a página de login
        window.location.href = 'index.html';
    });

    // Adiciona animação aos cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}); 