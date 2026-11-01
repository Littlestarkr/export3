// 고객사·협력사 탭 전환 (?tab=partner 로 바로 열 수 있다)
(function () {
    'use strict';
    var tabs = document.querySelectorAll('#scTabs .pf-tab');
    function show(name) {
        tabs.forEach(function (t) {
            var on = t.getAttribute('data-tab') === name;
            t.classList.toggle('is-active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
            document.getElementById('panel-' + t.getAttribute('data-tab')).hidden = !on;
        });
    }
    tabs.forEach(function (t) {
        t.addEventListener('click', function () {
            var n = t.getAttribute('data-tab');
            show(n);
            try { history.replaceState(null, '', '?tab=' + n); } catch (e) {}
        });
    });
    var m = /[?&]tab=(client|partner)/.exec(location.search);
    if (m) show(m[1]);
})();
