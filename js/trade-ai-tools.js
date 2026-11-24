// 수출 단계별 무역 AI 활용 가이드 (trade-ai-tools.html)
// data/trade-ai-tools.json 을 불러와 카드를 그린다. 새 서비스는 JSON의 tools 배열에 블록을 더하기만 하면 된다.
// 화면은 textContent 로만 그리고(HTML 주입 없음), 바깥 링크는 http(s)만 허용한다.
// 개인정보는 받지 않는다. GA에는 서비스 id와 제공 주체(public/private)만 보낸다.
(function () {
    'use strict';

    var DATA_URL = 'data/trade-ai-tools.json';
    var TYPE_LABEL = { public: '공공기관', private: '민간' };
    var $ = function (id) { return document.getElementById(id); };
    var state = { group: '', type: '' };
    var list = [];

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null && text !== '') e.textContent = String(text);
        return e;
    }
    function icon(cls) {
        var i = document.createElement('i');
        i.className = cls;
        i.setAttribute('aria-hidden', 'true');
        return i;
    }
    function safeUrl(u) {
        u = String(u || '').trim();
        return /^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : '';
    }
    function safeLocal(u) {
        u = String(u || '').trim();
        if (/^https?:\/\/[^\s"'<>]+$/i.test(u)) return u;
        return /^[a-z0-9\-_.\/]+\.html(\?[a-z0-9=&\-_]+)?(#[a-z0-9\-_]+)?$/i.test(u) ? u : '';
    }
    function arr(v) { return Array.isArray(v) ? v : []; }
    function track(name, params) {
        try { if (typeof window.gtag === 'function') window.gtag('event', name, params); } catch (e) {}
    }

    function load() {
        if (!window.fetch) { fail(); return; }
        fetch(DATA_URL, { cache: 'no-cache' })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (json) {
                if (!json || !Array.isArray(json.tools)) throw new Error('형식 오류');
                init(json);
            })
            .catch(function () { fail(); });
    }

    function fail() {
        var box = $('taState');
        box.className = 'ta-state ta-state-err';
        box.textContent = '';
        var p = el('p');
        p.appendChild(icon('fa-solid fa-circle-exclamation'));
        p.appendChild(document.createTextNode(' AI 서비스 목록을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.'));
        box.appendChild(p);
        box.appendChild(el('p', null, '그동안은 아래 페이지를 이용하실 수 있습니다.'));
        var ul = el('ul', 'ta-fallback');
        [['global-expansion.html', '글로벌 진출(KOTRA 서비스·바이어 발굴)'], ['export-docs.html', '수출서류 점검·작성'],
         ['export-guide.html', '수출 가이드'], ['index.html#contact', '상담 신청']].forEach(function (l) {
            var li = el('li'); var a = el('a', null, l[1]); a.href = l[0]; li.appendChild(a); ul.appendChild(li);
        });
        box.appendChild(ul);
        $('taAsof').textContent = '불러오지 못함';
    }

    function init(json) {
        var meta = json.meta || {};
        if (meta.notice) $('taNotice').textContent = meta.notice;
        var asof = $('taAsof');
        if (meta.lastUpdated && /^\d{4}-\d{2}-\d{2}$/.test(meta.lastUpdated)) {
            var d = meta.lastUpdated.split('-');
            asof.setAttribute('datetime', meta.lastUpdated);
            asof.textContent = d[0] + '.' + d[1] + '.' + d[2];
        } else {
            asof.textContent = meta.lastUpdated || '표기 없음';
        }

        list = json.tools.filter(function (t) { return t && t.isActive !== false && t.name; });
        list.sort(function (a, b) { return (a.step || 99) - (b.step || 99); });
        list.forEach(function (t, i) { t._id = String(t.id || ('t' + i)).replace(/[^a-z0-9\-_]/gi, ''); });

        // 단계 묶음 칩(JSON groups 순서), 제공 주체 칩
        var groups = arr(json.groups).filter(function (g) {
            return g && g.key && list.some(function (t) { return t.group === g.key; });
        });
        buildChips($('taGroupChips'), '단계', 'group', groups.map(function (g) { return [g.key, g.label]; }));
        var types = ['public', 'private'].filter(function (k) { return list.some(function (t) { return t.providerType === k; }); });
        buildChips($('taTypeChips'), '제공', 'type', types.map(function (k) { return [k, TYPE_LABEL[k]]; }));

        var grid = $('taGrid');
        list.forEach(function (t) { grid.appendChild(buildCard(t)); });

        grid.addEventListener('click', function (e) {
            var a = e.target.closest('a[data-ta]');
            if (!a) return;
            track('ai_tool_click', { tool_id: a.getAttribute('data-tool') || '', link_type: a.getAttribute('data-ta'), provider_type: a.getAttribute('data-ptype') || '' });
        });

        $('taState').hidden = true;
        $('tools').hidden = false;
        render();

        // 상단 '상황별로 찾기'의 서비스 이름을 누르면 필터를 풀고 그 카드로 간다
        document.addEventListener('click', function (e) {
            var a = e.target.closest('a[href^="#tool-"]');
            if (!a) return;
            if (state.group || state.type) { state.group = ''; state.type = ''; syncChips(); render(); }
            var card = document.getElementById(a.getAttribute('href').slice(1));
            if (card) { card.classList.remove('is-flash'); void card.offsetWidth; card.classList.add('is-flash'); }
        }, true);

        if (/^#tool-/.test(location.hash)) {
            var go = function () { var c = document.getElementById(location.hash.slice(1)); if (c) c.scrollIntoView(); };
            setTimeout(go, 50);
            if (document.readyState === 'complete') setTimeout(go, 150); else window.addEventListener('load', function () { setTimeout(go, 150); });
        }
    }

    function buildChips(box, label, key, items) {
        if (items.length < 2) { box.hidden = true; return; }
        box.appendChild(el('span', 'ta-chip-label', label));
        var wrap = el('div', 'ta-chip-list');
        [['', '전체']].concat(items).forEach(function (it) {
            var b = el('button', 'ta-chip', it[1]);
            b.type = 'button';
            b.setAttribute('data-key', key);
            b.setAttribute('data-val', it[0]);
            wrap.appendChild(b);
        });
        box.appendChild(wrap);
        box.addEventListener('click', function (e) {
            var b = e.target.closest('.ta-chip');
            if (!b) return;
            state[key] = b.getAttribute('data-val');
            syncChips();
            render();
        });
        syncChips();
    }
    function syncChips() {
        Array.prototype.forEach.call(document.querySelectorAll('.ta-chip'), function (b) {
            b.setAttribute('aria-pressed', state[b.getAttribute('data-key')] === b.getAttribute('data-val') ? 'true' : 'false');
        });
    }

    function render() {
        var n = 0;
        Array.prototype.forEach.call($('taGrid').children, function (li) {
            var ok = (!state.group || li.getAttribute('data-group') === state.group) &&
                     (!state.type || li.getAttribute('data-ptype') === state.type);
            li.hidden = !ok;
            if (ok) n++;
        });
        $('taCount').textContent = !(state.group || state.type) ? ('전체 ' + n + '개 서비스')
            : n ? ('조건에 맞는 서비스 ' + n + '개') : '조건에 맞는 서비스가 없습니다. 단계나 제공을 \'전체\'로 바꿔 보세요.';
    }

    function buildCard(t) {
        var li = el('li', 'ta-card ta-' + (t.providerType || 'etc'));
        li.id = 'tool-' + t._id;
        li.setAttribute('data-group', t.group || '');
        li.setAttribute('data-ptype', t.providerType || '');

        var top = el('div', 'ta-card-top');
        if (t.step) top.appendChild(el('span', 'ta-step', String(t.step)));
        top.appendChild(el('span', 'ta-stage', t.stage || ''));
        top.appendChild(el('span', 'ta-pill ta-pill-' + (t.providerType || 'etc'), TYPE_LABEL[t.providerType] || '기타'));
        li.appendChild(top);

        var h = el('h4', 'ta-name', t.name);
        li.appendChild(h);
        var by = el('p', 'ta-by');
        if (t.nameSub) by.appendChild(el('span', 'ta-sub', t.nameSub));
        if (t.provider) by.appendChild(el('span', 'ta-prov', t.provider));
        if (t.note) by.appendChild(el('span', 'ta-note', t.note));
        li.appendChild(by);

        if (t.useWhen) {
            var uw = el('p', 'ta-when');
            uw.appendChild(el('strong', null, '이럴 때'));
            uw.appendChild(document.createTextNode(t.useWhen));
            li.appendChild(uw);
        }
        if (t.summary) li.appendChild(el('p', 'ta-summary', t.summary));

        var cautions = [];
        if (t.providerType === 'private') cautions.push('민간 서비스로 유료이거나 무료 사용량에 한도가 있을 수 있습니다. 요금과 이용 조건은 서비스에서 확인하십시오.');
        if (t.caution) cautions.push(t.caution);
        if (cautions.length) {
            var cu = el('div', 'ta-caution');
            cautions.forEach(function (c) {
                var p = el('p');
                p.appendChild(icon('fa-solid fa-circle-info'));
                p.appendChild(document.createTextNode(' ' + c));
                cu.appendChild(p);
            });
            li.appendChild(cu);
        }

        var rel = arr(t.related).filter(function (r) { return r && safeLocal(r.href) && r.label; });
        if (rel.length) {
            var rp = el('p', 'ta-related');
            rp.appendChild(el('span', 'ta-related-k', '이 사이트의 관련 안내'));
            rel.forEach(function (r) {
                var a = el('a', null, r.label);
                a.href = safeLocal(r.href);
                a.setAttribute('data-ta', 'related');
                a.setAttribute('data-tool', t._id);
                rp.appendChild(a);
            });
            li.appendChild(rp);
        }

        var u = safeUrl(t.url);
        if (u) {
            var go = el('a', 'ta-go');
            go.href = u; go.target = '_blank'; go.rel = 'noopener noreferrer';
            go.appendChild(document.createTextNode((t.urlLabel || t.name) + ' 바로가기 '));
            go.appendChild(icon('fa-solid fa-arrow-up-right-from-square'));
            go.setAttribute('aria-label', t.name + ' 공식 사이트 바로가기 (새 창)');
            go.setAttribute('data-ta', 'official');
            go.setAttribute('data-tool', t._id);
            go.setAttribute('data-ptype', t.providerType || '');
            li.appendChild(go);
        }
        return li;
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();
