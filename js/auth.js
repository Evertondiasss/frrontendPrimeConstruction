// auth.js
// protege páginas, controla sessão e gerencia inatividade

const LOGIN_PAGE = "index.html";
const MAX_INACTIVE_MS = 30 * 60 * 1000; // 30 minutos

function getToken() {
  return localStorage.getItem("token");
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("nomeUsuario");
  localStorage.removeItem("lastActivity");

  window.location.href = LOGIN_PAGE;
}

window.logout = logout; // permite chamar em outros scripts

function updateActivity() {
  localStorage.setItem("lastActivity", Date.now().toString());
}

function checkInactivity() {
  const last = parseInt(localStorage.getItem("lastActivity") || "0", 10);
  if (!last) return;

  if (Date.now() - last > MAX_INACTIVE_MS) {
    alert("Sessão expirada por inatividade.");
    logout();
  }
}

function checkAuthOnLoad() {
  const token = getToken();

  // sem token → login
  if (!token) {
    logout();
    return;
  }

  // primeira atividade
  if (!localStorage.getItem("lastActivity")) {
    updateActivity();
  }

  // verifica expiração por inatividade
  checkInactivity();
}

// iniciar verificação ao carregar
document.addEventListener("DOMContentLoaded", () => {
  checkAuthOnLoad();

  // renova atividade em ações do usuário
  window.addEventListener("click", updateActivity);
  window.addEventListener("keydown", updateActivity);

  // checa inatividade a cada 1 minuto
  setInterval(checkInactivity, 60 * 1000);
});

// headers de autenticação para fetch()
function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

window.getAuthHeaders = getAuthHeaders;
