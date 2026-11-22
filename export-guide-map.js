/* =========================================
   수출 가이드 도구 (export-guide.html) — 질문·링크·추천 규칙 데이터
   문구·링크·점수만 고칠 때는 이 파일만 고친다. 고치면 MAP_VERSION 을 1 올린다(시트 '매핑 버전' 열).
   링크는 사이트 안 페이지·칸 id 기준(2026-11-22 확인). 페이지 칸 id 가 바뀌면 여기도 함께 고친다.
   설계: Claude Doc '수출 가이드 도구 PRD'
   ========================================= */
(function () {
    'use strict';

    var MAP_VERSION = 5;

    // 수출실적 6단계(핵심 축). 순서 = 단계 번호(0~5)
    var STAGES = [
        { v: 's0', label: '없음', short: '실적 없음' },
        { v: 's1', label: '1천 달러 미만', short: '1천 달러 미만' },
        { v: 's2', label: '1천 달러 이상 ~ 1만 달러 미만', short: '1천~1만 달러' },
        { v: 's3', label: '1만 달러 이상 ~ 10만 달러 미만', short: '1만~10만 달러' },
        { v: 's4', label: '10만 달러 이상 ~ 100만 달러 미만', short: '10만~100만 달러' },
        { v: 's5', label: '100만 달러 이상', short: '100만 달러 이상' }
    ];

    // 애로사항(Q6) 10개
    var ISSUES = {
        buyer:   '바이어를 못 찾겠다',
        docs:    '수출서류·계약서가 어렵다',
        collect: '대금을 못 받을까 걱정된다',
        importer: '수입자 신용조사가 필요하다',
        factoring: '수출채권 유동화(선적 후 대금 조기 현금화)가 필요하다',
        fx:      '환율 변동이 부담된다',
        fund:    '생산·선적 전 자금이 부족하다',
        cert:    '해외인증·규제를 모른다',
        hs:      'HS코드·관세·통관을 모른다',
        support: '받을 수 있는 정부지원사업을 모른다',
        fraud:   '계좌변경·무역사기가 걱정된다',
        market:  '어느 나라로 갈지 모르겠다',
        tclaim:  '무역클레임(품질·수량·납기 분쟁)이 걱정된다'
    };
    // 단계별로 먼저 보이는 애로(순서대로, 6~9개). 나머지는 '다른 어려움 더 보기'
    // 2026-11-22 작가님: 10만 달러 이상이어도 바이어·시장·인증은 필요 → 1만 달러 이상은 9개를 먼저 보인다
    var ISSUE_ORDER = {
        s0: ['market', 'buyer', 'support', 'cert', 'hs', 'docs'],
        s1: ['buyer', 'docs', 'hs', 'cert', 'support', 'fraud'],
        s2: ['buyer', 'docs', 'collect', 'importer', 'fraud', 'support', 'cert', 'hs'],
        s3: ['buyer', 'collect', 'importer', 'fund', 'market', 'cert', 'docs', 'factoring', 'tclaim'],
        s4: ['buyer', 'market', 'cert', 'collect', 'importer', 'fund', 'factoring', 'fx', 'tclaim'],
        s5: ['buyer', 'market', 'cert', 'fx', 'collect', 'importer', 'factoring', 'tclaim', 'fund']
    };
    var ISSUE_HELP = {
        s0: '어디서부터 시작할지 막막하신가요? 가장 가까운 것을 골라 주세요.',
        s1: '샘플·소량 거래를 정식 거래로 키우는 단계입니다.',
        s2: '거래를 늘리며 서류·대금을 다지는 단계입니다.',
        s3: '바이어가 늘고 외상·자금 문제가 생기는 단계입니다.',
        s4: '규모가 커지며 위험 관리가 필요한 단계입니다.',
        s5: '신시장·대형 거래를 다지는 단계입니다.'
    };

    // 질문. type: one(하나) | multi(여러 개). optional: 건너뛸 수 있음. when: 보일 조건
    var QUESTIONS = [
        {
            id: 'q1', type: 'one', title: '최근 1년(또는 전년도) 수출실적은 얼마인가요?',
            help: '직수출, 로컬 수출(구매확인서·내국신용장), 온라인 해외 판매를 모두 합친 금액으로 골라 주세요. 정확히 모르면 전년도 실적으로, 달러가 아닌 통화는 대략 환산해 주세요.',
            options: STAGES.map(function (s) { return { v: s.v, label: s.label }; })
        },
        {
            id: 'q1b', type: 'one', title: '지금 진행 중인 해외 거래가 있나요?',
            when: function (a) { return a.q1 === 's0'; },
            options: [
                { v: 'prep', label: '아직 없음(준비 중)' },
                { v: 'nego', label: '바이어와 협상·샘플 진행 중' },
                { v: 'order', label: '첫 주문을 받았음' }
            ]
        },
        {
            id: 'q2', type: 'multi', title: '회사는 어느 쪽인가요? (복수 선택 가능)',
            help: '창업 연차에서 하나, 기업 규모에서 하나씩 고를 수 있습니다. 한쪽만 골라도 됩니다.',
            // 같은 묶음 안에서는 하나만(다른 것을 누르면 바뀜) → '소기업+대기업' 같은 모순 조합이 생기지 않는다
            groups: [
                { label: '창업 연차', vs: ['startup', 'y7', 'y7p'] },
                { label: '기업 규모', vs: ['smallbiz', 'small', 'medium', 'mid', 'large', 'etc'] }
            ],
            options: [
                { v: 'startup', label: '예비창업·창업 3년 이내' },
                { v: 'y7', label: '창업 7년 이내' },
                { v: 'y7p', label: '창업 7년 초과' },
                { v: 'smallbiz', label: '소상공인' },
                { v: 'small', label: '소기업(소상공인 제외)' },
                { v: 'medium', label: '중기업' },
                { v: 'mid', label: '중견기업' },
                { v: 'large', label: '대기업' },
                { v: 'etc', label: '기타' }
            ]
        },
        {
            id: 'q3', type: 'one', title: '어떤 품목인가요?',
            options: [
                { v: 'consumer', label: '소비재' },
                { v: 'industrial', label: '산업재·부품' },
                { v: 'agri', label: '농수산식품' },
                { v: 'cosmetic', label: '화장품' },
                { v: 'service', label: '서비스·콘텐츠' },
                { v: 'etc', label: '기타' }
            ]
        },
        {
            id: 'q4', type: 'multi', title: '(희망하는) 수출 형태는?', help: '여러 개를 고를 수 있습니다.',
            options: [
                { v: 'local', label: '로컬 수출' },
                { v: 'b2c', label: 'B2C 온라인 판매' },
                { v: 'b2b', label: '일반수출(B2B)' },
                { v: 'relay', label: '중계무역' },
                { v: 'other', label: '기타' }
            ]
        },
        {
            id: 'q5', type: 'multi', title: '목표 시장은 어디인가요?', help: '여러 개를 고를 수 있습니다.', exclusive: ['undecided'],
            options: [
                { v: 'undecided', label: '아직 미정' },
                { v: 'cnjp', label: '중국·일본' },
                { v: 'sea', label: '동남아' },
                { v: 'na', label: '미국·캐나다' },
                { v: 'eu', label: '유럽' },
                { v: 'mea', label: '중동·아프리카' },
                { v: 'other', label: '그 밖의 지역' }
            ]
        },
        {
            id: 'q6', type: 'multi', title: '지금 어려운 점은 무엇인가요? (복수 선택 가능)', help: '해당하는 것을 모두 골라 주세요.',
            options: Object.keys(ISSUES).map(function (k) { return { v: k, label: ISSUES[k] }; })
        },
        {
            id: 'q7', type: 'multi', title: '대금은 어떤 방식으로 받나요?', titlePlan: '계획 중인 대금 결제 방식은 무엇인가요?',
            help: '여러 개를 고를 수 있습니다.', exclusive: ['unknown'],
            options: [
                { v: 'prepay', label: '선수금' },
                { v: 'lc', label: '신용장(L/C)' },
                { v: 'collection', label: '추심방식(D/P, D/A)' },
                { v: 'deferred', label: '외상거래(선적 후 결제)' },
                { v: 'other', label: '기타' },
                { v: 'unknown', label: '아직 모름', planOnly: true }
            ]
        },
        {
            id: 'q8', type: 'one', optional: true, title: '지금 가장 필요한 것은 무엇인가요?', help: '선택 질문입니다. 건너뛰어도 됩니다.',
            options: [
                { v: 'info', label: '직접 찾아볼 자료' },
                { v: 'tool', label: '바로 쓸 도구' },
                { v: 'fund', label: '자금·지원사업 신청 길' },
                { v: 'consult', label: '전문가와 상담' }
            ]
        }
    ];

    // 안내할 곳. ext: 새 탭
    var LINKS = {
        'k-domestic':  { t: 'KOTRA 내수기업 수출기업화', u: 'global-expansion.html#k-domestic', d: '전년도 통관 실적 10만 달러 미만 기업의 첫 수출을 돕는 사업입니다(로컬 수취액은 실적에서 제외).' },
        'semas-innov': { t: '소진공 혁신성장촉진자금(혁신형)', u: 'policy-finance.html?org=semas#semas-direct', d: "'수출 소상공인'(최근 1년 이내 직·간접 수출실적 1,000달러 이상인 소상공인)이 대상인 정책자금입니다. 한도·금리·업종 등 세부 요건은 소진공 공고를 확인하세요." },
        'trade-stats': { t: '무역통계·HS코드 길잡이', u: 'https://www.littlestar.co.kr/lawsearch/trade/', ext: true, d: '품목(HS코드)별 수출 통계와 유망 시장을 찾아봅니다.' },
        'buyer':       { t: '바이어 발굴 안내', u: 'global-expansion.html#buyer', d: 'K-SIGHT·트라이빅·Trade Map·B2B 플랫폼 등 바이어 찾는 길을 모았습니다.' },
        'b2c':         { t: 'B2C 온라인 판매(역직구) 시작 순서', u: 'global-expansion.html#c-flow', d: '플랫폼 선택부터 물류·결제까지 7단계로 정리했습니다.' },
        'cert':        { t: '해외인증 조회 가이드', u: 'cert-guide.html', d: '수출 단계와 품목에 맞는 해외인증 공식 조회 포털을 안내합니다.' },
        'voucher':     { t: '수출바우처', u: 'government-support.html#voucher', d: '시장조사·인증·홍보 등 수출 서비스를 골라 쓰는 지원사업입니다. 신청 자격은 해마다 공고를 확인하세요.' },
        'doc-builder': { t: '수출서류 작성기', u: 'doc-builder.html', d: '오퍼시트·PI·CI·P/L·선적통지 초안을 한 번의 입력으로 만듭니다.' },
        'contract':    { t: '계약서 작성기', u: 'contract-builder.html', d: '거래 조건에 맞는 매매계약서 초안과 추천 조항을 만듭니다.' },
        'export-docs': { t: '수출서류 점검·작성', u: 'export-docs.html', d: '샘플 계약서·체크리스트로 서류의 빠진 곳과 위험 조항을 점검합니다.' },
        'fraud':       { t: '무역사기(계좌변경) 주의', u: 'export-docs.html#fraud', d: '이메일 계좌변경 사기 예방 수칙과 계약서에 넣을 경고 문구입니다.' },
        'ksure-dplus': { t: '단기수출보험(다이렉트-중소Plus+)', u: 'trade-insurance.html#ksure-dplus', d: '소액 외상 수출의 대금 미회수에 대비하는 비대면 무역보험 상품입니다.' },
        'ksure-plus':  { t: '단기수출보험(중소중견Plus+)', u: 'trade-insurance.html#ksure-plus', d: '외상·추심 수출의 대금 미회수에 대비하는 무역보험 상품입니다(중계무역 포함).' },
        'credit':      { t: '국외기업 신용조사', u: 'trade-insurance.html#credit', d: '거래 전에 해외 바이어의 신용을 확인합니다.' },
        'ksure-postship': { t: '수출신용보증(선적 후·매입·포괄매입)', u: 'trade-insurance.html#ksure-guarantee', d: '선적을 마친 수출채권을 금융기관에서 미리 현금화할 때 무보가 보증합니다. 선적후 보증은 단기수출보험과 연계해야 합니다.' },
        'ksure-after': { t: '무보 선적 후·대금 회수 상품 한눈에', u: 'policy-finance.html?org=ksure#ksure-after', d: '대금 미회수에 대비하는 보험과 채권 조기 현금화 보증을 함께 정리했습니다.' },
        'trade-claim': { t: '무역클레임 대응 가이드', u: 'trade-claim.html#matrix', d: '클레임 접수 직후의 무료 자문부터 알선·조정, 미수채권 추심, 회수불능 확인까지 상황별로 찾아갈 곳을 정리했습니다.' },
        'kcab':        { t: '대한상사중재원(중재·조정)', u: 'https://www.kcab.or.kr/', d: '무역클레임이 당사자 합의로 풀리지 않을 때 상사중재·조정을 신청하는 기관입니다. 절차·비용은 공식 사이트에서 확인하세요.', ext: true },
        'law-adr':     { t: '중재·분쟁해결 법령·규칙', u: 'export-docs.html#law-adr', d: '무역클레임이 분쟁으로 번질 때 참고할 중재법·국제 중재 규칙 링크를 모았습니다.' },
        'claim':       { t: '보상절차·면책사례', u: 'trade-insurance.html#claim', d: '사고가 났을 때의 절차와 보험금을 못 받는 사례를 정리했습니다.' },
        'claim-exempt':{ t: '면책사례(중계무역 조달 차질 등)', u: 'trade-insurance.html#claim-exempt', d: '중계무역 등에서 자주 생기는 면책 사례를 정리했습니다.' },
        'policy-fund': { t: '정책자금 안내', u: 'policy-finance.html?org=kosmes', d: '기관별 정책자금의 대상·한도·금리를 정리했습니다.' },
        'guarantee':   { t: '수출신용보증(선적 전)', u: 'trade-insurance.html#guarantee', d: '수출 계약을 근거로 생산·선적 전 자금을 빌릴 때 보증을 받습니다.' },
        'fx':          { t: '환변동보험', u: 'trade-insurance.html#fx', d: '환율 하락으로 생기는 손실에 대비하는 무역보험 상품입니다.' },
        'qna-fx':      { t: '환변동보험 Q&A', u: 'trade-insurance.html#qna-fx', d: '로컬 수출만 하는 경우 가입 여부 등 자주 묻는 질문 15개입니다.' },
        'k-market':    { t: 'KOTRA 해외시장조사', u: 'global-expansion.html#k-market', d: '목표 시장의 바이어·경쟁 동향을 KOTRA 무역관이 조사해 줍니다.' },
        'k-branch':    { t: 'KOTRA 지사화사업', u: 'global-expansion.html#k-branch', d: '해외 무역관이 현지 지사 역할을 대신해 줍니다.' },
        'nationgrade': { t: '국가등급·국별인수방침', u: 'trade-insurance.html#nationgrade', d: '나라별 위험도와 무역보험 인수 방침을 확인합니다.' },
        'exim':        { t: '수출입은행 수출금융', u: 'policy-finance.html?org=exim', d: '수출 실적·계약을 바탕으로 한 수출입은행 대출을 정리했습니다.' },
        'lawsearch':   { t: '법령 길잡이', u: 'https://www.littlestar.co.kr/lawsearch/', ext: true, d: '대외무역법·관세법 등 수출 관련 법령을 쉽게 찾아봅니다.' },
        'customs':     { t: '관세청 유니패스 안내', u: 'global-expansion.html#customs', d: '수출 신고·통관 진행 조회 등 관세청 서비스입니다.' },
        'rnd':         { t: '창업·R&D 지원사업', u: 'government-support.html#rnd', d: '예비창업패키지·TIPS 등 창업 기업용 지원사업입니다.' },
        'hope':        { t: '희망리턴패키지', u: 'government-support.html#hope', d: '소상공인 재기·전환을 돕는 소진공 사업입니다.' },
        'agri':        { t: '농산물 수출 지원', u: 'global-expansion.html#agri', d: '농식품 수출 지원사업과 기관을 정리했습니다.' },
        'ksure-agri':  { t: '농수산물 패키지 보험', u: 'trade-insurance.html#ksure-agri', d: '농수산물 수출에 특화된 단기수출보험입니다.' },
        'at':          { t: 'aT 농식품 수출자금', u: 'policy-finance.html?org=at', d: '농식품 수출업체용 운영·시설 자금입니다.' },
        'cosmetic':    { t: '화장품 수출 지원', u: 'global-expansion.html#cosmetic', d: '화장품 수출 규제·지원 기관을 정리했습니다.' },
        'ksure-service': { t: '서비스보험(일시결제방식)', u: 'trade-insurance.html#ksure-service', d: '서비스·콘텐츠 수출 대금 미회수에 대비하는 무역보험입니다.' }
    };

    // 단계 × 서비스 표(PRD). 2 = 단계 기본 추천(●), 1 = 애로·조건과 겹칠 때 추천(○), 0 = 이 단계 기본 추천 없음
    // 'hard' 는 자격 기준이라 0 인 단계에서는 어떤 경우에도 띄우지 않는다.
    var STAGE_MAP = {
        'k-domestic':  { s: [2, 2, 2, 2, 0, 0], hard: true },
        'semas-innov': { s: [0, 0, 2, 2, 2, 2], hard: true, size: 'smallbiz' },
        'trade-stats': { s: [2, 2, 1, 1, 1, 1] },
        'buyer':       { s: [2, 2, 2, 1, 1, 1] },
        'b2c':         { s: [1, 1, 1, 1, 0, 0] },
        'cert':        { s: [1, 1, 1, 1, 1, 1] },
        'voucher':     { s: [1, 2, 2, 2, 1, 1] },
        'doc-builder': { s: [1, 2, 2, 2, 1, 1] },
        'fraud':       { s: [1, 2, 2, 2, 1, 1] },
        'ksure-dplus': { s: [0, 1, 1, 1, 0, 0] },
        'ksure-plus':  { s: [0, 0, 1, 2, 2, 2] },
        'credit':      { s: [0, 0, 1, 1, 2, 2] },
        'policy-fund': { s: [1, 1, 1, 1, 2, 2] },
        'guarantee':   { s: [0, 0, 1, 1, 2, 2] },
        'fx':          { s: [0, 0, 0, 1, 2, 2] },
        'k-market':    { s: [1, 1, 1, 1, 2, 2] },
        'k-branch':    { s: [0, 0, 1, 1, 2, 2] },
        'exim':        { s: [0, 0, 0, 0, 1, 2] },
        'claim':       { s: [0, 0, 1, 1, 1, 1] }
    };

    // 수출 형태별 참고(결과 화면 아래 작은 묶음)
    var FORM_LINKS = {
        local: ['k-domestic', 'qna-fx'],
        b2c:   ['b2c'],
        b2b:   ['buyer', 'doc-builder'],
        relay: ['ksure-plus', 'claim-exempt'],
        other: []
    };

    var SHORT = {
        q2: { startup: '창업 3년 이내', y7: '창업 7년 이내', y7p: '창업 7년 초과', smallbiz: '소상공인', small: '소기업(소상공인 제외)', medium: '중기업', mid: '중견기업', large: '대기업', etc: '' },
        q1b: { prep: '준비 중', nego: '협상·샘플 진행 중', order: '첫 주문 받음' }
    };

    window.EG_MAP = {
        version: MAP_VERSION,
        stages: STAGES,
        issues: ISSUES,
        issueOrder: ISSUE_ORDER,
        issueHelp: ISSUE_HELP,
        questions: QUESTIONS,
        links: LINKS,
        stageMap: STAGE_MAP,
        formLinks: FORM_LINKS,
        short: SHORT
    };
})();
