// Everything the person collects is kept in this browser (localStorage).
const KEY = 'moa.v1';

const DEFAULTS = {
  keywords: ['AI', '고양이', '여행'],
  scraps: [], // post ids
  links: [], // { id, title, url, note, added }
  read: [], // post ids
  hiddenComms: [], // community ids the person doesn't want to see
  theme: 'white',
  sidebar: 'right', // left | right | off (phones)
  unreadOnly: {}, // list id -> true
};

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    return { ...structuredClone(DEFAULTS), ...(raw || {}) };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get: () => state,
  subscribe: (fn) => listeners.add(fn),
  update(fn) { fn(state); save(); },
  reset() { state = structuredClone(DEFAULTS); save(); },
  replace(data) { state = { ...structuredClone(DEFAULTS), ...data }; save(); },

  addKeyword(word) {
    const w = String(word || '').trim();
    if (!w || w.length > 20) return false;
    if (state.keywords.some((k) => k.toLowerCase() === w.toLowerCase())) return false;
    state.keywords.push(w); save(); return true;
  },
  removeKeyword(word) { state.keywords = state.keywords.filter((k) => k !== word); save(); },

  isScrap: (id) => state.scraps.includes(id),
  toggleScrap(id) {
    if (state.scraps.includes(id)) state.scraps = state.scraps.filter((x) => x !== id);
    else state.scraps.unshift(id);
    save();
    return state.scraps.includes(id);
  },

  isRead: (id) => state.read.includes(id),
  markRead(id) {
    if (state.read.includes(id)) return;
    state.read.unshift(id);
    state.read = state.read.slice(0, 500);
    save();
  },

  addLink(title, url, note = '') {
    state.links.unshift({ id: `l${Date.now()}`, title, url, note, added: Date.now() });
    save();
  },
  removeLink(id) { state.links = state.links.filter((l) => l.id !== id); save(); },

  toggleComm(id) {
    if (state.hiddenComms.includes(id)) state.hiddenComms = state.hiddenComms.filter((x) => x !== id);
    else state.hiddenComms.push(id);
    save();
  },
};

// Does a title contain one of the interest keywords?
export function matchKeyword(title) {
  const t = title.toLowerCase();
  return state.keywords.find((k) => t.includes(k.toLowerCase())) || null;
}
