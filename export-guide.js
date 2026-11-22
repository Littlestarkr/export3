/* =========================================
   수출 가이드 (export-guide.html)
   - 질문·링크·점수 데이터는 export-guide-map.js(window.EG_MAP)
   - 규칙 기반, 브라우저 안에서 계산한다. 이름·연락처는 받지 않는다.
   - GUIDE_URL(Apps Script 웹 앱 주소)을 넣고, 방문자가 '저장 동의'를 체크한 경우에만
     고른 답(코드값)을 구글 시트에 익명으로 보낸다. 웹은 시트를 읽지 않는다(쓰기 전용).
   - 저장한 결과는 이 기기(localStorage 'egHistory')에서만 '내 이전 결과'로 다시 볼 수 있다.
   ========================================= */
(function () {
    'use strict';

    // 배포 후 export-guide-apps-script.gs 의 웹 앱 URL(…/exec)을 넣는다. 비어 있으면 저장 없이 결과만 보여 준다.
    var GUIDE_URL = 'https://script.google.com/macros/s/AKfycbw4X0zifJC896j7imvZxbblBC1wA-M0m3ZjB_G2I7MRQQ3yRS-TQdRFTzfnXnhKCtuxAA/exec';

    var M = window.EG_MAP;
    if (!M) return;
    var root = document.getElementById('egApp');
    if (!root) return;

    var KAKAO = 'https://open.kakao.com/o/sYyKojDh';
    var HIST_KEY = 'egHistory';
    var LAST_KEY = 'egLast';
    var HAND_KEY = 'egHandoff';
    var HIST_MAX = 5;

    var a = {};          // 답
    var step = 0;        // 보이는 질문 중 현재 위치
    var started = false;
    var saved = null;    // { id } 저장 성공 시
    var lastSummary = '';

    var $ = function (id) { return document.getElementById(id); };
    var vStart = $('egStart'), vQ = $('egQ'), vRes = $('egResult');

    function ga(name, params) {
        try { if (typeof gtag === 'function') gtag('event', name, params || {}); } catch (e) {}
    }
    function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }
    function arr(v) { return Array.isArray(v) ? v : []; }
    // Q8은 2026-11-22에 복수 선택으로 바뀌었다. 이전 결과(문자열 한 개, 옛 'tool' 코드)도 읽는다.
    function needList(a) {
        var v = typeof a.q8 === 'string' ? (a.q8 ? [a.q8] : []) : arr(a.q8);
        var out = [];
        v.forEach(function (c) { if (c === 'tool') c = 'info'; if (out.indexOf(c) < 0) out.push(c); });
        return out;
    }
    // Q2(창업 연차·기업 규모)는 복수 선택. 예전 기록(문자열)도 읽는다.
    function has2(v) { return (Array.isArray(a.q2) ? a.q2 : (a.q2 ? [a.q2] : [])).indexOf(v) >= 0; }
    function stageIdx(v) {
        for (var i = 0; i < M.stages.length; i++) if (M.stages[i].v === v) return i;
        return 0;
    }
    function qById(id) {
        for (var i = 0; i < M.questions.length; i++) if (M.questions[i].id === id) return M.questions[i];
        return null;
    }
    function label(qid, v) {
        var q = qById(qid);
        if (!q) return v;
        for (var i = 0; i < q.options.length; i++) if (q.options[i].v === v) return q.options[i].label;
        return v;
    }
    function isPlan() { return a.q1 === 's0' && a.q1b === 'prep'; }
    function visible() {
        return M.questions.filter(function (q) { return !q.when || q.when(a); });
    }
    function show(view) {
        [vStart, vQ, vRes].forEach(function (v) { v.hidden = v !== view; });
    }
    function scrollToApp() {
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var top = root.getBoundingClientRect().top + window.pageYOffset - (window.innerWidth > 768 ? 90 : 10);
        if (Math.abs(window.pageYOffset - top) > 40) window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    }

    /* ---------- 시작 화면 ---------- */
    function renderStart() {
        show(vStart);
        var consentBox = $('egConsentBox');
        consentBox.hidden = !GUIDE_URL;
        var hist = arr(lsGet(HIST_KEY));
        var box = $('egHistory');
        var list = $('egHistoryList');
        list.textContent = '';
        box.hidden = !hist.length;
        hist.forEach(function (h) {
            var li = el('li');
            var b = el('button', 'eg-hist-item');
            b.type = 'button';
            var st = M.stages[stageIdx(h.a && h.a.q1)];
            b.textContent = (h.t || '') + ' · ' + h.id + ' · 수출실적 ' + st.short;
            b.addEventListener('click', function () {
                a = JSON.parse(JSON.stringify(h.a || {}));
                saved = { id: h.id, fromHistory: true };
                renderResult(true);
            });
            li.appendChild(b);
            list.appendChild(li);
        });
    }

    $('egClearHist').addEventListener('click', function () {
        try { localStorage.removeItem(HIST_KEY); } catch (e) {}
        renderStart();
    });
    $('egBegin').addEventListener('click', function () {
        a = {}; step = 0; saved = null;
        if (!started) { started = true; ga('guide_start'); }
        renderQ();
        scrollToApp();
    });

    /* ---------- 질문 화면 ---------- */
    function renderQ() {
        show(vQ);
        var qs = visible();
        if (step >= qs.length) { finish(); return; }
        var q = qs[step];
        var total = qs.length;
        $('egStep').textContent = (step + 1) + ' / ' + total;
        $('egBar').value = step + 1;
        $('egBar').max = total;
        var title = $('egTitle');
        title.textContent = (q.id === 'q7' && isPlan() && q.titlePlan) ? q.titlePlan : q.title;
        var help = q.help || '';
        if (q.id === 'q6') help = (M.issueHelp[a.q1] || '') + ' ' + help;
        $('egHelp').textContent = help;
        $('egMsg').textContent = '';

        var opts = q.options.slice();
        if (q.id === 'q7' && !isPlan()) opts = opts.filter(function (o) { return !o.planOnly; });
        var more = [];
        if (q.id === 'q6') {
            var order = M.issueOrder[a.q1] || M.issueOrder.s0;
            var first = order.map(function (k) { return { v: k, label: M.issues[k] }; });
            more = opts.filter(function (o) { return order.indexOf(o.v) < 0; });
            opts = first;
        }
        var box = $('egOpts');
        box.textContent = '';
        box.setAttribute('role', q.type === 'one' ? 'radiogroup' : 'group');
        box.setAttribute('aria-labelledby', 'egTitle');
        box.classList.toggle('eg-opts-grouped', !!q.groups);
        if (q.groups) {
            q.groups.forEach(function (g) {
                box.appendChild(el('p', 'eg-grp-h', g.label));
                var sub = el('div', 'eg-opts');
                opts.forEach(function (o) { if (g.vs.indexOf(o.v) >= 0) sub.appendChild(optBtn(q, o)); });
                box.appendChild(sub);
            });
        } else {
            opts.forEach(function (o) { box.appendChild(optBtn(q, o)); });
        }

        var moreWrap = $('egMore');
        var moreBox = $('egMoreOpts');
        moreBox.textContent = '';
        moreWrap.hidden = !more.length;
        if (more.length) {
            var anyMoreSel = more.some(function (o) { return arr(a[q.id]).indexOf(o.v) >= 0; });
            moreWrap.open = anyMoreSel;
            more.forEach(function (o) { moreBox.appendChild(optBtn(q, o)); });
        }

        $('egPrev').disabled = step === 0;
        $('egSkip').hidden = !q.optional;
        updateNext(q);
        title.focus({ preventScroll: true });
    }

    function isSel(q, v) {
        return q.type === 'one' ? a[q.id] === v : arr(a[q.id]).indexOf(v) >= 0;
    }
    function optBtn(q, o) {
        var b = el('button', 'eg-opt', o.label);
        b.type = 'button';
        b.dataset.v = o.v;
        if (q.type === 'one') b.setAttribute('role', 'radio');
        b.setAttribute(q.type === 'one' ? 'aria-checked' : 'aria-pressed', isSel(q, o.v) ? 'true' : 'false');
        if (isSel(q, o.v)) b.classList.add('is-on');
        b.addEventListener('click', function () { pick(q, o.v); });
        return b;
    }
    function pick(q, v) {
        $('egMsg').textContent = '';
        if (q.type === 'one') {
            var changed = a[q.id] !== v;
            a[q.id] = v;
            if (q.id === 'q1' && v !== 's0') delete a.q1b;
            if (q.id === 'q1' && changed) { delete a.q6; }
            if ((q.id === 'q1' || q.id === 'q1b') && changed && arr(a.q7).indexOf('unknown') >= 0 && !isPlan()) {
                a.q7 = arr(a.q7).filter(function (x) { return x !== 'unknown'; });
            }
            refreshOpts(q);
            updateNext(q);
            // 하나만 고르는 질문은 고르면 바로 다음으로
            setTimeout(next, 220);
            return;
        }
        var cur = arr(a[q.id]).slice();
        var i = cur.indexOf(v);
        if (i >= 0) {
            cur.splice(i, 1);
        } else {
            var ex = q.exclusive || [];
            (q.groups || []).forEach(function (g) {
                if (g.vs.indexOf(v) >= 0) cur = cur.filter(function (x) { return g.vs.indexOf(x) < 0; });
            });
            if (ex.indexOf(v) >= 0) cur = [];
            else cur = cur.filter(function (x) { return ex.indexOf(x) < 0; });
            if (q.max && cur.length >= q.max) {
                $('egMsg').textContent = '최대 ' + q.max + '개까지 고를 수 있습니다. 다른 것을 먼저 해제해 주세요.';
                return;
            }
            cur.push(v);
        }
        a[q.id] = cur;
        refreshOpts(q);
        updateNext(q);
    }
    function refreshOpts(q) {
        Array.prototype.forEach.call(vQ.querySelectorAll('.eg-opt'), function (b) {
            var on = isSel(q, b.dataset.v);
            b.classList.toggle('is-on', on);
            b.setAttribute(q.type === 'one' ? 'aria-checked' : 'aria-pressed', on ? 'true' : 'false');
        });
    }
    function answered(q) {
        return q.type === 'one' ? !!a[q.id] : arr(a[q.id]).length > 0;
    }
    function updateNext(q) {
        var qs = visible();
        var last = step === qs.length - 1;
        var btn = $('egNext');
        btn.textContent = last ? '결과 보기' : '다음';
        btn.disabled = !q.optional && !answered(q);
    }
    function next() {
        var qs = visible();
        var q = qs[step];
        if (!q) return;
        if (!q.optional && !answered(q)) {
            $('egMsg').textContent = '하나 이상 골라 주세요.';
            return;
        }
        step++;
        if (step >= visible().length) finish(); else renderQ();
    }
    $('egNext').addEventListener('click', next);
    $('egPrev').addEventListener('click', function () { if (step > 0) { step--; renderQ(); } });
    $('egSkip').addEventListener('click', function () {
        var q = visible()[step];
        if (q) delete a[q.id];
        step++;
        if (step >= visible().length) finish(); else renderQ();
    });

    /* ---------- 추천 계산 ---------- */
    function recommend() {
        var st = stageIdx(a.q1);
        var stShort = M.stages[st].short;
        var S = {}, R = {}, order = [];
        var consultTop = false;
        function add(id, pts, why) {
            if (!M.links[id]) return;
            if (!(id in S)) { S[id] = 0; R[id] = []; order.push(id); }
            S[id] += pts;
            R[id].push([pts, why]);
        }
        var ins = st <= 2 ? 'ksure-dplus' : 'ksure-plus';
        var issues = arr(a.q6), forms = arr(a.q4), pays = arr(a.q7), mk = arr(a.q5);

        // 1) 수출실적 단계 기본 추천(●)
        Object.keys(M.stageMap).forEach(function (id) {
            if (M.stageMap[id].s[st] === 2) add(id, 2, '수출실적 ' + stShort + ' 단계에서 많이 쓰는 제도라서');
        });
        if (st === 0 && (a.q1b === 'nego' || a.q1b === 'order')) {
            add('doc-builder', 2, '첫 거래를 진행 중이라서');
            add('fraud', 2, '첫 거래를 진행 중이라서');
        }

        // 2) 애로사항(Q6)
        var I = {
            buyer:   function (w) { add('buyer', 3, w); if (st === 0) add('k-domestic', 2, w); },
            docs:    function (w) { add('doc-builder', 3, w); add('export-docs', 2, w); add('contract', 2, w); },
            collect: function (w) { add(ins, 3, w); add('credit', 2, w); add('claim', 2, w); },
            importer: function (w) { add('credit', 3, w); add(ins, 2, w); },
            factoring: function (w) { add('ksure-postship', 3, w); add('ksure-after', 2, w); },
            // 무역클레임(작가님 확정): 무역클레임 대응 가이드(trade-claim.html, 2026-11-22)를 맨 앞에, 중소중견Plus+(클레임위험 특약)·농수산물패키지(클레임비용위험)·대한상사중재원. 계약서·중재 법령은 보조
            tclaim:  function (w) {
                add('trade-claim', 6, w); add('ksure-plus', 3, w); add('kcab', 4, w); add('ksure-agri', a.q3 === 'agri' ? 3 : 1, w);
                add('contract', 1, w); add('law-adr', 1, w); consultTop = true;
            },
            fx:      function (w) { add('fx', 3, w); add('qna-fx', 2, w); },
            fund:    function (w) {
                add('policy-fund', 3, w); add('guarantee', 2, w); add('semas-innov', 3, w);
                if (st >= 4) add('exim', 2, w);
                if (a.q3 === 'agri') add('at', 2, w);
            },
            cert:    function (w) { add('cert', 3, w); if (a.q3 === 'cosmetic') add('cosmetic', 2, w); },
            hs:      function (w) { add('trade-stats', 3, w); add('customs', 2, w); add('lawsearch', 2, w); },
            support: function (w) { add('voucher', 3, w); add('k-domestic', 2, w); if (has2('startup') || has2('y7')) add('rnd', 2, w); },
            fraud:   function (w) { add('fraud', 3, w); add('export-docs', 2, w); },
            market:  function (w) { add('trade-stats', 3, w); add('k-market', 2, w); add('nationgrade', 2, w); }
        };
        issues.forEach(function (k) { if (I[k]) I[k]("'" + M.issues[k] + "'를 골라서"); });

        // 3) 수출 형태(Q4)
        forms.forEach(function (f) {
            var w = "수출 형태로 '" + label('q4', f) + "'를 골라서";
            if (f === 'local') { add('k-domestic', 2, w); add('qna-fx', 2, w); }
            if (f === 'b2c') add('b2c', 2, w);
            if (f === 'b2b') { add('buyer', 2, w); add('doc-builder', 1, w); }
            if (f === 'relay') { add('ksure-plus', 2, w); add('claim-exempt', 2, w); }
            if (f === 'other') consultTop = true;
        });

        // 4) 규모(Q2)·품목(Q3)
        if (has2('startup')) add('rnd', 2, '창업 3년 이내 기업이라서');
        if (has2('y7')) add('rnd', 1, '창업 7년 이내 기업이라서');
        if (has2('smallbiz')) { add('semas-innov', 3, '최근 1년 직·간접 수출실적 1천 달러 이상 소상공인이라서'); add('hope', 1, '소상공인이라서'); }
        var w3 = "품목으로 '" + label('q3', a.q3) + "'을 골라서";
        if (a.q3 === 'agri') { add('agri', 2, w3); add('ksure-agri', 2, w3); add('at', 2, w3); }
        if (a.q3 === 'cosmetic') { add('cosmetic', 2, w3); add('cert', 1, w3); }
        if (a.q3 === 'service') add('ksure-service', 2, w3);

        // 5) 시장(Q5)
        if (mk.indexOf('undecided') >= 0) { add('trade-stats', 1, '목표 시장이 아직 미정이라서'); add('k-market', 1, '목표 시장이 아직 미정이라서'); }

        // 6) 결제 방식(Q7)
        pays.forEach(function (p) {
            var w = "결제 방식으로 '" + label('q7', p) + "'를 골라서";
            if (p === 'prepay') { add('fraud', 1, w); add('doc-builder', 1, w); }
            if (p === 'lc') { add('export-docs', 1, w); add('doc-builder', 1, w); }
            if (p === 'collection' || p === 'deferred') { add(ins, 2, w); add('credit', 2, w); add('claim', 2, w); }
            if (p === 'other') consultTop = true;
        });

        // 7) 필요(Q8)
        var needs = needList(a);
        if (needs.indexOf('info') >= 0) { var wi = '수출 자료·도구가 필요하다고 해서'; add('doc-builder', 1, wi); add('trade-stats', 1, wi); add('export-docs', 1, wi); }
        if (needs.indexOf('market') >= 0) { var wm = '시장개척·바이어 발굴이 필요하다고 해서'; add('buyer', 1, wm); add('k-market', 1, wm); add('trade-stats', 1, wm); }
        if (needs.indexOf('fund') >= 0) { var wf = '자금·무역보험·지원사업이 필요하다고 해서'; add('policy-fund', 1, wf); add(ins, 1, wf); add('voucher', 1, wf); }
        if (needs.indexOf('consult') >= 0) consultTop = true;

        // 자격 기준 거르기
        var list = order.filter(function (id) {
            var sm = M.stageMap[id];
            if (sm && sm.hard && sm.s[st] === 0) return false;
            if (sm && sm.size && !has2(sm.size)) return false;
            return S[id] > 0;
        });
        list.sort(function (x, y) { return (S[y] - S[x]) || (order.indexOf(x) - order.indexOf(y)); });
        var why = function (id) {
            var best = R[id][0];
            R[id].forEach(function (r) { if (r[0] > best[0]) best = r; });
            return best[1];
        };
        return {
            top: list.slice(0, 3).map(function (id) { return { id: id, why: why(id) }; }),
            more: list.slice(3, 7).map(function (id) { return { id: id, why: why(id) }; }),
            consultTop: consultTop
        };
    }

    function linkUrl(id) {
        if (id === 'policy-fund') {
            if (has2('smallbiz')) return 'policy-finance.html?org=semas';
            if (has2('mid') || has2('large')) return 'policy-finance.html';
            return 'policy-finance.html?org=kosmes';
        }
        return M.links[id].u;
    }
    function linkEl(id, cls, text) {
        var L = M.links[id];
        var x = el('a', cls, text || L.t);
        x.href = linkUrl(id);
        x.dataset.egLink = id;
        if (L.ext) { x.target = '_blank'; x.rel = 'noopener noreferrer'; }
        return x;
    }

    /* ---------- 요약 문장 ---------- */
    function listLabels(qid, vals) { return arr(vals).map(function (v) { return label(qid, v); }).join(', '); }
    function q2Short() {
        var p = (Array.isArray(a.q2) ? a.q2 : (a.q2 ? [a.q2] : [])).map(function (v) { return M.short.q2[v]; }).filter(Boolean);
        if (p.length === 1 && /^창업/.test(p[0])) p.push('기업');
        return p.join(' ');
    }
    function oneLine() {
        var st = M.stages[stageIdx(a.q1)];
        var who = q2Short() || '기업';
        var bits = [label('q3', a.q3), listLabels('q4', a.q4), listLabels('q5', a.q5)].filter(Boolean).join(' · ');
        var s = '최근 1년(또는 전년도) 수출실적 ' + st.short + ' 단계';
        if (a.q1 === 's0' && a.q1b) s = '수출실적이 아직 없고 ' + M.short.q1b[a.q1b] + '인 단계';
        s += '의 ' + who + (bits ? '(' + bits + ')' : '') + '이고, ';
        var iss = arr(a.q6).map(function (k) { return M.issues[k]; });
        s += iss.length ? '가장 큰 어려움은 ' + iss.join(' / ') + '입니다.' : '어려운 점은 고르지 않았습니다.';
        return s;
    }
    function summaryText(withId) {
        var st = M.stages[stageIdx(a.q1)];
        var L = [];
        L.push('[수출 가이드 결과]' + (withId && saved && saved.id ? ' 접수번호 ' + saved.id : ''));
        var s1 = '수출실적(최근 1년 또는 전년도): ' + st.label;
        if (a.q1 === 's0' && a.q1b) s1 += ' / 진행 거래: ' + M.short.q1b[a.q1b];
        L.push(s1);
        L.push('수출 형태(희망 포함): ' + (listLabels('q4', a.q4) || '-'));
        L.push('창업 연차·규모: ' + (listLabels('q2', Array.isArray(a.q2) ? a.q2 : (a.q2 ? [a.q2] : [])) || '-') + ' / 품목: ' + (label('q3', a.q3) || '-') + ' / 시장: ' + (listLabels('q5', a.q5) || '-'));
        L.push('어려운 점: ' + (arr(a.q6).map(function (k) { return M.issues[k]; }).join(', ') || '-'));
        L.push('결제 방식: ' + (listLabels('q7', a.q7) || '-') + ' / 필요: ' + (needList(a).map(function (c) { return label('q8', c); }).filter(Boolean).join(', ') || '-'));
        return L.join('\n');
    }

    /* ---------- 결과 화면 ---------- */
    function finish() {
        var rec = renderResult(false);
        ga('guide_complete', {
            stage: a.q1, size: arr(a.q2).join(','), item: a.q3 || '',
            forms: arr(a.q4).join(','), issues: arr(a.q6).join(','), pays: arr(a.q7).join(','), need: needList(a).join(',')
        });
        maybeSave(rec);
    }

    function renderResult(fromHistory) {
        show(vRes);
        var rec = recommend();
        $('egSummary').textContent = oneLine();

        var top = $('egTop');
        top.textContent = '';
        rec.top.forEach(function (r, i) {
            var L = M.links[r.id];
            var card = el('article', 'eg-card');
            card.appendChild(el('span', 'eg-card-n', String(i + 1)));
            var body = el('div', 'eg-card-body');
            body.appendChild(el('h4', 'eg-card-t', L.t));
            body.appendChild(el('p', 'eg-card-why', r.why));
            body.appendChild(el('p', 'eg-card-d', L.d));
            var go = linkEl(r.id, 'eg-card-go', '바로 가기');
            var ic = el('i', L.ext ? 'fa-solid fa-arrow-up-right-from-square' : 'fa-solid fa-arrow-right');
            ic.setAttribute('aria-hidden', 'true');
            go.appendChild(document.createTextNode(' '));
            go.appendChild(ic);
            body.appendChild(go);
            card.appendChild(body);
            top.appendChild(card);
        });

        var more = $('egMoreList');
        more.textContent = '';
        $('egMoreBox').hidden = !rec.more.length;
        rec.more.forEach(function (r) {
            var li = el('li');
            li.appendChild(linkEl(r.id, 'eg-more-link'));
            li.appendChild(el('span', 'eg-more-why', ' — ' + r.why));
            more.appendChild(li);
        });

        // 수출 형태별 참고
        var forms = arr(a.q4);
        var fBox = $('egForms'), fList = $('egFormList');
        fList.textContent = '';
        var anyForm = false;
        forms.forEach(function (f) {
            var ids = M.formLinks[f] || [];
            if (!ids.length) return;
            anyForm = true;
            var li = el('li');
            li.appendChild(el('strong', null, label('q4', f) + ': '));
            ids.forEach(function (id, k) {
                if (k) li.appendChild(document.createTextNode(' · '));
                li.appendChild(linkEl(id, 'eg-more-link'));
            });
            fList.appendChild(li);
        });
        fBox.hidden = !anyForm;
        $('egLocalNote').hidden = !(forms.length === 1 && forms[0] === 'local');

        // 상담 상자 위치: '전문가 상담'·'기타'를 고르면 추천 위로
        var consult = $('egConsult');
        var anchor = rec.consultTop ? $('egTopWrap') : $('egFormsAnchor');
        anchor.parentNode.insertBefore(consult, rec.consultTop ? anchor : anchor.nextSibling);

        $('egSaveMsg').textContent = '';
        if (fromHistory && saved && saved.id) {
            $('egSaveMsg').textContent = '이 기기에 저장해 둔 결과입니다(접수번호 ' + saved.id + ').';
        }
        lastSummary = summaryText(true);
        $('egResTitle').focus({ preventScroll: true });
        scrollToApp();
        return rec;
    }

    /* ---------- 시트 저장(동의 시에만) ---------- */
    function newId() {
        var d = new Date();
        var p = function (n) { return (n < 10 ? '0' : '') + n; };
        var ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var r = '';
        for (var i = 0; i < 4; i++) r += ch.charAt(Math.floor(Math.random() * ch.length));
        return 'EG-' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '-' + r;
    }
    function today() {
        var d = new Date();
        var p = function (n) { return (n < 10 ? '0' : '') + n; };
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    }
    function maybeSave(rec) {
        var msg = $('egSaveMsg');
        if (!GUIDE_URL || !$('egConsent').checked) return;
        var last = lsGet(LAST_KEY);
        if (last && Date.now() - last < 60000) {
            msg.textContent = '방금 저장한 결과가 있어 이번 결과는 저장하지 않았습니다.';
            return;
        }
        var id = newId();
        var body = new URLSearchParams();
        body.set('action', 'save');
        body.set('id', id);
        body.set('website', $('egHp').value || '');
        body.set('q1', a.q1 || ''); body.set('q1b', a.q1b || '');
        body.set('q2', arr(a.q2).join(',')); body.set('q3', a.q3 || '');
        body.set('q4', arr(a.q4).join(',')); body.set('q5', arr(a.q5).join(','));
        body.set('q6', arr(a.q6).join(',')); body.set('q7', arr(a.q7).join(','));
        body.set('q8', needList(a).join(','));
        body.set('rec', rec.top.map(function (r) { return r.id; }).join(','));
        body.set('v', String(M.version));
        msg.textContent = '저장하는 중입니다…';
        fetch(GUIDE_URL, { method: 'POST', body: body })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (!res || res.result !== 'success') throw new Error('fail');
                saved = { id: id };
                lsSet(LAST_KEY, Date.now());
                var hist = arr(lsGet(HIST_KEY));
                hist.unshift({ id: id, t: today(), a: a, v: M.version });
                lsSet(HIST_KEY, hist.slice(0, HIST_MAX));
                lastSummary = summaryText(true);
                msg.textContent = '접수번호 ' + id + '로 익명 저장했습니다. 이 결과는 이 기기에서만 다시 볼 수 있습니다.';
            })
            .catch(function () {
                msg.textContent = '저장하지 못했습니다. 결과는 그대로 보실 수 있습니다.';
            });
    }
    function pingContact(via) {
        if (!GUIDE_URL || !saved || !saved.id) return;
        try {
            var b = new URLSearchParams();
            b.set('action', 'contact'); b.set('id', saved.id); b.set('via', via);
            if (navigator.sendBeacon) navigator.sendBeacon(GUIDE_URL, b);
            else fetch(GUIDE_URL, { method: 'POST', body: b, keepalive: true });
        } catch (e) {}
    }

    /* ---------- 결과 화면 단추 ---------- */
    function copyText(t, done) {
        function fallback() {
            var ta = el('textarea', 'eg-copy-ta');
            ta.value = t;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(true); } catch (e) { done(false); }
            document.body.removeChild(ta);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(t).then(function () { done(true); }, fallback);
        } else fallback();
    }
    $('egToForm').addEventListener('click', function () {
        try { sessionStorage.setItem(HAND_KEY, lastSummary); } catch (e) {}
        pingContact('form');
        ga('guide_to_contact', { method: 'form' });
    });
    $('egToKakao').addEventListener('click', function () {
        copyText(lastSummary, function (ok) {
            $('egCopyMsg').textContent = ok ? '결과 요약을 복사했습니다. 카카오톡 대화창에 붙여 넣어 주세요.' : '';
        });
        pingContact('kakao');
        ga('guide_to_contact', { method: 'kakao' });
    });
    $('egCopy').addEventListener('click', function () {
        copyText(lastSummary, function (ok) {
            $('egCopyMsg').textContent = ok ? '결과 요약을 복사했습니다.' : '복사하지 못했습니다. 화면을 직접 선택해 복사해 주세요.';
        });
        ga('guide_to_contact', { method: 'copy' });
    });
    $('egPrint').addEventListener('click', function () { window.print(); });
    $('egRestart').addEventListener('click', function () {
        a = {}; step = 0; saved = null;
        renderStart();
        scrollToApp();
    });
    root.addEventListener('click', function (e) {
        var x = e.target.closest && e.target.closest('[data-eg-link]');
        if (x) ga('guide_link_click', { target: x.dataset.egLink });
    });
    $('egToKakao').href = KAKAO;

    renderStart();
})();
