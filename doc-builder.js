/* 수출서류 초안 작성기 (doc-builder.html)
   - 서류 선택(오퍼시트·PI·PO·CI·P/L·선적통지) → 공통 조건 입력(5단계) → 항목 점검 → 한·영 초안(참고용)
   - 모든 서류가 같은 거래 값을 쓰므로 앞 서류에 넣은 값이 뒤 서류로 이어진다. 금액·포장 수·중량·CBM 자동 계산, 서류 간 불일치 경고.
   - 규칙 기반 정적 구현: 서버·API 호출 없음. 입력값은 이 페이지 메모리에만 있다.
     예외: '계약서 작성기로 이어 쓰기'를 누르면 sessionStorage('cbHandoff')에 잠깐 담고, contract-builder.js가 읽자마자 지운다.
   - 서류 문구는 doc-templates.js(window.DB_LIB)에 있다.
   - 구글 애널리틱스에는 '서류 종류·언어·내려받기 형식'만 보내고 입력 내용은 보내지 않는다. */
(function () {
    'use strict';

    var LIB = window.DB_LIB;
    var form = document.getElementById('cbForm');
    if (!LIB || !form) return;
    var PH = LIB.PH, DOCS = LIB.DOCS, PAY = LIB.PAY, CHARGES = LIB.CHARGES, MODE = LIB.MODE, S = LIB.S, NEED = LIB.NEED;
    var DOC_KEYS = ['offer', 'pi', 'po', 'ci', 'pl', 'advice'];

    var SITE = 'www.littlestar.co.kr/doc-builder.html';
    var COPY_NOTE = '\n\n※ 참고용 예시 문구(초안)입니다. 법률·통관 자문이 아니며, 사용 전 직접 확인이 필요합니다. (출처: ' + SITE + ')';
    var DOC_HEAD_KO = '초안 DRAFT · 참고용 · 법률·통관 자문 아님';
    var DOC_WARN = '이 문서는 입력한 값을 정해진 서식에 자동으로 채운 참고용 초안입니다. 완성된 서류가 아니며 법률·통관 자문이 아닙니다. 보내기 전에 숫자·계좌·서류 조건을 직접 확인하고, 필요하면 관세사 등 전문가 검토를 받으세요. [ ] 표시는 채워야 할 빈칸입니다.';
    var DOC_WARN_END = '이 초안은 참고용이며, 실제 거래·화물·운송서류와 대조해 고친 뒤에만 사용하세요. 이 초안을 그대로 써서 생긴 손해에 대해 사이트 운영자는 책임을 지지 않습니다(이 문장의 효력 범위도 나라·사안에 따라 다를 수 있습니다).';
    /* 영문만(lang=en) 출력용: 면책·초안 표시도 영문으로 바꿔 한글이 남지 않게 한다(계약서 작성기와 같은 기준) */
    var DOC_HEAD_EN = 'DRAFT · FOR REFERENCE ONLY · NOT LEGAL OR CUSTOMS ADVICE';
    var DOC_WARN_EN = 'This document is a reference draft that automatically fills the values entered into a preset form. It is not a finished document and does not constitute legal or customs advice. Before sending it, check all figures, bank details and document terms yourself and, where necessary, have it reviewed by a customs broker or other qualified professional. [ ] marks blanks to be completed.';
    var DOC_WARN_END_EN = 'This draft is for reference only. Use it only after checking and correcting it against the actual transaction, cargo and transport documents. The site operator accepts no liability for any loss arising from using this draft as is (the extent to which this statement is effective may also vary by country or case).';
    var FOOT_KO = '초안 DRAFT · 참고용 · 법률·통관 자문 아님 · 보내기 전 직접 확인 필요 · ' + SITE;
    var FOOT_EN = 'DRAFT · For reference only · Not legal or customs advice · Check before sending · ' + SITE;

    var SEA_ONLY = ['FAS', 'FOB', 'CFR', 'CIF'];
    var F_TERMS = ['EXW', 'FCA', 'FAS', 'FOB'];
    var C_TERMS = ['CPT', 'CIP', 'CFR', 'CIF'];
    var NO_DEC = ['KRW', 'JPY'];
    var ADV_PAYS = ['adv_copybl', 'adv_eta', 'adv_ship', 'adv_oa'];
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var CUR_NAME = { USD: 'US DOLLARS', EUR: 'EUROS', JPY: 'JAPANESE YEN', CNY: 'CHINESE YUAN', GBP: 'POUNDS STERLING', KRW: 'KOREAN WON' };
    var STEP_OF = { seller: 1, buyer: 1, items: 2, tol: 2, origin: 2, incoterm: 3, mode: 3, place: 3, shipDate: 3, pol: 3, adv: 4, pay: 4, fraud: 4, beneficiary: 4,
        offerNo: 5, offerDate: 5, offerValid: 5, piNo: 5, piDate: 5, piValid: 5, poNo: 5, poTotal: 5, ciNo: 5, ciDate: 5, etd: 5, eta: 5, vessel: 5, blType: 5, adviceDate: 5 };
    var STEP5_T = { offer: '오퍼 번호·유효기간', pi: 'PI 번호·유효기간', po: 'PO 번호·받은 PO 대조', ci: '송장번호·선적 정보', pl: '송장번호·선적 정보', advice: '선적 정보·통지' };

    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function track(name, params) { try { if (typeof gtag === 'function') gtag('event', name, params); } catch (e) { /* 무시 */ } }
    function reduceMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    function num(v) { if (v === '' || v == null) return NaN; return Number(String(v).replace(/,/g, '')); }

    /* ───────── 품목 줄 ───────── */
    var itemsBox = $('cbItems');
    var itemSeq = 0;
    var UNITS = ['PCS', 'SETS', 'CTNS', 'KG', 'MT', 'M', 'L'];
    function fld(id, f, label, extra, cls) {
        return '<div class="cb-field' + (cls ? ' ' + cls : '') + '"><label class="cb-label" for="' + id + f + '">' + label + '</label><input type="' + (extra === 'text' ? 'text' : 'number') + '" id="' + id + f + '" data-f="' + f + '"' + (extra === 'text' ? '' : ' min="0" step="any" inputmode="decimal"') + '></div>';
    }
    function addItem(v) {
        if (itemsBox.children.length >= 20) return null;
        itemSeq += 1;
        var id = 'dbI' + itemSeq;
        var row = document.createElement('div');
        row.className = 'cb-item db-item';
        row.innerHTML =
            '<div class="cb-field cb-f-desc"><label class="cb-label" for="' + id + 'desc">품명·규격(영문)</label><input type="text" id="' + id + 'desc" data-f="desc" placeholder="예: Stainless pot set, Model SP-20"></div>' +
            '<div class="cb-field db-f-hs"><label class="cb-label" for="' + id + 'hs">HS코드</label><input type="text" id="' + id + 'hs" data-f="hs" placeholder="예: 7323.93" inputmode="decimal"></div>' +
            fld(id, 'qty', '주문 수량') +
            '<div class="cb-field"><label class="cb-label" for="' + id + 'unit">단위</label><select id="' + id + 'unit" data-f="unit">' + UNITS.map(function (u) { return '<option>' + u + '</option>'; }).join('') + '</select></div>' +
            fld(id, 'price', '단가') +
            '<button type="button" class="cb-item-del" aria-label="이 품목 삭제"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>' +
            '<div class="db-pack"><p class="db-pack-t">선적·포장 <small>CI·P/L·선적통지용 · 선택</small></p>' +
            fld(id, 'ship', '선적 수량') + fld(id, 'per', '포장당 수량') + fld(id, 'nw', '포장당 순중량(kg)') + fld(id, 'gw', '포장당 총중량(kg)') + fld(id, 'cbm', '포장당 용적(CBM)') + '</div>' +
            '<p class="cb-item-amt" aria-live="polite"></p>';
        itemsBox.appendChild(row);
        if (v) Object.keys(v).forEach(function (f) { var el = row.querySelector('[data-f="' + f + '"]'); if (el && v[f] != null) el.value = v[f]; });
        syncDelBtns();
        return row;
    }
    function syncDelBtns() {
        var dels = itemsBox.querySelectorAll('.cb-item-del');
        Array.prototype.forEach.call(dels, function (b) { b.disabled = dels.length <= 1; });
        $('cbAddItem').disabled = itemsBox.children.length >= 20;
    }
    itemsBox.addEventListener('click', function (e) {
        var b = e.target.closest('.cb-item-del');
        if (!b || b.disabled) return;
        b.closest('.cb-item').remove();
        syncDelBtns();
        schedule();
    });
    $('cbAddItem').addEventListener('click', function () {
        var r = addItem();
        if (r) r.querySelector('input').focus();
        schedule();
    });

    /* ───────── 상태 읽기 ───────── */
    var IFIELDS = ['desc', 'hs', 'qty', 'unit', 'price', 'ship', 'per', 'nw', 'gw', 'cbm'];
    function readState() {
        var s = {};
        Array.prototype.forEach.call(form.elements, function (el) {
            if (!el.name) return;
            if (el.type === 'radio') { if (el.checked) s[el.name] = el.value; }
            else if (el.type === 'checkbox') s[el.name] = el.checked;
            else s[el.name] = (el.value || '').trim();
        });
        s.items = Array.prototype.map.call(itemsBox.children, function (row) {
            var it = { row: row };
            IFIELDS.forEach(function (f) { var el = row.querySelector('[data-f="' + f + '"]'); it[f] = el ? el.value.trim() : ''; });
            return it;
        });
        s.doc = s.doc || 'offer';
        s.hasAdv = ADV_PAYS.indexOf(s.pay) >= 0 || s.pay === 'full_adv';
        return s;
    }

    /* ───────── 형식 ───────── */
    function fmtDate(iso, lang) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
        if (!m) return '';
        var y = +m[1], mo = +m[2], d = +m[3];
        return lang === 'ko' ? y + '년 ' + mo + '월 ' + d + '일' : d + ' ' + MONTHS[mo - 1] + ' ' + y;
    }
    function addDays(iso, n) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
        if (!m || !(n >= 0 || n < 0)) return '';
        var dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n));
        return dt.toISOString().slice(0, 10);
    }
    function decOf(cur) { return NO_DEC.indexOf(cur) >= 0 ? 0 : 2; }
    function fmtMoney(minor, cur) {
        var d = decOf(cur);
        return (minor / Math.pow(10, d)).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    }
    function fmtPrice(n, cur) { var d = decOf(cur); return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: Math.max(d, 4) }); }
    function fmtNum(n, dmax) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: dmax == null ? 4 : dmax }); }
    function fmtW(n) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function fmtCbm(n) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }); }

    // 금액을 영문 글자로(SAY ... ONLY)
    var ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    var TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    function words3(n) {
        var h = Math.floor(n / 100), r = n % 100, out = [];
        if (h) out.push(ONES[h] + ' HUNDRED');
        if (r) out.push(r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? '-' + ONES[r % 10] : ''));
        return out.join(' ');
    }
    function words(n) {
        if (n === 0) return 'ZERO';
        var sc = ['', ' THOUSAND', ' MILLION', ' BILLION', ' TRILLION'], out = [], i = 0;
        while (n > 0 && i < sc.length) { var c = n % 1000; if (c) out.unshift(words3(c) + sc[i]); n = Math.floor(n / 1000); i += 1; }
        return out.join(' ');
    }
    function amountWords(minor, cur) {
        var d = decOf(cur), sc = Math.pow(10, d);
        var ip = Math.floor(minor / sc), fp = minor - ip * sc;
        return 'SAY: ' + (CUR_NAME[cur] || cur) + ' ' + words(ip) + (fp ? ' AND ' + (fp < 10 ? '0' : '') + fp + '/100' : '') + ' ONLY';
    }

    /* ───────── 계산·검증 ───────── */
    function compute(s) {
        var warns = [];
        function W(lv, msg, field, docs) { warns.push({ lv: lv, msg: msg, field: field, docs: docs || null }); }
        var cur = s.cur || 'USD', d = decOf(cur), scale = Math.pow(10, d);
        var tol = num(s.tol); if (!(tol >= 0)) tol = 0;

        var total = 0, shipTotal = 0, filled = 0, units = {}, shipUnits = {};
        var qtySum = 0, shipQtySum = 0;
        var pk = { n: 0, nw: 0, gw: 0, cbm: 0, ok: true, any: false, nwOk: true, gwOk: true, cbmOk: true };
        var cno = 1;
        s.items.forEach(function (it, idx) {
            var q = num(it.qty), p = num(it.price);
            var sq = it.ship === '' ? q : num(it.ship);
            var per = num(it.per), nw = num(it.nw), gw = num(it.gw), cbm = num(it.cbm);
            var bad = {
                qty: it.qty !== '' && !(q > 0),
                price: it.price !== '' && !(p >= 0),
                ship: it.ship !== '' && !(sq >= 0),
                per: it.per !== '' && !(per > 0),
                nw: it.nw !== '' && !(nw >= 0),
                gw: (it.gw !== '' && !(gw >= 0)) || (gw >= 0 && nw >= 0 && gw < nw),
                cbm: it.cbm !== '' && !(cbm >= 0)
            };
            Object.keys(bad).forEach(function (f) { var el = it.row.querySelector('[data-f="' + f + '"]'); if (el) el.setAttribute('aria-invalid', bad[f] ? 'true' : 'false'); });
            if (bad.qty || bad.price || bad.ship) W('error', '품목 ' + (idx + 1) + ': 수량·단가·선적 수량에 올바른 숫자를 넣어 주세요.', 'items');
            if (bad.per || bad.nw || bad.cbm) W('error', '품목 ' + (idx + 1) + ': 포장당 수량·중량·용적에 올바른 숫자를 넣어 주세요.', 'items');
            if (gw >= 0 && nw >= 0 && gw < nw) W('error', '품목 ' + (idx + 1) + ': 총중량(G.W.)이 순중량(N.W.)보다 작습니다. 총중량은 포장재를 더한 무게입니다.', 'items', ['pl', 'advice']);
            it.ok = q > 0 && p >= 0 && !bad.qty && !bad.price;
            it.sq = it.ok && sq >= 0 && !bad.ship ? sq : (it.ok ? q : 0);
            it.minor = it.ok ? Math.round(Number((q * p * scale).toFixed(6))) : null;
            it.shipMinor = it.ok ? Math.round(Number((it.sq * p * scale).toFixed(6))) : null;
            if (it.ok) {
                total += it.minor; shipTotal += it.shipMinor; filled += 1;
                units[it.unit] = 1; qtySum += q;
                if (it.sq > 0) { shipUnits[it.unit] = 1; shipQtySum += it.sq; }
                // 선적 수량 대 주문 수량
                if (it.ship !== '' && !bad.ship) {
                    var hi = q * (1 + tol / 100), lo = q * (1 - tol / 100);
                    if (it.sq > hi + 1e-9) W('warn', '품목 ' + (idx + 1) + ': 선적 수량(' + fmtNum(it.sq) + ')이 주문 수량(' + fmtNum(q) + ')보다 많습니다' + (tol ? '(과부족 ' + tol + '% 초과)' : '') + '. PI·PO와 맞지 않아 바이어가 대금 지급을 미룰 수 있습니다.', 'items', ['ci', 'pl', 'advice']);
                    else if (it.sq < lo - 1e-9) {
                        if (s.partial === 'yes') W('info', '품목 ' + (idx + 1) + ': 주문 ' + fmtNum(q) + ' 중 ' + fmtNum(it.sq) + '만 선적합니다(분할선적). 남은 수량은 다음 CI로 보냅니다.', 'items', ['ci', 'pl', 'advice']);
                        else W('warn', '품목 ' + (idx + 1) + ': 주문 수량보다 적게 선적하는데 분할선적이 ‘허용 안 함’입니다. 바이어의 서면 동의를 받거나 3단계에서 조건을 고치세요.', 'items', ['ci', 'pl', 'advice']);
                    } else if (it.sq !== q) W('info', '품목 ' + (idx + 1) + ': 선적 수량이 주문 수량과 다르지만 과부족 허용 범위(' + tol + '%) 안입니다.', 'items', ['ci']);
                }
            }
            // 포장 계산
            it.pk = null;
            if (it.ok && it.sq > 0) {
                if (per > 0 && !bad.per) {
                    var n = Math.ceil(it.sq / per - 1e-9), full = Math.floor(it.sq / per + 1e-9), rem = Math.round((it.sq - full * per) * 1e6) / 1e6;
                    var r = { n: n, from: cno, to: cno + n - 1, rem: rem, nw: null, gw: null, cbm: null };
                    if (nw >= 0 && it.nw !== '') r.nw = nw * it.sq / per; else pk.nwOk = false;
                    if (gw >= 0 && it.gw !== '') r.gw = gw * full + (rem > 0 ? (nw >= 0 && it.nw !== '' ? (gw - nw) + nw * rem / per : gw) : 0); else pk.gwOk = false;
                    if (cbm >= 0 && it.cbm !== '') r.cbm = cbm * n; else pk.cbmOk = false;
                    cno += n;
                    it.pk = r; pk.any = true;
                    pk.n += n; if (r.nw != null) pk.nw += r.nw; if (r.gw != null) pk.gw += r.gw; if (r.cbm != null) pk.cbm += r.cbm;
                    if (rem > 0) W('info', '품목 ' + (idx + 1) + ': 마지막 포장에는 ' + fmtNum(rem) + '만 들어갑니다. 그 포장의 중량은 비례로 어림했으니 실제 무게로 고치세요.', 'items', ['pl']);
                } else pk.ok = false;
                if (!it.hs) it.noHs = true;
            }
            var amt = it.row.querySelector('.cb-item-amt');
            var t = [];
            if (it.ok) t.push('금액 ' + cur + ' ' + fmtMoney(it.minor, cur));
            if (it.ok && it.ship !== '' && it.sq !== q) t.push('선적분 ' + cur + ' ' + fmtMoney(it.shipMinor, cur));
            if (it.pk) t.push('포장 ' + it.pk.n + (it.pk.gw != null ? ' · G.W. ' + fmtW(it.pk.gw) + 'kg' : '') + (it.pk.cbm != null ? ' · ' + fmtCbm(it.pk.cbm) + 'CBM' : ''));
            amt.textContent = t.join('  ·  ');
        });
        var hasTotal = filled > 0;
        if (!hasTotal) W('warn', '품목 수량·단가가 비어 있어 금액이 [ ]로 남습니다.', 'items');
        else if (filled < s.items.filter(function (it) { return it.desc || it.qty || it.price; }).length) W('warn', '수량·단가가 빠진 품목 줄은 합계에서 빠졌습니다.', 'items');
        if (hasTotal && s.items.some(function (it) { return it.ok && !it.desc; })) W('warn', '품명이 빈 품목이 있습니다.', 'items');
        if (hasTotal && (!pk.ok || !pk.any)) W('warn', '포장당 수량이 빈 품목이 있어 포장 수·중량 합계가 일부 빠집니다(2단계 ‘선적·포장’).', 'items', ['pl', 'advice']);
        else if (pk.any && (!pk.nwOk || !pk.gwOk || !pk.cbmOk)) W('warn', '포장당 순중량·총중량·용적 중 빈 값이 있어 P/L 합계가 일부 비어 있습니다.', 'items', ['pl', 'advice']);
        if (hasTotal && s.items.some(function (it) { return it.noHs; })) W('warn', 'HS코드가 빈 품목이 있습니다. 상업송장에는 HS코드를 적는 것이 보통입니다(수입국 통관·원산지 확인).', 'items', ['ci']);
        if (s.needCO && !s.origin) W('warn', '원산지증명서가 필요하다고 했는데 원산지가 비어 있습니다.', 'origin', ['ci', 'pi']);

        // 선금
        var payHasAdv = ADV_PAYS.indexOf(s.pay) >= 0;
        var adv = num(s.adv);
        var advBad = payHasAdv && !(adv >= 1 && adv <= 99 && Math.round(adv) === adv);
        $('cbAdv').setAttribute('aria-invalid', advBad ? 'true' : 'false');
        if (advBad) W('error', '선금 비율은 1~99 사이의 정수(%)로 넣어 주세요.', 'adv');
        var advPct = s.pay === 'full_adv' ? 100 : (payHasAdv && !advBad ? adv : 0);
        var advMinor = hasTotal ? Math.round(total * advPct / 100) : null;
        var advShip = hasTotal ? Math.round(shipTotal * advPct / 100) : null;

        // 운송·인코텀즈
        var inc = s.incoterm, mode = s.mode;
        if (SEA_ONLY.indexOf(inc) >= 0 && mode !== 'sea') W('warn', inc + '는 해상·내수로 운송 전용 조건입니다. ' + (mode === 'air' ? '항공' : '육상·복합') + ' 운송이면 ' + ({ FAS: 'FCA', FOB: 'FCA', CFR: 'CPT', CIF: 'CIP' })[inc] + '가 맞습니다.', 'incoterm');
        var low = function (x) { return (x || '').toLowerCase().replace(/[^a-z0-9가-힣]+/g, ' ').trim(); };
        if (s.place) {
            if (F_TERMS.indexOf(inc) >= 0 && inc !== 'EXW' && s.pol && low(s.place).split(' ')[0] !== low(s.pol).split(' ')[0]) W('info', inc + '의 지정 장소(' + s.place + ')와 선적항(' + s.pol + ')이 달라 보입니다. 서류마다 같은 이름으로 적으세요.', 'place');
            if (F_TERMS.indexOf(inc) < 0 && s.pod && low(s.place).split(' ')[0] !== low(s.pod).split(' ')[0]) W('info', inc + '의 지정 장소(' + s.place + ')와 도착항(' + s.pod + ')이 달라 보입니다. 서류마다 같은 이름으로 적으세요.', 'place');
        }
        if (inc === 'CIF' || inc === 'CIP') W('info', inc + ' 조건이라 서류 목록에 보험증권(사본)을 넣었습니다.', 'incoterm', ['pi', 'po', 'advice']);
        if (mode === 'air' && (s.pay === 'adv_copybl' || s.pay === 'oa' || s.pay === 'adv_oa')) W('info', '항공 화물은 수하인이 AWB 원본 없이 찾을 수 있어, 선적 뒤 잔금을 받는 조건이면 화물 인도 전에 대금을 확보할 수단이 없습니다. 잔금 시점을 다시 확인하세요.', 'pay', ['offer', 'pi']);
        if (s.pay === 'lc') W('info', '신용장 거래라면 CI·P/L의 품명·수량·금액·서류 문구를 신용장 내용과 글자까지 맞춰야 합니다. 이 초안은 신용장 문구를 반영하지 않습니다.', 'pay', ['ci', 'pl']);

        // 날짜
        function errDate(id, bad) { var el = form.elements[id]; if (el) el.setAttribute('aria-invalid', bad ? 'true' : 'false'); }
        var bOV = s.offerDate && s.offerValid && s.offerValid < s.offerDate;
        errDate('offerValid', bOV); if (bOV) W('error', '오퍼 유효기간이 오퍼 날짜보다 앞섭니다.', 'offerValid', ['offer']);
        var bPV = s.piDate && s.piValid && s.piValid < s.piDate;
        errDate('piValid', bPV); if (bPV) W('error', 'PI 유효기간이 PI 날짜보다 앞섭니다.', 'piValid', ['pi']);
        if (s.offerFirm === 'firm' && !s.offerValid) W('warn', '확정 오퍼는 유효기간을 꼭 적으세요. 기간이 없으면 언제까지 이 조건을 지켜야 하는지 다툼이 생깁니다.', 'offerValid', ['offer']);
        if (s.piDate && s.offerDate && s.piDate < s.offerDate) W('warn', 'PI 날짜가 오퍼 날짜보다 앞섭니다.', 'piDate', ['pi']);
        if (s.piDate && s.offerValid && s.piDate > s.offerValid) W('warn', 'PI 날짜가 오퍼 유효기간(' + s.offerValid + ')을 지났습니다. 그사이 바뀐 가격·조건이 없는지 확인하세요.', 'piDate', ['pi']);
        if (s.shipBy === 'date' && s.shipDate && s.piDate && s.shipDate < s.piDate) W('warn', '최종 선적일이 PI 날짜보다 앞섭니다.', 'shipDate', ['pi']);
        if (s.ciDate && s.piDate && s.ciDate < s.piDate) W('warn', '송장 날짜가 PI 날짜보다 앞섭니다.', 'ciDate', ['ci', 'pl']);
        if (s.etd && s.piDate && s.etd < s.piDate) W('warn', '선적일이 PI 날짜보다 앞섭니다.', 'etd', ['ci', 'advice']);
        if (s.shipBy === 'date' && s.shipDate && s.etd && s.etd > s.shipDate) W('warn', '실제 선적일(' + s.etd + ')이 최종 선적일(' + s.shipDate + ')을 넘었습니다. 바이어의 서면 동의(기한 연장)를 받아 두세요.', 'etd', ['ci', 'pl', 'advice']);
        var bEta = s.eta && s.etd && s.eta <= s.etd;
        errDate('eta', bEta); if (bEta) W('error', '도착 예정일(ETA)이 출항일(ETD)과 같거나 앞섭니다.', 'eta', ['advice']);
        if (s.adviceDate && s.etd && s.adviceDate < s.etd) W('info', '통지일이 출항일보다 앞섭니다. 선적 전 예정 통지라면 확정 뒤 다시 보내세요.', 'adviceDate', ['advice']);
        if (!s.piNo && !s.poNo) W('info', '참조할 PI·PO 번호가 없습니다. 어느 주문의 선적인지 바이어가 알 수 있게 적으세요.', 'piNo', ['ci', 'pl', 'advice']);

        // 받은 PO와 대조
        if (s.poCheck) {
            var poT = num(s.poTotal), poQ = num(s.poQty), n0 = 0;
            if (s.poTotal !== '' && poT >= 0 && hasTotal) {
                var poMinor = Math.round(poT * scale);
                if (poMinor !== total) { n0++; W('warn', 'PO 총액(' + cur + ' ' + fmtMoney(poMinor, cur) + ')과 PI 합계(' + cur + ' ' + fmtMoney(total, cur) + ')가 ' + cur + ' ' + fmtMoney(Math.abs(poMinor - total), cur) + ' 다릅니다. 단가·수량을 다시 맞추세요.', 'poTotal', ['po', 'pi']); }
            }
            if (s.poQty !== '' && poQ >= 0 && hasTotal && Math.abs(poQ - qtySum) > 1e-9) { n0++; W('warn', 'PO 총수량(' + fmtNum(poQ) + ')과 PI 총수량(' + fmtNum(qtySum) + ')이 다릅니다.', 'poTotal', ['po', 'pi']); }
            if (s.poInco && s.poInco !== inc) { n0++; W('warn', 'PO 인코텀즈(' + s.poInco + ')와 PI 인코텀즈(' + inc + ')가 다릅니다. 단가에 들어간 비용이 달라집니다.', 'poTotal', ['po', 'pi']); }
            if (s.poShip && s.shipBy === 'date' && s.shipDate && s.poShip !== s.shipDate) { n0++; W('warn', 'PO 최종 선적일(' + s.poShip + ')과 PI 최종 선적일(' + s.shipDate + ')이 다릅니다.', 'poTotal', ['po', 'pi']); }
            if (s.poPay && s.poPay !== s.pay) { n0++; W('warn', 'PO 결제조건(' + PAY[s.poPay].label + ')이 PI 결제조건(' + PAY[s.pay].label + ')과 다릅니다.', 'poTotal', ['po', 'pi']); }
            if (!n0 && (s.poTotal || s.poQty || s.poInco || s.poShip || s.poPay)) W('ok', '받은 PO에 넣은 값이 PI 조건과 같습니다(넣은 항목만 비교).', 'poTotal', ['po']);
        }

        // B/L 처리
        var balOpen = ['adv_copybl', 'adv_eta', 'dp', 'da'].indexOf(s.pay) >= 0;
        if (mode === 'sea' && balOpen && (s.blType === 'surrender' || s.blType === 'waybill')) W('warn', (s.blType === 'surrender' ? '서렌더' : '해상화물운송장') + '로 하면 바이어가 원본 없이 물품을 찾을 수 있어, 잔금을 받기 전에는 화물을 붙잡아 둘 방법이 없습니다.' + (s.pay === 'dp' || s.pay === 'da' ? ' 추심(D/P·D/A)은 원본 B/L이 은행을 거쳐야 합니다.' : ' 서렌더는 잔금 입금을 확인한 뒤에 하세요.'), 'blType', ['advice']);

        // 계좌·사기 경고
        var bankBlank = ['beneficiary', 'bank', 'swift', 'account'].filter(function (x) { return !s[x]; }).length;
        if (!s.fraud) W('warn', '계좌변경 사기 경고 문구를 뺐습니다. 잔금·선적통지 무렵 “계좌가 바뀌었다”는 메일이 오면 반드시 아는 번호로 전화해 확인하세요.', 'fraud', ['pi', 'ci', 'advice']);
        if (bankBlank) W('info', '계좌 정보 ' + bankBlank + '칸이 비어 [ ]로 남습니다(4단계).', 'beneficiary', ['pi', 'ci', 'advice']);

        return {
            warns: warns, cur: cur, total: hasTotal ? total : null, shipTotal: hasTotal ? shipTotal : null,
            qtySum: qtySum, shipQtySum: shipQtySum, unit: Object.keys(units).length === 1 ? Object.keys(units)[0] : '',
            shipUnit: Object.keys(shipUnits).length === 1 ? Object.keys(shipUnits)[0] : '',
            pk: pk, advPct: advPct, advMinor: advMinor, balMinor: hasTotal ? total - advMinor : null,
            advShip: advShip, balShip: hasTotal ? shipTotal - advShip : null, filled: filled, bankBlank: bankBlank
        };
    }

    /* ───────── 값 묶음(V) ───────── */
    function T(en, ko) { return { t: true, en: en, ko: ko }; }   // 다시 채울 템플릿
    function L2(en, ko) { return { en: en, ko: ko }; }          // 언어별 값
    function values(s, k) {
        var V = {};
        Object.keys(s).forEach(function (key) { if (typeof s[key] === 'string') V[key] = s[key]; });
        ['offerDate', 'offerValid', 'piDate', 'piValid', 'poDate', 'ciDate', 'adviceDate', 'shipDate', 'etd', 'eta'].forEach(function (x) {
            V[x] = s[x] ? L2(fmtDate(s[x], 'en'), fmtDate(s[x], 'ko')) : '';
        });
        var cur = k.cur;
        V.cur = cur;
        V.total = k.total != null ? fmtMoney(k.total, cur) : '';
        V.shipTotal = k.shipTotal != null ? fmtMoney(k.shipTotal, cur) : '';
        V.adv = ADV_PAYS.indexOf(s.pay) >= 0 && k.advPct ? String(k.advPct) : '';
        V.bal = V.adv ? String(100 - k.advPct) : '';
        V.cover = s.cover || 'C';
        V.mode = L2(MODE[s.mode].en, MODE[s.mode].ko);
        V.incotermFull = s.incoterm + ' ' + (s.place || '');
        V.notify = s.notify;
        var P = PAY[s.pay];
        V.payTerm = T(P.en, P.ko);
        V.charges = L2(CHARGES[s.charges || 'buyer'].en, CHARGES[s.charges || 'buyer'].ko);
        V.shipTerm = s.shipBy === 'date' ? T(S.shipByDate.en, S.shipByDate.ko) : s.shipBy === 'afterAdv' ? T(S.shipAfterAdv.en, S.shipAfterAdv.ko) : s.shipBy === 'afterLc' ? T(S.shipAfterLc.en, S.shipAfterLc.ko) : T(S.shipAfterOrder.en, S.shipAfterOrder.ko);
        V.partialT = s.partial === 'yes' ? L2('Allowed', '허용') : L2('Not allowed', '허용 안 함');
        V.transT = s.trans === 'yes' ? L2('Allowed', '허용') : L2('Not allowed', '허용 안 함');
        // 잔금 기한
        var due = '';
        if (s.pay === 'adv_eta' && s.eta && num(s.etaDays) >= 0) { var dd = addDays(s.eta, -num(s.etaDays)); due = L2('by ' + fmtDate(dd, 'en') + ' (' + s.etaDays + ' days before ETA)', fmtDate(dd, 'ko') + '까지(도착 예정일 ' + s.etaDays + '일 전)'); }
        else if ((s.pay === 'oa' || s.pay === 'adv_oa') && s.etd && num(s.oaDays) >= 0) { var od = addDays(s.etd, num(s.oaDays)); due = L2('by ' + fmtDate(od, 'en') + ' (' + s.oaDays + ' days after the B/L date)', fmtDate(od, 'ko') + '까지(B/L 일자부터 ' + s.oaDays + '일)'); }
        else if (P.dueEn) due = T(P.dueEn, P.dueKo);
        V.balDueText = due;
        V.advAmt = k.advMinor != null ? fmtMoney(k.advMinor, cur) : '';
        V.balAmt = k.balMinor != null ? fmtMoney(k.balMinor, cur) : '';
        V.advShipAmt = k.advShip != null ? fmtMoney(k.advShip, cur) : '';
        V.balShipAmt = k.balShip != null ? fmtMoney(k.balShip, cur) : '';
        V.marks = s.marks ? s.marks.split(/\s+\/\s+/).join('\n') : '';
        return V;
    }

    /* 템플릿 채우기: out = 'html' | 'text'. 빈 값은 [자리표시]로, counter.n에 개수를 센다 */
    function fill(tpl, V, lang, out, counter) {
        return String(tpl).replace(/\{(\w+)\}/g, function (m, key) {
            var v = V[key];
            if (v && typeof v === 'object') {
                if (v.t) return fill(v[lang], V, lang, out, counter);
                v = v[lang];
            }
            if (v === '' || v == null) {
                var ph = PH[key] || PH._;
                var p = ph[lang === 'ko' ? 1 : 0];
                if (p.charAt(0) === '[') {
                    if (counter) counter.n += 1;
                    return out === 'html' ? '<mark class="cb-ph">' + esc(p) + '</mark>' : p;
                }
                return out === 'html' ? esc(p) : p;
            }
            return out === 'html' ? esc(v) : String(v);
        });
    }

    /* ───────── 서류 모형 ───────── */
    function docsList(s) {
        var m = MODE[s.mode];
        var l = [['Commercial Invoice', '상업송장'], ['Packing List', '포장명세서'], [m.tdoc + (s.mode === 'sea' ? ' (copy / original as agreed)' : ''), m.tdocKo]];
        if (s.incoterm === 'CIF' || s.incoterm === 'CIP') l.push(['Insurance Policy / Certificate', '보험증권']);
        if (s.needCO) l.push(['Certificate of Origin', '원산지증명서']);
        return l;
    }
    // m: { meta:[[en,ko,tpl]], parties:[], intro, table:'price'|'pl'|'advice', qtyKey, foot:[], terms:[[en,ko,T]], paras:[T], bank:bool, fraud:T, sign:[] }
    function model(doc, s, k) {
        var D = DOCS[doc], m = { doc: doc, titleEn: D.en, titleKo: D.ko, meta: [], parties: [], terms: [], paras: [], foot: [], sign: [] };
        var M = MODE[s.mode];
        var seller = { en: 'SELLER', ko: '수출자', lines: ['{seller}', '{sellerAddr}, {sellerCountry}'] };
        if (s.sellerTel || s.sellerEmail) seller.lines.push((s.sellerTel ? 'Tel. ' + '{sellerTel}' : '') + (s.sellerTel && s.sellerEmail ? ' · ' : '') + (s.sellerEmail ? '{sellerEmail}' : ''));
        var buyer = { en: 'BUYER', ko: '바이어', lines: ['{buyer}', '{buyerAddr}, {buyerCountry}'] };
        var priceTerm = ['Price terms', '가격조건', T('{incoterm} {place} (Incoterms® 2020)', '{incoterm} {place}(Incoterms® 2020)')];
        var payTerm = ['Payment', '결제조건', T('{payTerm} {charges}', '{payTerm} {charges}')];
        var shipTerm = ['Shipment', '선적 시기', T('{shipTerm}, {mode}, from {pol} to {pod}. Partial shipment: {partialT}. Transshipment: {transT}.', '{shipTerm}, {mode}, {pol}에서 {pod}까지. 분할선적: {partialT}. 환적: {transT}.')];
        var packTerm = ['Packing', '포장', L2(S.packing.en, S.packing.ko)];
        var originTerm = ['Origin', '원산지', T('{origin}', '{origin}')];
        var insTerm = s.incoterm === 'CIF' || s.incoterm === 'CIP' ? ['Insurance', '보험', T(S.insurance.en, S.insurance.ko)] : null;
        var sSeller = { en: 'For and on behalf of the Seller', ko: '수출자', name: '{seller}', rep: '{sellerRep}' };
        var sBuyer = { en: 'Accepted by the Buyer', ko: '바이어 승낙', name: '{buyer}', rep: '{buyerRep}' };
        var docsT = docsList(s);
        var docsTpl = L2(docsT.map(function (x, i) { return (i + 1) + '. ' + x[0]; }).join('\n'), docsT.map(function (x, i) { return (i + 1) + '. ' + x[1]; }).join('\n'));
        var remarks = s.remarks ? ['Remarks', '비고', T('{remarks}', '{remarks}')] : null;

        if (doc === 'offer') {
            m.meta = [['Offer No.', '오퍼 번호', '{offerNo}'], ['Date', '날짜', '{offerDate}'], ['Valid until', '유효기간', '{offerValid}']];
            m.parties = [seller, { en: 'TO (MESSRS.)', ko: '수신', lines: buyer.lines }];
            m.intro = T(S.offerIntro.en, S.offerIntro.ko);
            m.table = 'price'; m.qty = 'qty';
            m.terms = [priceTerm, payTerm, shipTerm, packTerm, originTerm, insTerm, remarks];
            m.paras = [s.offerFirm === 'subject' ? T(S.offerSubject.en, S.offerSubject.ko) : T(S.offerFirm.en, S.offerFirm.ko)];
            m.sign = [sSeller, sBuyer];
        } else if (doc === 'pi') {
            m.meta = [['PI No.', 'PI 번호', '{piNo}'], ['Date', '날짜', '{piDate}'], ['Valid until', '유효기간', '{piValid}']];
            if (s.offerNo) m.meta.push(['Ref. Offer No.', '참조 오퍼 번호', '{offerNo}']);
            m.parties = [seller, buyer];
            m.intro = T(S.piIntro.en, S.piIntro.ko);
            m.table = 'price'; m.qty = 'qty'; m.words = 'total';
            if (k.advPct && k.advPct < 100) m.foot = [['Advance payment ({adv}%)', '선금({adv}%)', '{cur} {advAmt}'], ['Balance ({bal}%)', '잔금({bal}%)', '{cur} {balAmt}']];
            else if (s.pay === 'full_adv') m.foot = [['Advance payment (100%)', '선금(100%)', '{cur} {total}']];
            m.terms = [priceTerm, payTerm, shipTerm, packTerm, originTerm, insTerm, ['Documents', '제공 서류', docsTpl], remarks];
            m.paras = [T(S.piValid.en, S.piValid.ko)];
            if (k.advPct && k.advPct < 100) m.paras.push(T(S.piNote.en, S.piNote.ko));
            m.bank = true; m.fraud = T(S.fraud.en, S.fraud.ko);
            m.sign = [sSeller, sBuyer];
        } else if (doc === 'po') {
            m.meta = [['PO No.', 'PO 번호', '{poNo}'], ['Date', '날짜', '{poDate}']];
            if (s.piNo) m.meta.push(['Ref. PI No.', '참조 PI 번호', '{piNo}']);
            m.parties = [{ en: 'BUYER (ISSUER)', ko: '바이어(발행인)', lines: buyer.lines }, { en: 'TO: SELLER', ko: '수신: 수출자', lines: seller.lines }];
            m.intro = T(S.poIntro.en, S.poIntro.ko);
            m.table = 'price'; m.qty = 'qty'; m.words = 'total';
            m.terms = [priceTerm, payTerm, shipTerm, packTerm, ['Shipping marks', '화인', T('{marks}', '{marks}')], insTerm, ['Documents required', '요구 서류', docsTpl], remarks];
            m.paras = [T(S.poAck.en, S.poAck.ko)];
            m.sign = [{ en: 'For and on behalf of the Buyer', ko: '바이어', name: '{buyer}', rep: '{buyerRep}' }, { en: 'Acknowledged by the Seller', ko: '수출자 확인', name: '{seller}', rep: '{sellerRep}' }];
        } else if (doc === 'ci' || doc === 'pl') {
            m.meta = [['Invoice No.', '송장번호', '{ciNo}'], ['Date', '날짜', '{ciDate}']];
            if (s.piNo) m.meta.push(['Ref. PI No.', '참조 PI 번호', '{piNo}']);
            if (s.poNo) m.meta.push(['Ref. PO No.', '참조 PO 번호', '{poNo}']);
            m.parties = [{ en: 'SHIPPER / EXPORTER', ko: '송하인·수출자', lines: seller.lines }, { en: 'CONSIGNEE', ko: '수하인', lines: buyer.lines }, { en: 'NOTIFY PARTY', ko: '통지처', lines: ['{notify}'] }];
            m.ship = [[M.vessel, M.vesselKo, s.mode === 'sea' ? '{vessel} {voyage}' : '{vessel}'], [M.no, M.noKo, '{blNo}'], ['Sailing on or about', '출항일', '{etd}'], ['Port of loading', '선적항', '{pol}'], ['Final destination', '도착지', '{pod}']];
            m.marks = true;
            if (doc === 'ci') {
                m.table = 'price'; m.qty = 'ship'; m.words = 'ship';
                if (s.showAdv && s.hasAdv) {
                    if (s.pay === 'full_adv') m.foot = [['Paid in advance', '선금 받음', '{cur} {shipTotal}'], ['Balance due', '잔금', '{cur} 0' + (decOf(k.cur) ? '.00' : '')]];
                    else if (k.advPct) m.foot = [['Less: advance received ({adv}%)', '차감: 받은 선금({adv}%)', '{cur} {advShipAmt}'], ['Balance due', '잔금', '{cur} {balShipAmt}']];
                }
                m.terms = [priceTerm, payTerm, originTerm, remarks];
                m.paras = [T(S.ciDecl.en, S.ciDecl.ko)];
                if (s.pay !== 'full_adv' && s.pay !== 'lc' && s.pay !== 'dp' && s.pay !== 'da') { m.bank = true; m.fraud = T(S.fraud.en, S.fraud.ko); }
                m.sign = [sSeller];
            } else {
                m.table = 'pl'; m.qty = 'ship';
                m.terms = [remarks];
                m.paras = [T(S.plNote.en, S.plNote.ko)];
                m.sign = [sSeller];
            }
        } else if (doc === 'advice') {
            m.meta = [['Date', '날짜', '{adviceDate}'], ['Invoice No.', '송장번호', '{ciNo}']];
            if (s.piNo) m.meta.push(['Ref. PI No.', '참조 PI 번호', '{piNo}']);
            if (s.poNo) m.meta.push(['Ref. PO No.', '참조 PO 번호', '{poNo}']);
            m.parties = [{ en: 'FROM', ko: '보내는 곳', lines: seller.lines }, { en: 'TO', ko: '받는 곳', lines: buyer.lines }];
            m.intro = T(S.adviceIntro.en, S.adviceIntro.ko);
            m.table = 'advice'; m.qty = 'ship';
            var sh = [[M.vessel, M.vesselKo, s.mode === 'sea' ? '{vessel} {voyage}' : '{vessel}'], [M.no, M.noKo, '{blNo}'], ['Port of loading', '선적항', '{pol}'], ['Port of discharge', '도착항', '{pod}'], ['ETD', '출항일', '{etd}'], ['ETA', '도착 예정일', '{eta}']];
            if (s.mode === 'sea' && s.container) sh.push(['Container / Seal', '컨테이너·봉인', '{container}']);
            sh.push(['Invoice amount', '송장 금액', '{cur} {shipTotal}']);
            m.ship = sh;
            var p = [T(S.adviceDocs.en, S.adviceDocs.ko)];
            var balDue = s.pay !== 'full_adv' && s.pay !== 'lc';
            var balPending = ['adv_copybl', 'adv_eta', 'adv_ship', 'dp', 'da'].indexOf(s.pay) >= 0;
            if (s.mode === 'sea') {
                if (s.blType === 'surrender') p.push(balPending ? T(S.blSurrender.en, S.blSurrender.ko) : T(S.blSurrenderNoBal.en, S.blSurrenderNoBal.ko));
                else if (s.blType === 'waybill') p.push(T(S.blWaybill.en, S.blWaybill.ko));
                else p.push(balPending && s.pay !== 'dp' && s.pay !== 'da' ? T(S.blOriginal.en, S.blOriginal.ko) : T(S.blOriginalNoBal.en, S.blOriginalNoBal.ko));
            }
            if (s.courier) p.push(T(S.courierLine.en, S.courierLine.ko));
            if (balDue && s.pay !== 'dp' && s.pay !== 'da') {
                var bal = k.advPct ? '{balShipAmt}' : '{shipTotal}';
                p.push(T(S.balanceLine.en.replace('{balAmt}', bal), S.balanceLine.ko.replace('{balAmt}', bal)));
                m.bank = true; m.fraud = T(S.fraudAdvice.en, S.fraudAdvice.ko);
            }
            p.push(T(S.adviceClose.en, S.adviceClose.ko));
            m.paras = p;
            m.terms = [['Documents', '서류', docsTpl], remarks];
            m.sign = [sSeller];
        }
        m.terms = m.terms.filter(Boolean);
        return m;
    }

    /* ───────── 렌더링 ───────── */
    function nowStamp() {
        var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }
    function itemRows(s, m) {
        return s.items.filter(function (it) { return it.ok && (m.qty === 'qty' || it.sq > 0); });
    }

    function renderDoc(doc, ctx, out, cnt) {
        var s = ctx.s, k = ctx.k, V = ctx.V, lang = s.lang || 'both';
        var m = model(doc, s, k);
        var showEn = lang !== 'ko', showKo = lang !== 'en', both2 = showEn && showKo;
        var H = out === 'html', vl = showEn ? 'en' : 'ko';
        var enOnly = showEn && !showKo;
        var dHead = enOnly ? DOC_HEAD_EN : DOC_HEAD_KO, dWarn = enOnly ? DOC_WARN_EN : DOC_WARN, dWarnEnd = enOnly ? DOC_WARN_END_EN : DOC_WARN_END;
        var cur = k.cur;
        var parts = [];
        function f(tpl, c) { return fill(tpl, V, vl, out, c === undefined ? cnt : c); }
        function lbl(en, ko) {
            if (both2) return H ? esc(en) + ' <small class="db-l-ko">' + esc(ko) + '</small>' : en + ' (' + ko + ')';
            return H ? esc(showEn ? en : ko) : (showEn ? en : ko);
        }
        function lblT(en, ko) { // 라벨 안에 {adv} 같은 자리
            var e = fill(en, V, 'en', out, null), kk = fill(ko, V, 'ko', out, null);
            if (both2) return H ? e + ' <small class="db-l-ko">' + kk + '</small>' : e + ' (' + kk + ')';
            return showEn ? e : kk;
        }
        function sent(tplObj) { // 문장: 영문 + 국문(참고)
            var en = tplObj.t ? tplObj.en : tplObj.en, ko = tplObj.ko;
            var r = [];
            if (showEn) r.push(H ? '<p lang="en">' + fill(en, V, 'en', out, cnt) + '</p>' : fill(en, V, 'en', out, cnt));
            if (showKo) {
                var kt = fill(ko, V, 'ko', out, showEn ? null : cnt);
                if (H) r.push(showEn ? '<p class="cb-ko"><span class="cb-ko-k">국문 번역(참고)</span>' + kt + '</p>' : '<p>' + kt + '</p>');
                else r.push(showEn ? '[국문 번역(참고)] ' + kt : kt);
            }
            return r.join(H ? '' : '\n');
        }
        function cell(tplObj) { // 표 칸: 영문 + 국문 작게
            if (typeof tplObj === 'string') return f(tplObj);
            var en = fill(tplObj.en, V, 'en', out, showEn ? cnt : null), ko = fill(tplObj.ko, V, 'ko', out, showEn ? null : cnt);
            if (both2 && ko.replace(/\(Incoterms/, ' (Incoterms') === en) return en;
            if (both2) return H ? '<span lang="en">' + en + '</span><span class="db-v-ko">' + ko + '</span>' : en + '\n  (' + ko + ')';
            return showEn ? en : ko;
        }

        // 머리
        if (H) {
            parts.push('<div class="cb-doc-warn" role="note"><strong>' + (enOnly ? 'IMPORTANT · ' : '꼭 읽어 주세요 · ') + dHead + '</strong><br>' + esc(dWarn) + '<br><small>' + (enOnly ? 'Prepared: ' : '작성: ') + esc(nowStamp()) + ' · ' + SITE + '</small></div>');
            parts.push('<p class="cb-doc-sub"><span class="cb-doc-stamp">' + (enOnly ? 'DRAFT' : '초안 DRAFT') + '</span></p>');
            parts.push('<h4>' + esc(showEn ? m.titleEn : m.titleKo) + '</h4>');
            if (both2) parts.push('<p class="cb-doc-sub">' + esc(m.titleKo) + '(초안)</p>');
        } else {
            parts.push('==================== ' + dHead + ' ====================');
            parts.push(dWarn);
            parts.push((enOnly ? 'Prepared: ' : '작성: ') + nowStamp() + ' · ' + SITE);
            parts.push('==========================================================================');
            parts.push('');
            parts.push((showEn ? m.titleEn : m.titleKo) + (enOnly ? '  [DRAFT]' : '  [DRAFT / 초안]') + (both2 ? '\n' + m.titleKo + '(초안)' : ''));
            parts.push('');
        }
        // 번호·날짜
        if (H) parts.push('<table class="db-meta"><tbody>' + m.meta.map(function (r) { return '<tr><th>' + lbl(r[0], r[1]) + '</th><td>' + f(r[2]) + '</td></tr>'; }).join('') + '</tbody></table>');
        else parts.push(m.meta.map(function (r) { return lbl(r[0], r[1]) + ': ' + f(r[2]); }).join('\n') + '\n');
        // 당사자
        if (H) parts.push('<div class="db-parties">' + m.parties.map(function (p) { return '<div><p class="db-p-t">' + lbl(p.en, p.ko) + '</p>' + p.lines.map(function (l) { return '<p>' + f(l) + '</p>'; }).join('') + '</div>'; }).join('') + '</div>');
        else parts.push(m.parties.map(function (p) { return '[' + lbl(p.en, p.ko) + ']\n' + p.lines.map(function (l) { return f(l); }).join('\n'); }).join('\n\n') + '\n');
        // 선적 정보(CI·P/L·선적통지)
        if (m.ship) {
            if (H) parts.push('<table class="db-meta db-ship"><tbody>' + m.ship.map(function (r) { return '<tr><th>' + lbl(r[0], r[1]) + '</th><td>' + f(r[2]) + '</td></tr>'; }).join('') + '</tbody></table>');
            else parts.push(m.ship.map(function (r) { return lbl(r[0], r[1]) + ': ' + f(r[2]); }).join('\n') + '\n');
        }
        if (m.intro) parts.push(sent(m.intro) + (H ? '' : '\n'));
        // 화인
        if (m.marks) {
            if (H) parts.push('<div class="db-marks"><p class="db-p-t">' + lbl('Shipping marks', '화인') + '</p><p>' + f('{marks}') + '</p></div>');
            else parts.push('[' + lbl('Shipping marks', '화인') + ']\n' + f('{marks}') + '\n');
        }
        // 품목 표
        var rows = itemRows(s, m);
        var phRow = !rows.length;
        if (m.table === 'price') {
            var priceH = lbl('Unit price', '단가') + (H ? '<br><small>' : ' (') + esc(cur + ' ' + s.incoterm) + (H ? '</small>' : ')');
            var head = ['No.', lbl('Description', '품명·규격'), lbl('Quantity', '수량'), priceH, lbl('Amount', '금액') + (H ? '<br><small>' + cur + '</small>' : ' (' + cur + ')')];
            var body = phRow ? [['1', f('{_}') + ' ' + (H ? '<mark class="cb-ph">[Description]</mark>' : '[Description]'), f('{_}'), f('{_}'), f('{_}')]] : rows.map(function (it, i) {
                var q = m.qty === 'ship' ? it.sq : num(it.qty), amt = m.qty === 'ship' ? it.shipMinor : it.minor;
                var desc = (H ? esc(it.desc) : it.desc) || (H ? '<mark class="cb-ph">[Description]</mark>' : '[Description]');
                if (!it.desc && cnt) cnt.n += 1;
                if (it.hs && doc !== 'offer') desc += (H ? '<br><small>HS ' + esc(it.hs) + '</small>' : ' / HS ' + it.hs);
                return [String(i + 1), desc, fmtNum(q) + ' ' + it.unit, fmtPrice(num(it.price), cur), fmtMoney(amt, cur)];
            });
            var totQ = m.qty === 'ship' ? k.shipQtySum : k.qtySum, totU = m.qty === 'ship' ? k.shipUnit : k.unit;
            var totA = m.qty === 'ship' ? k.shipTotal : k.total;
            var tot = [lbl('TOTAL', '합계'), !phRow && totU ? fmtNum(totQ) + ' ' + totU : '', totA != null ? cur + ' ' + fmtMoney(totA, cur) : f('{total}')];
            if (H) {
                parts.push('<div class="cb-items-wrap"><table class="cb-items-t db-items-t"><thead><tr>' + head.map(function (h, i) { return '<th' + (i >= 2 ? ' class="num"' : '') + '>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
                    body.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (i >= 2 ? ' class="num"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
                    '</tbody><tfoot><tr><td colspan="2">' + tot[0] + '</td><td class="num">' + tot[1] + '</td><td></td><td class="num">' + tot[2] + '</td></tr>' +
                    m.foot.map(function (r) { return '<tr class="db-foot"><td colspan="4">' + lblT(r[0], r[1]) + '</td><td class="num">' + f(r[2]) + '</td></tr>'; }).join('') +
                    '</tfoot></table></div>');
                if (m.words && totA != null) parts.push('<p class="db-words" lang="en">' + esc(amountWords(m.words === 'ship' ? k.shipTotal : k.total, cur)) + '</p>');
            } else {
                parts.push(head.join(' | ').replace(/<[^>]+>/g, ''));
                body.forEach(function (r) { parts.push(r.join(' | ')); });
                parts.push('-'.repeat(40));
                parts.push(tot[0] + ': ' + (tot[1] ? tot[1] + ' / ' : '') + tot[2]);
                m.foot.forEach(function (r) { parts.push(lblT(r[0], r[1]) + ': ' + f(r[2])); });
                if (m.words && totA != null) parts.push(amountWords(m.words === 'ship' ? k.shipTotal : k.total, cur));
                parts.push('');
            }
        } else if (m.table === 'pl') {
            var pkg = s.pkg || 'CTNS';
            var hd = ['No.', lbl('C/No.', '포장 번호'), lbl('Description', '품명·규격'), lbl('Quantity', '수량'), lbl('Packages', '포장 수'), lbl('N.W. (kg)', '순중량'), lbl('G.W. (kg)', '총중량'), lbl('Meas. (CBM)', '용적')];
            var PHC = H ? '<mark class="cb-ph">[ ]</mark>' : '[ ]';
            function ph() { if (cnt) cnt.n += 1; return PHC; }
            var bd = phRow ? [['1', ph(), ph(), ph(), ph(), ph(), ph(), ph()]] : rows.map(function (it, i) {
                var p = it.pk;
                return [String(i + 1), p ? (p.from === p.to ? String(p.from) : p.from + '-' + p.to) : ph(), (H ? esc(it.desc) : it.desc) || ph(), fmtNum(it.sq) + ' ' + it.unit,
                    p ? p.n + ' ' + pkg : ph(), p && p.nw != null ? fmtW(p.nw) : ph(), p && p.gw != null ? fmtW(p.gw) : ph(), p && p.cbm != null ? fmtCbm(p.cbm) : ph()];
            });
            var pk = k.pk, allPk = pk.any && pk.ok;
            var ft = [lbl('TOTAL', '합계'), k.shipUnit ? fmtNum(k.shipQtySum) + ' ' + k.shipUnit : '', allPk ? pk.n + ' ' + pkg : ph(), allPk && pk.nwOk ? fmtW(pk.nw) : ph(), allPk && pk.gwOk ? fmtW(pk.gw) : ph(), allPk && pk.cbmOk ? fmtCbm(pk.cbm) : ph()];
            if (H) {
                parts.push('<div class="cb-items-wrap"><table class="cb-items-t db-items-t"><thead><tr>' + hd.map(function (h, i) { return '<th' + (i >= 3 ? ' class="num"' : '') + '>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
                    bd.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (i >= 3 ? ' class="num"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
                    '</tbody><tfoot><tr><td colspan="3">' + ft[0] + '</td>' + ft.slice(1).map(function (c) { return '<td class="num">' + c + '</td>'; }).join('') + '</tr></tfoot></table></div>');
                if (allPk) parts.push('<p class="db-words" lang="en">SAY: ' + esc(words(pk.n)) + ' (' + pk.n + ') ' + esc(pkg) + ' ONLY</p>');
            } else {
                parts.push(hd.join(' | '));
                bd.forEach(function (r) { parts.push(r.join(' | ')); });
                parts.push('-'.repeat(40));
                parts.push(ft.join(' | '));
                if (allPk) parts.push('SAY: ' + words(pk.n) + ' (' + pk.n + ') ' + pkg + ' ONLY');
                parts.push('');
            }
        } else if (m.table === 'advice') {
            var pk2 = k.pk, ok2 = pk2.any && pk2.ok;
            var goods = rows.length ? rows.map(function (it) { return (it.desc || '[Description]') + ' - ' + fmtNum(it.sq) + ' ' + it.unit; }).join('\n') : '';
            var lines = [[lbl('Goods', '물품'), goods ? (H ? esc(goods) : goods) : f('{_}')],
                [lbl('Packages', '포장 수'), ok2 ? pk2.n + ' ' + (s.pkg || 'CTNS') : f('{_}')],
                [lbl('Gross weight', '총중량'), ok2 && pk2.gwOk ? fmtW(pk2.gw) + ' kg' : f('{_}')],
                [lbl('Measurement', '용적'), ok2 && pk2.cbmOk ? fmtCbm(pk2.cbm) + ' CBM' : f('{_}')]];
            if (H) parts.push('<table class="db-meta db-ship"><tbody>' + lines.map(function (r) { return '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>'; }).join('') + '</tbody></table>');
            else parts.push(lines.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') + '\n');
        }
        // 조건
        if (m.terms.length) {
            if (H) parts.push('<table class="db-terms"><tbody>' + m.terms.map(function (r) { return '<tr><th>' + lbl(r[0], r[1]) + '</th><td>' + cell(r[2]) + '</td></tr>'; }).join('') + '</tbody></table>');
            else parts.push(m.terms.map(function (r) { return lbl(r[0], r[1]) + ': ' + cell(r[2]); }).join('\n') + '\n');
        }
        // 문장
        m.paras.forEach(function (p) { parts.push(sent(p)); });
        // 계좌·사기 경고
        if (m.bank) {
            var acc = 'Beneficiary: {beneficiary}\nBank: {bank}\nBank address: {bankAddr}\nSWIFT: {swift}\nAccount No.: {account}';
            var accKo = '수취인: {beneficiary}\n은행: {bank}\n은행 주소: {bankAddr}\nSWIFT: {swift}\n계좌번호: {account}';
            if (H) {
                parts.push('<div class="db-bank"><p class="db-p-t">' + lbl('Bank details', '은행 계좌') + '</p>' + sent(S.bankLead) + '<p' + (showEn ? ' lang="en"' : '') + '>' + fill(showEn ? acc : accKo, V, vl, out, cnt) + '</p>' +
                    (s.fraud ? '<div class="db-fraud">' + sent(m.fraud) + '</div>' : '') + '</div>');
            } else {
                parts.push('[' + lbl('Bank details', '은행 계좌') + ']');
                parts.push(sent(S.bankLead));
                parts.push(fill(showEn ? acc : accKo, V, vl, out, cnt));
                if (s.fraud) { parts.push(''); parts.push('*** ' + sent(m.fraud)); }
                parts.push('');
            }
        }
        // 서명
        if (H) {
            parts.push('<div class="cb-sign db-sign' + (m.sign.length === 1 ? ' db-sign-1' : '') + '">' + m.sign.map(function (g) {
                return '<div><p><strong>' + lbl(g.en, g.ko) + '</strong></p><p>' + f(g.name, null) + '</p><p class="cb-sign-line">' + lbl('Signature', '서명') + '</p><p>' + lbl('Name / Title', '성명·직위') + ': ' + f(g.rep) + '</p></div>';
            }).join('') + '</div>');
            parts.push('<div class="cb-doc-warn cb-doc-warn-end" role="note"><strong>' + dHead + '</strong><br>' + esc(dWarnEnd) + '</div>');
        } else {
            parts.push('');
            m.sign.forEach(function (g) { parts.push(lbl(g.en, g.ko) + ': ' + f(g.name, null) + '\n' + lbl('Signature', '서명') + ': ____________________\n' + lbl('Name / Title', '성명·직위') + ': ' + f(g.rep)); parts.push(''); });
            parts.push('==================== ' + dHead + ' ====================');
            parts.push(dWarnEnd);
            parts.push('(' + SITE + ')');
        }
        return parts.join(H ? '' : '\n');
    }

    /* ───────── 단계 이동 ───────── */
    var stepBtns = Array.prototype.slice.call(document.querySelectorAll('.cb-step'));
    var cards = Array.prototype.slice.call(form.querySelectorAll('.cb-card'));
    var step = 1, MAX = cards.length;
    function goStep(n, focus) {
        step = Math.max(1, Math.min(MAX, n));
        cards.forEach(function (c) { c.hidden = +c.getAttribute('data-step') !== step; });
        stepBtns.forEach(function (b) {
            var on = +b.getAttribute('data-step') === step;
            b.classList.toggle('is-active', on);
            if (on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
            if (on) {
                var bar = b.closest('ol');
                if (bar.scrollWidth > bar.clientWidth) bar.scrollLeft = b.parentNode.offsetLeft - 16;
            }
        });
        $('cbPrev').disabled = step === 1;
        $('cbNext').innerHTML = step === MAX ? '항목 점검 <i class="fa-solid fa-arrow-down" aria-hidden="true"></i>' : '다음 <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';
        $('cbPos').textContent = step + ' / ' + MAX;
        if (focus) {
            var t = $('cbSteps');
            var top = t.getBoundingClientRect().top;
            if (top < 0 || top > window.innerHeight * 0.6) t.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
            var first = Array.prototype.filter.call(cards[step - 1].querySelectorAll('input:not([type=hidden]), select'), function (el) { return el.offsetParent !== null; })[0];
            if (first) first.focus({ preventScroll: true });
        }
    }
    stepBtns.forEach(function (b) { b.addEventListener('click', function () { goStep(+b.getAttribute('data-step'), true); }); });
    $('cbPrev').addEventListener('click', function () { goStep(step - 1, true); });
    $('cbNext').addEventListener('click', function () {
        if (step === MAX) { $('check').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); return; }
        stepBtns[step - 1].classList.add('is-done');
        goStep(step + 1, true);
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    /* data-show 조건 표시 */
    var shows = Array.prototype.slice.call(form.querySelectorAll('[data-show]'));
    function syncShows(s) {
        shows.forEach(function (el) {
            var rule = el.getAttribute('data-show'), on;
            if (rule.indexOf('=') > 0) {
                var kv = rule.split('='), list = kv[1].split(',');
                on = list.indexOf(String(s[kv[0]])) >= 0;
            } else on = !!s[rule];
            el.hidden = !on;
        });
        $('cbFraudOff').hidden = !!s.fraud;
        var inc = s.incoterm;
        $('cbPlaceLabel').textContent = F_TERMS.indexOf(inc) >= 0 ? (inc === 'EXW' ? '지정 장소(수출자 공장·창고)' : '지정 장소(인도 장소·선적항)') : C_TERMS.indexOf(inc) >= 0 ? '지정 장소(목적항·목적지)' : '지정 장소(목적지)';
        var M = MODE[s.mode];
        $('dbVesselLabel').textContent = s.mode === 'sea' ? '선박명' : s.mode === 'air' ? '항공편' : '운송인·차량';
        $('dbBlLabel').textContent = M.noKo;
        $('dbStep5').textContent = STEP5_T[s.doc];
        $('dbStep5Title').textContent = STEP5_T[s.doc];
        $('dbCheckDoc').textContent = DOCS[s.doc].short === 'PI' ? '견적송장(PI)' : DOCS[s.doc].short === 'CI' ? '상업송장(CI)' : DOCS[s.doc].short === 'P/L' ? '포장명세서(P/L)' : DOCS[s.doc].short === 'PO' ? '구매주문서(PO)' : DOCS[s.doc].short;
    }

    /* ───────── 서류 흐름 ───────── */
    function renderFlow(s, k) {
        var tag = {};
        k.warns.forEach(function (w) { if (w.docs && (w.lv === 'warn' || w.lv === 'error')) w.docs.forEach(function (d) { tag[d] = (tag[d] === 'error' ? 'error' : w.lv); }); });
        var amt = function (m) { return m != null ? k.cur + ' ' + fmtMoney(m, k.cur) : '금액 [ ]'; };
        var pkTxt = k.pk.any && k.pk.ok ? k.pk.n + ' ' + (s.pkg || 'CTNS') + (k.pk.gwOk ? ' · ' + fmtW(k.pk.gw) + 'kg' : '') : '포장 [ ]';
        var info = {
            offer: [s.offerNo || '번호 [ ]', s.offerDate || '날짜 [ ]', amt(k.total)],
            pi: [s.piNo || '번호 [ ]', s.piDate || '날짜 [ ]', amt(k.total)],
            po: [s.poNo || '번호 [ ]', s.poDate || '날짜 [ ]', amt(k.total)],
            ci: [s.ciNo || '번호 [ ]', s.ciDate || '날짜 [ ]', amt(k.shipTotal)],
            pl: [s.ciNo || '번호 [ ]', pkTxt],
            advice: [s.blNo || 'B/L [ ]', s.etd ? 'ETD ' + s.etd : 'ETD [ ]']
        };
        var html = DOC_KEYS.map(function (d) {
            var D = DOCS[d], st = tag[d];
            var li = '<li class="db-fl' + (d === s.doc ? ' is-on' : '') + (st ? ' has-' + st : '') + '"><button type="button" data-doc="' + d + '"' + (d === s.doc ? ' aria-current="true"' : '') + '><span class="db-fl-n">' + D.n + '</span><strong>' + esc(D.short) + '</strong>' +
                info[d].map(function (x) { return '<small>' + esc(x) + '</small>'; }).join('') + (st ? '<em><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> ' + (st === 'error' ? '오류' : '확인') + '</em>' : '') + '</button></li>';
            if (d === 'pi') li += '<li class="db-fl db-fl-c"><a href="contract-builder.html" data-handoff="1"><span class="db-fl-n">3</span><strong>계약서</strong><small>작성기로 이어 쓰기</small></a></li>';
            return li;
        }).join('');
        $('dbFlow').innerHTML = html;
    }
    $('dbFlow').addEventListener('click', function (e) {
        var b = e.target.closest('[data-doc]');
        if (!b) return;
        selectDoc(b.getAttribute('data-doc'));
    });
    function selectDoc(d) {
        var r = form.elements.doc;
        Array.prototype.forEach.call(r, function (x) { x.checked = x.value === d; });
        update();
    }

    /* ───────── 점검 사이드 ───────── */
    var ICON = { error: 'fa-circle-xmark', warn: 'fa-triangle-exclamation', info: 'fa-circle-info', ok: 'fa-circle-check' };
    function renderSide(ctx, blanks) {
        var s = ctx.s, k = ctx.k;
        var sum = [
            ['서류', DOCS[s.doc].ko],
            ['가격조건', s.incoterm + ' ' + (s.place || '[장소]')],
            ['결제', PAY[s.pay].label],
            ['주문 합계', k.total != null ? k.cur + ' ' + fmtMoney(k.total, k.cur) : '[ ]'],
            ['선적 합계', k.shipTotal != null ? k.cur + ' ' + fmtMoney(k.shipTotal, k.cur) : '[ ]'],
            ['포장', k.pk.any ? k.pk.n + ' ' + (s.pkg || 'CTNS') + (k.pk.gwOk ? ' · G.W. ' + fmtW(k.pk.gw) + 'kg' : '') + (k.pk.cbmOk ? ' · ' + fmtCbm(k.pk.cbm) + 'CBM' : '') : '[ ]'],
            ['빈칸', blanks + '곳(이 서류)']
        ];
        $('cbSum').innerHTML = sum.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('');
        var order = { error: 0, warn: 1, ok: 2, info: 3 };
        var mine = function (w) { return !w.docs || w.docs.indexOf(s.doc) >= 0; };
        var list = k.warns.slice().sort(function (a, b) { return (mine(a) ? 0 : 10) + order[a.lv] - ((mine(b) ? 0 : 10) + order[b.lv]); });
        var seen = {};
        list = list.filter(function (w) { if (seen[w.msg]) return false; seen[w.msg] = 1; return true; });
        // 다른 서류 정보성 안내는 줄인다
        list = list.filter(function (w) { return mine(w) || w.lv === 'warn' || w.lv === 'error'; });
        if (blanks) list.push({ lv: 'info', msg: '이 서류 초안에 빈칸 [ ] ' + blanks + '곳이 남습니다. 보내기 전에 모두 채우세요.' });
        if (!list.some(function (w) { return w.lv === 'warn' || w.lv === 'error'; })) list.unshift({ lv: 'ok', msg: '이번 점검 규칙으로는 서류·조건 사이의 큰 불일치를 찾지 못했습니다(문제가 없다는 뜻은 아닙니다).' });
        $('cbWarns').innerHTML = list.map(function (w) {
            var st = w.field && STEP_OF[w.field];
            var tags = w.docs && !mine(w) ? w.docs.map(function (d) { return DOCS[d].short; }).join('·') : '';
            return '<li class="cb-w-' + w.lv + '"><i class="fa-solid ' + ICON[w.lv] + '" aria-hidden="true"></i><span>' + (tags ? '<b class="db-w-tag">' + esc(tags) + '</b> ' : '') + esc(w.msg) + (st ? ' <button type="button" data-goto="' + st + '" data-field="' + esc(w.field) + '">' + st + '단계로</button>' : '') + '</span></li>';
        }).join('');
        stepBtns.forEach(function (b) { b.classList.remove('has-err'); });
        k.warns.forEach(function (w) { if (w.lv === 'error' && STEP_OF[w.field]) stepBtns[STEP_OF[w.field] - 1].classList.add('has-err'); });
    }
    $('cbWarns').addEventListener('click', function (e) {
        var b = e.target.closest('[data-goto]');
        if (!b) return;
        goStep(+b.getAttribute('data-goto'), true);
        var f = b.getAttribute('data-field');
        var el = f === 'items' ? itemsBox.querySelector('input') : form.elements[f];
        if (el && el.length && !el.focus) el = el[0];
        if (el && el.focus) setTimeout(function () { el.focus(); }, 50);
    });

    /* ───────── 항목 점검·핵심 문구 ───────── */
    function needOk(key, s, k) {
        switch (key) {
            case 'items': return k.filled > 0 && s.items.every(function (it) { return !it.ok || it.desc; });
            case 'ship': return s.shipBy === 'date' ? !!s.shipDate : !!s.shipDays;
            case 'pay': return true;
            case 'docs': return true;
            case 'place': return !!s.place;
            case 'bank': return !k.bankBlank && s.fraud ? true : (!k.bankBlank ? 'half' : false);
            case 'hs': return k.filled > 0 && !s.items.some(function (it) { return it.noHs; });
            case 'pack': return k.pk.any && k.pk.ok && k.pk.nwOk && k.pk.gwOk && k.pk.cbmOk;
            case 'vessel': return !!(s.vessel && s.etd);
            case 'etd': return !!(s.etd && s.eta);
            case 'ciNo': return !!(s.ciNo && s.ciDate);
            case 'piNo': return !!s.piNo;
            case 'poNo': return !!(s.poNo && s.poDate);
            case 'offerNo': return !!(s.offerNo && s.offerDate);
            case 'seller': return !!(s.seller && s.sellerAddr);
            case 'buyer': return !!(s.buyer && s.buyerAddr);
            default: return !!s[key];
        }
    }
    function renderNeed(ctx) {
        var s = ctx.s, k = ctx.k;
        $('dbNeed').innerHTML = NEED[s.doc].map(function (n) {
            var ok = needOk(n.k, s, k);
            var cls = ok === true ? 'ok' : ok === 'half' ? 'half' : 'no';
            var badge = ok === true ? '채움' : ok === 'half' ? '경고 꺼짐' : '빈칸';
            return '<li class="db-need-' + cls + '"><i class="fa-solid ' + (ok === true ? 'fa-circle-check' : 'fa-circle-exclamation') + '" aria-hidden="true"></i><span><strong>' + esc(n.t) + '</strong> <em>' + badge + '</em><small>' + esc(n.why) + '</small></span></li>';
        }).join('');
    }
    function phrases(ctx) {
        var s = ctx.s, d = s.doc, l = [];
        l.push({ t: '결제조건', en: '{payTerm} {charges}', ko: '{payTerm} {charges}', why: '오퍼·PI·PO·CI의 결제조건 칸에 같은 문장을 씁니다.' });
        if (d === 'offer' || d === 'pi' || d === 'po') l.push({ t: '선적 시기', en: '{shipTerm}, {mode}, from {pol} to {pod}.', ko: '{shipTerm}, {mode}, {pol}에서 {pod}까지.', why: '선금 입금일과 묶어 적으면 납기 다툼이 줄어듭니다.' });
        if (d === 'offer') l.push(s.offerFirm === 'subject' ? { t: '유효기간(확인 조건부)', en: S.offerSubject.en, ko: S.offerSubject.ko, why: '가격이 자주 바뀌면 확인 조건부로 냅니다.', chk: true } : { t: '유효기간(확정 오퍼)', en: S.offerFirm.en, ko: S.offerFirm.ko, why: '확정 오퍼는 기간 안에 승낙하면 그대로 진행해야 하니 기간을 짧게 잡습니다.', chk: true });
        if (d === 'pi') l.push({ t: '유효기간', en: S.piValid.en, ko: S.piValid.ko, why: '오래된 PI로 주문하는 일을 막습니다.' });
        if (d === 'po') l.push({ t: '주문 승낙 요청', en: S.poAck.en, ko: S.poAck.ko, why: 'PO만 받고 PI 없이 진행하면 조건 확인이 빠지기 쉽습니다.' });
        if (d === 'ci') l.push({ t: '원산지·내용 확인', en: S.ciDecl.en, ko: S.ciDecl.ko, why: '바이어·수입국이 요구하면 넣습니다. 원산지증명서를 대신하지는 않습니다.', chk: true });
        if (d === 'advice') {
            l.push({ t: '잔금 안내', en: S.balanceLine.en.replace('{balAmt}', ctx.k.advPct && ctx.k.advPct < 100 ? '{balShipAmt}' : '{shipTotal}'), ko: S.balanceLine.ko.replace('{balAmt}', ctx.k.advPct && ctx.k.advPct < 100 ? '{balShipAmt}' : '{shipTotal}'), why: '잔금 금액과 기한을 숫자로 알려 줍니다.' });
        }
        if (d === 'pi' || d === 'ci') l.push({ t: '계좌·사기 경고', en: S.fraud.en, ko: S.fraud.ko, why: '계좌가 적힌 서류마다 함께 둡니다. 이메일 서명란에 넣어도 좋습니다.', chk: true, key: true });
        if (d === 'advice') l.push({ t: '계좌 재확인 안내', en: S.fraudAdvice.en, ko: S.fraudAdvice.ko, why: '선적통지 무렵 가짜 계좌변경 메일이 가장 많이 옵니다.', chk: true, key: true });
        return l;
    }
    function renderPhrases(ctx) {
        var V = ctx.V;
        var l = phrases(ctx);
        ctx.phrases = l;
        $('dbPhrases').innerHTML = l.map(function (p, i) {
            return '<article class="cb-cl' + (p.chk ? ' is-chk' : '') + '"><h4 class="cb-cl-h"><span class="cb-cl-n">' + (i + 1) + '</span>' + esc(p.t) + (p.key ? ' <span class="cb-badge cb-badge-key">사기 예방</span>' : '') + (p.chk ? ' <span class="cb-badge cb-badge-chk">확인 필요</span>' : '') + '</h4>' +
                '<p class="cb-cl-why"><i class="fa-solid fa-lightbulb" aria-hidden="true"></i>' + esc(p.why) + '</p>' +
                '<div class="cb-cl-txt"><span class="cb-cl-lang">영문</span><p lang="en">' + fill(p.en, V, 'en', 'html') + '</p><button type="button" class="ed-copy" data-copy-i="' + i + '" data-copy-lang="en"><i class="fa-regular fa-copy" aria-hidden="true"></i> 영문 복사</button></div>' +
                '<div class="cb-cl-txt"><span class="cb-cl-lang">국문(참고 번역)</span><p>' + fill(p.ko, V, 'ko', 'html') + '</p><button type="button" class="ed-copy" data-copy-i="' + i + '" data-copy-lang="ko"><i class="fa-regular fa-copy" aria-hidden="true"></i> 국문 복사</button></div>' +
                '</article>';
        }).join('');
    }

    /* ───────── 생성·출력 ───────── */
    var generated = false, lastCtx = null;
    var agree1 = $('cbAgree1'), agree2 = $('cbAgree2'), genBtn = $('cbGen');
    function errorsOf(ctx) { return ctx.k.warns.filter(function (w) { return w.lv === 'error' && (!w.docs || w.docs.indexOf(ctx.s.doc) >= 0); }); }
    function syncGen(ctx) {
        var ok = agree1.checked && agree2.checked;
        genBtn.disabled = !ok;
        var errs = errorsOf(ctx);
        var msg = '';
        if (errs.length) msg = '입력 오류 ' + errs.length + '건을 고쳐야 초안을 만들 수 있습니다(‘조건·서류 점검’ 참고).';
        else if (!ok && generated) msg = '두 가지 확인에 모두 체크해야 초안이 보입니다.';
        $('cbGenMsg').textContent = msg;
        var show = generated && ok && !errs.length;
        $('cbOut').hidden = !show;
        if (show) {
            var lg = ctx.s.lang || 'both', doc = $('cbDoc');
            doc.innerHTML = renderDoc(ctx.s.doc, ctx, 'html', null);
            doc.setAttribute('lang', lg === 'ko' ? 'ko' : 'en');
            $('dbOutName').textContent = DOCS[ctx.s.doc].ko;
            Array.prototype.forEach.call(document.querySelectorAll('[data-out-lang]'), function (b) {
                var on = b.getAttribute('data-out-lang') === lg;
                b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            var wm = document.querySelector('.cb-print-wm'), ft = document.querySelector('.cb-print-foot');
            if (wm) wm.textContent = lg === 'en' ? 'DRAFT' : '초안 DRAFT';
            if (ft) ft.textContent = lg === 'en' ? FOOT_EN : FOOT_KO;
            // 영문만인데 입력값에 한글이 있으면 알려 준다(바이어에게 보낼 서류에 한글이 섞이지 않게). 6종 모두 살핀다.
            var hn = $('cbHangul');
            if (hn) {
                var hits = lg === 'en' ? (DOC_KEYS.map(function (x) { return renderDoc(x, ctx, 'text', null); }).join('\n').match(/[\u3131-\u318E\uAC00-\uD7A3]+/g) || []) : [];
                hn.hidden = !hits.length;
                hn.textContent = hits.length ? '영문 초안(6종 서류 기준)에 한글 입력값이 ' + hits.length + '곳 남아 있습니다(예: ' + hits.filter(function (w, i) { return hits.indexOf(w) === i; }).slice(0, 3).join(', ') + '). 위 입력 칸을 영문으로 고치세요.' : '';
            }
        }
        if (!pick.hidden) renderPickStatus(ctx);
    }
    // '초안 만들기' → 만들 서류부터 고른다
    var pick = $('dbPick');
    function openPick(scroll) {
        pick.hidden = false;
        genBtn.setAttribute('aria-expanded', 'true');
        $('dbPickMsg').textContent = '';
        if (lastCtx) renderPickStatus(lastCtx);
        if (scroll) pick.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
        $('dbPickT').focus({ preventScroll: !!scroll });
    }
    function renderPickStatus(ctx) {
        Array.prototype.forEach.call(pick.querySelectorAll('[data-st]'), function (el) {
            var d = el.getAttribute('data-st'), c = { n: 0 };
            renderDoc(d, ctx, 'text', c);
            var errs = ctx.k.warns.filter(function (w) { return w.lv === 'error' && (!w.docs || w.docs.indexOf(d) >= 0); }).length;
            el.className = 'db-pk-st ' + (errs ? 'is-err' : c.n ? 'is-blank' : 'is-ok');
            el.textContent = errs ? '입력 오류 ' + errs + '건' : c.n ? '빈칸 ' + c.n + '곳' : '빈칸 없음';
        });
        Array.prototype.forEach.call(pick.querySelectorAll('[data-pick]'), function (b) {
            var on = generated && b.getAttribute('data-pick') === ctx.s.doc;
            b.classList.toggle('is-on', on);
            if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
        });
    }
    // 오류 안내는 목록 아래에 뜨므로(휴대폰에서는 화면 밖) 그 자리로 옮겨 보여 준다
    function showPickMsg() { $('dbPickMsg').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' }); }
    genBtn.addEventListener('click', function () {
        if (!lastCtx) return;
        openPick(true);
    });
    $('dbRepick').addEventListener('click', function () { openPick(true); });
    pick.addEventListener('click', function (e) {
        var b = e.target.closest('[data-pick]');
        if (!b || !lastCtx) return;
        var d = b.getAttribute('data-pick');
        if (d === 'contract') { $('dbToContract').click(); return; }
        if (d === 'all') {
            var bad = DOC_KEYS.filter(function (x) { return lastCtx.k.warns.some(function (w) { return w.lv === 'error' && (!w.docs || w.docs.indexOf(x) >= 0); }); });
            if (bad.length) { $('dbPickMsg').textContent = '입력 오류가 있는 서류(' + bad.map(function (x) { return DOCS[x].short; }).join('·') + ')가 있어 한 파일로 묶을 수 없습니다. ‘조건·서류 점검’에서 고친 뒤 다시 누르세요.'; showPickMsg(); return; }
            saveDocx('export-documents-DRAFT-' + fileStamp(), DOC_KEYS, 'Export documents DRAFT');
            track('doc_draft_export', { format: 'all', doc_type: 'all' });
            $('dbPickMsg').textContent = '6종을 한 Word 파일로 내려받았습니다. 파일은 참고용 초안입니다.';
            return;
        }
        selectDoc(d);   // 서류를 바꾸고 다시 계산(입력값은 그대로)
        if (errorsOf(lastCtx).length) {
            $('dbPickMsg').textContent = DOCS[d].short + ' 초안에 입력 오류 ' + errorsOf(lastCtx).length + '건이 있습니다. ‘조건·서류 점검’에서 고친 뒤 다시 고르세요.';
            renderPickStatus(lastCtx);
            showPickMsg();
            return;
        }
        generated = true;
        pick.hidden = true;
        genBtn.setAttribute('aria-expanded', 'false');
        syncGen(lastCtx);
        track('doc_draft_generate', { doc_type: d, doc_lang: lastCtx.s.lang });
        $('cbOut').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    });
    [agree1, agree2].forEach(function (c) { c.addEventListener('change', function () {
        if (!lastCtx) return;
        syncGen(lastCtx);
        if (!(agree1.checked && agree2.checked)) { pick.hidden = true; genBtn.setAttribute('aria-expanded', 'false'); }
    }); });

    function copyText(text, btn) {
        function done() {
            if (!btn) return;
            var old = btn.innerHTML;
            btn.classList.add('is-done');
            btn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> 복사했습니다';
            setTimeout(function () { btn.classList.remove('is-done'); btn.innerHTML = old; }, 1600);
        }
        function fallback() {
            var ta = document.createElement('textarea');
            ta.value = text; ta.setAttribute('readonly', ''); ta.className = 'ed-sr';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); done(); } catch (e) { /* 무시 */ }
            ta.remove();
        }
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
        else fallback();
    }
    $('dbPhrases').addEventListener('click', function (e) {
        var b = e.target.closest('[data-copy-i]');
        if (!b || !lastCtx) return;
        var p = lastCtx.phrases[+b.getAttribute('data-copy-i')];
        var lang = b.getAttribute('data-copy-lang');
        copyText(fill(p[lang], lastCtx.V, lang, 'text') + COPY_NOTE, b);
    });

    function fileStamp() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()); }
    function download(name, mime, content) {
        var blob = new Blob([content], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = name; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }
    function saveDocx(name, keys, title) { // 진짜 Word(.docx) — 휴대폰 뷰어에서도 열린다. 영문만이면 꼬리말·첫머리 표시도 영문
        var en = lastCtx.s.lang === 'en';
        download(name + '.docx', window.DocxExport.MIME, window.DocxExport.build(keys.map(function (x) { return renderDoc(x, lastCtx, 'html', null); }), { title: title, footer: en ? FOOT_EN : FOOT_KO, stamp: en ? 'DRAFT' : '초안 DRAFT' }));
    }
    // 출력 언어 바꾸기: 1단계 '초안 언어'(#cbLang)와 같은 값을 쓴다
    document.querySelector('.cb-langbar').addEventListener('click', function (e) {
        var lb = e.target.closest('[data-out-lang]');
        if (!lb) return;
        var sel = $('cbLang');
        sel.value = lb.getAttribute('data-out-lang');
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        track('doc_draft_lang', { doc_lang: sel.value });
    });
    document.querySelector('.cb-tools').addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b || !lastCtx) return;
        var act = b.getAttribute('data-act'), d = lastCtx.s.doc, name = DOCS[d].file + '-DRAFT-' + fileStamp();
        if (act === 'copy') copyText(renderDoc(d, lastCtx, 'text', null), b);
        else if (act === 'txt') download(name + '.txt', 'text/plain;charset=utf-8', '﻿' + renderDoc(d, lastCtx, 'text', null).replace(/\n/g, '\r\n'));
        else if (act === 'doc') saveDocx(name, [d], DOCS[d].en + ' DRAFT');
        else if (act === 'all') saveDocx('export-documents-DRAFT-' + fileStamp(), DOC_KEYS, 'Export documents DRAFT');
        else if (act === 'print') window.print();
        track('doc_draft_export', { format: act, doc_type: act === 'all' ? 'all' : d });
    });

    /* ───────── 계약서 작성기로 이어 쓰기 ───────── */
    var HANDOFF = ['lang', 'seller', 'sellerAddr', 'sellerCountry', 'sellerRep', 'buyer', 'buyerAddr', 'buyerCountry', 'buyerRep', 'cur', 'tol', 'incoterm', 'place', 'mode', 'pol', 'pod',
        'shipBy', 'shipDate', 'shipDays', 'partial', 'trans', 'marks', 'cover', 'pay', 'adv', 'advDays', 'balDays', 'etaDays', 'oaDays', 'daDays', 'lcDays', 'charges', 'fraud', 'beneficiary', 'bank', 'swift', 'bankAddr', 'account'];
    document.addEventListener('click', function (e) {
        var a = e.target.closest('#dbToContract, [data-handoff]');
        if (!a) return;
        var s = readState(), o = { v: 1, f: {}, items: [] };
        HANDOFF.forEach(function (k) { if (s[k] !== undefined && s[k] !== '') o.f[k] = s[k]; });
        o.items = s.items.filter(function (it) { return it.desc || it.qty || it.price; }).map(function (it) { return { desc: it.desc, qty: it.qty, unit: it.unit, price: it.price }; });
        try { sessionStorage.setItem('cbHandoff', JSON.stringify(o)); } catch (err) { /* 저장 못 하면 빈 작성기로 이동 */ }
        track('doc_to_contract', {});
    });

    /* ───────── 갱신 ───────── */
    var timer = null;
    function schedule() { clearTimeout(timer); timer = setTimeout(update, 120); }
    function update() {
        var s = readState();
        syncShows(s);
        var k = compute(s);
        var V = values(s, k);
        var ctx = { s: s, k: k, V: V };
        lastCtx = ctx;
        var cnt = { n: 0 };
        renderDoc(s.doc, ctx, 'text', cnt);
        $('dbTotal').textContent = k.total != null ? k.cur + ' ' + fmtMoney(k.total, k.cur) : '-';
        $('dbShipTotal').textContent = k.shipTotal != null ? k.cur + ' ' + fmtMoney(k.shipTotal, k.cur) : '-';
        $('dbPack').textContent = k.pk.any ? k.pk.n + ' ' + (s.pkg || 'CTNS') + (k.pk.nwOk ? ' · N.W. ' + fmtW(k.pk.nw) + 'kg' : '') + (k.pk.gwOk ? ' · G.W. ' + fmtW(k.pk.gw) + 'kg' : '') + (k.pk.cbmOk ? ' · ' + fmtCbm(k.pk.cbm) + ' CBM' : '') : '-';
        renderFlow(s, k);
        renderSide(ctx, cnt.n);
        renderNeed(ctx);
        renderPhrases(ctx);
        syncGen(ctx);
    }
    form.addEventListener('input', schedule);
    form.addEventListener('change', function (e) {
        if (e.target.name === 'incoterm') {
            var v = e.target.value;
            if (v === 'CIF') form.elements.cover.value = 'C';
            if (v === 'CIP') form.elements.cover.value = 'A';
        }
        if (e.target.name === 'doc') { update(); return; }
        schedule();
    });

    // 처음 상태: 오늘 날짜, 품목 1줄, ?doc= 로 서류 고르기
    try {
        var t = new Date(), pz = function (n) { return (n < 10 ? '0' : '') + n; };
        var today = t.getFullYear() + '-' + pz(t.getMonth() + 1) + '-' + pz(t.getDate());
        form.elements.offerDate.value = today;
    } catch (e) { /* 무시 */ }
    addItem();
    try {
        var q = new URLSearchParams(location.search).get('doc');
        if (q && DOCS[q]) Array.prototype.forEach.call(form.elements.doc, function (x) { x.checked = x.value === q; });
    } catch (e) { /* 무시 */ }
    goStep(1, false);
    update();
})();
