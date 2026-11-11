import './style.css';
import collected from './collected.json';
import { DEALS, POST_BY_ID, COMM, ago } from './data.js';
import { store, matchKeyword } from './store.js';

const page = document.body.dataset.page || 'home';
// Where the site lives (works at the top of a domain or in a sub-folder such as GitHub Pages).
const R = new URL(/* @vite-ignore */ '../', import.meta.url).pathname;
const app = document.getElementById('app');

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

const SITES = {
  dcinside: { short: '디시', color: '#3b4890' },
  fmkorea: { short: '에펨', color: '#5176CF' },
  mlbpark: { short: '엠팍', color: '#FE5E00' },
};
const siteOf = (p) => SITES[p.site] || { short: '글', color: '#818480' };

// Team colours: each big category is painted in its team's colours wherever it appears.
// main/deep = background, ink = text on that background, accent = thin lines and highlights.
const TEAMS = {
  kiwoom: { main: '#820024', deep: '#4A0015', ink: '#FFFFFF', accent: '#E8B4C0', mono: '키움' },
  dplus: { main: '#0B0B0C', deep: '#12302B', ink: '#2EE6C5', accent: '#2EE6C5', mono: 'DK' },
};
const NO_TEAM = { main: '#495464', deep: '#2B2F38', ink: '#FFFFFF', accent: '#C3C3C3', mono: '' };
function teamOf(catId) {
  if (TEAMS[catId]) return TEAMS[catId];
  const c = (collected.categories || []).find((x) => x.id === catId);
  return c ? { ...NO_TEAM, main: c.color || NO_TEAM.main, mono: c.name.slice(0, 2) } : NO_TEAM;
}
const teamVars = (catId) => {
  const t = teamOf(catId);
  return `--team:${t.main};--team-deep:${t.deep};--team-ink:${t.ink};--team-accent:${t.accent}`;
};

function timeAgo(ts) {
  if (!ts) return '';
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
  return ago(mins);
}

/* ---------------- collected posts ---------------- */
const CATS = (collected.categories || []).map((c) => ({
  ...c,
  posts: c.posts.map((p) => ({ ...p, id: `c${hash(p.url)}`, cat: c.id, catName: c.name, real: true })),
}));
const CP = {};
CATS.forEach((c) => c.posts.forEach((p) => { CP[p.id] = p; }));
const ALL = Object.values(CP);
const findPost = (id) => CP[id] || POST_BY_ID[id] || null;
const score = (p) => (p.recommends || 0) * 2 + (p.comments || 0);
const sorted = (list, key) => list.slice().sort((a, b) => {
  if (key === 'hot') return score(b) - score(a);
  if (key === 'new') return (b.ts || 0) - (a.ts || 0);
  return (b[key] || 0) - (a[key] || 0);
});
const updatedAgo = collected.updated ? timeAgo(Date.parse(collected.updated)) : '';

