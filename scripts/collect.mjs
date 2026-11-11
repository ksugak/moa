// Collects posts for each big category from the boards listed in collect.config.json
// and writes src/collected.json. Runs before every build. It never fails the build:
// if a board can't be read, the posts collected last time are kept.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(resolve(root, 'collect.config.json'), 'utf8'));
const outFile = resolve(root, 'src/collected.json');
const previous = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : null;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#039': "'" };
function text(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '') // search pages wrap the matched word in a tag; don't add spaces around it
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
      if (ENT[e.toLowerCase()] != null) return ENT[e.toLowerCase()];
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}
const num = (s) => {
  const t = text(s).replace(/[,\[\]\s]/g, '');
  if (/만$/.test(t)) return Math.round(parseFloat(t) * 10000);
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : 0;
};
const cell = (row, cls) => {
  const m = row.match(new RegExp(`<td[^>]*class=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>([\\s\\S]*?)</td>`));
  return m ? m[1] : '';
};

// Korean time: "YYYY-MM-DD HH:MM:SS", "HH:MM", "HH:MM:SS", "MM.DD", "MM-DD", "YY.MM.DD", "YYYY-MM-DD"
function toTs(s, nowKst) {
  s = text(s);
  let m;
  const mk = (y, mo, d, h = 0, mi = 0, se = 0) => Date.UTC(y, mo - 1, d, h - 9, mi, se);
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/))) return mk(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  if ((m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/))) {
    let t = mk(nowKst.y, nowKst.m, nowKst.d, +m[1], +m[2], +(m[3] || 0));
    if (t > Date.now() + 5 * 60e3) t -= 86400e3;
    return t;
  }
  if ((m = s.match(/^(\d{2})[./](\d{2})[./](\d{2})$/))) return mk(2000 + +m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{2})[.-](\d{2})$/))) {
    let t = mk(nowKst.y, +m[1], +m[2]);
    if (t > Date.now()) t = mk(nowKst.y - 1, +m[1], +m[2]);
    return t;
  }
  return null;
}

function parseDc(html, base) {
  const out = [];
  for (const row of html.match(/<tr class="ub-content us-post[^"]*"[\s\S]*?<\/tr>/g) || []) {
    const type = (row.match(/data-type="([^"]*)"/) || [])[1] || '';
    if (/notice|survey|ad/.test(type)) continue;
    if (/gall_subject">\s*<b>/.test(row)) continue; // 공지/설문/AD rows
    const tit = cell(row, 'gall_tit');
    const a = tit.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!a || a[1].startsWith('javascript')) continue;
    const date = row.match(/class="gall_date"[^>]*title="([^"]+)"/);
    // A post found through search carries the search words in its address; drop them so the
    // same post found on the plain list is not collected twice.
    const link = new URL(a[1].replace(/&amp;/g, '&'), base);
    for (const k of ['s_type', 's_keyword', 'search_pos']) link.searchParams.delete(k);
    out.push({
      title: text(a[2]),
      url: link.href,
      comments: num((tit.match(/class="reply_num">([^<]*)</) || [])[1] || '0'),
      recommends: num(cell(row, 'gall_recommend')),
      views: num(cell(row, 'gall_count')),
      date: date ? date[1] : text(cell(row, 'gall_date')),
    });
  }
  return out;
}

function parseFm(html, base) {
  const out = [];
  const body = html.replace(/data-fm-night-swap="[^"]*"/g, '');
  const tbody = body.slice(body.indexOf('<tbody'));
  for (const row of tbody.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || []) {
    if (/<tr[^>]*class="[^"]*notice/.test(row)) continue;
    const tit = cell(row, 'title');
    const a = tit.match(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!a) continue;
    out.push({
      title: text(a[2]),
      url: new URL(a[1].replace(/&amp;/g, '&'), base).href,
      comments: num((tit.match(/class="replyNum"[^>]*>([^<]*)</) || [])[1] || '0'),
      recommends: num(cell(row, 'm_no_voted')),
      views: num((row.match(/<td class="m_no">([\s\S]*?)<\/td>/) || [])[1] || '0'),
      date: text(cell(row, 'time')),
    });
  }
  return out;
}

function parseMlb(html, base) {
  const out = [];
  const tbody = html.slice(html.indexOf('<tbody'));
  for (const row of tbody.match(/<tr>[\s\S]*?<\/tr>/g) || []) {
    const a = row.match(/<div class='tit'><a href='([^']+)'[^>]*class='txt'>([\s\S]*?)<\/a>/);
    if (!a) continue;
    out.push({
      title: text(a[2]),
      url: new URL(a[1].replace(/&amp;/g, '&'), base).href,
      comments: num((row.match(/<span class='replycnt'>([^<]*)</) || [])[1] || '0'),
      recommends: 0, // the list doesn't show likes; comments decide
      views: num((row.match(/class='viewV'>([^<]*)</) || [])[1] || '0'),
      date: text((row.match(/class='date'>([^<]*)</) || [])[1] || ''),
    });
  }
  return out;
}

