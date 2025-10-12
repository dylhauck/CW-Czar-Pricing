/* ---------- Utilities ---------- */
const zip3 = z => (z||'').toString().slice(0,3);
const toNum = v => { const n = parseFloat((v||'').toString().replace(/[^0-9.\-]/g,'')); return isNaN(n)?0:n; };
const fmt = n => (n==null||isNaN(n)?'—':n.toFixed(2));

function toast(msg, type='success'){
  const root = document.getElementById('toast-root');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(()=>{ t.style.opacity = '0'; t.style.transform='translateY(2px)';
    setTimeout(()=> t.remove(), 300);
  }, 2800);
}

function parseCSV(text){
  const lines = text.replace(/\r/g,'').split('\n').filter(Boolean);
  if(!lines.length) return [];
  const header = safeSplit(lines[0]).map(h=>h.trim().toLowerCase());
  const rows = [];
  for(let i=1;i<lines.length;i++){
    const cells = safeSplit(lines[i]);
    if(!cells.length) continue;
    const o={}; header.forEach((h,idx)=>o[h]=(cells[idx]||'').trim());
    rows.push(o);
  }
  return rows;

  function safeSplit(line){
    const cells=[]; let cur='',q=false;
    for(const ch of line){
      if(ch === '"'){ q=!q; continue; }
      if(ch === ',' && !q){ cells.push(cur); cur=''; } else { cur+=ch; }
    }
    cells.push(cur); return cells;
  }
}

/* ---------- State ---------- */
let RATE_TABLE = [];

/* ---------- Rate Lookup ---------- */
function lookupRate(originZip, destZip, cls){
  const o=zip3(originZip), d=zip3(destZip), c=(cls||'').toString().trim();
  let row = RATE_TABLE.find(r => r.origin_zip3===o && r.dest_zip3===d && (r.class===c || r.class===c.replace(/^0+/,'')));
  if(row) return row;
  row = RATE_TABLE.find(r => (r.origin_zip3==='*' || r.origin_zip3===o) &&
                             (r.dest_zip3==='*' || r.dest_zip3===d) &&
                             (r.class===c || r.class===c.replace(/^0+/,'')));
  return row || null;
}

/* ---------- UI Builders ---------- */
function addRow(){
  const body = document.getElementById('items');
  const row = document.createElement('div');
  row.className = 'table-row';
  row.innerHTML = `
    <div><input class="cls" type="text" placeholder="70"></div>
    <div><input class="wgt" type="text" placeholder="500"></div>
    <div class="rate">—</div>
    <div class="chg">—</div>`;
  body.appendChild(row);

  // inline validation on blur
  const clsInput = row.querySelector('.cls');
  const wgtInput = row.querySelector('.wgt');
  clsInput.addEventListener('blur', ()=>validateField(clsInput, v => !!v));
  wgtInput.addEventListener('blur', ()=>validateField(wgtInput, v => toNum(v) > 0));
}

function validateField(el, fn){
  const ok = fn(el.value);
  el.classList.toggle('is-invalid', !ok);
  return ok;
}

/* ---------- Calc ---------- */
function calcTotals(){
  // validate rows
  const rows = [...document.querySelectorAll('#items .table-row')];
  if(!rows.length){ addRow(); toast('Add at least one Class & Weight row.','error'); return; }
  let valid = true;
  rows.forEach(r=>{
    const c = r.querySelector('.cls');
    const w = r.querySelector('.wgt');
    valid &= validateField(c, v=>!!v);
    valid &= validateField(w, v=>toNum(v)>0);
  });
  if(!valid){ toast('Please correct highlighted fields.','error'); return; }

  const origin = document.getElementById('originZip').value;
  const dest   = document.getElementById('destZip').value;
  let gross = 0;

  rows.forEach(row=>{
    const cls = row.querySelector('.cls').value;
    const wgt = toNum(row.querySelector('.wgt').value);
    let rate=null, chg=null;
    const hit = lookupRate(origin, dest, cls);
    if(hit){
      const cwt  = toNum(hit.cwt_rate);
      const minc = toNum(hit.min_charge);
      rate = cwt;
      chg  = Math.max(minc, cwt*(wgt/100));
    }
    row.querySelector('.rate').textContent = (rate==null?'—':fmt(rate));
    row.querySelector('.chg').textContent  = (chg==null?'—':fmt(chg));
    if(chg!=null) gross += chg;
  });

  const discPct = toNum(document.getElementById('discountPct').value)/100;
  const fscPct  = toNum(document.getElementById('fscPct').value)/100;
  let disc = gross * discPct;

  const floor = toNum(document.getElementById('mcFloor').value);
  if(floor>0 && (gross - disc) < floor){
    disc = Math.max(0, gross - floor);
  }

  const fsc = (gross - disc) * fscPct;
  const acc = toNum(document.getElementById('accessorials').value);
  const net = gross - disc + fsc + acc;

  document.getElementById('tGross').textContent = fmt(gross);
  document.getElementById('tDisc').textContent  = fmt(disc);
  document.getElementById('tFloor').textContent = floor>0 ? fmt(floor) : '—';
  document.getElementById('tFsc').textContent   = fmt(fsc);
  document.getElementById('tAcc').textContent   = fmt(acc);
  document.getElementById('tNet').textContent   = fmt(net);

  toast('Shipment rated.');
}

