/**
 * Kinetia AE Panel — panel.js
 * Communicates with the C++ AEGP plugin via CSInterface / UXP host API.
 * Provides physics editor, package import, and NL guide (Phase 2.5).
 */

// ─── CSInterface bridge ───────────────────────────────────────────────────────
// In real UXP: use require("uxp").host
// In CEP fallback: use CSInterface
const cs = typeof CSInterface !== "undefined" ? new CSInterface() : null;

function evalScript(script, callback) {
  if (cs) {
    cs.evalScript(script, callback || (() => {}));
  } else {
    // UXP stub — replace with actual UXP host calls in production
    console.log("[panel] evalScript:", script);
    callback?.("ok");
  }
}

// ─── State ────────────────────────────────────────────────────────────────────
let currentPreset = null;
let physics = {
  tension:       0.5,
  friction:      0.6,
  mass:          1.0,
  bounciness:    0.0,
  velocityDecay: 0.8,
  randomness:    0.0,
};

const PARAMS = [
  { key: "tension",       label: "Tension",        min: 0,   max: 1,  step: 0.01 },
  { key: "friction",      label: "Friction",        min: 0,   max: 1,  step: 0.01 },
  { key: "mass",          label: "Mass",            min: 0.1, max: 10, step: 0.1  },
  { key: "bounciness",    label: "Bounciness",      min: 0,   max: 1,  step: 0.01 },
  { key: "velocityDecay", label: "Velocity Decay",  min: 0,   max: 1,  step: 0.01 },
  { key: "randomness",    label: "Randomness",      min: 0,   max: 1,  step: 0.01 },
];

// ─── UI init ──────────────────────────────────────────────────────────────────
function buildPhysicsUI() {
  const container = document.getElementById("physics-params");
  container.innerHTML = "";

  for (const param of PARAMS) {
    const row = document.createElement("div");
    row.className = "param-row";
    row.innerHTML = `
      <div class="param-label">
        <span class="param-name">${param.label}</span>
        <span class="param-value" id="val-${param.key}">${physics[param.key].toFixed(2)}</span>
      </div>
      <input
        type="range"
        class="slider"
        id="slider-${param.key}"
        min="${param.min}"
        max="${param.max}"
        step="${param.step}"
        value="${physics[param.key]}"
      />
    `;
    container.appendChild(row);

    const slider = row.querySelector(`#slider-${param.key}`);
    const valEl  = row.querySelector(`#val-${param.key}`);
    slider.addEventListener("input", () => {
      physics[param.key] = parseFloat(slider.value);
      valEl.textContent = physics[param.key].toFixed(param.step < 0.1 ? 2 : 1);
    });
  }
}

// ─── Import package ───────────────────────────────────────────────────────────
document.getElementById("btn-import").addEventListener("click", () => {
  setStatus("Opening file picker…");

  evalScript(`
    var filter = "Kinetia Package:kinetia";
    var result = File.openDialog("Select a .kinetia package", filter, false);
    result ? result.fsName : "CANCELLED";
  `, (filePath) => {
    if (!filePath || filePath === "CANCELLED") {
      setStatus("Import cancelled.");
      return;
    }

    setStatus("Importing " + filePath.split("/").pop() + "…");

    evalScript(`kinetia_buildFromPackage("${filePath.replace(/\\/g, "\\\\")}")`, (result) => {
      if (result === "ok" || result === "true") {
        setPackageLoaded(filePath);
        setStatus("Package imported successfully.");
        enableControls(true);
      } else {
        setStatus("Import failed: " + result);
      }
    });
  });
});

// ─── Apply physics ────────────────────────────────────────────────────────────
document.getElementById("btn-apply").addEventListener("click", () => {
  if (!currentPreset) return;
  setStatus("Applying physics…");

  const physicsJson = JSON.stringify(physics);
  evalScript(`kinetia_applyPhysicsOverrides(${physicsJson})`, (result) => {
    setStatus(result === "ok" ? "Physics applied." : "Error: " + result);
  });
});

// ─── Randomize ────────────────────────────────────────────────────────────────
document.getElementById("btn-randomize").addEventListener("click", () => {
  const VARIATION = 0.1;
  for (const param of PARAMS) {
    const delta = (Math.random() * 2 - 1) * VARIATION;
    physics[param.key] = Math.min(param.max, Math.max(param.min,
      physics[param.key] + delta
    ));
    const slider = document.getElementById(`slider-${param.key}`);
    const valEl  = document.getElementById(`val-${param.key}`);
    if (slider) slider.value = physics[param.key];
    if (valEl)  valEl.textContent = physics[param.key].toFixed(2);
  }
  setStatus("Physics randomized ±10%.");
});

// ─── NL Guide (Phase 2.5) ─────────────────────────────────────────────────────
document.getElementById("btn-nl-apply").addEventListener("click", async () => {
  const prompt = document.getElementById("nl-prompt").value.trim();
  if (!prompt) return;

  setStatus("Calling Kinetia AI…");
  document.getElementById("btn-nl-apply").disabled = true;

  try {
    // Call the web API guide endpoint
    const apiUrl = "http://localhost:4000";
    const projectId = currentPreset?.projectId;

    if (!projectId) {
      setStatus("No active project. Import a package first.");
      return;
    }

    const response = await fetch(`${apiUrl}/api/projects/${projectId}/guide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const json = await response.json();
    if (json.data?.updatedMappings) {
      // Update sliders with returned overrides
      const firstMapping = json.data.updatedMappings[0];
      if (firstMapping?.overrides) {
        for (const [key, val] of Object.entries(firstMapping.overrides)) {
          if (key in physics) {
            physics[key] = val;
            const slider = document.getElementById(`slider-${key}`);
            const valEl  = document.getElementById(`val-${key}`);
            if (slider) slider.value = val;
            if (valEl)  valEl.textContent = parseFloat(val).toFixed(2);
          }
        }
      }
      setStatus("AI guide applied.");
      document.getElementById("nl-prompt").value = "";
    } else {
      setStatus("Guide returned no changes.");
    }
  } catch (err) {
    setStatus("Guide error: " + err.message);
  } finally {
    document.getElementById("btn-nl-apply").disabled = false;
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setStatus(msg) {
  document.getElementById("status-text").textContent = msg;
}

function setPackageLoaded(filePath) {
  const name = filePath.split("/").pop().replace(".kinetia", "");
  document.getElementById("package-name").textContent = name;
  document.getElementById("package-info").classList.remove("hidden");
  currentPreset = { filePath };
}

function enableControls(enabled) {
  document.getElementById("btn-apply").disabled    = !enabled;
  document.getElementById("btn-randomize").disabled= !enabled;
  document.getElementById("btn-nl-apply").disabled = !enabled;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
buildPhysicsUI();
setStatus("Ready — import a .kinetia package to begin.");
