/**
 * Kinetia AE Panel v2 — panel.js
 * Auth via Supabase REST API, loads physics_presets, applies via ExtendScript.
 */

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL  = "https://evkzqlzjvbvanpidpddl.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2a3pxbHpqdmJ2YW5waWRwZGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDg1MzQsImV4cCI6MjA5MTYyNDUzNH0.HuCPIfiPe-n8Kx4sGLHcAk1uGZudsL5M3FCW3QoIMsE";

const CATEGORIES = ["all", "entrance", "exit", "bounce", "inertia", "loop", "custom"];
const CAT_LABELS  = { all: "Todos", entrance: "Entrada", exit: "Salida", bounce: "Rebote", inertia: "Inercia", loop: "Loop", custom: "Custom" };

// ─── CEP bridge ───────────────────────────────────────────────────────────────
const cs = typeof CSInterface !== "undefined" ? new CSInterface() : null;

function evalScript(script) {
  return new Promise((resolve) => {
    if (cs) {
      cs.evalScript(script, (result) => resolve(result));
    } else {
      console.log("[panel] evalScript:", script.slice(0, 80));
      resolve("ok");
    }
  });
}

// ─── State ────────────────────────────────────────────────────────────────────
let session = null;       // { access_token, user }
let allPresets = [];
let selectedPreset = null;
let activeCategory = "all";
let searchQuery = "";

// ─── Supabase helpers ─────────────────────────────────────────────────────────
function sbHeaders(token) {
  const h = {
    "Content-Type":  "application/json",
    "apikey":        SUPABASE_ANON,
    "Authorization": `Bearer ${token || SUPABASE_ANON}`,
  };
  return h;
}

async function sbSignIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method:  "POST",
    headers: sbHeaders(null),
    body:    JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.message || "Auth failed");
  return json; // { access_token, user, ... }
}

