(function () {
  const API = window.location.origin;
  const container = document.getElementById('telemetryContent');
  let currentTab = 'submit';

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
      case 'submit': loadSubmit(); break;
      case 'history': loadHistory(); break;
      case 'alerts': loadAlerts(); break;
      case 'correlate': loadCorrelate(); break;
      default: loadSubmit();
    }
  }

  async function loadSubmit() {
    try {
      var typesRes = await fetch(API + '/api/telemetry/types');
      var typesData = typesRes.ok ? await typesRes.json() : { dataTypes: [] };
      var types = typesData.dataTypes || [];

      let html = '<div class="stat-card"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Submit Telemetry Report</h3>';
      html += '<p class="text-sm text-ink-gray mb-3">Submit device telemetry data for diagnostic analysis.</p>';

      html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">';
      html += '<div><label class="text-xs text-ink-gray block mb-1">Device Type</label><input class="form-input" id="telDevice" value="laptop" placeholder="e.g. laptop"></div>';
      html += '<div><label class="text-xs text-ink-gray block mb-1">Brand</label><input class="form-input" id="telBrand" placeholder="e.g. Dell"></div>';
      html += '<div><label class="text-xs text-ink-gray block mb-1">Model</label><input class="form-input" id="telModel" placeholder="e.g. XPS 13"></div>';
      html += '</div>';

      html += '<div class="mb-3"><label class="text-xs text-ink-gray block mb-1">Data Type</label>';
      if (types.length) {
        html += '<select class="form-select" id="telType">';
        types.forEach(function (t) {
          var name = typeof t === 'string' ? t : (t.name || t.id || t);
          html += '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
        });
        html += '</select>';
      } else {
        html += '<input class="form-input" id="telType" value="smart" placeholder="e.g. smart, battery, cpu">';
      }
      html += '</div>';

      html += '<div class="mb-3"><label class="text-xs text-ink-gray block mb-1">Data (JSON)</label>';
      html += '<textarea class="form-input font-mono text-xs" id="telData" rows="5" placeholder=\'{"health_percent": 85, "temperature_c": 42}\'></textarea></div>';

      html += '<button class="btn-primary" onclick="window.submitTelemetry()"><span class="material-symbols-outlined text-lg">upload</span> Submit Report</button>';
      html += '<div id="telResult" class="mt-3 hidden"></div></div>';

      html += '<div class="stat-card mt-6"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Submit Full Snapshot</h3>';
      html += '<p class="text-sm text-ink-gray mb-3">Submit a complete device snapshot with all telemetry types.</p>';
      html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">';
      html += '<input class="form-input" id="snapDevice" value="laptop" placeholder="Device">';
      html += '<input class="form-input" id="snapBrand" placeholder="Brand">';
      html += '<input class="form-input" id="snapModel" placeholder="Model">';
      html += '</div>';
      html += '<textarea class="form-input font-mono text-xs mb-3" id="snapData" rows="5" placeholder=\'{"smart": {"health_percent": 80}, "battery": {"wear_level": 15}}\'></textarea>';
      html += '<button class="btn-primary" onclick="window.submitSnapshot()"><span class="material-symbols-outlined text-lg">database</span> Submit Snapshot</button></div>';

      container.innerHTML = html;

      window.submitTelemetry = async function () {
        var dataText = document.getElementById('telData').value.trim();
        if (!dataText) return alert('Data is required');
        var dataObj;
        try { dataObj = JSON.parse(dataText); } catch (e) { return alert('Invalid JSON in data field'); }
        try {
          var r = await fetch(API + '/api/telemetry/report', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              device: document.getElementById('telDevice').value.trim() || 'laptop',
              brand: document.getElementById('telBrand').value.trim(),
              model: document.getElementById('telModel').value.trim(),
              dataType: document.getElementById('telType').value,
              data: dataObj
            })
          });
          var result = r.ok ? await r.json() : { error: 'Submission failed' };
          var out = document.getElementById('telResult');
          out.classList.remove('hidden');
          if (result.error) out.innerHTML = '<p class="text-red-600">' + escapeHtml(result.error) + '</p>';
          else out.innerHTML = '<p class="text-green-600">Report submitted. ID: ' + escapeHtml(result.id || result.reportId || 'ok') + '</p>' + (result.alerts && result.alerts.length ? '<div class="mt-2"><p class="font-semibold text-sm">Alerts triggered:</p><ul class="list-disc list-inside text-sm text-ink-gray">' + result.alerts.map(function (a) { return '<li>' + escapeHtml(a.message || JSON.stringify(a)) + '</li>'; }).join('') + '</ul></div>' : '');
        } catch (e) { alert('Error submitting'); }
      };

      window.submitSnapshot = async function () {
        var dataText = document.getElementById('snapData').value.trim();
        if (!dataText) return alert('Snapshot data is required');
        var dataObj;
        try { dataObj = JSON.parse(dataText); } catch (e) { return alert('Invalid JSON'); }
        try {
          var r = await fetch(API + '/api/telemetry/snapshot', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              device: document.getElementById('snapDevice').value.trim() || 'laptop',
              brand: document.getElementById('snapBrand').value.trim(),
              model: document.getElementById('snapModel').value.trim(),
              snapshot: dataObj
            })
          });
          var result = r.ok ? await r.json() : {};
          alert(result.id ? 'Snapshot submitted! ID: ' + result.id : 'Snapshot submitted!');
        } catch (e) { alert('Error submitting'); }
      };
    } catch (e) {
      showError('Failed to load.');
    }
  }

  async function loadHistory() {
    let html = '<div class="flex flex-wrap gap-3 mb-4 items-end">';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Device</label><input class="form-input" id="histDevice" value="laptop"></div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Brand</label><input class="form-input" id="histBrand"></div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Model</label><input class="form-input" id="histModel"></div>';
    html += '<div><button class="btn-primary" onclick="window.loadTelemetryHistory()"><span class="material-symbols-outlined text-lg">history</span> Load</button></div>';
    html += '</div><div id="historyResults"><div class="empty-state"><span class="material-symbols-outlined">sensors</span><p>Enter device details and click Load to view telemetry history.</p></div></div>';

    container.innerHTML = html;

    window.loadTelemetryHistory = async function () {
      var device = document.getElementById('histDevice').value.trim() || 'laptop';
      var brand = document.getElementById('histBrand').value.trim();
      var model = document.getElementById('histModel').value.trim();
      var params = 'device=' + encodeURIComponent(device);
      if (brand) params += '&brand=' + encodeURIComponent(brand);
      if (model) params += '&model=' + encodeURIComponent(model);
      var resultsDiv = document.getElementById('historyResults');
      resultsDiv.innerHTML = '<div class="text-center py-4"><p class="text-ink-gray">Loading...</p></div>';
      try {
        var r = await fetch(API + '/api/telemetry/history?' + params);
        var data = r.ok ? await r.json() : { reports: [] };
        var reports = data.reports || [];
        if (!reports.length) {
          resultsDiv.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">sensors</span><p>No telemetry reports found.</p></div>';
          return;
        }
        var html2 = '<div class="space-y-2">';
        reports.forEach(function (rep) {
          html2 += '<div class="data-card"><div class="flex justify-between items-center"><div class="data-card-title">' + escapeHtml(rep.dataType || 'Unknown') + ' report</div><span class="text-xs text-ink-gray">' + (rep.timestamp ? new Date(rep.timestamp).toLocaleString() : '') + '</span></div>';
          html2 += '<div class="text-xs text-ink-gray mt-1">' + escapeHtml(JSON.stringify(rep.data || {}).slice(0, 200)) + '</div></div>';
        });
        html2 += '</div>';
        resultsDiv.innerHTML = html2;
      } catch (e) { resultsDiv.innerHTML = '<p class="text-red-600">Failed to load history.</p>'; }
    };
  }

  async function loadAlerts() {
    try {
      var r = await fetch(API + '/api/telemetry/alerts?device=laptop&limit=50');
      var data = r.ok ? await r.json() : { alerts: [] };
      var alerts = data.alerts || [];

      let html = '<div class="flex gap-3 mb-4"><input class="form-input max-w-[200px]" id="alertDevice" placeholder="Device" value="laptop"><button class="btn-primary" onclick="window.refreshAlerts()"><span class="material-symbols-outlined text-lg">notifications</span> Refresh</button></div>';

      if (!alerts.length) {
        html += '<div class="empty-state"><span class="material-symbols-outlined">notifications_off</span><p>No alerts. Telemetry data triggers alerts when thresholds are exceeded.</p></div>';
      } else {
        html += '<div class="space-y-2">';
        alerts.forEach(function (a) {
          var sevClass = a.severity === 'critical' ? 'badge-red' : a.severity === 'warning' ? 'badge-orange' : 'badge-blue';
          html += '<div class="data-card"><div class="flex items-center gap-2 mb-2"><span class="badge ' + sevClass + '">' + escapeHtml(a.severity || 'info') + '</span><span class="text-xs text-ink-gray">' + escapeHtml(a.type || '') + '</span></div>';
          html += '<p class="text-sm">' + escapeHtml(a.message || '') + '</p>';
          if (!a.acknowledged) html += '<button class="btn-secondary text-xs mt-2" onclick="window.acknowledgeAlert(\'' + a.id + '\')">Acknowledge</button>';
          else html += '<span class="text-xs text-green-600 mt-2 inline-block">Acknowledged</span>';
          html += '</div>';
        });
        html += '</div>';
      }

      container.innerHTML = html;

      window.refreshAlerts = function () { loadAlerts(); };

      window.acknowledgeAlert = async function (id) {
        try {
          await fetch(API + '/api/telemetry/alerts/' + id + '/acknowledge', { method: 'POST' });
          loadAlerts();
        } catch (e) { alert('Failed to acknowledge'); }
      };
    } catch (e) {
      showError('Failed to load alerts.');
    }
  }

  async function loadCorrelate() {
    let html = '<div class="stat-card"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Diagnostic Correlation</h3>';
    html += '<p class="text-sm text-ink-gray mb-3">Correlate symptoms with telemetry data for accurate diagnostics.</p>';
    html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">';
    html += '<input class="form-input" id="corrDevice" value="laptop" placeholder="Device">';
    html += '<input class="form-input" id="corrBrand" placeholder="Brand">';
    html += '<input class="form-input" id="corrModel" placeholder="Model">';
    html += '</div>';
    html += '<div class="mb-3"><label class="text-xs text-ink-gray block mb-1">Symptoms (one per line)</label>';
    html += '<textarea class="form-input" id="corrSymptoms" rows="3" placeholder="overheating\nbattery drain\nslow performance"></textarea></div>';
    html += '<button class="btn-primary" onclick="window.runCorrelation()"><span class="material-symbols-outlined text-lg">hub</span> Correlate</button>';
    html += '<div id="correlationResults" class="mt-4 hidden"></div></div>';

    container.innerHTML = html;

    window.runCorrelation = async function () {
      var symptoms = document.getElementById('corrSymptoms').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!symptoms.length) return alert('Enter at least one symptom');
      var resultsDiv = document.getElementById('correlationResults');
      resultsDiv.classList.remove('hidden');
      resultsDiv.innerHTML = '<div class="text-center py-4"><p class="text-ink-gray">Correlating...</p></div>';
      try {
        var r = await fetch(API + '/api/telemetry/correlate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device: document.getElementById('corrDevice').value.trim() || 'laptop',
            brand: document.getElementById('corrBrand').value.trim(),
            model: document.getElementById('corrModel').value.trim(),
            symptoms: symptoms
          })
        });
        var data = r.ok ? await r.json() : {};
        var correlations = data.correlations || data.results || data;
        var html = '<div class="space-y-2">';
        if (Array.isArray(correlations)) {
          correlations.forEach(function (c) {
            html += '<div class="data-card"><div class="data-card-title">' + escapeHtml(c.symptom || c.issue || 'Correlation') + '</div><div class="text-sm text-ink-gray mt-1">' + escapeHtml(JSON.stringify(c)) + '</div></div>';
          });
        } else {
          html += '<pre class="text-xs bg-surface-container-high/60 rounded-xl p-4 overflow-auto max-h-96">' + escapeHtml(JSON.stringify(correlations, null, 2)) + '</pre>';
        }
        html += '</div>';
        resultsDiv.innerHTML = html;
      } catch (e) { resultsDiv.innerHTML = '<p class="text-red-600">Correlation failed.</p>'; }
    };
  }

  setupTabs();
  loadTab('submit');
})();
