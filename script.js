// ===== 공통: 푸터 =====
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===== 홈: 복사 =====
const copyBtn = document.getElementById('copyBtn');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('HAN8246');
      alert('카카오 아이디가 복사되었습니다: HAN8246');
    } catch {
      alert('복사에 실패했습니다. 직접 입력해주세요: HAN8246');
    }
  });
}

// ===== 후기 게시판 =====
const REVIEWS_KEY = 'maple_fastbuy_reviews_v4';
const ADMIN_PIN = '8246';

const reviewForm = document.getElementById('reviewForm');
const listEl = document.getElementById('reviews');
const formMsg = document.getElementById('formMsg');
const avgEl = document.getElementById('avgRating');
const cntEl = document.getElementById('countRating');
const adminStateEl = document.getElementById('adminState');
let adminMode = false;
let adminVisible = false;

// 안전 escape
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function loadReviews() {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveReviews(arr) {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(arr));
}

function updateSummary() {
  const data = loadReviews();
  const n = data.length;
  cntEl.textContent = `${n}건`;
  if (!n) {
    avgEl.textContent = '-';
    return;
  }
  const avg = data.reduce((s, r) => s + (r.rating || 0), 0) / n;
  const stars = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
  avgEl.textContent = `${stars} (${avg.toFixed(1)})`;
}

function renderReviews() {
  const data = loadReviews();
  listEl.innerHTML = data.length ? '' : '<p class="card">아직 후기가 없습니다. 첫 리뷰를 남겨주세요!</p>';

  data.slice().reverse().forEach((r, idxFromEnd) => {
    const originalIndex = data.length - 1 - idxFromEnd;
    const div = document.createElement('div');
    div.className = 'review';
    const dateStr = new Date(r.ts).toLocaleDateString();
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const delBtn = adminMode
      ? `<button data-del="${originalIndex}" style="float:right">삭제</button>`
      : '';
    div.innerHTML = `
      <div class="name">${escapeHtml(r.name)} 
        <span class="meta">· ${stars} · ${dateStr}</span>
        ${delBtn}
      </div>
      <div class="content">${escapeHtml(r.content)}</div>
    `;
    listEl.appendChild(div);
  });

  if (adminMode) {
    listEl.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.getAttribute('data-del'), 10);
        const arr = loadReviews();
        if (!Number.isInteger(i) || i < 0 || i >= arr.length) return;
        arr.splice(i, 1);
        saveReviews(arr);
        renderReviews();
      });
    });
  }
  updateSummary();
}

if (reviewForm) {
  reviewForm.addEventListener('submit', e => {
    e.preventDefault();
    formMsg.textContent = '';
    const fd = new FormData(reviewForm);
    const name = (fd.get('name') || '').toString().trim().slice(0, 20) || '익명';
    const rating = parseInt(fd.get('rating'), 10) || 5;
    const content = (fd.get('content') || '').toString().trim().slice(0, 300);
    if (!content) {
      formMsg.textContent = '후기를 입력해주세요.';
      return;
    }
    const entry = { name, rating, content, ts: Date.now() };
    const arr = loadReviews();
    arr.push(entry);
    saveReviews(arr);
    reviewForm.reset();
    formMsg.textContent = '등록되었습니다. 감사합니다!';
    setTimeout(() => (formMsg.textContent = ''), 2000);
    renderReviews();
  });
}

// ===== 숨겨진 관리자 모드 트리거 =====
// 방법 1: Shift + 8 + 2 + 4 + 6
let secretKeys = [];
window.addEventListener('keydown', e => {
  secretKeys.push(e.key);
  if (secretKeys.slice(-4).join('') === '8246') {
    const input = prompt('관리자 PIN을 입력하세요:');
    if (input === ADMIN_PIN) {
      adminMode = true;
      alert('관리자 모드 활성화됨');
      if (adminStateEl) adminStateEl.textContent = '관리자 모드: 삭제 가능';
      renderReviews();
    } else {
      alert('PIN이 올바르지 않습니다.');
    }
    secretKeys = [];
  }
});

// 방법 2: Ctrl + Alt + A (단축키)
window.addEventListener('keydown', e => {
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a') {
    const input = prompt('관리자 PIN을 입력하세요:');
    if (input === ADMIN_PIN) {
      adminMode = !adminMode;
      alert(adminMode ? '관리자 모드 ON' : '관리자 모드 OFF');
      if (adminStateEl)
        adminStateEl.textContent = adminMode ? '관리자 모드: 삭제 가능' : '일반 모드';
      renderReviews();
    }
  }
});

renderReviews();
