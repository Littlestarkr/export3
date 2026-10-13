/*
 * 정책자금·수출금융 상품 데이터 (policy-finance.html 에서 사용)
 *
 * 수정 방법: 아래 PF_PRODUCTS 배열의 항목을 고치거나 추가하면 페이지에 바로 반영된다.
 *
 * 필드 설명
 *  org      기관 그룹 id (PF_ORGS 참고)
 *  by       카드에 표시할 기관명 (신보/기보처럼 한 그룹에 여러 기관이 있을 때 구분)
 *  method   direct 직접대출 | proxy 대리대출 | guarantee 보증 | subsidy 이차보전 | insurance 보험 | bank 은행 경유
 *  purpose  working 운전 | facility 시설 | export 수출이행·무역금융 | guarantee 신용보증 | insurance 무역보험
 *  size     이 상품이 열려 있는 가장 큰 기업 규모: micro 소상공인 | small 소기업 | sme 중소기업
 *           (소상공인은 소기업·중소기업이기도 하므로, 소상공인을 선택하면 모든 상품이 보인다)
 *  exp      수출실적 요건 [최소 USD, 최대 USD]. 최대가 null이면 상한 없음. 요건이 없으면 exp: null
 *  verify   자료마다 수치가 달라 공식 공고 확인이 필요한 경우 그 사유 (카드에 '확인 필요' 표시)
 */

const PF_AS_OF = "2026년 10월";

const PF_ORGS = [
  { id: "semas", name: "소상공인시장진흥공단", short: "소진공", url: "https://ols.semas.or.kr",
    desc: "업력·매출 규모가 작은 소상공인·소공인을 위한 직접·대리 대출" },
  { id: "regional", name: "지역신용보증재단", short: "지역신보", url: "https://www.koreg.or.kr",
    desc: "담보력이 부족한 소기업·소상공인에게 보증서를 발급해 은행 대출을 연결" },
  { id: "kosmes", name: "중소벤처기업진흥공단", short: "중진공", url: "https://www.kosmes.or.kr",
    desc: "기술성·사업성 평가로 중소기업에 직접 융자하고 이자를 지원" },
  { id: "guarantee", name: "신용보증기금·기술보증기금", short: "신보·기보", url: "https://www.kodit.co.kr",
    desc: "수출 실적과 기술력에 따라 보증비율·보증료를 우대하는 수출 단계별 보증" },
  { id: "ksure", name: "한국무역보험공사", short: "무보", url: "https://www.ksure.or.kr",
    desc: "수출신용보증·다이렉트 보증대출·수출보험으로 대금 회수 위험과 자금 조달을 동시에 해결" },
  { id: "exim", name: "한국수출입은행", short: "수은", url: "https://www.koreaexim.go.kr",
    desc: "수출계약 이행·해외 시장 진출에 필요한 자금을 직접 대출하고 이행성 보증 제공" },
  { id: "bank", name: "무역협회·한국은행·금융기관", short: "금융기관", url: "https://www.kita.net",
    desc: "협회 추천 융자와 한국은행 무역금융 등 금융기관을 경유하는 수출 자금" }
];

const PF_TAGS = [
  { id: "export1k", label: "#수출1천불이상" },
  { id: "newexporter", label: "#수출초보" },
  { id: "lowcredit", label: "#저신용가능" },
  { id: "fixed", label: "#고정금리" },
  { id: "online", label: "#비대면대출" },
  { id: "full100", label: "#100%보증" },
  { id: "youth", label: "#청년" },
  { id: "restart", label: "#재기·재창업" },
  { id: "startup", label: "#창업초기" },
  { id: "interest", label: "#이자지원" },
  { id: "smart", label: "#스마트·친환경" },
  { id: "risk", label: "#수출리스크관리" }
];

