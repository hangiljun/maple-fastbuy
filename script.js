// ===== 공통: 푸터 년도 =====
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===== 홈: 카카오 아이디 복사 =====
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

// ===== 후기 게시판 (Local) =====
const REVIEWS_KEY = 'maple_fastbuy_reviews_v3'; // 버전업 (기존과 구분)
const ADMIN_PIN = '8246'; // ⚠️ 원하는 값으로 변경

const reviewForm = document.getElementById('reviewForm');
const listEl = document.getElementById('reviews');
const formMsg = document.getElementById('formMsg');
const avgEl = document.getElementById('avgRating');
const cntEl = document.getElementById('countRating');

const adminForm = document.getElementById('adminForm');
const adminPinEl = document.getElementById('adminPin');
const adminOffBtn = document.getElementById('adminOff');
const adminStateEl = document.getElementById('adminState');

let adminMode = false;

// 안전 이스케이프
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// 저장/불러오기
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

// 평균/개수 업데이트
function updateSummary() {
  if (!avgEl || !cntEl) return;
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

// 렌더링 + 관리자 삭제 버튼
function renderReviews() {
  if (!listEl) return;
  const data = loadReviews();
  listEl.innerHTML = data.length ? '' : '<p class="card">아직 후기가 없습니다. 첫 리뷰를 남겨주세요!</p>';

  data.slice().reverse().forEach((r, idxFromEnd) => {
    // 원본 인덱스 계산
    const originalIndex = data.length - 1 - idxFromEnd;

    const div = document.createElement('div');
    div.className = 'review';
    const dateStr = new Date(r.ts).toLocaleDateString();
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);

    // 관리자 모드일 때만 삭제 버튼 노출
    const delBtn = adminMode ? `<button data-del="${originalIndex}" style="float:right">삭제</button>` : '';

    div.innerHTML = `
      <div class="name">
        ${escapeHtml(r.name)}
        <span class="meta">· ${stars} · ${dateStr}</span>
        ${delBtn}
      </div>
      <div class="content">${escapeHtml(r.content)}</div>
    `;
    listEl.appendChild(div);
  });

  // 삭제 버튼 이벤트 바인딩
  if (adminMode) {
    listEl.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.getAttribute('data-del'), 10);
        const arr = loadReviews();
        if (!Number.isInteger(i) || i < 0 || i >= arr.length) return;
        // 해당 항목 삭제
        arr.splice(i, 1);
        saveReviews(arr);
        renderReviews();
      });
    });
  }

  updateSummary();
}

// 폼 제출
if (reviewForm) {
  reviewForm.addEventListener('submit', e => {
    e.preventDefault();
    formMsg && (formMsg.textContent = '');

    const fd = new FormData(reviewForm);
    const name = (fd.get('name') || '').toString().trim().slice(0, 20) || '익명';
    const rating = parseInt(fd.get('rating'), 10) || 5;
    const content = (fd.get('content') || '').toString().trim().slice(0, 300);

    if (!content) {
      if (formMsg) formMsg.textContent = '후기를 입력해주세요.';
      else alert('후기를 입력해주세요.');
      return;
    }

    const entry = { name, rating, content, ts: Date.now() };
    const arr = loadReviews();
    arr.push(entry);
    saveReviews(arr);

    reviewForm.reset();
    if (formMsg) {
      formMsg.textContent = '등록되었습니다. 감사합니다!';
      setTimeout(() => (formMsg.textContent = ''), 2000);
    }

    renderReviews();
  });
}

// 관리자 모드 on/off
if (adminForm) {
  adminForm.addEventListener('submit', e => {
    e.preventDefault();
    const pin = (adminPinEl?.value || '').trim();
    if (pin === ADMIN_PIN) {
      adminMode = true;
      adminStateEl && (adminStateEl.textContent = '관리자 모드: 삭제 가능');
      adminOffBtn && (adminOffBtn.style.display = 'inline-block');
      renderReviews();
    } else {
      alert('PIN이 올바르지 않습니다.');
    }
  });
}
if (adminOffBtn) {
  adminOffBtn.addEventListener('click', () => {
    adminMode = false;
    adminStateEl && (adminStateEl.textContent = '일반 모드');
    adminOffBtn.style.display = 'none';
    renderReviews();
  });
}

// 초기 렌더
renderReviews();
