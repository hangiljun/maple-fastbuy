/***** CONFIG *****/
const STORAGE_KEY = 'mf_reviews_v2'; // 버전업: v2로 키 분리
const ADMIN_PIN = '8246';

/***** 공통/유틸 *****/
const $ = (sel)=>document.querySelector(sel);
const $$ = (sel)=>document.querySelectorAll(sel);
const yearEl = $('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();
const toastEl = $('#toast');

function toast(msg){
  if (!toastEl) return alert(msg);
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(()=>toastEl.classList.remove('show'), 1800);
}

function escapeHtml(s){
  return (s||'').toString().replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
function stars(n){const r=clamp(parseInt(n||5,10),1,5);return '★'.repeat(r)+'☆'.repeat(5-r);}
function uid(){return Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-6);}

/***** 저장/불러오기 *****/
function loadReviews(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function saveReviews(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/***** 상태/DOM *****/
let adminMode = false;
const reviewForm   = $('#reviewForm');
const listEl       = $('#reviews');
const formMsg      = $('#formMsg');
const avgEl        = $('#avgRating');
const cntEl        = $('#countRating');
const adminStateEl = $('#adminState');
const adminToolbar = $('#adminToolbar');
const fileInput    = $('#fileInput');

/***** 렌더링 *****/
function renderReviews(){
  const items = loadReviews().sort((a,b)=> new Date(b.ts) - new Date(a.ts));

  // 통계
  cntEl && (cntEl.textContent = `${items.length}건`);
  if (!items.length){
    listEl.innerHTML = '<div class="center-muted card pad">아직 후기가 없습니다. 첫 후기를 남겨주세요! 🎉</div>';
    avgEl && (avgEl.textContent = '-');
    return;
  }
  const avg = items.reduce((s,r)=> s + (Number(r.rating)||0), 0) / items.length;
  avgEl && (avgEl.textContent = `${stars(Math.round(avg))} (${avg.toFixed(1)})`);

  // 목록
  listEl.innerHTML = '';
  items.forEach(r=>{
    const dt = new Date(r.ts);
    const dateStr = `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;

    const wrap = document.createElement('div');
    wrap.className = 'review';
    wrap.innerHTML = `
      <div class="name">
        ${escapeHtml(r.name || '익명')}
        <span class="meta">· ${stars(r.rating)} · ${dateStr}</span>
        ${adminMode ? `<button class="btn small danger" data-id="${escapeHtml(r.id)}" style="float:right">삭제</button>` : ''}
      </div>
      <div class="content">${escapeHtml(r.content || '')}</div>
    `;
    listEl.appendChild(wrap);
  });

  // 삭제(관리자 모드에서만 활성)
  if (adminMode){
    listEl.querySelectorAll('button[data-id]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-id');
        const now = loadReviews();
        const target = now.find(x=>x.id===id);
        if (!target) { toast('이미 삭제되었거나 찾을 수 없습니다.'); return; }
        if (!confirm(`이 후기를 삭제할까요?\n\n"${target.content.slice(0,50)}${target.content.length>50?'…':''}"`)) return;
        saveReviews(now.filter(x=>x.id!==id)); // ✅ 개별 삭제
        renderReviews();
        toast('후기 1건을 삭제했습니다.');
      });
    });
  }

  // 관리자 UI 토글
  adminStateEl.style.display = adminMode ? 'inline-flex' : 'none';
  adminToolbar.style.display = adminMode ? 'flex' : 'none';
}

/***** 폼 제출 *****/
if (reviewForm){
  reviewForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    formMsg && (formMsg.textContent = '');

    const name    = $('#name').value.trim().slice(0,20) || '익명';
    const rating  = clamp(parseInt($('#rating').value,10)||5,1,5);
    const content = $('#content').value.trim().slice(0,1000);
    if (!content){
      formMsg ? (formMsg.textContent = '후기를 입력해주세요.') : toast('후기를 입력해주세요.');
      return;
    }

    const entry = { id: uid(), name, rating, content, ts: new Date().toISOString() };
    const next = [entry, ...loadReviews()];
    saveReviews(next);

    reviewForm.reset();
    formMsg && (formMsg.textContent = '등록되었습니다!'); setTimeout(()=>formMsg.textContent='', 1600);
    renderReviews();
    toast('후기 등록 완료');
  });
}

/***** 관리자 모드 (숨김 PIN 8246) *****/
// 숫자 8246 입력 시 관리자 모드 ON
let secret = [];
window.addEventListener('keydown', (e)=>{
  secret.push(e.key);
  if (secret.slice(-4).join('') === ADMIN_PIN){
    const pin = prompt('관리자 PIN을 입력하세요:');
    if (pin === ADMIN_PIN){
      adminMode = true;
      toast('관리자 모드 활성화');
      renderReviews();
    }else{
      toast('PIN이 올바르지 않습니다.');
    }
    secret = [];
  }
});
// Ctrl+Alt+A : 관리자 모드 토글
window.addEventListener('keydown', (e)=>{
  if (e.ctrlKey && e.altKey && e.key.toLowerCase()==='a'){
    const pin = prompt('관리자 PIN을 입력하세요:');
    if (pin === ADMIN_PIN){
      adminMode = !adminMode;
      toast(adminMode ? '관리자 모드 ON' : '관리자 모드 OFF');
      renderReviews();
    }
  }
});

/***** 관리자 툴바: 전체삭제/백업/복원 *****/
$('#btnClear')?.addEventListener('click', ()=>{
  if (!adminMode) return;
  if (confirm('정말 모든 후기를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')){
    saveReviews([]);
    renderReviews();
    toast('모든 후기를 삭제했습니다.');
  }
});

$('#btnExport')?.addEventListener('click', ()=>{
  if (!adminMode) return;
  const data = JSON.stringify(loadReviews(), null, 2);
  const blob = new Blob([data], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `reviews-backup-${new Date().toISOString().slice(0,19)}.json`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  toast('백업 파일을 내려받았습니다.');
});

$('#btnImport')?.addEventListener('click', ()=>{
  if (!adminMode) return;
  fileInput?.click();
});
fileInput?.addEventListener('change', (e)=>{
  const f = e.target.files?.[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const parsed = JSON.parse(String(reader.result||'[]'));
      if (!Array.isArray(parsed)) throw new Error('형식 오류');
      saveReviews(parsed.map(r=>({
        id: r.id || uid(),
        name: String(r.name||'익명').slice(0,20),
        rating: clamp(parseInt(r.rating,10)||5,1,5),
        content: String(r.content||'').slice(0,1000),
        ts: r.ts || new Date().toISOString()
      })));
      renderReviews();
      toast('복원 완료');
    }catch(err){
      toast('복원 실패: 올바른 JSON 파일인지 확인하세요.');
    }
  };
  reader.readAsText(f);
});

/***** 초기화 *****/
renderReviews();
