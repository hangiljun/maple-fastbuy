/***** CONFIG *****/
const STORAGE_KEY = 'mf_reviews_v1'; // 브라우저 localStorage 키
const ADMIN_PIN = '8246';            // 숨김 관리자 PIN

/***** 유틸 *****/
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

function escapeHtml(s) {
  return (s || '').toString().replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function stars(n){ const r = clamp(parseInt(n||5,10),1,5); return '★'.repeat(r)+'☆'.repeat(5-r); }
function uid(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-6); }

/***** 저장/불러오기 *****/
function loadReviews(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch{ return []; }
}
function saveReviews(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/***** 상태/DOM *****/
let adminMode = false;
const reviewForm   = document.getElementById('reviewForm');
const listEl       = document.getElementById('reviews');
const formMsg      = document.getElementById('formMsg');
const avgEl        = document.getElementById('avgRating');
const cntEl        = document.getElementById('countRating');
const adminStateEl = document.getElementById('adminState');

/***** 렌더링 *****/
function renderReviews(){
  const items = loadReviews().sort((a,b)=> new Date(b.ts) - new Date(a.ts));

  cntEl && (cntEl.textContent = `${items.length}건`);
  if (!items.length){
    listEl.innerHTML = '<p class="card">아직 후기가 없습니다. 첫 리뷰를 남겨주세요!</p>';
    avgEl && (avgEl.textContent = '-');
    return;
  }

  const avg = items.reduce((s,r)=> s + (Number(r.rating)||0), 0) / items.length;
  avgEl && (avgEl.textContent = `${stars(Math.round(avg))} (${avg.toFixed(1)})`);

  listEl.innerHTML = '';
  items.forEach(r=>{
    const div = document.createElement('div');
    div.className = 'review';
    const dt = new Date(r.ts);
    const dateStr = `${dt.getFullYear()}.${(dt.getMonth()+1).toString().padStart(2,'0')}.${dt.getDate().toString().padStart(2,'0')}`;
    const delBtn = adminMode ? `<button class="del" data-id="${escapeHtml(r.id)}">삭제</button>` : '';
    div.innerHTML = `
      <div class="name">${escapeHtml(r.name || '익명')}
        <span class="meta">· ${stars(r.rating)} · ${dateStr}</span>
        ${delBtn}
      </div>
      <div class="content">${escapeHtml(r.content || '')}</div>
    `;
    listEl.appendChild(div);
  });

  // 삭제 핸들러(관리자 모드에서만)
  if (adminMode){
    listEl.querySelectorAll('button.del').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-id');
        if (!confirm('정말 삭제하시겠어요?')) return;
        const next = loadReviews().filter(x=> x.id !== id);
        saveReviews(next);
        renderReviews();
      });
    });
  }

  adminStateEl && (adminStateEl.textContent = adminMode ? '관리자 모드: 삭제 가능' : '');
}

/***** 제출 *****/
if (reviewForm){
  reviewForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    formMsg && (formMsg.textContent = '');

    const name    = document.getElementById('name').value.trim().slice(0,20) || '익명';
    const rating  = clamp(parseInt(document.getElementById('rating').value,10)||5,1,5);
    const content = document.getElementById('content').value.trim().slice(0,1000);
    if (!content){
      formMsg ? (formMsg.textContent='후기를 입력해주세요.') : alert('후기를 입력해주세요.');
      return;
    }

    const entry = { id: uid(), name, rating, content, ts: new Date().toISOString() };
    const next = [entry, ...loadReviews()];
    saveReviews(next);

    reviewForm.reset();
    if (formMsg){
      formMsg.textContent = '등록되었습니다. 감사합니다!';
      setTimeout(()=> formMsg.textContent = '', 1800);
    }
    renderReviews();
  });
}

/***** 관리자 모드(숨김) *****/
// 키보드로 숫자 8246 입력 시 관리자 모드 ON
let secret = [];
window.addEventListener('keydown', (e)=>{
  secret.push(e.key);
  if (secret.slice(-4).join('') === ADMIN_PIN){
    const pin = prompt('관리자 PIN을 입력하세요:');
    if (pin === ADMIN_PIN){
      adminMode = true;
      alert('관리자 모드가 활성화되었습니다. (삭제 버튼 표시)');
      renderReviews();
    }else{
      alert('PIN이 올바르지 않습니다.');
    }
    secret = [];
  }
});

// Ctrl+Alt+A : 관리자 모드 토글
window.addEventListener('keydown', (e)=>{
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a'){
    const pin = prompt('관리자 PIN을 입력하세요:');
    if (pin === ADMIN_PIN){
      adminMode = !adminMode;
      alert(adminMode ? '관리자 모드 ON' : '관리자 모드 OFF');
      renderReviews();
    }
  }
});

// Ctrl+Alt+D : 전체 초기화(관리자만)
window.addEventListener('keydown', (e)=>{
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'd'){
    const pin = prompt('전체 초기화 PIN을 입력하세요:');
    if (pin === ADMIN_PIN){
      if (confirm('정말 모든 후기를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')){
        saveReviews([]);
        renderReviews();
        alert('모든 후기가 삭제되었습니다.');
      }
    }
  }
});

/***** 초기화 *****/
renderReviews();
