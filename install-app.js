/* 앱 설치 안내: 맨 아래 푸터의 'Happy Oh 앱 설치' 버튼을 누르면 설치 안내문이 펼쳐지고, '닫기'로 닫힌다.
 * - 크롬이 사이트를 열 때마다 띄우는 자동 설치 안내(미니 인포바)는 막고,
 *   그 설치 기능은 안내문 안의 '지금 설치' 버튼으로 옮긴다(지원하는 브라우저에서만 보인다).
 * - 이미 앱으로 열었거나(설치됨) 설치가 끝나면 푸터 '앱 설치' 줄은 숨긴다.
 * 이 파일은 <head>에서 바로 불러온다(beforeinstallprompt를 놓치지 않기 위해). */
(function () {
    'use strict';

    var deferredPrompt = null;
    var nowBtn = null;

    function isInstalled() {
        try {
            return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
                window.navigator.standalone === true;
        } catch (e) { return false; }
    }

    function platform() {
        var ua = navigator.userAgent || '';
        if (/iPhone|iPad|iPod/i.test(ua)) { return 'ios'; }
        if (/Android/i.test(ua)) { return 'android'; }
        return 'pc';
    }

    // 카카오톡·네이버 앱·인스타그램 등 앱 안에서 연 화면(인앱 브라우저)에서는 설치가 되지 않는다.
    function inApp() {
        var ua = navigator.userAgent || '';
        if (/KAKAOTALK/i.test(ua)) { return 'kakao'; }
        if (/NAVER\(inapp|DaumApps|Instagram|FBAN|FBAV|FB_IAB|; Line\/| Line\//i.test(ua)) { return 'other'; }
        if (/Android/i.test(ua) && /; wv\)/.test(ua)) { return 'other'; }
        if (/iPhone|iPad|iPod/i.test(ua) && !/Safari\//.test(ua)) { return 'other'; }
        return '';
    }

    function externalUrl(kind) {
        var url = location.href;
        if (kind === 'kakao') {
            return 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
        }
        var m = url.match(/^https?:\/\/(.*)$/);
        return 'intent://' + (m ? m[1] : url) + '#Intent;scheme=https;package=com.android.chrome;end';
    }

    function syncNowButton() {
        if (nowBtn) { nowBtn.hidden = !deferredPrompt; }
    }

    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();          // 크롬의 자동 설치 안내 막기
        deferredPrompt = e;
        syncNowButton();
    });

    window.addEventListener('appinstalled', function () {
        deferredPrompt = null;
        var li = document.getElementById('installItem');
        if (li) { li.hidden = true; }
        var panel = document.getElementById('installGuide');
        if (panel) { panel.hidden = true; }
    });

    function build() {
        var btn = document.getElementById('installToggle');
        var footer = document.querySelector('footer');
        if (!btn || !footer || !footer.parentNode) { return; }

        if (isInstalled()) {
            var item = document.getElementById('installItem');
            if (item) { item.hidden = true; }
            return;
        }

        var me = platform();
        var app = inApp();
        var warnHtml = '';
        if (app) {
            var what = app === 'kakao' ? '카카오톡 안에서' : '앱 안에서';
            warnHtml = '<div class="install-warn"><p><strong>지금은 ' + what + ' 열려 있어 설치가 되지 않습니다.</strong><br>' +
                (me === 'ios'
                    ? '아래쪽 또는 위쪽의 공유 버튼에서 \'Safari로 열기\'를 누른 뒤, 사파리에서 설치해 주세요.'
                    : '오른쪽 아래 ⋮ 메뉴에서 \'다른 브라우저로 열기\'(또는 \'Chrome\')를 선택하거나, 아래 버튼으로 바깥 브라우저를 여세요.') +
                '</p>' +
                (me === 'android' ? '<a class="install-ext" href="' + externalUrl(app) + '">' + (app === 'kakao' ? '외부 브라우저로 열기' : '크롬으로 열기') + '</a>' : '') +
                '</div>';
        }
        var panel = document.createElement('div');
        panel.className = 'install-guide';
        panel.id = 'installGuide';
        panel.hidden = true;
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-label', '앱 설치 안내');
        panel.innerHTML =
            '<div class="install-guide-inner">' +
            '<p class="install-guide-title">홈 화면에 앱처럼 설치하기</p>' +
            '<p class="install-guide-lead">설치하면 휴대폰 홈 화면·PC 바탕화면의 아이콘으로 Happy Oh Consulting을 바로 열 수 있습니다.</p>' +
            warnHtml +
            '<button type="button" class="install-now" hidden>지금 설치</button>' +
            '<ul class="install-steps">' +
            '<li' + (me === 'android' ? ' class="is-me"' : '') + '><strong>안드로이드 (크롬)</strong><span>오른쪽 위 ⋮ 메뉴 → \'홈 화면에 추가\'(또는 \'앱 설치\') → \'설치\'</span></li>' +
            '<li' + (me === 'ios' ? ' class="is-me"' : '') + '><strong>아이폰 (사파리)</strong><span>아래쪽 공유 버튼 → \'홈 화면에 추가\' → \'추가\'</span></li>' +
            '<li' + (me === 'pc' ? ' class="is-me"' : '') + '><strong>PC (크롬·엣지)</strong><span>주소창 오른쪽 설치 아이콘 → \'설치\'</span></li>' +
            '</ul>' +
            '<button type="button" class="install-close">닫기</button>' +
            '</div>';
        footer.parentNode.insertBefore(panel, footer);

        nowBtn = panel.querySelector('.install-now');
        var closeBtn = panel.querySelector('.install-close');
        syncNowButton();

        function setOpen(open) {
            panel.hidden = !open;
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                panel.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
            }
        }

        btn.setAttribute('aria-controls', 'installGuide');
        btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('click', function () { setOpen(panel.hidden); });
        closeBtn.addEventListener('click', function () { setOpen(false); btn.focus(); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); }
        });

        nowBtn.addEventListener('click', function () {
            if (!deferredPrompt) { return; }
            var p = deferredPrompt;
            deferredPrompt = null;
            syncNowButton();
            p.prompt();
            if (p.userChoice && p.userChoice.then) {
                p.userChoice.then(function (r) {
                    if (r && r.outcome === 'accepted') { setOpen(false); }
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