function highlight(title) {
  const s = store.get();
  let out = esc(title);
  for (const k of s.keywords) {
    if (!k) continue;
    const re = new RegExp(esc(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, (m) => `<span class="word_s">${m}</span>`);
  }
  return out;
}

/* ---------------- rows ---------------- */
function thumbStyle(p) {
  const t = teamOf(p.cat);
  return `background-image:linear-gradient(135deg, ${t.main} 0%, ${t.deep} 100%);box-shadow:inset 3px 0 0 ${t.accent}`;
}

function issueRow(p, opts = {}) {
  const s = store.get();
  const read = s.read.includes(p.id) ? ' on' : '';
  const star = s.scraps.includes(p.id) ? '<span class="star">★</span>' : '';
  const badge = opts.count ? `<span>${opts.count}</span>` : '';
  const href = p.real ? `href="${esc(p.url)}" target="_blank" rel="noopener"` : 'href="#"';
  return `<a class="article t${read}" ${href} data-id="${p.id}">
    <div class="thumb" style="${thumbStyle(p)}"><em class="site_tag" style="color:${teamOf(p.cat).ink}">${siteOf(p).short}</em>${badge}</div>
    <span class="title">${star}${highlight(p.title)}<span class="btmlayer"><span class="byte"><u>${esc(p.source || '')}</u></span><span class="hit"><u>${fmt(p.views)}</u></span><span class="good"><u><i class="f_aicon navit"></i>${fmt(p.comments)}</u></span><span class="good"><u><i class="f_aicon good"></i>${fmt(p.recommends)}</u></span><span class="time right"><u><i class="f_aicon clock"></i>${timeAgo(p.ts) || esc(p.date || '')}</u></span></span></span>
  </a>`;
}

function rankRow(p, i, key) {
  const s = store.get();
  const read = s.read.includes(p.id) ? ' on' : '';
  const star = s.scraps.includes(p.id) ? '<span class="star">★</span>' : '';
  const href = p.real ? `href="${esc(p.url)}" target="_blank" rel="noopener"` : 'href="#"';
  return `<a class="article${read}" ${href} data-id="${p.id}" title="${esc(p.source || '')}">
    <span class="lo rank" style="background-color:${teamOf(p.cat).main};color:${teamOf(p.cat).ink}">${i + 1}</span><span class="lpadding title">${star}${highlight(p.title)}</span><span class="roverlay"><span class="cnt">${fmt(p[key])}</span></span>
  </a>`;
}

function listBlock({ id, title, rows, cls = '', noRead = true, more = '', tip = '', extra = '', team = '' }) {
  const s = store.get();
  const unreadOn = s.unreadOnly[id] ? ' on' : '';
  const btns = [
    tip ? `<button class="tipw" data-tip="${esc(tip)}">?</button>` : '',
    noRead ? `<button class="no_read${unreadOn}" data-list="${id}">안읽은글</button>` : '',
    more ? `<a class="more" href="${more}">더 보기</a>` : '',
  ].join('');
  return `<div class="aalist ${cls}${team ? ' teamed' : ''}" data-list="${id}"${team ? ` style="${teamVars(team)}"` : ''}>
    <div class="class_title">${esc(title)}<div class="right">${btns}</div></div>
    ${extra}<div class="list">${rows || '<div class="empty">아직 모인 글이 없습니다.<br>다음에 다시 만들 때(빌드) 새로 모읍니다.</div>'}</div>
  </div>`;
}

const visible = (list, listId) => {
  const s = store.get();
  return s.unreadOnly[listId] ? list.filter((p) => !s.read.includes(p.id)) : list;
};

/* ---------------- shared frame ---------------- */
function header() {
  return `<div class="cwarp2"><div id="symbol" title="메뉴" role="button" aria-label="메뉴 열기"><span></span><span></span><span></span><span></span></div></div>
  <div id="header">
    <div id="cread"><i></i></div>
    <div class="cwarp2"><div class="block mr"><div id="symbol_txt" title="처음으로"><span class="wordmark big">MOAMOA</span><span class="wordmark small">MO</span></div></div></div>
  </div>`;
}

function submenu() {
  const items = [['home', R, 'home'], ['issue', `${R}issue/`, 'issue', true], ['mirror', `${R}mirror/`, 'mirror'], ['deal', `${R}deal/`, 'deal', true]];
  return `<div id="submenu">${items.map(([k, href, label, beta]) => `<div class="${page === k ? 'on' : ''}"><a href="${href}">${label}${beta ? '<span class="beta">beta</span>' : ''}</a></div>`).join('')}</div>`;
}

function leftCard() {
  const s = store.get();
  return `<div id="left_side"><div class="la tleft">
    <span class="pill">MY</span>
    <div class="logo"><b></b></div>
    <div class="brand">내 관심 키워드</div>
    <div class="visual"><i style="width:40px;height:40px;left:14px;top:22px"></i><i style="width:22px;height:22px;left:86px;top:40px"></i></div>
    <div class="rule"></div>
    <h3>관심 단어를<br>노랗게 표시해요!</h3>
    <div class="chips">${s.keywords.map((k) => `<span class="chip">${esc(k)}<span class="x" data-rmkw="${esc(k)}">×</span></span>`).join('') || '<span class="sub">아직 없음</span>'}</div>
    <div class="sub">글 제목에 들어 있으면<br>강조해서 보여줍니다</div>
    <input id="kw_input_left" placeholder="키워드 입력 후 Enter" aria-label="관심 키워드" maxlength="20">
    <button class="cta" data-addkw="#kw_input_left">키워드 추가</button>
  </div></div>`;
}

function sidebar() {
  const s = store.get();
  const scraps = s.scraps.map(findPost).filter(Boolean).slice(0, 4);
  const list = scraps.length ? scraps : sorted(ALL, 'hot').slice(0, 4);
  const badge = scraps.length ? '<span class="ad_alert">스크랩</span>' : '<span class="ad_alert recommend">인기</span>';
  const rows = list.map((p, i) => `<div class="adrow${i % 2 ? ' pic' : ''}">
      ${badge}
      ${i % 2 ? `<a class="thumb" style="${thumbStyle(p)}" data-open="${p.id}" aria-label="${esc(p.title)}"></a>` : ''}
      <a class="title" data-open="${p.id}">${esc(p.title)}</a>
      <span class="url">${esc(p.catName || '')} · ${esc(p.source || '')}</span>
      <p class="desc">조회수 ${fmt(p.views)}회 · 추천 ${fmt(p.recommends)} · 댓글 ${fmt(p.comments)}</p>
    </div>`).join('');
  return `<div id="sidebar">
    <form id="loginForm" autocomplete="off">
      <input class="id" name="title" placeholder="담을 글 제목" aria-label="담을 글 제목">
      <input class="pw" name="url" placeholder="글 주소 (https://...)" aria-label="글 주소">
      <div class="btns"><input class="login" type="submit" value="글 담기"><input class="join" type="button" value="내 모음" data-href="${R}my/"></div>
    </form>
    <div class="la l300 naver bg"><div class="ad_card">${rows || '<div class="adrow"><span class="desc">모인 글이 없습니다</span></div>'}</div></div>
    <div id="word_trend">
      <div class="title" title="${esc(updatedAgo)}">Mirror cloud<div class="right class_title_like"><button class="tipw" data-tip="모은 글 제목에 많이 나온 단어입니다. 단어를 누르면 관심 키워드로 등록돼요.">?</button></div></div>
      <div id="words_cloud"></div>
    </div>
    <div id="short_cut" class="class_title_box">
      <div class="title">단축키 (Short Cut)</div>
      <div class="short_cut_hint"><table><tbody><tr>
        <td class="keyboard">
          <div class="line l0"><i data-k="home">1</i><i data-k="issue">2</i><i data-k="mirror">3</i><i data-k="deal">4</i></div>
          <div class="line l1"><i class="d">Q</i><i data-k="위로">W</i><i data-k="내 모음 (읽은 글)">E</i><i data-k="내 스크랩">R</i></div>
          <div class="line l2"><i data-k="이전화면">A</i><i data-k="아래로">S</i><i data-k="안읽은글만 보기">D</i><i class="d">F</i></div>
          <div class="line l3"><i class="d">Z</i><i class="d">X</i><i data-k="맨 위로">C</i><i class="d">V</i></div>
        </td>
        <td valign="middle" align="center"><span class="exp">단축키 사용법<br>(←마우스를 올리세요)</span></td>
      </tr></tbody></table></div>
    </div>
  </div>
  <div id="sidebarbg"></div>`;
}

function bottomCards() {
  const s = store.get();
  const mine = [
    ...s.links.map((l) => ({ kind: 'link', title: l.title, url: l.url, lines: [new URL(l.url).hostname, `직접 담은 글 · ${timeAgo(l.added)}`] })),
  ];
  let cards;
  if (mine.length) {
    cards = mine.slice(0, 4).map((m) => ({ ...m, badge: '담음', ctg: '', count: 1, colors: ['#820024'] }));
  } else {
    const srcs = CATS.flatMap((c) => c.sources.map((src) => ({ ...src, cat: c }))).sort((a, b) => b.kept - a.kept).slice(0, 4);
    cards = srcs.map((src) => {
      const posts = src.cat.posts.filter((p) => p.source === src.source);
      return {
        kind: 'source', title: src.source, url: src.url, ctg: src.cat.name, badge: '출처',
        sub: new URL(src.url).hostname,
        lines: [`${fmt(src.seen)}개 확인 · ${fmt(src.kept)}개 모음${src.error ? (src.kept ? ' · 일부만 읽음' : ' · 이번엔 못 읽음') : ''}`, posts[0] ? `최근: ${posts[0].title}` : '조건에 맞는 글이 아직 없어요'],
        count: Math.min(3, Math.max(1, posts.length)), colors: [teamOf(src.cat.id).main, teamOf(src.cat.id).deep, teamOf(src.cat.id).main],
      };
    });
  }
  const html = cards.map((c) => {
    const n = c.count || 1;
    const thumbs = n >= 3
      ? ['s3', 's2', 's1'].map((k, i) => `<a class="thumb ${k}" style="background-image:linear-gradient(135deg, ${c.colors[i % c.colors.length]}, #2b2f38)" aria-label="${esc(c.title)}"></a>`).join('') + '<span class="thumbcnt"><b>3</b></span>'
      : `<a class="thumb" style="background-image:linear-gradient(135deg, ${c.colors[0]}, #2b2f38)" aria-label="${esc(c.title)}"></a>`;
    return `<div class="adrow pic ${n >= 3 ? 'thumb_3' : 'thumb_1'}">
      <span class="ad_alert${c.kind === 'link' ? ' recommend' : ''}">${c.badge}</span>
      ${thumbs}
      <a class="title" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title)}&nbsp;<span class="ctg_name">${esc(c.ctg || '')}</span></a>
      <a class="url" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.sub || '')}</a>
      ${c.lines.map((l) => `<p class="desc">${esc(l)}</p>`).join('')}
    </div>`;
  }).join('');
  return `<div class="cwarp2"><div class="la btm naver big place bg"><div class="ad_card">${html}</div></div></div>`;
}

function footer() {
  const s = store.get();
  const sb = s.sidebar;
  return `<footer id="footer"><div class="cwarp">
    <p>Copyright 2026 MOAMOA · 마지막으로 모은 시각: ${esc(updatedAgo || '-')}</p>
    <p>내 모음 백업 : <button class="b" data-act="export">저장</button> or <button class="b" data-act="import">불러오기</button> or <a class="b" href="${R}my/">내 모음</a></p>
    <p>Backup my collection : <button class="b" data-act="export">Save</button> or <button class="b" data-act="import">Load</button></p>
    <p>모음 초기화 <button class="b" data-act="reset">Reset</button></p>
    <p class="bsidebar">사이드바 옵션 (Remove sidebar)<span class="bsw">
      <button class="btn${sb === 'left' ? ' on' : ''}" data-sb="left">왼쪽</button><button class="btn${sb === 'right' ? ' on' : ''}" data-sb="right">오른쪽</button><button class="btn${sb === 'off' ? ' on' : ''}" data-sb="off">끄기</button>
    </span></p>
    <p class="site_thema">사이트 테마 변경 (Change site theme)<button class="btn black" data-theme="black">black</button><button class="btn white" data-theme="white">white</button></p>
  </div></footer>`;
}

function frame(content, { bottom = true } = {}) {
  return `${header()}
  <div id="container" class="cwarp">
    ${leftCard()}
    ${submenu()}
    <main id="content">${content}</main>
    ${sidebar()}
  </div>
  <div class="clear"></div>
  ${bottom ? bottomCards() : ''}
  ${footer()}
  <div id="toast"></div>`;
}

/* ---------------- pages ---------------- */
function homePage() {
  const [a, b] = [CATS[0], CATS[1] || CATS[0]];
  if (!a) return frame('<div class="aalist"><div class="empty">카테고리가 없습니다.</div></div>');
  const latest = (c) => visible(sorted(c.posts, 'new'), `new_${c.id}`).slice(0, 7).map((p) => issueRow(p)).join('');
  const hot = (c) => visible(sorted(c.posts, 'hot'), `hot_${c.id}`).slice(0, 7).map((p) => issueRow(p, { count: p.comments })).join('');
  const rules = (c) => `${c.name} 관련 글 중 추천 ${c.minRecommend}개 이상 또는 댓글 ${c.minComments}개 이상인 글만 모읍니다. 키워드: ${c.keywords.join(', ')}`;

  const top = `<div class="clear flow">
    ${listBlock({ id: `new_${a.id}`, title: `${a.name} 새 글 모음`, rows: latest(a), cls: 'fl', team: a.id, more: `${R}issue/?cat=${a.id}` })}
    ${listBlock({ id: `new_${b.id}`, title: `${b.name} 새 글 모음`, rows: latest(b), cls: 'fl ml8', team: b.id })}
    ${listBlock({ id: `hot_${a.id}`, title: `${a.name} 인기 글 모음`, rows: hot(a), cls: 'fl', team: a.id })}
    ${listBlock({ id: `hot_${b.id}`, title: `${b.name} 인기 글 ♥ 모음`, rows: hot(b), cls: 'fl ml8', team: b.id, tip: rules(b), more: `${R}issue/?cat=${b.id}&sort=hot` })}
  </div>`;

  const mid = `<div class="la mid naver big bg"><div class="ad_card">${CATS.slice(0, 2).map((c) => `<div class="adrow pic teamcard" style="${teamVars(c.id)}">
      <span class="ad_alert">모음</span>
      <a class="thumb mono" href="${R}issue/?cat=${c.id}" aria-label="${esc(c.name)} 모아보기">${esc(teamOf(c.id).mono)}</a>
      <a class="title" href="${R}issue/?cat=${c.id}">${esc(c.name)} 모아보기 · ${fmt(c.posts.length)}개</a>
      <a class="url" href="${R}issue/?cat=${c.id}">키워드: ${esc(c.keywords.join(' · '))}</a>
      <p class="desc">추천 ${c.minRecommend}+ 또는 댓글 ${c.minComments}+ · ${esc(c.sources.map((x) => x.source).join(', '))}</p>
    </div>`).join('')}</div></div>`;

  const help = `<div class="mirror_help"><p><span class="red" data-act="rules">카테고리</span>를 누르면 모으는 기준을 보고 <span class="red" data-act="rules">편집</span>방법을 확인할 수 있습니다.</p></div>`;

  const hidden = CATS.reduce((n, c) => n + c.sources.reduce((m, x) => m + Math.max(0, x.seen - x.kept), 0), 0);
  const byRec = visible(sorted(ALL, 'recommends'), 'rank_rec').slice(0, 32);
  const byView = visible(sorted(ALL, 'views'), 'rank_view').slice(0, 15);
  const byCmt = visible(sorted(ALL, 'comments'), 'rank_cmt').slice(0, 15);
  const ranks = `<div class="clear col2">
    <div class="colw">${listBlock({ id: 'rank_rec', title: '모은 글 추천순 (전체)', rows: byRec.map((p, i) => rankRow(p, i, 'recommends')).join(''), cls: 'mirror', more: `${R}mirror/?orderby=recommends` })}</div>
    <div class="colw">
      ${listBlock({ id: 'rank_view', title: '모은 글 많이 읽은 순서', rows: byView.map((p, i) => rankRow(p, i, 'views')).join(''), cls: 'mirror' })}
      ${listBlock({ id: 'rank_cmt', title: '모은 글 댓글순', rows: byCmt.map((p, i) => rankRow(p, i, 'comments')).join(''), cls: 'mirror', more: `${R}mirror/?orderby=comments`,
        extra: `<a class="notice" href="#" data-act="rules">기준에 못 미친 글(${fmt(hidden)})개가 숨겨졌습니다. [기준 보기] <span>[?]</span></a>` })}
    </div>
  </div>`;
  return frame(top + mid + help + ranks);
}

const params = new URLSearchParams(location.search);

function sortTabs(base, current, tabs) {
  return tabs.map(([k, label]) => `<a class="${current === k ? 'on' : ''}" href="${base}${base.includes('?') ? '&' : '?'}sort=${k}">${label}</a>`).join('');
}

function issuePage() {
  const catId = params.get('cat') || CATS[0]?.id;
  const cat = CATS.find((c) => c.id === catId) || CATS[0];
  const sort = params.get('sort') || 'new';
  const src = params.get('src') || '';
  let posts = cat ? cat.posts : [];
  if (src) posts = posts.filter((p) => p.source === src);
  posts = visible(sorted(posts, sort), 'issue_all');
  const limit = Number(params.get('n') || 40);
  const base = `${R}issue/?cat=${cat?.id || ''}${src ? `&src=${encodeURIComponent(src)}` : ''}`;
  const tools = `<div class="page_tools">${CATS.map((c) => `<a class="${c.id === cat?.id ? 'on' : ''}" href="${R}issue/?cat=${c.id}">${esc(c.name)} (${c.posts.length})</a>`).join('')}</div>
    <div class="page_tools">${sortTabs(base, sort, [['new', '최신순'], ['hot', '인기순'], ['recommends', '추천순'], ['comments', '댓글순'], ['views', '조회순']])}</div>
    <div class="page_tools"><a class="${!src ? 'on' : ''}" href="${R}issue/?cat=${cat?.id}&sort=${sort}">전체 출처</a>${(cat?.sources || []).map((x) => `<a class="${src === x.source ? 'on' : ''}" href="${R}issue/?cat=${cat.id}&sort=${sort}&src=${encodeURIComponent(x.source)}"><i class="sw" style="background:${SITES[x.site]?.color}"></i>${esc(x.source)} ${x.kept}</a>`).join('')}</div>`;
  const rows = posts.slice(0, limit).map((p) => issueRow(p, sort === 'new' ? {} : { count: p.comments })).join('');
  const more = posts.length > limit ? `<div class="more_btn"><button data-more="${limit + 40}">더 보기 (${posts.length - limit}개 남음)</button></div>` : '';
  return frame(listBlock({ id: 'issue_all', title: `${cat?.name || ''} 모아보기 · ${posts.length}개`, rows, extra: tools, team: cat?.id || '', tip: cat ? `키워드: ${cat.keywords.join(', ')} / 추천 ${cat.minRecommend}+ 또는 댓글 ${cat.minComments}+` : '' }) + more);
}

function mirrorPage() {
  const key = ['recommends', 'comments', 'views'].includes(params.get('orderby')) ? params.get('orderby') : 'recommends';
  const site = params.get('site') || '';
  let posts = ALL;
  if (site) posts = posts.filter((p) => p.site === site);
  posts = visible(sorted(posts, key), 'mirror_all').slice(0, 100);
  const tools = `<div class="page_tools">${[['recommends', '추천순'], ['comments', '댓글순'], ['views', '조회순']].map(([k, l]) => `<a class="${k === key ? 'on' : ''}" href="${R}mirror/?orderby=${k}${site ? `&site=${site}` : ''}">${l}</a>`).join('')}</div>
    <div class="page_tools"><a class="${!site ? 'on' : ''}" href="${R}mirror/?orderby=${key}">전체 사이트</a>${Object.entries(SITES).map(([id, x]) => `<a class="${site === id ? 'on' : ''}" href="${R}mirror/?orderby=${key}&site=${id}"><i class="sw" style="background:${x.color}"></i>${x.short}</a>`).join('')}</div>`;
  return frame(listBlock({ id: 'mirror_all', title: '모은 글 순위 (모든 카테고리)', rows: posts.map((p, i) => rankRow(p, i, key)).join(''), cls: 'mirror', extra: tools }));
}

function dealPage() {
  const rows = DEALS.map((p) => issueRow({ ...p, source: p.shop, views: p.hits, recommends: p.likes, comments: p.cmt, ts: Date.now() - p.mins * 60000, site: '' })).join('');
  return frame(listBlock({ id: 'deal', title: '핫딜 모음 (예시)', rows, tip: '핫딜은 아직 예시 글입니다. 모을 게시판을 알려주시면 연결할 수 있어요.' }));
}

function myPage() {
  const s = store.get();
  const scraps = s.scraps.map(findPost).filter(Boolean);
  const reads = s.read.map(findPost).filter(Boolean).slice(0, 30);
  const kwHits = ALL.filter((p) => matchKeyword(p.title));
  const links = s.links.map((l) => `<a class="article" href="${esc(l.url)}" target="_blank" rel="noopener"><span class="title">${esc(l.title)}<span class="btmlayer"><span><u>${esc(new URL(l.url).hostname)}</u></span><span class="right"><u>${timeAgo(l.added)}</u></span></span></span><button class="del" data-rmlink="${l.id}">삭제</button></a>`).join('');
  const kw = `<div class="chips_row">${s.keywords.map((k) => `<span class="chip">${esc(k)}<span class="x" data-rmkw="${esc(k)}">×</span></span>`).join('') || '키워드가 없습니다.'}</div>
    <div class="my_form"><input id="kw_input_my" placeholder="관심 키워드 (예: 쵸비, 안우진)" aria-label="관심 키워드" maxlength="20"><button data-addkw="#kw_input_my">추가</button></div>`;
  const rules = CATS.map((c) => `<div class="article"><span class="title" style="white-space:normal;line-height:150%"><b>${esc(c.name)}</b> — 키워드: ${esc(c.keywords.join(', '))} / 추천 ${c.minRecommend}+ 또는 댓글 ${c.minComments}+<span class="btmlayer">${c.sources.map((x) => `<span><u>${esc(x.source)} ${x.kept}/${x.seen}${x.error ? ' (실패)' : ''}</u></span>`).join('')}</span></span></div>`).join('');
  return frame(
    listBlock({ id: 'my_rules', title: '큰 카테고리 (모으는 기준)', rows: rules, noRead: false })
    + listBlock({ id: 'my_kw', title: `관심 키워드 · 맞는 글 ${kwHits.length}개`, rows: kwHits.slice(0, 30).map((p) => issueRow(p)).join(''), extra: kw })
    + listBlock({ id: 'my_scrap', title: `스크랩 · ${scraps.length}개`, rows: scraps.map((p) => issueRow(p)).join('') || '<div class="empty">글에 마우스를 올리고 ☆를 누르면 스크랩됩니다.</div>', noRead: false })
    + listBlock({ id: 'my_links', title: `직접 담은 글 · ${s.links.length}개`, rows: links || '<div class="empty">오른쪽(휴대폰은 메뉴) "글 담기"로 아무 커뮤니티 글이나 담을 수 있어요.</div>', noRead: false })
    + listBlock({ id: 'my_read', title: '최근 읽은 글', rows: reads.map((p) => issueRow(p)).join('') || '<div class="empty">아직 읽은 글이 없습니다.</div>', noRead: false }),
    { bottom: false },
  );
}

/* ---------------- render + behaviour ---------------- */
function render() {
  const y = window.scrollY;
  const s = store.get();
  document.body.classList.toggle('black', s.theme === 'black');
  document.body.classList.remove('sb-left', 'sb-right', 'sb-off');
  document.body.classList.add(`sb-${s.sidebar}`);
  app.innerHTML = { home: homePage, issue: issuePage, mirror: mirrorPage, deal: dealPage, my: myPage }[page]?.() || homePage();
  addStars();
  drawCloud();
  window.scrollTo(0, y);
}

function addStars() {
  for (const a of $$('.article[data-id]')) {
    const b = document.createElement('button');
    b.className = 'scrap_btn';
    b.dataset.scrap = a.dataset.id;
    b.title = '스크랩'; b.setAttribute('aria-label', '스크랩');
    b.textContent = store.isScrap(a.dataset.id) ? '★' : '☆';
    a.appendChild(b);
  }
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
  bg.innerHTML = `<div class="modal">${html}<button class="close" aria-label="닫기">×</button></div>`;
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('.close')) bg.remove(); });
  document.body.appendChild(bg);
  return bg;
}

