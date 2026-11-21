#!/usr/bin/env python3
"""사이트 페이지(*.html)의 바깥 링크(http/https)를 열어 보고, 결과를 마크다운으로 남긴다.

- 확실히 깨짐: 404·410, 주소(도메인) 없음, 그 밖의 4xx(403·429 제외)·5xx가 두 번 연속 → '깨진 링크'
- 사이트가 자동 접속을 막거나(403·429) 응답이 늦은 경우 → '확인 필요'(사람이 브라우저로 열어 본다)
  (정부·공공기관 사이트 상당수가 해외 서버의 자동 접속을 막아 이쪽으로 분류될 수 있다)
- 작가님이 브라우저로 직접 열어 정상임을 확인한 주소는 .github/link-check-ok.txt 에 한 줄씩 적는다(앞부분만 적어도 된다).
  그 주소가 '확인 필요'로 나오면 목록에서 빼고 '직접 확인함'으로 센다. 404처럼 확실히 깨지면 그대로 알린다.
결과: link-report.md (이슈 본문), 깨진 링크가 있으면 broken=1 을 GITHUB_OUTPUT에 쓴다.
외부 라이브러리 없이 표준 라이브러리만 쓴다.
"""
import concurrent.futures as cf
import glob
import html
import os
import re
import socket
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
SKIP_HOSTS = {"fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"}
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 littlestar-link-check")
TIMEOUT = 25


OK_FILE = os.path.join(ROOT, ".github", "link-check-ok.txt")


def load_ok():
    try:
        lines = open(OK_FILE, encoding="utf-8").read().splitlines()
    except FileNotFoundError:
        return []
    return [l.split()[0] for l in lines if l.strip() and not l.lstrip().startswith("#")]


def category(note):
    """'확인 필요'를 원인별로 묶는다."""
    if note.startswith("HTTP"):
        return "차단 응답(403·429·406·302 등): 자동 접속·해외 접속을 막은 것으로 추정"
    if "SSL" in note:
        return "보안 연결(SSL) 오류: 사이트 인증서 구성이 자동 점검기와 맞지 않음(브라우저에서는 대개 정상)"
    return "응답 없음(시간 초과·연결 끊김·이동 실패): 해외 서버 접속 제한 추정"


def collect():
    links = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        page = os.path.basename(path)
        text = open(path, encoding="utf-8").read()
        text = re.sub(r"<!--.*?-->", "", text, flags=re.S)  # 주석 속 견본 링크는 빼기
        for raw in re.findall(r'href="(https?://[^"]+)"', text):
            url = html.unescape(raw).split("#")[0]
            host = re.sub(r"^https?://([^/:?]+).*", r"\1", url)
            if host in SKIP_HOSTS:
                continue
            links.setdefault(url, set()).add(page)
    return links


def ascii_url(url):
    """한글 주소(예: law.go.kr/법령/…)를 퍼센트 인코딩해 urllib이 받게 한다."""
    return urllib.parse.quote(url, safe=":/?#[]@!$&'()*+,;=%~")


def fetch(url, method):
    req = urllib.request.Request(ascii_url(url), method=method, headers={
        "User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8"})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as r:
        return r.status


def check_once(url):
    """(상태, 설명) — 상태: ok / broken / unsure"""
    try:
        try:
            code = fetch(url, "HEAD")
        except urllib.error.HTTPError as e:
            if e.code in (400, 403, 404, 405, 429, 500, 501, 502, 503):
                code = fetch(url, "GET")  # HEAD를 못 받는 서버가 많아 GET으로 다시
            else:
                raise
        return "ok", str(code)
    except urllib.error.HTTPError as e:
        if e.code in (403, 429, 401, 406) or 300 <= e.code < 400:
            # 406·3xx(쿠키·브라우저 필요 리디렉션)는 자동 접속에서만 생기는 경우가 많다
            return "unsure", f"HTTP {e.code} (자동 접속 차단 가능)"
        return "broken", f"HTTP {e.code}"
    except urllib.error.URLError as e:
        reason = e.reason
        if isinstance(reason, socket.gaierror):
            host = urllib.parse.urlsplit(url).hostname or ""
            try:
                socket.getaddrinfo(host, 443)
            except socket.gaierror:
                return "broken", "주소(도메인)를 찾을 수 없음"
            # 원래 도메인은 살아 있고, 이동한 곳(리디렉션)이 해외에서 안 열리는 경우
            return "unsure", "이동한 주소에 접속 실패(해외 접속 제한 가능)"
        if isinstance(reason, ssl.SSLError):
            return "unsure", f"보안 연결(SSL) 오류: {reason.__class__.__name__}"
        return "unsure", f"접속 실패: {reason}"
    except (socket.timeout, TimeoutError):
        return "unsure", "응답 시간 초과"
    except Exception as e:  # 그 밖의 예외는 사람이 확인
        return "unsure", f"{e.__class__.__name__}: {e}"


