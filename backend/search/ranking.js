'use strict';

const DOMAIN_RANKS = {
  'ifixit.com': 100, 'support.microsoft.com': 100, 'support.apple.com': 100,
  'support.dell.com': 95, 'support.hp.com': 95, 'support.lenovo.com': 95,
  'support.asus.com': 95, 'support.samsung.com': 95,
  'superuser.com': 95, 'answers.microsoft.com': 95,
  'dell.com': 90, 'hp.com': 90, 'lenovo.com': 90, 'acer.com': 90, 'asus.com': 90,
  'samsung.com': 90, 'msi.com': 85, 'brother.com': 85, 'canon.com': 85, 'epson.com': 85,
  'stackexchange.com': 85, 'reddit.com': 80, 'github.com': 80,
  'tomshardware.com': 80, 'wikihow.com': 80, 'instructables.com': 80,
  'youtube.com': 75, 'pcmag.com': 75, 'notebookcheck.net': 75,
  'flipkart.com': -50, 'amazon.in': -50, 'amazon.com': -40, 'ebay.com': -40,
  'croma.com': -50, 'mdcomputers.in': -50,
};

const RESULT_THEME = {
  video: { bg: '#d13b2f', accent: '#ffffff', icon: '▶' },
  guide: { bg: '#1d6e4e', accent: '#ffffff', icon: '✓' },
  download: { bg: '#2d6bb4', accent: '#ffffff', icon: '↓' },
  affiliate: { bg: '#c86a2c', accent: '#ffffff', icon: '$' },
  link: { bg: '#415763', accent: '#ffffff', icon: '↗' },
};

function escapeSvgText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildInlineThumbnail(result) {
  const theme = RESULT_THEME[result.type] || RESULT_THEME.link;
  const source = (result.source || 'web').replace(/^www\./i, '');
  const title = (result.title || source).trim();
  const sourceLabel = source.toUpperCase().slice(0, 20);
  const titleWords = title.split(/\s+/).filter(Boolean);
  const lineOne = titleWords.slice(0, 4).join(' ').slice(0, 28) || title.slice(0, 28);
  const lineTwo = titleWords.slice(4, 8).join(' ').slice(0, 28);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${theme.bg}" />
          <stop offset="100%" stop-color="#15232a" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" rx="28" fill="url(#bg)" />
      <circle cx="560" cy="80" r="88" fill="rgba(255,255,255,0.08)" />
      <circle cx="94" cy="286" r="110" fill="rgba(255,255,255,0.07)" />
      <rect x="32" y="30" width="134" height="38" rx="19" fill="rgba(255,255,255,0.14)" />
      <text x="99" y="55" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="700" fill="${theme.accent}">${escapeSvgText(sourceLabel)}</text>
      <rect x="32" y="98" width="92" height="92" rx="20" fill="rgba(255,255,255,0.14)" />
      <text x="78" y="155" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="700" fill="${theme.accent}">${escapeSvgText(theme.icon)}</text>
      <text x="32" y="244" font-family="Segoe UI, Arial, sans-serif" font-size="32" font-weight="700" fill="#ffffff">${escapeSvgText(lineOne)}</text>
      ${lineTwo ? `<text x="32" y="286" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="600" fill="rgba(255,255,255,0.92)">${escapeSvgText(lineTwo)}</text>` : ''}
      <text x="32" y="328" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="500" fill="rgba(255,255,255,0.72)">${escapeSvgText((result.type || 'link').toUpperCase())} RESULT</text>
    </svg>
  `.trim();

  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function ensureResultThumbnail(result) {
  if (result.thumbnail) return result;

  let thumbnail = '';
  if (result.type === 'video') {
    const match = String(result.link || '').match(/[?&]v=([^&]+)/i) || String(result.link || '').match(/youtu\.be\/([^?&]+)/i);
    if (match && match[1]) {
      thumbnail = `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
  }

  return { ...result, thumbnail: thumbnail || buildInlineThumbnail(result) };
}

function ensureResultThumbnails(results) {
  return (results || []).map(ensureResultThumbnail);
}

function normalizeLink(link) {
  if (!link) return '';
  try { const u = new URL(link); u.hash = ''; return (u.hostname.replace('www.', '') + u.pathname.replace(/\/$/, '')).toLowerCase(); }
  catch { return link.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\//, '').replace(/^www\./, ''); }
}

function deduplicate(results) {
  const seen = new Set(), out = [];
  for (const r of results) { const key = normalizeLink(r.link); if (key && seen.has(key)) continue; if (key) seen.add(key); out.push(r); }
  return out;
}

function scoreResult(result, upvotes) {
  let score = 50;
  const domain = (result.source || '').toLowerCase().replace('www.', '');
  for (const [pattern, rank] of Object.entries(DOMAIN_RANKS)) {
    if (domain === pattern || domain.endsWith('.' + pattern)) { score += rank * 0.4; break; }
  }
  const votes = (upvotes && upvotes[result.link]) || 0;
  score += Math.min(votes * 5, 20);
  if ((result.title || '').length < 15) score -= 10;
  const slen = (result.snippet || '').length;
  if (slen < 10) score -= 5; else if (slen > 20) score += 5;
  if (result.type === 'guide') score += 10;
  if (result.type === 'video') score += 5;
  const text = ((result.title || '') + ' ' + (result.snippet || '')).toLowerCase();
  for (const s of ['fix', 'repair', 'guide', 'how to', 'tutorial', 'replacement', 'troubleshoot', 'diagnostic']) { if (text.includes(s)) score += 3; }
  for (const s of ['sponsored', 'ad', 'coupon', 'discount', 'price', 'shop', 'buy', 'deals']) { if (text.includes(s)) score -= 15; }
  return Math.round(Math.max(0, Math.min(100, score)));
}

function rankResults(results, upvotes, topK) {
  const scored = results.map(r => ({ ...r, score: scoreResult(r, upvotes || {}) }));
  scored.sort((a, b) => (b.score || 0) - (a.score || 0));
  return ensureResultThumbnails(scored.slice(0, topK).map(({ score, views, ...r }) => r));
}

function inferType(link, title, snippet) {
  const t = (title + ' ' + snippet).toLowerCase();
  const u = link.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'video';
  if (u.includes('.exe') || u.includes('.dmg') || t.includes('driver') || t.includes('download')) return 'download';
  if (u.includes('reddit.com') || u.includes('forum') || u.includes('ifixit') || u.includes('guide') || t.includes('how to')) return 'guide';
  if (t.includes('amazon') || t.includes('affiliate')) return 'affiliate';
  return 'link';
}

module.exports = {
  DOMAIN_RANKS, RESULT_THEME,
  scoreResult, rankResults, deduplicate, normalizeLink,
  ensureResultThumbnail, ensureResultThumbnails,
  buildInlineThumbnail, escapeSvgText,
  inferType,
};
