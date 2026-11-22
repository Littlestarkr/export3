// 해외인증 조회 가이드: 포털 바로가기 클릭을 GA 이벤트로 보낸다(개인정보 없음).
// 이벤트 이름 'cert_portal_click', 매개변수 portal(포털 약칭)·step(로드맵 단계, 없으면 '').
document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-portal]') : null;
    if (!a || typeof gtag !== 'function') return;
    gtag('event', 'cert_portal_click', {
        portal: a.getAttribute('data-portal'),
        step: a.getAttribute('data-step') || ''
    });
});
