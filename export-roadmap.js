// 수출 5단계 로드맵: 인쇄 버튼과 GA 이벤트(개인정보 없음).
// roadmap_link_click: step(단계 번호, 수출 가이드 링크는 'guide')·target(주소). roadmap_print: 인쇄 버튼.
(function () {
    'use strict';
    function ga(name, params) { if (typeof gtag === 'function') gtag('event', name, params || {}); }
    var btn = document.getElementById('rmPrint');
    if (btn) btn.addEventListener('click', function () {
        ga('roadmap_print');
        window.print();
    });
    document.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('a[data-rm]') : null;
        if (!a) return;
        ga('roadmap_link_click', { step: a.getAttribute('data-rm'), target: a.getAttribute('href') });
    });
})();
