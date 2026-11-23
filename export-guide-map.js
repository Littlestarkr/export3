/* =========================================
   수출 가이드 (export-guide.html) — 질문·링크·추천 규칙 데이터
   문구·링크·점수만 고칠 때는 이 파일만 고친다. 고치면 MAP_VERSION 을 1 올린다(시트 '매핑 버전' 열).
   링크는 사이트 안 페이지·칸 id 기준(2026-11-22 확인). 페이지 칸 id 가 바뀌면 여기도 함께 고친다.
   설계: Claude Doc '수출 가이드 PRD'
   ========================================= */
(function () {
    'use strict';

    var MAP_VERSION = 13;

    // 수출실적 7단계(핵심 축). 순서 = 단계 번호(0~6)
    var STAGES = [
        { v: 's0', label: '없음', short: '실적 없음' },
        { v: 's1', label: '1천 달러 미만', short: '1천 달러 미만' },
        { v: 's2', label: '1천 달러 이상 ~ 1만 달러 미만', short: '1천~1만 달러' },
        { v: 's3', label: '1만 달러 이상 ~ 10만 달러 미만', short: '1만~10만 달러' },
        { v: 's4', label: '10만 달러 이상 ~ 100만 달러 미만', short: '10만~100만 달러' },
        { v: 's5', label: '100만 달러 이상 ~ 1천만 달러 미만', short: '100만~1천만 달러' },
        { v: 's6', label: '1천만 달러 이상', short: '1천만 달러 이상' }
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
        tclaim:  '무역클레임(품질·수량·납기 분쟁)이 걱정된다',
        etc:     '기타(찾는 서비스 직접 적기)'
    };
    // '기타'(2026-11-22 작가님): 단계별 목록 맨 끝에 늘 보이고, 고르면 입력칸(100자)이 열린다. 전체 선택에는 넣지 않는다.
    // 적은 글은 아래 낱말과 맞춰 안내한다(소문자로 바꿔 '포함' 여부만 본다). 시트에는 글을 보내지 않고 '기타' 선택 여부만 저장한다.
    var ETC_KEYWORDS = [
        { k: ['전시', '박람회', '엑스포', '상담회', 'expo', 'fair'], ids: ['k-exhib', 'akei'] },
        { k: ['바이어', '거래처', '수입상', '판로', 'buyer'], ids: ['buyer', 'ksight', 'buykorea'] },
        { k: ['시장조사', '시장 조사', '유망시장', '유망 시장'], ids: ['k-market', 'trade-stats'] },
        { k: ['지사'], ids: ['k-branch'] },
        { k: ['보증', '대출', '융자', '자금', '정책자금', '운전자금', '시설자금'], ids: ['policy-fund', 'guarantee', 'kodit', 'kibo'] },
        { k: ['무역진흥자금', '무역협회'], ids: ['kita-fund'] },
        { k: ['수출입은행'], ids: ['exim'] },
        { k: ['보험', '미수', '대금', '떼일', '떼인', '못 받', '못받'], ids: ['ksure-plus', 'claim'] },
        { k: ['신용조사', '신용 조사', '신용도'], ids: ['credit'] },
        { k: ['환율', '환변동', '환리스크', '환 리스크'], ids: ['fx'] },
        { k: ['인증', '규격', '할랄', 'fda', 'ce마크', 'ce 마크'], ids: ['cert'] },
        { k: ['hs', '관세', '통관', 'fta', '원산지'], ids: ['trade-stats', 'customs'] },
        { k: ['법령', '법률', '대외무역법', '관세법'], ids: ['lawsearch'] },
        { k: ['계약'], ids: ['contract'] },
        { k: ['서류', '인보이스', 'invoice', '패킹', '오퍼', '선적통지'], ids: ['doc-builder', 'export-docs'] },
        { k: ['사기', '해킹', '계좌변경', '계좌 변경'], ids: ['fraud'] },
        { k: ['클레임', '분쟁', '중재', '조정'], ids: ['trade-claim', 'kcab'] },
        { k: ['바우처'], ids: ['voucher'] },
        { k: ['창업', 'r&d', '연구개발', '팁스', 'tips'], ids: ['rnd'] },
        { k: ['온라인', '쇼핑몰', '아마존', '역직구', '이커머스', 'b2c'], ids: ['b2c', 'c-more'] },
        { k: ['b2b', '플랫폼'], ids: ['b-b2b', 'buykorea'] },
        { k: ['물류', '배송', '운송', '포워딩', '포워더'], ids: ['c-logi', 'customs'] },
        { k: ['수입보험', '선급금', '원자재 수입'], ids: ['import-ins'] },
        { k: ['채권', '팩토링', '현금화', '유동화', '네고'], ids: ['ksure-postship'] },
        { k: ['농산물', '수산물', '식품', '농식품'], ids: ['agri', 'at'] },
        { k: ['화장품'], ids: ['cosmetic'] },
        { k: ['내수기업', '첫 수출', '처음 수출'], ids: ['k-domestic'] },
        { k: ['최신', '공고', '소식'], ids: ['notices'] }
    ];
    // 단계별로 먼저 보이는 애로(순서대로, 6~9개). 나머지는 '다른 어려움 더 보기'
    // 2026-11-22 작가님: 10만 달러 이상이어도 바이어·시장·인증은 필요 → 1만 달러 이상은 9개를 먼저 보인다
    var ISSUE_ORDER = {
        s0: ['market', 'buyer', 'support', 'cert', 'hs', 'docs'],
        s1: ['buyer', 'docs', 'hs', 'cert', 'support', 'fraud'],
        s2: ['buyer', 'docs', 'collect', 'importer', 'fraud', 'support', 'cert', 'hs'],
        s3: ['buyer', 'collect', 'importer', 'fund', 'market', 'cert', 'docs', 'factoring', 'tclaim'],
        s4: ['buyer', 'market', 'cert', 'collect', 'importer', 'fund', 'factoring', 'fx', 'tclaim'],
        s5: ['buyer', 'market', 'cert', 'fx', 'collect', 'importer', 'factoring', 'tclaim', 'fund'],
        s6: ['buyer', 'market', 'cert', 'fx', 'collect', 'importer', 'factoring', 'tclaim', 'fund']
    };
    var ISSUE_HELP = {
        s0: '어디서부터 시작할지 막막하신가요? 가장 가까운 것을 골라 주세요.',
        s1: '샘플·소량 거래를 정식 거래로 키우는 단계입니다.',
        s2: '거래를 늘리며 서류·대금을 다지는 단계입니다.',
        s3: '바이어가 늘고 외상·자금 문제가 생기는 단계입니다.',
        s4: '규모가 커지며 위험 관리가 필요한 단계입니다.',
        s5: '신시장·대형 거래를 다지는 단계입니다.',
        s6: '대형 거래·글로벌 확장을 관리하는 단계입니다.'
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
            id: 'q3', type: 'multi', title: '어떤 품목인가요?', help: '여러 개를 고를 수 있습니다.',
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
            id: 'q4', type: 'multi', title: '(희망하는) 무역 거래 형태는?', help: '여러 개를 고를 수 있습니다. 원자재·상품을 들여오는 경우 \'수입\'도 골라 주세요.',
            options: [
                { v: 'local', label: '로컬 수출' },
                { v: 'b2c', label: 'B2C 온라인 판매' },
                { v: 'b2b', label: '일반수출(B2B)' },
                { v: 'relay', label: '중계무역' },
                { v: 'import', label: '수입' },
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
            id: 'q6', type: 'multi', title: '지금 어려운 점은 무엇인가요? (복수 선택 가능)', help: '해당하는 것을 모두 골라 주세요.', selectAll: true,
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
            id: 'q8', type: 'multi', optional: true, title: '지금 가장 필요한 것은 무엇인가요?', help: '꼭 답하지 않아도 됩니다. 여러 개 골라도 되고, 건너뛰어도 됩니다.',
            options: [
                { v: 'info', label: '수출 자료·도구' },
                { v: 'market', label: '시장개척·바이어 발굴' },
                { v: 'fund', label: '자금·무역보험·지원사업' },
                { v: 'consult', label: '전문가 상담' }
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
        'ksure-postship': { t: '무보 수출신용보증(선적 후·매입·포괄매입)', u: 'trade-insurance.html#ksure-guarantee', d: '선적을 마친 수출채권을 금융기관에서 미리 현금화할 때 무보가 보증합니다. 선적후 보증은 단기수출보험과 연계해야 합니다.' },
        'ksure-after': { t: '무보 선적 후·대금 회수 상품 한눈에', u: 'policy-finance.html?org=ksure#ksure-after', d: '대금 미회수에 대비하는 보험과 채권 조기 현금화 보증을 함께 정리했습니다.' },
        'trade-claim': { t: '무역클레임 대응 가이드', u: 'trade-claim.html#matrix', d: '클레임 접수 직후의 무료 자문부터 알선·조정, 미수채권 추심, 회수불능 확인까지 상황별로 찾아갈 곳을 정리했습니다.' },
        'kcab':        { t: '대한상사중재원(중재·조정)', u: 'https://www.kcab.or.kr/', d: '무역클레임이 당사자 합의로 풀리지 않을 때 상사중재·조정을 신청하는 기관입니다. 절차·비용은 공식 사이트에서 확인하세요.', ext: true },
        'law-adr':     { t: '중재·분쟁해결 법령·규칙', u: 'export-docs.html#law-adr', d: '무역클레임이 분쟁으로 번질 때 참고할 중재법·국제 중재 규칙 링크를 모았습니다.' },
        'claim':       { t: '보상절차·면책사례', u: 'trade-insurance.html#claim', d: '사고가 났을 때의 절차와 보험금을 못 받는 사례를 정리했습니다.' },
        'claim-exempt':{ t: '면책사례(중계무역 조달 차질 등)', u: 'trade-insurance.html#claim-exempt', d: '중계무역 등에서 자주 생기는 면책 사례를 정리했습니다.' },
        'kosmes-dom':  { t: '중진공 신시장진출지원자금(내수기업 수출기업화)', u: 'policy-finance.html?org=kosmes#kosmes-export', d: '최근 1년 직·간접 수출실적 10만 달러 미만인 수출 초보기업 등이 대상인 정책자금입니다(수출지원사업 참여기업 등도 포함). 한도·금리·세부 요건은 중진공 융자계획 공고를 확인하세요.' },
        'kosmes-glb':  { t: '중진공 신시장진출지원자금(수출기업 글로벌화)', u: 'policy-finance.html?org=kosmes#kosmes-export', d: '최근 1년 직·간접 수출실적 10만 달러 이상인 수출 유망기업 등이 대상인 정책자금입니다. 한도·금리·세부 요건은 중진공 융자계획 공고를 확인하세요.' },
        'policy-fund': { t: '정책자금 안내', u: 'policy-finance.html?org=kosmes', d: '기관별 정책자금의 대상·한도·금리를 정리했습니다.' },
        'guarantee':   { t: '무보 수출신용보증(선적 전)', u: 'trade-insurance.html#guarantee', d: '수출 계약을 근거로 생산·선적 전 자금을 빌릴 때 무보가 보증합니다. 보증 한도·요건은 무보 안내를 확인하세요.' },
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
        'ksure-service': { t: '서비스보험(일시결제방식)', u: 'trade-insurance.html#ksure-service', d: '서비스·콘텐츠 수출 대금 미회수에 대비하는 무역보험입니다.' },
        // 후순위 '더 찾아볼 곳'(2026-11-22 작가님): 자금·바이어·무역보험을 고르면 관련 기관을 모두 아래쪽에 보여 준다
        'kodit':       { t: '신용보증기금 보증', u: 'policy-finance.html?org=kodit#kodit-grow', d: '성장단계별 보증 중 수출중소기업 종합지원(희망·진입·확장·주력·스타 단계) 등 수출 우대 보증이 있습니다. 단계 기준·한도는 신보 공고를 확인하세요.' },
        'kibo':        { t: '기술보증기금 수출기업보증', u: 'policy-finance.html?org=kibo#kibo-export', d: '기술혁신선도형 수출기업에 보증비율·보증료를 우대합니다. 대상 요건은 기보 공고를 확인하세요.' },
        'seoul-shinbo':{ t: '지역신용보증재단(서울신용보증재단)', u: 'policy-finance.html?org=seoul', d: '사이트에는 서울신용보증재단 보증상품을 연결해 두었습니다. 다른 지역 기업은 소재지의 신용보증재단 공고를 확인하세요.' },
        'kita-fund':   { t: '무역협회 무역진흥자금', u: 'policy-finance.html?org=kita#kita-fund', d: '회비를 완납한 무역협회 회원사(전년도 수출실적 2천만 달러 이하)에 수출마케팅·수출이행 자금을 은행을 통해 융자합니다. 신청 시기는 협회 안내를 확인하세요.' },
        'ksure-direct':{ t: '무보 수출신용보증(다이렉트-선적전)', u: 'trade-insurance.html#ksure-direct', d: '수출초보 중소기업이 온라인으로 보증·대출을 받는 상품입니다. 매출·신용등급·직수출실적 기준은 무보 안내를 확인하세요.' },
        'ksight':      { t: 'K-SIGHT·트라이빅 바이어 검색', u: 'global-expansion.html#b-search', d: '무보 K-SIGHT와 KOTRA 트라이빅으로 해외 바이어 정보를 찾아봅니다.' },
        'b-data':      { t: '무역데이터로 바이어 찾기(Trade Map·트레이드잇)', u: 'global-expansion.html#b-data', d: '실제 수입 실적·수입국 통계로 바이어와 시장을 찾습니다.' },
        'b-b2b':       { t: '온라인 B2B 플랫폼', u: 'global-expansion.html#b-b2b', d: '해외 바이어를 만나는 온라인 B2B 플랫폼을 모았습니다.' },
        'buykorea':    { t: 'KOTRA 바이코리아', u: 'global-expansion.html#k-buykorea', d: 'KOTRA의 온라인 수출 플랫폼입니다.' },
        'k-exhib':     { t: 'KOTRA 해외전시회', u: 'global-expansion.html#k-exhib', d: '해외전시회 참가 지원 사이트로 연결합니다. 모집 일정은 공고를 확인하세요.' },
        'akei':        { t: '한국전시산업진흥원', u: 'global-expansion.html#exhibit', d: '국내외 전시회 정보를 찾아봅니다.' },
        'b-potential': { t: 'KOTRA 잠재바이어 발굴', u: 'global-expansion.html#b-potential', d: 'KOTRA 해외무역관이 잠재 바이어를 대신 찾아 주는 유료 대행 서비스입니다.' },
        'k-bts':       { t: 'KOTRA 바이어 트래킹', u: 'global-expansion.html#k-bts', d: 'KOTRA로 알게 된 바이어와의 교신을 무역관이 대신 도와줍니다(KOTRA 기업 회원 대상).' },
        'k-aitc':      { t: 'KOTRA AI무역지원센터', u: 'global-expansion.html#k-aitc', d: 'AI 수출상품 콘텐츠 제작·바이코리아 등록·수출 상담을 무료로 지원하는 전국 센터입니다.' },
        'c-more':      { t: 'B2C 역직구 기관·민간 추가 지원', u: 'global-expansion.html#c-more', d: 'KOTRA·중진공·aT·무역협회·지자체의 온라인 판매 지원을 모았습니다. 사업 내용은 해마다 공고를 확인하세요.' },
        'ksure-group': { t: '단기수출보험(단체보험)', u: 'trade-insurance.html#ksure-group', d: '지자체·협회 등이 단체로 가입하고 보험료를 대신 내 주는 수출대금 미회수 보험입니다. 가입 여부·보상 한도는 지자체마다 다릅니다.' },
        'ins-support': { t: '무역보험 보험료 지원사업', u: 'trade-insurance.html#support', d: '보험료 지원사업 공고는 무보 홈페이지 게시판에서 확인합니다.' },
        'kon':         { t: 'K-SURE ON(온라인 무역보험)', u: 'trade-insurance.html#kon', d: '무역보험 신청과 조회를 온라인으로 합니다.' },
        'qna-f':       { t: '단기수출보험 Q&A', u: 'trade-insurance.html#qna-f', d: '보험 한도·수출 통지 등 자주 묻는 질문입니다.' },
        'import-ins':  { t: '수입보험', u: 'trade-insurance.html#import', d: '주요 자원·시설재 등을 수입하며 선급금을 먼저 낼 때(수입자용)나 수입자금을 빌릴 때(금융기관용) 대비하는 무보 보험입니다. 대상 품목이 정해져 있으니 지원물품을 확인하세요.' },
        'c-logi':      { t: 'B2C 물류·통관·결제', u: 'global-expansion.html#c-logi', d: '해외 배송·통관·결제 방법을 정리했습니다.' },
        'fxinfo':      { t: '환율 정보', u: 'trade-insurance.html#fxinfo', d: '무보 환변동보험 홈페이지의 환율 정보로 연결합니다.' },
        'roadmap':     { t: '수출 5단계 로드맵', u: 'export-roadmap.html', d: '' },
        'notices':     { t: '핫이슈(최신 공고·수출 소식)', u: 'notices.html', d: '' },
        'ins-cases':   { t: '무역보험 활용사례', u: 'trade-insurance.html#cases', d: '' },
        'k-cases':     { t: 'KOTRA 활용사례', u: 'global-expansion.html#k-cases', d: '' }
    };

    // 단계 × 서비스 표(PRD). 2 = 단계 기본 추천(●), 1 = 애로·조건과 겹칠 때 추천(○), 0 = 이 단계 기본 추천 없음
    // 'hard' 는 자격 기준이라 0 인 단계에서는 어떤 경우에도 띄우지 않는다.
    var STAGE_MAP = {
        'k-domestic':  { s: [2, 2, 2, 2, 0, 0, 0], hard: true },
        'semas-innov': { s: [0, 0, 2, 2, 2, 2, 2], hard: true, size: 'smallbiz' },
        'trade-stats': { s: [2, 2, 1, 1, 1, 1, 1] },
        'buyer':       { s: [2, 2, 2, 1, 1, 1, 1] },
        'b2c':         { s: [1, 1, 1, 1, 0, 0, 0] },
        'cert':        { s: [1, 1, 1, 1, 1, 1, 1] },
        'voucher':     { s: [1, 2, 2, 2, 1, 1, 1] },
        'doc-builder': { s: [1, 2, 2, 2, 1, 1, 1] },
        'fraud':       { s: [1, 2, 2, 2, 1, 1, 1] },
        'ksure-dplus': { s: [0, 1, 1, 1, 0, 0, 0] },
        'ksure-plus':  { s: [0, 0, 1, 2, 2, 2, 2] },
        'credit':      { s: [0, 0, 1, 1, 2, 2, 2] },
        'policy-fund': { s: [1, 1, 1, 1, 2, 2, 2] },
        'guarantee':   { s: [0, 0, 1, 1, 2, 2, 2] },
        'fx':          { s: [0, 0, 0, 1, 2, 2, 2] },
        'k-market':    { s: [1, 1, 1, 1, 2, 2, 2] },
        'k-branch':    { s: [0, 0, 1, 1, 2, 2, 2] },
        'exim':        { s: [0, 0, 0, 0, 1, 2, 2] },
        'claim':       { s: [0, 0, 1, 1, 1, 1, 1] }
    };

    // 고른 항목에 맞는 지원사업(작가님 2026-11-22): 수출실적 단계(st)에서 대상이 될 수 있고, 고른 항목(on)과 하나라도 겹치면 개수 제한 없이 모두 보여 준다.
    // st 는 확인된 자격 기준만 반영한다(KOTRA 내수기업 수출기업화: 전년도 통관 10만 달러 미만, 작가님 확인 / 중진공 신시장진출지원자금: 최근 1년 직·간접 10만 달러 경계, 중진공 정책자금 기초 가이드 / 소진공 혁신성장촉진자금(혁신형): 수출 소상공인 1천 달러 이상, 작가님 확인).
    // 확인 못 한 사업은 전 단계(ALL)로 두고 설명에 '공고 확인'을 적는다. on: 애로(Q6) 코드, 'need:' 필요(Q8), 'form:' 수출 형태(Q4), 'item:' 품목(Q3)
    var ALL = [0, 1, 2, 3, 4, 5, 6];
    var PROGRAMS = [
        { id: 'k-domestic', st: [0, 1, 2, 3], on: ['buyer', 'market', 'support', 'need:market', 'need:fund', 'form:local'] },
        { id: 'kosmes-dom', st: [0, 1, 2, 3], on: ['fund', 'support', 'need:fund'] },
        { id: 'kosmes-glb', st: [4, 5, 6], on: ['fund', 'support', 'need:fund'] },
        { id: 'semas-innov', st: [2, 3, 4, 5, 6], size: 'smallbiz', on: ['fund', 'support', 'need:fund'] },
        // 무보 수출신용보증(작가님 2026-11-22: 실적 크기와 상관없이 자금을 고르면 추천). 보증 요건은 무역보험 페이지·무보 공고 확인
        { id: 'guarantee', st: ALL, on: ['fund', 'need:fund'] },
        { id: 'ksure-postship', st: ALL, on: ['fund', 'factoring', 'need:fund'] },
        { id: 'voucher', st: ALL, on: ['support', 'buyer', 'market', 'cert', 'need:market', 'need:fund'] },
        { id: 'k-market', st: ALL, on: ['buyer', 'market', 'need:market'] },
        { id: 'k-branch', st: ALL, on: ['buyer', 'market', 'need:market'] },
        { id: 'at', st: ALL, item: 'agri', on: ['fund', 'support', 'need:fund'] },
        { id: 'rnd', st: ALL, age: ['startup', 'y7'], on: ['support', 'fund', 'need:fund'] }
    ];

    // 후순위 '더 찾아볼 곳'(2026-11-22 작가님): 묶음의 on 과 고른 항목이 겹치면 묶음 안 기관을 모두 아래쪽에 보여 준다(위에서 이미 나온 곳은 뺀다).
    // 항목별 on 이 있으면 그 항목은 그 조건일 때만, st 가 있으면 그 수출실적 단계에서만 보인다. 'pay:' 는 결제 방식(Q7)
    var EXTRA = [
        { t: '자금·보증 기관', on: ['fund', 'need:fund'],
          items: [{ id: 'policy-fund' }, { id: 'guarantee' }, { id: 'kodit' }, { id: 'kibo' }, { id: 'seoul-shinbo' }, { id: 'kita-fund' }, { id: 'ksure-direct', st: [3, 4, 5, 6] }, { id: 'exim' }] },
        { t: '바이어 발굴·판로', on: ['buyer', 'market', 'need:market', 'form:b2b', 'form:b2c'],
          items: [{ id: 'buyer' }, { id: 'ksight' }, { id: 'b-data' }, { id: 'k-exhib' }, { id: 'akei' }, { id: 'buykorea' }, { id: 'b-b2b' }, { id: 'b-potential' }, { id: 'k-bts' }, { id: 'k-aitc' }, { id: 'b2c' }, { id: 'c-more' }] },
        { t: '무역보험 이용', on: ['collect', 'importer', 'factoring', 'tclaim', 'need:fund', 'pay:deferred', 'pay:collection', 'form:relay', 'form:import'],
          items: [{ id: 'ksure-group', st: [0, 1, 2] }, { id: 'ins-support' }, { id: 'kon' }, { id: 'qna-f' }, { id: 'import-ins', on: ['form:relay', 'form:import'] }] },
        { t: '환율', on: ['fx'], items: [{ id: 'fxinfo' }] }
    ];
    // 결과 맨 아래 고정 줄
    var FOOT_LINKS = ['roadmap', 'notices', 'ins-cases', 'k-cases'];

    // 수출 5단계 로드맵(export-roadmap.html) 연결 (2026-11-22, PRD '5단계 수출 실행 로드맵 페이지 PRD' 6장)
    // 실적 구간은 '규모', 로드맵 단계는 '거래 순서'라 1:1이 아니다. 먼저 볼 단계만 추천하고, 고른 어려움의 단계를 함께 보여 준다.
    var ROADMAP = {
        url: 'export-roadmap.html',
        names: ['', '수출 준비도 점검', '바이어 발굴', '거래조건 검토', '금융·보험 설계', '선적·대금 회수·사후관리'],
        // 실적 구간 → 먼저 볼 단계. s0 은 진행 거래(q1b)가 협상·첫 주문이면 3단계
        stage: { s0: 1, s1: 2, s2: 2, s3: 3, s4: 4, s5: 4, s6: 4 },
        s0Deal: { nego: 3, order: 3 },
        // 어려운 점(Q6) → 관련 단계
        issue: { market: 1, cert: 1, hs: 1, support: 1, buyer: 2, docs: 3, importer: 3, fraud: 3, tclaim: 3, fund: 4, collect: 4, factoring: 4, fx: 4 }
    };

    // 수출 형태별 참고(결과 화면 아래 작은 묶음)
    var FORM_LINKS = {
        local: ['k-domestic', 'qna-fx'],
        b2c:   ['b2c'],
        b2b:   ['buyer', 'doc-builder'],
        relay: ['ksure-plus', 'claim-exempt'],
        import: ['import-ins', 'customs', 'trade-stats'],
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
        programs: PROGRAMS,
        etcKeywords: ETC_KEYWORDS,
        extra: EXTRA,
        footLinks: FOOT_LINKS,
        roadmap: ROADMAP,
        stageMap: STAGE_MAP,
        formLinks: FORM_LINKS,
        short: SHORT
    };
})();
