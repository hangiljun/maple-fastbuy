/***** CONFIG *****/
const BACKEND_URL =
  'https://script.google.com/macros/s/AKfycbzrSorTKSzra0SohS883QTBviEl6u174Inc-Z0in14exezm-IlqsNZfcRK2s2pLiCby/exec';
const BACKEND_ADMIN_TOKEN = 'maple_8246_SUPER_SECRET_1f9c8c2d9e';

/***** 공통 *****/
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/***** 홈: 복사 *****/
const copyBtn = document.getElementById('copyBtn');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('HAN8246'); alert('카카오 아이디가 복사되었습니다: HAN8246'); }
    catch { alert('복사에 실패했습니다. 직접 입력해주세요: HAN8246'); }
  });
}

/***** 후기 상태 *****/
let adminMode = false;
const reviewForm = document.getElementById('reviewForm');
const listEl = document.getElementById('reviews');
const formMsg = document.getElementById('formMsg');
const avgEl = document.getElementById('avgRating');
const cntEl = document.getElementById('countRating');
const adminStateEl = document.getElementById('adminState');

function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function stars(n){const r=Math.max(1,Math.min(5,n|0));return'★'.repeat(r)+'☆'.repeat(5-r);}

/***** API *****/
async function apiList(){
  const res = await fetch(`${BACKEND_URL}?action=list`, { method:'GET' });
  return res.json();
}
async function apiAdd({name, rating, content}){
  const body = new URLSearchParams({ action:'add', name, rating:String(rating), content });
  const res = await fetch(`${BACKEND_URL}?action=add`, { method:'POST', body });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok:false, error:'PARSE_FAIL', raw:text }; }
}
async function apiDelete(id){
  const body = new URLSearchParams({ action:'delete', id, adminToken: BACKEND_ADMIN_TOKEN });
  const res = await fetch(`${BACKEND_URL}?action=delete`, { method:'POST', body });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok:false, error:'PARSE_FAIL', raw:text }; }
}

/***** 렌더 *****/
async function renderReviews(){
  if (!listEl) return;
  try {
    const { ok, items=[] } = await apiList();
    if (!ok) throw 0;

    cntEl && (cntEl.textContent = `${items.length}건`);
    if (!items.length){ listEl.innerHTML='<p class="card">아직 후기가 없습니다. 첫 리뷰를 남겨주세요!</p>'; avgEl&&(avgEl.textContent='-'); return; }

    const avg = items.reduce((s,r)=>s+(Number(r.rating)||0),0)/items.length;
    avgEl && (avgEl.textContent = `${stars(Math.round(avg))} (${avg.toFixed(1)})`);

    listEl.innerHTML = '';
    items.forEach(r=>{
      const div = document.createElement('div');
      const dateStr = new Date(r.ts).toLocaleDateString();
      const delBtn = adminMode ? `<button class="del" data-id="${escapeHtml(r.id)}" style="float:right">삭제</button>`:'';
      div.className='review';
      div.innerHTML = `<div class="name">${escapeHtml(r.name)} <span class="meta">· ${stars(r.rating)} · ${dateStr}</span> ${delBtn}</div>
                       <div class="content">${escapeHtml(r.content)}</div>`;
      listEl.appendChild(div);
    });

    if (adminMode){
      listEl.querySelectorAll('button.del').forEach(btn=>{
        btn.addEventListener('click', async ()=>{
          if (!confirm('정말 삭제하시겠어요?')) return;
          const res = await apiDelete(btn.getAttribute('data-id'));
          if (!res.ok){ alert('삭제 오류:\n'+JSON.stringify(res,null,2)); return; }
          await renderReviews();
        });
      });
    }
  } catch {
    listEl.innerHTML = '<p class="card">후기를 불러오지 못했습니다.</p>';
  }
}

/***** 제출 *****/
if (reviewForm){
  reviewForm.addEventListener('submit', async e=>{
    e.preventDefault();
    formMsg && (formMsg.textContent='');

    const fd = new FormData(reviewForm);
    const name = (fd.get('name')||'').toString().trim().slice(0,20) || '익명';
    const rating = parseInt(fd.get('rating'),10) || 5;
    const content = (fd.get('content')||'').toString().trim().slice(0,1000);
    if (!content){ formMsg ? formMsg.textContent='후기를 입력해주세요.' : alert('후기를 입력해주세요.'); return; }

    const res = await apiAdd({name,rating,content});
    if (!res.ok){ alert('등록 오류:\n'+JSON.stringify(res,null,2)); return; }

    reviewForm.reset();
    if (formMsg){ formMsg.textContent='등록되었습니다. 감사합니다!'; setTimeout(()=>formMsg.textContent='',2000); }
    await renderReviews();
  });
}

/***** 숨김 관리자 모드 (PIN: 8246) *****/
let secretKeys=[];
window.addEventListener('keydown', e=>{
  secretKeys.push(e.key);
  if (secretKeys.slice(-4).join('')==='8246'){
    const input = prompt('관리자 PIN을 입력하세요:');
    if (input==='8246'){ adminMode=true; alert('관리자 모드 활성화'); adminStateEl&&(adminStateEl.textContent='관리자 모드: 삭제 가능'); renderReviews(); }
    else alert('PIN이 올바르지 않습니다.');
    secretKeys=[];
  }
});
window.addEventListener('keydown', e=>{
  if (e.ctrlKey && e.altKey && e.key.toLowerCase()==='a'){
    const input = prompt('관리자 PIN을 입력하세요:');
    if (input==='8246'){ adminMode=!adminMode; alert(adminMode?'관리자 모드 ON':'관리자 모드 OFF'); adminStateEl&&(adminStateEl.textContent=adminMode?'관리자 모드: 삭제 가능':'일반 모드'); renderReviews(); }
  }
});

/***** init *****/
renderReviews();
