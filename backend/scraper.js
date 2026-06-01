'use strict';
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const devices = require('./devices');
const ranking = require('./search/ranking');
const curated = require('./search/curated');

const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600000', 10);
const MAX_CACHE_ENTRIES = parseInt(process.env.MAX_CACHE_ENTRIES || '2000', 10);
const TOP_K = parseInt(process.env.TOP_K || '12', 10);
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '2', 10);
const PROXY_URL = process.env.PROXY_URL || '';
const PROXY_ENABLED = !!PROXY_URL;
const FETCH_TIMEOUT = parseInt(process.env.FETCH_TIMEOUT || '15000', 10);
const BLOCK_PRIVATE_IPS = process.env.BLOCK_PRIVATE_IPS !== 'false';
const AFFILIATE_TAG = process.env.AMAZON_AFFILIATE_TAG || 'shootyourself-20';

// Proxy-aware fetch (uses undici's built-in ProxyAgent when PROXY_URL is set)
let fetchImpl = globalThis.fetch;
if (PROXY_ENABLED) {
  try {
    const { ProxyAgent } = require('undici');
    const proxyAgent = new ProxyAgent(PROXY_URL);
    const orig = globalThis.fetch;
    fetchImpl = (url, opts = {}) => orig(url, { ...opts, dispatcher: proxyAgent });
    console.log('  Proxy:    ' + PROXY_URL.replace(/\/\/.*@/, '//***@'));
  } catch (e) {
    console.warn('  Proxy:    PROXY_URL set but undici unavailable — falling back to direct fetch');
  }
}

// ---- Shared database connection ----
const db = require('./db');
const { escapeSvgText, buildInlineThumbnail, ensureResultThumbnail, ensureResultThumbnails, normalizeLink, deduplicate, scoreResult, rankResults, inferType } = ranking;
const { getCuratedLinks } = curated;

function cached(key, fn) {
  const row = db.stmts.getCache.get(key);
  if (row && (Date.now() - row.ts) < CACHE_TTL) {
    return Promise.resolve(JSON.parse(row.data));
  }
  return fn().then(data => {
    db.stmts.setCache.run(key, JSON.stringify(data), Date.now());
    db.pruneCache(CACHE_TTL, MAX_CACHE_ENTRIES);
    return data;
  }).catch(err => {
    if (row) return JSON.parse(row.data);
    throw err;
  });
}

// ---- Rotating user-agent pool ----
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];
let uaIndex = 0;
function nextUA() {
  uaIndex = (uaIndex + 1) % USER_AGENTS.length;
  return USER_AGENTS[uaIndex];
}

const ACCEPTS = [
  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
];

// ---- SSRF protection ----
const PRIVATE_PATTERNS = [
  /^https?:\/\/127\./,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/0\./,
  /^https?:\/\/169\.254\./,
  /^https?:\/\/\[::1\]/,
  /^https?:\/\/localhost/i,
  /^https?:\/\/.*\.local$/i,
  /^https?:\/\/.*\.internal$/i,
];
function validateUrl(urlStr) {
  if (!BLOCK_PRIVATE_IPS) return true;
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    for (const pattern of PRIVATE_PATTERNS) {
      if (pattern.test(urlStr)) return false;
    }
    return true;
  } catch { return false; }
}

// ---- Exponential backoff ----
async function fetchWithRetry(url, options, attempt = 0) {
  if (!validateUrl(url)) throw new Error('Blocked request to private/internal network');
  const ac = new AbortController();
  const timeoutId = setTimeout(() => ac.abort(), FETCH_TIMEOUT);
  const mergedOptions = { ...options, signal: ac.signal };
  try {
    const resp = await fetchImpl(url, mergedOptions);
    clearTimeout(timeoutId);
    if (resp.ok || resp.status === 404) return resp;
    if (resp.status === 429 || resp.status === 503) {
      if (attempt >= MAX_RETRIES) return resp;
      const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 8000);
      await new Promise(r => setTimeout(r, delay));
      return fetchWithRetry(url, {
        ...options,
        headers: { ...options.headers, 'User-Agent': nextUA() }
      }, attempt + 1);
    }
    return resp;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') throw new Error('Fetch timeout (' + FETCH_TIMEOUT + 'ms) for ' + url);
    if (attempt >= MAX_RETRIES) throw e;
    const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 8000);
    await new Promise(r => setTimeout(r, delay));
    return fetchWithRetry(url, options, attempt + 1);
  }
}