/* ---------- Density ---------- */
function calcDensity(){
  const pcs = Math.max(1, toNum(document.getElementById('pallets').value)||1);
  const L = toNum(document.getElementById('len').value);
  const W = toNum(document.getElementById('wid').value);
  const H = toNum(document.getElementById('hei').value);
  const totalWeight = [...document.querySelectorAll('#items .wgt')].reduce((s,el)=>s+toNum(el.value),0);
  const cubicIn = (L&&W&&H) ? (L*W*H*pcs) : 0;
  const ft3 = cubicIn ? cubicIn/1728 : 0;
  const density = (totalWeight && ft3) ? totalWeight/ft3 : 0;
  document.getElementById('densityOut').textContent = density ? density.toFixed(2) : '—';
  const dim = cubicIn ? cubicIn/139 : 0;
  document.getElementById('dimOut').textContent = dim ? dim.toFixed(1) : '—';
}

/* ---------- Upload Modal + CSV ingest ---------- */
function openModal(){ document.getElementById('uploadModal').showModal(); }
function closeModal(){ document.getElementById('uploadModal').close(); }

function attachUploadModal(){
  const modal = document.getElementById('uploadModal');
  const dz = document.getElementById('dropZone');
  const fileInput = document.getElementById('modalFile');
  const importBtn = document.getElementById('modalImport');

  dz.addEventListener('click', ()=>fileInput.click());
  dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('hover'); });
  dz.addEventListener('dragleave', ()=>dz.classList.remove('hover'));
  dz.addEventListener('drop', async e=>{
    e.preventDefault(); dz.classList.remove('hover');
    const f = e.dataTransfer.files?.[0]; if(f) await loadCsvFile(f);
  });

  fileInput.addEventListener('change', async e=>{
    const f = e.target.files?.[0]; if(f) await loadCsvFile(f);
  });

  importBtn.addEventListener('click', e=>{
    if(!RATE_TABLE.length){ e.preventDefault(); toast('Please select a CSV first.','error'); return; }
    toast('Rate table imported.'); closeModal();
  });

  // Close on native close button
  modal.addEventListener('close', ()=>{ /* no-op */ });
}

async function loadCsvFile(file){
  const text = await file.text();
  const rows = parseCSV(text);
  RATE_TABLE = rows.map(r=>({
    origin_zip3: (r.origin_zip3 || r.origin || r.o_zip3 || '').toString().slice(0,3),
    dest_zip3:   (r.dest_zip3   || r.destination || r.d_zip3 || '').toString().slice(0,3),
    class:       (r.class || r.nmfc_class || '').toString(),
    cwt_rate:    r.cwt_rate || r.cwt || r.rate || r.base_rate || '',
    min_charge:  r.min_charge || r.min || r.mnc || '0'
  })).filter(r=>r.origin_zip3 && r.dest_zip3 && r.class);

  document.getElementById('csvStatus').textContent = `Loaded ${RATE_TABLE.length} rows.`;
  toast(`Loaded ${RATE_TABLE.length} rows.`, RATE_TABLE.length ? 'success' : 'error');
}

/* ---------- Wire up ---------- */
function wire(){
  document.getElementById('addRow').addEventListener('click', addRow);
  document.getElementById('rateBtn').addEventListener('click', calcTotals);
  document.getElementById('clearBtn').addEventListener('click', ()=>{
    document.getElementById('items').innerHTML='';
    ['discountPct','fscPct','accessorials','originZip','destZip','pallets','len','wid','hei','mcFloor','miles']
      .forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    calcDensity();
    ['tGross','tDisc','tFloor','tFsc','tAcc','tNet'].forEach(id=>document.getElementById(id).textContent='—');
    toast('Cleared.');
  });

  // Density listeners
  ['pallets','len','wid','hei'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.addEventListener('input', calcDensity);
  });

  // Modal
  document.getElementById('openUpload').addEventListener('click', openModal);
  document.getElementById('openUpload2').addEventListener('click', openModal);
  attachUploadModal();

  // Inline file input (non-modal) still works
  document.getElementById('rateCsv').addEventListener('change', async ev=>{
    const f = ev.target.files?.[0]; if(!f) return;
    await loadCsvFile(f);
  });

  addRow(); // start with one row
}
window.addEventListener('DOMContentLoaded', wire);
