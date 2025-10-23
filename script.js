/***** CONFIG *****/
// ← 본인 Apps Script 웹앱 URL (고정)
const BACKEND_URL =
  'https://script.google.com/macros/s/AKfycbzrSorTKSzra0SohS883QTBviEl6u174Inc-Z0in14exezm-IlqsNZfcRK2s2pLiCby/exec';

// ← Apps Script Code.gs의 ADMIN_TOKEN과 동일하게
const BACKEND_ADMIN_TOKEN = 'maple_8246_SUPER_SECRET_1f9c8c2d9e';

/***** 공통: 푸터 년도 *****/
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/***** 홈: 카카오 아이디 복사 *****/
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

/***** 후기 상태 *****/
let adminMode = false;
const reviewForm = document.getElementById('reviewForm');
const listEl = document.getElementById('reviews');
const formMsg = document.getElementById('formMsg');
const avgEl = document.getElementById('avgRating');
const cntEl = document.getElementById('countRating');
const adminStateEl = document.getElementById('adminState'); // 없어도 무방

/***** 유틸 *****/
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function stars(n) {
  const r = Math.max(1, Math.min(5, n | 0));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

/***** 서버 통신 (폼 전송 + action을 URL/본문 모두에 포함) *****/
async function apiList() {
  const res = await fetch(`${BACKEND_URL}?action=list`, { method: 'GET' });
  return res.json(); // { ok, items:[...] }
}

async function apiAdd({ name, rating, content }) {
  // ▶ action을 본문에도 포함
  const body = new URLSearchParams({
    action: 'add',
    name,
    rating: String(rating),
    content
  });
  const res = await fetch(`${BACKEND_URL}?action=add`, { method: 'POST', body });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: false, error: 'PARSE_FAIL', raw: text }; }
}

async function apiDelete(id) {
  // ▶ action을 본문에도 포함
  const body = new URLSearchParams({
    action: 'delete',
    id,
    adminToken: BACKEND_ADMIN_TOKEN
  });
  const res = await fetch(`${BACKEND_URL}?action=delete`, { method: 'POST', body });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: false, error: 'PARSE_FAIL', raw: text }; }
}

/***** 렌더링 *****/
async function renderReviews() {
  if (!listEl) return;

  try {
    const { ok, items = [] } = await apiList();
    if (!ok) throw 0;

    // 총 개수 / 평균 별점
    cntEl && (cntEl.textContent = `${items.length}건`);
    if (!items.length) {
      listEl.innerHTML = '<p class="card">아직 후기가 없습니다. 첫 리뷰를 남겨주세요!</p>';
      avgEl && (avgEl.textContent = '-');
      return;
    }
    const avg = items.reduce((s, r) => s + (Number(r.rating) || 0), 0) / items.length;
    avgEl && (avgEl.textContent = `${stars(Math.round(avg))} (${avg.toFixed(1)})`);

    // 목록
    listEl.innerHTML = '';
    items.forEach(r => {
      const div = document.createElement('div');
      div.className = 'review';
      const dateStr = new Date(r.ts).toLocaleDateString();
      const delBtn = adminMode
        ? `<button class="del" data-id="${escapeHtml(r.id)}" style="float:right">삭제</button>`
        : '';
      div.innerHTML = `
        <div class="name">
          ${escapeHtml(r.name)}
          <span class="meta">· ${stars(r.rating)} · ${dateStr}</span>
          ${delBtn}
        </div>
        <div class="content">${escapeHtml(r.content)}</div>
      `;
      listEl.appendChild(div);
    });

    // 관리자 삭제
    if (adminMode) {
      listEl.querySelectorAll('button.del').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('정말 삭제하시겠어요?')) return;
          const id = btn.getAttribute('data-id');
          const res = await apiDelete(id);
          if (!res.ok) {
            alert('삭제 오류: ' + (res.error || res.raw || '알 수 없음'));
            return;
          }
          await renderReviews();
        });
      });
    }
  } catch {
    listEl.innerHTML = '<p class="card">후기를 불러오지 못했습니다.</p>';
  }
}

/***** 제출 *****/
if (reviewForm) {
  reviewForm.addEventListener('submit', async e => {
    e.preventDefault();
    formMsg && (formMsg.textContent = '');

    const fd = new FormData(reviewForm);
    const name = (fd.get('name') || '').toString().trim().slice(0, 20) || '익명';
    const rating = parseInt(fd.get('rating'), 10) || 5;
    const content = (fd.get('content') || '').toString().trim().slice(0, 1000);

    if (!content) {
      formMsg ? (formMsg.textContent = '후기를 입력해주세요.') : alert('후기를 입력해주세요.');
      return;
    }

    const res = await apiAdd({ name, rating, content });
    if (!res.ok) {
      alert('등록 오류: ' + (res.error || res.raw || '알 수 없음'));
      return;
    }

    reviewForm.reset();
    if (formMsg) {
      formMsg.textContent = '등록되었습니다. 감사합니다!';
      setTimeout(() => (formMsg.textContent = ''), 2000);
    }
    await renderReviews();
  });
}

/***** 숨겨진 관리자 모드 (PIN: 8246) *****/
// 숫자 8246 연속 입력
let secretKeys = [];
window.addEventListener('keydown', e => {
  secretKeys.push(e.key);
  if (secretKeys.slice(-4).join('') === '8246') {
    const input = prompt('관리자 PIN을 입력하세요:');
    if (input === '8246') {
      adminMode = true;
      alert('관리자 모드 활성화 (삭제 버튼 표시)');
      adminStateEl && (adminStateEl.textContent = '관리자 모드: 삭제 가능');
      renderReviews();
    } else {
      alert('PIN이 올바르지 않습니다.');
    }
    secretKeys = [];
  }
});

// Ctrl + Alt + A 토글
window.addEventListener('keydown', e => {
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a') {
    const input = prompt('관리자 PIN을 입력하세요:');
    if (input === '8246') {
      adminMode = !adminMode;
      alert(adminMode ? '관리자 모드 ON' : '관리자 모드 OFF');
      adminStateEl &&
        (adminStateEl.textContent = adminMode ? '관리자 모드: 삭제 가능' : '일반 모드');
      renderReviews();
    }
  }
});

/***** 초기 로드 *****/
renderReviews();
