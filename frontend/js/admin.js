(function () {
  var API_BASE = window.location.origin;
  var adminKey = localStorage.getItem('adminKey') || '';
  var _health = null;

  function authHeaders() {
    return adminKey ? { 'Authorization': 'Bearer ' + adminKey } : {};
  }

  function getContent() {
    return document.getElementById('dashboardContent');
  }

  function esc(v) {
    var d = document.createElement('div');
    d.textContent = String(v || '');
    return d.innerHTML;
  }

  function pct(a, b) {
    return b > 0 ? Math.round((a / b) * 100) : 0;
  }

  window.setAdminKey = function () {
    var key = prompt('Enter admin key:');
    if (key) { adminKey = key; localStorage.setItem('adminKey', key); loadTabContent(currentTab); }
  };

  window.clearAdminKey = function () {
    adminKey = ''; localStorage.removeItem('adminKey');
    loadTabContent(currentTab);
  };

  window.refreshAll = function () {
    loadTabContent(currentTab);
  };

  function statusBadge(s) {
    var map = { ok: 'badge-green', error: 'badge-red', untested: 'badge-blue' };
    var cls = map[s] || 'badge-blue';
    return '<span class="badge ' + cls + '">' + esc(s) + '</span>';
  }

  function trustBar(pct) {
    var cls = pct >= 60 ? 'high' : pct >= 30 ? 'medium' : 'low';
    return '<div class="trust-meter"><div class="trust-bar"><div class="trust-bar-fill ' + cls + '" style="width:' + pct + '%"></div></div><span class="font-mono-label text-xs font-semibold text-ink-gray">' + pct + '%</span></div>';
  }

  function statCard(icon, value, label, color) {
    var valClass = color ? 'text-' + color : 'text-forest-deep';
    return '<div class="stat-card"><div class="flex items-center gap-3"><span class="material-symbols-outlined text-2xl ' + valClass + '">' + esc(icon) + '</span><div><div class="stat-value ' + valClass + '">' + esc(value) + '</div><div class="stat-label">' + esc(label) + '</div></div></div></div>';
  }

  // ---- fetch helpers ----
  async function fetchJSON(url) {
    var r = await fetch(API_BASE + url, { headers: authHeaders() });
    if (r.status === 401) throw new Error('AUTH_NEEDED');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  window.loadTabContent = async function (tab) {
    var fn = {
      overview: loadOverview,
      engines: loadEngines,
      feedback: loadFeedback,
      popular: loadPopular,
      upvotes: loadUpvotes,
      recent: loadRecent,
      cache: loadCache
    }[tab];
    if (fn) fn();
  };

  // ---- Overview ----
  async function loadOverview() {
    var content = getContent();
    content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray">Loading overview...</p></div>';
    try {
      var s = await fetchJSON('/api/stats');
      var h = await fetchJSON('/api/health');
      var c = await fetchJSON('/api/cache-stats');
      _health = h;

      var uptimeStr = '';
      if (h.uptime) {
        var sec = Math.floor(h.uptime);
        var d = Math.floor(sec / 86400);
        var hr = Math.floor((sec % 86400) / 3600);
        var mi = Math.floor((sec % 3600) / 60);
        uptimeStr = (d ? d + 'd ' : '') + (hr ? hr + 'h ' : '') + mi + 'm';
        document.getElementById('uptimeDisplay').textContent = 'Uptime ' + uptimeStr;
      }

      var html = '';
      html += '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">';
      html += statCard('feedback', s.totalFeedback || 0, 'Feedback Entries');
      html += statCard('trending_up', (s.helpfulPercentage || 0) + '%', 'Helpful Rate', !s.helpfulPercentage || s.helpfulPercentage < 40 ? 'accent-orange' : 'forest-deep');
      html += statCard('search_insights', s.searchVolume || 0, 'Searches Today');
      html += statCard('error', s.searchErrors || 0, 'Search Errors', s.searchErrors > 0 ? 'accent-orange' : 'forest-deep');
      html += statCard('storage', (c.total || 0) + '/' + c.max, 'Cache Entries');
      html += statCard('devices', h.devices || 0, 'Device Types');
      html += '</div>';

      html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">';

      html += '<div class="glass-surface rounded-xl p-5"><h3 class="font-headline text-base font-bold text-forest-deep mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-lg">travel_explore</span> Search Engine Health</h3>';
      if (h.engines) {
        html += '<div class="space-y-3">';
        for (var name in h.engines) {
          var e = h.engines[name];
          var sClass = e.status === 'ok' ? 'text-green-600' : e.status === 'error' ? 'text-red-500' : 'text-ink-gray';
          var dotClass = e.status === 'ok' ? 'bg-green-500' : e.status === 'error' ? 'bg-red-500' : 'bg-ink-gray';
          html += '<div class="flex items-center justify-between py-2 border-b border-outline-variant/10 last:border-0"><div class="flex items-center gap-3"><span class="w-2.5 h-2.5 rounded-full ' + dotClass + '"></span><span class="font-semibold text-sm text-primary">' + esc(name) + '</span></div><div class="flex items-center gap-4 text-xs text-ink-gray"><span>Req: ' + (e.totalRequests || 0) + '</span><span>Avg: ' + (e.avgResponseMs || '-') + 'ms</span><span>Errors: ' + (e.errorCount || 0) + '</span>' + statusBadge(e.status) + '</div></div>';
        }
        html += '</div>';
      } else {
        html += '<p class="text-sm text-ink-gray">No engine data yet.</p>';
      }
      html += '</div>';

      html += '<div class="glass-surface rounded-xl p-5"><h3 class="font-headline text-base font-bold text-forest-deep mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-lg">devices</span> Feedback by Device</h3>';
      if (s.byDevice && Object.keys(s.byDevice).length > 0) {
        var sorted = Object.entries(s.byDevice).sort(function (a, b) { return b[1].total - a[1].total; });
        html += '<div class="space-y-2">';
        for (var i = 0; i < sorted.length; i++) {
          var d = sorted[i];
          var rate = pct(d[1].helpful, d[1].total);
          html += '<div class="flex items-center justify-between py-1.5 border-b border-outline-variant/5 last:border-0"><div class="flex items-center gap-2"><span class="text-xs font-mono-label text-ink-gray w-5">' + (i + 1) + '.</span><span class="text-sm font-semibold text-primary">' + esc(d[0]).toUpperCase() + '</span></div><div class="flex items-center gap-3 text-xs"><span class="text-ink-gray">' + d[1].total + ' entries</span><span class="text-ink-gray">' + d[1].helpful + ' helpful</span>' + trustBar(rate) + '</div></div>';
        }
        html += '</div>';
      } else {
        html += '<p class="text-sm text-ink-gray">No feedback data yet.</p>';
      }
      html += '</div>';

      html += '</div>';

      html += '<div class="glass-surface rounded-xl p-5"><h3 class="font-headline text-base font-bold text-forest-deep mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-lg">history</span> Recent Searches</h3>';
      if (s.recentSearches && s.recentSearches.length > 0) {
        html += '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-forest-deep/5"><th class="text-left p-2 font-semibold text-ink-gray uppercase tracking-wider text-xs">Query</th><th class="text-left p-2 font-semibold text-ink-gray uppercase tracking-wider text-xs">Device</th><th class="text-left p-2 font-semibold text-ink-gray uppercase tracking-wider text-xs">Category</th><th class="text-right p-2 font-semibold text-ink-gray uppercase tracking-wider text-xs">Results</th><th class="text-right p-2 font-semibold text-ink-gray uppercase tracking-wider text-xs">Time</th></tr></thead><tbody>';
        var searches = s.recentSearches.slice(-10);
        for (var i = 0; i < searches.length; i++) {
          var r = searches[i];
          html += '<tr class="border-t border-outline-variant/10"><td class="p-2 text-primary font-medium truncate max-w-[200px]">' + esc(r.query || '-') + '</td><td class="p-2 text-ink-gray">' + esc(r.device || '-') + '</td><td class="p-2 text-ink-gray">' + esc(r.category || '-') + '</td><td class="p-2 text-right text-ink-gray">' + (r.results || '-') + '</td><td class="p-2 text-right text-ink-gray font-mono-label text-xs">' + (r.ms || '-') + 'ms</td></tr>';
        }
        html += '</tbody></table></div>';
      } else {
        html += '<p class="text-sm text-ink-gray">No searches yet.</p>';
      }
      html += '</div>';

      content.innerHTML = html;
    } catch (e) {
      if (e.message === 'AUTH_NEEDED') {
        content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray"><strong>Authentication required.</strong> Use <strong>Set Key</strong> above to enter the admin key.</p></div>';
        return;
      }
      content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray"><strong>Failed to load overview.</strong> Make sure the backend server is running.</p><p class="text-xs text-ink-gray mt-2">' + esc(e.message) + '</p></div>';
    }
  }

  // ---- Engines ----
  async function loadEngines() {
    var content = getContent();
    content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray">Loading engine health...</p></div>';
    try {
      var h = await fetchJSON('/api/health');
      _health = h;
      var html = '<div class="glass-surface rounded-xl p-5"><h3 class="font-headline text-base font-bold text-forest-deep mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-lg">travel_explore</span> Engine Status</h3>';
      html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
      for (var name in h.engines) {
        var e = h.engines[name];
        var dotColor = e.status === 'ok' ? 'bg-green-500' : e.status === 'error' ? 'bg-red-500' : 'bg-ink-gray';
        html += '<div class="border border-outline-variant/20 rounded-xl p-4 bg-white/40"><div class="flex items-center justify-between mb-3"><div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full ' + dotColor + '"></span><span class="font-bold text-primary text-base">' + esc(name) + '</span></div>' + statusBadge(e.status) + '</div>';
        html += '<div class="grid grid-cols-2 gap-3 text-sm"><div><span class="text-xs text-ink-gray block">Total Requests</span><span class="font-semibold text-primary">' + (e.totalRequests || 0) + '</span></div>';
        html += '<div><span class="text-xs text-ink-gray block">Avg Response</span><span class="font-semibold text-primary">' + (e.avgResponseMs || '-') + 'ms</span></div>';
        html += '<div><span class="text-xs text-ink-gray block">Error Count</span><span class="font-semibold ' + (e.errorCount > 0 ? 'text-red-600' : 'text-primary') + '">' + (e.errorCount || 0) + '</span></div>';
        html += '<div><span class="text-xs text-ink-gray block">Consecutive Fails</span><span class="font-semibold ' + (e.consecutiveFails > 0 ? 'text-red-600' : 'text-primary') + '">' + (e.consecutiveFails || 0) + '</span></div></div>';
        if (e.lastError) html += '<p class="text-xs text-red-500 mt-2 truncate">Last error: ' + esc(e.lastError) + '</p>';
        html += '</div>';
      }
      html += '</div></div>';
      html += '<div class="glass-surface rounded-xl p-5 mt-4"><h3 class="font-headline text-base font-bold text-forest-deep mb-2">Summary</h3><div class="flex flex-wrap gap-4 text-sm"><span class="text-ink-gray">Total searches: <strong class="text-primary">' + (h.totalSearches || 0) + '</strong></span></div></div>';
      content.innerHTML = html;
    } catch (e) {
      if (e.message === 'AUTH_NEEDED') {
        content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray"><strong>Authentication required.</strong></p></div>';
        return;
      }
      content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray">Failed to load engine data.</p><p class="text-xs text-ink-gray mt-2">' + esc(e.message) + '</p></div>';
    }
  }

  // ---- Feedback ----
  async function loadFeedback() {
    var content = getContent();
    content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray">Loading feedback...</p></div>';
    try {
      var s = await fetchJSON('/api/stats');
      var html = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">';
      html += statCard('feedback', s.totalFeedback || 0, 'Total Feedback Entries');
      html += statCard('trending_up', (s.helpfulPercentage || 0) + '%', 'Helpful Rate', !s.helpfulPercentage || s.helpfulPercentage < 40 ? 'accent-orange' : 'forest-deep');
      html += '</div>';

      if (s.byDevice && Object.keys(s.byDevice).length > 0) {
        html += '<div class="glass-surface rounded-xl overflow-hidden"><table class="w-full text-sm"><thead><tr class="bg-forest-deep/5"><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Device</th><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Total</th><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Helpful</th><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Rate</th><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Trend</th></tr></thead><tbody>';
        var sorted = Object.entries(s.byDevice).sort(function (a, b) { return b[1].total - a[1].total; });
        for (var i = 0; i < sorted.length; i++) {
          var d = sorted[i];
          var rate = pct(d[1].helpful, d[1].total);
          var rClass = rate >= 50 ? 'badge-green' : 'badge-orange';
          html += '<tr class="border-t border-outline-variant/10"><td class="p-3 font-semibold text-forest-deep">' + esc(d[0] || 'unknown').toUpperCase() + '</td><td class="p-3 text-ink-gray">' + d[1].total + '</td><td class="p-3 text-ink-gray">' + d[1].helpful + '</td><td class="p-3"><span class="badge ' + rClass + '">' + rate + '%</span></td><td class="p-3">' + trustBar(rate) + '</td></tr>';
        }
        html += '</tbody></table></div>';
      } else {
        html += '<div class="glass-surface rounded-xl p-6 text-center"><p class="text-ink-gray">No feedback data yet. Feedback is collected when users rate search results as helpful or not.</p></div>';
      }

      content.innerHTML = html;
    } catch (e) {
      if (e.message === 'AUTH_NEEDED') {
        content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray"><strong>Authentication required.</strong></p></div>';
        return;
      }
      content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray">Failed to load feedback data.</p><p class="text-xs text-ink-gray mt-2">' + esc(e.message) + '</p></div>';
    }
  }

  // ---- Popular ----
  async function loadPopular() {
    var content = getContent();
    content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray">Loading popular searches...</p></div>';
    try {
      var p = await fetchJSON('/api/popular');
      var html = '<div class="glass-surface rounded-xl overflow-hidden"><div class="p-4 border-b border-outline-variant/10"><h3 class="font-headline text-base font-bold text-forest-deep flex items-center gap-2"><span class="material-symbols-outlined text-lg">trending_up</span> Popular Searches</h3></div>';
      if (p.searches && p.searches.length > 0) {
        html += '<table class="w-full text-sm"><thead><tr class="bg-forest-deep/5"><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">#</th><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Query</th><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Device</th><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Category</th><th class="text-right p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Searches</th></tr></thead><tbody>';
        for (var i = 0; i < Math.min(p.searches.length, 30); i++) {
          var s = p.searches[i];
          html += '<tr class="border-t border-outline-variant/10"><td class="p-3 text-ink-gray text-xs font-mono-label">' + (i + 1) + '</td><td class="p-3 text-primary font-medium">' + esc(s.key || '-') + '</td><td class="p-3 text-ink-gray">' + esc(s.device || '-') + '</td><td class="p-3 text-ink-gray">' + esc(s.category || '-') + '</td><td class="p-3 text-right"><span class="badge badge-green">' + (s.count || 0) + '</span></td></tr>';
        }
        html += '</tbody></table>';
      } else {
        html += '<div class="p-6 text-center"><p class="text-ink-gray">No popular searches yet.</p></div>';
      }
      html += '</div>';

      content.innerHTML = html;
    } catch (e) {
      if (e.message === 'AUTH_NEEDED') {
        content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray"><strong>Authentication required.</strong></p></div>';
        return;
      }
      content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray">Failed to load popular searches.</p><p class="text-xs text-ink-gray mt-2">' + esc(e.message) + '</p></div>';
    }
  }

  // ---- Upvotes ----
  async function loadUpvotes() {
    var content = getContent();
    content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray">Loading upvotes...</p></div>';
    try {
      var p = await fetchJSON('/api/popular');
      var html = '<div class="glass-surface rounded-xl overflow-hidden"><div class="p-4 border-b border-outline-variant/10"><h3 class="font-headline text-base font-bold text-forest-deep flex items-center gap-2"><span class="material-symbols-outlined text-lg">thumb_up</span> Top Upvoted Results</h3></div>';
      var upvotes = p.upvotes || {};
      var entries = Object.entries(upvotes);
      if (entries.length > 0) {
        entries.sort(function (a, b) { return b[1] - a[1]; });
        html += '<table class="w-full text-sm"><thead><tr class="bg-forest-deep/5"><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">#</th><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Link</th><th class="text-right p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Upvotes</th></tr></thead><tbody>';
        for (var i = 0; i < Math.min(entries.length, 30); i++) {
          var e = entries[i];
          html += '<tr class="border-t border-outline-variant/10"><td class="p-3 text-ink-gray text-xs font-mono-label">' + (i + 1) + '</td><td class="p-3"><a class="text-primary hover:text-accent-orange truncate block max-w-[400px] font-medium text-xs" href="' + esc(e[0]) + '" target="_blank" rel="noopener">' + esc(e[0]) + '</a></td><td class="p-3 text-right"><span class="badge badge-green">' + (e[1] || 0) + '</span></td></tr>';
        }
        html += '</tbody></table>';
      } else {
        html += '<div class="p-6 text-center"><p class="text-ink-gray">No upvotes yet. Users can upvote helpful results from the search page.</p></div>';
      }
      html += '</div>';

      content.innerHTML = html;
    } catch (e) {
      if (e.message === 'AUTH_NEEDED') {
        content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray"><strong>Authentication required.</strong></p></div>';
        return;
      }
      content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray">Failed to load upvotes.</p><p class="text-xs text-ink-gray mt-2">' + esc(e.message) + '</p></div>';
    }
  }

  // ---- Recent ----
  async function loadRecent() {
    var content = getContent();
    content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray">Loading recent searches...</p></div>';
    try {
      var s = await fetchJSON('/api/stats');
      var html = '<div class="glass-surface rounded-xl overflow-hidden"><div class="p-4 border-b border-outline-variant/10"><h3 class="font-headline text-base font-bold text-forest-deep flex items-center gap-2"><span class="material-symbols-outlined text-lg">history</span> Search Activity Log</h3></div>';
      if (s.recentSearches && s.recentSearches.length > 0) {
        html += '<table class="w-full text-sm"><thead><tr class="bg-forest-deep/5"><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Timestamp</th><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Type</th><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Query</th><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Device</th><th class="text-right p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Results</th><th class="text-right p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Duration</th></tr></thead><tbody>';
        var searches = s.recentSearches.slice(-30).reverse();
        for (var i = 0; i < searches.length; i++) {
          var r = searches[i];
          var ts = r.timestamp ? new Date(r.timestamp).toLocaleString() : '-';
          var typeClass = r.type === 'search_error' ? 'badge-red' : 'badge-green';
          html += '<tr class="border-t border-outline-variant/10"><td class="p-3 text-ink-gray text-xs font-mono-label whitespace-nowrap">' + esc(ts) + '</td><td class="p-3"><span class="badge ' + typeClass + '">' + esc(r.type || '-') + '</span></td><td class="p-3 text-primary font-medium truncate max-w-[200px]">' + esc(r.query || '-') + '</td><td class="p-3 text-ink-gray">' + esc(r.device || '-') + '</td><td class="p-3 text-right text-ink-gray">' + (r.results != null ? r.results : '-') + '</td><td class="p-3 text-right text-ink-gray font-mono-label text-xs">' + (r.ms ? r.ms + 'ms' : '-') + '</td></tr>';
        }
        html += '</tbody></table>';
      } else {
        html += '<div class="p-6 text-center"><p class="text-ink-gray">No search activity yet.</p></div>';
      }
      html += '</div>';

      content.innerHTML = html;
    } catch (e) {
      if (e.message === 'AUTH_NEEDED') {
        content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray"><strong>Authentication required.</strong></p></div>';
        return;
      }
      content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray">Failed to load activity log.</p><p class="text-xs text-ink-gray mt-2">' + esc(e.message) + '</p></div>';
    }
  }

  // ---- Cache ----
  async function loadCache() {
    var content = getContent();
    content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray">Loading cache stats...</p></div>';
    try {
      var c = await fetchJSON('/api/cache-stats');
      var h = await fetchJSON('/api/health');

      var usagePct = c.max > 0 ? Math.round((c.total / c.max) * 100) : 0;
      var fillClass = usagePct >= 80 ? 'bg-red-500' : usagePct >= 50 ? 'bg-accent-orange' : 'bg-forest-deep';

      var html = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">';
      html += statCard('storage', c.total + ' / ' + c.max, 'Cache Entries');
      html += statCard('schedule', c.ttlHours + 'h', 'TTL (Time-to-Live)');
      html += '</div>';

      html += '<div class="glass-surface rounded-xl p-5"><h3 class="font-headline text-base font-bold text-forest-deep mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-lg">storage</span> Storage Utilization</h3>';
      html += '<div class="mb-2 flex justify-between text-sm"><span class="text-ink-gray">Usage</span><span class="font-semibold text-primary">' + usagePct + '%</span></div>';
      html += '<div class="h-4 w-full bg-outline-variant/20 rounded-full overflow-hidden"><div class="h-full rounded-full transition-all duration-500 ' + fillClass + '" style="width:' + usagePct + '%"></div></div>';
      html += '<div class="flex justify-between text-xs text-ink-gray mt-1"><span>0</span><span>' + c.max + '</span></div>';
      html += '<div class="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-outline-variant/10">';
      html += '<div><span class="text-xs text-ink-gray block">Valid entries</span><span class="text-lg font-bold text-forest-deep">' + (c.valid || 0) + '</span></div>';
      html += '<div><span class="text-xs text-ink-gray block">Storage type</span><span class="text-lg font-bold text-forest-deep">SQLite (WAL)</span></div>';
      html += '</div></div>';

      html += '<div class="glass-surface rounded-xl p-5 mt-4"><h3 class="font-headline text-base font-bold text-forest-deep mb-2">System Info</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"><span class="text-ink-gray">Version: <strong class="text-primary">' + esc(h.version || '-') + '</strong></span><span class="text-ink-gray">Environment: <strong class="text-primary">' + esc(h.environment || '-') + '</strong></span><span class="text-ink-gray">Devices: <strong class="text-primary">' + (h.devices || 0) + '</strong></span><span class="text-ink-gray">Uptime: <strong class="text-primary">' + (h.uptime ? Math.floor(h.uptime) + 's' : '-') + '</strong></span></div></div>';

      content.innerHTML = html;
    } catch (e) {
      if (e.message === 'AUTH_NEEDED') {
        content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray"><strong>Authentication required.</strong></p></div>';
        return;
      }
      content.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray">Failed to load cache stats.</p><p class="text-xs text-ink-gray mt-2">' + esc(e.message) + '</p></div>';
    }
  }
})();
