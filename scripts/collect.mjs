// Collects posts for each big category from the boards listed in collect.config.json
// and writes src/collected.json. Runs before every build. It never fails the build:
// if a board can't be read, the posts collected last time are kept.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

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

// Korean time: "YYYY-MM-DD HH:MM:SS", "HH:MM", "HH:MM:SS", "MM.DD", "YY.MM.DD", "YYYY-MM-DD"
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
  if ((m = s.match(/^(\d{2})\.(\d{2})$/))) {
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
    out.push({
      title: text(a[2]),
      url: new URL(a[1].replace(/&amp;/g, '&'), base).href,
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

const PARSERS = { dcinside: parseDc, fmkorea: parseFm, mlbpark: parseMlb };

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

// Which pages to read for one board: its first pages, plus (when `search` is on)
// the board's own title search for each keyword, so older related posts are found too.
function urlsFor(src, cat) {
  const list = [];
  if (src.search && src.site === 'fmkorea') {
    // A search for "딮" already finds "딮기", so skip keywords another keyword covers.
    const terms = cat.keywords.filter((k) => !cat.keywords.some((o) => o !== k && k.includes(o)));
    for (const k of terms) {
      const u = new URL(src.url);
      u.searchParams.set('search_target', 'title');
      u.searchParams.set('search_keyword', k);
      list.push(u.href);
    }
  }
  const n = Math.max(1, Math.min(10, src.pages || pages));
  for (let p = 1; p <= n; p++) list.push(pageUrl(src, p));
  return list;
}

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
    const gap = src.site === 'fmkorea' ? 15000 : 600;
    let fails = 0;
    for (const url of urlsFor(src, cat)) {
      try {
        const html = await get(url);
        const rows = PARSERS[src.site](html, src.url);
        seen += rows.length;
        for (const row of rows) {
          if (!row.title) continue;
          const kw = cat.keywords.find((k) => row.title.includes(k)) || null;
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
  result.categories.push({
    id: cat.id, name: cat.name, color: cat.color, keywords: cat.keywords,
    minRecommend: cat.minRecommend, minComments: cat.minComments,
    sources: report,
    posts: [...posts.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0)),
  });
}

writeFileSync(outFile, JSON.stringify(result, null, 1));
console.log(`[collect] saved ${result.categories.map((c) => `${c.name} ${c.posts.length}`).join(', ')}`);
