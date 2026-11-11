import './style.css';
import collected from './collected.json';
import { store, matchKeyword } from './store.js';

// Where the site lives (works at the top of a domain or in a sub-folder such as GitHub Pages).
const R = new URL(/* @vite-ignore */ '../', import.meta.url).pathname;
const app = document.getElementById('app');

// The five built pages map onto three views. The old "deal" page only had sample posts, so it goes home.
const rawPage = document.body.dataset.page || 'home';
if (rawPage === 'deal') location.replace(R);
const view = { home: 'feed', issue: 'feed', mirror: 'rank', my: 'my' }[rawPage] || 'feed';

/* ---------------- helpers ---------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n || 0).toLocaleString('ko-KR');
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

function ago(ts) {
  if (!ts) return '';
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (mins < 60) return `${mins}분 전`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}시간 전`;
  return `${Math.floor(mins / 1440)}일 전`;
}

const SITE_NAMES = { dcinside: '디시', fmkorea: '에펨', mlbpark: '엠팍', inven: '인벤' };

// Team colours live in style.css (.t-kiwoom / .t-dplus and body.team-…). Other categories get a neutral look.
const TEAM_SHORT = { kiwoom: '키움', dplus: 'DK' };
const tcls = (catId) => (TEAM_SHORT[catId] ? `t-${catId}` : 't-etc');

/* ---------------- collected posts ---------------- */
const CATS = (collected.categories || []).map((c) => ({
  ...c,
  short: TEAM_SHORT[c.id] || c.name.slice(0, 2),
  posts: c.posts.map((p) => ({ ...p, id: `c${hash(p.url)}`, cat: c.id, catShort: TEAM_SHORT[c.id] || c.name.slice(0, 2) })),
}));
const CP = {};
CATS.forEach((c) => c.posts.forEach((p) => { CP[p.id] = p; }));
const ALL = Object.values(CP);
const score = (p) => (p.recommends || 0) * 2 + (p.comments || 0);
const sorted = (list, key) => list.slice().sort((a, b) => {
  if (key === 'hot') return score(b) - score(a);
  if (key === 'new') return (b.ts || 0) - (a.ts || 0);
  return (b[key] || 0) - (a[key] || 0);
});
const updatedAgo = collected.updated ? ago(Date.parse(collected.updated)) : '';
// Only the sites that actually have collected posts get a filter button.
const SITES = Object.fromEntries(Object.entries(SITE_NAMES).filter(([id]) => ALL.some((p) => p.site === id)));

/* ---------------- what the address asks for ---------------- */
const params = new URLSearchParams(location.search);
const cat = CATS.find((c) => c.id === params.get('cat')) || null;
const SORTS = [['new', '최신'], ['hot', '인기'], ['recommends', '추천'], ['comments', '댓글'], ['views', '조회']];
const sort = SORTS.some(([k]) => k === params.get('sort')) ? params.get('sort') : 'new';
const src = cat && cat.sources.some((x) => x.source === params.get('src')) ? params.get('src') : '';
const RANKS = [['recommends', '추천'], ['comments', '댓글'], ['views', '조회']];
const rankBy = RANKS.some(([k]) => k === (params.get('by') || params.get('orderby'))) ? (params.get('by') || params.get('orderby')) : 'recommends';
const site = SITES[params.get('site')] ? params.get('site') : '';

const BASE = { feed: R, rank: `${R}mirror/`, my: `${R}my/` };
function url(to, q = {}) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v) u.set(k, v);
  const s = u.toString();
  return BASE[to] + (s ? `?${s}` : '');
}
const feedUrl = (over = {}) => url('feed', { cat: cat?.id, sort: sort === 'new' ? '' : sort, src, ...over });
const rankUrl = (over = {}) => url('rank', { cat: cat?.id, by: rankBy === 'recommends' ? '' : rankBy, site, ...over });

