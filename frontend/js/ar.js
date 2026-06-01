(function () {
  const API = window.location.origin;
  const container = document.getElementById('arContent');
  let currentTab = 'model';

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
      case 'model': loadModel(); break;
      case 'screws': loadScrews(); break;
      case 'components': loadComponents(); break;
      case 'overlay': loadOverlay(); break;
      default: loadModel();
    }
  }

  async function loadModel() {
    let html = '<div class="flex gap-3 mb-4 items-end">';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Device Type</label><select class="form-select" id="modelDevice"><option value="laptop">Laptop</option><option value="phone">Phone</option></select></div>';
    html += '<button class="btn-primary" onclick="window.loadRepairModel()"><span class="material-symbols-outlined text-lg">view_in_ar</span> Load Model</button>';
    html += '</div><div id="modelData"><div class="empty-state"><span class="material-symbols-outlined">view_in_ar</span><p>Select a device type and click Load Model to view AR repair data.</p></div></div>';

    container.innerHTML = html;

    window.loadRepairModel = async function () {
      var device = document.getElementById('modelDevice').value;
      var dataDiv = document.getElementById('modelData');
      dataDiv.innerHTML = '<div class="text-center py-4"><p class="text-ink-gray">Loading AR model...</p></div>';
      try {
        var r = await fetch(API + '/api/ar/model/' + device);
        var data = r.ok ? await r.json() : {};
        var model = data.model || {};
        var html = '<div class="space-y-3">';
        if (model.screws && model.screws.length) {
          html += '<div class="stat-card"><h4 class="font-semibold text-forest-deep mb-2">Screws (' + model.screws.length + ')</h4>';
          html += '<div class="grid grid-cols-2 md:grid-cols-3 gap-2">';
          model.screws.slice(0, 12).forEach(function (s) {
            html += '<div class="text-xs bg-surface-container-high/60 rounded-lg p-2"><span class="font-semibold">' + escapeHtml(s.label || 'Screw') + '</span><br>Pos: (' + (s.x || 0) + ', ' + (s.y || 0) + ')</div>';
          });
          html += '</div></div>';
        }
        if (model.components && model.components.length) {
          html += '<div class="stat-card"><h4 class="font-semibold text-forest-deep mb-2">Components (' + model.components.length + ')</h4>';
          html += '<div class="grid grid-cols-2 md:grid-cols-3 gap-2">';
          model.components.slice(0, 12).forEach(function (c) {
            html += '<div class="text-xs bg-surface-container-high/60 rounded-lg p-2"><span class="font-semibold">' + escapeHtml(c.label || c.name || 'Component') + '</span><br>Pos: (' + (c.x || 0) + ', ' + (c.y || 0) + ')</div>';
          });
          html += '</div></div>';
        }
        if (model.pryPoints && model.pryPoints.length) {
          html += '<div class="stat-card"><h4 class="font-semibold text-forest-deep mb-2">Pry Points (' + model.pryPoints.length + ')</h4>';
          html += '<div class="grid grid-cols-2 md:grid-cols-3 gap-2">';
          model.pryPoints.slice(0, 8).forEach(function (p) {
            html += '<div class="text-xs bg-surface-container-high/60 rounded-lg p-2">Pos: (' + (p.x || 0) + ', ' + (p.y || 0) + ')' + (p.direction ? ' &rarr; ' + escapeHtml(p.direction) : '') + '</div>';
          });
          html += '</div></div>';
        }
        if (!model.screws && !model.components) {
          html += '<pre class="text-xs bg-surface-container-high/60 rounded-xl p-4 overflow-auto max-h-96">' + escapeHtml(JSON.stringify(model, null, 2)) + '</pre>';
        }
        html += '</div>';
        dataDiv.innerHTML = html;
      } catch (e) { dataDiv.innerHTML = '<p class="text-red-600">Failed to load model.</p>'; }
    };
  }

  async function loadScrews() {
    let html = '<div class="flex gap-3 mb-4 items-end">';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Device Type</label><select class="form-select" id="screwDevice"><option value="laptop">Laptop</option><option value="phone">Phone</option></select></div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Assembly</label><input class="form-input" id="screwAssembly" value="bottom_panel" placeholder="bottom_panel"></div>';
    html += '<button class="btn-primary" onclick="window.loadScrewPositions()"><span class="material-symbols-outlined text-lg">screws</span> Load</button>';
    html += '</div><div id="screwData"><div class="empty-state"><span class="material-symbols-outlined">screenshot_region</span><p>Load screw positions for a device assembly.</p></div></div>';

    container.innerHTML = html;

    window.loadScrewPositions = async function () {
      var device = document.getElementById('screwDevice').value;
      var assembly = document.getElementById('screwAssembly').value.trim() || 'bottom_panel';
      var dataDiv = document.getElementById('screwData');
      dataDiv.innerHTML = '<div class="text-center py-4"><p class="text-ink-gray">Loading...</p></div>';
      try {
        var r = await fetch(API + '/api/ar/screws?deviceType=' + device + '&assembly=' + assembly);
        var data = r.ok ? await r.json() : { screws: [] };
        var screws = data.screws || [];
        if (!screws.length) {
          dataDiv.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">screenshot_region</span><p>No screw data for this assembly.</p></div>';
          return;
        }
        var html = '<div class="stat-card"><h4 class="font-semibold text-forest-deep mb-3">' + screws.length + ' Screws in ' + escapeHtml(assembly) + '</h4>';
        html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-2">';
        screws.forEach(function (s) {
          var detected = s.detected !== undefined ? (s.detected ? 'Detected' : 'Missing') : 'Unknown';
          html += '<div class="text-xs bg-surface-container-high/60 rounded-lg p-2"><span class="font-semibold">' + escapeHtml(s.label || 'Screw') + '</span><br>(' + (s.x || 0) + ', ' + (s.y || 0) + ')<br><span class="' + (detected === 'Detected' ? 'text-green-600' : 'text-ink-gray') + '">' + detected + '</span></div>';
        });
        html += '</div></div>';
        dataDiv.innerHTML = html;
      } catch (e) { dataDiv.innerHTML = '<p class="text-red-600">Failed to load.</p>'; }
    };
  }

  async function loadComponents() {
    let html = '<div class="flex gap-3 mb-4 items-end">';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Device Type</label><select class="form-select" id="compDevice"><option value="laptop">Laptop</option><option value="phone">Phone</option></select></div>';
    html += '<button class="btn-primary" onclick="window.loadComponentPositions()"><span class="material-symbols-outlined text-lg">memory</span> Load</button>';
    html += '</div><div id="componentData"><div class="empty-state"><span class="material-symbols-outlined">memory</span><p>Load component positions for a device.</p></div></div>';

    container.innerHTML = html;

    window.loadComponentPositions = async function () {
      var device = document.getElementById('compDevice').value;
      var dataDiv = document.getElementById('componentData');
      dataDiv.innerHTML = '<div class="text-center py-4"><p class="text-ink-gray">Loading...</p></div>';
      try {
        var r = await fetch(API + '/api/ar/components?deviceType=' + device);
        var data = r.ok ? await r.json() : { components: [] };
        var components = data.components || [];
        if (!components.length) {
          dataDiv.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">memory</span><p>No component data for this device.</p></div>';
          return;
        }
        var html = '<div class="stat-card"><h4 class="font-semibold text-forest-deep mb-3">' + components.length + ' Components</h4>';
        html += '<div class="grid grid-cols-2 md:grid-cols-3 gap-2">';
        components.forEach(function (c) {
          html += '<div class="text-xs bg-surface-container-high/60 rounded-lg p-2"><span class="font-semibold">' + escapeHtml(c.label || c.name || 'Component') + '</span><br>(' + (c.x || 0) + ', ' + (c.y || 0) + ')</div>';
        });
        html += '</div></div>';
        dataDiv.innerHTML = html;
      } catch (e) { dataDiv.innerHTML = '<p class="text-red-600">Failed to load.</p>'; }
    };
  }

  async function loadOverlay() {
    let html = '<div class="stat-card mb-6"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">AR Overlay Generator</h3>';
    html += '<p class="text-sm text-ink-gray mb-3">Generate a full AR overlay for a device repair step.</p>';
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Device Type</label><select class="form-select" id="arOvDevice"><option value="laptop">Laptop</option><option value="phone">Phone</option></select></div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Step</label><input class="form-input" id="arOvStep" value="1" type="number" min="1"></div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Width</label><input class="form-input" id="arOvWidth" value="640" type="number"></div>';
    html += '<div class="flex items-end"><button class="btn-primary" onclick="window.generateAROverlay()"><span class="material-symbols-outlined text-lg">view_in_ar</span> Generate</button></div>';
    html += '</div><div id="arOverlayOutput" class="hidden"><pre class="text-xs bg-surface-container-high/60 rounded-xl p-4 overflow-auto max-h-96"></pre></div></div>';

    html += '<div class="stat-card"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Screw Detection Simulator</h3>';
    html += '<p class="text-sm text-ink-gray mb-3">Simulate screw detection from camera points.</p>';
    html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Device Type</label><select class="form-select" id="detDevice"><option value="laptop">Laptop</option><option value="phone">Phone</option></select></div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Detected Points (JSON array)</label><textarea class="form-input font-mono text-xs" id="detPoints" rows="3" placeholder="[{&quot;x&quot;:100,&quot;y&quot;:200},{&quot;x&quot;:150,&quot;y&quot;:250}]"></textarea></div>';
    html += '</div><button class="btn-primary" onclick="window.detectScrews()"><span class="material-symbols-outlined text-lg">sensors</span> Detect Screws</button>';
    html += '<div id="detectOutput" class="hidden mt-3"><pre class="text-xs bg-surface-container-high/60 rounded-xl p-4 overflow-auto max-h-48"></pre></div></div>';

    container.innerHTML = html;

    window.generateAROverlay = async function () {
      var device = document.getElementById('arOvDevice').value;
      var step = document.getElementById('arOvStep').value;
      var width = document.getElementById('arOvWidth').value;
      var outDiv = document.getElementById('arOverlayOutput');
      outDiv.classList.remove('hidden');
      outDiv.querySelector('pre').textContent = 'Generating...';
      try {
        var r = await fetch(API + '/api/ar/overlay?deviceType=' + device + '&step=' + step + '&width=' + width + '&height=' + Math.round(width * 0.5625));
        var data = r.ok ? await r.json() : {};
        outDiv.querySelector('pre').textContent = JSON.stringify(data, null, 2);
      } catch (e) { outDiv.querySelector('pre').textContent = 'Failed to generate.'; }
    };

    window.detectScrews = async function () {
      var device = document.getElementById('detDevice').value;
      var pointsText = document.getElementById('detPoints').value.trim();
      var points;
      try { points = JSON.parse(pointsText || '[]'); } catch (e) { return alert('Invalid JSON'); }
      var outDiv = document.getElementById('detectOutput');
      outDiv.classList.remove('hidden');
      outDiv.querySelector('pre').textContent = 'Detecting...';
      try {
        var r = await fetch(API + '/api/ar/detect-screws', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceType: device, detectedPoints: points })
        });
        var data = r.ok ? await r.json() : {};
        outDiv.querySelector('pre').textContent = JSON.stringify(data, null, 2);
      } catch (e) { outDiv.querySelector('pre').textContent = 'Detection failed.'; }
    };
  }

  setupTabs();
  loadTab('model');
})();
