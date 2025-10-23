/***** CONFIG *****/
// ⬇⬇ 네가 준 "리다이렉트된" googleusercontent 전체 URL (그대로 사용)
const BACKEND_URL =
  'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLhZ2lWEOY6Pudjane0L4m_h3Dfb_Agcecpi9_dESzHJsNHdTNTLTx0f37m7Xf-DdDHXuud5eX_MLnzS9AEmQNs9pYzHmGOL24fxtHTD8ScQaDS6FSieLautg3ZTZXplec3oXxM3fTQmAFpYsycVwg4JCir_yN1QkhbFi-BHbYb8IVelzTKZmxdCJVezd7uGYDng2ouzsJd-FVUsf8GuQ0FAoqYUCLQztZzPl0HbdF77uF2s1LEWLdTyRhhw6acbXZzNwV0JPGRLx2C8OasvVXrDO7huhA&lib=M_HeVvk3zo_8-jKmOWvRGHGf4QMM86CMa';

// Apps Script Code.gs 의 ADMIN_TOKEN 과 동일해야 함 (삭제용)
const BACKEND_ADMIN_TOKEN = 'maple_8246_SUPER_SECRET_1f9c8c2d9e';

// 쿼리스트링 유틸
const qs = (obj) =>
  Object.entries(obj).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
const withQ = (params) =>
  `${BACKEND_URL}${BACKEND_URL.includes('?') ? '&' : '?'}${qs(params)}`;

/***** 공통 *****/
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const copyBtn = document.getElementById('copyBtn');
if (copyBtn) {
  copyBtn.addEventListener('click', async()=>{
    try { await navigator.clipboard.writeText('HAN8246'); alert('카카오 아이디가 복사되었습니다: HAN8246'); }
    catch { alert('복사에 실패했습니다. 직접 입력해주세요: HAN8246'); }
  });
}

/***** 후기 상태/DOM *****/
let adminMode = false;
const reviewForm   = document.getElementById('reviewForm');
const listEl       = document.getElementById('reviews');
const formMsg      = document.getElementById('formMsg');
const avgEl        = document.getElementById('avgRating');
const cntEl        = document.getElementById('countRating');
const adminStateEl = document.getElementById('adminState');

const escapeHtml = (s) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[c]));
const clampStar = (n)=>Math.max(1,Math.min(5,n|0));
const stars = (n) => '★'.repeat(clampStar(n)) + '☆'.repeat(5 - clampStar(n));

/***** API (CORS 프리: 모두 GET) *****/
async function apiList() {
  const url = withQ({ action:'list', t: Date.now() });
  try {
    const res = await fetch(url, { method:'GET', cache:'no-store' });
    const text = await res.text();
    try { return JSON.parse(text); }
    catch (e) {
      console.error('list parse error', { url, text, e });
      return { ok:false, error:'PARSE_FAIL', raw:text };
    }
  } catch (e) {
    console.error('list network error', e);
    return { ok:false, error:'NETWORK' };
  }
}

async function apiAdd({ name, rating, content }) {
  const url = withQ({ action:'add', name, rating:String(rating), content, t: Date.now() });
  try {
    const res = await fetch(url, { method:'GET', cache:'no-store' });
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { return { ok:true, via:'GET_RAW' }; } // 일부 환경에서 JSON 미지정 시
  } catch (e) {
    console.error('add network error', e);
    return { ok:false, error:'NETWORK' };
  }
}

async function apiDelete(id) {
  const url = withQ({ action:'delete', id, adminToken: BACKEND_ADMIN_TOKEN, t: Date.now() });
  try {
    const res = await fetch(url, { method:'GET', cache:'no-store' });
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { return { ok:true, via:'GET_RAW' }; }
  } catch (e) {
    console.error('delete network error', e);
    return { ok:false, error:'NETWORK' };
  }
}

/***** 렌더링 *****/
async function renderReviews() {
  if (!listEl) return;

  const resp = await apiList();
  if (!resp.ok) {
    listEl.innerHTML = `<p class="card">후기를 불러오지 못했습니다.<br><small>${escapeHtml(resp.error || 'UNKNOWN')}</small></p>`;
    return;
  }

  const items = resp.items || [];
  cntEl && (cntEl.textContent = `${items.length}건`);

  if (!items.length) {
    listEl.innerHTML = '<p class="card">아직 후기가 없습니다. 첫 리뷰를 남겨주세요!</p>';
    avgEl && (avgEl.textContent = '-');
    return;
  }

  const avg = items.reduce((s,r)=>s+(Number(r.rating)||0),0) / items.length;
  avgEl && (avgEl.textContent = `${stars(Math.round(avg))} (${avg.toFixed(1)})`);

  listEl.innerHTML = '';
  items.forEach(r => {
    const div = document.createElement('div');
    const dateStr = new Date(r.ts).toLocaleDateString();
    const delBtn = adminMode ? `<button class="del" data-id="${escapeHtml(r.id)}" style="float:right">삭제</button>` : '';
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
  reviewForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (formMsg) formMsg.textContent = '';

    const fd = new FormData(reviewForm);
    const name = (fd.get('name') || '').toString().trim().slice(0,20) || '익명';
    const rating = parseInt(fd.get('rating'), 10) || 5;
    const content = (fd.get('content') || '').toString().trim().slice(0,1000);

    if (!content) {
      formMsg ? (formMsg.textContent = '후기를 입력해주세요.') : alert('후기를 입력해주세요.');
      return;
    }

    const res = await apiAdd({ name, rating, content });
    if (!res.ok) {
      alert('등록 오류:\n' + JSON.stringify(res, null, 2));
      return;
    }

    reviewForm.reset();
    if (formMsg) {
      formMsg.textContent = '등록되었습니다. 목록이 곧 갱신됩니다.';
      setTimeout(() => (formMsg.textContent = ''), 2000);
    }
    await renderReviews();
  });
}

/***** 숨김 관리자 모드 (PIN: 8246) *****/
let secretKeys = [];
window.addEventListener('keydown', e => {
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

/***** 초기화 *****/
renderReviews();
