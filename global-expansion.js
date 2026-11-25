/* 글로벌 진출 지원 페이지: 소상공인 첫수출 전략 아코디언 제어 (global-expansion.html) */
(function () {
    'use strict';

    var section = document.getElementById('smb-export-lecture');
    if (!section) return;

    var items = Array.prototype.slice.call(section.querySelectorAll('details.sl-item'));
    var toggleAllBtn = document.getElementById('slToggleAllBtn');
    if (!items.length) return;

    function reduceMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function updateToggleAll() {
        if (!toggleAllBtn) return;
        var allOpen = items.every(function (d) { return d.open; });
        toggleAllBtn.textContent = allOpen ? '모두 접기' : '전체 펼치기';
        toggleAllBtn.setAttribute('aria-expanded', allOpen ? 'true' : 'false');
    }

    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', function () {
            var allOpen = items.every(function (d) { return d.open; });
            items.forEach(function (d) { d.open = !allOpen; });
            updateToggleAll();
        });
    }

    items.forEach(function (d) {
        d.addEventListener('toggle', updateToggleAll);
    });

    // 각 단계 하단 '다음 단계 보기' 버튼 클릭 시 다음 아코디언을 열고 부드럽게 이동
    section.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('.sl-next-btn[data-next]');
        if (!btn) return;
        var targetId = btn.getAttribute('data-next');
        var nextDetails = targetId && document.getElementById(targetId);
        if (!nextDetails) return;
        nextDetails.open = true;
        updateToggleAll();
        nextDetails.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
        var summary = nextDetails.querySelector('summary');
        if (summary) {
            try { summary.focus({ preventScroll: true }); } catch (err) {}
        }
    });

    // 직접 해시(#sl-step-N)로 진입했을 때 해당 단계 자동 펼침
    function openHashStep() {
        var h = location.hash;
        if (!h || h.indexOf('#sl-step-') !== 0) return;
        var target = document.getElementById(h.slice(1));
        if (target && target.tagName === 'DETAILS') {
            target.open = true;
            updateToggleAll();
        }
    }

    openHashStep();
    window.addEventListener('hashchange', openHashStep);
    updateToggleAll();
})();