function buildHeaders() {
  return {
    'User-Agent': nextUA(),
    'Accept': ACCEPTS[Math.floor(Math.random() * ACCEPTS.length)],
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'Referer': 'https://www.google.com/',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };
}

// ---- Domain authority, curated links, ranking ----
// domain ranks moved to search/ranking.js
// curated links moved to search/curated.js

// ---- Affiliate links ----
function getAffiliateLinks(deviceId, brand, model) {
  const query = encodeURIComponent((brand + ' ' + model + ' ' + deviceId).trim());
  return [
    { title: 'Find replacement parts on Amazon', link: 'https://www.amazon.com/s?k=' + query + '&tag=' + AFFILIATE_TAG, snippet: 'Search Amazon for compatible parts and accessories', source: 'amazon.com', type: 'affiliate' },
    { title: 'Parts and tools on iFixit', link: 'https://www.ifixit.com/Search?q=' + query, snippet: 'Official repair parts and tools from iFixit', source: 'ifixit.com', type: 'affiliate' },
  ];
}

// ---- Query variations ----
function buildContextQueryFragment(context) {
  const cleaned = String(context || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";

  const stopWords = {
    a: true, an: true, and: true, the: true, this: true, that: true, with: true, from: true,
    after: true, before: true, only: true, very: true, just: true, into: true, over: true,
    under: true, then: true, than: true, have: true, has: true, had: true, does: true, did: true,
    what: true, when: true, where: true, which: true, while: true, your: true, their: true,
    device: true, issue: true, problem: true, question: true, answer: true, started: true,
    tried: true, already: true,
  };

  const tokens = cleaned.split(" ").filter(token => token.length > 2 && !stopWords[token]);
  const unique = [];
  const seen = new Set();
  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    unique.push(token);
    if (unique.length >= 8) break;
  }
  return unique.join(" ");
}

function generateQueryVariations(device, brand, model, categoryLabel, context) {
  const base = (brand + ' ' + model).trim();
  const cat = (categoryLabel || '');
  const contextHint = buildContextQueryFragment(context);
  const variations = [
    (base + ' ' + cat + ' fix repair').trim(),
    (base + ' ' + cat + ' not working').trim(),
    ('"' + base + '" ' + cat + ' problem solution').trim(),
    (base + ' troubleshooting ' + cat).trim(),
  ];

  if (contextHint) {
    variations.push((base + ' ' + cat + ' ' + contextHint + ' repair').trim());
    variations.push(('"' + base + '" ' + contextHint + ' fix').trim());
  }

  return variations.filter(q => q.trim());
}

// Thumbnail functions moved to search/ranking.js

// ---- Engines ----
async function searchBing(query) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
  const response = await fetchWithRetry(url, { headers: buildHeaders() });
  if (!response.ok) throw new Error('Bing returned ' + response.status);
  const html = await response.text();
  const $ = cheerio.load(html);
  const results = [];
  $('#b_results > li.b_algo').each(function () {
    const linkEl = $(this).find('h2 a');
    const snippetEl = $(this).find('.b_caption p');
    const citeEl = $(this).find('cite');
    const title = linkEl.text().trim();
    if (!title) return;
    let link = '';
    const citeText = citeEl.text().trim();
    if (citeText) {
      const sep = String.fromCharCode(0x203A);
      const parts = citeText.split(' ' + sep + ' ');
      if (parts.length > 0) {
        let base = parts[0].trim();
        if (!base.startsWith('http')) base = 'https://' + base;
        const pathParts = parts.slice(1).map(p => encodeURIComponent(p.trim())).join('/');
        link = pathParts ? base + '/' + pathParts : base;
      }
    }
    if (!link && citeText.startsWith('http')) link = citeText;
    const snippet = snippetEl.text().trim();
    if (link.startsWith('http')) {
      try {
        const parsed = new URL(link);
        results.push({ title, link, snippet: snippet.slice(0, 300), source: parsed.hostname.replace('www.', ''), type: inferType(link, title, snippet) });
      } catch (e) { /* skip */ }
    }
  });
  return results;
}

