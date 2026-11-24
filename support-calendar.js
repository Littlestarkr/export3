// 정부 수출지원사업 연간 캘린더 (support-calendar.html)
// data/support-calendar.json 을 불러와 화면을 그린다. 새 사업은 JSON의 programs 배열에 블록을 더하기만 하면 된다.
// 화면은 textContent 로만 그리고(HTML 주입 없음), 바깥 링크는 http(s)만, 전화는 숫자·하이픈만 허용한다.
// 개인정보는 받지 않는다. GA에는 사업 id와 링크 종류만 보낸다.
(function () {
    'use strict';

    var DATA_URL = 'data/support-calendar.json';
    var CONSULT_DEFAULT = 'index.html#contact';
    var PINNED_LIMIT = 4;

    // 표시 이름. JSON에 새 값이 오면 그 값을 그대로 보여 준다.
    var TYPE_LABEL = { urgent: '긴급', always: '상시', rolling: '수시', regular: '정기' };
    var STATUS_LABEL = { open: '접수 중', expected: '공고 예정', tentative: '일정 잠정', closed: '마감' };
    // 필터 칩 순서(여기 없는 새 값은 뒤에 붙는다)
    var ORDER = {
        type: ['urgent', 'always', 'rolling', 'regular'],
        cat: ['금융·무역보험', '바우처·마케팅', '전시·상담회', '인증·지재권·규제', '물류·통관·FTA', '농식품(K-푸드)', '스타트업·조달'],
        agency: ['KOTRA', '중기부·중진공', 'K-SURE', 'aT', '기타 유관기관'],
        stage: ['내수·무실적 가능', '수출 초보·유망', '성장·중견']
    };
    var GROUPS = [
        { key: 'type', label: '일정 유형' },
        { key: 'cat', label: '지원 분야' },
        { key: 'agency', label: '주관기관' },
        { key: 'stage', label: '수출 단계' }
    ];

    var $ = function (id) { return document.getElementById(id); };
    var state = { q: '', sel: { type: {}, cat: {}, agency: {}, stage: {} }, pinnedOpen: false };
    var data = null;
    var consultUrl = CONSULT_DEFAULT;
    var NOW = kstMonth();

    function kstMonth() {
        try {
            var m = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', month: 'numeric' }).format(new Date());
            var n = parseInt(m, 10);
            if (n >= 1 && n <= 12) return n;
        } catch (e) {}
        return new Date().getMonth() + 1;
    }
    function nextMonth(m) { return m === 12 ? 1 : m + 1; }

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
        return /^[a-z0-9\-_.\/]+\.html(#[a-z0-9\-_]+)?$/i.test(u) ? u : '';
    }
    function telHref(t) {
        var s = String(t || '').trim();
        return /^[0-9][0-9\-]{2,}$/.test(s) ? 'tel:' + s.replace(/-/g, '') : '';
    }
    function arr(v) { return Array.isArray(v) ? v : []; }
    function track(name, params) {
        try { if (typeof window.gtag === 'function') window.gtag('event', name, params); } catch (e) {}
    }
    function reduceMotion() {
        try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
    }

    // ── 불러오기 ──
    function load() {
        if (!window.fetch) { fail(); return; }
        fetch(DATA_URL, { cache: 'no-cache' })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (json) {
                if (!json || !Array.isArray(json.programs)) throw new Error('형식 오류');
                init(json);
            })
            .catch(function () { fail(); });
    }

    function fail() {
        var box = $('scState');
        box.className = 'sc-state sc-state-err';
        box.textContent = '';
        var p = el('p');
        p.appendChild(icon('fa-solid fa-circle-exclamation'));
        p.appendChild(document.createTextNode(' 지원사업 목록을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.'));
        box.appendChild(p);
        var p2 = el('p', null, '그동안은 아래 페이지에서 주요 사업을 확인하실 수 있습니다.');
        box.appendChild(p2);
        var ul = el('ul', 'sc-fallback');
        [['government-support.html', '정부지원사업(수출바우처 등)'], ['policy-finance.html', '정책자금 및 수출금융'],
         ['trade-insurance.html', '무역보험 및 수출 안전망'], ['notices.html', '핫이슈(최신 공고 소식)'],
         ['index.html#contact', '상담 신청']].forEach(function (l) {
            var li = el('li'); var a = el('a', null, l[1]); a.href = l[0]; li.appendChild(a); ul.appendChild(li);
        });
        box.appendChild(ul);
        $('scAsof').textContent = '불러오지 못함';
        var hb = document.querySelector('.sc-hero .pf-hero-btns');
        if (hb) hb.hidden = true;
    }

    // ── 시작 ──
    function init(json) {
        data = json;
        var meta = json.meta || {};
        consultUrl = safeLocal(meta.consultingUrl) || CONSULT_DEFAULT;
        // 옛 주소(github.io/export3)는 상담 신청 칸이 아니라 첫 화면으로 가므로 현재 사이트 상담 신청으로 보낸다.
        if (/littlestarkr\.github\.io/i.test(consultUrl)) consultUrl = CONSULT_DEFAULT;
        if (meta.notice) $('scNotice').textContent = meta.notice;
        var asof = $('scAsof');
        if (meta.lastUpdated && /^\d{4}-\d{2}-\d{2}$/.test(meta.lastUpdated)) {
            var d = meta.lastUpdated.split('-');
            asof.setAttribute('datetime', meta.lastUpdated);
            asof.textContent = d[0] + '년 ' + parseInt(d[1], 10) + '월 ' + parseInt(d[2], 10) + '일';
        } else {
            asof.textContent = meta.lastUpdated || '표기 없음';
        }

        data.list = json.programs.filter(function (p) { return p && p.isActive !== false && p.title; });
        data.list.forEach(function (p, i) {
            p._id = String(p.id || ('p' + i)).replace(/[^a-z0-9\-_]/gi, '');
            p._months = arr(p.months).map(function (m) { return parseInt(m, 10); }).filter(function (m) { return m >= 1 && m <= 12; });
            p._text = [p.title, p.agency, p.agencyGroup, p.summary, p.target, p.tip, p.periodLabel,
                arr(p.categories).join(' '), arr(p.stages).join(' '), arr(p.tags).join(' '),
                TYPE_LABEL[p.scheduleType] || ''].join(' ').toLowerCase();
        });

        // 히어로 버튼
        $('scNowLabel').textContent = '지금은 ' + NOW + '월입니다 · 이번 달 사업 보기';
        $('scNowBtn').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); goMonth(NOW); });
        var nx = nextMonth(NOW);
        $('scNextBtn').textContent = '다음 달(' + nx + '월) 미리 보기';
        $('scNextBtn').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); goMonth(nx); });

        buildChips();
        buildMonthNav();
        bindFilter();

        $('scState').hidden = true;
        $('scApp').hidden = false;
        render();

        // 주소에 #m-11 처럼 달이 있으면 그 달로
        var m = /^#m-(\d{1,2})$/.exec(location.hash);
        if (m) setTimeout(function () { goMonth(parseInt(m[1], 10), true); }, 50);
    }

    // ── 필터 칩 ──
    function valuesOf(key) {
        var seen = {};
        data.list.forEach(function (p) {
            var vs = key === 'type' ? [p.scheduleType] : key === 'cat' ? arr(p.categories)
                : key === 'agency' ? [p.agencyGroup || p.agency] : arr(p.stages);
            vs.forEach(function (v) { if (v) seen[v] = true; });
        });
        var out = ORDER[key].filter(function (v) { return seen[v]; });
        Object.keys(seen).forEach(function (v) { if (out.indexOf(v) < 0) out.push(v); });
        return out;
    }

    function buildChips() {
        var box = $('scChips');
        GROUPS.forEach(function (g) {
            var row = el('div', 'sc-chip-row');
            row.setAttribute('role', 'group');
            row.setAttribute('aria-label', g.label);
            row.appendChild(el('span', 'sc-chip-label', g.label));
            var wrap = el('div', 'sc-chip-list');
            valuesOf(g.key).forEach(function (v) {
                var b = el('button', 'sc-chip', g.key === 'type' ? (TYPE_LABEL[v] || v) : v);
                b.type = 'button';
                b.setAttribute('aria-pressed', 'false');
                b.dataset.group = g.key;
                b.dataset.value = v;
                wrap.appendChild(b);
            });
            row.appendChild(wrap);
            box.appendChild(row);
        });
        box.addEventListener('click', function (e) {
            var b = e.target.closest('.sc-chip');
            if (!b) return;
            var s = state.sel[b.dataset.group];
            if (s[b.dataset.value]) delete s[b.dataset.value]; else s[b.dataset.value] = true;
            b.setAttribute('aria-pressed', s[b.dataset.value] ? 'true' : 'false');
            render();
        });
        // 넓은 화면은 처음부터 펼친다
        if (window.matchMedia && window.matchMedia('(min-width: 1025px)').matches) setChips(true);
    }

    function setChips(open) {
        $('scChips').hidden = !open;
        $('scFilterToggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function bindFilter() {
        var t = null;
        $('scQ').addEventListener('input', function () {
            clearTimeout(t);
            var v = this.value;
            t = setTimeout(function () { state.q = v.trim().toLowerCase(); render(); }, 150);
        });
        $('scQ').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); this.blur(); } });
        $('scFilterToggle').addEventListener('click', function () { setChips($('scChips').hidden); });
        $('scReset').addEventListener('click', function () {
            state.q = ''; $('scQ').value = '';
            Object.keys(state.sel).forEach(function (k) { state.sel[k] = {}; });
            Array.prototype.forEach.call(document.querySelectorAll('.sc-chip'), function (b) { b.setAttribute('aria-pressed', 'false'); });
            render();
        });
        $('scPinnedMore').addEventListener('click', function () {
            state.pinnedOpen = !state.pinnedOpen;
            render();
            if (!state.pinnedOpen) scrollToEl($('pinned'));
        });
    }

    function activeCount() {
        var n = 0;
        Object.keys(state.sel).forEach(function (k) { n += Object.keys(state.sel[k]).length; });
        return n;
    }
    function anyIn(sel, vals) {
        var keys = Object.keys(sel);
        if (!keys.length) return true;
        for (var i = 0; i < vals.length; i++) if (sel[vals[i]]) return true;
        return false;
    }
    function match(p) {
        if (!anyIn(state.sel.type, [p.scheduleType])) return false;
        if (!anyIn(state.sel.cat, arr(p.categories))) return false;
        if (!anyIn(state.sel.agency, [p.agencyGroup || p.agency])) return false;
        if (!anyIn(state.sel.stage, arr(p.stages))) return false;
        if (state.q) {
            var words = state.q.split(/\s+/);
            for (var i = 0; i < words.length; i++) if (words[i] && p._text.indexOf(words[i]) < 0) return false;
        }
        return true;
    }

    // ── 카드 ──
    function badge(cls, text) { return el('span', 'sc-badge ' + cls, text); }

    function buildCard(p, opts) {
        opts = opts || {};
        var urgent = p.scheduleType === 'urgent';
        var card = el('article', 'sc-card' + (urgent ? ' sc-card-urgent' : '') + (opts.now ? ' is-now' : ''));
        if (opts.anchor) card.id = opts.anchor;

        var badges = el('div', 'sc-badges');
        badges.appendChild(badge('sc-b-type sc-t-' + (p.scheduleType || 'etc'), (urgent ? '⚠ ' : '') + (TYPE_LABEL[p.scheduleType] || p.scheduleType || '일정')));
        if (p.status) badges.appendChild(badge('sc-b-status sc-s-' + p.status, STATUS_LABEL[p.status] || p.status));
        if (p.agencyGroup || p.agency) badges.appendChild(badge('sc-b-agency', p.agencyGroup || p.agency));
        card.appendChild(badges);

        card.appendChild(el('h4', 'sc-title', p.title));

        var when = el('p', 'sc-when');
        when.appendChild(icon('fa-regular fa-calendar'));
        when.appendChild(el('span', 'sc-k', '공고시기'));
        when.appendChild(document.createTextNode(p.periodLabel || '공고 확인'));
        card.appendChild(when);
        if (p._months.length > 1 && !urgent) {
            card.appendChild(el('p', 'sc-multi', p._months.map(function (m) { return m + '월'; }).join('·') + ' 캘린더에 함께 표시'));
        }

        if (p.summary) card.appendChild(el('p', 'sc-summary', p.summary));

        if (p.tip) {
            var tip = el('p', 'sc-tip');
            var tk = el('strong', null);
            tk.appendChild(icon('fa-solid fa-lightbulb'));
            tk.appendChild(document.createTextNode(' 실무 팁 '));
            tip.appendChild(tk);
            tip.appendChild(document.createTextNode(p.tip));
            card.appendChild(tip);
        }

        var body = urgent ? el('div', 'sc-detail sc-detail-open') : el('div', 'sc-detail');
        var dl = el('dl', 'sc-dl');
        function row(k, v, node) {
            if (!v && !node) return;
            dl.appendChild(el('dt', null, k));
            var dd = el('dd', null, node ? '' : v);
            if (node) dd.appendChild(node);
            dl.appendChild(dd);
        }
        row('지원대상', p.target);
        row('주관기관', p.agency);
        row('지원 분야', arr(p.categories).join(', '));
        row('수출 단계', arr(p.stages).join(', '));
        var th = telHref(p.contact);
        if (th) {
            var tel = el('a', 'sc-tel');
            tel.href = th;
            tel.appendChild(icon('fa-solid fa-phone'));
            tel.appendChild(document.createTextNode(' ' + p.contact));
            tel.setAttribute('data-sc', 'tel');
            row('문의', null, tel);
        } else if (p.contact) {
            row('문의', p.contact);
        }
        body.appendChild(dl);

        if (arr(p.tags).length) {
            var tags = el('p', 'sc-tags');
            arr(p.tags).forEach(function (t) { tags.appendChild(el('span', null, '#' + t)); });
            body.appendChild(tags);
        }

        var btns = el('div', 'sc-btns');
        var au = safeUrl(p.applyUrl);
        if (au) {
            var a = el('a', 'sc-btn sc-btn-apply');
            a.href = au; a.target = '_blank'; a.rel = 'noopener noreferrer';
            a.appendChild(document.createTextNode((p.applyLabel || '공식 신청처') + ' '));
            a.appendChild(icon('fa-solid fa-arrow-up-right-from-square pf-ext'));
            a.setAttribute('aria-label', (p.applyLabel || '공식 신청처') + ' (새 창)');
            a.setAttribute('data-sc', 'apply');
            btns.appendChild(a);
        }
        var c = el('a', 'sc-btn sc-btn-consult');
        c.href = consultUrl;
        c.appendChild(icon('fa-regular fa-comments'));
        c.appendChild(document.createTextNode(' Happy Oh 1:1 컨설팅 문의'));
        c.setAttribute('data-sc', 'consult');
        btns.appendChild(c);
        body.appendChild(btns);

        card.dataset.pid = p._id;
        if (urgent) {
            card.appendChild(body);
        } else {
            var det = el('details', 'sc-acc');
            var sum = el('summary', null);
            sum.appendChild(el('span', 'sc-acc-open', '지원대상·문의·신청처 보기'));
            sum.appendChild(el('span', 'sc-acc-close', '접기'));
            sum.appendChild(icon('fa-solid fa-chevron-down sc-chev'));
            det.appendChild(sum);
            det.appendChild(body);
            card.appendChild(det);
        }
        return card;
    }

    // ── 월 바로가기 ──
    function buildMonthNav() {
        var nav = $('scMonthNav');
        var ul = el('ol', 'sc-mn-list');
        for (var m = 1; m <= 12; m++) {
            var li = el('li');
            var b = el('button', 'sc-mn' + (m === NOW ? ' is-now' : ''));
            b.type = 'button';
            b.dataset.month = m;
            b.appendChild(el('span', 'sc-mn-m', m + '월'));
            b.appendChild(el('span', 'sc-mn-n', '0'));
            if (m === NOW) {
                b.appendChild(el('span', 'sc-mn-now', '이번 달'));
                b.setAttribute('aria-current', 'date');
            }
            li.appendChild(b);
            ul.appendChild(li);
        }
        nav.appendChild(ul);
        nav.addEventListener('click', function (e) {
            var b = e.target.closest('.sc-mn');
            if (b) goMonth(parseInt(b.dataset.month, 10));
        });
    }

    function headerOffset() {
        var off = 0;
        var header = document.querySelector('header');
        if (header && getComputedStyle(header).position === 'fixed') off += header.offsetHeight;
        var bar = $('scFilter');
        if (bar) off += bar.offsetHeight;
        return off + 10;
    }
    function scrollToEl(t, instant) {
        if (!t) return;
        var y = t.getBoundingClientRect().top + window.pageYOffset - headerOffset();
        window.scrollTo({ top: Math.max(0, y), behavior: (instant || reduceMotion()) ? 'auto' : 'smooth' });
    }
    function goMonth(m, instant) {
        var t = $('m-' + m);
        if (!t) return;
        // 펼친 필터 칩이 화면을 가리지 않게, 달로 이동할 때는 접는다(고른 조건은 그대로, 버튼에 개수 표시)
        if (!$('scChips').hidden) setChips(false);
        scrollToEl(t, instant);
        try { history.replaceState(null, '', '#m-' + m); } catch (e) {}
        track('calendar_month_jump', { month: m });
    }

    // ── 그리기 ──
    function render() {
        var list = data.list.filter(match);
        var filtering = !!state.q || activeCount() > 0;

        // 필터 상태 표시
        var n = activeCount();
        $('scFcount').hidden = !n;
        $('scFcount').textContent = n ? String(n) : '';
        $('scReset').hidden = !filtering;
        var monthly = list.filter(function (p) { return p._months.length && p.scheduleType !== 'urgent'; });
        $('scCount').textContent = filtering
            ? '조건에 맞는 사업 ' + list.length + '건 (전체 ' + data.list.length + '건)'
            : '전체 ' + data.list.length + '건';

        // Section A: 긴급 + 상시(고정). 월이 비어 있는 사업도 여기서 보여 줘 빠지지 않게 한다.
        var urgentBox = $('scUrgent');
        urgentBox.textContent = '';
        var pinned = [];
        list.forEach(function (p) {
            if (p.scheduleType === 'urgent') {
                if (p.isPinned !== false || !p._months.length) urgentBox.appendChild(buildCard(p, { anchor: 'u-' + p._id }));
            } else if (p.isPinned === true || !p._months.length) {
                pinned.push(p);
            }
        });
        var pBox = $('scPinned');
        pBox.textContent = '';
        var showAll = filtering || state.pinnedOpen;
        pinned.forEach(function (p, i) {
            if (!showAll && i >= PINNED_LIMIT) return;
            pBox.appendChild(buildCard(p));
        });
        $('scPinnedEmpty').hidden = !!(pinned.length || urgentBox.children.length);
        var more = $('scPinnedMore');
        if (!filtering && pinned.length > PINNED_LIMIT) {
            more.hidden = false;
            more.setAttribute('aria-expanded', state.pinnedOpen ? 'true' : 'false');
            more.textContent = state.pinnedOpen ? '접기' : '상시 사업 전체 보기 (' + pinned.length + '개 중 ' + PINNED_LIMIT + '개 표시 중)';
        } else {
            more.hidden = true;
        }

        // Section C: 1~12월
        var box = $('scMonths');
        box.textContent = '';
        var guides = data.monthGuides || {};
        for (var m = 1; m <= 12; m++) {
            var items = monthly.filter(function (p) { return p._months.indexOf(m) >= 0; });
            var nb = document.querySelector('.sc-mn[data-month="' + m + '"]');
            if (nb) {
                nb.querySelector('.sc-mn-n').textContent = String(items.length);
                nb.classList.toggle('is-zero', !items.length);
                nb.setAttribute('aria-label', m + '월, ' + items.length + '건' + (m === NOW ? ', 이번 달' : ''));
            }
            var sec = el('section', 'sc-month' + (m === NOW ? ' is-now' : '') + (!items.length ? ' is-empty' : ''));
            sec.id = 'm-' + m;
            sec.setAttribute('tabindex', '-1');
            var h = el('h4', 'sc-month-title');
            h.appendChild(el('span', 'sc-month-num', m + '월'));
            if (m === NOW) h.appendChild(el('span', 'sc-month-now', '이번 달'));
            else if (m === nextMonth(NOW)) h.appendChild(el('span', 'sc-month-next', '다음 달'));
            h.appendChild(el('span', 'sc-month-cnt', items.length + '건'));
            sec.appendChild(h);
            if (guides[m] || guides[String(m)]) {
                var g = el('p', 'sc-guide');
                var gk = el('strong', null);
                gk.appendChild(icon('fa-solid fa-compass'));
                gk.appendChild(document.createTextNode(' 컨설턴트 액션 가이드 '));
                g.appendChild(gk);
                g.appendChild(document.createTextNode(guides[m] || guides[String(m)]));
                sec.appendChild(g);
            }
            if (items.length) {
                var grid = el('div', 'sc-grid');
                items.forEach(function (p) { grid.appendChild(buildCard(p, { now: m === NOW })); });
                sec.appendChild(grid);
            } else {
                sec.appendChild(el('p', 'sc-empty', filtering
                    ? '이 달에는 조건에 맞는 정기 공고가 없습니다.'
                    : '이 달에 새로 열리는 정기 공고는 없습니다. 위의 상시·수시 사업과 이미 선정된 사업의 협약·집행 일정을 점검하세요.'));
            }
            box.appendChild(sec);
        }
    }

    // GA: 신청처·상담·전화 클릭 (사업 id·종류만)
    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[data-sc]');
        if (!a) return;
        var card = a.closest('.sc-card');
        track('calendar_link_click', { link_type: a.getAttribute('data-sc'), program_id: card ? card.dataset.pid : '' });
    });

    load();
})();
