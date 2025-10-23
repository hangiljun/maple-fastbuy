/***** CONFIG *****/
// Google Apps Script 최종 배포 주소(googleusercontent)
const BACKEND_URL =
  'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLgCsePn2dKAqn8sdB87dI9OsWc57Qs4W2pYE4V-F1zFJuD65cGyEjEfGB4R_2OxuX97HMZhLq-Ohd1bHAVAUl88XKpUNnugUm2seTzBh_AZ6HRN03H_1Ctn-jbTk_c8lJsxZ2XvMsNCa-eTMxyO7J1ZYYsBj7vLsundmobLz55lYMXqmGh3T_HfR5YLc-UT29ZlAd_YGQaFMI4djIArxaymTkyCtF7D1v8Vj-8-moMHIVijHuUIb_Wc32lzwPwAgtsMGyixrapUnH0GzCp9Fb8KGCdkT_L2L8f_m6xQCWcEU05j__M&lib=M_HeVvk3zo_8-jKmOWvRGHGf4QMM86CMa';

// Apps Script의 ADMIN_TOKEN과 동일해야 함
const BACKEND_ADMIN_TOKEN = 'maple_8246_SUPER_SECRET_1f9c8c2d9e';

// googleusercontent URL은 이미 ?가 있으므로 & 로 action 추가
const withAction = (action) =>
  `${BACKEND_URL}${BACKEND_URL.includes('?') ? '&' : '?'}action=${encodeURIComponent(action)}`;

/***** 공통 *****/
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
const adminStateEl = document.getElementById('adminState');

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function stars(n) {
  const r = Math.max(1, Math.min(5, n | 0));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

/***** API 통신 (네트워크 예외까지 처리) *****/
async function apiList() {
  try {
    const res = await fetch(withAction('list'), { method: 'GET' });
    return await res.json();
  } catch (e) {
    return { ok: false, error: 'NETWORK', detail: e?.message || 'LIST_FAILED' };
  }
}

// 등록: 먼저 정상 CORS로 시도 → 실패 시 no-cors로 재시도(응답은 못 읽지만 등록은 되게 하고 목록 새로고침으로 확인)
async function apiAdd({ name, rating, content }) {
  const bodyStr = new URLSearchParams({
    action: 'add',
    name,
    rating: String(rating),
    content
  }).toString();

  try {
    const res = await fetch(withAction('add'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyStr
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { ok: false, error: 'PARSE_FAIL', raw: text }; }
  } catch (e) {
    // CORS/리다이렉트 등으로 실패 → no-cors 재시도(응답 읽지 않음)
    try {
      await fetch(withAction('add'), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyStr
      });
      // 응답을 못 읽어도 서버에 전송은 됨 → 목록 새로고침으로 확인
      return { ok: true, fallback: true };
    } catch (e2) {
      return { ok: false, error: 'NETWORK', detail: e2?.message || 'ADD_FAILED' };
    }
  }
}

async function apiDelete(id) {
  const bodyStr = new URLSearchParams({
    action: 'delete',
    id,
    adminToken: BACKEND_ADMIN_TOKEN
  }).toString();

  try {
    const res = await fetch(withAction('delete'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyStr
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { ok: false, error: 'PARSE_FAIL', raw: text }; }
  } catch (e) {
    // 삭제도 no-cors 재시도
    try {
      await fetch(withAction('delete'), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyStr
      });
      return { ok: true, fallback: true };
    } catch (e2) {
      return { ok: false, error: 'NETWORK', detail: e2?.message || 'DELETE_FAILED' };
    }
  }
}

/***** 렌더링 *****/
async function renderReviews() {
  if (!listEl) return;

  const resp = await apiList();
  if (!resp.ok) {
    listEl.innerHTML = '<p class="card">후기를 불러오지 못했습니다.</p>';
    return;
  }

  const items = resp.items || [];
  cntEl && (cntEl.textContent = `${items.length}건`);

  if (!items.length) {
    listEl.innerHTML = '<p class="card">아직 후기가 없습니다. 첫 리뷰를 남겨주세요!</p>';
    avgEl && (avgEl.textContent = '-');
    return;
  }

  const avg = items.reduce((s, r) => s + (Number(r.rating) || 0), 0) / items.length;
  avgEl && (avgEl.textContent = `${stars(Math.round(avg))} (${avg.toFixed(1)})`);

  listEl.innerHTML = '';
  items.forEach(r => {
    const div = document.createElement('div');
    const dateStr = new Date(r.ts).toLocaleDateString();
    const delBtn = adminMode
      ? `<button class="del" data-id="${escapeHtml(r.id)}" style="float:right">삭제</button>`
      : '';
    div.className = 'review';
    div.innerHTML = `
      <div class="name">${escapeHtml(r.name)}
        <span class="meta">· ${stars(r.rating)} · ${dateStr}</span>
        ${delBtn}
      </div>
      <div class="content">${escapeHtml(r.content)}</div>`;
    listEl.appendChild(div);
  });

  if (adminMode) {
    listEl.querySelectorAll('button.del').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('정말 삭제하시겠어요?')) return;
        const res = await apiDelete(btn.getAttribute('data-id'));
        if (!res.ok) { alert('삭제 오류:\n' + JSON.stringify(res, null, 2)); return; }
        await renderReviews();
      });
    });
  }
}

/***** 제출 *****/
if (reviewForm) {
  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (formMsg) formMsg.textContent = '';

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
      alert('등록 오류:\n' + JSON.stringify(res, null, 2));
      return;
    }

    // no-cors fallback일 수도 있으니 응답 메시지 대신 목록 갱신으로 확인
    if (formMsg) {
      formMsg.textContent = '등록 요청을 보냈습니다. 잠시 후 목록이 갱신됩니다.';
      setTimeout(() => (formMsg.textContent = ''), 2500);
    }

    reviewForm.reset();
    await renderReviews();
  });
}

/***** 숨김 관리자 모드 (PIN: 8246) *****/
let secretKeys = [];
window.addEventListener('keydown', (e) => {
  secretKeys.push(e.key);
  if (secretKeys.slice(-4).join('') === '8246') {
    const input = prompt('관리자 PIN을 입력하세요:');
    if (input === '8246') {
      adminMode = true;
      alert('관리자 모드 활성화');
      adminStateEl && (adminStateEl.textContent = '관리자 모드: 삭제 가능');
      renderReviews();
    } else {
      alert('PIN이 올바르지 않습니다.');
    }
    secretKeys = [];
  }
});

window.addEventListener('keydown', (e) => {
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

/***** 초기화 *****/
renderReviews();
