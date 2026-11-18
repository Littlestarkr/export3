/* 수출서류 점검 페이지 (export-docs.html)
   - 서류 탭 전환(?doc=offer|pi|contract|popi|ci|advice 로 바로 열기)
   - 계약서 ↔ PO·PI 갈래 전환
   - 가상 초안: PC에서는 펼침, 모바일에서는 접힘
   - 영문 문구 복사(끝에 안내 문구 자동 첨부), 체크리스트 지우기·인쇄
   체크 상태와 서류 내용은 어디에도 저장하지 않는다. */
(function () {
    'use strict';

    var DOCS = ['offer', 'pi', 'contract', 'ci', 'advice'];
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.pf-tab[data-doc]'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('.ed-panel'));
    var routeBtns = Array.prototype.slice.call(document.querySelectorAll('.ed-route-btn'));
    if (!tabs.length) return;

    function track(name, params) {
        try { if (typeof gtag === 'function') gtag('event', name, params); } catch (e) { /* 무시 */ }
    }

    function syncUrl(doc) {
        try {
            var url = new URL(window.location.href);
            url.searchParams.set('doc', doc);
            history.replaceState(history.state, '', url.pathname + url.search + url.hash);
        } catch (e) { /* file:// 등에서는 무시 */ }
    }

    function showRoute(route) {
        routeBtns.forEach(function (b) {
            var on = b.getAttribute('data-route') === route;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        ['contract', 'popi'].forEach(function (r) {
            var el = document.getElementById('route-' + r);
            if (el) el.hidden = r !== route;
        });
    }

    // doc: offer|pi|contract|popi|ci|advice
    function show(doc, focus) {
        var tabDoc = doc === 'popi' ? 'contract' : doc;
        if (DOCS.indexOf(tabDoc) < 0) return false;
        tabs.forEach(function (t) {
            var on = t.getAttribute('data-doc') === tabDoc;
            t.classList.toggle('is-active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
            t.tabIndex = on ? 0 : -1;
            if (on && focus) t.focus();
            // 가로 스크롤 탭에서 고른 탭이 화면 밖에 있을 때만 보이게 옮긴다
            var bar = t.parentNode;
            if (on && bar.scrollWidth > bar.clientWidth) {
                var left = t.offsetLeft - bar.offsetLeft;
                if (left < bar.scrollLeft || left + t.offsetWidth > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = left - 16;
            }
        });
        panels.forEach(function (p) { p.hidden = p.id !== 'panel-' + tabDoc; });
        if (tabDoc === 'contract') showRoute(doc === 'popi' ? 'popi' : 'contract');
        return true;
    }

    function currentDoc() {
        var t = tabs.filter(function (x) { return x.classList.contains('is-active'); })[0];
        var d = t ? t.getAttribute('data-doc') : 'offer';
        if (d === 'contract') {
            var po = document.getElementById('route-popi');
            if (po && !po.hidden) return 'popi';
        }
        return d;
    }

    function open(doc, focus) {
        if (show(doc, focus)) {
            syncUrl(doc);
            track('sample_view', { doc_type: doc });
        }
    }

    tabs.forEach(function (t, i) {
        t.addEventListener('click', function () { open(t.getAttribute('data-doc')); });
        t.addEventListener('keydown', function (e) {
            var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
            if (!d) return;
            e.preventDefault();
            var next = tabs[(i + d + tabs.length) % tabs.length];
            open(next.getAttribute('data-doc'), true);
        });
    });

    routeBtns.forEach(function (b) {
        b.addEventListener('click', function () {
            var r = b.getAttribute('data-route');
            showRoute(r);
            syncUrl(r);
            track('sample_view', { doc_type: r });
        });
    });

    // 거래 흐름 카드: 페이지를 다시 읽지 않고 해당 서류로 이동
    function reduceMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    Array.prototype.slice.call(document.querySelectorAll('[data-doc-link]')).forEach(function (a) {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            open(a.getAttribute('data-doc-link'));
            var target = document.getElementById('edTabs');
            if (target) target.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
        });
    });

    // 가상 초안: PC(769px 이상)는 펼치고, 모바일은 접어 둔다
    var drafts = Array.prototype.slice.call(document.querySelectorAll('details.ed-draft'));
    var mq = window.matchMedia('(min-width: 769px)');
    function syncDrafts() { drafts.forEach(function (d) { d.open = mq.matches; }); }
    syncDrafts();
    if (mq.addEventListener) mq.addEventListener('change', syncDrafts);

    // 영문 문구 복사: 복사한 글 끝에 안내 문구를 자동으로 붙인다
    var COPY_NOTE = '\n\n※ 예시 문구입니다. 사용 전 전문가 확인이 필요합니다. (출처: www.littlestar.co.kr 수출서류 점검)';
    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.className = 'ed-sr';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        return ok;
    }
    Array.prototype.slice.call(document.querySelectorAll('[data-copy]')).forEach(function (btn) {
        var label = btn.innerHTML;
        btn.addEventListener('click', function () {
            var p = btn.parentNode.querySelector('.ed-clause-en');
            if (!p) return;
            var text = p.textContent.trim() + COPY_NOTE;
            function done(ok) {
                btn.classList.toggle('is-done', ok);
                btn.textContent = ok ? '복사했습니다' : '복사하지 못했습니다';
                setTimeout(function () { btn.innerHTML = label; btn.classList.remove('is-done'); }, 1800);
            }
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
            } else {
                done(fallbackCopy(text));
            }
            track('clause_copy', { doc_type: currentDoc() });
        });
    });

    // 체크리스트 지우기
    Array.prototype.slice.call(document.querySelectorAll('[data-reset]')).forEach(function (btn) {
        btn.addEventListener('click', function () {
            var box = btn.closest('.ed-checklist');
            if (!box) return;
            Array.prototype.slice.call(box.querySelectorAll('input[type="checkbox"]')).forEach(function (c) { c.checked = false; });
        });
    });

    // 인쇄: 지금 보고 있는 서류만 인쇄되고, 머리 상자에 출력 일시가 들어간다
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function beforePrint() {
        var d = new Date();
        var el = document.getElementById('edPrintTime');
        if (el) el.textContent = d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        drafts.forEach(function (x) { x.open = true; });
    }
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', syncDrafts);
    Array.prototype.slice.call(document.querySelectorAll('[data-print]')).forEach(function (btn) {
        btn.addEventListener('click', function () {
            track('checklist_print', { doc_type: currentDoc() });
            beforePrint();
            window.print();
        });
    });

    // ?doc=pi 처럼 특정 서류를 바로 열기
    try {
        var q = new URLSearchParams(window.location.search).get('doc');
        if (q) show(q);
    } catch (e) { /* 무시 */ }
})();
