/* 벤처/이노비즈/메인비즈 기업인증 가이드: 탭 전환 및 타깃 바로가기 (biz-cert.html) */
(function () {
    'use strict';

    var tabs = Array.prototype.slice.call(document.querySelectorAll('.bc-tab[data-tab]'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('.bc-panel'));
    if (!tabs.length) return;

    function reduceMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function show(name, focus) {
        var found = false;
        tabs.forEach(function (t) {
            var on = t.getAttribute('data-tab') === name;
            if (on) found = true;
            t.classList.toggle('is-active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
            t.tabIndex = on ? 0 : -1;
            if (on && focus) t.focus();
        });
        if (!found) return false;
        panels.forEach(function (p) {
            p.hidden = p.id !== 'panel-' + name;
        });
        return true;
    }

    function syncUrl(name) {
        try {
            var url = new URL(window.location.href);
            url.searchParams.set('tab', name);
            history.replaceState(null, '', url.toString());
        } catch (e) { /* file:// 등에서는 무시 */ }
    }

    tabs.forEach(function (t, i) {
        t.addEventListener('click', function () {
            var name = t.getAttribute('data-tab');
            show(name);
            syncUrl(name);
        });

        t.addEventListener('keydown', function (e) {
            var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
            if (!d) return;
            e.preventDefault();
            var next = tabs[(i + d + tabs.length) % tabs.length];
            var nextName = next.getAttribute('data-tab');
            show(nextName, true);
            syncUrl(nextName);
        });
    });

    // 타깃별 빠른 추천 카드에서 해당 인증 탭으로 바로 이동
    var jumpBtns = Array.prototype.slice.call(document.querySelectorAll('[data-jump-tab]'));
    var detailSection = document.getElementById('detail');
    jumpBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var name = btn.getAttribute('data-jump-tab');
            if (!show(name)) return;
            syncUrl(name);
            if (detailSection) {
                detailSection.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
            }
        });
    });

    // ?tab=innobiz 또는 #innobiz 로 특정 인증 탭을 바로 열기
    function openInitial() {
        var name = '';
        try {
            name = new URLSearchParams(window.location.search).get('tab') || '';
        } catch (e) { /* 무시 */ }
        if (!name && window.location.hash) {
            var h = window.location.hash.slice(1);
            if (h === 'venture' || h === 'innobiz' || h === 'mainbiz') {
                name = h;
            }
        }
        if (name && show(name) && window.location.hash && detailSection) {
            setTimeout(function () {
                detailSection.scrollIntoView({ behavior: 'auto', block: 'start' });
            }, 60);
        }
    }

    openInitial();
    window.addEventListener('hashchange', openInitial);
})();