def check(url):
    state, note = check_once(url)
    if state != "ok":
        time.sleep(5)
        state2, note2 = check_once(url)  # 일시 오류를 걸러 내려고 한 번 더
        if state2 == "ok":
            return "ok", note2
        if state == "broken" and state2 == "broken":
            return "broken", note2
        return "unsure", note2
    return state, note


def main():
    links = collect()
    results = {}
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        for url, res in zip(links, ex.map(check, links)):
            results[url] = res
    ok_prefixes = load_ok()
    is_ok = lambda u: any(u.startswith(p) for p in ok_prefixes)
    broken = [(u, n) for u, (s, n) in results.items() if s == "broken"]
    unsure_all = [(u, n) for u, (s, n) in results.items() if s == "unsure"]
    confirmed = [(u, n) for u, n in unsure_all if is_ok(u)]
    unsure = [(u, n) for u, n in unsure_all if not is_ok(u)]

    def rows(items):
        out = ["| 링크 | 결과 | 들어 있는 페이지 |", "|---|---|---|"]
        for u, n in sorted(items):
            out.append(f"| {u} | {n} | {', '.join(sorted(links[u]))} |")
        return "\n".join(out)

    normal = len(links) - len(broken) - len(unsure_all)
    lines = [
        f"바깥 링크 {len(links)}개를 점검했습니다. 깨진 링크 {len(broken)}개, 확인 필요 {len(unsure)}개, 정상 {normal}개"
        + (f", 직접 확인함 {len(confirmed)}개." if confirmed else "."),
        "",
        "점검은 매주 월요일 자동으로 돌고, 결과는 이 이슈 하나에 덮어씁니다. 다 고쳐지면 이슈가 자동으로 닫힙니다.",
        "",
    ]
    if broken:
        lines += ["## 깨진 링크 (두 번 모두 실패)", "", rows(broken), ""]
    if unsure:
        lines += ["## 확인 필요", "",
                  "사이트가 자동 접속을 막았거나 응답이 늦은 경우입니다. 정부·공공기관 사이트는 해외 서버 접속을 막는 일이 많아 실제로는 정상일 수 있습니다. "
                  "브라우저로 열어 정상이면 저장소의 `.github/link-check-ok.txt`에 그 주소를 한 줄 적어 두세요. 다음 점검부터 이 목록에서 빠집니다.",
                  ""]
        groups = {}
        for u, n in unsure:
            groups.setdefault(category(n), []).append((u, n))
        for cat in sorted(groups):
            lines += [f"### {cat} ({len(groups[cat])}개)", "", rows(groups[cat]), ""]
    if confirmed:
        lines += ["<details><summary>직접 확인한 주소 " + str(len(confirmed)) + "개 (이번 점검에서도 자동 접속은 막힘)</summary>", "",
                  rows(confirmed), "", "</details>", ""]
    open("link-report.md", "w", encoding="utf-8").write("\n".join(lines))
    print("\n".join(lines))
    gh_out = os.environ.get("GITHUB_OUTPUT")
    if gh_out:
        with open(gh_out, "a") as f:
            f.write(f"broken={1 if broken else 0}\n")
            f.write(f"unsure={1 if unsure else 0}\n")


if __name__ == "__main__":
    main()
