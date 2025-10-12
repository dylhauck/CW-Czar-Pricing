// Simple CSV parser
function parseCSV(text){
  const lines = text.replace(/\r/g,'').split('\n').filter(Boolean);
  const header = lines[0].split(',').map(h=>h.trim().toLowerCase());
  const out = [];
  for(let i=1;i<lines.length;i++){
    // minimal handling of commas in quotes
    const row = []; let cur='', q=false;
    for(const ch of lines[i]){
      if(ch === '"'){ q = !q; continue; }
      if(ch === ',' && !q){ row.push(cur); cur=''; } else { cur += ch; }
    }
    row.push(cur);
    const obj={}; header.forEach((h,idx)=>obj[h]=(row[idx]||'').trim());
    out.push(obj);
  }
  return out;
}

let RATE_TABLE=[];
const zip3 = z => (z||'').toString().slice(0,3);
const toNum = v => { const n = parseFloat((v||'').toString().replace(/[^0-9.\-]/g,'')); return isNaN(n)?0:n; };
const fmt = n => (n==null||isNaN(n)?'—':n.toFixed(2));

function lookupRate(originZip, destZip, cls){
  const o=zip3(originZip), d=zip3(destZip), c=(cls||'').toString().trim();
  let row = RATE_TABLE.find(r => r.origin_zip3===o && r.dest_zip3===d && (r.class===c || r.class===c.replace(/^0+/,'')));
  if(row) return row;
  row = RATE_TABLE.find(r => (r.origin_zip3==='*' || r.origin_zip3===o) && (r.dest_zip3==='*' || r.dest_zip3===d) && (r.class===c || r.class===c.replace(/^0+/,'')));
  return row || null;
}

function addRow(){
  const body = document.getElementById('items');
  const row = document.createElement('div');
  row.className = 'table-row';
  row.innerHTML = '<div><input class="cls" type="text" placeholder="70"></div>' +
                  '<div><input class="wgt" type="text" placeholder="500"></div>' +
                  '<div class="rate">—</div>' +
                  '<div class="chg">—</div>';
  body.appendChild(row);
}

function calcTotals(){
  const origin = document.getElementById('originZip').value;
  const dest = document.getElementById('destZip').value;
  let gross = 0;
  document.querySelectorAll('#items .table-row').forEach(row=>{
    const cls = row.querySelector('.cls').value;
    const wgt = toNum(row.querySelector('.wgt').value);
    let rate=null, chg=null;
    const hit = lookupRate(origin, dest, cls);
    if(hit){
      const cwt = toNum(hit.cwt_rate);
      const minc = toNum(hit.min_charge);
      rate = cwt;
      chg = Math.max(minc, cwt * (wgt/100));
    }
    row.querySelector('.rate').textContent = (rate==null?'—':fmt(rate));
    row.querySelector('.chg').textContent = (chg==null?'—':fmt(chg));
    if(chg!=null) gross += chg;
  });

  const discPct = toNum(document.getElementById('discountPct').value)/100;
  const fscPct  = toNum(document.getElementById('fscPct').value)/100;
  let disc = gross * discPct;

  const floor = toNum(document.getElementById('mcFloor').value);
  if(floor>0 && (gross-disc)<floor){ disc = Math.max(0, gross - floor); }

  const fsc = (gross - disc) * fscPct;
  const acc = toNum(document.getElementById('accessorials').value);
  const net = gross - disc + fsc + acc;

  document.getElementById('tGross').textContent = fmt(gross);
  document.getElementById('tDisc').textContent  = fmt(disc);
  document.getElementById('tFloor').textContent = floor>0 ? fmt(floor) : '—';
  document.getElementById('tFsc').textContent   = fmt(fsc);
  document.getElementById('tAcc').textContent   = fmt(acc);
  document.getElementById('tNet').textContent   = fmt(net);
}

function calcDensity(){
  const pcs = Math.max(1, toNum(document.getElementById('pallets').value)||1);
  const L = toNum(document.getElementById('len').value);
  const W = toNum(document.getElementById('wid').value);
  const H = toNum(document.getElementById('hei').value);
  const totalWeight = [...document.querySelectorAll('#items .wgt')].reduce((s,el)=>s+toNum(el.value),0);
  const cubicIn = (L&&W&&H) ? (L*W*H*pcs) : 0;
  const ft3 = cubicIn ? cubicIn/1728 : 0;
  const density = (totalWeight&&ft3) ? totalWeight/ft3 : 0;
  document.getElementById('densityOut').textContent = density ? density.toFixed(2) : '—';
  const dim = cubicIn ? cubicIn/139 : 0;
  document.getElementById('dimOut').textContent = dim ? dim.toFixed(1) : '—';
}

function wire(){
  document.getElementById('addRow').addEventListener('click', addRow);
  document.getElementById('rateBtn').addEventListener('click', ()=>{
    if(!document.querySelector('#items .table-row')){ addRow(); alert('Add at least one class and weight row.'); return; }
    calcTotals();
  });
  document.getElementById('clearBtn').addEventListener('click', ()=>{
    document.getElementById('items').innerHTML='';
    ['discountPct','fscPct','accessorials','originZip','destZip','pallets','len','wid','hei','mcFloor','miles'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value='';
    });
    calcDensity();
    ['tGross','tDisc','tFloor','tFsc','tAcc','tNet'].forEach(id=>document.getElementById(id).textContent='—');
  });
  document.getElementById('rateCsv').addEventListener('change', async ev=>{
    const f = ev.target.files[0]; if(!f) return;
    const text = await f.text();
    const rows = parseCSV(text);
    RATE_TABLE = rows.map(r=>({
      origin_zip3: (r.origin_zip3 || r.origin || r.o_zip3 || '').toString().slice(0,3),
      dest_zip3:   (r.dest_zip3   || r.destination || r.d_zip3 || '').toString().slice(0,3),
      class:       (r.class || r.nmfc_class || '').toString(),
      cwt_rate:    r.cwt_rate || r.cwt || r.rate || r.base_rate || '',
      min_charge:  r.min_charge || r.min || r.mnc || '0'
    })).filter(r=>r.origin_zip3 && r.dest_zip3 && r.class);
    document.getElementById('csvStatus').textContent = 'Loaded ' + RATE_TABLE.length + ' rows.';
  });

  ['pallets','len','wid','hei'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.addEventListener('input', calcDensity);
  });
  addRow();
}
window.addEventListener('DOMContentLoaded', wire);
