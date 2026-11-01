// 감사·응원 한마디: 구글 앱스 스크립트(guestbook-apps-script.gs)와 통신한다.
(function () {
    'use strict';

    // 앱스 스크립트 배포 후 나온 웹 앱 URL(…/exec)을 여기에 넣는다.
    var GUESTBOOK_URL = '';

    var PAGE = 15;
    var shown = PAGE;
    var items = [];
    var loadedAt = Date.now();
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
        var be = el('button', '', '수정'); be.type = 'button';
        var bd = el('button', '', '삭제'); bd.type = 'button';
        be.onclick = function () { openEdit(box, it, 'edit'); };
        bd.onclick = function () { openEdit(box, it, 'delete'); };
        act.appendChild(be); act.appendChild(bd);
        box.appendChild(act);
        return box;
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

    function openEdit(box, it, mode) {
        var old = box.querySelector('.gb-edit');
        if (old) old.remove();
        var wrap = el('div', 'gb-edit');
        var ta = null;
        if (mode === 'edit') {
            ta = el('textarea'); ta.maxLength = 500; ta.value = it.text;
            wrap.appendChild(ta);
        } else {
            wrap.appendChild(el('div', 'gb-note', '삭제하면 되돌릴 수 없습니다. 글을 쓸 때 정한 비밀번호를 입력해 주세요.'));
        }
        var pw = el('input'); pw.type = 'password'; pw.placeholder = '글을 쓸 때 정한 비밀번호'; pw.autocomplete = 'off';
        wrap.appendChild(pw);
        var msg = el('div', 'gb-msg');
        var btns = el('div', 'gb-btns');
        var ok = el('button', 'gb-btn', mode === 'edit' ? '수정하기' : '삭제하기'); ok.type = 'button';
        var cancel = el('button', 'gb-btn sub', '취소'); cancel.type = 'button';
        cancel.onclick = function () { wrap.remove(); };
        ok.onclick = function () {
            if (!pw.value) { setMsg(msg, '비밀번호를 입력해 주세요.', false); return; }
            ok.disabled = true;
            var params = { action: mode === 'edit' ? 'update' : 'delete', id: it.id, pw: pw.value };
            if (mode === 'edit') params.text = ta.value;
            post(params).then(function (r) {
                if (r.ok) {
                    if (mode === 'delete') removeMine(it.id);
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
        return Promise.all([pub, mine]).then(function (res) {
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
                if (r.id) addMine(r.id);
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
