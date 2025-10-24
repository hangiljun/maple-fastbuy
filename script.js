// 연도
document.getElementById('year').textContent = new Date().getFullYear();

// 카카오 아이디 복사
const copyBtn = document.getElementById('copy-kakao');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    const id = document.getElementById('kakaoId').textContent.trim();
    try {
      await navigator.clipboard.writeText(id);
      showMsg('아이디가 복사되었습니다: ' + id, 'success');
    } catch (e) {
      showMsg('복사에 실패했어요. 아이디를 직접 복사해 주세요.', 'error');
    }
  });
}

// “지금 문의하기” 버튼 → 문의 섹션으로 스크롤
const ctaBtn = document.getElementById('cta-inquiry');
if (ctaBtn) {
  ctaBtn.addEventListener('click', () => {
    document.getElementById('contact')?.scrollIntoView({behavior:'smooth', block:'start'});
  });
}

// 후기 게시판 이동(링크가 바뀌면 여기서만 수정)
const reviewLink = document.getElementById('go-review-board');
if (reviewLink) {
  reviewLink.addEventListener('click', (e) => {
    // 필요 시 라우팅/배포 환경에 맞춰 경로 수정
    // e.g., e.currentTarget.href = '/reviews/index.html';
  });
}

// 빠른 문의 폼 (프론트 유효성 + 성공 메시지만 표시)
// 실제 전송 로직은 백엔드/구글앱스스크립트 등과 연동 시 이곳에서 fetch 호출
const form = document.getElementById('quickForm');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('formMsg');
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.item || String(data.item).trim().length < 2) {
      showMsg('아이템/수량을 입력해 주세요.', 'error');
      return;
    }

    // TODO: 실제 엔드포인트가 있다면 아래 fetch 주석 해제 후 URL 교체
    /*
    try {
      const res = await fetch('https://YOUR_ENDPOINT_HERE', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('서버 오류');
      showMsg('접수되었습니다! 카카오톡으로도 메시지 주시면 더 빨라요 😊', 'success');
      form.reset();
    } catch (err) {
      showMsg('전송이 지연되고 있어요. 카카오톡(HAN8246)으로 문의해 주세요!', 'error');
    }
    */
    // 임시 성공 메시지 (백엔드 연동 전까지)
    showMsg('접수되었습니다! 카카오톡(HAN8246)으로 연락 주시면 더 빨라요 😊', 'success');
    form.reset();
  });
}

function showMsg(text, type){
  const el = document.getElementById('formMsg');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('success','error');
  if (type) el.classList.add(type);
}