function parseInven(html, base) {
  const out = [];
  const tbody = html.slice(html.indexOf('<tbody'));
  for (const row of tbody.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || []) {
    if (/<tr[^>]*class="[^"]*notice/.test(row)) continue;
    const a = row.match(/<a class="subject-link" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!a) continue;
    const link = new URL(a[1].replace(/&amp;/g, '&'), base);
    link.search = ''; // search results add the search words to the address
    out.push({
      title: text(a[2].replace(/<span class="category">[\s\S]*?<\/span>/, '')), // drop the "[일반]" label
      url: link.href,
      comments: num((row.match(/class="con-comment">([^<]*)</) || [])[1] || '0'),
      recommends: num(cell(row, 'reco')),
      views: num(cell(row, 'view')),
      date: text(cell(row, 'date')),
    });
  }
  return out;
}

const PARSERS = { dcinside: parseDc, fmkorea: parseFm, mlbpark: parseMlb, inven: parseInven };

// How each site spells "search post titles for this word" in a board address.
const SEARCH = {
  fmkorea: (u, k) => { u.searchParams.set('search_target', 'title'); u.searchParams.set('search_keyword', k); },
  dcinside: (u, k) => { u.searchParams.set('s_type', 'search_subject'); u.searchParams.set('s_keyword', k); },
  inven: (u, k) => { u.searchParams.set('name', 'subject'); u.searchParams.set('keyword', k); },
};

function pageUrl(src, page) {
  if (page === 1) return src.url;
  const u = new URL(src.url);
  if (src.site === 'mlbpark') u.searchParams.set('p', String((page - 1) * 30 + 1));
  else u.searchParams.set('page', String(page));
  return u.href;
}

