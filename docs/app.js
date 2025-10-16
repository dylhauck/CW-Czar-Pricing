/* ============================================================
   CW Czar Pricing — App Logic (v36)
   - Lane tables ($/cwt) + deficit break weights
   - Rating (straight vs. deficit), discount, MC floor, fuel, accessorials
   - Density auto-calc + “Use Suggested Class”
   - Saved accessorials per user (localStorage, per-email scope)
   ============================================================ */

/* ---------------------------
   Demo Auth / Storage Keys
--------------------------- */
const USER_KEY  = "cwczar.user";        // current session user { email, firstName, lastName, ... }
const USERS_KEY = "cwczar.users";       // all demo users by email (for password, etc.)

// Accessorials are saved per user (by email) using this prefix.
const ACCESSORIALS_NS = "cwczar.accessorials."; // final key is `${ACCESSORIALS_NS}${email}`

/* -----------------------------------------
   Helpers: storage, current user, DOM utils
----------------------------------------- */
const $  = (id) => document.getElementById(id);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function loadJSON(key, fallback=null) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}
function saveJSON(key, obj) { localStorage.setItem(key, JSON.stringify(obj)); }

function currentUser() { return loadJSON(USER_KEY, null); }
function requireAuth() {
  const u = currentUser();
  if (!u || !u.email) { location.href = "login.html"; return null; }
  return u;
}
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function setText(id, txt) { const el = $(id); if (el) el.textContent = txt; }

/* -----------------------------------------
   Lane Table: 08873 -> 60406 (088 → 604)
   Rates are $/cwt; Breaks are billable lbs
----------------------------------------- */
const RATE_TABLES = {
  "088-604": {
    rates: {
      500: { L5C: 1440.30, M5C: 1224.35, M1M: 1022.45, M2M:  907.65, M5M:  719.95, M10M:  645.40, M20M:  581.15 },
      400: { L5C: 1152.24, M5C:  979.48, M1M:  817.96, M2M:  726.12, M5M:  575.96, M10M:  516.32, M20M:  464.92 },
      300: { L5C:  864.18, M5C:  734.61, M1M:  613.47, M2M:  544.59, M5M:  431.97, M10M:  387.24, M20M:  348.69 },
      250: { L5C:  720.15, M5C:  612.18, M1M:  511.23, M2M:  453.83, M5M:  359.98, M10M:  322.70, M20M:  290.58 },
      200: { L5C:  576.12, M5C:  489.74, M1M:  408.98, M2M:  363.06, M5M:  287.98, M10M:  258.16, M20M:  232.46 },
      175: { L5C:  504.11, M5C:  428.52, M1M:  357.86, M2M:  317.68, M5M:  251.98, M10M:  225.89, M20M:  203.40 },
      150: { L5C:  432.09, M5C:  367.31, M1M:  306.74, M2M:  272.30, M5M:  215.99, M10M:  193.62, M20M:  174.35 },
      125: { L5C:  360.08, M5C:  306.09, M1M:  255.61, M2M:  226.91, M5M:  179.99, M10M:  161.35, M20M:  145.29 },
      110: { L5C:  316.87, M5C:  269.36, M1M:  224.94, M2M:  199.68, M5M:  158.39, M10M:  141.99, M20M:  127.85 },
      100: { L5C:  288.06, M5C:  244.87, M1M:  204.49, M2M:  181.53, M5M:  143.99, M10M:  129.08, M20M:  116.23 },
       92: { L5C:  266.46, M5C:  226.50, M1M:  189.15, M2M:  167.92, M5M:  133.19, M10M:  119.40, M20M:  107.51 },
       85: { L5C:  244.85, M5C:  208.14, M1M:  173.82, M2M:  154.30, M5M:  122.39, M10M:  109.72, M20M:   98.80 },
       77: { L5C:  223.25, M5C:  189.77, M1M:  158.48, M2M:  140.69, M5M:  111.59, M10M:  100.04, M20M:   90.08 },
       70: { L5C:  208.84, M5C:  177.53, M1M:  148.26, M2M:  131.61, M5M:  104.39, M10M:   93.58, M20M:   84.27 },
       65: { L5C:  197.32, M5C:  167.74, M1M:  140.08, M2M:  124.35, M5M:   98.63, M10M:   88.42, M20M:   79.62 },
       60: { L5C:  182.92, M5C:  155.49, M1M:  129.85, M2M:  115.27, M5M:   91.43, M10M:   81.97, M20M:   73.81 },
       55: { L5C:  174.28, M5C:  148.15, M1M:  123.72, M2M:  109.83, M5M:   87.11, M10M:   78.09, M20M:   70.32 },
       50: { L5C:  159.87, M5C:  135.90, M1M:  113.49, M2M:  100.75, M5M:   79.91, M10M:   71.64, M20M:   64.51 },
    },
    breaks: {
      500: { L5C:  28, M5C:  425, M1M:   835, M2M:  1775, M5M:  3966, M10M:  8964, M20M: 18008 },
      400: { L5C:  35, M5C:  425, M1M:   835, M2M:  1775, M5M:  3966, M10M:  8964, M20M: 18008 },
      300: { L5C:  47, M5C:  425, M1M:   835, M2M:  1775, M5M:  3966, M10M:  8964, M20M: 18009 },
      250: { L5C:  56, M5C:  425, M1M:   835, M2M:  1775, M5M:  3966, M10M:  8964, M20M: 18009 },
      200: { L5C:  71, M5C:  425, M1M:   835, M2M:  1775, M5M:  3966, M10M:  8964, M20M: 18008 },
      175: { L5C:  81, M5C:  425, M1M:   835, M2M:  1775, M5M:  3965, M10M:  8964, M20M: 18008 },
      150: { L5C:  94, M5C:  425, M1M:   835, M2M:  1775, M5M:  3966, M10M:  8964, M20M: 18009 },
      125: { L5C: 113, M5C:  425, M1M:   835, M2M:  1775, M5M:  3966, M10M:  8964, M20M: 18009 },
      110: { L5C: 129, M5C:  425, M1M:   835, M2M:  1775, M5M:  3966, M10M:  8964, M20M: 18008 },
      100: { L5C: 142, M5C:  425, M1M:   835, M2M:  1775, M5M:  3966, M10M:  8964, M20M: 18008 },
       92: { L5C: 153, M5C:  425, M1M:   835, M2M:  1775, M5M:  3965, M10M:  8964, M20M: 18008 },
       85: { L5C: 167, M5C:  425, M1M:   835, M2M:  1775, M5M:  3965, M10M:  8964, M20M: 18009 },
       77: { L5C: 183, M5C:  425, M1M:   835, M2M:  1775, M5M:  3965, M10M:  8964, M20M: 18008 },
       70: { L5C: 196, M5C:  425, M1M:   835, M2M:  1775, M5M:  3965, M10M:  8964, M20M: 18010 },
       65: { L5C: 207, M5C:  425, M1M:   835, M2M:  1775, M5M:  3965, M10M:  8964, M20M: 18009 },
       60: { L5C: 224, M5C:  425, M1M:   835, M2M:  1775, M5M:  3965, M10M:  8965, M20M: 18009 },
       55: { L5C: 235, M5C:  425, M1M:   835, M2M:  1775, M5M:  3965, M10M:  8964, M20M: 18009 },
       50: { L5C: 256, M5C:  425, M1M:   835, M2M:  1775, M5M:  3965, M10M:  8965, M20M: 18009 },
    },
    columns: ["L5C","M5C","M1M","M2M","M5M","M10M","M20M"]
  }
};