async function searchGoogle(query) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
  const response = await fetchWithRetry(url, { headers: buildHeaders() });
  if (!response.ok) throw new Error('Google returned ' + response.status);
  const html = await response.text();
  if (html.includes('captcha') || html.includes('unusual traffic')) throw new Error('Google CAPTCHA');
  const $ = cheerio.load(html);
  const results = [];
  const selectors = ['#search .g', '[data-hveid] .g', '.MjjYud', '.dbsr', 'div.g'];
  const container = selectors.reduce((found, sel) => found.length ? found : $(sel), $());
  container.each(function () {
    const a = $(this).find('a[href^="http"]').first();
    const h3 = $(this).find('h3').first();
    const title = h3.text().trim() || a.attr('aria-label') || '';
    const link = a.attr('href');
    const snippet = $(this).find('.VwiC3b').first().text().trim()
      || $(this).find('[data-sncf]').first().text().trim()
      || $(this).find('.lEBKkf').first().text().trim()
      || $(this).find('.st').first().text().trim()
      || '';
    if (title && link && link.startsWith('http')) {
      try {
        const parsed = new URL(link);
        results.push({ title, link, snippet: snippet.slice(0, 300), source: parsed.hostname.replace('www.', ''), type: inferType(link, title, snippet) });
      } catch (e) { /* skip */ }
    }
  });
  if (results.length > 0) return results;
  $('h3').each(function () {
    const a = $(this).find('a[href^="http"]');
    if (a.length && !results.some(r => r.link === a.attr('href'))) {
      try {
        results.push({ title: $(this).text().trim(), link: a.attr('href'), snippet: '', source: new URL(a.attr('href')).hostname.replace('www.', ''), type: 'link' });
      } catch (e) { /* skip */ }
    }
  });
  if (results.length === 0) throw new Error('Google empty results');
  return results;
}