/* ---------------- pieces ---------------- */
function highlight(title) {
  let out = esc(title);
  for (const k of store.get().keywords) {
    if (!k) continue;
    const re = new RegExp(esc(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, (m) => `<mark>${m}</mark>`);
  }
  return out;
}

function postRow(p, o = {}) {
  const s = store.get();
  const read = s.read.includes(p.id) ? ' read' : '';
  const on = s.scraps.includes(p.id);
  const lead = o.rank ? `<span class="rank">${o.rank}</span>` : '<span class="bar"></span>';
  const stats = [
    p.site === 'mlbpark' ? '' : `<span>추천 <b>${fmt(p.recommends)}</b></span>`, // 엠팍 목록에는 추천수가 없습니다
    `<span>댓글 <b>${fmt(p.comments)}</b></span>`,
    `<span>조회 <b>${fmt(p.views)}</b></span>`,
  ].join('');
  const value = o.value ? `<span class="val">${fmt(p[o.value])}<small>${RANKS.find(([k]) => k === o.value)[1]}</small></span>` : '';
  return `<a class="post ${tcls(p.cat)}${read}" href="${esc(p.url)}" rel="noopener" data-id="${p.id}">
    ${lead}
    <span class="post-body">
      <span class="post-title">${highlight(p.title)}</span>
      <span class="post-meta">${cat ? '' : `<i class="tchip">${esc(p.catShort)}</i>`}<span>${esc(p.source || '')}</span><span>${ago(p.ts) || esc(p.date || '')}</span>${stats}</span>
    </span>
    ${value}
    <button class="scrap${on ? ' on' : ''}" data-scrap="${p.id}" aria-label="스크랩" aria-pressed="${on}">${on ? '★' : '☆'}</button>
  </a>`;
}

const empty = (text) => `<div class="empty">${text}</div>`;
const chip = (label, href, on) => `<a class="chip${on ? ' on' : ''}" href="${href}">${label}</a>`;

function kwCard() {
  const s = store.get();
  return `<section class="card">
    <h2>관심 키워드</h2>
    <p class="hint">제목에 들어 있으면 노랗게 표시합니다.</p>
    <div class="chips">${s.keywords.map((k) => `<span class="chip kw">${esc(k)}<button data-rmkw="${esc(k)}" aria-label="${esc(k)} 지우기">×</button></span>`).join('') || '<span class="hint">아직 없습니다.</span>'}</div>
    <form class="row" data-form="kw"><input name="kw" placeholder="예: 안우진, 쇼메이커" aria-label="관심 키워드" maxlength="20"><button class="btn">추가</button></form>
  </section>`;
}

// Words that show up most in the collected titles.
const STOP = new Set(['진짜', '그냥', '근데', '이거', '오늘', '지금', '이번', '그리고', '이제', '너무', '없는', '있는', '하는', '하고', '이게', '이건', '저거', '것', '좀', '왜', '다', '더', '또', '나', '내', '수', '거']);
function topWords(posts, n) {
  const counts = new Map();
  for (const p of posts) {
    for (let w of p.title.split(/[\s,.!?~()[\]"'“”‘’/·…|:;]+/)) {
      w = w.replace(/(은|는|이|가|을|를|의|에|도|로|으로|에서|한테|까지|ㅋ+|ㅎ+)$/u, '');
      if (w.length < 2 || STOP.has(w) || /^\d+$/.test(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function wordsCard() {
  const words = topWords(cat ? cat.posts : ALL, 24);
  if (!words.length) return '';
  const max = words[0][1];
  return `<section class="card">
    <h2>많이 나온 단어</h2>
    <p class="hint">누르면 관심 키워드로 등록됩니다.</p>
    <div class="words">${words.map(([w, n]) => `<button data-word="${esc(w)}" style="font-size:${Math.round(12 + 8 * Math.sqrt(n / max))}px">${esc(w)}<small>${n}</small></button>`).join('')}</div>
  </section>`;
}

function sourcesCard(cats = cat ? [cat] : CATS) {
  return `<section class="card">
    <h2>모으는 기준</h2>
    ${cats.map((c) => `<div class="rule ${tcls(c.id)}">
      <div class="rule-head"><i class="tchip">${esc(c.short)}</i><b>${esc(c.name)}</b></div>
      <p class="hint">추천 ${c.minRecommend}개 이상 또는 댓글 ${c.minComments}개 이상 · 키워드 ${esc(c.keywords.join(', '))}</p>
      <ul>${c.sources.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.source)}</a><span>${fmt(x.kept)}개 모음 / ${fmt(x.seen)}개 확인${x.error ? ` <em>${x.kept ? '일부만 읽음' : '이번엔 못 읽음'}</em>` : ''}</span></li>`).join('')}</ul>
    </div>`).join('')}
    <p class="hint">마지막으로 모은 시각: ${esc(updatedAgo || '-')}</p>
  </section>`;
}

function addLinkCard() {
  return `<section class="card">
    <h2>글 직접 담기</h2>
    <p class="hint">아무 커뮤니티 글이나 주소를 넣어 내 모음에 담습니다.</p>
    <form class="stack" data-form="link">
      <input name="title" placeholder="글 제목" aria-label="담을 글 제목">
      <input name="url" placeholder="글 주소 (https://...)" aria-label="글 주소" inputmode="url">
      <button class="btn">내 모음에 담기</button>
    </form>
  </section>`;
}

const ICONS = {
  feed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  rank: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V11M12 20V4M19 20v-6"/></svg>',
  my: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/></svg>',
};
const NAV = [['feed', '피드'], ['rank', '순위'], ['my', '내 모음']];
const navHref = (k) => (k === 'my' ? url('my') : url(k, { cat: cat?.id }));

function header() {
  const dark = store.get().theme === 'black';
  const tabs = view === 'my' ? '' : `<div class="teams"><div class="wrap teams-in">
      <a class="team-tab${cat ? '' : ' on'}" href="${view === 'rank' ? rankUrl({ cat: '' }) : feedUrl({ cat: '', src: '' })}">전체<b>${fmt(ALL.length)}</b></a>
      ${CATS.map((c) => `<a class="team-tab${cat?.id === c.id ? ' on' : ''}" href="${view === 'rank' ? rankUrl({ cat: c.id }) : feedUrl({ cat: c.id, src: '' })}">${esc(c.name)}<b>${fmt(c.posts.length)}</b></a>`).join('')}
    </div></div>`;
  return `<header class="top">
    <div class="wrap top-in">
      <a class="logo" href="${R}" aria-label="처음으로">MOA<i></i></a>
      <nav class="nav-d">${NAV.map(([k, l]) => `<a class="${view === k ? 'on' : ''}" href="${navHref(k)}">${l}</a>`).join('')}</nav>
      <button class="theme" data-act="theme" aria-label="화면 밝기 바꾸기">${dark ? '밝게' : '어둡게'}</button>
    </div>
    ${tabs}
  </header>`;
}

const tabbar = () => `<nav class="tabbar">${NAV.map(([k, l]) => `<a class="${view === k ? 'on' : ''}" href="${navHref(k)}">${ICONS[k]}<span>${l}</span></a>`).join('')}</nav>`;

const rail = () => `<aside class="rail">${kwCard()}${wordsCard()}${sourcesCard()}${addLinkCard()}</aside>`;

function frame(main, withRail = true) {
  return `${header()}
  <div class="wrap layout${withRail ? '' : ' single'}">
    <main>${main}</main>
    ${withRail ? rail() : ''}
  </div>
  <footer class="foot wrap">MOA · 마지막으로 모은 시각 ${esc(updatedAgo || '-')}</footer>
  ${tabbar()}
  <div id="toast" role="status"></div>`;
}

/* ---------------- views ---------------- */
function feedPage() {
  const s = store.get();
  let posts = cat ? cat.posts : ALL;
  if (src) posts = posts.filter((p) => p.source === src);
  const total = posts.length;
  if (s.unreadOnly.feed) posts = posts.filter((p) => !s.read.includes(p.id));
  posts = sorted(posts, sort);
  const limit = Number(params.get('n') || 40);

  const head = `<div class="head">
    <div><h1>${esc(cat ? cat.name : '전체 글')}</h1><p>${fmt(total)}개${updatedAgo ? ` · ${esc(updatedAgo)} 수집` : ''}</p></div>
    <button class="btn ghost rules-btn" data-act="rules">모으는 기준</button>
  </div>`;
  const tools = `<div class="tools">
    <div class="chips scroll">${SORTS.map(([k, l]) => chip(l, feedUrl({ sort: k === 'new' ? '' : k }), sort === k)).join('')}
      <button class="chip toggle${s.unreadOnly.feed ? ' on' : ''}" data-act="unread" aria-pressed="${!!s.unreadOnly.feed}">안 읽은 글만</button></div>
    ${cat ? `<div class="chips scroll">${chip('전체 출처', feedUrl({ src: '' }), !src)}${cat.sources.map((x) => chip(`${esc(x.source)} <b>${fmt(x.kept)}</b>`, feedUrl({ src: x.source }), src === x.source)).join('')}</div>` : ''}
  </div>`;
  const rows = posts.slice(0, limit).map((p) => postRow(p)).join('');
  const more = posts.length > limit ? `<button class="more" data-more="${limit + 40}">더 보기 · ${fmt(posts.length - limit)}개 남음</button>` : '';
  const none = s.unreadOnly.feed && total ? '안 읽은 글이 없습니다.' : '아직 모인 글이 없습니다. 다음 수집 때 새로 모읍니다.';
  return frame(`${head}${tools}<section class="list">${rows || empty(none)}</section>${more}`);
}

function rankPage() {
  let posts = cat ? cat.posts : ALL;
  if (site) posts = posts.filter((p) => p.site === site);
  posts = sorted(posts, rankBy).slice(0, 100);
  const label = RANKS.find(([k]) => k === rankBy)[1];
  const head = `<div class="head"><div><h1>${esc(cat ? cat.name : '전체')} ${label} 순위</h1><p>모은 글 중 ${label} 수가 많은 순서 · ${fmt(posts.length)}개</p></div></div>`;
  const tools = `<div class="tools">
    <div class="chips scroll">${RANKS.map(([k, l]) => chip(`${l}순`, rankUrl({ by: k === 'recommends' ? '' : k }), rankBy === k)).join('')}</div>
    <div class="chips scroll">${chip('전체 사이트', rankUrl({ site: '' }), !site)}${Object.entries(SITES).map(([id, l]) => chip(l, rankUrl({ site: id }), site === id)).join('')}</div>
  </div>`;
  const rows = posts.map((p, i) => postRow(p, { rank: i + 1, value: rankBy })).join('');
  return frame(`${head}${tools}<section class="list ranked">${rows || empty('조건에 맞는 글이 없습니다.')}</section>`);
}

function myPage() {
  const s = store.get();
  const scraps = s.scraps.map((id) => CP[id]).filter(Boolean);
  const reads = s.read.map((id) => CP[id]).filter(Boolean).slice(0, 30);
  const hits = ALL.filter((p) => matchKeyword(p.title));
  const links = s.links.map((l) => `<a class="post t-etc" href="${esc(l.url)}" rel="noopener">
      <span class="bar"></span>
      <span class="post-body"><span class="post-title">${esc(l.title)}</span><span class="post-meta"><span>${esc(new URL(l.url).hostname)}</span><span>${ago(l.added)} 담음</span></span></span>
      <button class="del" data-rmlink="${l.id}">삭제</button>
    </a>`).join('');
  const block = (title, body) => `<h2 class="sec">${title}</h2><section class="list">${body}</section>`;
  const dark = s.theme === 'black';
  return frame(`<div class="head"><div><h1>내 모음</h1><p>이 기기의 브라우저에만 저장됩니다.</p></div></div>
    ${kwCard()}
    ${block(`키워드에 맞는 글 · ${fmt(hits.length)}개`, sorted(hits, 'new').slice(0, 30).map((p) => postRow(p)).join('') || empty('관심 키워드가 제목에 들어간 글이 여기에 모입니다.'))}
    ${block(`스크랩 · ${fmt(scraps.length)}개`, scraps.map((p) => postRow(p)).join('') || empty('글 오른쪽의 ☆를 누르면 스크랩됩니다.'))}
    ${block(`직접 담은 글 · ${fmt(s.links.length)}개`, links || empty('아래에서 글 주소를 넣어 담을 수 있습니다.'))}
    ${addLinkCard()}
    ${block('최근 읽은 글', reads.map((p) => postRow(p)).join('') || empty('아직 읽은 글이 없습니다.'))}
    ${sourcesCard(CATS)}
    <section class="card">
      <h2>설정과 백업</h2>
      <p class="hint">다른 기기로 옮기려면 저장한 파일을 그 기기에서 불러오세요.</p>
      <div class="chips">
        <button class="btn ghost" data-act="theme">${dark ? '밝은 화면으로' : '어두운 화면으로'}</button>
        <button class="btn ghost" data-act="export">백업 저장</button>
        <button class="btn ghost" data-act="import">백업 불러오기</button>
        <button class="btn ghost danger" data-act="reset">모두 지우기</button>
      </div>
    </section>`, false);
}

/* ---------------- render + behaviour ---------------- */
function render() {
  const y = window.scrollY;
  const s = store.get();
  document.body.className = `${s.theme === 'black' ? 'black ' : ''}view-${view} team-${cat && TEAM_SHORT[cat.id] ? cat.id : 'all'}`;
  app.innerHTML = { feed: feedPage, rank: rankPage, my: myPage }[view]();
  window.scrollTo(0, y);
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

function modal(html) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}<button class="close" aria-label="닫기">×</button></div>`;
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('.close')) bg.remove(); });
  document.body.appendChild(bg);
}

function addKeyword(word) {
  if (store.addKeyword(word)) { toast(`'${String(word).trim()}' 키워드를 등록했어요`); render(); } else toast('이미 있거나 비어 있는 키워드입니다');
}

document.addEventListener('click', (e) => {
  const t = e.target;
  const scrap = t.closest('[data-scrap]');
  if (scrap) {
    e.preventDefault();
    toast(store.toggleScrap(scrap.dataset.scrap) ? '스크랩했어요' : '스크랩을 취소했어요');
    render();
    return;
  }
  const rml = t.closest('[data-rmlink]');
  if (rml) { e.preventDefault(); store.removeLink(rml.dataset.rmlink); render(); return; }
  const post = t.closest('.post[data-id]');
  if (post) { store.markRead(post.dataset.id); return; } // the link itself opens the post in this tab
  const rm = t.closest('[data-rmkw]');
  if (rm) { store.removeKeyword(rm.dataset.rmkw); render(); return; }
  const word = t.closest('[data-word]');
  if (word) { addKeyword(word.dataset.word); return; }
  const more = t.closest('[data-more]');
  if (more) { params.set('n', more.dataset.more); history.replaceState(null, '', `?${params}`); render(); return; }
  const act = t.closest('[data-act]')?.dataset.act;
  if (!act) return;
  if (act === 'theme') { store.update((s) => { s.theme = s.theme === 'black' ? 'white' : 'black'; }); render(); }
  if (act === 'unread') { store.update((s) => { s.unreadOnly.feed = !s.unreadOnly.feed; }); render(); }
  if (act === 'rules') modal(sourcesCard());
  if (act === 'export') exportData();
  if (act === 'import') importData();
  if (act === 'reset' && confirm('키워드·스크랩·담은 글·읽은 기록을 모두 지울까요?')) { store.reset(); render(); }
});

document.addEventListener('submit', (e) => {
  const kind = e.target.dataset.form;
  if (!kind) return;
  e.preventDefault();
  const f = e.target;
  if (kind === 'kw') { addKeyword(f.elements.kw.value); return; }
  const title = f.elements.title.value.trim();
  let link = f.elements.url.value.trim();
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  try { new URL(link); } catch { toast('글 주소를 확인해 주세요'); return; }
  store.addLink(title || link, link);
  toast('내 모음에 담았어요');
  render();
});

// Coming back from a post with the back button: show it as read, at the same scroll position.
window.addEventListener('pageshow', (e) => { if (e.persisted) render(); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $$('.modal-bg').forEach((m) => m.remove());
});

function exportData() {
  const blob = new Blob([JSON.stringify(store.get(), null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'moa-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json';
  inp.onchange = async () => {
    try { store.replace(JSON.parse(await inp.files[0].text())); toast('불러왔어요'); render(); } catch { toast('불러오지 못했어요'); }
  };
  inp.click();
}

render();
