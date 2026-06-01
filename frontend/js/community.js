(function () {
  const API = window.location.origin;
  const container = document.getElementById('communityContent');
  let currentTab = 'overview';

  function escapeHtml(v) { const d = document.createElement('div'); d.textContent = String(v || ''); return d.innerHTML; }

  function showError(msg) {
    container.innerHTML = '<div class="glass-surface rounded-xl p-8 text-center"><p class="text-ink-gray">' + escapeHtml(msg) + '</p></div>';
  }

  function loading() {
    container.innerHTML = '<div class="text-center py-12"><p class="text-ink-gray">Loading...</p></div>';
  }

  function setupTabs() {
    document.querySelectorAll('[data-tab]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('[data-tab]').forEach(function (t) { t.classList.remove('active'); });
        el.classList.add('active');
        currentTab = el.dataset.tab;
        loadTab(currentTab);
      });
    });
  }

  function loadTab(tab) {
    loading();
    switch (tab) {
      case 'overview': loadOverview(); break;
      case 'fixes': loadFixes(); break;
      case 'technicians': loadTechnicians(); break;
      case 'warnings': loadWarnings(); break;
      case 'heatmap': loadHeatmap(); break;
      case 'trends': loadTrends(); break;
      case 'reliability': loadReliability(); break;
      default: loadOverview();
    }
  }

  async function loadOverview() {
    try {
      const [analyticsRes, statsRes] = await Promise.all([
        fetch(API + '/api/community/analytics'),
        fetch(API + '/api/community/device-stats')
      ]);
      const analytics = analyticsRes.ok ? await analyticsRes.json() : {};
      const statsData = statsRes.ok ? await statsRes.json() : {};

      let html = '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">';
      html += '<div class="stat-card"><div class="stat-value">' + (analytics.totalOutcomes || 0) + '</div><div class="stat-label">Repair Outcomes</div></div>';
      html += '<div class="stat-card"><div class="stat-value">' + (analytics.totalFixes || 0) + '</div><div class="stat-label">Community Fixes</div></div>';
      html += '<div class="stat-card"><div class="stat-value">' + (analytics.totalTechnicians || 0) + '</div><div class="stat-label">Technicians</div></div>';
      const avgRate = analytics.totalOutcomes > 0 ? Math.round((analytics.successfulOutcomes / analytics.totalOutcomes) * 100) : 0;
      html += '<div class="stat-card"><div class="stat-value">' + avgRate + '%</div><div class="stat-label">Success Rate</div></div>';
      html += '</div>';

      if (analytics.topDevices && analytics.topDevices.length) {
        html += '<h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Top Devices</h3><div class="space-y-2 mb-6">';
        analytics.topDevices.slice(0, 10).forEach(function (d) {
          const rate = d.total > 0 ? Math.round((d.successful / d.total) * 100) : 0;
          html += '<div class="data-card flex justify-between items-center"><div><div class="data-card-title">' + escapeHtml(d.device || 'Unknown') + '</div><div class="data-card-sub">' + d.total + ' repairs</div></div><span class="badge ' + (rate >= 70 ? 'badge-green' : rate >= 40 ? 'badge-orange' : 'badge-red') + '">' + rate + '% success</span></div>';
        });
        html += '</div>';
      }

      if (analytics.topFixes && analytics.topFixes.length) {
        html += '<h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Top Fixes</h3><div class="space-y-2">';
        analytics.topFixes.slice(0, 8).forEach(function (f) {
          html += '<div class="data-card"><div class="data-card-title">' + escapeHtml(f.title || 'Untitled') + '</div><div class="data-card-sub">' + escapeHtml(f.device || '') + (f.brand ? ' - ' + escapeHtml(f.brand) : '') + (f.model ? ' - ' + escapeHtml(f.model) : '') + ' &middot; ' + (f.successCount || 0) + ' successes</div></div>';
        });
        html += '</div>';
      }

      if (!analytics.totalOutcomes && !analytics.totalFixes) {
        html += '<div class="empty-state"><span class="material-symbols-outlined">communities</span><p>No community data yet. Start by submitting fixes or repair outcomes.</p></div>';
      }

      container.innerHTML = html;
    } catch (e) {
      showError('Failed to load community overview.');
    }
  }

  async function loadFixes() {
    try {
      const res = await fetch(API + '/api/community/fixes?limit=50');
      const data = res.ok ? await res.json() : { fixes: [] };
      const fixes = data.fixes || [];

      let html = '<div class="flex gap-4 mb-4 flex-wrap">';
      html += '<input class="form-input flex-1 min-w-[200px]" id="fixSearch" placeholder="Search fixes by device, brand, model..." oninput="window.filterFixes()">';
      html += '</div>';

      if (!fixes.length) {
        html += '<div class="empty-state"><span class="material-symbols-outlined">build</span><p>No community fixes yet.</p></div>';
        container.innerHTML = html;
        return;
      }

      html += '<div class="space-y-2" id="fixList">';
      fixes.forEach(function (f) {
        html += '<div class="data-card fix-item" data-device="' + escapeHtml((f.device||'') + ' ' + (f.brand||'') + ' ' + (f.model||'')) + '"><div class="flex justify-between items-start"><div><div class="data-card-title">' + escapeHtml(f.title || 'Untitled') + '</div><div class="data-card-sub">' + escapeHtml(f.device || '') + (f.brand ? ' - ' + escapeHtml(f.brand) : '') + (f.model ? ' - ' + escapeHtml(f.model) : '') + '</div></div><span class="badge ' + (f.approved ? 'badge-green' : 'badge-orange') + '">' + (f.approved ? 'Approved' : 'Pending') + '</span></div>';
        if (f.description) html += '<p class="text-sm text-ink-gray mt-2">' + escapeHtml(f.description.slice(0, 300)) + '</p>';
        html += '</div>';
      });
      html += '</div>';

      window.filterFixes = function () {
        var q = document.getElementById('fixSearch').value.toLowerCase();
        document.querySelectorAll('.fix-item').forEach(function (el) {
          el.style.display = q ? (el.dataset.device.toLowerCase().includes(q) ? '' : 'none') : '';
        });
      };

      container.innerHTML = html;
    } catch (e) {
      showError('Failed to load fixes.');
    }
  }

  async function loadTechnicians() {
    try {
      const [leaderRes, createForm] = await Promise.all([
        fetch(API + '/api/community/technicians?limit=50'),
        Promise.resolve(true)
      ]);
      const leaderData = leaderRes.ok ? await leaderRes.json() : { technicians: [] };
      const techs = leaderData.technicians || [];

      let html = '<div class="glass-surface rounded-xl p-6 mb-6"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Create Technician Profile</h3>';
      html += '<div class="flex flex-col md:flex-row gap-3"><input class="form-input" id="techName" placeholder="Display name *"><input class="form-input" id="techBio" placeholder="Short bio"><input class="form-input" id="techSpecialties" placeholder="Specialties (comma-separated)"><button class="btn-primary" onclick="window.createTechnician()"><span class="material-symbols-outlined text-lg">add</span> Create</button></div></div>';

      html += '<h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Technician Leaderboard</h3>';

      if (!techs.length) {
        html += '<div class="empty-state"><span class="material-symbols-outlined">badge</span><p>No technicians yet. Be the first!</p></div>';
      } else {
        html += '<div class="space-y-2">';
        techs.forEach(function (t, i) {
          const rank = i + 1;
          html += '<div class="data-card flex items-center gap-4"><div class="w-8 h-8 rounded-full bg-forest-deep text-white flex items-center justify-center font-bold text-sm">' + rank + '</div><div class="flex-1"><div class="data-card-title">' + escapeHtml(t.displayName || 'Anonymous') + '</div><div class="data-card-sub">' + escapeHtml(t.bio || '') + (t.specialties && t.specialties.length ? ' &middot; ' + t.specialties.join(', ') : '') + '</div></div><div class="text-right"><div class="font-bold text-forest-deep">' + (t.reputation || 0) + '</div><div class="text-xs text-ink-gray uppercase tracking-wider">Reputation</div></div></div>';
        });
        html += '</div>';
      }

      container.innerHTML = html;

      window.createTechnician = async function () {
        var name = document.getElementById('techName').value.trim();
        var bio = document.getElementById('techBio').value.trim();
        var specs = document.getElementById('techSpecialties').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!name) return alert('Display name is required');
        try {
          var r = await fetch(API + '/api/community/technicians', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName: name, bio: bio, specialties: specs })
          });
          if (r.ok) { alert('Technician profile created!'); loadTechnicians(); }
          else { alert('Failed to create profile'); }
        } catch (e) { alert('Error creating profile'); }
      };
    } catch (e) {
      showError('Failed to load technicians.');
    }
  }

  async function loadWarnings() {
    try {
      const res = await fetch(API + '/api/community/warnings');
      const data = res.ok ? await res.json() : { warnings: [] };
      const warnings = data.warnings || [];

      let html = '<div class="glass-surface rounded-xl p-6 mb-6"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Submit a Warning</h3>';
      html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">';
      html += '<input class="form-input" id="warnDevice" placeholder="Device type (e.g. laptop)">';
      html += '<input class="form-input" id="warnBrand" placeholder="Brand">';
      html += '<input class="form-input" id="warnModel" placeholder="Model">';
      html += '</div><textarea class="form-input mb-3" id="warnText" placeholder="Warning description *" rows="3"></textarea>';
      html += '<div class="flex gap-3 items-center"><select class="form-select w-auto" id="warnSeverity"><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option></select>';
      html += '<button class="btn-primary" onclick="window.submitWarning()"><span class="material-symbols-outlined text-lg">warning</span> Submit Warning</button></div></div>';

      if (!warnings.length) {
        html += '<div class="empty-state"><span class="material-symbols-outlined">warning_amber</span><p>No warnings yet.</p></div>';
      } else {
        html += '<h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Repair Warnings</h3><div class="space-y-2">';
        warnings.forEach(function (w) {
          const sev = w.severity || 'info';
          const sevClass = sev === 'critical' ? 'badge-red' : sev === 'warning' ? 'badge-orange' : 'badge-blue';
          html += '<div class="data-card"><div class="flex items-center gap-2 mb-2"><span class="badge ' + sevClass + '">' + escapeHtml(sev) + '</span><span class="text-xs text-ink-gray">' + escapeHtml(w.device || '') + (w.brand ? ' - ' + escapeHtml(w.brand) : '') + (w.model ? ' - ' + escapeHtml(w.model) : '') + '</span></div><p class="text-sm">' + escapeHtml(w.warning || '') + '</p></div>';
        });
        html += '</div>';
      }

      container.innerHTML = html;

      window.submitWarning = async function () {
        var warn = document.getElementById('warnText').value.trim();
        if (!warn) return alert('Warning is required');
        try {
          var r = await fetch(API + '/api/community/warnings', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              device: document.getElementById('warnDevice').value.trim() || 'laptop',
              brand: document.getElementById('warnBrand').value.trim(),
              model: document.getElementById('warnModel').value.trim(),
              warning: warn,
              severity: document.getElementById('warnSeverity').value
            })
          });
          if (r.ok) { alert('Warning submitted!'); loadWarnings(); }
          else { alert('Failed to submit'); }
        } catch (e) { alert('Error'); }
      };
    } catch (e) {
      showError('Failed to load warnings.');
    }
  }

  async function loadHeatmap() {
    try {
      const res = await fetch(API + '/api/community/heatmap?device=laptop');
      const data = res.ok ? await res.json() : {};
      const heatmap = data.heatmap || [];

      let html = '<div class="flex gap-3 mb-4"><input class="form-input max-w-[200px]" id="heatmapDevice" placeholder="Device" value="laptop"><input class="form-input max-w-[200px]" id="heatmapBrand" placeholder="Brand (optional)"><button class="btn-primary" onclick="window.refreshHeatmap()"><span class="material-symbols-outlined text-lg">refresh</span> Load</button></div>';

      if (!heatmap.length) {
        html += '<div class="empty-state"><span class="material-symbols-outlined">map</span><p>No heatmap data yet. Submit failure reports to build the heatmap.</p></div>';
      } else {
        html += '<h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Failure Heatmap</h3><div class="space-y-2">';
        heatmap.forEach(function (h) {
          html += '<div class="data-card"><div class="flex justify-between items-center"><div><div class="data-card-title">' + escapeHtml(h.symptom || 'Unknown') + '</div><div class="data-card-sub">' + escapeHtml(h.failure || '') + ' &middot; ' + (h.count || 0) + ' reports</div></div><span class="badge ' + ((h.successRate || 0) >= 50 ? 'badge-green' : 'badge-orange') + '">' + (h.successRate || 0) + '% fixed</span></div></div>';
        });
        html += '</div>';
      }

      html += '<div class="glass-surface rounded-xl p-6 mt-6"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Submit Failure Report</h3>';
      html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-3"><input class="form-input" id="frSymptom" placeholder="Symptom *"><input class="form-input" id="frFailure" placeholder="Failure cause *"><input class="form-input" id="frRepair" placeholder="What was tried"><input class="form-input" id="frRegion" placeholder="Region"></div>';
      html += '<div class="flex gap-3 items-center mt-3"><label class="flex items-center gap-2 text-sm"><input type="checkbox" id="frSuccess" class="rounded"> Repair was successful</label>';
      html += '<button class="btn-primary" onclick="window.submitFailureReport()"><span class="material-symbols-outlined text-lg">add_location</span> Submit Report</button></div></div>';

      container.innerHTML = html;

      window.refreshHeatmap = function () {
        loadHeatmap();
      };

      window.submitFailureReport = async function () {
        var symptom = document.getElementById('frSymptom').value.trim();
        var failure = document.getElementById('frFailure').value.trim();
        if (!symptom || !failure) return alert('Symptom and failure are required');
        try {
          var r = await fetch(API + '/api/community/failure-reports', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              device: document.getElementById('heatmapDevice').value.trim() || 'laptop',
              brand: document.getElementById('heatmapBrand').value.trim(),
              symptom: symptom, failure: failure,
              repairAttempted: document.getElementById('frRepair').value.trim(),
              successful: document.getElementById('frSuccess').checked,
              region: document.getElementById('frRegion').value.trim()
            })
          });
          if (r.ok) { alert('Report submitted!'); loadHeatmap(); }
          else { alert('Failed to submit'); }
        } catch (e) { alert('Error'); }
      };
    } catch (e) {
      showError('Failed to load heatmap.');
    }
  }

  async function loadTrends() {
    try {
      const res = await fetch(API + '/api/community/trends?device=laptop');
      const trends = res.ok ? await res.json() : [];
      const items = Array.isArray(trends) ? trends : (trends.trends || []);

      let html = '<div class="flex gap-3 mb-4"><input class="form-input max-w-[200px]" id="trendDevice" placeholder="Device" value="laptop"><input class="form-input max-w-[200px]" id="trendBrand" placeholder="Brand (optional)"><button class="btn-primary" onclick="window.refreshTrends()"><span class="material-symbols-outlined text-lg">trending_up</span> Load</button></div>';

      if (!items.length) {
        html += '<div class="empty-state"><span class="material-symbols-outlined">timeline</span><p>No trend data available yet.</p></div>';
      } else {
        html += '<h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Failure Trends</h3><div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-forest-deep/5"><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Symptom</th><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Count</th><th class="text-left p-3 font-semibold text-ink-gray uppercase tracking-wider text-xs">Trend</th></tr></thead><tbody>';
        items.forEach(function (t) {
          const trend = t.trend || 0;
          const trendClass = trend > 0 ? 'text-red-600' : trend < 0 ? 'text-green-600' : '';
          const trendIcon = trend > 0 ? 'arrow_upward' : trend < 0 ? 'arrow_downward' : 'remove';
          html += '<tr class="border-t border-outline-variant/10"><td class="p-3">' + escapeHtml(t.symptom || t.failure || 'Unknown') + '</td><td class="p-3">' + (t.count || 0) + '</td><td class="p-3 ' + trendClass + '"><span class="material-symbols-outlined text-sm align-text-bottom">' + trendIcon + '</span> ' + (trend > 0 ? '+' : '') + trend + '%</td></tr>';
        });
        html += '</tbody></table></div>';
      }

      container.innerHTML = html;

      window.refreshTrends = function () {
        loadTrends();
      };
    } catch (e) {
      showError('Failed to load trends.');
    }
  }

  async function loadReliability() {
    try {
      const res = await fetch(API + '/api/ecosystem/v1/reliability');
      const report = res.ok ? await res.json() : {};
      const brands = report.brands || report.models || [];

      let html = '<div class="flex gap-3 mb-4"><input class="form-input max-w-[200px]" id="relBrand" placeholder="Brand name"><button class="btn-primary" onclick="window.loadBrandReliability()"><span class="material-symbols-outlined text-lg">verified</span> Search</button></div>';
      html += '<div id="reliabilityResults">';

      if (Array.isArray(brands) && brands.length) {
        html += '<h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Brand Reliability Overview</h3><div class="space-y-2">';
        brands.forEach(function (b) {
          const score = typeof b.repairabilityScore === 'number' ? b.repairabilityScore : (b.score || 0);
          const scoreClass = score >= 70 ? 'badge-green' : score >= 40 ? 'badge-orange' : 'badge-red';
          html += '<div class="data-card flex justify-between items-center"><div><div class="data-card-title">' + escapeHtml(b.brand || b.model || b.name || 'Unknown') + '</div><div class="data-card-sub">' + (b.totalReports || b.total || 0) + ' reports</div></div><span class="badge ' + scoreClass + '">' + score + '/100</span></div>';
        });
        html += '</div>';
      } else if (Object.keys(report).length > 0) {
        html += '<div class="data-card"><pre class="text-xs overflow-auto max-h-96">' + escapeHtml(JSON.stringify(report, null, 2)) + '</pre></div>';
      } else {
        html += '<div class="empty-state"><span class="material-symbols-outlined">shield</span><p>No reliability data yet. Enter a brand above to load specific data.</p></div>';
      }

      html += '</div>';
      container.innerHTML = html;

      window.loadBrandReliability = async function () {
        var brand = document.getElementById('relBrand').value.trim();
        if (!brand) return;
        try {
          var r = await fetch(API + '/api/community/brand-reliability?brand=' + encodeURIComponent(brand) + '&limit=20');
          var data = r.ok ? await r.json() : {};
          var models = data.models || [];
          var html2 = '<h3 class="font-headline text-lg font-bold text-forest-deeb mb-3">' + escapeHtml(brand) + ' Reliability</h3>';
          if (!models.length) { html2 += '<p class="text-ink-gray">No data for this brand.</p>'; }
          else {
            html2 += '<div class="space-y-2">';
            models.forEach(function (m) {
              html2 += '<div class="data-card flex justify-between items-center"><div><div class="data-card-title">' + escapeHtml(m.model || 'Unknown') + '</div><div class="data-card-sub">' + (m.totalReports || 0) + ' reports, ' + (m.successRate || 0) + '% success rate</div></div></div>';
            });
            html2 += '</div>';
          }
          document.getElementById('reliabilityResults').innerHTML = html2;
        } catch (e) { alert('Failed to load'); }
      };
    } catch (e) {
      showError('Failed to load reliability data.');
    }
  }

  setupTabs();
  loadTab('overview');
})();
