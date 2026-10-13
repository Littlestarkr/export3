/*
 * 정책자금 및 수출금융 페이지 동작
 * 데이터: data/policy-products.js (PF_ORGS, PF_TAGS, PF_PRODUCTS, PF_AS_OF)
 * 필터 규칙: 서로 다른 항목끼리는 AND, 같은 항목 안에서 여러 개를 고르면 OR(빠른 조건만 AND)
 */
(function () {
    'use strict';

    /* ── 선택지 정의 ── */
    var SIZE_OPTIONS = [
        { id: 'all', label: '전체' },
        { id: 'micro', label: '소상공인' },
        { id: 'small', label: '소기업' },
        { id: 'sme', label: '중소기업' }
    ];
    var SIZE_RANK = { micro: 1, small: 2, sme: 3 };

    // 수출실적 구간 [최소 USD, 최대 USD]
    var EXP_OPTIONS = [
        { id: 'all', label: '전체', range: null },
        { id: 'none', label: '실적 없음 (내수·준비 중)', range: [0, 0] },
        { id: 'l1', label: '1천 불 ~ 10만 불 미만', range: [1000, 99999] },
        { id: 'l2', label: '10만 불 ~ 100만 불 미만', range: [100000, 999999] },
        { id: 'l3', label: '100만 불 ~ 500만 불 미만', range: [1000000, 4999999] },
        { id: 'l4', label: '500만 불 이상', range: [5000000, Infinity] }
    ];

    var PURPOSE_OPTIONS = [
        { id: 'working', label: '운전자금' },
        { id: 'facility', label: '시설자금' },
        { id: 'export', label: '수출이행·무역금융' },
        { id: 'guarantee', label: '신용보증' },
        { id: 'insurance', label: '무역보험' }
    ];

    var METHOD_OPTIONS = [
        { id: 'direct', label: '직접대출' },
        { id: 'proxy', label: '대리대출' },
        { id: 'guarantee', label: '보증' },
        { id: 'subsidy', label: '이차보전' },
        { id: 'insurance', label: '보험' },
        { id: 'bank', label: '은행 경유' }
    ];

    var METHOD_LABEL = {};
    METHOD_OPTIONS.forEach(function (m) { METHOD_LABEL[m.id] = m.label; });
    var PURPOSE_LABEL = {};
    PURPOSE_OPTIONS.forEach(function (m) { PURPOSE_LABEL[m.id] = m.label; });
    var TAG_LABEL = {};
    PF_TAGS.forEach(function (t) { TAG_LABEL[t.id] = t.label; });
    var ORG_BY_ID = {};
    PF_ORGS.forEach(function (o) { ORG_BY_ID[o.id] = o; });

    /* ── 상태 ── */
    var state = {
        size: 'all',
        exp: 'all',
        purposes: [],
        methods: [],
        tags: [],
        q: '',
        org: 'all'
    };

    /* ── 유틸 ── */
    function $(id) { return document.getElementById(id); }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function toggleIn(arr, value) {
        var i = arr.indexOf(value);
        if (i === -1) arr.push(value); else arr.splice(i, 1);
    }

    /* ── 필터 판정 ── */
    function matchSize(p) {
        if (state.size === 'all') return true;
        return SIZE_RANK[state.size] <= SIZE_RANK[p.size];
    }

    function matchExp(p) {
        if (state.exp === 'all') return true;
        if (p.exp == null) return true; // 수출실적 요건이 없는 상품은 모든 구간에 해당
        var level = EXP_OPTIONS.filter(function (o) { return o.id === state.exp; })[0].range;
        var pmin = p.exp[0];
        var pmax = p.exp[1] == null ? Infinity : p.exp[1];
        return pmin <= level[1] && pmax >= level[0];
    }

    function matchPurpose(p) {
        if (!state.purposes.length) return true;
        return p.purpose.some(function (x) { return state.purposes.indexOf(x) !== -1; });
    }

    function matchMethod(p) {
        if (!state.methods.length) return true;
        return state.methods.indexOf(p.method) !== -1;
    }

    function matchTags(p) {
        if (!state.tags.length) return true;
        var own = p.tags || [];
        return state.tags.every(function (t) { return own.indexOf(t) !== -1; });
    }

    function matchQuery(p) {
        var q = state.q.trim().toLowerCase();
        if (!q) return true;
        var hay = [p.name, p.summary, p.target, p.notes || '', p.by, p.limit, p.rate]
            .concat((p.tags || []).map(function (t) { return TAG_LABEL[t] || ''; }))
            .join(' ').toLowerCase();
        return q.split(/\s+/).every(function (word) { return hay.indexOf(word) !== -1; });
    }

    function filterBase() {
        return PF_PRODUCTS.filter(function (p) {
            return matchSize(p) && matchExp(p) && matchPurpose(p) &&
                matchMethod(p) && matchTags(p) && matchQuery(p);
        });
    }

    /* ── 렌더링: 필터 칩 ── */
    function chip(label, active, attrs) {
        return '<button type="button" class="pf-chip' + (active ? ' is-active' : '') + '" ' + attrs +
            ' aria-pressed="' + (active ? 'true' : 'false') + '">' + esc(label) + '</button>';
    }

    function renderChips() {
        $('pfSize').innerHTML = SIZE_OPTIONS.map(function (o) {
            return chip(o.label, state.size === o.id, 'data-group="size" data-value="' + o.id + '"');
        }).join('');

        $('pfExp').innerHTML = EXP_OPTIONS.map(function (o) {
            return chip(o.label, state.exp === o.id, 'data-group="exp" data-value="' + o.id + '"');
        }).join('');

        $('pfPurpose').innerHTML = PURPOSE_OPTIONS.map(function (o) {
            return chip(o.label, state.purposes.indexOf(o.id) !== -1, 'data-group="purposes" data-value="' + o.id + '"');
        }).join('');

        $('pfMethod').innerHTML = METHOD_OPTIONS.map(function (o) {
            return chip(o.label, state.methods.indexOf(o.id) !== -1, 'data-group="methods" data-value="' + o.id + '"');
        }).join('');

        $('pfTags').innerHTML = PF_TAGS.map(function (t) {
            return chip(t.label, state.tags.indexOf(t.id) !== -1, 'data-group="tags" data-value="' + t.id + '"');
        }).join('');

        var n = (state.size !== 'all' ? 1 : 0) + (state.exp !== 'all' ? 1 : 0) +
            state.purposes.length + state.methods.length + state.tags.length + (state.q.trim() ? 1 : 0);
        $('pfFilterCount').textContent = n ? n + '개 조건 적용 중' : '';
    }

    /* ── 렌더링: 기관 탭 ── */
    function renderTabs(base) {
        var counts = {};
        base.forEach(function (p) { counts[p.org] = (counts[p.org] || 0) + 1; });

        var html = '<button type="button" role="tab" class="pf-tab' + (state.org === 'all' ? ' is-active' : '') +
            '" aria-selected="' + (state.org === 'all') + '" data-org="all">전체 <em>' + base.length + '</em></button>';

        PF_ORGS.forEach(function (o) {
            var c = counts[o.id] || 0;
            html += '<button type="button" role="tab" class="pf-tab' + (state.org === o.id ? ' is-active' : '') +
                (c === 0 ? ' is-zero' : '') + '" aria-selected="' + (state.org === o.id) +
                '" data-org="' + o.id + '">' + esc(o.short) + ' <em>' + c + '</em></button>';
        });
        $('pfTabs').innerHTML = html;

        var desc = $('pfOrgDesc');
        if (state.org === 'all') {
            desc.hidden = true;
        } else {
            var org = ORG_BY_ID[state.org];
            desc.hidden = false;
            desc.innerHTML = '<strong>' + esc(org.name) + '</strong> · ' + esc(org.desc) +
                ' <a href="' + esc(org.url) + '" target="_blank" rel="noopener noreferrer">공식 사이트 <i class="fa-solid fa-arrow-up-right-from-square"></i></a>';
        }
    }

    /* ── 렌더링: 카드 ── */
    function fact(label, value) {
        return '<div class="pf-fact"><dt>' + label + '</dt><dd>' + esc(value) + '</dd></div>';
    }

    function cardHTML(p) {
        var org = ORG_BY_ID[p.org];
        var tags = (p.tags || []).map(function (t) {
            return '<span class="pf-tag">' + esc(TAG_LABEL[t]) + '</span>';
        }).join('');
        var purposes = p.purpose.map(function (x) { return PURPOSE_LABEL[x]; }).join(' · ');

        var more = '';
        if (p.notes) more += '<p>' + esc(p.notes) + '</p>';
        more += '<p class="pf-more-meta"><strong>자금 용도</strong> ' + esc(purposes) + '</p>';
        if (p.verify) {
            more += '<p class="pf-verify"><i class="fa-solid fa-triangle-exclamation"></i> ' + esc(p.verify) + '</p>';
        }

        return '<article class="pf-card" data-org="' + esc(p.org) + '">' +
            '<div class="pf-card-head">' +
            '<span class="pf-badge pf-badge-' + esc(p.org) + '">' + esc(p.by) + '</span>' +
            '<span class="pf-method">' + esc(METHOD_LABEL[p.method]) + '</span>' +
            (p.verify ? '<span class="pf-check" title="자료마다 수치가 달라 최신 공고 확인이 필요합니다">확인 필요</span>' : '') +
            '</div>' +
            '<h4>' + esc(p.name) + '</h4>' +
            '<p class="pf-summary">' + esc(p.summary) + '</p>' +
            '<dl class="pf-facts">' +
            fact('대상', p.target) + fact('한도', p.limit) + fact('금리·보증료', p.rate) + fact('기간', p.term) +
            '</dl>' +
            (tags ? '<div class="pf-tags">' + tags + '</div>' : '') +
            '<details class="pf-more"><summary>자세히 보기</summary><div class="pf-more-body">' + more + '</div></details>' +
            '<div class="pf-actions">' +
            '<a href="' + esc(org.url) + '" target="_blank" rel="noopener noreferrer" class="pf-btn pf-btn-line">공식 사이트</a>' +
            '<a href="index.html#contact" class="pf-btn pf-btn-solid">상담 받기</a>' +
            '</div>' +
            '</article>';
    }

    function renderCards(base) {
        var list = state.org === 'all' ? base : base.filter(function (p) { return p.org === state.org; });
        $('pfGrid').innerHTML = list.map(cardHTML).join('');
        $('pfEmpty').hidden = list.length > 0;
        $('pfResultCount').textContent = list.length
            ? '총 ' + list.length + '개 상품 (전체 ' + PF_PRODUCTS.length + '개 중)'
            : '';
    }

    function render() {
        var base = filterBase();
        renderChips();
        renderTabs(base);
        renderCards(base);
        syncUrl();
    }

    /* ── URL 쿼리 저장/복원 (조건을 링크로 공유할 수 있게) ── */
    function syncUrl() {
        try {
            var params = new URLSearchParams();
            if (state.size !== 'all') params.set('size', state.size);
            if (state.exp !== 'all') params.set('exp', state.exp);
            if (state.purposes.length) params.set('purpose', state.purposes.join(','));
            if (state.methods.length) params.set('method', state.methods.join(','));
            if (state.tags.length) params.set('tag', state.tags.join(','));
            if (state.q.trim()) params.set('q', state.q.trim());
            if (state.org !== 'all') params.set('org', state.org);
            var qs = params.toString();
            history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
        } catch (e) { /* file:// 등에서는 무시 */ }
    }

    function restoreFromUrl() {
        try {
            var params = new URLSearchParams(location.search);
            var valid = function (list, v) { return list.some(function (o) { return o.id === v; }); };
            var pick = function (key, list) {
                return (params.get(key) || '').split(',').filter(function (v) { return valid(list, v); });
            };
            if (valid(SIZE_OPTIONS, params.get('size'))) state.size = params.get('size');
            if (valid(EXP_OPTIONS, params.get('exp'))) state.exp = params.get('exp');
            state.purposes = pick('purpose', PURPOSE_OPTIONS);
            state.methods = pick('method', METHOD_OPTIONS);
            state.tags = pick('tag', PF_TAGS);
            state.q = params.get('q') || '';
            if (valid(PF_ORGS, params.get('org'))) state.org = params.get('org');
        } catch (e) { /* 무시 */ }
    }

    /* ── 이벤트 ── */
    function resetAll() {
        state.size = 'all';
        state.exp = 'all';
        state.purposes = [];
        state.methods = [];
        state.tags = [];
        state.q = '';
        state.org = 'all';
        $('pfSearch').value = '';
        render();
    }

    function bind() {
        $('pfFilter').addEventListener('click', function (e) {
            var btn = e.target.closest('.pf-chip');
            if (!btn) return;
            var group = btn.getAttribute('data-group');
            var value = btn.getAttribute('data-value');
            if (group === 'size' || group === 'exp') {
                state[group] = value;
            } else {
                toggleIn(state[group], value);
            }
            render();

            // 칩을 다시 그리면 키보드 포커스가 사라지므로 같은 칩으로 되돌린다
            var again = $('pfFilter').querySelector(
                '.pf-chip[data-group="' + group + '"][data-value="' + value + '"]');
            if (again) again.focus();
        });

        $('pfTabs').addEventListener('click', function (e) {
            var btn = e.target.closest('.pf-tab');
            if (!btn) return;
            state.org = btn.getAttribute('data-org');
            render();
        });

        $('pfSearch').addEventListener('input', function () {
            state.q = this.value;
            render();
        });

        $('pfReset').addEventListener('click', resetAll);
        $('pfEmptyReset').addEventListener('click', resetAll);
    }

    function init() {
        $('pfAsOf').textContent = PF_AS_OF;
        restoreFromUrl();
        $('pfSearch').value = state.q;

        // 모바일에서는 필터 패널을 접은 상태로 시작
        if (window.matchMedia('(max-width: 768px)').matches && !location.search) {
            $('pfFilter').removeAttribute('open');
        }

        bind();
        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
