/* 정책자금 및 수출금융 페이지: 기관 탭 전환 (policy-finance.html) */
(function () {
    'use strict';

    var tabs = Array.prototype.slice.call(document.querySelectorAll('.pf-tab[data-org]'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('.pf-panel'));
    if (!tabs.length) return;

    function show(org, focus) {
        var found = false;
        tabs.forEach(function (t) {
            var on = t.getAttribute('data-org') === org;
            if (on) found = true;
            t.classList.toggle('is-active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
            t.tabIndex = on ? 0 : -1;
            if (on && focus) t.focus();
        });
        if (!found) return false;
        panels.forEach(function (p) {
            p.hidden = p.id !== 'panel-' + org;
        });
        return true;
    }

    function syncUrl(org) {
        try {
            var url = new URL(window.location.href);
            url.searchParams.set('org', org);
            history.replaceState(null, '', url.toString());
        } catch (e) { /* file:// 등에서는 무시 */ }
    }

    tabs.forEach(function (t, i) {
        t.addEventListener('click', function () {
            var org = t.getAttribute('data-org');
            show(org);
            syncUrl(org);
        });
        // 방향키로 탭 이동
        t.addEventListener('keydown', function (e) {
            var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
            if (!d) return;
            e.preventDefault();
            var next = tabs[(i + d + tabs.length) % tabs.length];
            show(next.getAttribute('data-org'), true);
            syncUrl(next.getAttribute('data-org'));
        });
    });

    // ?org=kosmes 로 특정 기관을 바로 열기
    try {
        var org = new URLSearchParams(window.location.search).get('org');
        if (org) show(org);
    } catch (e) { /* 무시 */ }
})();
