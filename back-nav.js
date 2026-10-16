// 하위 페이지 공통: 이전 화면으로 돌아가기, 맨 위로, 목차로 돌아가기
(function () {
    'use strict';

    function goBack() {
        var sameSite = false;
        try { sameSite = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
        if (sameSite && history.length > 1) {
            history.back();
        } else {
            location.href = 'index.html#services';
        }
    }

    // 떠다니는 버튼
    var bar = document.createElement('div');
    bar.className = 'pf-floatnav';
    bar.innerHTML = '<button type="button" class="pf-fn-back"><i class="fa-solid fa-arrow-left"></i> 이전 화면</button>' +
        '<button type="button" class="pf-fn-top" aria-label="맨 위로"><i class="fa-solid fa-arrow-up"></i></button>';
    document.body.appendChild(bar);
    bar.querySelector('.pf-fn-back').addEventListener('click', goBack);
    bar.querySelector('.pf-fn-top').addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 각 세부 항목 끝에 '목차로 돌아가기'
    var n = 0;
    document.querySelectorAll('.pf-grp').forEach(function (grp) {
        var box = grp.closest('.pf-panel, .pf-section');
        var jump = box && box.querySelector('.pf-jump');
        if (!jump) return;
        if (!jump.id) jump.id = 'pfjump-' + (++n);
        var a = document.createElement('a');
        a.className = 'pf-uplink';
        a.href = '#' + jump.id;
        a.innerHTML = '<i class="fa-solid fa-arrow-up"></i> 목차로 돌아가기';
        grp.appendChild(a);
    });

    // 페이지 안 이동은 history 항목을 쌓지 않아서, '이전 화면'이 항상 직전 페이지로 간다
    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a || a.getAttribute('href').length < 2) return;
        var t = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
        if (!t || t.hidden) return;
        e.preventDefault();
        t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try { history.replaceState(history.state, '', a.getAttribute('href')); } catch (err) {}
    });
})();
