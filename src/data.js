// Sample posts. Everything here is made-up demo data so the page looks full.
// To use real posts later, replace `ISSUE_POSTS`, `MIRROR_POSTS` and `DEALS`
// with data from a server that collects community posts (same fields).

export const COMMUNITIES = [
  { id: 'clien', name: '클리앙', color: '#3D4881', url: 'https://www.clien.net/' },
  { id: 'ou', name: '오늘의유머', color: '#4D6C77', url: 'https://www.todayhumor.co.kr/' },
  { id: 'slrclub', name: 'SLR클럽', color: '#438EDD', url: 'https://www.slrclub.com/' },
  { id: 'ppomppu', name: '뽐뿌', color: '#a5a5a5', url: 'https://www.ppomppu.co.kr/' },
  { id: 'mlbpark', name: '엠팍', color: '#FE5E00', url: 'https://mlbpark.donga.com/' },
  { id: '82cook', name: '82쿡', color: '#37832D', url: 'https://www.82cook.com/' },
  { id: 'bobae', name: '보배드림', color: '#4588CE', url: 'https://www.bobaedream.co.kr/' },
  { id: 'ruli', name: '루리웹', color: '#0861B6', url: 'https://bbs.ruliweb.com/' },
  { id: 'inven', name: '인벤', color: '#BF0404', url: 'https://www.inven.co.kr/' },
  { id: 'humor', name: '웃긴대학', color: '#ED1746', url: 'https://web.humoruniv.com/' },
  { id: 'fmkorea', name: '에펨코리아', color: '#5176CF', url: 'https://www.fmkorea.com/' },
  { id: 'etoland', name: '이토랜드', color: '#72CA47', url: 'https://www.etoland.co.kr/' },
  { id: 'damoang', name: '다모앙', color: '#383838', url: 'https://damoang.net/' },
  { id: 'theqoo', name: '더쿠', color: '#375472', url: 'https://theqoo.net/' },
];

export const COMM = Object.fromEntries(COMMUNITIES.map((c) => [c.id, c]));

const TITLES = [
  '퇴근길에 본 하늘이 너무 예뻐서 찍어봤어요',
  '고양이가 택배 상자를 포기하지 않는 이유.gif',
  '요즘 편의점 신상 도시락 솔직 후기',
  '주말에 다녀온 강릉 당일치기 코스 정리',
  'AI 번역기 써보니 확실히 달라졌네요',
  '자취 3년차가 알려주는 냉장고 정리법',
  '강아지가 산책 가자고 조르는 표정.jpg',
  '새로 나온 스마트폰 카메라 비교해봤습니다',
  '회사 근처 숨은 국밥 맛집 찾았어요',
  '오늘 야구 9회말 역전 장면 다시보기',
  '초보 캠핑 장비 이것만 사면 됩니다',
  '전기차 겨울철 주행거리 실제로 재봤어요',
  '집에서 만드는 초간단 떡볶이 레시피',
  '출근 10분 전 지하철 상황.mp4',
  '게임 신작 첫인상 리뷰 (스포 없음)',
  '부모님 선물로 안마기 사드렸는데 반응이',
  '제주도 렌트카 싸게 빌리는 팁 공유',
  '갑자기 추워진 날씨에 꺼낸 롱패딩',
  '노트북 배터리 오래 쓰는 설정 몇 가지',
  '동네 빵집 소금빵이 미쳤습니다',
  '요즘 아이들이 쓰는 신조어 모음',
  '첫 월급으로 산 물건 자랑해봐요',
  '러닝 한 달 했더니 생긴 변화',
  '이사하면서 버린 물건 목록 보니 반성되네요',
  '영화관 팝콘 가격 실화인가요',
  'AI로 그린 우리집 강아지 초상화',
  '중고거래 하다가 생긴 훈훈한 일',
  '바다 보이는 카페 추천 부탁드려요',
  '새벽 3시에 라면 끓여 먹은 사람',
  '스마트워치 수면 측정 정확할까요',
  '할머니 손맛 김장 김치 담그는 날',
  '고속도로 휴게소 간식 순위 매겨봄',
  '반려식물 키우기 초보 질문입니다',
  '오래된 게임기 다시 켜봤더니.jpg',
  '가성비 키보드 추천 리스트 정리',
  '주식 초보가 1년 동안 배운 점',
  '아파트 층간소음 해결한 후기',
  '눈 오는 날 출근길 풍경 모음',
  '혼밥하기 좋은 식당 특징',
  '여행 캐리어 싸는 꿀팁 대방출',
  '드라마 마지막 회 보고 여운이 길어요',
  '편의점 커피 블라인드 테스트 결과',
  '우리 동네 길고양이 근황.jpg',
  '자전거 출퇴근 6개월 차 후기',
  '물가 체감되는 장보기 영수증',
  '아이폰 vs 갤럭시 오랜만에 바꿔본 소감',
  'AI 스피커한테 농담 시켜봤습니다',
  '도시락 싸서 다니면 한 달에 얼마 아낄까',
  '집들이 선물 뭐가 좋을까요',
  '야구장 직관 처음 가봤는데 꿀잼',
  '오래 앉아있는 직장인 스트레칭 모음',
  '가을 단풍 명소 사진 몇 장 올려요',
  '어릴 때 하던 보드게임 다시 해봄',
  '모니터 암 설치하고 책상이 넓어졌어요',
  '요리 못하는 사람도 성공하는 계란찜',
  '지하철에서 본 훈훈한 장면',
  '헬스장 처음 가는 사람 가이드',
  '노을 지는 한강 타임랩스.mp4',
  '전자책 리더기 1년 사용 후기',
  '새로 생긴 동네 도서관 구경',
  '여름휴가 국내 vs 해외 고민중',
  '커피 원두 직접 볶아봤습니다',
  '우리집 고양이 최애 장난감 순위',
  '오늘 점심 메뉴 추천 받습니다',
  '차박 해보신 분들 팁 좀 주세요',
  '무선 이어폰 잃어버렸다 찾은 썰',
  '프로그래밍 독학 6개월 결과물',
  '시골 할머니댁 겨울 풍경.jpg',
  '배달 음식 줄이고 생긴 변화',
  '축구 국가대표 경기 하이라이트',
  'AI 그림 도구로 만든 달력 공유',
  '중고차 살 때 꼭 확인할 것들',
  '비 오는 날 듣기 좋은 노래 추천',
  '처음 만든 수제 케이크 결과물',
  '집에서 키우는 방울토마토 수확',
  '사진 잘 나오는 스마트폰 설정',
  '오랜만에 동창 만났는데 다들 그대로',
  '동네 시장 호떡 아직도 천원',
  '여행 가서 산 기념품 자랑',
  '퇴사 후 한 달 동안 한 일들',
];

