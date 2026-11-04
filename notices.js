// 알림: 구글 시트(작가님만 작성)의 내용을 앱스 스크립트(notices-apps-script.gs)가 읽기 전용으로 전달한다.
(function () {
    'use strict';

    // 앱스 스크립트 배포 후 나온 웹 앱 URL(…/exec)을 여기에 넣는다. 비어 있으면 '곧 문을 엽니다'가 보인다.
    var NOTICES_URL = 'https://script.google.com/macros/s/AKfycbyfAkcUcnUlin7t66UgXG9wncEeKxPQEFAv8t2R94KIDtNzxmlaLAxOHWDVHGPzYNXu/exec';

    var PAGE = 10;
    var shown = PAGE;
    var cat = '';
    var items = [];
    var $ = function (id) { return document.getElementById(id); };

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }
    function isNew(d) {
        var t = Date.parse(d);
        return !isNaN(t) && (Date.now() - t) < 7 * 86400000 && t <= Date.now() + 86400000;
    }
    function state(msg) {
        var list = $('ntList');
        list.textContent = '';
        list.appendChild(el('p', 'nt-state', msg));
        $('ntMore').style.display = 'none';
        $('ntCount').textContent = '';
    }

    function renderFilter() {
        var cats = [];
        items.forEach(function (it) { if (it.cat && cats.indexOf(it.cat) < 0) cats.push(it.cat); });
        var box = $('ntFilter');
        box.textContent = '';
        if (cats.length < 2) { box.hidden = true; return; }
        box.hidden = false;
        ['전체'].concat(cats).forEach(function (c) {
            var b = el('button', (c === '전체' && !cat) || c === cat ? 'is-active' : '', c);
            b.type = 'button';
            b.addEventListener('click', function () { cat = (c === '전체') ? '' : c; shown = PAGE; renderFilter(); render(); });
            box.appendChild(b);
        });
    }

    function render() {
        var list = $('ntList');
        var rows = items.filter(function (it) { return !cat || it.cat === cat; });
        list.textContent = '';
        if (!rows.length) { state('등록된 알림이 없습니다.'); return; }
        rows.slice(0, shown).forEach(function (it) {
            var card = el('details', 'nt-item' + (it.pin ? ' pin' : ''));
            var sum = el('summary', 'nt-sum');
            var meta = el('div', 'nt-meta');
            if (it.pin) meta.appendChild(el('span', 'nt-chip pin', '고정'));
            if (it.cat) meta.appendChild(el('span', 'nt-chip', it.cat));
            if (it.date) meta.appendChild(el('span', '', it.date));
            if (isNew(it.date)) meta.appendChild(el('span', 'nt-chip new', 'NEW'));
            sum.appendChild(meta);
            sum.appendChild(el('h3', 'nt-title', it.title));
            card.appendChild(sum);
            var det = el('div', 'nt-detail');
            if (it.body) det.appendChild(el('div', 'nt-body', it.body));
            if (/^https?:\/\//i.test(it.url || '')) {
                var a = el('a', 'nt-link', (it.urlLabel || '원문 보기') + ' ↗');
                a.href = it.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
                det.appendChild(a);
            }
            card.appendChild(det);
            list.appendChild(card);
        });
        $('ntCount').textContent = '총 ' + rows.length + '건';
        $('ntMore').style.display = rows.length > shown ? 'block' : 'none';
    }

    function apply(data) {
        items = (data && data.items) || [];
        shown = PAGE; cat = '';
        renderFilter();
        render();
    }

    $('ntMore').addEventListener('click', function () { shown += PAGE; render(); });

    if (!NOTICES_URL) { state('알림 코너가 곧 문을 엽니다.'); return; }

    fetch(NOTICES_URL + '?action=list')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (!data || !data.ok) throw new Error('bad');
            try { localStorage.setItem('ntCache', JSON.stringify(data)); } catch (e) {}
            apply(data);
        })
        .catch(function () {
            var cached = null;
            try { cached = JSON.parse(localStorage.getItem('ntCache') || 'null'); } catch (e) {}
            if (cached && cached.items) apply(cached);
            else state('알림을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.');
        });
})();