function openPost(id) {
  const p = findPost(id);
  if (!p) return;
  store.markRead(id);
  if (p.real) { window.open(p.url, '_blank', 'noopener'); render(); return; }
  const c = COMM[p.comm] || { name: '', color: '#888' };
  const bg = modal(`<div class="head">${esc(p.title)}</div>
    <div class="meta"><span class="tag" style="background:${c.color}">${esc(c.name)}</span>조회 ${fmt(p.hits)} · 댓글 ${fmt(p.cmt)} · ${ago(p.mins)}</div>
    <div class="pic" style="background:linear-gradient(135deg,hsl(${p.hue} 55% 60%),hsl(${p.hue2} 55% 30%))"></div>
    <div class="body">${p.body.map(esc).join('<br>')}</div>
    <div class="acts"><button class="primary" data-scrap="${p.id}">${store.isScrap(p.id) ? '★ 스크랩됨' : '☆ 스크랩'}</button></div>`);
  bg.addEventListener('click', (e) => { if (e.target.closest('[data-scrap]')) bg.remove(); });
  render();
}

function showRules() {
  modal(`<div class="head">모으는 기준 (큰 카테고리)</div>
    ${CATS.map((c) => `<div class="meta"><span class="tag" style="background:${teamOf(c.id).main};color:${teamOf(c.id).ink}">${esc(c.name)}</span>키워드 ${esc(c.keywords.join(', '))} · 추천 ${c.minRecommend}개 이상 또는 댓글 ${c.minComments}개 이상</div>
    <div class="body">${c.sources.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.source)}</a> — ${x.seen}개 확인, ${x.kept}개 모음${x.error ? ` <b style="color:#c00">(읽기 실패: ${esc(x.error)})</b>` : ''}`).join('<br>')}</div>`).join('')}
    <div class="body" style="font-size:9pt;color:#888">팀 전용 게시판(디시 갤러리, 엠팍 키움 말머리)은 모든 글을 관련 글로 보고, 에펨코리아는 제목에 키워드가 있는 글만 모읍니다. 마지막으로 모은 시각: ${esc(updatedAgo)}. 기준이나 게시판을 바꾸고 싶으면 말씀해 주세요.</div>`);
}

function tipAt(el, text) {
  $$('.tip').forEach((t) => t.remove());
  if (!text) return;
  const t = document.createElement('div');
  t.className = 'tip';
  t.textContent = text;
  document.body.appendChild(t);
  const r = el.getBoundingClientRect();
  const left = Math.min(window.innerWidth - t.offsetWidth - 6, Math.max(6, r.left + r.width / 2 - t.offsetWidth / 2));
  t.style.left = `${left + window.scrollX}px`;
  t.style.top = `${r.bottom + window.scrollY + 6}px`;
}

function addKeyword(word) {
  if (store.addKeyword(word)) { toast(`'${word}' 관심 키워드로 등록했어요`); render(); } else toast('이미 있거나 비어 있는 키워드입니다');
}

document.addEventListener('click', (e) => {
  const t = e.target;
  const scrapBtn = t.closest('[data-scrap]');
  if (scrapBtn) {
    e.preventDefault(); e.stopPropagation();
    const on = store.toggleScrap(scrapBtn.dataset.scrap);
    toast(on ? '스크랩했어요' : '스크랩을 취소했어요');
    render();
    return;
  }
  const art = t.closest('.article[data-id]');
  if (art) {
    const p = findPost(art.dataset.id);
    if (p?.real) { store.markRead(p.id); setTimeout(render, 50); return; }
    e.preventDefault(); openPost(art.dataset.id); return;
  }
  const open = t.closest('[data-open]');
  if (open) { e.preventDefault(); openPost(open.dataset.open); return; }
  const nr = t.closest('.no_read');
  if (nr) { store.update((s) => { s.unreadOnly[nr.dataset.list] = !s.unreadOnly[nr.dataset.list]; }); render(); return; }
  const tip = t.closest('[data-tip]');
  if (tip) { tipAt(tip, tip.dataset.tip); return; }
  $$('.tip').forEach((x) => x.remove());
  const rm = t.closest('[data-rmkw]');
  if (rm) { store.removeKeyword(rm.dataset.rmkw); render(); return; }
  const add = t.closest('[data-addkw]');
  if (add) { const inp = $(add.dataset.addkw); addKeyword(inp?.value); return; }
  const rml = t.closest('[data-rmlink]');
  if (rml) { e.preventDefault(); store.removeLink(rml.dataset.rmlink); render(); return; }
  const more = t.closest('[data-more]');
  if (more) { params.set('n', more.dataset.more); history.replaceState(null, '', `?${params}`); render(); return; }
  const href = t.closest('[data-href]');
  if (href) { location.href = href.dataset.href; return; }
  const sb = t.closest('[data-sb]');
  if (sb) { store.update((s) => { s.sidebar = sb.dataset.sb; }); document.body.classList.remove('side'); render(); return; }
  const th = t.closest('[data-theme]');
  if (th) { store.update((s) => { s.theme = th.dataset.theme; }); render(); return; }
  const act = t.closest('[data-act]');
  if (act) {
    e.preventDefault();
    const a = act.dataset.act;
    if (a === 'rules') showRules();
    if (a === 'export') exportData();
    if (a === 'import') importData();
    if (a === 'reset' && confirm('키워드·스크랩·담은 글·읽은 기록을 모두 지울까요?')) { store.reset(); render(); }
    return;
  }
  if (t.closest('#symbol')) { document.body.classList.toggle('side'); return; }
  if (t.closest('#sidebarbg')) { document.body.classList.remove('side'); return; }
  if (t.closest('#symbol_txt')) { location.href = R; }
});

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'loginForm') return;
  e.preventDefault();
  const f = e.target;
  const title = f.title.value.trim();
  let url = f.url.value.trim();
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  try { new URL(url); } catch { toast('글 주소를 확인해 주세요'); return; }
  store.addLink(title || url, url);
  toast('내 모음에 담았어요');
  render();
});

document.addEventListener('keydown', (e) => {
  if (e.target.id?.startsWith('kw_input') && e.key === 'Enter') { addKeyword(e.target.value); return; }
  if (e.target.closest('input, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  const go = { 1: R, 2: `${R}issue/`, 3: `${R}mirror/`, 4: `${R}deal/`, e: `${R}my/`, r: `${R}my/` }[k];
  if (go) { location.href = go; return; }
  if (k === 'w') window.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' });
  if (k === 's') window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
  if (k === 'c') window.scrollTo({ top: 0, behavior: 'smooth' });
  if (k === 'a') history.back();
  if (k === 'd') {
    const ids = $$('.no_read').map((b) => b.dataset.list);
    const on = !ids.every((id) => store.get().unreadOnly[id]);
    store.update((s) => { ids.forEach((id) => { s.unreadOnly[id] = on; }); });
    toast(on ? '안읽은글만 보여줍니다' : '모든 글을 보여줍니다');
    render();
  }
  if (k === 'escape') { document.body.classList.remove('side'); $$('.modal-bg').forEach((m) => m.remove()); }
});

document.addEventListener('mouseover', (e) => {
  const key = e.target.closest('.short_cut_hint i[data-k]');
  const exp = $('.short_cut_hint .exp');
  if (!exp) return;
  exp.innerHTML = key ? `<b>${esc(key.textContent)}</b> : ${esc(key.dataset.k)}` : '단축키 사용법<br>(←마우스를 올리세요)';
});

window.addEventListener('scroll', () => {
  const bar = $('#cread i');
  if (!bar) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
}, { passive: true });

function exportData() {
  const blob = new Blob([JSON.stringify(store.get(), null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'moamoa-backup.json';
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

/* ---------------- word cloud ---------------- */
const STOP = new Set(['진짜', '그냥', '근데', '이거', '오늘', '지금', '이번', '그리고', '이제', '너무', '없는', '있는', '하는', '하고', '이게', '이건', '저거', '것', '좀', '왜', '다', '더', '또', '나', '내', '수', '거']);
let cloudBoxes = [];
function drawCloud() {
  const box = $('#words_cloud');
  if (!box) return;
  const counts = new Map();
  for (const p of ALL) {
    for (let w of p.title.split(/[\s,.!?~()[\]"'“”‘’/·…|:;]+/)) {
      w = w.replace(/(은|는|이|가|을|를|의|에|도|로|으로|에서|한테|까지|ㅋ+|ㅎ+)$/u, '');
      if (w.length < 2 || STOP.has(w) || /^\d+$/.test(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  for (const k of store.get().keywords) counts.set(k, (counts.get(k) || 0) + 3);
  const words = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 140);
  const W = 300; const H = 300;
  const dpr = window.devicePixelRatio || 1;
  const cv = document.createElement('canvas');
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = `${W}px`; cv.style.height = `${H}px`;
  box.innerHTML = '';
  box.appendChild(cv);
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  // Team colours: burgundy shades, black/grey and mint shades (lighter set on the black theme).
  const palette = document.body.classList.contains('black')
    ? ['#E06A86', '#C2405E', '#F0A8B8', '#E6E6E6', '#9AA0A6', '#2EE6C5', '#14BFA3', '#8FF2E0', '#B8457A', '#7A7F86']
    : ['#820024', '#A8324E', '#5C0019', '#0B0B0C', '#3A3D42', '#0F9E88', '#14BFA3', '#0A7A69', '#B8457A', '#6E7074'];
  const max = words[0]?.[1] || 1;
  const placed = [];
  cloudBoxes = [];
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const hit = (b) => b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H || placed.some((q) => b.x < q.x + q.w && b.x + b.w > q.x && b.y < q.y + q.h && b.y + b.h > q.y);
  words.forEach(([w, n], i) => {
    const size = Math.round(12 + 36 * Math.sqrt(n / max));
    ctx.font = `${size}px ${getComputedStyle(document.body).fontFamily}`;
    const tw = ctx.measureText(w).width;
    const vert = i > 0 && rand() < 0.4;
    const bw = vert ? size : tw; const bh = vert ? tw : size;
    for (let s = 0; s < 1400; s++) {
      const ang = s * 0.35; const rad = 1.4 * Math.sqrt(s) * 3;
      const b = { x: W / 2 + rad * Math.cos(ang) - bw / 2, y: H / 2 + rad * Math.sin(ang) * 0.95 - bh / 2, w: bw, h: bh };
      if (hit(b)) continue;
      placed.push(b);
      ctx.save();
      ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.translate(b.x + bw / 2, b.y + bh / 2);
      if (vert) ctx.rotate(-Math.PI / 2);
      ctx.fillText(w, 0, size * 0.05);
      ctx.restore();
      cloudBoxes.push({ ...b, w: bw, h: bh, word: w });
      break;
    }
  });
  cv.onclick = (e) => {
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left; const y = e.clientY - r.top;
    const b = cloudBoxes.find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
    if (b) addKeyword(b.word);
  };
}

render();