/* ---------------------------
   Rating core functions
--------------------------- */
const zip3 = (z) => String(z || "").replace(/\D/g, "").slice(0,3);

function weightToColumn(cols, wt) {
  if (wt < 500)  return "L5C";
  if (wt < 1000) return "M5C";
  if (wt < 2000) return "M1M";
  if (wt < 5000) return "M2M";
  if (wt < 10000) return "M5M";
  if (wt < 20000) return "M10M";
  return "M20M";
}
function cwtCharge(ratePerCwt, billableLbs) {
  return ratePerCwt * (billableLbs / 100.0);
}

function rateLane({
  originZip, destZip, cls, weight,
  discountPct=0, fuelPct=0, mcFloor=0, accessorials=0
}) {
  const key = `${zip3(originZip)}-${zip3(destZip)}`;
  const lane = RATE_TABLES[key];
  if (!lane) throw new Error(`No rate table for lane ${key}.`);

  const classRow  = lane.rates[cls];
  const breakRow  = lane.breaks[cls];
  if (!classRow || !breakRow) throw new Error(`No class ${cls} for lane ${key}.`);

  const col = weightToColumn(lane.columns, weight);
  let bestGross = cwtCharge(classRow[col], weight);

  // deficit: try heavier columns
  const idx = lane.columns.indexOf(col);
  for (let i = idx + 1; i < lane.columns.length; i++) {
    const heavyCol = lane.columns[i];
    const billableBreak = breakRow[heavyCol];
    if (!billableBreak) continue;
    const deficitCharge = cwtCharge(classRow[heavyCol], billableBreak);
    if (deficitCharge < bestGross) bestGross = deficitCharge;
  }

  const gross = bestGross;

  const discountAmt = (discountPct > 0) ? (gross * (discountPct/100)) : 0;
  const afterDisc = gross - discountAmt;

  // MC floor applied after discount
  const withFloor = Math.max(afterDisc, Number(mcFloor || 0));
  const floorApplied = withFloor > afterDisc;

  // Fuel typically on linehaul (with floor)
  const fuelAmt = (fuelPct > 0) ? (withFloor * (fuelPct/100)) : 0;

  const accAmt = Number(accessorials || 0);
  const net = withFloor + fuelAmt + accAmt;

  return {
    lane: key,
    cls, weight, colUsed: col,
    gross: round2(gross),
    discount: round2(discountAmt),
    linehaulAfterFloor: round2(withFloor),
    mcFloorApplied: floorApplied,
    fuel: round2(fuelAmt),
    accessorials: round2(accAmt),
    net: round2(net)
  };
}

