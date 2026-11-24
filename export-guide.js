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
    var NOW_KEY = 'egNow';   // 이 탭에서 마지막으로 본 결과(뒤로가기 복원용, sessionStorage)
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
    // Q3 품목은 2026-11-22에 복수 선택으로 바뀌었다. 이전 결과(문자열 한 개)도 읽는다.
    function items(o) { var v = (o || a).q3; return typeof v === 'string' ? (v ? [v] : []) : arr(v); }
    // '기타'에 적은 글(Q6). 화면에는 textContent·value 로만 넣는다(HTML로 넣지 않음)
    function etcValue() { return String(a.q6etc || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 100); }
    function hasItem(v) { return items().indexOf(v) >= 0; }
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
    function revObj(v) {
        var list = M.revenues || [];
        for (var i = 0; i < list.length; i++) if (list[i].v === v) return list[i];
        return null;
    }
    function revIdx(v) {
        var rv = revObj(v);
        return rv ? (rv.tier || 0) : 0;
    }
    function qById(id) {
        for (var i = 0; i < M.questions.length; i++) {
            if (M.questions[i].id === id) return M.questions[i];
            if (M.questions[i].extraOne && M.questions[i].extraOne.id === id) return M.questions[i].extraOne;
            if (M.questions[i].followOne && M.questions[i].followOne.id === id) return M.questions[i].followOne;
        }
        return null;
    }
    function label(qid, v) {
        var q = qById(qid);
        if (!q) return v;
        for (var i = 0; i < q.options.length; i++) if (q.options[i].v === v) return q.options[i].label;
        return v;
    }
    // 진행 거래 계약금액(Q1 보조 질문의 꼬리 질문): 협상·첫 주문일 때만 의미가 있다
    function dealObj() {
        if (a.q1 !== 's0' || !(a.q1b === 'nego' || a.q1b === 'order')) return null;
        var list = M.deals || [];
        for (var i = 0; i < list.length; i++) if (list[i].v === a.q1c) return list[i];
        return null;
    }
    function followOn(q) { return !!(q.followOne && q.followOne.when(a)); }
    function isPlan() { return a.q1 === 's0' && a.q1b === 'prep'; }
    function visible() {
        return M.questions.filter(function (q) { return !q.when || q.when(a); });
    }
    function show(view) {
        [vStart, vQ, vRes].forEach(function (v) { v.hidden = v !== view; });
        // 질문에 답하는 동안에는 떠 있는 '이전 화면'·'홈' 단추(back-nav.js)를 숨긴다. 휴대폰에서 보기 단추 위에 겹쳐
        // 화면을 넘기다 잘못 눌리거나 질문의 '이전'으로 착각해 홈으로 나가 버리던 문제(2026-11-24)
        document.body.classList.toggle('eg-asking', view === vQ);
    }
    function scrollToApp(instant) {
        var reduce = instant || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        var top = Math.max(0, root.getBoundingClientRect().top + window.pageYOffset - (window.innerWidth > 768 ? 90 : 10));
        if (window.pageYOffset > top || top - window.pageYOffset > 40) {
            if (reduce) {
                try { window.scrollTo({ top: top, behavior: 'instant' }); } catch (e) { window.scrollTo(0, top); }
            } else {
                window.scrollTo({ top: top, behavior: 'smooth' });
            }
        }
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
            var rv = revObj(h.a && h.a.q1r);
            b.textContent = (h.t || '') + ' · ' + h.id + ' · 수출 ' + st.short + (rv ? ' · 매출 ' + rv.short : '');
            b.addEventListener('click', function () {
                a = JSON.parse(JSON.stringify(h.a || {}));
                a.q3 = items(a);
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
        a = {}; step = 0; saved = null; nowClear();
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
        // 기본값(작가님 2026-11-22: Q7은 외상거래 미리 선택). 처음 볼 때만 넣고, 사용자가 바꾼 값(빈 선택 포함)은 그대로 둔다.
        if (q.def && a[q.id] === undefined) a[q.id] = q.def.slice();
        var total = qs.length;
        $('egStep').textContent = (step + 1) + ' / ' + total;
        $('egBar').value = step + 1;
        $('egBar').max = total;
        var title = $('egTitle');
        title.textContent = (q.id === 'q7' && isPlan() && q.titlePlan) ? q.titlePlan : q.title;
        var help = q.help || '';
        if (q.id === 'q6') help = (M.issueHelp[a.q1] || '') + ' ' + help;
        var helpEl = $('egHelp');
        helpEl.textContent = help;
        // '전체 선택'(2026-11-22 작가님, Q6만): 안내문 끝의 체크 상자. 접힌 보기까지 모두 고르고, 하나라도 풀면 체크가 풀린다
        if (q.selectAll) {
            var lab = el('label', 'eg-all');
            var cb = el('input');
            cb.type = 'checkbox';
            cb.id = 'egAll';
            cb.addEventListener('change', function () {
                var keepEtc = arr(a[q.id]).indexOf('etc') >= 0;
                a[q.id] = cb.checked ? allVals(q) : [];
                if (keepEtc) a[q.id].push('etc');
                if (cb.checked) $('egMore').open = true;
                $('egMsg').textContent = '';
                refreshOpts(q);
                updateNext(q);
            });
            lab.appendChild(cb);
            lab.appendChild(document.createTextNode(' 전체 선택'));
            helpEl.appendChild(document.createTextNode(' '));
            helpEl.appendChild(lab);
        }
        $('egMsg').textContent = '';

        var opts = q.options.slice();
        if (q.id === 'q7' && !isPlan()) opts = opts.filter(function (o) { return !o.planOnly; });
        var more = [];
        if (q.id === 'q6') {
            var order = M.issueOrder[a.q1] || M.issueOrder.s0;
            var first = order.concat(['etc']).map(function (k) { return { v: k, label: M.issues[k] }; });
            more = opts.filter(function (o) { return order.indexOf(o.v) < 0 && o.v !== 'etc'; });
            opts = first;
        }
        var box = $('egOpts');
        box.textContent = '';
        if (q.extraOne) {
            box.removeAttribute('role');
            box.removeAttribute('aria-labelledby');
            box.classList.add('eg-opts-grouped');
            var h1 = el('p', 'eg-grp-h', q.subLabel || q.title);
            h1.id = 'egGrp1';
            box.appendChild(h1);
            var sub1 = el('div', 'eg-opts');
            sub1.setAttribute('role', 'radiogroup');
            sub1.setAttribute('aria-labelledby', 'egGrp1');
            opts.forEach(function (o) { sub1.appendChild(optBtn(q, o)); });
            box.appendChild(sub1);

            var h2 = el('p', 'eg-grp-h', q.extraOne.label);
            h2.id = 'egGrp2';
            box.appendChild(h2);
            var sub2 = el('div', 'eg-opts');
            sub2.setAttribute('role', 'radiogroup');
            sub2.setAttribute('aria-labelledby', 'egGrp2');
            var qSub = { id: q.extraOne.id, type: 'one', options: q.extraOne.options };
            q.extraOne.options.forEach(function (o) { sub2.appendChild(optBtn(qSub, o)); });
            box.appendChild(sub2);
        } else if (q.followOne) {
            // 꼬리 질문이 있는 질문(Q1 보조 '진행 거래'): 위 보기 + 아래 꼬리 질문(조건이 맞을 때만 보임)
            box.removeAttribute('role');
            box.removeAttribute('aria-labelledby');
            box.classList.add('eg-opts-grouped');
            var main = el('div', 'eg-opts');
            main.setAttribute('role', 'radiogroup');
            main.setAttribute('aria-labelledby', 'egTitle');
            opts.forEach(function (o) { main.appendChild(optBtn(q, o)); });
            box.appendChild(main);
            var fw = el('div', 'eg-follow');
            fw.id = 'egFollow';
            fw.hidden = !followOn(q);
            var fh = el('p', 'eg-grp-h', q.followOne.label);
            fh.id = 'egGrpF';
            fw.appendChild(fh);
            if (q.followOne.help) fw.appendChild(el('p', 'eg-follow-help', q.followOne.help));
            var fsub = el('div', 'eg-opts');
            fsub.setAttribute('role', 'radiogroup');
            fsub.setAttribute('aria-labelledby', 'egGrpF');
            var qF = { id: q.followOne.id, type: 'one', options: q.followOne.options };
            q.followOne.options.forEach(function (o) { fsub.appendChild(optBtn(qF, o)); });
            fw.appendChild(fsub);
            box.appendChild(fw);
        } else {
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
        refreshOpts(q);
        updateNext(q);
        title.focus({ preventScroll: true });
    }

    function isSel(q, v) {
        return q.type === 'one' ? a[q.id] === v : arr(a[q.id]).indexOf(v) >= 0;
    }
    function optBtn(q, o) {
        var b = el('button', 'eg-opt', o.label);
        b.type = 'button';
        b.dataset.qid = q.id;
        b.dataset.v = o.v;
        if (q.type === 'one') b.setAttribute('role', 'radio');
        b.setAttribute(q.type === 'one' ? 'aria-checked' : 'aria-pressed', isSel(q, o.v) ? 'true' : 'false');
        if (isSel(q, o.v)) b.classList.add('is-on');
        b.addEventListener('click', function () { pick(q, o.v); });
        return b;
    }
    function pick(q, v) {
        $('egMsg').textContent = '';
        var stepQ = visible()[step] || q;
        if (q.type === 'one') {
            var changed = a[q.id] !== v;
            a[q.id] = v;
            if (q.id === 'q1' && v !== 's0') { delete a.q1b; delete a.q1c; }
            // '아직 없음(준비 중)'으로 바꾸면 꼬리 질문(계약금액)에서 고른 값을 지운다
            if (q.followOne && !q.followOne.when(a)) delete a[q.followOne.id];
            if (q.id === 'q1' && changed) { delete a.q6; }
            if ((q.id === 'q1' || q.id === 'q1b') && changed && arr(a.q7).indexOf('unknown') >= 0 && !isPlan()) {
                a.q7 = arr(a.q7).filter(function (x) { return x !== 'unknown'; });
            }
            var fw = $('egFollow');
            var wasHidden = fw ? fw.hidden : true;
            refreshOpts(stepQ);
            updateNext(stepQ);
            // 꼬리 질문이 새로 나타나면 화면 안으로 살짝 내려 보여 준다(모바일에서 아래에 가려지지 않게)
            if (fw && wasHidden && !fw.hidden && fw.scrollIntoView) {
                fw.scrollIntoView({ block: 'nearest', behavior: (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth' });
            }
            // 2026-11-22 작가님: 하나만 고르는 질문도 자동으로 넘기지 않고 '다음'을 눌러 넘어간다(복수 질문과 같게)
            return;
        }
        var cur = arr(a[q.id]).slice();
        var i = cur.indexOf(v);
        if (i >= 0) {
            cur.splice(i, 1);
        } else {
            var ex = q.exclusive || [];
            (q.groups || []).forEach(function (g) {
                if (!g.multi && g.vs.indexOf(v) >= 0) cur = cur.filter(function (x) { return g.vs.indexOf(x) < 0; });
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
        refreshOpts(stepQ);
        updateNext(stepQ);
    }
    // 전체 선택이 고르는 값(Q6 '기타'는 직접 적는 칸이라 빼고)
    function allVals(q) { return q.options.map(function (o) { return o.v; }).filter(function (v) { return v !== 'etc'; }); }
    function refreshOpts(q) {
        var all = $('egAll');
        if (all && q.selectAll) all.checked = allVals(q).every(function (v) { return isSel(q, v); });
        // '기타' 입력칸(Q6)
        var fw = $('egFollow');
        if (fw) fw.hidden = !followOn(q);
        var eb = $('egEtcBox');
        if (eb) {
            var showEtc = q.id === 'q6' && isSel(q, 'etc');
            eb.hidden = !showEtc;
            var inp = $('egEtc');
            if (showEtc && inp.value !== (a.q6etc || '')) inp.value = a.q6etc || '';
        }
        Array.prototype.forEach.call(vQ.querySelectorAll('.eg-opt'), function (b) {
            var qid = b.dataset.qid || q.id;
            var on = (qid === q.id) ? isSel(q, b.dataset.v) : (a[qid] === b.dataset.v);
            var isRadio = b.getAttribute('role') === 'radio';
            b.classList.toggle('is-on', on);
            b.setAttribute(isRadio ? 'aria-checked' : 'aria-pressed', on ? 'true' : 'false');
        });
    }
    function answered(q) {
        if (q.extraOne) return !!a[q.id] && !!a[q.extraOne.id];
        if (followOn(q)) return !!a[q.id] && !!a[q.followOne.id];
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
        if (step >= visible().length) finish(); else { renderQ(); scrollToApp(true); }
    }
    $('egNext').addEventListener('click', next);
    $('egEtc').addEventListener('input', function () { a.q6etc = this.value.slice(0, 100); });
    $('egPrev').addEventListener('click', function () { if (step > 0) { step--; renderQ(); scrollToApp(true); } });
    $('egSkip').addEventListener('click', function () {
        var q = visible()[step];
        if (q) delete a[q.id];
        step++;
        if (step >= visible().length) finish(); else { renderQ(); scrollToApp(true); }
    });

    /* ---------- 추천 계산 ---------- */
    function tagWhy(hit) {
        var names = hit.slice(0, 2).map(function (t) {
            if (t.indexOf('need:') === 0) return "'" + label('q8', t.slice(5)) + "'";
            if (t.indexOf('form:') === 0) return "'" + label('q4', t.slice(5)) + "'";
            if (t.indexOf('pay:') === 0) return "'" + label('q7', t.slice(4)) + "'";
            return "'" + M.issues[t] + "'";
        });
        return names.join('·') + '를 골라서';
    }

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
                add('trade-claim', 6, w); add('ksure-plus', 3, w); add('kcab', 4, w); add('ksure-agri', hasItem('agri') ? 3 : 1, w);
                add('contract', 1, w); add('law-adr', 1, w); consultTop = true;
            },
            fx:      function (w) { add('fx', 3, w); add('qna-fx', 2, w); },
            fund:    function (w) {
                add('policy-fund', 3, w); add('guarantee', 2, w); add('semas-innov', 3, w);
                if (st >= 4) add('exim', 2, w);
                if (hasItem('agri')) add('at', 2, w);
            },
            cert:    function (w) { add('cert', 3, w); if (hasItem('cosmetic')) add('cosmetic', 2, w); },
            hs:      function (w) { add('trade-stats', 3, w); add('customs', 2, w); add('lawsearch', 2, w); },
            support: function (w) { add('voucher', 3, w); add('k-domestic', 2, w); if (has2('pre') || has2('startup') || has2('y7')) add('rnd', 2, w); },
            fraud:   function (w) { add('fraud', 3, w); add('export-docs', 2, w); },
            market:  function (w) { add('trade-stats', 3, w); add('k-market', 2, w); add('nationgrade', 2, w); }
        };
        issues.forEach(function (k) { if (I[k]) I[k]("'" + M.issues[k] + "'를 골라서"); });
        // '기타'에 적은 글: 사이트 서비스 낱말과 맞으면 그곳을 추천, 맞는 게 없으면 상담 상자를 위로
        var etcNoMatch = false;
        var etcText = issues.indexOf('etc') >= 0 ? etcValue() : '';
        if (etcText) {
            var low = etcText.toLowerCase(), hit = 0;
            (M.etcKeywords || []).forEach(function (g) {
                if (!g.k.some(function (w) { return low.indexOf(w) >= 0; })) return;
                g.ids.forEach(function (id, j) { if (M.links[id]) { add(id, j === 0 ? 5 : 3, "'기타'에 적어 주신 내용과 관련된 곳이라서"); hit++; } });
            });
            if (!hit) { etcNoMatch = true; consultTop = true; }
        } else if (issues.indexOf('etc') >= 0) consultTop = true;

        // 3) 수출 형태(Q4)
        forms.forEach(function (f) {
            var w = "거래 형태로 '" + label('q4', f) + "'를 골라서";
            if (f === 'local') { add('k-domestic', 2, w); add('qna-fx', 2, w); }
            if (f === 'b2c') add('b2c', 2, w);
            if (f === 'b2b') { add('buyer', 2, w); add('doc-builder', 1, w); }
            if (f === 'relay') { add('ksure-plus', 2, w); add('claim-exempt', 2, w); }
            if (f === 'import') { add('import-ins', 3, w); add('customs', 2, w); add('trade-stats', 1, w); add('lawsearch', 1, w); }
            if (f === 'other') consultTop = true;
        });

        // 4) 규모·우대 조건(Q2)·품목(Q3)
        if (has2('pre')) add('rnd', 3, '예비창업자(예비창업패키지 등)라서');
        if (has2('startup')) add('rnd', 2, '창업 3년 이내 기업이라서');
        if (has2('y7')) add('rnd', 1, '창업 7년 이내 기업이라서');
        if (has2('smallbiz')) { add('semas-innov', 3, '최근 1년 직·간접 수출실적 1천 달러 이상 소상공인이라서'); add('hope', 1, '소상공인이라서'); }
        var prefPicked = (M.prefVals || []).filter(has2);
        if (prefPicked.length) {
            var prefPts = (issues.indexOf('fund') >= 0 || issues.indexOf('support') >= 0 || needList(a).indexOf('fund') >= 0) ? 3 : 2;
            add('pref-cond', prefPts, "우대 조건('" + listLabels('q2', prefPicked) + "')을 골라서");
        }
        var w3 = "품목으로 '" + listLabels('q3', items()) + "'을 골라서";
        if (hasItem('agri')) { add('agri', 2, w3); add('ksure-agri', 2, w3); add('at', 2, w3); }
        if (hasItem('cosmetic')) { add('cosmetic', 2, w3); add('cert', 1, w3); }
        if (hasItem('service')) add('ksure-service', 2, w3);

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

        // 7-2) 최근 1년(또는 전년도) 매출실적 구간(2026-11-23 작가님)
        var rev = revIdx(a.q1r);
        var noRev = a.q1r === 'r0';
        if (rev === 1) {
            var wr1 = noRev ? '매출 없음 초기 기업이라서' : '매출 1억 원 미만 초기 기업이라서';
            add('rnd', 2, wr1); add('k-aitc', 2, wr1);
            if (st <= 3) add('k-domestic', 2, wr1);
        } else if (rev === 2) {
            var wr2 = '매출 1억~5억 원 미만 소상공인·소기업이라서';
            add('voucher', 2, wr2); add('policy-fund', 1, wr2);
        } else if (rev === 3) {
            var wr3 = '매출 5억~20억 원 미만 성장 초입 소기업이라서';
            add('buyer', 2, wr3); add('rnd', 1, wr3);
        } else if (rev === 4) {
            var wr4 = '매출 20억~100억 원 미만 본격 성장 중소기업이라서';
            add('ksure-plus', 2, wr4); add('guarantee', 2, wr4); add('k-branch', 2, wr4);
        } else if (rev === 5) {
            var wr5 = '매출 100억 원 이상 중기업·강소기업이라서';
            add('fx', 2, wr5); add('ksure-postship', 2, wr5); add('exim', 2, wr5);
        }

        // 8) 조건별 정책금융·지원사업 전체 평가(2026-11-23: 어느 한 조건이라도 해당하면 모두 매칭, pri=1은 최우선 추천)
        var tags = issues.slice();
        needs.forEach(function (n) { tags.push('need:' + n); });
        forms.forEach(function (f) { tags.push('form:' + f); });
        var ctx = {
            st: st, rev: rev, noRev: noRev, a: a, has2: has2, hasItem: hasItem,
            forms: forms, issues: issues, pays: pays, needs: needs, tags: tags,
            pref: prefPicked, prefLabels: prefPicked.length ? listLabels('q2', prefPicked) : '',
            smallbiz: has2('smallbiz'),
            sme: !has2('mid') && !has2('large'),
            smeOrMid: !has2('large'),
            pre: has2('pre'),
            under3: has2('pre') || has2('startup'),
            under7: has2('pre') || has2('startup') || has2('y7'),
            over7: has2('y7p'),
            youth: has2('youth'),
            women: has2('women'),
            disabled: has2('disabled'),
            social: has2('social'),
            venture: has2('venture'),
            innobiz: has2('innobiz'),
            mainbiz: has2('mainbiz'),
            lab: has2('lab'),
            restart: has2('restart'),
            esg: has2('esg_local'),
            agri: hasItem('agri'),
            service: hasItem('service'),
            industrial: hasItem('industrial'),
            b2c: forms.indexOf('b2c') >= 0,
            wantsFund: issues.indexOf('fund') >= 0 || issues.indexOf('factoring') >= 0 || needs.indexOf('fund') >= 0,
            hasAny: function (list) { return list.some(function (t) { return tags.indexOf(t) >= 0; }); },
            whyTags: function (list) { return tagWhy(list.filter(function (t) { return tags.indexOf(t) >= 0; })); }
        };
        var matchedProgs = [];
        var priMap = {};
        (M.programs || []).forEach(function (pg, idx) {
            if (!M.links[pg.id]) return;
            var w = '';
            if (typeof pg.match === 'function') {
                w = pg.match(ctx) || '';
            } else {
                if (pg.st && pg.st.indexOf(st) < 0) return;
                if (pg.size && !has2(pg.size)) return;
                if (pg.item && !hasItem(pg.item)) return;
                if (pg.age && !pg.age.some(has2)) return;
                var hit = (pg.on || []).filter(function (t) { return tags.indexOf(t) >= 0; });
                if (hit.length) w = tagWhy(hit);
            }
            if (!w) return;
            var pri = pg.pri || 2;
            priMap[pg.id] = pri;
            if (pri === 1) add(pg.id, 7, w);
            matchedProgs.push({ id: pg.id, why: w, pri: pri, ord: idx });
        });
        matchedProgs.sort(function (x, y) { return (x.pri - y.pri) || (x.ord - y.ord); });

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
        var topIds = list.slice(0, 3);
        var progs = matchedProgs.filter(function (r) { return topIds.indexOf(r.id) < 0; });
        var progIds = progs.map(function (r) { return r.id; });
        var rest = list.slice(3).filter(function (id) {
            if (progIds.indexOf(id) >= 0) return false;
            if (id === 'at' && (progIds.indexOf('at-ops') >= 0 || progIds.indexOf('at-facility') >= 0)) return false;
            if (id === 'exim' && (progIds.indexOf('exim-growth') >= 0 || progIds.indexOf('exim-perform') >= 0 || progIds.indexOf('exim-promo') >= 0)) return false;
            return true;
        });
        var moreIds = rest.slice(0, 4);
        // 후순위 '더 찾아볼 곳': 고른 항목과 겹치는 묶음의 기관을 모두(위에서 나온 곳은 빼고)
        pays.forEach(function (p) { tags.push('pay:' + p); });
        var shown = topIds.concat(progIds, moreIds);
        var extra = [];
        (M.extra || []).forEach(function (g) {
            if (!g.on.some(function (t) { return tags.indexOf(t) >= 0; })) return;
            var ids = [];
            g.items.forEach(function (it) {
                if (!M.links[it.id] || shown.indexOf(it.id) >= 0) return;
                if (it.skipIf && it.skipIf.some(function (sid) { return shown.indexOf(sid) >= 0; })) return;
                if (it.st && it.st.indexOf(st) < 0) return;
                if (it.on && !it.on.some(function (t) { return tags.indexOf(t) >= 0; })) return;
                var sm = M.stageMap[it.id];
                if (sm && sm.hard && sm.s[st] === 0) return;
                ids.push(it.id); shown.push(it.id);
            });
            if (ids.length) extra.push({ t: g.t, ids: ids });
        });
        return {
            extra: extra,
            top: topIds.map(function (id) { return { id: id, why: why(id), pri: priMap[id] || 0 }; }),
            progs: progs,
            more: moreIds.map(function (id) { return { id: id, why: why(id) }; }),
            consultTop: consultTop,
            etcNoMatch: etcNoMatch
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
        var q2v = Array.isArray(a.q2) ? a.q2 : (a.q2 ? [a.q2] : []);
        var p = q2v.map(function (v) { return M.short.q2[v]; }).filter(Boolean);
        var hasSize = ['smallbiz', 'small', 'medium', 'mid', 'large'].some(function (v) { return q2v.indexOf(v) >= 0; });
        if (p.length && !hasSize) p.push('기업');
        return p.join(' ');
    }
    function oneLine() {
        var st = M.stages[stageIdx(a.q1)];
        var rv = revObj(a.q1r);
        var who = q2Short() || '기업';
        var bits = [listLabels('q3', items()), listLabels('q4', a.q4), listLabels('q5', a.q5)].filter(Boolean).join(' · ');
        var rvTxt = rv ? (rv.v === 'r0' ? '매출 없음' : '매출 ' + rv.short) : '';
        var s = '최근 1년(또는 전년도) 수출실적 ' + st.short + (rvTxt ? ' · ' + rvTxt : '') + ' 단계';
        var dl = dealObj();
        var paren = [dl ? '이번 건 계약금액 ' + dl.short : '', rvTxt].filter(Boolean).join(', ');
        if (a.q1 === 's0' && a.q1b) s = '수출실적이 아직 없고 ' + M.short.q1b[a.q1b] + (paren ? '(' + paren + ')' : '') + '인 단계';
        s += '의 ' + who + (bits ? '(' + bits + ')' : '') + '이고, ';
        var iss = arr(a.q6).map(function (k) { return k === 'etc' ? '기타' : M.issues[k]; });
        s += iss.length ? '가장 큰 어려움은 ' + iss.join(' / ') + '입니다.' : '어려운 점은 고르지 않았습니다.';
        return s;
    }
    function summaryText(withId) {
        var st = M.stages[stageIdx(a.q1)];
        var L = [];
        L.push('[수출 가이드 결과]' + (withId && saved && saved.id ? ' 접수번호 ' + saved.id : ''));
        var s1 = '수출실적(최근 1년 또는 전년도): ' + st.label;
        if (a.q1 === 's0' && a.q1b) s1 += ' / 진행 거래: ' + M.short.q1b[a.q1b];
        if (dealObj()) s1 += ' / 이번 건 계약금액: ' + dealObj().label;
        L.push(s1);
        if (a.q1r) L.push('매출실적(최근 1년 또는 전년도): ' + label('q1r', a.q1r));
        L.push('거래 형태(희망 포함): ' + (listLabels('q4', a.q4) || '-'));
        L.push('창업 연차·우대 조건·규모: ' + (listLabels('q2', Array.isArray(a.q2) ? a.q2 : (a.q2 ? [a.q2] : [])) || '-') + ' / 품목: ' + (listLabels('q3', items()) || '-') + ' / 시장: ' + (listLabels('q5', a.q5) || '-'));
        L.push('어려운 점: ' + (arr(a.q6).filter(function (k) { return k !== 'etc'; }).map(function (k) { return M.issues[k]; }).concat(arr(a.q6).indexOf('etc') >= 0 ? ['기타'] : []).join(', ') || '-'));
        if (arr(a.q6).indexOf('etc') >= 0 && etcValue()) L.push('기타(찾는 서비스): ' + etcValue());
        L.push('결제 방식: ' + (listLabels('q7', a.q7) || '-') + ' / 필요: ' + (needList(a).map(function (c) { return label('q8', c); }).filter(Boolean).join(', ') || '-'));
        return L.join('\n');
    }

    /* ---------- 수출 5단계 로드맵 한 줄 ---------- */
    function renderRoadmap() {
        var box = $('egRoadmap'), R = M.roadmap;
        if (!box || !R) return;
        box.textContent = '';
        var main = R.stage[a.q1] || 1;
        if (a.q1 === 's0' && R.s0Deal[a.q1b]) main = R.s0Deal[a.q1b];
        function stepLink(n, cls, text) {
            var x = el('a', cls, text);
            x.href = R.url + '#step' + n;
            x.dataset.egLink = 'roadmap-step' + n;
            return x;
        }
        var ic = el('i', 'fa-solid fa-route');
        ic.setAttribute('aria-hidden', 'true');
        box.appendChild(ic);
        box.appendChild(document.createTextNode(' '));
        var top = el('a', 'eg-more-link', '수출 5단계 로드맵');
        top.href = R.url;
        top.dataset.egLink = 'roadmap-top';
        box.appendChild(top);
        box.appendChild(document.createTextNode('에서는 '));
        box.appendChild(stepLink(main, 'eg-roadmap-main', main + '단계 ' + R.names[main] + '부터 보세요'));
        var rel = [];
        arr(a.q6).forEach(function (k) {
            var n = R.issue[k];
            if (n && n !== main && rel.indexOf(n) < 0) rel.push(n);
        });
        rel.sort();
        if (rel.length) {
            box.appendChild(el('span', 'eg-roadmap-rel', ' · 고른 어려움과 관련된 단계: '));
            rel.forEach(function (n, i) {
                if (i) box.appendChild(document.createTextNode(', '));
                box.appendChild(stepLink(n, 'eg-more-link', n + '단계 ' + R.names[n]));
            });
        }
    }

    /* ---------- 먼저 찾아볼 정보 사이트(KOTRA AI·KATI·화장품, 2026-11-24) ---------- */
    function renderAiPicks() {
        var box = $('egAiBox'), ul = $('egAiList');
        if (!box || !ul) return;
        ul.textContent = '';
        var c = { st: stageIdx(a.q1), consult: needList(a).indexOf('consult') >= 0, item: hasItem };
        var n = 0;
        (M.aiPicks || []).forEach(function (p) {
            if (!M.links[p.id] || !p.when(c)) return;
            var li = el('li');
            var x = linkEl(p.id, 'eg-ai-link');
            var ic = el('i', 'fa-solid fa-arrow-up-right-from-square pf-ext');
            ic.setAttribute('aria-hidden', 'true');
            x.appendChild(document.createTextNode(' '));
            x.appendChild(ic);
            li.appendChild(x);
            li.appendChild(el('span', 'eg-ai-why', ' — ' + p.why(c)));
            li.appendChild(el('span', 'eg-prog-d', M.links[p.id].d));
            ul.appendChild(li);
            n++;
        });
        box.hidden = !n;
    }

    /* ---------- 결과 화면 ---------- */
    function finish() {
        var rec = renderResult(false);
        ga('guide_complete', {
            stage: a.q1, revenue: a.q1r || '', deal: dealObj() ? a.q1c : '', size: arr(a.q2).join(','), item: items().join(','),
            forms: arr(a.q4).join(','), issues: arr(a.q6).join(','), pays: arr(a.q7).join(','), need: needList(a).join(',')
        });
        maybeSave(rec);
    }

    function renderResult(fromHistory, restoring) {
        show(vRes);
        nowSet({ a: a, saved: saved, fromHistory: !!fromHistory });
        var rec = recommend();
        $('egSummary').textContent = oneLine();

        renderRoadmap();

        renderAiPicks();

        var top = $('egTop');
        top.textContent = '';
        rec.top.forEach(function (r, i) {
            var L = M.links[r.id];
            var card = el('article', 'eg-card');
            card.appendChild(el('span', 'eg-card-n', String(i + 1)));
            var body = el('div', 'eg-card-body');
            var h = el('h4', 'eg-card-t');
            if (r.pri === 1) h.appendChild(el('span', 'eg-pri-badge', '최우선 추천'));
            h.appendChild(document.createTextNode(L.t));
            body.appendChild(h);
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

        var pl = $('egProgList');
        pl.textContent = '';
        $('egProgBox').hidden = !rec.progs.length;
        var cnt = $('egProgCnt');
        if (cnt) cnt.textContent = rec.progs.length ? '(' + rec.progs.length + '건)' : '';
        rec.progs.forEach(function (r) {
            var li = el('li');
            if (r.pri === 1) li.appendChild(el('span', 'eg-pri-badge', '최우선 추천'));
            li.appendChild(linkEl(r.id, 'eg-more-link'));
            li.appendChild(el('span', 'eg-more-why', ' — ' + r.why));
            li.appendChild(el('span', 'eg-prog-d', M.links[r.id].d));
            pl.appendChild(li);
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

        // 후순위 '더 찾아볼 곳'
        var xl = $('egExtraList');
        xl.textContent = '';
        $('egExtraBox').hidden = !rec.extra.length;
        rec.extra.forEach(function (g) {
            var li = el('li', 'eg-extra-g');
            li.appendChild(el('strong', 'eg-extra-t', g.t));
            var ul = el('ul', 'eg-more-list');
            g.ids.forEach(function (id) {
                var x = el('li');
                x.appendChild(linkEl(id, 'eg-more-link'));
                if (M.links[id].d) x.appendChild(el('span', 'eg-prog-d', M.links[id].d));
                ul.appendChild(x);
            });
            li.appendChild(ul);
            xl.appendChild(li);
        });

        // 맨 아래 고정 줄(최신 공고·사례)
        var fl = $('egFootLinks');
        fl.textContent = '';
        (M.footLinks || []).forEach(function (id, i) {
            if (!M.links[id]) return;
            if (i) fl.appendChild(document.createTextNode(' · '));
            fl.appendChild(linkEl(id, 'eg-more-link'));
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
        $('egEtcNoMatch').hidden = !rec.etcNoMatch;
        var consult = $('egConsult');
        var anchor = rec.consultTop ? $('egTopWrap') : $('egFormsAnchor');
        anchor.parentNode.insertBefore(consult, rec.consultTop ? anchor : anchor.nextSibling);

        $('egSaveMsg').textContent = '';
        if (fromHistory && saved && saved.id) {
            $('egSaveMsg').textContent = '이 기기에 저장해 둔 결과입니다(접수번호 ' + saved.id + ').';
        }
        lastSummary = summaryText(true);
        if (restoring) return rec;
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
        body.set('q1', a.q1 || ''); body.set('q1b', a.q1b || ''); body.set('q1r', a.q1r || '');
        body.set('q1c', dealObj() ? a.q1c : '');   // 진행 거래 계약금액(2026-11-24, 시트 18열 R)
        body.set('q2', arr(a.q2).join(',')); body.set('q3', items().join(','));
        body.set('q4', arr(a.q4).join(',')); body.set('q5', arr(a.q5).join(','));
        body.set('q6', arr(a.q6).join(','));
        if (arr(a.q6).indexOf('etc') >= 0) body.set('q6etc', etcValue());   // '기타'에 적은 글(100자, 2026-11-22 작가님: 시트에 저장)
        body.set('q7', arr(a.q7).join(','));
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
        pingContact('form');
        ga('guide_to_contact', { method: 'form' });
    });
    // 결과 화면이 떠 있으면 이 페이지의 모든 '상담 신청'(결과 상자 단추·상단 메뉴·하단 상담 안내) 링크가
    // 결과 요약을 상담 신청서로 넘긴다. 예전에는 결과 상자 단추만 넘겨서, 하단 '상담 신청'으로 가면 칸이 비었다(2026-11-24).
    document.addEventListener('click', function (e) {
        var link = e.target.closest && e.target.closest('a[href$="index.html#contact"]');
        if (!link || vRes.hidden || !lastSummary) return;
        try { sessionStorage.setItem(HAND_KEY, lastSummary); } catch (err) {}
        if (link.id !== 'egToForm') ga('guide_to_contact', { method: 'form', link_area: link.closest('nav') ? 'menu' : 'page_cta' });
    }, true);
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
        a = {}; step = 0; saved = null; nowClear();
        renderStart();
        scrollToApp();
    });
    root.addEventListener('click', function (e) {
        var x = e.target.closest && e.target.closest('[data-eg-link]');
        if (x) ga('guide_link_click', { target: x.dataset.egLink });
    });
    $('egToKakao').href = KAKAO;

    /* ---------- 뒤로가기로 돌아왔을 때 결과 화면 되살리기 ----------
       결과의 '바로 가기'로 다른 페이지에 갔다가 뒤로가기로 돌아오면, 브라우저가 페이지를 새로 읽는 경우
       (설치한 앱·메모리 부족 등) 시작 화면이 나와 결과가 사라진다. 그래서 결과를 그 탭의 sessionStorage에만
       잠시 담아 두고, '뒤로/앞으로' 이동으로 열렸을 때만 결과와 스크롤 위치를 되살린다(새로 열면 시작 화면). */
    function nowSet(v) { try { sessionStorage.setItem(NOW_KEY, JSON.stringify(v)); } catch (e) {} }
    function nowClear() { try { sessionStorage.removeItem(NOW_KEY); } catch (e) {} }
    function navType() {
        try {
            var n = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
            if (n && n.type) return n.type;
            if (performance.navigation) return performance.navigation.type === 2 ? 'back_forward' : 'other';
        } catch (e) {}
        return 'other';
    }
    window.addEventListener('pagehide', function () {
        if (vRes.hidden) { nowClear(); return; }
        var v = null;
        try { v = JSON.parse(sessionStorage.getItem(NOW_KEY) || 'null'); } catch (e) {}
        if (v) { v.y = window.pageYOffset; nowSet(v); }
    });
    (function boot() {
        var v = null;
        if (navType() === 'back_forward') {
            try { v = JSON.parse(sessionStorage.getItem(NOW_KEY) || 'null'); } catch (e) {}
        }
        if (!v || !v.a || !v.a.q1) { nowClear(); renderStart(); return; }
        a = v.a; a.q3 = items(a); saved = v.saved || null; step = 0;
        renderResult(v.fromHistory, true);
        var y = v.y || 0;
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        var go = function () { window.scrollTo(0, y); };
        go();
        window.addEventListener('load', go);
        setTimeout(go, 300);
    })();
})();