async function searchYouTube(query) {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetchWithRetry(url, { headers: buildHeaders() }).catch(() => null);
    if (!response || !response.ok) return [];
    const html = await response.text();
    const results = [];
    const match = html.match(/var ytInitialData = ({.*?});</);
    if (!match) return [];
    const data = JSON.parse(match[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    contents.forEach(section => {
      const items = section?.itemSectionRenderer?.contents || [];
      items.forEach(item => {
        const renderer = item?.videoRenderer;
        if (!renderer) return;
        const videoId = renderer.videoId;
        const title = renderer?.title?.runs?.[0]?.text || '';
        const snippet = renderer?.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map(r => r.text).join('') || '';
        const thumbnail = renderer?.thumbnail?.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        if (title && videoId) results.push({ title, link: 'https://www.youtube.com/watch?v=' + videoId, snippet, source: 'youtube.com', type: 'video', thumbnail });
      });
    });
    return results;
  } catch (e) { return []; }
}

async function searchDuckDuckGo(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetchWithRetry(url, { headers: { ...buildHeaders(), Referer: 'https://html.duckduckgo.com/' } });
  if (!response.ok) throw new Error('DuckDuckGo returned ' + response.status);
  const html = await response.text();
  const $ = cheerio.load(html);
  const results = [];
  $('.result').each(function () {
    const titleEl = $(this).find('.result__title a');
    const snippetEl = $(this).find('.result__snippet');
    const link = titleEl.attr('href');
    const title = titleEl.text().trim();
    if (!title || !link) return;
    let realLink = link;
    if (realLink.startsWith('//')) realLink = 'https:' + realLink;
    if (realLink.startsWith('/')) realLink = 'https://duckduckgo.com' + realLink;
    try {
      const parsed = new URL(realLink);
      if (parsed.hostname === 'duckduckgo.com' && parsed.searchParams.get('uddg')) {
        realLink = parsed.searchParams.get('uddg');
      }
      const finalParsed = new URL(realLink);
      results.push({
        title,
        link: realLink,
        snippet: (snippetEl.text().trim() || '').slice(0, 300),
        source: finalParsed.hostname.replace('www.', ''),
        type: inferType(realLink, title, snippetEl.text().trim())
      });
    } catch (e) { /* skip */ }
  });
  if (results.length === 0) throw new Error('DuckDuckGo empty results');
  return results;
}

// ---- Engine config ----
const ENGINES = [
  { name: 'Bing', fn: searchBing },
  { name: 'Google', fn: searchGoogle },
  { name: 'YouTube', fn: searchYouTube },
  { name: 'DuckDuckGo', fn: searchDuckDuckGo },
];

// ---- Source URLs ----
function getSourceUrls(device, brand, model, categoryLabel, context) {
  const contextHint = buildContextQueryFragment(context);
  const q = (device + ' ' + brand + ' ' + model + ' ' + (categoryLabel || '') + ' ' + contextHint).trim();
  return [
    { title: 'Search Google', link: 'https://www.google.com/search?q=' + encodeURIComponent(q), snippet: 'General web search', source: 'google.com', type: 'link', isSearchShortcut: true },
    { title: 'Search DuckDuckGo', link: 'https://duckduckgo.com/?q=' + encodeURIComponent(q), snippet: 'Private web search', source: 'duckduckgo.com', type: 'link', isSearchShortcut: true },
    { title: 'Search YouTube', link: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q), snippet: 'Video guides and tutorials', source: 'youtube.com', type: 'video', isSearchShortcut: true },
    { title: 'Search Reddit', link: 'https://www.reddit.com/search/?q=' + encodeURIComponent(q), snippet: 'User discussions and solutions', source: 'reddit.com', type: 'guide', isSearchShortcut: true },
    { title: 'Search iFixit', link: 'https://www.ifixit.com/Search?q=' + encodeURIComponent(brand + ' ' + model), snippet: 'Repair guides and teardowns', source: 'ifixit.com', type: 'guide', isSearchShortcut: true },
  ];
}

// Ranking, dedup, scoring, thumbnails — moved to search/ranking.js
// Curated links — moved to search/curated.js

// ---- Engine health ----
const engineHealth = {};
ENGINES.forEach(e => {
  engineHealth[e.name] = { status: 'untested', lastOk: null, lastError: null, errorCount: 0, totalRequests: 0, avgResponseMs: 0, consecutiveFails: 0 };
});
let totalSearches = 0;

function getEngineHealth() {
  return { engines: { ...engineHealth }, totalSearches, engineCount: ENGINES.length };
}

