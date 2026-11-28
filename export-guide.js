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
    // '기타'에 적은 글(Q6·Q2). 화면에는 textContent·value 로만 넣는다(HTML로 넣지 않음)
    function etcValue() { return String(a.q6etc || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 100); }
    function q2EtcValue() { return String(a.q2etc || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 100); }
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
        if (!(a.q1b === 'nego' || a.q1b === 'order')) return null;
        var list = M.deals || [];
        for (var i = 0; i < list.length; i++) if (list[i].v === a.q1c) return list[i];
        return null;
    }
    function followOn(q) { return !!(q.followOne && q.followOne.when(a)); }
    // 진행 거래(q1b) 짧은 이름: 실적 있음이면 '첫 주문' 대신 '새 주문'
    function q1bShort() {
        if (!a.q1b) return '';
        if (a.q1 !== 's0') return ({ prep: '진행 중 새 거래 없음', nego: '협상·샘플 진행 중', order: '새 주문 받음' })[a.q1b] || '';
        return M.short.q1b[a.q1b] || '';
    }
    function dealFundOn() { return !!(M.dealFund && M.dealFund.when(a)); }
    function isPlan() { return a.q1 === 's0' && a.q1b === 'prep'; }
    function mainCount() { return M.questions.filter(function (q) { return !q.sub && !q.retired; }).length; }
    function visible() {
        return M.questions.filter(function (q) { return !q.retired && (!q.when || q.when(a)); });
    }
    // 시작 화면·제목의 '현황 N가지'를 실제 질문 수로 맞춘다(HTML 숫자는 JS가 꺼졌을 때·검색 설명용)
    [].forEach.call(document.querySelectorAll('[data-eg-count]'), function (n) { n.textContent = mainCount(); });
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
        // 진행 표시는 본 질문(보충 질문 sub 제외)만 센다: 시작 화면의 '현황 N가지'와 같은 숫자
        var total = mainCount();
        var num = qs.slice(0, step + 1).filter(function (x) { return !x.sub; }).length;
        $('egStep').textContent = num + ' / ' + total + (q.sub ? ' · 보충 질문' : '');
        $('egBar').value = num;
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
        if (q.id === 'q1b' && a.q1 !== 's0') opts = opts.map(function (o) { return o.labelExp ? { v: o.v, label: o.labelExp } : o; });
        if (q.id === 'q7' && !isPlan()) opts = opts.filter(function (o) { return !o.planOnly; });
        var more = [];
        if (q.id === 'q6') {
            var order = M.issueOrder[a.q1] || M.issueOrder.s0;
            var first = order.map(function (k) { return { v: k, label: M.issues[k] }; });
            more = opts.filter(function (o) { return order.indexOf(o.v) < 0 && o.v !== 'etc'; });
            // 2026-11-24 작가님: '기타'가 첫 목록 끝에 있으면 거기서 끝나는 줄 알게 된다 →
            // 첫 목록이 8개가 되도록 '더 보기'에서 앞의 것을 올리고, '기타'는 '더 보기' 맨 끝으로
            while (first.length < 8 && more.length) first.push(more.shift());
            more.push({ v: 'etc', label: M.issues.etc });
            opts = first;
        }
        var box = $('egOpts');
        box.textContent = '';
        box.classList.toggle('eg-opts-grid2', !!q.grid2);
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
                    // Q2 우대 조건: '혁신·녹색·우수조달제품' 세부 선택 + '기타' 직접 입력칸 (2026-11-26)
                    if (q.id === 'q2' && g.multi) {
                        var procBox = el('div', 'eg-subbox');
                        procBox.id = 'egProcSub';
                        procBox.hidden = !has2('proc_cert');
                        procBox.appendChild(el('p', 'eg-subbox-l', '해당 항목을 고르시면 맞춤 추천합니다 (미선택 시 3종 모두 추천)'));
                        var procOpts = el('div', 'eg-sub-opts');
                        procOpts.setAttribute('role', 'group');
                        procOpts.setAttribute('aria-label', '혁신·녹색·우수조달제품 세부 선택');
                        (M.q2ProcOpts || []).forEach(function (po) {
                            var pb = el('button', 'eg-sub-opt', po.label);
                            pb.type = 'button';
                            pb.dataset.proc = po.v;
                            var on = arr(a.q2proc).indexOf(po.v) >= 0;
                            pb.classList.toggle('is-on', on);
                            pb.setAttribute('aria-pressed', on ? 'true' : 'false');
                            pb.addEventListener('click', function () {
                                var cur = arr(a.q2proc).slice();
                                var idx = cur.indexOf(po.v);
                                if (idx >= 0) cur.splice(idx, 1); else cur.push(po.v);
                                a.q2proc = cur;
                                refreshOpts(q);
                            });
                            procOpts.appendChild(pb);
                        });
                        procBox.appendChild(procOpts);
                        box.appendChild(procBox);

                        var q2eb = el('div', 'eg-etc eg-q2-etc');
                        q2eb.id = 'egQ2EtcBox';
                        q2eb.hidden = !has2('pref_etc');
                        var q2lab = el('label', 'eg-etc-l', '기타 우대 조건');
                        q2lab.setAttribute('for', 'egQ2Etc');
                        var q2inp = el('input');
                        q2inp.type = 'text';
                        q2inp.id = 'egQ2Etc';
                        q2inp.maxLength = 100;
                        q2inp.placeholder = '지방소재 등 우대지원 가능한 항목을 적어주세요.';
                        q2inp.autocomplete = 'off';
                        q2inp.value = a.q2etc || '';
                        q2inp.addEventListener('input', function () { a.q2etc = this.value.slice(0, 100); });
                        q2eb.appendChild(q2lab);
                        q2eb.appendChild(q2inp);
                        q2eb.appendChild(el('p', 'eg-note', '예: 지방소재, 비수도권, ESG, 소부장, ISO, 뿌리기업, 가족친화 등 (개인정보 입력 금지, 100자 이내)'));
                        box.appendChild(q2eb);
                    }
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
        refreshOpts(q);
        updateNext(q);
        title.focus({ preventScroll: true });
    }

    function isSel(q, v) {
        return q.type === 'one' ? a[q.id] === v : arr(a[q.id]).indexOf(v) >= 0;
    }
    function optBtn(q, o) {
        var b = el('button', 'eg-opt');
        if (o.sub) {
            b.classList.add('eg-opt-has-sub');
            b.appendChild(el('span', 'eg-opt-main', o.label));
            b.appendChild(el('small', 'eg-opt-sub', o.sub));
        } else {
            b.textContent = o.label;
        }
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
        var addedPrefEtc = false;
        if (i >= 0) {
            cur.splice(i, 1);
            if (q.id === 'q2' && v === 'proc_cert') delete a.q2proc;
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
            if (q.id === 'q2' && v === 'pref_etc') addedPrefEtc = true;
        }
        a[q.id] = cur;
        refreshOpts(stepQ);
        updateNext(stepQ);
        if (addedPrefEtc) {
            var q2inp = $('egQ2Etc');
            if (q2inp) q2inp.focus();
        }
    }
    // 전체 선택이 고르는 값(Q6 '기타'는 직접 적는 칸이라 빼고)
    function allVals(q) { return q.options.map(function (o) { return o.v; }).filter(function (v) { return v !== 'etc'; }); }
    function refreshOpts(q) {
        var all = $('egAll');
        if (all && q.selectAll) all.checked = allVals(q).every(function (v) { return isSel(q, v); });
        // '기타' 입력칸(Q6) · Q2 우대 조건 세부/기타 입력칸
        var fw = $('egFollow');
        if (fw) fw.hidden = !followOn(q);
        var eb = $('egEtcBox');
        if (eb) {
            var showEtc = q.id === 'q6' && isSel(q, 'etc');
            eb.hidden = !showEtc;
            var inp = $('egEtc');
            if (showEtc && inp.value !== (a.q6etc || '')) inp.value = a.q6etc || '';
        }
        var ps = $('egProcSub');
        if (ps) {
            var showProc = q.id === 'q2' && isSel(q, 'proc_cert');
            ps.hidden = !showProc;
            Array.prototype.forEach.call(ps.querySelectorAll('.eg-sub-opt'), function (pb) {
                var on = arr(a.q2proc).indexOf(pb.dataset.proc) >= 0;
                pb.classList.toggle('is-on', on);
                pb.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
        }
        var q2eb = $('egQ2EtcBox');
        if (q2eb) {
            var showQ2Etc = q.id === 'q2' && isSel(q, 'pref_etc');
            q2eb.hidden = !showQ2Etc;
            var q2i = $('egQ2Etc');
            if (showQ2Etc && q2i && q2i.value !== (a.q2etc || '')) q2i.value = a.q2etc || '';
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
        btn.disabled = !answered(q);
    }
    function next() {
        var qs = visible();
        var q = qs[step];
        if (!q) return;
        if (!answered(q)) {
            $('egMsg').textContent = '하나 이상 골라 주세요.';
            return;
        }
        step++;
        if (step >= visible().length) finish(); else { renderQ(); scrollToApp(true); }
    }
    $('egNext').addEventListener('click', next);
    $('egEtc').addEventListener('input', function () { a.q6etc = this.value.slice(0, 100); });
    $('egPrev').addEventListener('click', function () { if (step > 0) { step--; renderQ(); scrollToApp(true); } });

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
        var urgentConsult = false;
        function add(id, pts, why) {
            if (!M.links[id]) return;
            if (!(id in S)) { S[id] = 0; R[id] = []; order.push(id); }
            S[id] += pts;
            R[id].push([pts, why]);
        }
        var ins = st <= 2 ? 'ksure-dplus' : 'ksure-plus';
        var issues = arr(a.q6), forms = arr(a.q4), pays = arr(a.q7), mk = arr(a.q5);
        var pureB2b = forms.indexOf('b2b') >= 0 && forms.indexOf('b2c') < 0;

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
            collect: function (w) { add(ins, 3, w); if (hasItem('service')) add('ksure-service', 4, w); add('credit', 2, w); add('claim', 2, w); },
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
                if (hasItem('agri')) add('at', 2, w);
            },
            // '해외인증·규제를 모른다'(2026-11-24): 고르면 해외인증 조회 가이드가 '먼저 볼 곳'에 오도록 6점(전엔 3점이라 상위 3곳에 못 들었다)
            cert:    function (w) {
                add('cert', 6, w);
                if (hasItem('cosmetic')) add('cosmetic', 2, w);
                if (hasItem('agri')) add('agri', 2, w);
                if (hasItem('medical')) add('cert-medical', 3, w);
                if (hasItem('electronics') || hasItem('industrial')) add('cert-elec', 2, w);
            },
            hs:      function (w) { add('customs', 8, w); add('trade-stats', 8, w); add('fta-portal', 6, w); add('trade-navi', 4, w); add('lawsearch', 2, w); },
            support: function (w) { add('voucher', 3, w); add('k-domestic', 2, w); if (has2('pre') || has2('startup') || has2('y7')) add('rnd', 2, w); },
            fraud:   function (w) { add('fraud', 3, w); add('export-docs', 2, w); },
            market:  function (w) { add('trade-stats', 3, w); add('k-market', 2, w); add('nationgrade', 2, w); },
            logistics: function (w) {
                add('logi-support', 5, w); add('c-logi', 3, w); add('voucher', 2, w);
                if (forms.indexOf('b2c') >= 0) add('c-more', 2, w);
                if (has2('smallbiz')) add('op-semas-logi', 4, w);
                if (hasItem('agri')) add('agri', 2, w);
            },
            overdue: function (w) {
                add('debt-collect', 10, w); add('claim', 8, w); add('debt-writeoff', 7, w); add('trade-claim', 4, w);
                consultTop = true; urgentConsult = true;
            },
            mall: function (w) {
                if (pureB2b) {
                    add('b-b2b', 5, w); add('gobizkorea', 4, w); add('buykorea', 3, w);
                    return;
                }
                add('gm-kosmes', 8, w); add('c-more', 8, w);
                add('op-semas', has2('smallbiz') ? 8 : 5, w);
                add('c-amazon', 7, w); add('b2c', 4, w);
            },
            ip: function (w) {
                add('ip-help', 8, w); add('ip-desk', 7, w);
                add('voucher', 6, "'" + M.issues.ip + "'를 골라서(수출바우처 '특허/지재권/시험' 메뉴 활용 추천)");
                if (has2('venture') || has2('innobiz') || has2('lab')) add('kibo-rnd', 2, w);
            },
            promo: function (w) {
                add('voucher', 8, "'" + M.issues.promo + "'를 골라서(수출바우처 홍보·디자인·동영상 제작 활용 추천)");
                add('k-aitc', 8, w); add('gobizkorea', 7, w);
                if (has2('mfg') && !has2('mid') && !has2('large')) add('innovation-voucher', 2, w);
            },
            indirect: function (w) {
                add('utradehub', 8, w); add('bok-local', 8, w); add('kita-perf', 7, w);
                add('customs', 3, w);
                if (hasItem('service')) add('trade-sure', 2, w);
            }
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
        var prefPicked = (M.prefVals || []).filter(function (v) { return v !== 'mfg' && v !== 'lab' && v !== 'pref_etc' && has2(v); }); // 연구소·제조업은 아래 전용 카드(#pref-lab·#pref-mfg)로
        if (has2('lab')) add('pref-lab', (issues.indexOf('fund') >= 0 || issues.indexOf('support') >= 0) ? 3 : 2, "우대 조건('기업부설연구소·전담부서')을 골라서");
        if (has2('mfg')) add('pref-mfg', (issues.indexOf('fund') >= 0 || issues.indexOf('support') >= 0) ? 3 : 2, "우대 조건('제조업')을 골라서");
        if (prefPicked.length) {
            var prefPts = (issues.indexOf('fund') >= 0 || issues.indexOf('support') >= 0 || needList(a).indexOf('fund') >= 0) ? 3 : 2;
            add('pref-cond', prefPts, "우대 조건('" + listLabels('q2', prefPicked) + "')을 골라서");
        }
        // Q2 우대 조건 '기타' 입력 키워드 매칭 (지방소재·비수도권·ESG·소부장·ISO 등, 2026-11-26)
        var q2EtcText = has2('pref_etc') ? q2EtcValue() : '';
        var q2Flags = {};
        var q2EtcProgs = [];
        if (q2EtcText) {
            var q2Low = q2EtcText.toLowerCase(), q2Hit = 0;
            (M.q2EtcKeywords || []).forEach(function (g) {
                if (!g.k.some(function (w) { return q2Low.indexOf(w) >= 0; })) return;
                (g.flags || []).forEach(function (fl) { q2Flags[fl] = true; });
                var q2Why = "우대 조건 기타('" + q2EtcText + "')에 해당해서(" + (g.why || '관련 우대 지원 추천') + ')';
                (g.ids || []).forEach(function (id, j) {
                    if (!M.links[id]) return;
                    add(id, j === 0 ? 5 : 3, q2Why);
                    q2EtcProgs.push({ id: id, why: q2Why, pri: 2 });
                    q2Hit++;
                });
            });
            if (!q2Hit) {
                add('pref-cond', 3, "우대 조건 기타('" + q2EtcText + "')에 맞춰 우대조건 매칭 안내");
                q2EtcProgs.push({ id: 'pref-cond', why: "우대 조건 기타('" + q2EtcText + "') 관련 우대조건 확인 추천", pri: 2 });
                consultTop = true;
            }
        } else if (has2('pref_etc')) {
            add('pref-cond', 2, "우대 조건('기타')을 골라서");
            consultTop = true;
        }
        var procSel = has2('proc_cert') ? arr(a.q2proc) : [];
        var procInnov = (has2('proc_cert') && (!procSel.length || procSel.indexOf('innov') >= 0)) || !!q2Flags.procInnov;
        var procGreen = (has2('proc_cert') && (!procSel.length || procSel.indexOf('green') >= 0)) || !!q2Flags.procGreen;
        var procExcl  = (has2('proc_cert') && (!procSel.length || procSel.indexOf('excellent') >= 0)) || !!q2Flags.procExcl;
        var procCert  = procInnov || procGreen || procExcl;
        var pickedItems = items();
        var w3 = "품목으로 '" + listLabels('q3', pickedItems) + "'을 골라서";
        if (hasItem('cosmetic')) { add('cosmetic', 2, w3); add('cert', 1, w3); }
        if (hasItem('agri')) { add('agri', 2, w3); add('ksure-agri', 2, w3); add('at', 2, w3); }
        if (hasItem('consumer')) { if (forms.indexOf('b2c') >= 0) add('b2c', 2, w3); add('ip-help', 2, w3); }
        if (hasItem('medical')) { add('cert-medical', 3, w3); add('cert', 2, w3); consultTop = true; }
        if (hasItem('electronics')) { add('cert-elec', 2, w3); add('customs', 2, w3); }
        if (hasItem('industrial')) { add('buyer', 1, w3); add('customs', 1, w3); add('guarantee', 1, w3); }
        if (hasItem('service')) add('ksure-service', 3, w3);
        if (hasItem('etc')) consultTop = true;

        // 5) 시장(Q5)
        if (mk.indexOf('undecided') >= 0) { add('trade-stats', 1, '목표 시장이 아직 미정이라서'); add('k-market', 1, '목표 시장이 아직 미정이라서'); }

        // 6) 결제 방식(Q7)
        pays.forEach(function (p) {
            var w = "결제 방식으로 '" + label('q7', p) + "'를 골라서";
            if (p === 'prepay') { add('fraud', 1, w); add('doc-builder', 1, w); }
            if (p === 'lc') { add('export-docs', 1, w); add('doc-builder', 1, w); }
            if (p === 'collection' || p === 'deferred') { add(ins, 2, w); if (hasItem('service')) add('ksure-service', 2, w); add('credit', 2, w); add('claim', 2, w); }
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
            add('fx', 2, wr5); add('ksure-postship', 2, wr5);
        }

        // 8) 조건별 정책금융·지원사업 전체 평가(2026-11-23: 어느 한 조건이라도 해당하면 모두 매칭, pri=1은 최우선 추천)
        var tags = issues.slice();
        needs.forEach(function (n) { tags.push('need:' + n); });
        forms.forEach(function (f) { tags.push('form:' + f); });
        var ctx = {
            st: st, rev: rev, noRev: noRev, dealFund: dealFundOn(), a: a, has2: has2, hasItem: hasItem,
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
            mfg: has2('mfg'),
            restart: has2('restart'),
            esg: has2('esg_local') || procGreen || !!q2Flags.esg,
            localBiz: !!q2Flags.localBiz,
            procCert: procCert,
            procInnov: procInnov,
            procGreen: procGreen,
            procExcl: procExcl,
            agri: hasItem('agri'),
            service: hasItem('service'),
            industrial: hasItem('industrial'),
            electronics: hasItem('electronics'),
            medical: hasItem('medical'),
            b2b: forms.indexOf('b2b') >= 0,
            b2c: forms.indexOf('b2c') >= 0,
            pureB2b: pureB2b,
            // 2026-11-26 작가님: 거래 형태가 로컬 수출(·수입)뿐이거나 결제가 선수금·신용장뿐인 경우 외에는
            // 대금 미회수 위험을 담보하는 무보 보험(중소중견Plus+ 등)을 추천한다. 값은 이유 문구용 결제 방식 이름
            unpaidRisk: (forms.some(function (f) { return f !== 'local' && f !== 'import'; })
                ? pays.filter(function (p) { return p !== 'prepay' && p !== 'lc'; }).map(function (p) { return "'" + label('q7', p) + "'"; }).join('·')
                : ''),
            wantsFund: issues.indexOf('fund') >= 0 || issues.indexOf('factoring') >= 0 || needs.indexOf('fund') >= 0,
            hasAny: function (list) { return list.some(function (t) { return tags.indexOf(t) >= 0; }); },
            whyTags: function (list) { return tagWhy(list.filter(function (t) { return tags.indexOf(t) >= 0; })); }
        };
        var matchedProgs = [];
        var matchedIds = {};
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
            matchedIds[pg.id] = true;
        });
        q2EtcProgs.forEach(function (qp, j) {
            if (!M.links[qp.id] || matchedIds[qp.id]) return;
            matchedProgs.push({ id: qp.id, why: qp.why, pri: qp.pri, ord: 1000 + j });
            matchedIds[qp.id] = true;
        });
        matchedProgs.sort(function (x, y) { return (x.pri - y.pri) || (x.ord - y.ord); });

        // 8-2) 무조건 추천(고정 최상단, 2026-11-25):
        // - 연체된 수출대금(미수금) 회수 선택: K-SURE 해외채권 회수대행을 최우선 추천으로 맨 앞 고정
        // - 소상공인·소기업: 소상공인 첫수출 전략을 비중있게(#1 강조 카드) 무조건 추천
        // - B2C 선택 기업: 아마존 입점전략·글로벌 쇼핑몰 판매지원(중진공)·해외 온라인 플랫폼 판로지원(소진공)을 무조건 추천
        var pinned = [];
        var featuredMap = {};
        if (issues.indexOf('overdue') >= 0) {
            var wOverdue = "'" + M.issues.overdue + "'를 골라서(최우선 추천 · 이미 발생한 미수채권 사후 추심·K-SURE 회수대행)";
            add('debt-collect', 14, wOverdue);
            priMap['debt-collect'] = 1;
            pinned.push('debt-collect');
        }
        if (has2('smallbiz') || has2('small')) {
            var wSmb = has2('smallbiz')
                ? '소상공인을 위한 핵심 첫수출 6단계 실전 전략이라서(필수 추천)'
                : '소기업의 첫 수출 준비에 꼭 맞는 6단계 실전 전략이라서(필수 추천)';
            add('smb-strategy', 12, wSmb);
            priMap['smb-strategy'] = 1;
            featuredMap['smb-strategy'] = true;
            pinned.push('smb-strategy');
        }
        if (forms.indexOf('b2c') >= 0) {
            var wAmz = "거래 형태로 'B2C 온라인 판매'를 골라서(필수 추천)";
            add('c-amazon', 10, wAmz);
            priMap['c-amazon'] = 1;
            pinned.push('c-amazon');
            // 2026-11-25 작가님: B2C 선택 시 중진공·소진공 온라인 판로 사업도 함께 무조건 추천
            add('gm-kosmes', 9, "거래 형태로 'B2C 온라인 판매'를 골라서(중소기업 대상, 모집 시기 공고 확인)");
            priMap['gm-kosmes'] = 1;
            pinned.push('gm-kosmes');
            add('op-semas', 9, "거래 형태로 'B2C 온라인 판매'를 골라서(소상공인 대상, 모집 시기 공고 확인)");
            priMap['op-semas'] = 1;
            pinned.push('op-semas');
        }

        // 수출실적 0 + 수출계약 보유 기업(DEAL_FUND): 전용 안내에 정리한 곳과 무보 금융·보험 상품은 다른 목록에서 뺀다
        var dfSkip = function (id) {
            if (!dealFundOn()) return false;
            var D = M.dealFund;
            if (D.coveredIds.indexOf(id) >= 0 || D.excludeIds.indexOf(id) >= 0) return true;
            var u = (M.links[id] && M.links[id].u) || '';
            return D.excludeUrl.some(function (x) { return u.indexOf(x) >= 0; });
        };
        matchedProgs = matchedProgs.filter(function (r) { return !dfSkip(r.id); });

        // 자격 기준 거르기
        var list = order.filter(function (id) {
            if (dfSkip(id)) return false;
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
        var topLimit = Math.max(3, pinned.length + 2);
        var unpinned = list.filter(function (id) { return pinned.indexOf(id) < 0; });
        var topIds = pinned.filter(function (id) { return !!M.links[id]; }).concat(unpinned).slice(0, topLimit);
        var progs = matchedProgs.filter(function (r) { return topIds.indexOf(r.id) < 0; });
        var progIds = progs.map(function (r) { return r.id; });
        var rest = list.filter(function (id) {
            if (topIds.indexOf(id) >= 0) return false;
            if (progIds.indexOf(id) >= 0) return false;
            if (id === 'at' && (progIds.indexOf('at-ops') >= 0 || progIds.indexOf('at-facility') >= 0)) return false;
            if (id === 'exim' && (progIds.indexOf('exim-growth') >= 0 || progIds.indexOf('exim-perform') >= 0 || progIds.indexOf('exim-promo') >= 0)) return false;
            return true;
        });
        var moreIds = rest.slice(0, 4);
        // 후순위 '더 찾아볼 곳': 고른 항목과 겹치는 묶음의 기관을 모두(위에서 나온 곳은 빼고)
        pays.forEach(function (p) { tags.push('pay:' + p); });
        if (has2('smallbiz')) tags.push('size:smallbiz');
        if (has2('small')) tags.push('size:small');
        if (has2('medium')) tags.push('size:medium');
        if (ctx.sme) tags.push('size:sme');
        var shown = topIds.concat(progIds, moreIds);
        var extra = [];
        (M.extra || []).forEach(function (g) {
            if (!g.on.some(function (t) { return tags.indexOf(t) >= 0; })) return;
            var ids = [];
            g.items.forEach(function (it) {
                if (!M.links[it.id] || shown.indexOf(it.id) >= 0 || dfSkip(it.id)) return;
                if (it.skipIf && it.skipIf.some(function (sid) { return shown.indexOf(sid) >= 0; })) return;
                if (it.st && it.st.indexOf(st) < 0) return;
                if (it.on && !it.on.some(function (t) { return tags.indexOf(t) >= 0; })) return;
                if (it.when && !it.when(ctx)) return;
                var sm = M.stageMap[it.id];
                if (sm && sm.hard && sm.s[st] === 0) return;
                ids.push(it.id); shown.push(it.id);
            });
            var gt = typeof g.t === 'function' ? g.t(ctx) : g.t;
            if (ids.length) extra.push({ t: gt, ids: ids });
        });
        return {
            extra: extra,
            top: topIds.map(function (id) { return { id: id, why: why(id), pri: priMap[id] || 0, featured: !!featuredMap[id] }; }),
            progs: progs,
            more: moreIds.map(function (id) { return { id: id, why: why(id) }; }),
            consultTop: consultTop,
            urgentConsult: urgentConsult,
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
        if (a.q1 !== 's0' && a.q1b && a.q1b !== 'prep') s += '(진행 거래: ' + q1bShort() + (dl ? ', 이번 건 계약금액 ' + dl.short : '') + ')';
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
        if (a.q1b) s1 += ' / 진행 거래: ' + q1bShort();
        if (dealObj()) s1 += ' / 이번 건 계약금액: ' + dealObj().label;
        L.push(s1);
        if (a.q1r) L.push('매출실적(최근 1년 또는 전년도): ' + label('q1r', a.q1r));
        if (dealFundOn()) L.push('안내: 수출실적 0 + 수출계약 보유 기업 자금 안내 대상(무보 제외, ' + (has2('smallbiz') ? '소상공인 경로' : '일반 중소기업 경로') + ')');
        L.push('거래 형태(희망 포함): ' + (listLabels('q4', a.q4) || '-'));
        L.push('창업 연차·우대 조건·규모: ' + (listLabels('q2', Array.isArray(a.q2) ? a.q2 : (a.q2 ? [a.q2] : [])) || '-') + ' / 품목: ' + (listLabels('q3', items()) || '-') + ' / 시장: ' + (listLabels('q5', a.q5) || '-'));
        if (has2('proc_cert') && arr(a.q2proc).length) {
            var pNames = (M.q2ProcOpts || []).filter(function (o) { return arr(a.q2proc).indexOf(o.v) >= 0; }).map(function (o) { return o.label; });
            if (pNames.length) L.push('공공조달 제품 세부: ' + pNames.join(', '));
        }
        if (has2('pref_etc') && q2EtcValue()) L.push('기타(우대 조건): ' + q2EtcValue());
        L.push('어려운 점: ' + (arr(a.q6).filter(function (k) { return k !== 'etc'; }).map(function (k) { return M.issues[k]; }).concat(arr(a.q6).indexOf('etc') >= 0 ? ['기타'] : []).join(', ') || '-'));
        if (arr(a.q6).indexOf('etc') >= 0 && etcValue()) L.push('기타(찾는 서비스): ' + etcValue());
        var nd = needList(a).map(function (c) { return label('q8', c); }).filter(Boolean).join(', ');   // 옛 결과만(9번 질문은 2026-11-24 삭제)
        L.push('결제 방식: ' + (listLabels('q7', a.q7) || '-') + (nd ? ' / 필요: ' + nd : ''));
        return L.join('\n');
    }

    /* ---------- 수출실적 0 + 수출계약 보유 기업 전용 자금 안내 (2026-11-24) ---------- */
    function renderDealFund() {
        var box = $('egDealFund'), D = M.dealFund;
        if (!box) return;
        box.textContent = '';
        box.hidden = !dealFundOn();
        if (box.hidden) return;
        var small = has2('smallbiz');
        var tech = has2('venture') || has2('innobiz') || has2('lab');
        var youth = has2('youth');
        var under7 = has2('pre') || has2('startup') || has2('y7');
        var over7 = has2('y7p');
        var nego = a.q1b === 'nego';
        var dl = dealObj();
        function chkTag() { return el('span', 'eg-df-chk', '공고 확인'); }
        function ic(cls) { var i = el('i', cls); i.setAttribute('aria-hidden', 'true'); return i; }

        var head = el('div', 'eg-df-head');
        head.appendChild(el('span', 'eg-df-badge', '우리 회사 맞춤 안내'));
        head.appendChild(el('h4', 'eg-df-title', D.title));
        box.appendChild(head);
        var intro = '수출실적은 아직 없지만 ' + (nego ? '바이어와 협상·샘플을 진행 중인' : '수출 주문(계약)을 받은') + ' 회사' +
            (dl ? '(이번 건 계약금액 ' + dl.short + ')' : '') + '를 위한 자금 안내입니다. ' +
            '실적이 없어도 열려 있는 길을 기관별로 정리하고, 어떤 순서로 가면 좋은지 차례로 설명해 드립니다.';
        box.appendChild(el('p', 'eg-df-intro', intro));
        var notes = el('ul', 'eg-df-notes');
        if (dl && D.bigDeal.indexOf(a.q1c) >= 0) notes.appendChild(el('li', 'is-strong', D.bigNote));
        if (nego) notes.appendChild(el('li', null, D.negoNote));
        notes.appendChild(el('li', null, D.ksureNote));
        box.appendChild(notes);

        // 1) 기관별 한눈에 보기
        box.appendChild(el('h5', 'eg-df-sub', '① 기관별로 한눈에 보기'));
        var grid = el('div', 'eg-df-grid');
        D.rows.forEach(function (r) {
            var card = el('article', 'eg-df-card is-' + r.st);
            if ((r.tech && tech) || (r.small && small)) card.classList.add('is-fit');
            var top = el('div', 'eg-df-card-top');
            top.appendChild(el('strong', 'eg-df-org', r.org));
            top.appendChild(el('span', 'eg-df-st is-' + r.st, r.stText || D.statusLabel[r.st]));
            card.appendChild(top);
            card.appendChild(el('p', 'eg-df-prod', r.product));
            if (r.tech && tech) card.appendChild(el('p', 'eg-df-fit', '벤처·이노비즈·연구소를 고르셔서 기보가 잘 맞을 수 있습니다.'));
            if (r.small && small) card.appendChild(el('p', 'eg-df-fit', '소상공인을 고르셔서 지금 바로 볼 수 있는 자금입니다.'));
            if (r.contract && nego) card.appendChild(el('p', 'eg-df-fit is-wait', '계약서에 서명한 뒤 신청할 수 있습니다.'));
            var ul = el('ul', 'eg-df-pts');
            r.pts.forEach(function (p) {
                if (p.youth && !youth) return;
                if (p.small && !small) return;
                var li = el('li', null, p.t);
                if (p.age && (under7 || over7)) {
                    li.appendChild(el('strong', 'eg-df-me', under7 ? ' → 고르신 업력이면 혁신창업사업화자금입니다.' : ' → 고르신 업력이면 신성장기반자금입니다.'));
                }
                if (p.chk) { li.appendChild(document.createTextNode(' ')); li.appendChild(chkTag()); }
                ul.appendChild(li);
            });
            card.appendChild(ul);
            var wh = el('p', 'eg-df-where');
            wh.appendChild(ic('fa-solid fa-location-dot'));
            wh.appendChild(document.createTextNode(' 신청: ' + r.where));
            card.appendChild(wh);
            if (r.link && M.links[r.link]) {
                var go = linkEl(r.link, 'eg-df-go', '자세히 보기');
                go.dataset.egLink = 'deal-fund:' + r.link;
                go.appendChild(document.createTextNode(' '));
                go.appendChild(ic('fa-solid fa-arrow-right'));
                card.appendChild(go);
            }
            grid.appendChild(card);
        });
        box.appendChild(grid);

        // 2) 추천 순서
        function pathEl(P) {
            var ol = el('ol', 'eg-df-steps');
            P.steps.forEach(function (stp) {
                var li = el('li');
                var h = el('strong', 'eg-df-step-h', stp.h);
                li.appendChild(h);
                if (stp.contract && nego) { li.appendChild(document.createTextNode(' ')); li.appendChild(el('span', 'eg-df-wait', '계약 후')); }
                li.appendChild(el('p', 'eg-df-why', stp.why));
                ol.appendChild(li);
            });
            return ol;
        }
        var main = small ? D.paths.small : D.paths.sme;
        var other = small ? D.paths.sme : D.paths.small;
        box.appendChild(el('h5', 'eg-df-sub', '② ' + main.t));
        box.appendChild(pathEl(main));
        var det = el('details', 'eg-df-other');
        det.appendChild(el('summary', null, small ? '일반 중소기업(소상공인이 아닌 경우) 순서 보기' : '소상공인이라면? 순서 보기'));
        det.appendChild(pathEl(other));
        box.appendChild(det);

        // 3) 준비 서류
        box.appendChild(el('h5', 'eg-df-sub', '③ 미리 준비하면 좋은 서류'));
        var dul = el('ul', 'eg-df-docs');
        D.docs.forEach(function (d) { dul.appendChild(el('li', null, nego && d.nego ? d.t + ' — ' + d.nego : d.t)); });
        box.appendChild(dul);
        box.appendChild(el('p', 'eg-note', '기관마다 요구하는 서류가 다르니 상담 때 목록을 꼭 받아 두세요.'));

        box.appendChild(el('p', 'eg-df-disc', D.disclaimer));
        var cta = el('a', 'btn btn-primary eg-df-cta', '이 순서로 1:1 상담받기');
        cta.href = '#egConsult';
        cta.dataset.egLink = 'deal-fund:consult';
        box.appendChild(cta);
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
        var c = { st: stageIdx(a.q1), item: hasItem };
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

    /* ---------- 품목별 핵심 체크·추천 기관(URL 중복 제거 + 교차 조건, 2026-11-24) ---------- */
    function normUrl(u) {
        return String(u || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
    }
    function renderItemGuide() {
        var box = $('egItemGuide');
        if (!box) return;
        box.textContent = '';
        var IG = M.itemGuides || {};
        var picked = items().filter(function (v) { return !!IG[v]; });
        if (!picked.length) { box.hidden = true; return; }
        box.hidden = false;

        var st = stageIdx(a.q1);
        var iss = arr(a.q6);
        var forms4 = arr(a.q4);
        var pureB2b4 = forms4.indexOf('b2b') >= 0 && forms4.indexOf('b2c') < 0;
        var hasB2c = forms4.indexOf('b2c') >= 0 || (!pureB2b4 && iss.indexOf('mall') >= 0);
        var alerts = [], tips = [], priTips = [];
        var byUrl = {}, progs = [];

        function addProg(p, pinned) {
            if (p.b2cOnly && !hasB2c) return;
            if (p.nonB2cOnly && hasB2c) return;
            var key = normUrl(p.url);
            if (!key) return;
            if (dealFundOn() && M.dealFund && (M.dealFund.excludeUrl || []).some(function (x) { return String(p.url || '').indexOf(x) >= 0; })) return;
            if (byUrl[key]) {
                if (pinned) byUrl[key].pinned = true;
                return;
            }
            var item = { name: p.name, url: p.url, desc: p.desc, ext: !!p.ext, pinned: !!pinned };
            byUrl[key] = item;
            progs.push(item);
        }

        picked.forEach(function (v) {
            var g = IG[v];
            var lbl = label('q3', v) || v;
            var pTip = (!hasB2c && g.priorityTipNonB2c) ? g.priorityTipNonB2c : g.priorityTip;
            if (pTip) priTips.push({ label: lbl, text: pTip });
            var cr = g.crossRule || null;
            var hit = false;
            if (cr) {
                if (cr.stageZero && st === 0) hit = true;
                if (cr.issues && cr.issues.some(function (k) { return iss.indexOf(k) >= 0; })) hit = true;
            }
            if (hit && cr.alert && alerts.indexOf(cr.alert) < 0) alerts.push(cr.alert);
            if (hit && cr.tip && tips.indexOf(cr.tip) < 0) tips.push(cr.tip);
            var pinNames = (hit && cr.pinTop) ? cr.pinTop : [];
            if (hit && cr.extraPrograms) {
                cr.extraPrograms.forEach(function (ep) { addProg(ep, pinNames.indexOf(ep.name) >= 0); });
            }
            (g.programs || []).forEach(function (p) {
                addProg(p, pinNames.indexOf(p.name) >= 0);
            });
        });

        // 교차 조건에 걸린 우선 확인 기관은 목록 상단으로 올린다(원래 순서는 유지)
        var sorted = progs.filter(function (p) { return p.pinned; }).concat(progs.filter(function (p) { return !p.pinned; }));

        box.appendChild(el('h4', 'eg-sub', '품목별 핵심 체크·추천 기관'));

        alerts.forEach(function (t) {
            var p = el('p', 'eg-ig-alert');
            var ic = el('i', 'fa-solid fa-triangle-exclamation');
            ic.setAttribute('aria-hidden', 'true');
            p.appendChild(ic);
            p.appendChild(document.createTextNode(' ' + t));
            box.appendChild(p);
        });
        tips.forEach(function (t) {
            var p = el('p', 'eg-ig-tip');
            var ic = el('i', 'fa-solid fa-lightbulb');
            ic.setAttribute('aria-hidden', 'true');
            p.appendChild(ic);
            p.appendChild(document.createTextNode(' ' + t));
            box.appendChild(p);
        });
        if (priTips.length) {
            var ulT = el('ul', 'eg-ig-tips');
            priTips.forEach(function (pt) {
                var li = el('li');
                li.appendChild(el('span', 'eg-ig-badge', pt.label));
                li.appendChild(document.createTextNode(pt.text));
                ulT.appendChild(li);
            });
            box.appendChild(ulT);
        }
        if (sorted.length) {
            var ulP = el('ul', 'eg-more-list');
            sorted.forEach(function (p) {
                var li = el('li');
                if (p.pinned) li.appendChild(el('span', 'eg-ig-pin', '우선 확인'));
                var x = el('a', 'eg-more-link', p.name);
                x.href = p.url;
                x.dataset.egLink = 'item-guide:' + p.name;
                if (p.ext) {
                    x.target = '_blank';
                    x.rel = 'noopener noreferrer';
                    var ic = el('i', 'fa-solid fa-arrow-up-right-from-square pf-ext');
                    ic.setAttribute('aria-hidden', 'true');
                    x.appendChild(document.createTextNode(' '));
                    x.appendChild(ic);
                }
                li.appendChild(x);
                if (p.desc) li.appendChild(el('span', 'eg-prog-d', p.desc));
                ulP.appendChild(li);
            });
            box.appendChild(ulP);
        }
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
        renderDealFund();

        renderAiPicks();
        renderItemGuide();

        var top = $('egTop');
        top.textContent = '';
        rec.top.forEach(function (r, i) {
            var L = M.links[r.id];
            var card = el('article', 'eg-card' + (r.featured ? ' is-featured' : ''));
            card.appendChild(el('span', 'eg-card-n', String(i + 1)));
            var body = el('div', 'eg-card-body');
            var h = el('h4', 'eg-card-t');
            if (r.featured) h.appendChild(el('span', 'eg-pri-badge is-featured', '핵심 필수 추천'));
            else if (r.pri === 1) h.appendChild(el('span', 'eg-pri-badge', '최우선 추천'));
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
                var aEl = linkEl(id, 'eg-more-link');
                if (M.links[id].ext) {
                    var ic = el('i', 'fa-solid fa-arrow-up-right-from-square pf-ext');
                    ic.setAttribute('aria-hidden', 'true');
                    aEl.appendChild(document.createTextNode(' '));
                    aEl.appendChild(ic);
                }
                x.appendChild(aEl);
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

        // 상담 상자 위치: '연체·미수금'(긴급 안내)·'무역클레임'·'기타' 등을 고르면 추천 위로
        $('egEtcNoMatch').hidden = !rec.etcNoMatch;
        var urgEl = $('egUrgentMsg');
        if (urgEl) urgEl.hidden = !rec.urgentConsult;
        var consult = $('egConsult');
        consult.classList.toggle('is-urgent', !!rec.urgentConsult);
        var cTitle = $('egConsultTitle');
        if (cTitle) cTitle.textContent = rec.urgentConsult ? '긴급 1:1 상담받기 (연체·미수금 사후 대응)' : '이 내용으로 상담받기';
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
        if (has2('pref_etc') && q2EtcValue()) body.set('q2etc', q2EtcValue());
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
