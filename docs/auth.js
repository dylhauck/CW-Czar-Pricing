// Demo-only front-end auth with localStorage + Web Crypto (SHA-256)
// NOT for production use. For production, use a real backend or Firebase/Auth0.

const AUTH_KEY  = "cwczar.auth";
const USER_KEY  = "cwczar.user";
const USERS_KEY = "cwczar.users"; // { [email]: { name, salt(base64), hash(base64), createdAt } }

function getUsers(){
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; } catch { return {}; }
}
function setUsers(u){
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}

export function isLoggedIn(){
  try { return !!JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return false; }
}
export function currentUser(){
  try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; } catch { return null; }
}
export function logout(){
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
  location.href = "login.html";
}
export function requireAuth(){
  if(!isLoggedIn()){
    const ret = encodeURIComponent(location.pathname.split('/').pop() || "index.html");
    location.href = `login.html?ret=${ret}`;
  }
}
export function applyUserToUI(){
  const u = currentUser();
  const badge = document.getElementById("userBadge");
  if(badge && u){ badge.textContent = u.name || u.email || "User"; }
  const lo = document.getElementById("logoutBtn");
  if(lo){ lo.addEventListener("click", logout); }
}

/* ---------- Password hashing helpers (SHA-256 with per-user salt) ---------- */
async function sha256(buf){
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return new Uint8Array(hash);
}
function toBase64(u8){ return btoa(String.fromCharCode(...u8)); }
function fromBase64(b64){
  const bin = atob(b64); return new Uint8Array([...bin].map(c => c.charCodeAt(0)));
}
function strToUtf8(str){ return new TextEncoder().encode(str); }
function concatU8(a,b){ const out=new Uint8Array(a.length+b.length); out.set(a,0); out.set(b,a.length); return out; }

async function hashPassword(password, saltU8){
  const pwU8 = strToUtf8(password);
  const combined = concatU8(saltU8, pwU8);
  return await sha256(combined);
}

/* ----------------------- Public API for login page ------------------------ */
export async function signUp({ name, email, password }){
  email = (email||"").trim().toLowerCase();
  if(!name || !email || !password) throw new Error("All fields are required.");
  if(password.length < 6) throw new Error("Password must be at least 6 characters.");

  const users = getUsers();
  if(users[email]) throw new Error("An account with this email already exists.");

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await hashPassword(password, salt);

  users[email] = {
    name: name.trim(),
    salt: toBase64(salt),
    hash: toBase64(hash),
    createdAt: Date.now()
  };
  setUsers(users);

  // Auto-login after signup
  localStorage.setItem(AUTH_KEY, JSON.stringify(true));
  localStorage.setItem(USER_KEY, JSON.stringify({ email, name: users[email].name, t: Date.now() }));
  return true;
}

export async function signIn({ email, password }){
  email = (email||"").trim().toLowerCase();
  const users = getUsers();
  const rec = users[email];
  if(!rec) throw new Error("Invalid email or password.");

  const salt = fromBase64(rec.salt);
  const candidate = await hashPassword(password||"", salt);
  const ok = toBase64(candidate) === rec.hash;
  if(!ok) throw new Error("Invalid email or password.");

  localStorage.setItem(AUTH_KEY, JSON.stringify(true));
  localStorage.setItem(USER_KEY, JSON.stringify({ email, name: rec.name, t: Date.now() }));
  return true;
}
