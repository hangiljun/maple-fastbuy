// 공통: 푸터 년도
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();


// 홈: 카카오 아이디 복사
const copyBtn = document.getElementById('copyBtn');
if (copyBtn) {
copyBtn.addEventListener('click', async () => {
try { await navigator.clipboard.writeText('HAN8246'); alert('카카오 아이디가 복사되었습니다: HAN8246'); }
catch { alert('복사에 실패했습니다. 직접 입력해주세요: HAN8246'); }
});
}


// 후기 게시판 로직 (LocalStorage)
const REVIEWS_KEY = 'maple_fastbuy_reviews_v1';
const reviewForm = document.getElementById('reviewForm');
const listEl = document.getElementById('reviews');


function loadReviews(){
const arr = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
return Array.isArray(arr)?arr:[];
}
function saveReviews(arr){ localStorage.setItem(REVIEWS_KEY, JSON.stringify(arr)); }
function renderReviews(){
if(!listEl) return;
const data = loadReviews();
listEl.innerHTML = data.length? '' : '<p class="card">아직 후기가 없습니다. 첫 리뷰를 남겨주세요!</p>';
data.slice().reverse().forEach(r=>{
const div = document.createElement('div');
div.className='review';
div.innerHTML = `
<div class="name">${escapeHtml(r.name)} <span class="meta">· ${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)} · ${new Date(r.ts).toLocaleDateString()}</span></div>
<div class="content">${escapeHtml(r.content)}</div>
`;
listEl.appendChild(div);
});
}
function escapeHtml(s){return s.replace(/[&<>"]+/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}


if(reviewForm){
reviewForm.addEventListener('submit', e=>{
e.preventDefault();
const fd = new FormData(reviewForm);
const name = (fd.get('name')||'').toString().trim().slice(0,20) || '익명';
const rating = parseInt(fd.get('rating'),10)||5;
const content = (fd.get('content')||'').toString().trim().slice(0,300);
if(!content){ alert('후기를 입력해주세요.'); return; }
const arr = loadReviews();
arr.push({name,rating,content,ts:Date.now()});
saveReviews(arr);
reviewForm.reset();
renderReviews();
});
renderReviews();
}