/* ---------------------------
   Saved Accessorials (per user)
--------------------------- */
function accessorialKeyForUser(email) {
  const e = (email || "").toLowerCase();
  return `${ACCESSORIALS_NS}${e}`;
}
function loadAccessorials(email) {
  return loadJSON(accessorialKeyForUser(email), []); // [{name, price}]
}
function saveAccessorials(email, list) {
  saveJSON(accessorialKeyForUser(email), list);
}
function populateSavedAccessorials(email) {
  const sel = $("savedAccessorial");
  if (!sel) return;
  sel.innerHTML = `<option value="">Select...</option>`;
  const list = loadAccessorials(email);
  list.forEach((a, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = `${a.name} — $${Number(a.price).toFixed(2)}`;
    sel.appendChild(opt);
  });
}

/* -----------------------------------------
   Density Calculator (auto-update)
   Density (lb/ft³) = weight / (pallets * (L*W*H/1728))
----------------------------------------- */
function suggestedClassFromDensity(d) {
  if (d < 1) return 400;
  if (d < 2) return 300;
  if (d < 4) return 250;
  if (d < 6) return 175;
  if (d < 8) return 125;
  if (d < 10) return 100;
  if (d < 12) return 92.5;
  if (d < 15) return 85;
  if (d < 22.5) return 70;
  if (d < 30) return 65;
  if (d < 35) return 60;
  if (d < 50) return 55;
  return 50;
}

function calcDensityAndSuggest() {
  const pallets = parseFloat(($("pallets")?.value || "0").trim()) || 0;
  const L = parseFloat(($("length")?.value || "0").trim()) || 0;
  const W = parseFloat(($("width")?.value  || "0").trim()) || 0;
  const H = parseFloat(($("height")?.value || "0").trim()) || 0;
  const weight = parseFloat(($("weight")?.value || "0").trim()) || 0;

  let density = 0;
  if (pallets > 0 && L > 0 && W > 0 && H > 0) {
    const volFt3 = pallets * ((L * W * H) / 1728.0);
    density = volFt3 > 0 ? (weight / volFt3) : 0;
  }
  const cls = density > 0 ? suggestedClassFromDensity(density) : null;

  setText("densityVal", density ? round2(density).toString() : "—");
  setText("classSuggestion", cls ? String(cls) : "—");

  return { density, cls };
}

/* ---------------------------
   Event wiring on DOM ready
--------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  // If on index page, prepare UI
  const originZipEl = $("originZip");
  if (!originZipEl) return; // not on rate page

  const user = currentUser();
  const email = user?.email || "";

  // Populate saved accessorials list
  populateSavedAccessorials(email);

  // “Add” selected accessorial amount into Accessorials ($) field
  $("addAccessorialBtn")?.addEventListener("click", () => {
    const sel = $("savedAccessorial");
    const idx = sel?.value ? parseInt(sel.value, 10) : -1;
    if (idx >= 0) {
      const list = loadAccessorials(email);
      const picked = list[idx];
      const field = $("accessorials");
      const current = parseFloat(field.value || "0") || 0;
      field.value = (current + Number(picked.price || 0)).toFixed(2);
    }
  });

  // Rate button
  $("rateBtn")?.addEventListener("click", () => {
    try {
      const result = rateLane({
        originZip: $("originZip").value,
        destZip: $("destinationZip").value,
        cls: parseFloat($("class").value),
        weight: parseFloat($("weight").value),
        discountPct: parseFloat($("discount").value) || 0,
        fuelPct: parseFloat($("fuel").value) || 0,
        mcFloor: parseFloat($("mcFloor").value) || 0,
        accessorials: parseFloat($("accessorials").value) || 0
      });

      setText("grossResult",        `$${result.gross.toFixed(2)}`);
      setText("discountResult",     `-$${result.discount.toFixed(2)}`);
      setText("mcResult",           `$${result.linehaulAfterFloor.toFixed(2)}${result.mcFloorApplied ? " (floor)" : ""}`);
      setText("fuelResult",         `$${result.fuel.toFixed(2)}`);
      setText("accessorialsResult", `$${result.accessorials.toFixed(2)}`);
      setText("netResult",          `$${result.net.toFixed(2)}`);
    } catch (err) {
      alert(err.message);
    }
  });

  // Clear button
  $("clearBtn")?.addEventListener("click", () => {
    [
      "originZip","destinationZip","class","weight","miles",
      "fuel","mcFloor","accessorials","discount"
    ].forEach(id => { const el = $(id); if (el) el.value = ""; });

    ["grossResult","discountResult","mcResult","fuelResult","accessorialsResult","netResult"]
      .forEach(id => setText(id, "—"));

    setText("densityVal", "—");
    setText("classSuggestion", "—");
  });

  // Density auto-calc — when any of these change
  ["pallets","length","width","height","weight"].forEach(id => {
    $(id)?.addEventListener("input", calcDensityAndSuggest);
  });

  // Use Suggested Class
  $("useClassBtn")?.addEventListener("click", () => {
    const { cls } = calcDensityAndSuggest();
    if (cls) $("class").value = String(cls);
  });
});