// Small deterministic random generator so the sample page looks the same every time.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = rng(20261111);
const pick = (arr) => arr[Math.floor(r() * arr.length)];
const between = (a, b) => Math.floor(a + r() * (b - a + 1));

export function ago(mins) {
  if (mins < 60) return `${mins}분전`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}시간전`;
  return `${Math.floor(mins / 1440)}일전`;
}

const BODY = [
  '이 글은 모아보기 예시로 만든 샘플 글입니다.',
  '실제 커뮤니티 글을 연결하면 이 자리에 원문 요약이 보입니다.',
  '관심 키워드를 등록하면 이런 글들이 자동으로 모입니다.',
];

let seq = 1000;
function makePost(title, extra = {}) {
  const comm = pick(COMMUNITIES).id;
  const hue = between(0, 359);
  return {
    id: `p${seq++}`,
    title,
    comm,
    hue,
    hue2: (hue + between(20, 80)) % 360,
    size: `${(r() * (r() < 0.2 ? 19 : 6)).toFixed(1)} MB`,
    hits: between(800, 32000),
    shares: between(1, 40),
    likes: between(0, 130),
    cmt: between(2, 60),
    mins: between(5, 60 * 30),
    body: BODY,
    ...extra,
  };
}

// Issue posts with thumbnails (used by the four top lists and the issue page).
export const ISSUE_POSTS = TITLES.map((t) => makePost(t));

// Community ranking posts (used by the mirror lists).
export const MIRROR_POSTS = TITLES.slice()
  .sort(() => r() - 0.5)
  .map((t) => makePost(t, { views: between(900, 4200), score: between(5, 800) }));

export const DEALS = [
  ['무선 청소기 역대급 할인', '189,000원'],
  ['기계식 키보드 한정 특가', '59,900원'],
  ['캠핑 의자 2개 세트', '32,800원'],
  ['27인치 모니터 오늘만', '219,000원'],
  ['원두 1kg 대용량', '18,900원'],
  ['전기 포트 무료배송', '14,500원'],
  ['러닝화 시즌오프', '49,000원'],
  ['보조배터리 20000mAh', '21,900원'],
  ['에어프라이어 5.5L', '67,000원'],
  ['블루투스 스피커', '39,800원'],
  ['수납 정리함 6개입', '12,900원'],
  ['겨울 패딩 조끼', '29,900원'],
  ['유아 장난감 블록 세트', '25,000원'],
  ['차량용 휴대폰 거치대', '9,900원'],
  ['가습기 대용량', '44,000원'],
  ['노이즈캔슬링 이어폰', '99,000원'],
].map(([title, price]) => makePost(title, { price, shop: pick(['쇼핑몰A', '쇼핑몰B', '오픈마켓', '공식몰']) }));

export const ALL_POSTS = [...ISSUE_POSTS, ...MIRROR_POSTS, ...DEALS];
export const POST_BY_ID = Object.fromEntries(ALL_POSTS.map((p) => [p.id, p]));

// Collections shown in the bottom cards when nothing has been saved yet.
export const SAMPLE_COLLECTIONS = [
  { title: '주말에 몰아보기 좋은 글 모음', tag: '여행,맛집', url: '키워드 3개 · 글 18개', lines: ['오늘 새로 모인 글 6개 · 1.8km 이내 맛집 포함', '최근 업데이트 15분전'], count: 3 },
  { title: '반려동물 귀여운 글 모음', tag: '고양이,강아지', url: '', lines: ['새 글 4개 · 댓글 많은 순', '최근 업데이트 32분전'], count: 3 },
  { title: 'AI·IT 소식 모아보기', tag: '', url: '관심 키워드: AI', lines: ['MOA 추천 모음', '조회 20,319회 · 스크랩 85 · 담기 73'], count: 1, badge: '인기' },
  { title: '살림 꿀팁 모음', tag: '자취,정리', url: '', lines: ['새 글 7개 · 추천 많은 순', '최근 업데이트 1시간전'], count: 3 },
];
