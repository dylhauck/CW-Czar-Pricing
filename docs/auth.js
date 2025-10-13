// Demo-only front-end auth (localStorage)
// For real auth later, swap to Firebase/Auth0.
const AUTH_KEY = "cwczar.auth";
const USER_KEY = "cwczar.user";

export function isLoggedIn() {
  try { return !!JSON.parse(localStorage.getItem(AUTH_KEY)); }
  catch { return false; }
}

export function currentUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
  catch { return null; }
}

export function login({ email, name }) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(true));
  localStorage.setItem(USER_KEY, JSON.stringify({ email, name, t: Date.now() }));
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
  location.href = "login.html";
}

export function requireAuth() {
  if (!isLoggedIn()) {
    // bounce to login with return path
    const ret = encodeURIComponent(location.pathname.split('/').pop() || "index.html");
    location.href = `login.html?ret=${ret}`;
  }
}

export function applyUserToUI() {
  const u = currentUser();
  const el = document.getElementById("userBadge");
  if (el && u) el.textContent = u.name || u.email || "User";

  const lo = document.getElementById("logoutBtn");
  if (lo) lo.addEventListener("click", logout);
}
