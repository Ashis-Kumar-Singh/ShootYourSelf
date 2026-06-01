(function () {
  const API = window.location.origin;
  const container = document.getElementById('ecosystemContent');
  let currentTab = 'api';

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
      case 'api': loadApi(); break;
      case 'datasets': loadDatasets(); break;
      case 'reliability': loadReliability(); break;
      case 'export': loadExport(); break;
      default: loadApi();
    }
  }

  async function loadApi() {
    try {
      var r = await fetch(API + '/api/v1');
      var spec = r.ok ? await r.json() : {};

      let html = '<div class="stat-card mb-6"><h3 class="font-headline text-lg font-bold text-forest-deep mb-2">Open Repair API</h3>';
      html += '<p class="text-sm text-ink-gray mb-3">Public API for accessing repair intelligence programmatically.</p>';

      html += '<div class="space-y-3">';
      html += '<div class="data-card"><span class="data-card-title">GET /api/v1/devices</span><div class="data-card-sub">List all supported devices with brands and categories</div></div>';
      html += '<div class="data-card"><span class="data-card-title">GET /api/v1/outcomes</span><div class="data-card-sub">Export anonymized repair outcomes</div></div>';
      html += '<div class="data-card"><span class="data-card-title">GET /api/v1/failure-patterns</span><div class="data-card-sub">Export failure pattern data</div></div>';
      html += '<div class="data-card"><span class="data-card-title">GET /api/v1/telemetry</span><div class="data-card-sub">Export anonymized telemetry data</div></div>';
      html += '<div class="data-card"><span class="data-card-title">GET /api/v1/reliability</span><div class="data-card-sub">Manufacturer reliability report</div></div>';
      html += '<div class="data-card"><span class="data-card-title">GET /api/v1/datasets</span><div class="data-card-sub">List published datasets</div></div>';
      html += '<div class="data-card"><span class="data-card-title">POST /api/v1/datasets</span><div class="data-card-sub">Publish a new dataset</div></div>';
      html += '</div>';

      if (spec.version || spec.name) {
        html += '<div class="mt-4 text-xs text-ink-gray">API Version: ' + escapeHtml(spec.version || 'v1') + ' &middot; ' + escapeHtml(spec.name || '') + '</div>';
      }

      html += '</div>';

      html += '<div class="stat-card"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Quick Test</h3>';
      html += '<p class="text-sm text-ink-gray mb-3">Test the API endpoints directly.</p>';
      html += '<div class="flex gap-3 flex-wrap">';
      html += '<button class="btn-secondary text-sm" onclick="window.testApi(\'devices\')">GET /api/v1/devices</button>';
      html += '<button class="btn-secondary text-sm" onclick="window.testApi(\'outcomes\')">GET /api/v1/outcomes</button>';
      html += '<button class="btn-secondary text-sm" onclick="window.testApi(\'failure-patterns\')">GET /api/v1/failure-patterns</button>';
      html += '<button class="btn-secondary text-sm" onclick="window.testApi(\'reliability\')">GET /api/v1/reliability</button>';
      html += '</div><div id="apiTestOutput" class="hidden mt-3"><pre class="text-xs bg-surface-container-high/60 rounded-xl p-4 overflow-auto max-h-64"></pre></div></div>';

      container.innerHTML = html;

      window.testApi = async function (endpoint) {
        var outDiv = document.getElementById('apiTestOutput');
        outDiv.classList.remove('hidden');
        outDiv.querySelector('pre').textContent = 'Fetching ' + endpoint + '...';
        try {
          var r = await fetch(API + '/api/v1/' + endpoint);
          var data = r.ok ? await r.json() : { error: 'HTTP ' + r.status };
          outDiv.querySelector('pre').textContent = JSON.stringify(data, null, 2);
        } catch (e) { outDiv.querySelector('pre').textContent = 'Error: ' + e.message; }
      };
    } catch (e) {
      showError('Failed to load API spec.');
    }
  }

  async function loadDatasets() {
    try {
      var r = await fetch(API + '/api/v1/datasets?published=true');
      var data = r.ok ? await r.json() : { datasets: [] };
      var datasets = data.datasets || [];

      let html = '<div class="stat-card mb-6"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Published Datasets</h3>';

      if (!datasets.length) {
        html += '<div class="empty-state"><span class="material-symbols-outlined">dataset</span><p>No datasets published yet.</p></div>';
      } else {
        html += '<div class="space-y-2">';
        datasets.forEach(function (d) {
          html += '<div class="data-card"><div class="flex justify-between items-center"><div><div class="data-card-title">' + escapeHtml(d.name || 'Untitled') + '</div><div class="data-card-sub">' + escapeHtml(d.description || '').slice(0, 200) + '</div></div>';
          html += '<button class="btn-secondary text-xs" onclick="window.viewDataset(\'' + escapeHtml(d.id) + '\')"><span class="material-symbols-outlined text-lg">visibility</span> View</button></div></div>';
        });
        html += '</div>';
      }
      html += '</div>';

      html += '<div class="stat-card"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Publish Dataset</h3>';
      html += '<div class="space-y-3">';
      html += '<input class="form-input" id="dsName" placeholder="Dataset name *">';
      html += '<input class="form-input" id="dsDesc" placeholder="Description *">';
      html += '<textarea class="form-input font-mono text-xs" id="dsData" rows="5" placeholder="JSON data *"></textarea>';
      html += '<button class="btn-primary" onclick="window.publishDataset()"><span class="material-symbols-outlined text-lg">publish</span> Publish</button>';
      html += '<div id="publishResult" class="hidden"></div></div></div>';

      container.innerHTML = html;

      window.viewDataset = async function (id) {
        try {
          var r = await fetch(API + '/api/v1/datasets/' + id);
          var d = r.ok ? await r.json() : {};
          var win = window.open('', '_blank');
          win.document.write('<html><head><title>Dataset - ' + escapeHtml(id) + '</title><style>body{font-family:monospace;font-size:12px;padding:20px;background:#f6f0e6}pre{white-space:pre-wrap}</style></head><body>');
          win.document.write('<pre>' + escapeHtml(JSON.stringify(d, null, 2)) + '</pre></body></html>');
        } catch (e) { alert('Failed to view'); }
      };

      window.publishDataset = async function () {
        var name = document.getElementById('dsName').value.trim();
        var desc = document.getElementById('dsDesc').value.trim();
        var dataText = document.getElementById('dsData').value.trim();
        if (!name || !desc || !dataText) return alert('Name, description, and data are required');
        var dataObj;
        try { dataObj = JSON.parse(dataText); } catch (e) { return alert('Invalid JSON'); }
        try {
          var r = await fetch(API + '/api/v1/datasets', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, description: desc, data: dataObj })
          });
          var result = r.ok ? await r.json() : {};
          var outDiv = document.getElementById('publishResult');
          outDiv.innerHTML = result.dataset ? '<p class="text-green-600">Dataset published! ID: ' + escapeHtml(result.dataset.id) + '</p>' : '<p class="text-red-600">Failed to publish</p>';
        } catch (e) { alert('Error publishing'); }
      };
    } catch (e) {
      showError('Failed to load datasets.');
    }
  }

  async function loadReliability() {
    try {
      var r = await fetch(API + '/api/v1/reliability');
      var report = r.ok ? await r.json() : {};

      let html = '<div class="stat-card"><h3 class="font-headline text-lg font-bold text-forest-deep mb-2">Manufacturer Reliability Report</h3>';
      html += '<p class="text-sm text-ink-gray mb-3">Anonymized reliability data aggregated from repair outcomes.</p>';

      var brands = report.brands || report.models || [];
      var entries = Array.isArray(brands) ? brands : [];

      if (entries.length) {
        html += '<div class="space-y-2">';
        entries.forEach(function (b) {
          var score = typeof b.repairabilityScore === 'number' ? b.repairabilityScore : (b.score || 0);
          var scoreClass = score >= 70 ? 'badge-green' : score >= 40 ? 'badge-orange' : 'badge-red';
          html += '<div class="data-card flex justify-between items-center"><div><div class="data-card-title">' + escapeHtml(b.brand || b.model || b.name || 'Unknown') + '</div><div class="data-card-sub">' + (b.totalReports || b.total || 0) + ' reports</div></div><span class="badge ' + scoreClass + '">' + Math.round(score) + '/100</span></div>';
        });
        html += '</div>';
      } else {
        html += '<div class="empty-state"><span class="material-symbols-outlined">verified</span><p>No reliability data yet. Data appears as repair outcomes are tracked.</p></div>';
        if (Object.keys(report).length > 0) {
          html += '<pre class="text-xs bg-surface-container-high/60 rounded-xl p-4 overflow-auto max-h-96 mt-3">' + escapeHtml(JSON.stringify(report, null, 2)) + '</pre>';
        }
      }

      html += '</div>';
      container.innerHTML = html;
    } catch (e) {
      showError('Failed to load reliability report.');
    }
  }

  async function loadExport() {
    let html = '<div class="stat-card mb-6"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Data Export</h3>';
    html += '<p class="text-sm text-ink-gray mb-4">Export anonymized repair data for analysis.</p>';
    html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';

    html += '<div class="data-card cursor-pointer hover:shadow-md transition-all" onclick="window.exportData(\'outcomes\')"><div class="flex items-center gap-3"><span class="material-symbols-outlined text-forest-deep text-2xl">task_alt</span><div><div class="data-card-title">Repair Outcomes</div><div class="data-card-sub">Anonymized success/failure data</div></div></div></div>';

    html += '<div class="data-card cursor-pointer hover:shadow-md transition-all" onclick="window.exportData(\'failure-patterns\')"><div class="flex items-center gap-3"><span class="material-symbols-outlined text-forest-deep text-2xl">bug_report</span><div><div class="data-card-title">Failure Patterns</div><div class="data-card-sub">Common failure patterns and frequencies</div></div></div></div>';

    html += '<div class="data-card cursor-pointer hover:shadow-md transition-all" onclick="window.exportData(\'telemetry\')"><div class="flex items-center gap-3"><span class="material-symbols-outlined text-forest-deep text-2xl">sensors</span><div><div class="data-card-title">Telemetry Data</div><div class="data-card-sub">Anonymized device telemetry readings</div></div></div></div>';

    html += '<div class="data-card cursor-pointer hover:shadow-md transition-all" onclick="window.exportData(\'reliability\')"><div class="flex items-center gap-3"><span class="material-symbols-outlined text-forest-deep text-2xl">verified</span><div><div class="data-card-title">Reliability Report</div><div class="data-card-sub">Manufacturer repairability scores</div></div></div></div>';

    html += '</div><div id="exportOutput" class="hidden mt-4"><pre class="text-xs bg-surface-container-high/60 rounded-xl p-4 overflow-auto max-h-96"></pre></div></div>';

    container.innerHTML = html;

    window.exportData = async function (type) {
      var outDiv = document.getElementById('exportOutput');
      outDiv.classList.remove('hidden');
      outDiv.querySelector('pre').textContent = 'Exporting ' + type + '...';
      try {
        var r = await fetch(API + '/api/v1/' + type + '?limit=500');
        var data = r.ok ? await r.json() : { error: 'HTTP ' + r.status };
        outDiv.querySelector('pre').textContent = JSON.stringify(data, null, 2);
      } catch (e) { outDiv.querySelector('pre').textContent = 'Error: ' + e.message; }
    };
  }

  setupTabs();
  loadTab('api');
})();