const PF_PRODUCTS = [
  /* ───────── 소상공인시장진흥공단 ───────── */
  {
    id: "semas-innov-export", org: "semas", by: "소진공",
    name: "혁신성장 촉진자금 (혁신형)",
    summary: "소액이라도 수출실적이 있는 소상공인을 위한 직접융자",
    method: "direct", purpose: ["working", "facility"], size: "micro", exp: [1000, null],
    target: "최근 1년 이내 직·간접 수출실적 1,000불 이상인 수출 소상공인, 스마트공장 도입 기업, 매출 10% 이상 신장 기업 등",
    limit: "운전 최대 2억 원 / 시설 최대 10억 원",
    rate: "정책자금 기준금리 + 0.4%p",
    term: "운전 5년(2년 거치) / 시설 8년(3년 거치)",
    notes: "수출실적이 1,000불 이상이면 신청할 수 있어 수출을 막 시작한 소상공인에게 진입 장벽이 낮다. 소진공이 직접 대출한다.",
    tags: ["export1k", "newexporter"],
    verify: "일부 자료에는 가산금리가 +0.2%p(연 3.16%)로 표기돼 있어 최신 공고 확인이 필요하다."
  },
  {
    id: "semas-innov-general", org: "semas", by: "소진공",
    name: "혁신성장 촉진자금 (일반형)",
    summary: "창업사관학교 수료생·스마트기술 도입 소상공인 직접융자",
    method: "direct", purpose: ["working", "facility"], size: "micro", exp: null,
    target: "신사업창업사관학교 수료생, 스마트기술 도입 소상공인 등",
    limit: "운전 최대 1억 원 / 시설 최대 5억 원",
    rate: "정책자금 기준금리 + 0.4%p",
    term: "운전 5년(2년 거치) / 시설 8년(3년 거치)",
    notes: "혁신형과 기간은 같고 한도가 낮다.",
    tags: ["smart"]
  },
  {
    id: "semas-craft-general", org: "semas", by: "소진공",
    name: "소공인 특화자금 (일반형)",
    summary: "제조업 소공인을 위한 대리대출",
    method: "proxy", purpose: ["working", "facility"], size: "micro", exp: null,
    target: "업력과 무관하게 제조업을 영위하는 상시근로자 10인 미만 소공인",
    limit: "운전 1억 원 / 시설 5억 원 이내",
    rate: "정책자금 기준금리 + 0.6%p (연 3.56% 수준, 자료 정리 시점)",
    term: "운전 5년(2년 거치) / 시설 8년(3년 거치)",
    notes: "금융기관을 통한 대리대출 방식이다."
  },
  {
    id: "semas-craft-promising", org: "semas", by: "소진공",
    name: "소공인 특화자금 (유망형)",
    summary: "백년소공인 등 우수 소공인 직접대출",
    method: "direct", purpose: ["working", "facility"], size: "micro", exp: null,
    target: "소공인특화지원 참여기업, 백년소공인",
    limit: "운전 2억 원 / 시설 10억 원 이내",
    rate: "정책자금 기준금리 + 0.4%p",
    term: "운전 5년(2년 거치) / 시설 8년(3년 거치)",
    notes: "일반형보다 금리·한도가 우대된다."
  },
  {
    id: "semas-general", org: "semas", by: "소진공",
    name: "일반경영 안정자금",
    summary: "업력과 무관하게 받을 수 있는 운전자금 대리대출",
    method: "proxy", purpose: ["working"], size: "micro", exp: null,
    target: "업력과 무관한 일반 소상공인",
    limit: "연간 7천만 원",
    rate: "정책자금 기준금리 + 0.6%p",
    term: "5년(2년 거치)",
    notes: "소상공인 정책자금의 가장 기본이 되는 운전자금이다."
  },
  {
    id: "semas-emergency-disaster", org: "semas", by: "소진공",
    name: "긴급경영 안정자금 (재해피해)",
    summary: "재해 피해 소상공인 고정금리 직접대출",
    method: "direct", purpose: ["working"], size: "micro", exp: null,
    target: "지자체에서 재해확인증을 발급받은 소상공인",
    limit: "최대 1억 원",
    rate: "연 2.0% 고정금리",
    term: "5년(2년 거치)",
    tags: ["fixed"]
  },
  {
    id: "semas-emergency-temp", org: "semas", by: "소진공",
    name: "긴급경영 안정자금 (일시적 경영애로)",
    summary: "일시적 경영난을 겪는 소규모 사업자 직접대출",
    method: "direct", purpose: ["working"], size: "micro", exp: null,
    target: "연매출 1억 4천만 원 미만, 업력 7년 미만으로 일시적 경영애로를 겪는 소상공인",
    limit: "7천만 원",
    rate: "정책자금 기준금리",
    term: "5년(2년 거치)"
  },
  {
    id: "semas-lowcredit", org: "semas", by: "소진공",
    name: "신용취약 소상공인 자금",
    summary: "중·저신용 소상공인을 위한 직접대출",
    method: "direct", purpose: ["working"], size: "micro", exp: null,
    target: "소상공인 지식배움터의 신용관리 교육을 사전 이수한 NCB 839점 이하 중·저신용 소상공인",
    limit: "최대 3천만 원",
    rate: "정책자금 기준금리 + 1.6%p (연 4.56% 수준, 자료 정리 시점)",
    term: "5년(2년 거치)",
    notes: "교육 이수가 선행 조건이다.",
    tags: ["lowcredit"]
  },
  {
    id: "semas-refi-general", org: "semas", by: "소진공",
    name: "대환대출 (일반형)",
    summary: "7% 이상 고금리 대출을 낮은 고정금리로 갈아타기",
    method: "direct", purpose: ["working"], size: "micro", exp: null,
    target: "은행권·비은행권에 7% 이상 고금리 대출을 보유한 중·저신용 소상공인",
    limit: "5천만 원",
    rate: "연 4.5% 고정금리",
    term: "최장 10년 (비거치)",
    tags: ["lowcredit", "fixed"],
    verify: "대출 취급 방식(직접·대리)이 자료에 명시되지 않아 공고 확인이 필요하다."
  },
  {
    id: "semas-refi-grace", org: "semas", by: "소진공",
    name: "대환대출 (거치형)",
    summary: "거치기간이 있는 고금리 대환대출",
    method: "direct", purpose: ["working"], size: "micro", exp: null,
    target: "일반형과 같은 고금리 대출 보유 중·저신용 소상공인",
    limit: "5천만 원",
    rate: "연 4.5% 고정금리",
    term: "10년(2년 거치) 또는 5년(2년 거치)",
    tags: ["lowcredit", "fixed"],
    verify: "대출 취급 방식(직접·대리)이 자료에 명시되지 않아 공고 확인이 필요하다."
  },
  {
    id: "semas-retry-hope", org: "semas", by: "소진공",
    name: "재도전 특별자금 (희망형)",
    summary: "재기사업화를 마친 소상공인의 재도전 자금",
    method: "direct", purpose: ["working"], size: "micro", exp: null,
    target: "희망리턴패키지 재기사업화를 완료한 소상공인",
    limit: "최대 1억 원",
    rate: "정책자금 기준금리 + 0.6%p",
    term: "5년(2년 거치)",
    tags: ["restart"],
    verify: "재창업(준비) 단계 일반형을 7천만 원(+1.6%p)으로 안내한 자료도 있어 한도·금리 확인이 필요하다."
  },
  {
    id: "semas-retry-leap", org: "semas", by: "소진공",
    name: "재도전 특별자금 (도약형)",
    summary: "재창업 후 성장하는 성실상환 소상공인 우대",
    method: "direct", purpose: ["working"], size: "micro", exp: null,
    target: "재창업 후 업력 2년 이상이며 매출 증가 등 성장이 인정되는 성실상환 소상공인",
    limit: "최대 2억 원",
    rate: "정책자금 기준금리 + 0.4%p",
    term: "5년(2년 거치)",
    tags: ["restart"]
  },
  {
    id: "semas-youth", org: "semas", by: "소진공",
    name: "청년고용 연계자금",
    summary: "청년 대표 또는 청년 근로자를 고용한 소상공인",
    method: "proxy", purpose: ["working"], size: "micro", exp: null,
    target: "만 39세 이하 청년대표이거나 청년 근로자를 고용한 소상공인",
    limit: "7천만 원",
    rate: "정책자금 기준금리",
    term: "5년(2년 거치)",
    tags: ["youth"]
  },
  {
    id: "semas-disabled", org: "semas", by: "소진공",
    name: "장애인기업 지원자금",
    summary: "장애인 기업 대상 고정금리 자금",
    method: "direct", purpose: ["working"], size: "micro", exp: null,
    target: "장애인복지카드 또는 장애인기업확인서를 소지한 소상공인",
    limit: "최대 1억 원",
    rate: "연 2.0% 고정금리",
    term: "최장 7년(2년 거치)",
    tags: ["fixed"],
    verify: "대출 취급 방식(직접·대리)이 자료에 명시되지 않아 공고 확인이 필요하다."
  },
  {
    id: "semas-win-general", org: "semas", by: "소진공",
    name: "상생성장 지원자금 (일반형)",
    summary: "TOPS 프로그램 선정 소상공인 운전자금",
    method: "direct", purpose: ["working"], size: "micro", exp: null,
    target: "TOPS 프로그램 1단계에 선정된 소상공인",
    limit: "연간 7천만 원 (운전)",
    rate: "정책자금 기준금리 + 0.4%p",
    term: "5년(2년 거치)"
  },
  {
    id: "semas-win-growth", org: "semas", by: "소진공",
    name: "상생성장 지원자금 (성장형)",
    summary: "온라인 플랫폼 입점 소상공인 성장자금",
    method: "direct", purpose: ["working", "facility"], size: "micro", exp: null,
    target: "소진공과 협약을 맺은 온라인 플랫폼에 입점한 소상공인 등",
    limit: "운전 1억 원 / 시설 5억 원",
    rate: "정책자금 기준금리 + 0.4%p",
    term: "공고 확인 (자료에 기간 미기재)"
  },
  {
    id: "semas-win-leap", org: "semas", by: "소진공",
    name: "상생성장 지원자금 (도약형)",
    summary: "Post-TOPS 선정 소상공인 도약자금",
    method: "direct", purpose: ["working", "facility"], size: "micro", exp: null,
    target: "Post-TOPS 프로그램에 선정된 소상공인",
    limit: "운전 2억 원 / 시설 10억 원",
    rate: "정책자금 기준금리 + 0.4%p",
    term: "공고 확인 (자료에 기간 미기재)"
  },
  {
    id: "semas-private-match", org: "semas", by: "소진공",
    name: "민간투자 연계형 매칭융자",
    summary: "민간 투자를 받은 소상공인에게 투자금의 최대 5배 융자",
    method: "direct", purpose: ["working", "facility"], size: "micro", exp: null,
    target: "민간 투자기관의 투자를 받고 추천서를 발급받은 소상공인",
    limit: "민간투자금의 최대 5배 또는 5억 원 중 낮은 금액",
    rate: "정책자금 기준금리 + 0.4%p",
    term: "8년(3년 거치)"
  },

  /* ───────── 지역신용보증재단 ───────── */
  {
    id: "reg-export-micro", org: "regional", by: "지역신보",
    name: "수출유망 소상공인 지원 특례보증",
    summary: "수출실적이 있는 소상공인의 운전자금 보증",
    method: "guarantee", purpose: ["working", "guarantee"], size: "micro", exp: [1, null],
    target: "중기부 선정 ‘수출 두드림 기업’이거나 신용평점 710점 이상이면서 당기 또는 최근 1년 이내 수출실적을 보유한 소상공인",
    limit: "운전자금 최대 7천만 원",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)",
    tags: ["newexporter"]
  },
  {
    id: "reg-export-general", org: "regional", by: "지역신보",
    name: "일반 수출기업 지원 특례보증",
    summary: "수출실적이 있는 소기업의 보증",
    method: "guarantee", purpose: ["working", "guarantee"], size: "small", exp: [1, null],
    target: "대표자 신용평점 710점 이상이며 당기 또는 최근 1년 이내 직·간접 수출실적을 보유한 중소기업",
    limit: "본건 2억 원 이내",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)",
    tags: ["newexporter"]
  },
  {
    id: "reg-stable", org: "regional", by: "지역신보",
    name: "소기업·소상공인 경영안정지원 협약보증",
    summary: "17개 지역신보의 대표 운전자금 보증",
    method: "guarantee", purpose: ["working", "guarantee"], size: "small", exp: null,
    target: "일반 소기업·소상공인 (사업자등록 후 1년 경과, 대표자 신용평점 745점 이상인 가동 중 기업)",
    limit: "최대 2억 원",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)",
    verify: "자료에 따라 한도가 2억 원 또는 업체당 2,850만 원으로 달라 한도·요건 확인이 필요하다."
  },
  {
    id: "reg-general", org: "regional", by: "지역신보",
    name: "지역신용보증 일반보증",
    summary: "담보력이 부족한 소기업·소상공인의 기본 보증",
    method: "guarantee", purpose: ["working", "facility", "guarantee"], size: "small", exp: null,
    target: "담보력이 부족한 소상공인과 소기업",
    limit: "일반 8억 원 / 우수기업 30억 원",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)",
    verify: "우수기업 한도 등 세부 기준이 자료에 간략히만 나와 있어 확인이 필요하다."
  },
  {
    id: "reg-entrepreneur", org: "regional", by: "지역신보",
    name: "기업가형 소상공인 보증",
    summary: "로컬 크리에이터·백년가게 등 선정 기업 우대",
    method: "guarantee", purpose: ["working", "guarantee"], size: "micro", exp: null,
    target: "로컬 크리에이터, 강한 소상공인, 백년가게 등 정부 지원사업에 선정된 유망 소상공인",
    limit: "업체당 최대 4억 원",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)"
  },
  {
    id: "reg-pre-entrepreneur", org: "regional", by: "지역신보",
    name: "예비 기업가형 소상공인 보증",
    summary: "창업사관학교 수료 후 사업화 자금을 받은 기업",
    method: "guarantee", purpose: ["working", "guarantee"], size: "micro", exp: null,
    target: "신사업창업사관학교를 수료하고 사업화 자금을 받은 기업 중 현재 영업 중인 기업",
    limit: "업체당 최대 2억 원",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)",
    tags: ["startup"]
  },
  {
    id: "reg-kb", org: "regional", by: "지역신보",
    name: "KB소상공인컨설팅 금융지원 협약보증",
    summary: "국민은행 컨설팅을 수료한 소상공인 보증",
    method: "guarantee", purpose: ["working", "guarantee"], size: "small", exp: null,
    target: "국민은행 컨설팅을 수료한 소기업·소상공인",
    limit: "재단보증금액 1억 원 이내",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)"
  },
  {
    id: "reg-growth", org: "regional", by: "지역신보",
    name: "소상공인 성장촉진 보증대출",
    summary: "성장 가능성이 높은 소기업 대상 보증",
    method: "guarantee", purpose: ["working", "guarantee"], size: "small", exp: null,
    target: "신용평점 710점 이상, 업력 1년 이상이며 경쟁력 강화 체크리스트 요건을 충족한 성장유망 소기업",
    limit: "5천만 원 이내",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)"
  },
  {
    id: "reg-merchant", org: "regional", by: "지역신보",
    name: "가맹점 우대 보증",
    summary: "온누리상품권·제로페이 가맹점 우대 보증",
    method: "guarantee", purpose: ["working", "guarantee"], size: "micro", exp: null,
    target: "디지털 온누리상품권 또는 제로페이 가맹점 등 (영업·재무상황 평가)",
    limit: "4,500만 원 이내",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)"
  },

  /* ───────── 중소벤처기업진흥공단 ───────── */
  {
    id: "kosmes-domestic-to-export", org: "kosmes", by: "중진공",
    name: "내수기업 수출기업화 자금",
    summary: "수출을 처음 시작하는 내수기업을 위한 직접융자",
    method: "direct", purpose: ["working"], size: "sme", exp: [0, 99999],
    target: "전년도 수출실적 10만 불 미만인 초보 수출기업 (내수기업 포함)",
    limit: "연간 10억 원 이내 (운전자금)",
    rate: "정책자금 기준금리 또는 고정금리(2%대)",
    term: "5년(2년 거치)",
    notes: "공단 보증서 없이 기술·사업성 평가만으로 직접 융자해 수출기업의 선호도가 높다.",
    tags: ["newexporter"]
  },
  {
    id: "kosmes-global-direct", org: "kosmes", by: "중진공",
    name: "수출기업 글로벌화 자금 (직접대출)",
    summary: "수출 10만 불 이상 기업의 설비·운영자금",
    method: "direct", purpose: ["working", "facility"], size: "sme", exp: [100000, null],
    target: "전년도 수출실적 10만 불 이상인 중소기업 (100만 불 이상 등 수출 고성장기업은 우대)",
    limit: "연간 30억 원(운전자금 10억 원 한도), 수출 고성장기업 최대 60억 원",
    rate: "정책자금 기준금리",
    term: "운전 5년(2년 거치) / 시설 10년"
  },
  {
    id: "kosmes-global-subsidy", org: "kosmes", by: "중진공",
    name: "수출기업 글로벌화 자금 (이차보전)",
    summary: "시중은행 대출 이자를 최대 3%까지 보전",
    method: "subsidy", purpose: ["working"], size: "sme", exp: [100000, null],
    target: "수출실적 10만 불 이상 중소기업의 시중은행 운전자금 대출",
    limit: "운전자금 최대 5억 원",
    rate: "대출이자 최대 3%까지 보전",
    term: "3년 만기",
    tags: ["interest"],
    verify: "자료에 ‘3년 만기(3년 거치)’로 표기돼 기간 확인이 필요하다."
  },
  {
    id: "kosmes-startup", org: "kosmes", by: "중진공",
    name: "창업기반 지원자금",
    summary: "업력 7년 미만 창업기업 우대금리 융자",
    method: "direct", purpose: ["working", "facility"], size: "sme", exp: null,
    target: "업력 7년 미만의 중소·벤처기업",
    limit: "60억 원 한도 (운전 5억 원)",
    rate: "정책자금 기준금리 − 0.3%p",
    term: "시설 10년 / 운전 5년",
    tags: ["startup"]
  },
  {
    id: "kosmes-youth-startup", org: "kosmes", by: "중진공",
    name: "청년전용창업자금",
    summary: "청년 창업자를 위한 고정금리 융자",
    method: "direct", purpose: ["working", "facility"], size: "sme", exp: null,
    target: "창업기반지원자금 대상 중 청년창업자",
    limit: "기업당 최대 1~2억 원",
    rate: "연 2.5% 고정금리",
    term: "6년(거치 3년 이내)",
    tags: ["youth", "fixed", "startup"]
  },
  {
    id: "kosmes-restart", org: "kosmes", by: "중진공",
    name: "재창업자금",
    summary: "실패 후 재도전하는 기업의 융자",
    method: "direct", purpose: ["working", "facility"], size: "sme", exp: null,
    target: "재창업 준비 또는 초기 단계 기업으로 성실경영평가를 통과한 기업",
    limit: "60억 원 한도",
    rate: "정책자금 기준금리",
    term: "운전 6년(3년 거치) / 시설 10년(4년 거치)",
    tags: ["restart"]
  },
  {
    id: "kosmes-innov-loan", org: "kosmes", by: "중진공",
    name: "혁신성장 지원자금 (융자)",
    summary: "업력 7년 이상 중소기업의 성장자금",
    method: "direct", purpose: ["working", "facility"], size: "sme", exp: null,
    target: "업력 7년 이상 중소기업",
    limit: "60억 원 한도 (운전 5억 원)",
    rate: "시설 기준금리 + 0.2%p / 운전 기준금리 + 0.5%p",
    term: "시설 10년 / 운전 5년",
    notes: "직접대출 또는 대리대출로 운용된다."
  },
  {
    id: "kosmes-innov-subsidy", org: "kosmes", by: "중진공",
    name: "혁신성장 지원자금 (이차보전)",
    summary: "시설투자 기업의 은행 대출 이자 지원",
    method: "subsidy", purpose: ["facility"], size: "sme", exp: null,
    target: "최근 3년 내 시설투자를 한 기업",
    limit: "5억 원 한도",
    rate: "시중은행 대출이자 최대 3%까지 보전",
    term: "3년 만기",
    tags: ["interest"]
  },
  {
    id: "kosmes-tech", org: "kosmes", by: "중진공",
    name: "개발기술 사업화자금",
    summary: "특허·정부 R&D 기술의 사업화 자금",
    method: "direct", purpose: ["working", "facility"], size: "sme", exp: null,
    target: "특허, 정부 R&D 등 보유기술의 사업화를 추진하는 기업",
    limit: "직접대출 연간 30억 원 (운전자금 5억 원) / 혁신성장 분야 최대 60억 원 (운전자금 10억 원)",
    rate: "정책자금 기준금리(변동) — 투자조건부 융자는 기준금리 − 0.3%p",
    term: "시설 최대 10년 / 운전 최대 5년(2년 거치)",
    verify: "이차보전 등 다른 취급 방식의 조건은 별도 융자계획 공고에서 확인해야 한다."
  },
  {
    id: "kosmes-smart", org: "kosmes", by: "중진공",
    name: "제조현장 스마트화 자금",
    summary: "스마트공장 도입 기업 융자·이차보전",
    method: "direct", purpose: ["working", "facility"], size: "sme", exp: null,
    target: "스마트공장 도입을 추진하는 기업",
    limit: "시설 최대 100억 원 (운전 최대 10억 원)",
    rate: "시설 기준금리 − 0.3%p 우대 / 운전 기준금리 (이차보전은 최대 3%)",
    term: "시설 10년 / 운전 5년",
    tags: ["smart", "interest"]
  },
  {
    id: "kosmes-netzero", org: "kosmes", by: "중진공",
    name: "Net-Zero 유망기업 자금",
    summary: "탄소중립 기술사업화 기업 융자",
    method: "direct", purpose: ["working", "facility"], size: "sme", exp: null,
    target: "탄소중립 기술사업화 기업",
    limit: "최대 60억 원",
    rate: "시설 기준금리 + 0.2%p / 운전 기준금리 + 0.5%p",
    term: "시설 10년 / 운전 5년",
    tags: ["smart"]
  },
  {
    id: "kosmes-conversion", org: "kosmes", by: "중진공",
    name: "사업전환 자금",
    summary: "사업전환계획 승인 기업 융자",
    method: "direct", purpose: ["working", "facility"], size: "sme", exp: null,
    target: "사업전환계획 승인을 받은 업력 5년 미만 기업",
    limit: "연간 100억 원 한도",
    rate: "공고 확인 (자료에 미기재)",
    term: "시설 10년 / 운전 6년"
  },
  {
    id: "kosmes-network", org: "kosmes", by: "중진공",
    name: "동반성장 네트워크론",
    summary: "발주기업 추천을 받은 수주 중소기업의 단기자금",
    method: "direct", purpose: ["working"], size: "sme", exp: null,
    target: "중진공과 협약을 체결한 발주기업으로부터 추천받은 수주 중소기업",
    limit: "발주서 금액의 80% 이내 (연간 15억 원 한도)",
    rate: "공고 확인 (자료에 미기재)",
    term: "365일 이내"
  },
  {
    id: "kosmes-factoring", org: "kosmes", by: "중진공",
    name: "매출채권 팩토링",
    summary: "매출채권을 중진공이 사들여 바로 현금화",
    method: "direct", purpose: ["working"], size: "sme", exp: null,
    target: "구매기업과 1년 이상 거래실적을 보유한 중소기업",
    limit: "공고 확인 (자료에 미기재)",
    rate: "할인율 공고 확인 (자료에 미기재)",
    term: "단기 (매출채권 만기까지)"
  },

  /* ───────── 신용보증기금·기술보증기금 ───────── */
  {
    id: "g-hope", org: "guarantee", by: "신보",
    name: "수출희망기업 특례보증",
    summary: "아직 수출실적이 없지만 수출을 준비하는 기업",
    method: "guarantee", purpose: ["working", "guarantee"], size: "sme", exp: [0, 0],
    target: "최근 1년 수출실적이 없으나 수출지원 타당성 평가점수 80점 이상으로 수출을 준비 중인 기업",
    limit: "평가에 따라 결정",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)",
    notes: "보증비율을 90~100%까지 우대한다.",
    tags: ["newexporter"]
  },
  {
    id: "g-entry", org: "guarantee", by: "신보",
    name: "수출진입기업 보증",
    summary: "수출실적 100만 불 미만, 신규 시장 진입 기업",
    method: "guarantee", purpose: ["working", "facility", "guarantee"], size: "sme", exp: [1, 999999],
    target: "당기 또는 최근 1년 수출실적이 100만 불 미만인 중소기업의 신규 시장 진입",
    limit: "공고 확인 (자료에 미기재)",
    rate: "보증료 0.2~0.3%p 감면",
    term: "공고 확인 (자료에 미기재)",
    notes: "보증료 감면과 함께 보증비율을 확대한다.",
    tags: ["newexporter"]
  },
  {
    id: "g-expand", org: "guarantee", by: "신보",
    name: "수출확장기업 보증",
    summary: "수출실적 100만 불 이상 수출유망 중소기업",
    method: "guarantee", purpose: ["working", "facility", "guarantee"], size: "sme", exp: [1000000, null],
    target: "최근 1년 수출실적이 100만 불 이상인 수출유망 중소기업",
    limit: "공고 확인 (자료에 미기재)",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)"
  },
  {
    id: "g-lead", org: "guarantee", by: "신보",
    name: "수출주력기업 보증",
    summary: "수출실적 500만 불 이상 중소기업의 글로벌 도약",
    method: "guarantee", purpose: ["working", "facility", "guarantee"], size: "sme", exp: [5000000, null],
    target: "1년 수출실적이 500만 불 이상인 중소기업",
    limit: "공고 확인 (자료에 미기재)",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)"
  },
  {
    id: "g-integrated", org: "guarantee", by: "신보·기보",
    name: "수출중소기업 종합지원 특례",
    summary: "주력기업·스타기업에 보증비율 최대 100%",
    method: "guarantee", purpose: ["working", "facility", "guarantee"], size: "sme", exp: [1000000, null],
    target: "수출실적 100만 불 이상의 주력기업, 500만 불 이상의 스타기업",
    limit: "공고 확인 (자료에 미기재)",
    rate: "보증료 0.2~0.3%p 차감",
    term: "공고 확인 (자료에 미기재)",
    notes: "보증비율을 최대 100%까지 올려준다.",
    tags: ["full100"]
  },
  {
    id: "g-kibo-expected", org: "guarantee", by: "기보",
    name: "수출예상기업 보증",
    summary: "수출신용장을 가졌거나 수출 비중이 낮은 기술기업",
    method: "guarantee", purpose: ["working", "facility", "guarantee"], size: "sme", exp: null,
    target: "수출신용장을 보유하거나 수출실적이 당기매출액의 10% 미만인 기술혁신선도형 기업",
    limit: "공고 확인 (자료에 미기재)",
    rate: "보증료 우대 감면",
    term: "공고 확인 (자료에 미기재)",
    notes: "보증비율을 90~95%로 높여준다.",
    tags: ["newexporter"]
  },
  {
    id: "g-kibo-lead", org: "guarantee", by: "기보",
    name: "수출실적·주력기업 보증",
    summary: "수출 비중이 높은 기술기업의 심사 완화",
    method: "guarantee", purpose: ["working", "facility", "guarantee"], size: "sme", exp: [1, null],
    target: "수출실적이 매출액의 10% 이상, 또는 30% 이상·100만 불 이상인 기술기업",
    limit: "공고 확인 (자료에 미기재)",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)",
    notes: "보증심사를 완화하고 보증비율 혜택을 준다."
  },
  {
    id: "g-kibo-diversify", org: "guarantee", by: "기보",
    name: "수출다변화 지원 특례보증",
    summary: "신규 수출국·유망국으로 시장을 넓히는 기업",
    method: "guarantee", purpose: ["working", "guarantee"], size: "sme", exp: null,
    target: "신규 수출시장 진출 또는 수출유망국으로 시장을 확대하는 중소기업",
    limit: "총 3,000억 원 한도 내 지원",
    rate: "보증료율 감면",
    term: "공고 확인 (자료에 미기재)",
    notes: "보증비율을 높여주고 보증료율을 감면한다."
  },
  {
    id: "g-kibo-strategic", org: "guarantee", by: "기보",
    name: "전략품목 수출 특례보증",
    summary: "8대 주력제조업·신수출 유망분야 전용 보증",
    method: "guarantee", purpose: ["working", "guarantee"], size: "sme", exp: null,
    target: "8대 주력제조업 및 신수출 유망분야 중소기업",
    limit: "총 5,000억 원 규모",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)"
  },
  {
    id: "g-kibo-overseas", org: "guarantee", by: "기보",
    name: "해외동반진출 특례보증",
    summary: "대기업과 함께 해외에 나가는 중소·중견기업",
    method: "guarantee", purpose: ["working", "facility", "guarantee"], size: "sme", exp: null,
    target: "대기업과 협력하여 해외 진출을 추진하는 중소·중견기업",
    limit: "총 2,000억 원 규모, 최대 200억 원까지 (소진 시까지)",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)"
  },
  {
    id: "g-kodit-overseas", org: "guarantee", by: "신보",
    name: "해외진출 기업보증지원 프로그램",
    summary: "해외 자회사의 현지 대출을 위한 Stand-by L/C",
    method: "guarantee", purpose: ["facility", "guarantee"], size: "sme", exp: null,
    target: "해외 종속기업을 보유한 국내 모기업",
    limit: "공고 확인 (자료에 미기재)",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)",
    notes: "현지 대출용 Stand-by L/C를 발급받을 수 있도록 보증한다."
  },
  {
    id: "g-kodit-general", org: "guarantee", by: "신보",
    name: "신용보증기금 일반 신용보증·소상공인 특례보증",
    summary: "영세사업자부터 일반 기업까지 폭넓은 신용보증",
    method: "guarantee", purpose: ["working", "facility", "guarantee"], size: "sme", exp: null,
    target: "영세사업자·10인 미만 기업(소상공인 특례보증), 일반 중소기업(일반 신용보증)",
    limit: "소상공인 특례보증 최대 5억 원 / 일반 신용보증 최대 200억 원",
    rate: "보증료율 연 0.1~5.0%",
    term: "공고 확인 (자료에 미기재)",
    verify: "개괄적으로만 정리된 자료여서 상품별 세부 요건 확인이 필요하다."
  },
  {
    id: "g-kibo-stage", org: "guarantee", by: "기보",
    name: "기술보증기금 성장단계별 보증",
    summary: "혁신성장·AI·지식재산 보유 기업의 대형 보증",
    method: "guarantee", purpose: ["working", "facility", "guarantee"], size: "sme", exp: null,
    target: "혁신성장기업, AI 및 지식재산(IP) 보유 기업",
    limit: "최대 300억 원",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)",
    verify: "개괄적으로만 정리된 자료여서 상품별 세부 요건 확인이 필요하다."
  },

  /* ───────── 한국무역보험공사 ───────── */
  {
    id: "ksure-toss", org: "ksure", by: "무보",
    name: "토스뱅크 다이렉트 수출똑똑보증 대출",
    summary: "비대면으로 신청하는 보증료 지원 수출 대출",
    method: "guarantee", purpose: ["export", "working", "guarantee"], size: "sme", exp: [10000, 2000000],
    target: "KoDATA 신용등급 B+ 이상, 매출 1억~100억 원 미만, 직·간접 수출실적 1만~200만 불(간접수출 인정)인 기업",
    limit: "5천만~1억 원 (보증비율 100%)",
    rate: "보증료율 연 0.8% 내외 (토스뱅크가 보증료 100% 지원)",
    term: "4년 (2년 거치 2년 상환)",
    tags: ["online", "full100", "newexporter"]
  },
  {
    id: "ksure-shinhan", org: "ksure", by: "무보",
    name: "신한 온라인 다이렉트 수출보증대출",
    summary: "신한은행 비대면 수출보증 대출",
    method: "guarantee", purpose: ["export", "working", "guarantee"], size: "sme", exp: [10000, 2000000],
    target: "토스뱅크 상품과 같은 요건의 법인·개인기업 (신용 B6 이상으로 안내됨)",
    limit: "최대 1억 원 (보증비율 100%)",
    rate: "보증료율 연 0.8% 내외",
    term: "4년 (2년 거치 2년 상환)",
    tags: ["online", "full100", "newexporter"]
  },
  {
    id: "ksure-hana", org: "ksure", by: "무보",
    name: "HANA DIRECT 수출보증대출",
    summary: "하나은행이 보증료를 지원하는 비대면 수출 대출",
    method: "guarantee", purpose: ["export", "working", "guarantee"], size: "sme", exp: [10000, 2000000],
    target: "위 상품과 같은 요건의 수출기업",
    limit: "최대 1억 원 (보증비율 100%)",
    rate: "보증료율 연 0.8% 내외 (하나은행이 보증료 100% 지원)",
    term: "4년 (1년 거치 3년 상환)",
    tags: ["online", "full100", "newexporter"]
  },
  {
    id: "ksure-pre", org: "ksure", by: "무보",
    name: "수출신용보증 (선적전)",
    summary: "수출품 제조·원자재 조달자금 대출의 연대보증",
    method: "guarantee", purpose: ["export", "guarantee"], size: "sme", exp: null,
    target: "수출물품의 제조·가공·조달 자금을 금융기관에서 대출받는 수출기업 (결제기간 2년 이내)",
    limit: "대출금액의 90% 이내",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "결제기간 2년 이내",
    notes: "한국은행 무역금융 등 선적 전 수출금융과 함께 쓰인다.",
    tags: ["risk"]
  },
  {
    id: "ksure-purchase", org: "ksure", by: "무보",
    name: "수출신용보증 (매입)",
    summary: "환어음 매입 방식의 수출대금 조기 회수 보증",
    method: "guarantee", purpose: ["export", "guarantee"], size: "sme", exp: null,
    target: "무신용장 방식의 통관거래, 일반수출, 위탁가공무역 건에서 환어음을 은행에 매입시키는 수출자",
    limit: "대출금의 최대 90%",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)",
    tags: ["risk"]
  },
  {
    id: "ksure-bulk", org: "ksure", by: "무보",
    name: "수출신용보증 (포괄매입)",
    summary: "단일 보증서로 여러 수입자와의 거래를 보증",
    method: "guarantee", purpose: ["export", "guarantee"], size: "sme", exp: null,
    target: "신용등급 B- 이상 중소기업의 무신용장 수출거래",
    limit: "700만 불 한도, 90% 보증",
    rate: "보증료율 연 0.5~2.5%",
    term: "결제 180일 이내 건",
    tags: ["risk"]
  },
  {
    id: "ksure-direct-ins", org: "ksure", by: "무보",
    name: "단기수출보험 다이렉트 (선적후)",
    summary: "온라인 심사만으로 가입하는 수출대금 보험",
    method: "insurance", purpose: ["insurance"], size: "sme", exp: null,
    target: "결제기간 1년 이내 일반 수출거래를 하는 수출기업",
    limit: "수입자별 최대 20만 불",
    rate: "보험료율 공고 확인 (자료에 미기재)",
    term: "결제기간 1년 이내",
    notes: "별도 매입통지 없이 온라인 심사만으로 미결제 대금의 신용위험을 보장한다.",
    tags: ["risk"]
  },
  {
    id: "ksure-agri", org: "ksure", by: "무보",
    name: "농수산물패키지보험",
    summary: "K-푸드 수출기업의 대금·검역·클레임 위험을 한 증권으로",
    method: "insurance", purpose: ["insurance"], size: "sme", exp: null,
    target: "K-푸드 등 농수산물 수출기업",
    limit: "대금 미회수 최대 3억 원 / 검역 불합격 최대 1천만 원 / 무역 클레임 최대 5천만 원",
    rate: "보험료율 공고 확인 (자료에 미기재)",
    term: "공고 확인 (자료에 미기재)",
    tags: ["risk"]
  },

  /* ───────── 한국수출입은행 ───────── */
  {
    id: "exim-perform", org: "exim", by: "수은",
    name: "수출이행자금 대출",
    summary: "수출계약 체결 후 제작·원자재 구매에 쓰는 직접대출",
    method: "direct", purpose: ["export", "working"], size: "sme", exp: null,
    target: "수출계약 체결 후 목적물 제작에 필요한 자금이 필요한 기업 (수출거래 안전성 평가 70점 이상 중소기업은 신용등급 평가 생략)",
    limit: "미수령 계약금의 90% 이내",
    rate: "기술신용 양호 기업 최대 0.3%p 우대",
    term: "최종 수출대금 결제기일 + 30일 이내"
  },
  {
    id: "exim-promote", org: "exim", by: "수은",
    name: "수출촉진자금 대출",
    summary: "수출 전환·확대를 위한 시설·기술개발·시장개척 자금",
    method: "direct", purpose: ["export", "facility"], size: "sme", exp: null,
    target: "수출 전환 및 확대를 추진하는 기업의 시설투자, 기술개발, 해외시장 개척",
    limit: "소요자금의 90% 이내 (중소기업 30억 원 한도)",
    rate: "공고 확인 (자료에 미기재)",
    term: "최대 10년"
  },
  {
    id: "exim-growth", org: "exim", by: "수은",
    name: "수출성장자금 대출",
    summary: "수출실적 범위 안에서 소요자금 일괄 대출",
    method: "direct", purpose: ["export", "working", "facility"], size: "sme", exp: [1, null],
    target: "수출실적을 보유한 기업",
    limit: "수출실적 범위 내 소요자금의 90%",
    rate: "공고 확인 (자료에 미기재)",
    term: "최장 10년"
  },
  {
    id: "exim-base", org: "exim", by: "수은",
    name: "수출기반자금 대출",
    summary: "시설·운영·수입결제 자금의 장기 대출",
    method: "direct", purpose: ["export", "working", "facility"], size: "sme", exp: null,
    target: "수출 기반 마련을 위한 시설, 운영, 수입결제 자금이 필요한 국내기업",
    limit: "소요자금의 90% 이내",
    rate: "공고 확인 (자료에 미기재)",
    term: "최장 30년 (운영자금 3년)"
  },
  {
    id: "exim-liquidity", org: "exim", by: "수은",
    name: "수출입기업 유동성 지원 대출",
    summary: "환율 변동으로 자금난을 겪는 중소기업",
    method: "direct", purpose: ["export", "working"], size: "sme", exp: null,
    target: "환율 변동으로 자금 곤란을 겪는 수출입 중소기업",
    limit: "동일인당 5억 원",
    rate: "공고 확인 (자료에 미기재)",
    term: "1년 이내"
  },
  {
    id: "exim-guarantee", org: "exim", by: "수은",
    name: "수출이행성보증",
    summary: "입찰·선수금환급·계약이행 보증",
    method: "guarantee", purpose: ["export", "guarantee"], size: "sme", exp: null,
    target: "수주 성사를 위해 보증이 필요한 국내기업과 해외 자회사",
    limit: "공고 확인 (자료에 미기재)",
    rate: "보증료율 공고 확인 (자료에 미기재)",
    term: "계약 기간에 따름",
    notes: "입찰보증, 선수금환급보증, 계약이행보증 등을 제공한다."
  },

  /* ───────── 무역협회·한국은행·금융기관 ───────── */
  {
    id: "bank-kita", org: "bank", by: "무역협회",
    name: "무역진흥자금 융자추천",
    summary: "회원사 수출 마케팅·원자재 구매자금을 협회가 추천",
    method: "bank", purpose: ["export", "working"], size: "sme", exp: [0, 20000000],
    target: "전년도 수출실적 2,000만 달러 이하인 한국무역협회 회원",
    limit: "최대 3억 원",
    rate: "연 2.5~3.0%",
    term: "3년",
    notes: "은행 대출을 받을 때 공사 보증서가 요구된다.",
    verify: "초기 자료에만 나온 내용이어서 최신 한도·금리 확인이 필요하다."
  },
  {
    id: "bank-bok", org: "bank", by: "한국은행",
    name: "한국은행 무역금융 (은행 경유)",
    summary: "취급 은행을 통해 받는 선적 전 수출금융",
    method: "bank", purpose: ["export", "working"], size: "sme", exp: null,
    target: "수출 거래에 필요한 선적 전 자금을 취급 은행에서 대출받는 수출기업",
    limit: "취급 은행 확인",
    rate: "취급 은행 확인",
    term: "취급 은행 확인",
    notes: "한국은행이 기업에 직접 대출하지 않고 은행을 통해 지원하는 구조다. 무보 수출신용보증(선적전)과 함께 활용하는 경우가 많다.",
    verify: "상세 조건이 자료에 없어 거래 은행에 확인해야 한다."
  }
];