async function sbFetchPresets(token) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/physics_presets?status=eq.ready&order=created_at.desc`,
    { headers: sbHeaders(token) }
  );
  if (!res.ok) throw new Error("Failed to load presets");
  return res.json();
}

// ─── Views ────────────────────────────────────────────────────────────────────
function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ─── Auth flow ────────────────────────────────────────────────────────────────
const loginForm   = document.getElementById("login-form");
const emailInput  = document.getElementById("email");
const passInput   = document.getElementById("password");
const loginBtn    = document.getElementById("btn-login");
const loginError  = document.getElementById("login-error");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginBtn.disabled = true;
  loginBtn.textContent = "Entrando…";
  loginError.textContent = "";

  try {
    const data = await sbSignIn(emailInput.value.trim(), passInput.value);
    session = data;
    localStorage.setItem("kn_token", data.access_token);
    localStorage.setItem("kn_email", data.user.email);
    onLoggedIn(data.user.email);
  } catch (err) {
    loginError.textContent = err.message;
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Iniciar sesión";
  }
});

async function onLoggedIn(email) {
  document.getElementById("user-email").textContent = email;
  showView("view-main");
  await loadPresets();
}

document.getElementById("btn-logout").addEventListener("click", () => {
  session = null;
  localStorage.removeItem("kn_token");
  localStorage.removeItem("kn_email");
  allPresets = [];
  selectedPreset = null;
  showView("view-auth");
  setStatus("Sesión cerrada.", "");
});

// ─── Load presets ─────────────────────────────────────────────────────────────
async function loadPresets() {
  setStatus("Cargando presets…", "");
  renderPresets([]);
  try {
    allPresets = await sbFetchPresets(session.access_token);
    renderCategories();
    renderPresets(filteredPresets());
    setStatus(`${allPresets.length} presets cargados.`, "ok");
  } catch (err) {
    setStatus("Error: " + err.message, "error");
  }
}

document.getElementById("btn-refresh").addEventListener("click", loadPresets);

// ─── Search ───────────────────────────────────────────────────────────────────
document.getElementById("search").addEventListener("input", (e) => {
  searchQuery = e.target.value.toLowerCase();
  renderPresets(filteredPresets());
});

// ─── Categories ───────────────────────────────────────────────────────────────
function renderCategories() {
  const container = document.getElementById("category-pills");
  container.innerHTML = "";
  CATEGORIES.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "pill" + (cat === activeCategory ? " active" : "");
    btn.textContent = CAT_LABELS[cat] || cat;
    btn.addEventListener("click", () => {
      activeCategory = cat;
      container.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      renderPresets(filteredPresets());
    });
    container.appendChild(btn);
  });
}

function filteredPresets() {
  return allPresets.filter(p => {
    const matchCat = activeCategory === "all" || p.category === activeCategory;
    const matchQ   = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery) ||
      (p.isolation_prompt || "").toLowerCase().includes(searchQuery);
    return matchCat && matchQ;
  });
}

// ─── Preset list ──────────────────────────────────────────────────────────────
function renderPresets(list) {
  const container = document.getElementById("preset-list");
  container.innerHTML = "";

  if (!list.length) {
    container.innerHTML = '<div class="empty-row">Sin presets.</div>';
    return;
  }

  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "preset-card" + (selectedPreset?.id === p.id ? " selected" : "");
    card.innerHTML = `
      <div class="preset-card-top">
        <span class="preset-name">${escHtml(p.name)}</span>
        <span class="preset-cat">${escHtml(p.category || "")}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="preset-prompt">${escHtml((p.isolation_prompt || "").slice(0, 50))}</span>
        <span class="preset-confidence">${p.confidence ? Math.round(p.confidence * 100) + "%" : ""}</span>
      </div>
    `;
    card.addEventListener("click", () => selectPreset(p));
    container.appendChild(card);
  });
}

function selectPreset(p) {
  selectedPreset = p;
  renderPresets(filteredPresets());
  renderDetail(p);
  document.getElementById("btn-apply").disabled = false;
}

// ─── Preset detail ────────────────────────────────────────────────────────────
function renderDetail(p) {
  const detail = document.getElementById("preset-detail");
  detail.classList.add("visible");
  document.getElementById("detail-name").textContent = p.name;

  const grid = document.getElementById("physics-grid");
  grid.innerHTML = "";

  const physics = p.physics || {};
  const keys = ["tension", "friction", "mass", "amplitude", "frequency", "decay"];
  keys.forEach(k => {
    if (physics[k] == null) return;
    const row = document.createElement("div");
    row.className = "physics-row";
    row.innerHTML = `
      <span class="physics-key">${k}</span>
      <span class="physics-val">${typeof physics[k] === "number" ? physics[k].toFixed(3) : physics[k]}</span>
    `;
    grid.appendChild(row);
  });
}

// ─── Apply to AE layer ────────────────────────────────────────────────────────
document.getElementById("btn-apply").addEventListener("click", async () => {
  if (!selectedPreset) return;

  const targetProp = document.getElementById("prop-select").value;

  // Check layer selection first
  const layerInfoStr = await evalScript("kinetia_getLayerInfo()");
  let layerInfo;
  try { layerInfo = JSON.parse(layerInfoStr); } catch (_) { layerInfo = {}; }

  if (layerInfo.error) {
    setStatus(layerInfo.error, "error");
    return;
  }

  setStatus(`Aplicando a "${layerInfo.name}"…`, "");

  const physicsJson = JSON.stringify(selectedPreset.physics || {});
  const safeJson = physicsJson.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const result = await evalScript(`kinetia_applyPreset("${safeJson}", "${targetProp}")`);

  if (result === "ok") {
    setStatus(`✓ Preset aplicado a "${layerInfo.name}" → ${targetProp}`, "ok");
  } else {
    setStatus("Error: " + result, "error");
  }
});

// Remove Kinetia from layer
document.getElementById("btn-remove").addEventListener("click", async () => {
  const result = await evalScript("kinetia_removeKinetia()");
  if (result === "ok") {
    setStatus("Kinetia eliminado de la capa.", "ok");
  } else {
    setStatus("Error: " + result, "error");
  }
});

// ─── Status ───────────────────────────────────────────────────────────────────
function setStatus(msg, type) {
  const el = document.getElementById("status-text");
  el.textContent = msg;
  el.className = type || "";
}

// ─── Util ─────────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
(function init() {
  const savedToken = localStorage.getItem("kn_token");
  const savedEmail = localStorage.getItem("kn_email");

  if (savedToken) {
    session = { access_token: savedToken };
    onLoggedIn(savedEmail || "");
  } else {
    showView("view-auth");
  }
})();
