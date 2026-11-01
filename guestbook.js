// 감사·응원 한마디: 구글 앱스 스크립트(guestbook-apps-script.gs)와 통신한다.
(function () {
    'use strict';

    // 앱스 스크립트 배포 후 나온 웹 앱 URL(…/exec)을 여기에 넣는다.
    var GUESTBOOK_URL = 'https://script.google.com/macros/s/AKfycbyZMGjZcqVMJuCTrhmDXSlrZIWBuz0bFW6KXfbTRheEwJ8pv3Iy_cO_cMtMPCkBIKdr/exec';

    var PAGE = 15;
    var shown = PAGE;
    var items = [];
    var loadedAt = Date.now();
    var cmap = {};      // 글 id -> 댓글 배열
    var openC = {};     // 댓글창이 열린 글 id
    var $ = function (id) { return document.getElementById(id); };

    function getMine() {
        try { return JSON.parse(localStorage.getItem('gbMine') || '[]'); } catch (e) { return []; }
    }
    function setMine(a) {
        try { localStorage.setItem('gbMine', JSON.stringify(a.slice(-60))); } catch (e) {}
    }
    function getLiked() {
        try { return JSON.parse(localStorage.getItem('gbLiked') || '[]'); } catch (e) { return []; }
    }
    function setLiked(a) {
        try { localStorage.setItem('gbLiked', JSON.stringify(a.slice(-300))); } catch (e) {}
    }
    function getMineC() {
        try { return JSON.parse(localStorage.getItem('gbMineC') || '[]'); } catch (e) { return []; }
    }
    function addMineC(id) {
        var a = getMineC();
        if (a.indexOf(id) < 0) { a.push(id); try { localStorage.setItem('gbMineC', JSON.stringify(a.slice(-120))); } catch (e) {} }
    }
    function getTok() {
        try { return JSON.parse(localStorage.getItem('gbTok') || '{}'); } catch (e) { return {}; }
    }
    function setTok(id, t) {
        var o = getTok(); o[id] = t;
        var keys = Object.keys(o);
        if (keys.length > 60) delete o[keys[0]];
        try { localStorage.setItem('gbTok', JSON.stringify(o)); } catch (e) {}
    }
    function addMine(id) { var a = getMine(); if (a.indexOf(id) < 0) { a.push(id); setMine(a); } }
    function removeMine(id) { setMine(getMine().filter(function (x) { return x !== id; })); }

    function post(params) {
        var body = new URLSearchParams(params);
        return fetch(GUESTBOOK_URL, { method: 'POST', body: body }).then(function (r) { return r.json(); });
    }

    function setMsg(el, text, ok) {
        el.textContent = text || '';
        el.className = 'gb-msg' + (text ? (ok ? ' ok' : ' err') : '');
    }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    }

    function render() {
        var list = $('gbList');
        list.innerHTML = '';
        $('gbCount').textContent = items.length ? '총 ' + items.length + '건' : '';
        if (!items.length) {
            list.appendChild(el('div', 'gb-empty', '아직 등록된 글이 없습니다. 첫 번째 한마디를 남겨 주세요.'));
            $('gbMore').style.display = 'none';
            return;
        }
        items.slice(0, shown).forEach(function (it) { list.appendChild(card(it)); });
        $('gbMore').style.display = items.length > shown ? 'block' : 'none';
    }

    function card(it) {
        var box = el('article', 'gb-item' + (it.mine ? ' mine' : ''));
        var meta = el('div', 'gb-meta');
        meta.appendChild(el('span', 'gb-name', it.name));
        meta.appendChild(el('span', 'gb-chip', it.cat));
        meta.appendChild(el('span', '', (it.time || '').slice(0, 10)));
        if (it.mine) meta.appendChild(el('span', 'gb-chip me', '내 글'));
        if (it.note) meta.appendChild(el('span', 'gb-chip warn', it.note));
        box.appendChild(meta);
        box.appendChild(el('div', 'gb-text', it.text));
        if (it.reply) {
            var rp = el('div', 'gb-reply');
            rp.appendChild(el('strong', '', 'Happy Oh 답글'));
            rp.appendChild(document.createTextNode(it.reply));
            box.appendChild(rp);
        }
        var act = el('div', 'gb-actions');
        var liked = getLiked().indexOf(it.id) >= 0;
        var bl = el('button', 'gb-like' + (liked ? ' on' : ''), '');
        bl.type = 'button';
        var icon = el('i', liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart');
        bl.appendChild(icon);
        var cnt = el('span', '', ' 공감해요' + (it.likes ? ' ' + it.likes : ''));
        bl.appendChild(cnt);
        bl.onclick = function () { toggleLike(it, bl, icon, cnt); };
        act.appendChild(bl);
        var cs = cmap[it.id] || [];
        var bc = el('button', 'gb-like gb-cbtn' + (openC[it.id] ? ' on' : ''), '');
        bc.type = 'button';
        bc.appendChild(el('i', 'fa-regular fa-comment'));
        bc.appendChild(el('span', '', ' 댓글' + (cs.length ? ' ' + cs.length : '')));
        act.appendChild(bc);
        var be = el('button', '', '수정'); be.type = 'button';
        var bd = el('button', '', '삭제'); bd.type = 'button';
        be.onclick = function () { openEdit(box, it, 'edit'); };
        bd.onclick = function () { openEdit(box, it, 'delete'); };
        act.appendChild(be); act.appendChild(bd);
        box.appendChild(act);
        var panel = el('div', 'gb-cpanel');
        panel.style.display = openC[it.id] ? 'block' : 'none';
        if (openC[it.id]) fillPanel(panel, it);
        box.appendChild(panel);
        bc.onclick = function () {
            openC[it.id] = !openC[it.id];
            bc.classList.toggle('on', !!openC[it.id]);
            panel.style.display = openC[it.id] ? 'block' : 'none';
            if (openC[it.id]) fillPanel(panel, it); else panel.innerHTML = '';
        };
        return box;
    }

    // 댓글창: 목록 + 쓰기 폼 + (글쓴이용) 비공개 댓글 보기
    function fillPanel(panel, it) {
        panel.innerHTML = '';
        var cs = cmap[it.id] || [];
        if (!cs.length) panel.appendChild(el('div', 'gb-cempty', '아직 댓글이 없습니다. 첫 댓글을 남겨 주세요.'));
        cs.forEach(function (c) { panel.appendChild(cCard(c)); });

        if (!getTok()[it.id] && !it.mine) {
            var ub = el('button', 'gb-unlock', '글쓴이이신가요? 비밀번호로 비공개 댓글 보기'); ub.type = 'button';
            ub.onclick = function () { openUnlock(panel, it, ub); };
            panel.appendChild(ub);
        }

        var form = el('form', 'gb-cform');
        form.autocomplete = 'off';
        var nm = el('input'); nm.type = 'text'; nm.maxLength = 20; nm.placeholder = '글쓴이(실명 또는 닉네임)';
        var tx = el('textarea'); tx.maxLength = 300; tx.placeholder = '댓글을 적어 주세요 (300자 이내)';
        var pw = el('input'); pw.type = 'password'; pw.maxLength = 40; pw.placeholder = '비밀번호(선택 · 수정·삭제하려면 4자 이상)'; pw.autocomplete = 'new-password';
        var hp = el('input'); hp.type = 'text'; hp.tabIndex = -1; hp.autocomplete = 'off';
        var hpw = el('div', 'gb-hp'); hpw.setAttribute('aria-hidden', 'true'); hpw.appendChild(hp);
        var lab = el('label', 'gb-check');
        var pr = el('input'); pr.type = 'checkbox';
        lab.appendChild(pr);
        lab.appendChild(el('span', '', '비공개 댓글 (댓글 쓴 사람과 글쓴이만 볼 수 있습니다)'));
        var sb = el('button', 'gb-btn', '댓글 등록'); sb.type = 'submit';
        var msg = el('div', 'gb-msg');
        pw.addEventListener('input', function () { setMsg(msg, ''); });
        var openedAt = Date.now();
        [nm, tx, pw, hpw, lab, sb, msg].forEach(function (x) { form.appendChild(x); });
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!nm.value.trim()) { setMsg(msg, '글쓴이를 적어 주세요.', false); return; }
            if (!tx.value.trim()) { setMsg(msg, '댓글 내용을 적어 주세요.', false); return; }
            if (pw.value && pw.value.length < 4) { setMsg(msg, '비밀번호는 비우거나 4자 이상으로 정해 주세요.', false); return; }
            sb.disabled = true;
            setMsg(msg, '등록하는 중입니다…', true);
            post({ action: 'ccreate', post: it.id, name: nm.value.trim(), text: tx.value.trim(), pw: pw.value,
                   priv: pr.checked ? 'Y' : 'N', website: hp.value, t: String(Date.now() - openedAt) }).then(function (r) {
                sb.disabled = false;
                if (!r.ok) { setMsg(msg, r.error || '등록하지 못했습니다.', false); return; }
                if (r.id) addMineC(r.id);
                if (typeof gtag === 'function') gtag('event', 'guestbook_comment');
                openC[it.id] = true;
                load();
            }).catch(function () { sb.disabled = false; setMsg(msg, '네트워크 오류입니다. 잠시 후 다시 시도해 주세요.', false); });
        });
        panel.appendChild(form);
    }

    function cCard(c) {
        var box = el('div', 'gb-comment' + (c.mine ? ' mine' : ''));
        var meta = el('div', 'gb-meta');
        meta.appendChild(el('span', 'gb-name', c.name));
        meta.appendChild(el('span', '', (c.time || '').slice(0, 10)));
        if (c.mine) meta.appendChild(el('span', 'gb-chip me', '내 댓글'));
        if (c.status === '검토대기') meta.appendChild(el('span', 'gb-chip warn', '확인 후 공개됩니다'));
        else if (c.priv) meta.appendChild(el('span', 'gb-chip warn', '비공개'));
        box.appendChild(meta);
        box.appendChild(el('div', 'gb-text', c.text));
        if (c.reply) {
            var rp = el('div', 'gb-reply');
            rp.appendChild(el('strong', '', 'Happy Oh 답글'));
            rp.appendChild(document.createTextNode(c.reply));
            box.appendChild(rp);
        }
        var act = el('div', 'gb-actions');
        var be = el('button', '', '수정'); be.type = 'button';
        var bd = el('button', '', '삭제'); bd.type = 'button';
        be.onclick = function () { openEdit(box, c, 'edit', true); };
        bd.onclick = function () { openEdit(box, c, 'delete', true); };
        act.appendChild(be); act.appendChild(bd);
        if (!c.nopw) box.appendChild(act);
        return box;
    }

    function openUnlock(panel, it, btn) {
        var wrap = el('div', 'gb-edit');
        wrap.appendChild(el('div', 'gb-note', '이 글을 쓸 때 정한 비밀번호를 입력하면 이 글에 달린 비공개 댓글이 보입니다.'));
        var pw = el('input'); pw.type = 'password'; pw.placeholder = '글을 쓸 때 정한 비밀번호'; pw.autocomplete = 'off';
        var msg = el('div', 'gb-msg');
        pw.addEventListener('input', function () { setMsg(msg, ''); });
        var btns = el('div', 'gb-btns');
        var ok = el('button', 'gb-btn', '확인'); ok.type = 'button';
        var cancel = el('button', 'gb-btn sub', '취소'); cancel.type = 'button';
        cancel.onclick = function () { wrap.remove(); btn.style.display = ''; };
        ok.onclick = function () {
            if (!pw.value) { setMsg(msg, '비밀번호를 입력해 주세요.', false); return; }
            ok.disabled = true;
            post({ action: 'unlock', id: it.id, pw: pw.value }).then(function (r) {
                if (r.ok && r.tok) { setTok(it.id, r.tok); openC[it.id] = true; load(); }
                else { setMsg(msg, r.error || '확인하지 못했습니다.', false); ok.disabled = false; }
            }).catch(function () { setMsg(msg, '네트워크 오류입니다. 잠시 후 다시 시도해 주세요.', false); ok.disabled = false; });
        };
        btns.appendChild(ok); btns.appendChild(cancel);
        wrap.appendChild(pw); wrap.appendChild(msg); wrap.appendChild(btns);
        btn.style.display = 'none';
        btn.parentNode.insertBefore(wrap, btn.nextSibling);
        pw.focus();
    }

    function toggleLike(it, btn, icon, cnt) {
        var list = getLiked();
        var was = list.indexOf(it.id) >= 0;
        btn.disabled = true;
        post({ action: 'like', id: it.id, delta: was ? '-1' : '1' }).then(function (r) {
            btn.disabled = false;
            if (!r.ok) return;
            it.likes = r.likes;
            if (was) list = list.filter(function (x) { return x !== it.id; }); else list.push(it.id);
            setLiked(list);
            btn.className = 'gb-like' + (was ? '' : ' on');
            icon.className = was ? 'fa-regular fa-heart' : 'fa-solid fa-heart';
            cnt.textContent = ' 공감해요' + (r.likes ? ' ' + r.likes : '');
        }).catch(function () { btn.disabled = false; });
    }

    function openEdit(box, it, mode, isC) {
        var old = box.querySelector(':scope > .gb-edit');
        if (old) old.remove();
        var wrap = el('div', 'gb-edit');
        var ta = null;
        if (mode === 'edit') {
            ta = el('textarea'); ta.maxLength = isC ? 300 : 500; ta.value = it.text;
            wrap.appendChild(ta);
        } else {
            wrap.appendChild(el('div', 'gb-note', '삭제하면 되돌릴 수 없습니다. ' + (isC ? '댓글' : '글') + '을 쓸 때 정한 비밀번호를 입력해 주세요.'));
        }
        var pw = el('input'); pw.type = 'password'; pw.placeholder = (isC ? '댓글' : '글') + '을 쓸 때 정한 비밀번호'; pw.autocomplete = 'off';
        wrap.appendChild(pw);
        var msg = el('div', 'gb-msg');
        pw.addEventListener('input', function () { setMsg(msg, ''); });
        var btns = el('div', 'gb-btns');
        var ok = el('button', 'gb-btn', mode === 'edit' ? '수정하기' : '삭제하기'); ok.type = 'button';
        var cancel = el('button', 'gb-btn sub', '취소'); cancel.type = 'button';
        cancel.onclick = function () { wrap.remove(); };
        ok.onclick = function () {
            if (!pw.value) { setMsg(msg, '비밀번호를 입력해 주세요.', false); return; }
            ok.disabled = true;
            var params = { action: (isC ? 'c' : '') + (mode === 'edit' ? 'update' : 'delete'), id: it.id, pw: pw.value };
            if (mode === 'edit') params.text = ta.value;
            post(params).then(function (r) {
                if (r.ok) {
                    if (mode === 'delete' && !isC) removeMine(it.id);
                    load();
                } else {
                    setMsg(msg, r.error || '처리하지 못했습니다.', false);
                    ok.disabled = false;
                }
            }).catch(function () { setMsg(msg, '네트워크 오류입니다. 잠시 후 다시 시도해 주세요.', false); ok.disabled = false; });
        };
        btns.appendChild(ok); btns.appendChild(cancel);
        wrap.appendChild(msg); wrap.appendChild(btns);
        box.appendChild(wrap);
        (ta || pw).focus();
    }

    function load() {
        if (!GUESTBOOK_URL) return Promise.resolve();
        var mineIds = getMine();
        var pub = fetch(GUESTBOOK_URL + '?action=list').then(function (r) { return r.json(); });
        var mine = mineIds.length ? post({ action: 'mine', ids: mineIds.join(',') }) : Promise.resolve({ ok: true, items: [] });
        var mineC = getMineC(), tok = getTok();
        var toks = Object.keys(tok).map(function (k) { return k + ':' + tok[k]; });
        var cpub = fetch(GUESTBOOK_URL + '?action=clist').then(function (r) { return r.json(); }).catch(function () { return { items: [] }; });
        var cmine = (mineC.length || toks.length) ? post({ action: 'cmine', ids: mineC.join(','), toks: toks.join(',') }).catch(function () { return { items: [] }; }) : Promise.resolve({ items: [] });
        return Promise.all([pub, mine, cpub, cmine]).then(function (res) {
            var cm = {}, cseen = {};
            (res[3].items || []).forEach(function (c) { cseen[c.id] = true; (cm[c.post] = cm[c.post] || []).push(c); });
            (res[2].items || []).forEach(function (c) { if (cseen[c.id]) return; if (mineC.indexOf(c.id) >= 0) c.mine = true; (cm[c.post] = cm[c.post] || []).push(c); });
            Object.keys(cm).forEach(function (k) { cm[k].sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); }); });
            cmap = cm;
            var list = (res[0].items || []).slice();
            var seen = {};
            list.forEach(function (x) { seen[x.id] = true; if (mineIds.indexOf(x.id) >= 0) x.mine = true; });
            (res[1].items || []).forEach(function (x) {
                if (seen[x.id]) return;
                x.mine = true;
                if (x.status === '검토대기') x.note = '확인 후 공개됩니다';
                else x.note = '나만 보기';
                list.push(x);
            });
            // 최신순 정렬(시각 문자열 비교)
            list.sort(function (a, b) { return (b.time || '').localeCompare(a.time || ''); });
            items = list;
            render();
        }).catch(function () {
            $('gbList').innerHTML = '';
            $('gbList').appendChild(el('div', 'gb-empty', '목록을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.'));
        });
    }

    function init() {
        if (!GUESTBOOK_URL) {
            $('gbList').appendChild(el('div', 'gb-empty', '곧 문을 엽니다. 조금만 기다려 주세요.'));
            $('gbSubmit').disabled = true;
            setMsg($('gbMsg'), '준비 중입니다.', false);
            return;
        }
        var ta = $('gbText');
        ta.addEventListener('input', function () { $('gbLen').textContent = ta.value.length + ' / 500'; });
        $('gbMore').addEventListener('click', function () { shown += PAGE; render(); });
        $('gbForm').addEventListener('submit', function (e) {
            e.preventDefault();
            var f = e.target;
            var msg = $('gbMsg');
            var name = $('gbName').value.trim(), text = $('gbText').value.trim(), pw = $('gbPw').value;
            if (!name) { setMsg(msg, '글쓴이를 적어 주세요.', false); return; }
            if (!text) { setMsg(msg, '내용을 적어 주세요.', false); return; }
            if (pw.length < 4) { setMsg(msg, '비밀번호는 4자 이상으로 정해 주세요.', false); return; }
            $('gbSubmit').disabled = true;
            setMsg(msg, '등록하는 중입니다…', true);
            post({
                action: 'create', name: name, cat: $('gbCat').value, text: text, pw: pw,
                priv: f.elements.priv.checked ? 'Y' : 'N', website: f.elements.website.value, t: String(Date.now() - loadedAt)
            }).then(function (r) {
                $('gbSubmit').disabled = false;
                if (!r.ok) { setMsg(msg, r.error || '등록하지 못했습니다.', false); return; }
                f.elements.priv.checked = false;
                if (r.id) addMine(r.id);
                if (r.id && r.tok) setTok(r.id, r.tok);
                $('gbText').value = ''; $('gbPw').value = ''; $('gbLen').textContent = '0 / 500';
                var m = '등록되었습니다. 감사합니다.';
                if (r.status === '검토대기') m = '등록되었습니다. 일부 내용은 확인 후 공개될 수 있습니다.';
                else if (r.priv) m = '등록되었습니다. 나만 볼 수 있는 글로 저장했습니다.';
                setMsg(msg, m, true);
                if (typeof gtag === 'function') gtag('event', 'guestbook_post');
                load();
            }).catch(function () {
                $('gbSubmit').disabled = false;
                setMsg(msg, '네트워크 오류입니다. 잠시 후 다시 시도해 주세요.', false);
            });
        });
        load();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