async function get(url, tries = 2) {
  const r = await fetch(url, {
    headers: {
      'user-agent': UA,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'upgrade-insecure-requests': '1',
    },
    signal: AbortSignal.timeout(15000),
  });
  if ((r.status === 429 || r.status === 430) && tries > 1) {
    await sleep(45000); // the board asked us to slow down
    return get(url, tries - 1);
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

// The category's keywords, minus any this board is told to skip (skipKeywords) because a short
// word such as "혀" matches unrelated posts on a general board.
const keywordsFor = (src, cat) => cat.keywords.filter((k) => !(src.skipKeywords || []).includes(k));

// Which pages to read for one board: its first pages, plus (when `search` is on)
// the board's own title search for each keyword, so older related posts are found too.
function urlsFor(src, cat) {
  const list = [];
  if (src.search && SEARCH[src.site]) {
    // A search for "딮" already finds "딮기", so skip keywords another keyword covers.
    const words = keywordsFor(src, cat);
    const terms = words.filter((k) => !words.some((o) => o !== k && k.includes(o)));
    for (const k of terms) {
      const u = new URL(src.url);
      SEARCH[src.site](u, k);
      list.push(u.href);
    }
  }
  const n = Math.max(1, Math.min(10, src.pages || pages));
  for (let p = 1; p <= n; p++) list.push(pageUrl(src, p));
  return list;
}

/* ---------- YouTube ----------
   Uses the official YouTube Data API, which needs a key (see 외부에서_보는_방법.md).
   The key is read from the YOUTUBE_API_KEY environment variable or from the file
   ".moa-youtube-key" in the user's home folder; it is never written to this project.
   A PC without a key simply keeps the videos collected last time. Searching costs API quota
   (100 units per keyword, 10,000 free units a day), so videos are refreshed every few hours. */
function youtubeKey() {
  if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY.trim();
  const file = resolve(homedir(), '.moa-youtube-key');
  return existsSync(file) ? readFileSync(file, 'utf8').replace(/^﻿/, '').trim() : '';
}

async function ytApi(path, query, key) {
  const u = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  u.searchParams.set('key', key);
  let r;
  try { r = await fetch(u, { signal: AbortSignal.timeout(15000) }); } catch { throw new Error('유튜브 API 접속 실패'); } // never include the address: it holds the key
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`유튜브 API ${r.status} ${body?.error?.errors?.[0]?.reason || ''}`.trim());
  return body;
}

async function collectYoutube(cat, yt, key) {
  const words = cat.keywords.filter((k) => !(yt.skipKeywords || []).includes(k));
  const terms = words.filter((k) => !words.some((o) => o !== k && k.includes(o)));
  const after = new Date(Date.now() - yt.days * 86400e3).toISOString();
  const ids = new Set();
  for (const q of terms) {
    const res = await ytApi('search', { part: 'id', type: 'video', q, order: 'viewCount', maxResults: '50', publishedAfter: after, regionCode: 'KR', relevanceLanguage: 'ko' }, key);
    for (const it of res.items || []) if (it.id?.videoId) ids.add(it.id.videoId);
  }
  const list = [...ids];
  const found = [];
  for (let i = 0; i < list.length; i += 50) {
    const res = await ytApi('videos', { part: 'snippet,statistics', id: list.slice(i, i + 50).join(',') }, key);
    for (const v of res.items || []) {
      const title = v.snippet?.title || '';
      const channel = v.snippet?.channelTitle || '';
      // YouTube search also matches descriptions and tags; keep a video only when a keyword is in its title or channel name.
      const hay = `${title} ${channel}`.toLowerCase();
      const kw = words.find((k) => hay.includes(k.toLowerCase())) || null;
      const views = Number(v.statistics?.viewCount || 0);
      if (!kw || views < yt.minViews) continue;
      found.push({
        title, url: `https://www.youtube.com/watch?v=${v.id}`,
        comments: Number(v.statistics?.commentCount || 0), recommends: 0, views, // likes are not used, so videos don't crowd the 추천 ranking
        date: v.snippet.publishedAt, ts: Date.parse(v.snippet.publishedAt),
        site: 'youtube', source: yt.name, keyword: kw, author: channel,
      });
    }
  }
  return { seen: list.length, posts: found };
}

const ytKey = config.youtube ? youtubeKey() : '';

const now = new Date(Date.now() + 9 * 3600e3);
const nowKst = { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1, d: now.getUTCDate() };
const pages = Math.max(1, Math.min(10, config.pages || 3));

const result = { updated: new Date().toISOString(), categories: [] };
for (const cat of config.categories) {
  const prevCat = previous?.categories?.find((c) => c.id === cat.id);
  const posts = new Map();
  const report = [];
  for (const src of cat.sources) {
    let seen = 0; let kept = 0; let error = null;
    const gap = src.site === 'fmkorea' ? 15000 : src.site === 'inven' ? 1200 : 600;
    let fails = 0;
    for (const url of urlsFor(src, cat)) {
      try {
        const html = await get(url);
        const rows = PARSERS[src.site](html, src.url);
        seen += rows.length;
        for (const row of rows) {
          if (!row.title) continue;
          const kw = keywordsFor(src, cat).find((k) => row.title.includes(k)) || null;
          if (src.requireKeyword && !kw) continue;
          if (row.recommends < cat.minRecommend && row.comments < cat.minComments) continue;
          if (posts.has(row.url)) continue;
          posts.set(row.url, { ...row, ts: toTs(row.date, nowKst), site: src.site, source: src.name, keyword: kw });
          kept++;
        }
      } catch (e) {
        error = e.message;
        if (++fails >= 2) break; // the board keeps refusing; try again next build
      }
      await sleep(gap);
    }
    // Keep last time's posts from a board that couldn't be read this time.
    if (error && prevCat) {
      for (const old of prevCat.posts.filter((x) => x.source === src.name)) if (!posts.has(old.url)) posts.set(old.url, old);
    }
    report.push({ source: src.name, site: src.site, url: src.url, seen, kept, error });
    console.log(`[collect] ${cat.name} / ${src.name}: ${seen}개 확인, ${kept}개 모음${error ? ` (오류: ${error})` : ''}`);
  }

  if (config.youtube) {
    const yt = { name: '유튜브', minViews: 1000, days: 14, everyHours: 3, ...config.youtube };
    const prevRep = prevCat?.sources?.find((s) => s.site === 'youtube');
    const prevPosts = (prevCat?.posts || []).filter((p) => p.site === 'youtube');
    const rule = `조회수 ${yt.minViews.toLocaleString('ko-KR')}회 이상 · 최근 ${yt.days}일`;
    const base = { source: yt.name, site: 'youtube', url: 'https://www.youtube.com/', seen: 0, kept: 0, error: null, rule };
    const keepPrev = () => { for (const p of prevPosts) if (!posts.has(p.url)) posts.set(p.url, p); };
    const fresh = prevRep?.fetched && Date.now() - Date.parse(prevRep.fetched) < yt.everyHours * 3600e3;
    let rep;
    let note;
    if (!ytKey) {
      keepPrev();
      rep = prevRep ? { ...prevRep, rule } : { ...base, skipped: true };
      note = prevRep ? `이 PC에는 API 키가 없어 지난번 ${prevPosts.length}개를 유지` : 'API 키가 없어 건너뜀';
    } else if (fresh) {
      keepPrev();
      rep = { ...prevRep, rule };
      note = `${yt.everyHours}시간이 안 지나 지난번 ${prevPosts.length}개를 유지`;
    } else {
      try {
        const got = await collectYoutube(cat, yt, ytKey);
        for (const p of got.posts) posts.set(p.url, p);
        rep = { ...base, seen: got.seen, kept: got.posts.length, fetched: new Date().toISOString() };
        note = `${got.seen}개 확인, ${got.posts.length}개 모음`;
      } catch (e) {
        keepPrev();
        rep = { ...(prevRep || base), rule, error: e.message };
        note = `오류: ${e.message}`;
      }
    }
    report.push(rep);
    console.log(`[collect] ${cat.name} / ${yt.name}: ${note}`);
  }

  result.categories.push({
    id: cat.id, name: cat.name, color: cat.color, keywords: cat.keywords,
    minRecommend: cat.minRecommend, minComments: cat.minComments,
    sources: report,
    posts: [...posts.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0)),
  });
}

writeFileSync(outFile, JSON.stringify(result, null, 1));
console.log(`[collect] saved ${result.categories.map((c) => `${c.name} ${c.posts.length}`).join(', ')}`);
