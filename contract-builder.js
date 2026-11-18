/* 계약서 초안 작성기 (contract-builder.html)
   - 조건 입력(7단계) → 조건에 맞는 조항 추천 → 한·영 계약서 초안(참고용) 생성
   - 규칙 기반 정적 구현: 서버·API 호출 없음. 입력값은 이 페이지의 메모리에만 있고 어디에도 보내거나 저장하지 않는다.
   - 조항 문구는 contract-clauses.js(window.CB_LIB)에 있다. 문구 수정은 그 파일에서 한다.
   - 구글 애널리틱스에는 '초안 생성·내려받기 형식'만 보내고 입력 내용은 보내지 않는다. */
(function () {
    'use strict';

    var LIB = window.CB_LIB;
    var form = document.getElementById('cbForm');
    if (!LIB || !form) return;
    var PH = LIB.PH, MODE = LIB.MODE, C = LIB.C;

    var SITE = 'www.littlestar.co.kr/contract-builder.html';
    var COPY_NOTE = '\n\n※ 참고용 예시 문구(초안)입니다. 법률 자문이 아니며, 사용 전 전문가 확인이 필요합니다. (출처: ' + SITE + ')';
    var DOC_HEAD_KO = '초안 DRAFT · 참고용 · 법률 자문 아님';
    var DOC_WARN = '이 문서는 입력한 조건에 맞춰 예시 조항을 자동으로 조합한 참고용 계약서 초안입니다. 완성된 계약서가 아니며 법률 자문이 아닙니다. 서명·사용 전에 반드시 변호사 등 전문가 검토를 받으세요. [ ] 표시는 채워야 할 빈칸, 【확인 필요】 표시는 효력이 나라·사안마다 달라 확실하지 않은 조항입니다.';
    var DOC_WARN_END = '이 초안은 참고용이며, 거래에 맞게 고치고 전문가 검토를 받은 뒤에만 사용하세요. 이 초안을 그대로 써서 생긴 손해에 대해 사이트 운영자는 책임을 지지 않습니다(이 문장의 효력 범위도 나라·사안에 따라 다를 수 있습니다).';

    var SEA_ONLY = ['FAS', 'FOB', 'CFR', 'CIF'];
    var F_TERMS = ['EXW', 'FCA', 'FAS', 'FOB'];
    var C_TERMS = ['CPT', 'CIP', 'CFR', 'CIF'];
    var D_TERMS = ['DAP', 'DPU', 'DDP'];
    var NO_DEC = ['KRW', 'JPY'];
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var KR_CITY = { seoul: '서울', busan: '부산', incheon: '인천', daegu: '대구', daejeon: '대전', gwangju: '광주', ulsan: '울산' };
    var STEP_OF = { seller: 1, buyer: 1, date: 1, items: 2, tol: 2, place: 3, shipDate: 3, incoterm: 3, mode: 3, shipBy: 3, adv: 4, pay: 4, release: 4, interest: 4, fraud: 5, beneficiary: 5, seat: 7, law: 7, dispute: 7, cisg: 7, compactExtras: 6 };

    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function track(name, params) { try { if (typeof gtag === 'function') gtag('event', name, params); } catch (e) { /* 무시 */ } }
    function reduceMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    function num(v) { if (v === '' || v == null) return NaN; return Number(String(v).replace(/,/g, '')); }

    /* ───────── 품목 줄 ───────── */
    var itemsBox = $('cbItems');
    var itemSeq = 0;
    var UNITS = ['PCS', 'SETS', 'CTNS', 'KG', 'MT', 'M', 'L'];
    function addItem() {
        if (itemsBox.children.length >= 20) return;
        itemSeq += 1;
        var id = 'cbI' + itemSeq;
        var row = document.createElement('div');
        row.className = 'cb-item';
        row.innerHTML =
            '<div class="cb-field cb-f-desc"><label class="cb-label" for="' + id + 'd">품명·규격(영문)</label><input type="text" id="' + id + 'd" data-f="desc" placeholder="예: Stainless pot set, Model SP-20"></div>' +
            '<div class="cb-field"><label class="cb-label" for="' + id + 'q">수량</label><input type="number" id="' + id + 'q" data-f="qty" min="0" step="any" inputmode="decimal"></div>' +
            '<div class="cb-field"><label class="cb-label" for="' + id + 'u">단위</label><select id="' + id + 'u" data-f="unit">' + UNITS.map(function (u) { return '<option>' + u + '</option>'; }).join('') + '</select></div>' +
            '<div class="cb-field"><label class="cb-label" for="' + id + 'p">단가</label><input type="number" id="' + id + 'p" data-f="price" min="0" step="any" inputmode="decimal"></div>' +
            '<button type="button" class="cb-item-del" aria-label="이 품목 삭제"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>' +
            '<p class="cb-item-amt" aria-live="polite"></p>';
        itemsBox.appendChild(row);
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
    function readState() {
        var s = {};
        Array.prototype.forEach.call(form.elements, function (el) {
            if (!el.name) return;
            if (el.type === 'radio') { if (el.checked) s[el.name] = el.value; }
            else if (el.type === 'checkbox') s[el.name] = el.checked;
            else s[el.name] = (el.value || '').trim();
        });
        s.items = Array.prototype.map.call(itemsBox.children, function (row) {
            var g = function (f) { var el = row.querySelector('[data-f="' + f + '"]'); return el ? el.value.trim() : ''; };
            return { row: row, desc: g('desc'), qty: g('qty'), unit: g('unit'), price: g('price') };
        });
        return s;
    }

    /* ───────── 형식 ───────── */
    function fmtDate(iso, lang) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
        if (!m) return '';
        var y = +m[1], mo = +m[2], d = +m[3];
        return lang === 'ko' ? y + '년 ' + mo + '월 ' + d + '일' : d + ' ' + MONTHS[mo - 1] + ' ' + y;
    }
    function decOf(cur) { return NO_DEC.indexOf(cur) >= 0 ? 0 : 2; }
    function fmtMoney(minor, cur) {
        var d = decOf(cur);
        return (minor / Math.pow(10, d)).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    }
    function fmtNum(n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 4 }); }

    /* ───────── 계산·검증 ───────── */
    function compute(s) {
        var warns = [];
        function W(lv, msg, field) { warns.push({ lv: lv, msg: msg, field: field }); }
        var cur = s.cur || 'USD', d = decOf(cur), scale = Math.pow(10, d);

        // 품목
        var total = 0, filled = 0;
        s.items.forEach(function (it) {
            var q = num(it.qty), p = num(it.price);
            var badQ = it.qty !== '' && !(q > 0), badP = it.price !== '' && !(p >= 0);
            it.row.querySelector('[data-f="qty"]').setAttribute('aria-invalid', badQ ? 'true' : 'false');
            it.row.querySelector('[data-f="price"]').setAttribute('aria-invalid', badP ? 'true' : 'false');
            if (badQ || badP) W('error', '품목의 수량·단가에 0보다 큰 숫자를 넣어 주세요.', 'items');
            it.ok = q > 0 && p >= 0 && !badQ && !badP;
            it.minor = it.ok ? Math.round(Number((q * p * scale).toFixed(6))) : null;
            if (it.ok) { total += it.minor; filled += 1; }
            var amt = it.row.querySelector('.cb-item-amt');
            amt.textContent = it.ok ? '금액: ' + cur + ' ' + fmtMoney(it.minor, cur) : '';
        });
        var hasTotal = filled > 0;
        if (!hasTotal) W('warn', '품목 수량·단가가 비어 있어 금액이 [ ]로 남습니다.', 'items');
        else if (filled < s.items.filter(function (it) { return it.desc || it.qty || it.price; }).length) W('warn', '수량·단가가 빠진 품목 줄은 합계에서 빠졌습니다.', 'items');

        // 선금
        var payHasAdv = ['adv_copybl', 'adv_eta', 'adv_ship', 'adv_oa'].indexOf(s.pay) >= 0;
        var adv = num(s.adv);
        var advInput = $('cbAdv');
        var advBad = payHasAdv && !(adv >= 1 && adv <= 99 && Math.round(adv) === adv);
        advInput.setAttribute('aria-invalid', advBad ? 'true' : 'false');
        if (advBad) W('error', '선금 비율은 1~99 사이의 정수(%)로 넣어 주세요.', 'adv');
        var advMinor = hasTotal && payHasAdv && !advBad ? Math.round(total * adv / 100) : null;

        // 날짜
        var shipBad = s.shipBy === 'date' && s.shipDate && s.date && s.shipDate < s.date;
        $('cbShipDate').setAttribute('aria-invalid', shipBad ? 'true' : 'false');
        if (shipBad) W('error', '최종 선적일이 계약일보다 앞섭니다.', 'shipDate');

        // 숫자 칸(음수 등)
        ['tol', 'shipDays', 'advDays', 'balDays', 'etaDays', 'oaDays', 'daDays', 'lcDays', 'interest', 'defaultDays', 'claimDays', 'fmDays', 'fmTerm', 'warrMonths', 'ldRate', 'ldCap', 'confYears', 'inspNotice'].forEach(function (k) {
            var el = form.elements[k];
            if (!el) return;
            var v = num(s[k]);
            var bad = s[k] !== '' && !(v >= 0);
            if (k !== 'adv') el.setAttribute('aria-invalid', bad ? 'true' : 'false');
            if (bad) W('error', '‘' + (el.labels && el.labels[0] ? el.labels[0].textContent.replace(/\s+/g, ' ').trim() : k) + '’ 칸에는 0 이상의 숫자를 넣어 주세요.', k);
        });

        return { warns: warns, cur: cur, total: hasTotal ? total : null, advMinor: advMinor, adv: advBad ? NaN : adv, payHasAdv: payHasAdv };
    }

    /* ───────── 값 묶음(V) ───────── */
    function values(s, k) {
        var mode = MODE[s.mode] || MODE.sea;
        var lawStr = s.law === 'kr' ? { en: 'the Republic of Korea', ko: '대한민국' } : s.law === 'buyer' ? s.buyerCountry : s.lawOther;
        var seatKey = (s.seat || '').toLowerCase();
        var V = {
            no: s.no, date: { en: fmtDate(s.date, 'en'), ko: fmtDate(s.date, 'ko') },
            seller: s.seller, sellerAddr: s.sellerAddr, sellerCountry: s.sellerCountry, sellerRep: s.sellerRep,
            buyer: s.buyer, buyerAddr: s.buyerAddr, buyerCountry: s.buyerCountry, buyerRep: s.buyerRep,
            cur: k.cur, total: k.total != null ? fmtMoney(k.total, k.cur) : '',
            incoterm: s.incoterm, place: s.place, pol: s.pol, pod: s.pod,
            mode: mode.en, modeKo: mode.ko, docEn: mode.doc, docKo: mode.docKo,
            shipDate: { en: fmtDate(s.shipDate, 'en'), ko: fmtDate(s.shipDate, 'ko') }, shipDays: s.shipDays,
            partialEn: s.partial === 'yes' ? 'allowed' : 'not allowed', partialKo: s.partial === 'yes' ? '허용하고' : '허용하지 않으며',
            transEn: s.trans === 'yes' ? 'allowed' : 'not allowed', transKo: s.trans === 'yes' ? '허용한다' : '허용하지 않는다',
            marks: s.marks, tol: s.tol, cover: s.cover,
            adv: k.payHasAdv && !isNaN(k.adv) ? String(k.adv) : '', bal: k.payHasAdv && !isNaN(k.adv) ? String(100 - k.adv) : '',
            advAmt: k.advMinor != null ? fmtMoney(k.advMinor, k.cur) : '', balAmt: k.advMinor != null ? fmtMoney(k.total - k.advMinor, k.cur) : '',
            advDays: s.advDays, balDays: s.balDays, etaDays: s.etaDays, oaDays: s.oaDays, daDays: s.daDays, lcDays: s.lcDays,
            interest: s.interest, defaultDays: s.defaultDays,
            inspNotice: s.inspNotice, inspector: s.inspector, claimDays: s.claimDays, warrMonths: s.warrMonths,
            ldRate: s.ldRate, ldCap: s.ldCap, fmDays: s.fmDays, fmTerm: s.fmTerm, confYears: s.confYears,
            beneficiary: s.beneficiary, bank: s.bank, bankAddr: s.bankAddr, swift: s.swift, account: s.account,
            law: lawStr, lawKo: lawStr,
            seat: s.seat, seatKo: KR_CITY[seatKey] || s.seat,
            arbNum: { en: s.arbN === '3' ? 'three' : 'one', ko: s.arbN === '3' ? '3' : '1' },
            arbWho: s.arbN === '3' ? 'three arbitrators' : 'a sole arbitrator',
            arbLang: 'English', arbLangKo: '영어'
        };
        return V;
    }

    /* 템플릿 채우기: out = 'html' | 'text'. 빈 값은 [자리표시]로. counter는 빈칸 수를 센다. */
    function fill(tpl, V, lang, out, counter) {
        var re = /\{(\w+)\}/g, res = '', last = 0, m;
        while ((m = re.exec(tpl))) {
            var lit = tpl.slice(last, m.index);
            res += out === 'html' ? esc(lit) : lit;
            var k = m[1], v = V[k];
            if (v && typeof v === 'object') v = v[lang];
            if (v === undefined || v === null || v === '') {
                var ph = PH[k] ? PH[k][lang === 'en' ? 0 : 1] : '[ ]';
                var isBlank = ph.charAt(0) === '[';
                if (isBlank && counter) counter.n += 1;
                res += out === 'html' && isBlank ? '<mark class="cb-ph">' + esc(ph) + '</mark>' : (out === 'html' ? esc(ph) : ph);
            } else {
                res += out === 'html' ? esc(v) : v;
            }
            last = re.lastIndex;
        }
        var tail = tpl.slice(last);
        return res + (out === 'html' ? esc(tail) : tail);
    }

    /* ───────── 조항 조립 ───────── */
    function build(s, k) {
        var W = function (lv, msg, field) { k.warns.push({ lv: lv, msg: msg, field: field }); };
        var full = s.docType !== 'compact';
        var inc = s.incoterm, pay = s.pay;
        var arts = [];
        function add(key, obj, paras, extra) {
            var a = { key: key, titleEn: obj.titleEn, titleKo: obj.titleKo, why: obj.why, check: !!obj.check, note: obj.note || '', paras: paras };
            if (extra) for (var x in extra) a[x] = extra[x];
            arts.push(a);
        }
        function P(en, ko) { return { en: en, ko: ko }; }

        // 물품
        var gp = [P(C.goods.en, C.goods.ko), { items: true }, P(C.goods.totalEn, C.goods.totalKo)];
        if (num(s.tol) > 0) gp.push(P(C.goods.tolEn, C.goods.tolKo));
        add('goods', C.goods, gp);

        // 인도조건
        var dp = [P(C.delivery.en, C.delivery.ko)];
        if (inc === 'EXW') dp.push(P(C.delivery.exwEn, C.delivery.exwKo));
        if (inc === 'DDP') dp.push(P(C.delivery.ddpEn, C.delivery.ddpKo));
        add('delivery', C.delivery, dp, inc === 'DDP' ? { check: true, note: 'DDP는 수입국의 관세·부가가치세 등을 매도인이 부담하는 조건입니다. 수입국 세금·통관 규정과 등록 요건을 확인해야 하며, 금액이 확실하지 않습니다.' } : null);

        // 선적
        var sb = { date: ['byDateEn', 'byDateKo'], afterAdv: ['afterAdvEn', 'afterAdvKo'], afterSign: ['afterSignEn', 'afterSignKo'], afterLc: ['afterLcEn', 'afterLcKo'] }[s.shipBy] || ['byDateEn', 'byDateKo'];
        var sp = [P(C.shipment[sb[0]], C.shipment[sb[1]])];
        if (full) sp.push(P(C.shipment.restEn, C.shipment.restKo));
        else sp.push(P('Partial shipments are {partialEn}. Transshipment is {transEn}.', '분할선적은 {partialKo}, 환적은 {transKo}.'));
        add('shipment', C.shipment, sp);

        // 포장(정식만)
        if (full) add('packing', C.packing, [P(C.packing.en, C.packing.ko)]);

        // 보험
        if (inc === 'CIF' || inc === 'CIP') add('insurance', C.insurance, [P(C.insurance.sellerEn, C.insurance.sellerKo)]);
        else if (full && D_TERMS.indexOf(inc) >= 0) add('insurance', C.insurance, [P(C.insurance.dEn, C.insurance.dKo)]);
        else if (full) add('insurance', C.insurance, [P(C.insurance.buyerEn, C.insurance.buyerKo)]);

        // 결제
        var M = C.payment.methods[pay] || C.payment.methods.adv_copybl;
        var pp = [P(M.en, M.ko)];
        pp.push(s.charges === 'sha' ? P(C.payment.chargesShaEn, C.payment.chargesShaKo) : P(C.payment.chargesBuyerEn, C.payment.chargesBuyerKo));
        var relFits = ['adv_copybl', 'adv_eta'].indexOf(pay) >= 0;
        var relOn = s.release && relFits && s.mode === 'sea';
        if (relOn) pp.push(P(C.payment.releaseEn, C.payment.releaseKo));
        if (pay !== 'lc') {
            pp.push(P(C.payment.interestEn, C.payment.interestKo));
            pp.push(P(C.payment.defaultEn, C.payment.defaultKo));
        }
        add('payment', C.payment, pp, pay !== 'lc' ? { note: C.payment.defaultNote, check: true } : null);

        // 계좌·사기 경고
        var bp = [P(C.bank.accountEn, C.bank.accountKo)];
        if (s.fraud) bp.push(P(C.bank.noticeEn, C.bank.noticeKo));
        add('bank', s.fraud ? C.bank : { titleEn: C.bank.titleEnPlain, titleKo: C.bank.titleKoPlain, why: '대금을 받을 계좌를 계약서에 처음부터 적어 둡니다.' }, bp, s.fraud ? { key2: 'fraud' } : null);

        // 소유권 유보
        if (s.title) add('title', C.title, [P(C.title.en, C.title.ko)]);

        // 검사(정식만)
        if (full) {
            var iv = C.inspection.variants[s.insp] || C.inspection.variants.seller;
            add('inspection', C.inspection, [P(iv.en, iv.ko)]);
        }
        var extras = full || s.compactExtras;
        if (extras) {
            var cp = [P(C.claims.en, C.claims.ko)];
            if (full && s.warranty) cp.push(P(C.claims.warrEn, C.claims.warrKo));
            add('claims', C.claims, cp);
        }
        if (full && s.warranty) add('warranty', C.warranty, [P(C.warranty.en, C.warranty.ko)], { optional: true });
        if (full && s.liability) add('liability', C.liability, [P(C.liability.en, C.liability.ko)], { optional: true });
        if (full && s.ld) add('ld', C.ld, [P(C.ld.en, C.ld.ko)], { optional: true });
        if (extras) add('fm', C.fm, [P(C.fm.en, C.fm.ko)]);
        if (full && s.ip) add('ip', C.ip, [P(C.ip.en, C.ip.ko)], { optional: true });
        if (full && s.conf) add('conf', C.conf, [P(C.conf.en, C.conf.ko)], { optional: true });

        if (extras) {
            var lp = [P(C.law.en, C.law.ko)];
            if (s.cisg === 'apply') lp = [P(C.law.cisgApplyEn, C.law.cisgApplyKo)];
            if (s.cisg === 'exclude') lp.push(P(C.law.cisgExcludeEn, C.law.cisgExcludeKo));
            add('law', C.law, lp);
            var dv = C.dispute.variants[s.dispute] || C.dispute.variants.kcab;
            var ddp = [];
            if (s.amicable) ddp.push(P(C.dispute.amicableEn, C.dispute.amicableKo));
            ddp.push(P(dv.en, dv.ko));
            add('dispute', C.dispute, ddp);
        }
        if (full && s.general) add('general', C.general, [P(C.general.en, C.general.ko)]);
        if (full && s.lang !== 'ko') add('language', C.language, [P(C.language.en, C.language.ko)]);

        /* ── 조건 사이 불일치·주의 안내 ── */
        var isSeaOnly = SEA_ONLY.indexOf(inc) >= 0;
        if (isSeaOnly && s.mode !== 'sea') W('warn', inc + '는 해상·내수로 운송 전용 규칙입니다. ' + (s.mode === 'air' ? '항공' : '육상·복합') + ' 운송이면 ' + ({ FAS: 'FCA', FOB: 'FCA', CFR: 'CPT', CIF: 'CIP' }[inc]) + ' 같은 ‘모든 운송 방식’ 규칙을 검토하세요.', 'incoterm');
        else if (isSeaOnly && inc !== 'FAS') W('info', '컨테이너 화물이면 ' + inc + ' 대신 ' + ({ FOB: 'FCA', CFR: 'CPT', CIF: 'CIP' }[inc]) + '가 더 맞을 수 있습니다(물품을 본선 적재 전에 운송인에게 넘기므로). Incoterms® 2020 안내에 있는 내용입니다.', 'incoterm');
        if (inc === 'EXW') W('info', 'EXW는 원칙적으로 바이어가 한국 수출통관을 하는 조건이라 실무에서 어려움이 생기기 쉽습니다. 매도인이 통관을 돕는다는 문장을 넣었고, FCA도 검토할 만합니다.', 'incoterm');
        if (inc === 'DDP') W('warn', 'DDP는 바이어 나라의 관세·부가세·통관을 매도인이 책임지는 조건입니다. 그 나라 세금과 수입자 등록 요건을 먼저 확인하세요.', 'incoterm');
        if (inc === 'DPU') W('info', 'DPU는 매도인이 목적지에서 물품을 내려 주는 것까지 책임지는 조건입니다(양하 비용·위험 매도인).', 'incoterm');
        if (inc === 'CIP' && s.cover !== 'A') W('info', 'Incoterms® 2020의 CIP 기본 부보 조건은 ICC(A)입니다. 더 낮은 조건으로 하려면 지금처럼 계약서에 분명히 적어야 합니다.', 'incoterm');
        if (!s.place) W('warn', '인코텀즈 지정 장소가 비어 있습니다. 장소 없는 “FOB”, “CIF”는 비용·위험이 넘어가는 곳이 불분명해지는 흔한 실수입니다.', 'place');
        var low = function (x) { return (x || '').toLowerCase().replace(/\s+/g, ' ').trim(); };
        if (s.place && F_TERMS.indexOf(inc) >= 0 && inc !== 'EXW' && low(s.place) === low(s.pod)) W('warn', inc + '의 지정 장소는 출발 쪽(선적항·인도 장소)입니다. 지금 도착항과 같게 적혀 있습니다.', 'place');
        if (s.place && (C_TERMS.indexOf(inc) >= 0 || D_TERMS.indexOf(inc) >= 0) && low(s.place) === low(s.pol)) W('warn', inc + '의 지정 장소는 도착 쪽(목적항·목적지)입니다. 지금 선적항과 같게 적혀 있습니다.', 'place');

        if (s.release && (pay === 'oa' || pay === 'adv_oa')) W('warn', '외상(선적 후 N일) 조건은 바이어가 물건을 찾은 뒤 대금을 내는 구조라 ‘B/L 원본은 완납 뒤 인도’와 함께 쓸 수 없습니다. 이 문장은 초안에서 뺐습니다.', 'release');
        else if (s.release && relFits && s.mode !== 'sea') W('warn', (s.mode === 'air' ? '항공화물운송장(AWB)은' : '육상·복합 운송서류는') + ' 보통 권리증권이 아니어서, 원본을 갖고 있어도 수하인으로 적힌 바이어가 물건을 찾을 수 있습니다. ‘원본 인도’ 문장은 초안에서 뺐습니다. 잔금을 선적 전에 받는 방식도 검토하세요.', 'release');
        else if (s.release && !relFits && pay !== 'oa' && pay !== 'adv_oa') W('info', '선택한 결제 방식에서는 ‘B/L 원본은 완납 뒤 인도’ 문장이 필요하지 않아 넣지 않았습니다.', 'release');
        if (relOn) W('info', 'Surrender B/L·해상화물운송장(Sea Waybill)·전자 B/L로 처리하면 ‘B/L 원본 인도’ 방식이 그대로 맞지 않습니다. 선사와 B/L 형태를 먼저 정하세요.', 'release');
        if (pay === 'adv_eta' && s.mode === 'air') W('warn', '항공은 운송 기간이 짧아 ‘도착 예정일 N일 전까지 잔금’ 기한을 맞추기 어렵습니다. ‘선적서류 사본 받고 N일 안’이나 ‘선적 전 잔금’을 검토하세요.', 'pay');
        if (s.shipBy === 'afterAdv' && !k.payHasAdv && pay !== 'full_adv') W('warn', '선금이 없는 결제 방식인데 선적 기한을 ‘선금 받은 날부터’로 정했습니다.', 'shipBy');
        if (s.shipBy === 'afterLc' && pay !== 'lc') W('warn', '신용장 결제가 아닌데 선적 기한을 ‘신용장 받은 날부터’로 정했습니다.', 'shipBy');
        if (pay === 'lc' && s.shipBy !== 'date') W('info', '신용장 조항은 ‘최종 선적일 N일 전까지 신용장 도착’을 전제로 합니다. 선적 기한을 날짜로 정하는 편이 맞습니다.', 'shipBy');
        if (pay !== 'lc' && !s.interest) W('info', '지연이자율이 비어 있어 [ ]로 남습니다. 이자율 상한은 나라마다 다를 수 있습니다.', 'interest');
        if (s.charges === 'sha') W('info', '각자 부담이면 중계은행 수수료만큼 송장 금액보다 적게 입금될 수 있습니다.', 'pay');

        if (!s.fraud) W('warn', '계좌변경 사기 경고 문구를 뺐습니다. 이메일 계좌변경 사기(BEC)에 대비할 근거가 약해집니다.', 'fraud');
        var bankBlank = ['beneficiary', 'bank', 'swift', 'account'].filter(function (x) { return !s[x]; }).length;
        if (bankBlank) W('info', '계좌 정보 ' + bankBlank + '칸이 [ ]로 남습니다. 실제 계좌가 든 초안은 공개된 곳에 올리지 마세요.', 'beneficiary');

        if (!full && !s.compactExtras) W('warn', '간이계약서에 클레임·불가항력·준거법·분쟁해결 조항이 없습니다. 분쟁이 생기면 기준이 없으니, 금액이 크거나 외상 거래라면 정식 계약서를 쓰세요.', 'compactExtras');
        if (extras) {
            if (s.cisg === 'silent') W('info', '한국은 국제물품매매협약(CISG) 체약국입니다. 바이어 나라도 체약국이면 따로 적지 않아도 CISG가 적용될 수 있으니, 적용 여부를 정해 적으면 해석 다툼이 줄어듭니다.', 'cisg');
            if (s.law !== 'kr') W('info', '한국 법이 아닌 준거법을 고르면 조항의 효력을 그 나라 법으로 판단해야 합니다. 그 나라 법에 밝은 전문가 검토가 필요합니다.', 'law');
            if (s.dispute === 'court_kr') W('info', '한국 법원 판결은 바이어 나라에서 그대로 집행되지 않을 수 있습니다. 바이어 나라가 뉴욕협약 가입국이면 중재판정이 집행에 유리한 편입니다(나라별 확인 필요).', 'dispute');
            if (s.dispute === 'court_buyer') W('info', '바이어 나라 법원 소송은 언어·절차·비용 부담이 큽니다.', 'dispute');
            if (s.dispute === 'kcab' && s.seat && !KR_CITY[low(s.seat)]) W('warn', 'KCAB 문구는 중재지를 대한민국 도시로 적습니다(“' + s.seat + ', Korea”). 해외 도시를 중재지로 하려면 문구를 고쳐야 합니다.', 'seat');
        }
        if (full && s.warranty && s.insp === 'seller') W('info', '‘매도인 출고 검사를 최종으로’와 품질보증을 함께 두면 보증 범위를 두고 해석이 엇갈릴 수 있습니다. 출고 검사는 선적 시점의 수량·외관, 보증은 사양 적합성으로 나눠 쓰는지 확인하세요.', 'warranty');
        if (num(s.tol) > 10) W('info', '수량 과부족 허용 폭이 10%를 넘습니다. 바이어와 합의된 숫자인지 확인하세요.', 'tol');

        return arts;
    }

    /* ───────── 그리기 ───────── */
    function itemsHtml(s, k, lang) {
        var hd = lang === 'en' ? ['No.', 'Description', 'Quantity', 'Unit Price', 'Amount'] : ['번호', '품명·규격', '수량', '단가', '금액'];
        var rows = s.items.filter(function (it) { return it.desc || it.ok; });
        var body = rows.length ? rows.map(function (it, i) {
            return '<tr><td>' + (i + 1) + '</td><td>' + (it.desc ? esc(it.desc) : '<mark class="cb-ph">' + (lang === 'en' ? '[Description]' : '[품명·규격]') + '</mark>') + '</td><td class="num">' + (num(it.qty) > 0 ? esc(fmtNum(it.qty) + ' ' + it.unit) : '<mark class="cb-ph">[ ]</mark>') + '</td><td class="num">' + (num(it.price) >= 0 && it.price !== '' ? esc(k.cur + ' ' + fmtNum(it.price)) : '<mark class="cb-ph">[ ]</mark>') + '</td><td class="num">' + (it.ok ? esc(k.cur + ' ' + fmtMoney(it.minor, k.cur)) : '<mark class="cb-ph">[ ]</mark>') + '</td></tr>';
        }).join('') : '<tr><td>1</td><td><mark class="cb-ph">' + (lang === 'en' ? '[Description]' : '[품명·규격]') + '</mark></td><td class="num"><mark class="cb-ph">[ ]</mark></td><td class="num"><mark class="cb-ph">[ ]</mark></td><td class="num"><mark class="cb-ph">[ ]</mark></td></tr>';
        return '<div class="cb-items-wrap"><table class="cb-items-t"><thead><tr><th>' + hd[0] + '</th><th>' + hd[1] + '</th><th class="num">' + hd[2] + '</th><th class="num">' + hd[3] + '</th><th class="num">' + hd[4] + '</th></tr></thead><tbody>' + body + '</tbody></table></div>';
    }
    function itemsText(s, k, lang) {
        var rows = s.items.filter(function (it) { return it.desc || it.ok; });
        if (!rows.length) return (lang === 'en' ? '1. [Description] / Qty [ ] / Unit price [ ] / Amount [ ]' : '1. [품명·규격] / 수량 [ ] / 단가 [ ] / 금액 [ ]');
        return rows.map(function (it, i) {
            var q = num(it.qty) > 0 ? fmtNum(it.qty) + ' ' + it.unit : '[ ]';
            var p = it.price !== '' && num(it.price) >= 0 ? k.cur + ' ' + fmtNum(it.price) : '[ ]';
            var a = it.ok ? k.cur + ' ' + fmtMoney(it.minor, k.cur) : '[ ]';
            return (i + 1) + '. ' + (it.desc || (lang === 'en' ? '[Description]' : '[품명·규격]')) + (lang === 'en' ? ' / Qty ' + q + ' / Unit price ' + p + ' / Amount ' + a : ' / 수량 ' + q + ' / 단가 ' + p + ' / 금액 ' + a);
        }).join('\n');
    }
    function paraOut(p, s, k, V, lang, out, cnt) {
        if (p.items) return out === 'html' ? itemsHtml(s, k, lang) : itemsText(s, k, lang);
        return fill(lang === 'en' ? p.en : p.ko, V, lang, out, cnt);
    }
    function articleText(a, s, k, V, lang) {
        return a.paras.map(function (p) { return paraOut(p, s, k, V, lang, 'text'); }).join('\n');
    }

    var lastModel = null;

    function renderClauses(model) {
        var s = model.s, k = model.k, V = model.V;
        var html = model.arts.map(function (a, i) {
            var badges = (a.check ? ' <span class="cb-badge cb-badge-chk">확인 필요</span>' : '') + (a.optional ? ' <span class="cb-badge cb-badge-opt">선택 조항</span>' : '') + (a.key2 === 'fraud' ? ' <span class="cb-badge cb-badge-key">사기 예방</span>' : '');
            var en = a.paras.map(function (p) { return p.items ? itemsHtml(s, k, 'en') : '<p lang="en">' + fill(p.en, V, 'en', 'html') + '</p>'; }).join('');
            var ko = a.paras.map(function (p) { return p.items ? itemsHtml(s, k, 'ko') : '<p>' + fill(p.ko, V, 'ko', 'html') + '</p>'; }).join('');
            return '<article class="cb-cl' + (a.check ? ' is-chk' : '') + '">' +
                '<h4 class="cb-cl-h"><span class="cb-cl-n">' + (i + 1) + '</span>' + esc(a.titleKo) + ' <em lang="en">' + esc(a.titleEn) + '</em>' + badges + '</h4>' +
                '<p class="cb-cl-why"><i class="fa-solid fa-lightbulb" aria-hidden="true"></i>' + esc(a.why || '') + '</p>' +
                '<div class="cb-cl-txt"><span class="cb-cl-lang">영문</span>' + en + '<button type="button" class="ed-copy" data-copy-i="' + i + '" data-copy-lang="en"><i class="fa-regular fa-copy" aria-hidden="true"></i> 영문 복사</button></div>' +
                '<div class="cb-cl-txt"><span class="cb-cl-lang">국문(참고 번역)</span>' + ko + '<button type="button" class="ed-copy" data-copy-i="' + i + '" data-copy-lang="ko"><i class="fa-regular fa-copy" aria-hidden="true"></i> 국문 복사</button></div>' +
                (a.note ? '<p class="cb-cl-note"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>' + esc(a.note) + '</p>' : '') +
                '</article>';
        }).join('');
        $('cbClauses').innerHTML = html;
    }

    function nowStamp() {
        var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }

    /* 초안 전체: out = 'html' | 'text' */
    function renderDoc(model, out, cnt) {
        var s = model.s, k = model.k, V = model.V, lang = s.lang || 'both';
        var compact = s.docType === 'compact';
        var showEn = lang !== 'ko', showKo = lang !== 'en';
        var H = out === 'html';
        var stamp = nowStamp();
        var titleEn = compact ? 'SALES CONTRACT (COMPACT FORM)' : 'SALES CONTRACT';
        var titleKo = compact ? '간이 물품매매계약서' : '물품매매계약서';
        var noLine = (showEn ? 'Contract No.: ' : '계약번호: ') + fill('{no}', V, showEn ? 'en' : 'ko', out, cnt);
        var esc0 = function (x) { return x; };
        var L = showEn && showKo ? { s: 'SELLER / 매도인', b: 'BUYER / 매수인', sig: 'Signature / 서명', nt: 'Name / Title', dt: 'Date / 날짜' } : showEn ? { s: 'SELLER', b: 'BUYER', sig: 'Signature', nt: 'Name / Title', dt: 'Date' } : { s: '매도인', b: '매수인', sig: '서명', nt: '성명·직위', dt: '날짜' };
        var parts = [];
        if (H) {
            parts.push('<div class="cb-doc-warn" role="note"><strong>꼭 읽어 주세요 · ' + DOC_HEAD_KO + '</strong><br>' + esc(DOC_WARN) + '<br><small>작성: ' + esc(stamp) + ' · ' + SITE + '</small></div>');
            parts.push('<p class="cb-doc-sub"><span class="cb-doc-stamp">초안 DRAFT</span></p>');
            parts.push('<h4>' + (showEn ? titleEn : titleKo) + '</h4>');
            parts.push('<p class="cb-doc-sub">' + (showEn && showKo ? titleKo + '(초안) · ' : showEn ? 'DRAFT · ' : '(초안) · ') + esc0(noLine) + '</p>');
        } else {
            parts.push('==================== ' + DOC_HEAD_KO + ' ====================');
            parts.push(DOC_WARN);
            parts.push('작성: ' + stamp + ' · ' + SITE);
            parts.push('==========================================================================');
            parts.push('');
            parts.push((showEn ? titleEn : titleKo) + '  [DRAFT / 초안]' + (showEn && showKo ? '\n' + titleKo + '(초안)' : ''));
            parts.push(noLine);
            parts.push('');
        }
        // 머리말
        function both(enTpl, koTpl, wrapEn, wrapKo) {
            if (showEn) parts.push(H ? '<p lang="en">' + fill(enTpl, V, 'en', out, cnt) + '</p>' : fill(enTpl, V, 'en', out, cnt));
            if (showKo) {
                var ko = fill(koTpl, V, 'ko', out, showEn ? null : cnt);
                if (H) parts.push(showEn ? '<p class="cb-ko"><span class="cb-ko-k">국문 번역(참고)</span>' + ko + '</p>' : '<p>' + ko + '</p>');
                else parts.push(showEn ? '[국문 번역(참고)] ' + ko : ko);
            }
        }
        both(C.preamble.en, C.preamble.ko);
        if (!H) parts.push('');
        model.arts.forEach(function (a, i) {
            var n = i + 1;
            var chk = a.check ? (H ? ' <span class="cb-badge cb-badge-chk">확인 필요</span>' : ' 【확인 필요】') : '';
            var head = showEn ? 'Article ' + n + '. ' + a.titleEn + (showKo ? ' (제' + n + '조 ' + a.titleKo + ')' : '') : '제' + n + '조 ' + a.titleKo;
            parts.push(H ? '<h5>' + esc(head) + chk + '</h5>' : head + chk);
            a.paras.forEach(function (p) {
                if (p.items) {
                    if (H) parts.push(itemsHtml(s, k, showEn ? 'en' : 'ko'));
                    else parts.push(itemsText(s, k, showEn ? 'en' : 'ko'));
                    return;
                }
                both(p.en, p.ko);
            });
            if (!H) parts.push('');
        });
        // 서명
        both(C.sign.en, C.sign.ko);
        var sl = showEn ? 'en' : 'ko';
        var sellerName = fill('{seller}', V, sl, out, null), buyerName = fill('{buyer}', V, sl, out, null);
        var sRep = fill('{sellerRep}', V, sl, out, cnt), bRep = fill('{buyerRep}', V, sl, out, cnt);
        if (H) {
            parts.push('<div class="cb-sign"><div><p><strong>' + L.s + '</strong></p><p>' + sellerName + '</p><p class="cb-sign-line">' + L.sig + '</p><p>' + L.nt + ': ' + sRep + '</p><p>' + L.dt + ':</p></div>' +
                '<div><p><strong>' + L.b + '</strong></p><p>' + buyerName + '</p><p class="cb-sign-line">' + L.sig + '</p><p>' + L.nt + ': ' + bRep + '</p><p>' + L.dt + ':</p></div></div>');
            parts.push('<div class="cb-doc-warn cb-doc-warn-end" role="note"><strong>' + DOC_HEAD_KO + '</strong><br>' + esc(DOC_WARN_END) + '</div>');
        } else {
            parts.push('');
            parts.push(L.s + ': ' + sellerName + '\n' + L.sig + ': ____________________\n' + L.nt + ': ' + sRep + '\n' + L.dt + ':');
            parts.push('');
            parts.push(L.b + ': ' + buyerName + '\n' + L.sig + ': ____________________\n' + L.nt + ': ' + bRep + '\n' + L.dt + ':');
            parts.push('');
            parts.push('==================== ' + DOC_HEAD_KO + ' ====================');
            parts.push(DOC_WARN_END);
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
        var next = $('cbNext');
        next.innerHTML = step === MAX ? '조항 보기 <i class="fa-solid fa-arrow-down" aria-hidden="true"></i>' : '다음 <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';
        $('cbPos').textContent = step + ' / ' + MAX;
        if (focus) {
            var t = $('cbSteps');
            var top = t.getBoundingClientRect().top;
            if (top < 0 || top > window.innerHeight * 0.6) t.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
            var first = cards[step - 1].querySelector('input:not([type=hidden]), select');
            if (first) first.focus({ preventScroll: true });
        }
    }
    stepBtns.forEach(function (b) { b.addEventListener('click', function () { goStep(+b.getAttribute('data-step'), true); }); });
    $('cbPrev').addEventListener('click', function () { goStep(step - 1, true); });
    $('cbNext').addEventListener('click', function () {
        if (step === MAX) {
            $('clauses').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
            return;
        }
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
            } else if (rule === 'full') on = s.docType !== 'compact';
            else if (rule === 'compact') on = s.docType === 'compact';
            else on = !!s[rule];
            el.hidden = !on;
        });
        $('cbFraudOff').hidden = !!s.fraud;
        var inc = s.incoterm;
        $('cbPlaceLabel').textContent = F_TERMS.indexOf(inc) >= 0 ? (inc === 'EXW' ? '지정 장소(매도인 공장·창고)' : '지정 장소(인도 장소·선적항)') : C_TERMS.indexOf(inc) >= 0 ? '지정 장소(목적항·목적지)' : '지정 장소(목적지)';
    }

    /* ───────── 점검 사이드 ───────── */
    var ICON = { error: 'fa-circle-xmark', warn: 'fa-triangle-exclamation', info: 'fa-circle-info', ok: 'fa-circle-check' };
    function renderSide(model, blanks) {
        var s = model.s, k = model.k;
        var M = C.payment.methods[s.pay];
        var chk = model.arts.filter(function (a) { return a.check; }).length;
        var sum = [
            ['서류', s.docType === 'compact' ? '간이계약서' : '정식 계약서'],
            ['가격조건', s.incoterm + ' ' + (s.place || '[장소]')],
            ['결제', M ? M.label : ''],
            ['총액', k.total != null ? k.cur + ' ' + fmtMoney(k.total, k.cur) : '[ ]'],
            ['조항', model.arts.length + '개 (확인 필요 ' + chk + ')'],
            ['빈칸', blanks + '곳']
        ];
        $('cbSum').innerHTML = sum.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('');
        var order = { error: 0, warn: 1, info: 2 };
        var list = k.warns.slice().sort(function (a, b) { return order[a.lv] - order[b.lv]; });
        // 같은 문구는 한 번만
        var seen = {};
        list = list.filter(function (w) { if (seen[w.msg]) return false; seen[w.msg] = 1; return true; });
        if (blanks) list.push({ lv: 'info', msg: '초안에 빈칸 [ ] ' + blanks + '곳이 남습니다. 서명 전에 모두 채우세요.' });
        if (!list.some(function (w) { return w.lv !== 'info'; })) list.unshift({ lv: 'ok', msg: '이번 점검 규칙으로는 조건 사이의 큰 불일치를 찾지 못했습니다(문제가 없다는 뜻은 아닙니다).' });
        $('cbWarns').innerHTML = list.map(function (w) {
            var st = w.field && STEP_OF[w.field];
            return '<li class="cb-w-' + w.lv + '"><i class="fa-solid ' + ICON[w.lv] + '" aria-hidden="true"></i><span>' + esc(w.msg) + (st ? ' <button type="button" data-goto="' + st + '" data-field="' + esc(w.field) + '">' + st + '단계로</button>' : '') + '</span></li>';
        }).join('');
        // 단계 칩 오류 표시
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

    /* ───────── 생성·출력 ───────── */
    var generated = false;
    var agree1 = $('cbAgree1'), agree2 = $('cbAgree2'), genBtn = $('cbGen');
    function errorsOf(model) { return model.k.warns.filter(function (w) { return w.lv === 'error'; }); }
    function syncGen(model) {
        var ok = agree1.checked && agree2.checked;
        genBtn.disabled = !ok;
        var errs = errorsOf(model);
        var msg = '';
        if (errs.length) msg = '입력 오류 ' + errs.length + '건을 고쳐야 초안을 만들 수 있습니다(오른쪽·위 ‘조건 점검’ 참고).';
        else if (!ok && generated) msg = '두 가지 확인에 모두 체크해야 초안이 보입니다.';
        $('cbGenMsg').textContent = msg;
        var show = generated && ok && !errs.length;
        $('cbOut').hidden = !show;
        if (show) $('cbDoc').innerHTML = renderDoc(model, 'html', null);
    }
    genBtn.addEventListener('click', function () {
        if (!lastModel) return;
        if (errorsOf(lastModel).length) { syncGen(lastModel); return; }
        generated = true;
        syncGen(lastModel);
        track('contract_draft_generate', { doc_form: lastModel.s.docType, doc_lang: lastModel.s.lang });
        $('cbOut').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    });
    [agree1, agree2].forEach(function (c) { c.addEventListener('change', function () { if (lastModel) syncGen(lastModel); }); });

    function copyText(text, btn) {
        function done() {
            if (!btn) return;
            var old = btn.innerHTML;
            btn.classList.add('is-done');
            btn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> 복사했습니다';
            setTimeout(function () { btn.classList.remove('is-done'); btn.innerHTML = old; }, 1600);
        }
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(done, function () { fallback(); });
        } else fallback();
        function fallback() {
            var ta = document.createElement('textarea');
            ta.value = text; ta.setAttribute('readonly', ''); ta.className = 'ed-sr';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); done(); } catch (e) { /* 무시 */ }
            ta.remove();
        }
    }
    $('cbClauses').addEventListener('click', function (e) {
        var b = e.target.closest('[data-copy-i]');
        if (!b || !lastModel) return;
        var a = lastModel.arts[+b.getAttribute('data-copy-i')];
        var lang = b.getAttribute('data-copy-lang');
        var head = lang === 'en' ? a.titleEn.toUpperCase() : a.titleKo;
        copyText(head + '\n' + articleText(a, lastModel.s, lastModel.k, lastModel.V, lang) + COPY_NOTE, b);
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
    document.querySelector('.cb-tools').addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b || !lastModel) return;
        var act = b.getAttribute('data-act');
        if (act === 'copy') copyText(renderDoc(lastModel, 'text', null), b);
        else if (act === 'txt') download('sales-contract-DRAFT-' + fileStamp() + '.txt', 'text/plain;charset=utf-8', '﻿' + renderDoc(lastModel, 'text', null).replace(/\n/g, '\r\n'));
        else if (act === 'doc') download('sales-contract-DRAFT-' + fileStamp() + '.docx', window.DocxExport.MIME, window.DocxExport.build([renderDoc(lastModel, 'html', null)], { title: 'Sales Contract DRAFT', footer: '초안 DRAFT · 참고용 · 법률 자문 아님 · 서명 전 전문가 검토 필요 · www.littlestar.co.kr/contract-builder.html' })); // 진짜 Word(.docx)
        else if (act === 'print') window.print();
        track('contract_draft_export', { format: act });
    });

    /* ───────── 갱신 ───────── */
    var timer = null;
    function schedule() { clearTimeout(timer); timer = setTimeout(update, 120); }
    function update() {
        var s = readState();
        syncShows(s);
        var k = compute(s);
        var V = values(s, k);
        var arts = build(s, k);
        var model = { s: s, k: k, V: V, arts: arts };
        lastModel = model;
        var cnt = { n: 0 };
        renderDoc(model, 'text', cnt);
        $('cbTotal').textContent = k.total != null ? k.cur + ' ' + fmtMoney(k.total, k.cur) : '-';
        renderSide(model, cnt.n);
        renderClauses(model);
        syncGen(model);
    }
    form.addEventListener('input', schedule);
    form.addEventListener('change', function (e) {
        // 인코텀즈를 바꾸면 보험 기본값(CIF=C, CIP=A)으로 맞춘다
        if (e.target.name === 'incoterm') {
            var v = e.target.value;
            if (v === 'CIF') form.elements.cover.value = 'C';
            if (v === 'CIP') form.elements.cover.value = 'A';
        }
        schedule();
    });

    // 처음 상태: 오늘 날짜, 품목 1줄
    try {
        var t = new Date(), pz = function (n) { return (n < 10 ? '0' : '') + n; };
        form.elements.date.value = t.getFullYear() + '-' + pz(t.getMonth() + 1) + '-' + pz(t.getDate());
    } catch (e) { /* 무시 */ }
    // 수출서류 초안 작성기(doc-builder.html)에서 넘겨준 값: 이 탭의 sessionStorage에서 읽자마자 지운다
    var handed = false;
    try {
        var raw = sessionStorage.getItem('cbHandoff');
        sessionStorage.removeItem('cbHandoff');
        var h = raw ? JSON.parse(raw) : null;
        if (h && h.f) {
            Object.keys(h.f).forEach(function (k) {
                var el = form.elements[k];
                if (!el) return;
                if (el.type === 'checkbox') el.checked = !!h.f[k];
                else el.value = h.f[k];   // 라디오 묶음(RadioNodeList)도 value로 고른다
            });
            (h.items || []).slice(0, 20).forEach(function (it) {
                var row = addItem();
                if (!row) return;
                ['desc', 'qty', 'unit', 'price'].forEach(function (f) { var el = row.querySelector('[data-f="' + f + '"]'); if (el && it[f] != null) el.value = it[f]; });
            });
            handed = true;
        }
    } catch (e) { /* 무시 */ }
    if (!itemsBox.children.length) addItem();
    if (handed) {
        var note = document.createElement('p');
        note.className = 'cb-handoff';
        note.setAttribute('role', 'status');
        note.innerHTML = '<i class="fa-solid fa-link" aria-hidden="true"></i> 수출서류 초안 작성기에서 입력한 당사자·품목·조건을 이어받았습니다. 계약번호·계약일과 6·7단계(검사·클레임·준거법)를 확인하세요.';
        var stepsEl = $('cbSteps');
        stepsEl.parentNode.insertBefore(note, stepsEl);
    }
    goStep(1, false);
    update();
})();