// ---- Search with parallel first variation ----
async function searchModel(deviceId, brand, model, categoryId, upvotes, context) {
  const cacheKey = (deviceId || '') + '|' + brand + '|' + model + '|' + categoryId + '|' + buildContextQueryFragment(context);
  upvotes = upvotes || {};

  return cached(cacheKey, async () => {
    const devConfig = devices.DEVICES[deviceId];
    const catConfig = devConfig?.categories[categoryId];
    const catLabel = catConfig?.label || categoryId;
    const devName = devConfig?.name || deviceId;

    const variations = generateQueryVariations(devName, brand, model, catLabel, context);
    const allResults = new Map();

    // First variation: all engines in parallel
    const firstBatch = ENGINES.map(async (engine) => {
      try {
        const t0 = Date.now();
        const results = await engine.fn(variations[0]);
        const ms = Date.now() - t0;
        engineHealth[engine.name].status = 'ok';
        engineHealth[engine.name].lastOk = Date.now();
        engineHealth[engine.name].errorCount = 0;
        engineHealth[engine.name].consecutiveFails = 0;
        engineHealth[engine.name].totalRequests = (engineHealth[engine.name].totalRequests || 0) + 1;
        engineHealth[engine.name].avgResponseMs = engineHealth[engine.name].avgResponseMs
          ? Math.round((engineHealth[engine.name].avgResponseMs + ms) / 2) : ms;
        for (const r of results) {
          const key = normalizeLink(r.link);
          if (key && !allResults.has(key)) allResults.set(key, r);
        }
      } catch (e) {
        engineHealth[engine.name].status = 'error';
        engineHealth[engine.name].lastError = e.message;
        engineHealth[engine.name].errorCount = (engineHealth[engine.name].errorCount || 0) + 1;
        engineHealth[engine.name].consecutiveFails = (engineHealth[engine.name].consecutiveFails || 0) + 1;
      }
    });
    await Promise.all(firstBatch);

    // If few results, run remaining variations on best engine
    if (allResults.size < 8) {
      const bestEngine = ENGINES.find(e => engineHealth[e.name].status === 'ok') || ENGINES[0];
      for (let vi = 1; vi < variations.length && allResults.size < 12; vi++) {
        try {
          const results = await bestEngine.fn(variations[vi]);
          for (const r of results) {
            const key = normalizeLink(r.link);
            if (key && !allResults.has(key)) allResults.set(key, r);
          }
        } catch (e) { /* skip */ }
      }
    }

    totalSearches++;
    let merged = Array.from(allResults.values());

    // Curated links
    const curated = getCuratedLinks(deviceId, categoryId);
    for (const c of curated) {
      if (!allResults.has(normalizeLink(c.link))) merged.push(c);
    }

    // Affiliate links
    const affiliates = getAffiliateLinks(deviceId, brand, model);
    for (const a of affiliates) {
      if (!allResults.has(normalizeLink(a.link))) merged.push(a);
    }

    // Source links
    const sources = getSourceUrls(devName, brand, model, catLabel, context);
    for (const s of sources) {
      if (!allResults.has(normalizeLink(s.link))) merged.push(s);
    }

    merged = deduplicate(merged);
    return rankResults(merged, upvotes, TOP_K);
  });
}

function getDeviceCategories(deviceId) {
  const dev = devices.DEVICES[deviceId];
  if (!dev) return [];
  return Object.entries(dev.categories).map(([key, val]) => ({ id: key, label: val.label, icon: val.icon }));
}

function getCacheStats() {
  return db.getCacheStats(CACHE_TTL, MAX_CACHE_ENTRIES);
}

// ---- Extract content from a solution page ----
async function extractContent(url) {
  try {
    const response = await fetchWithRetry(url, { headers: buildHeaders() });
    if (!response.ok) return { url, title: '', text: '', error: 'HTTP ' + response.status };
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .sidebar, .ad, .advertisement, .menu, .comments, .comment, .related, .recommended, noscript, iframe, svg, form, .cookie, .popup, .overlay').remove();

    // Try common content selectors
    let content = '';
    const selectors = [
      'article', '[role="main"]', 'main', '.post-content', '.entry-content',
      '.article-content', '.content-body', '.problem-content', '.solution-content',
      '.fix-content', '#content', '.content', '.step-content', '.guide-content',
      '.instructions', '.procedure', '.steps',
    ];

    for (const sel of selectors) {
      const el = $(sel).first();
      if (el.length && el.text().trim().length > 100) {
        content = el.text().trim();
        break;
      }
    }

    // Fallback: get body text
    if (!content) {
      content = $('body').text().trim();
    }

    // Clean up whitespace
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .slice(0, 5000);

    const title = $('h1').first().text().trim() || $('title').text().trim() || '';

    return { url, title, text: content, error: null };
  } catch (e) {
    return { url, title: '', text: '', error: e.message };
  }
}

module.exports = { searchModel, getDeviceCategories, getSourceUrls, getCacheStats, getEngineHealth, addFeedback: db.addFeedback, addUpvote: db.addUpvote, getUpvotes: db.getUpvotes, recordPopularSearch: db.recordPopularSearch, getPopularSearches: db.getPopularSearches, getFeedbackStats: db.getFeedbackStats, getDb: db.getDb, backupDb: db.backupDb, buildContextQueryFragment, ensureResultThumbnail, extractContent };
