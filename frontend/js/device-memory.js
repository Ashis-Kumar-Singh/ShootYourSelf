(function () {
  const API = window.location.origin;
  const container = document.getElementById('deviceMemoryContent');
  let currentTab = 'profiles';

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
      case 'profiles': loadProfiles(); break;
      case 'create': loadCreate(); break;
      case 'predictions': loadPredictions(); break;
      default: loadProfiles();
    }
  }

  async function loadProfiles() {
    try {
      var r = await fetch(API + '/api/devices/profiles?limit=50');
      var data = r.ok ? await r.json() : { profiles: [] };
      var profiles = data.profiles || [];

      let html = '<div class="mb-4"><input class="form-input max-w-xs" id="profileSearch" placeholder="Search profiles..." oninput="window.filterProfiles()"></div>';

      if (!profiles.length) {
        html += '<div class="empty-state"><span class="material-symbols-outlined">memory</span><p>No device profiles yet. Create one to start tracking device history.</p></div>';
        container.innerHTML = html;
        return;
      }

      html += '<div class="space-y-2" id="profileList">';
      profiles.forEach(function (p) {
        var label = [p.device, p.brand, p.model].filter(Boolean).join(' - ') || 'Unknown Device';
        html += '<div class="data-card profile-item" data-search="' + escapeHtml(label.toLowerCase()) + '">';
        html += '<div class="flex justify-between items-start cursor-pointer" onclick="window.toggleProfileDetails(\'' + escapeHtml(p.id) + '\')">';
        html += '<div><div class="data-card-title">' + escapeHtml(label) + '</div><div class="data-card-sub">' + (p.serialNumber ? 'SN: ' + escapeHtml(p.serialNumber) : 'No serial') + ' &middot; ' + (p.componentCount || 0) + ' components</div></div>';
        html += '<span class="material-symbols-outlined text-ink-gray" id="expandIcon-' + escapeHtml(p.id) + '">expand_more</span>';
        html += '</div>';
        html += '<div id="profileDetail-' + escapeHtml(p.id) + '" class="hidden mt-3 pt-3 border-t border-outline-variant/10"></div>';
        html += '</div>';
      });
      html += '</div>';

      container.innerHTML = html;

      window.filterProfiles = function () {
        var q = document.getElementById('profileSearch').value.toLowerCase();
        document.querySelectorAll('.profile-item').forEach(function (el) {
          el.style.display = q ? (el.dataset.search.includes(q) ? '' : 'none') : '';
        });
      };

      window.toggleProfileDetails = async function (id) {
        var detailDiv = document.getElementById('profileDetail-' + id);
        var icon = document.getElementById('expandIcon-' + id);
        if (!detailDiv.classList.contains('hidden')) {
          detailDiv.classList.add('hidden');
          icon.textContent = 'expand_more';
          return;
        }
        if (detailDiv.dataset.loaded) {
          detailDiv.classList.remove('hidden');
          icon.textContent = 'expand_less';
          return;
        }
        detailDiv.innerHTML = '<div class="text-center py-2"><p class="text-sm text-ink-gray">Loading...</p></div>';
        detailDiv.classList.remove('hidden');
        icon.textContent = 'expand_less';
        try {
          var r = await fetch(API + '/api/devices/profiles/' + id);
          var data = r.ok ? await r.json() : {};
          var summary = data.profile || data;
          var html = '';
          if (summary.components && summary.components.length) {
            html += '<p class="font-semibold text-sm mb-2">Components</p>';
            summary.components.forEach(function (c) {
              var health = c.healthPercent || 100;
              var healthClass = health >= 80 ? 'badge-green' : health >= 50 ? 'badge-orange' : 'badge-red';
              html += '<div class="flex items-center gap-2 text-sm mb-1"><span class="badge ' + healthClass + '">' + health + '%</span><span>' + escapeHtml(c.componentName || c.name || '') + '</span><span class="text-xs text-ink-gray">(' + escapeHtml(c.componentType || c.type || '') + ')</span></div>';
            });
          }
          if (summary.events && summary.events.length) {
            html += '<p class="font-semibold text-sm mt-3 mb-2">Recent Events</p>';
            summary.events.slice(-5).reverse().forEach(function (e) {
              html += '<div class="text-xs text-ink-gray mb-1"><span class="font-semibold">' + escapeHtml(e.eventType || e.type || 'Event') + '</span> &middot; ' + (e.timestamp ? new Date(e.timestamp).toLocaleDateString() : '') + '</div>';
            });
          }
          if (!html) html = '<p class="text-sm text-ink-gray">No component or event data.</p>';
          detailDiv.innerHTML = html;
          detailDiv.dataset.loaded = '1';
        } catch (e) {
          detailDiv.innerHTML = '<p class="text-sm text-red-600">Failed to load details.</p>';
        }
      };
    } catch (e) {
      showError('Failed to load profiles.');
    }
  }

  async function loadCreate() {
    let html = '<div class="max-w-2xl stat-card"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Create Device Profile</h3>';
    html += '<div class="space-y-3"><div><label class="text-xs text-ink-gray block mb-1">Device Type *</label><input class="form-input" id="cpDevice" value="laptop"></div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Brand *</label><input class="form-input" id="cpBrand" placeholder="e.g. Dell, Apple"></div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Model *</label><input class="form-input" id="cpModel" placeholder="e.g. XPS 13 9310"></div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Serial Number</label><input class="form-input" id="cpSerial" placeholder="Optional"></div>';
    html += '<button class="btn-primary" onclick="window.createProfile()"><span class="material-symbols-outlined text-lg">add_circle</span> Create Profile</button>';
    html += '<div id="cpResult" class="hidden mt-3"></div></div></div>';

    html += '<div class="max-w-2xl stat-card mt-6"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Track Component</h3>';
    html += '<p class="text-sm text-ink-gray mb-3">Add a component to an existing profile.</p>';
    html += '<div class="space-y-3"><input class="form-input" id="tcProfileId" placeholder="Profile ID *">';
    html += '<div class="grid grid-cols-2 gap-3"><input class="form-input" id="tcType" placeholder="Component type * (e.g. battery, ssd)"><input class="form-input" id="tcName" placeholder="Component name * (e.g. Samsung 980 Pro)"></div>';
    html += '<button class="btn-primary" onclick="window.trackComponent()"><span class="material-symbols-outlined text-lg">settings</span> Track Component</button></div></div>';

    container.innerHTML = html;

    window.createProfile = async function () {
      var device = document.getElementById('cpDevice').value.trim();
      var brand = document.getElementById('cpBrand').value.trim();
      var model = document.getElementById('cpModel').value.trim();
      if (!device || !brand || !model) return alert('Device, brand, and model are required');
      try {
        var r = await fetch(API + '/api/devices/profile', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device: device, brand: brand, model: model, serialNumber: document.getElementById('cpSerial').value.trim() })
        });
        var data = r.ok ? await r.json() : {};
        var out = document.getElementById('cpResult');
        out.classList.remove('hidden');
        if (data.profile) out.innerHTML = '<p class="text-green-600">Profile created! ID: <strong>' + escapeHtml(data.profile.id) + '</strong></p>';
        else out.innerHTML = '<p class="text-red-600">Failed to create profile.</p>';
      } catch (e) { alert('Error creating profile'); }
    };

    window.trackComponent = async function () {
      var pid = document.getElementById('tcProfileId').value.trim();
      var type = document.getElementById('tcType').value.trim();
      var name = document.getElementById('tcName').value.trim();
      if (!pid || !type || !name) return alert('Profile ID, component type, and component name are required');
      try {
        var r = await fetch(API + '/api/devices/profiles/' + pid + '/components', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ componentType: type, componentName: name })
        });
        if (r.ok) alert('Component tracked!');
        else { var d = await r.json(); alert(d.error || 'Failed'); }
      } catch (e) { alert('Error'); }
    };
  }

  async function loadPredictions() {
    try {
      var r = await fetch(API + '/api/devices/profiles?limit=50');
      var data = r.ok ? await r.json() : { profiles: [] };
      var profiles = data.profiles || [];

      let html = '<div class="mb-4"><label class="text-xs text-ink-gray block mb-1">Select a profile to generate predictions</label>';
      html += '<div class="flex gap-3"><select class="form-select" id="predProfile">';
      profiles.forEach(function (p) {
        var label = [p.device, p.brand, p.model].filter(Boolean).join(' - ') || p.id;
        html += '<option value="' + escapeHtml(p.id) + '">' + escapeHtml(label) + '</option>';
      });
      if (!profiles.length) html += '<option value="">No profiles available</option>';
      html += '</select><button class="btn-primary" onclick="window.generatePredictions()"><span class="material-symbols-outlined text-lg">psychology</span> Generate</button></div></div>';

      html += '<div id="predictionsResults"><div class="empty-state"><span class="material-symbols-outlined">insights</span><p>Select a profile and click Generate to see predictive failure analysis.</p></div></div>';

      container.innerHTML = html;

      window.generatePredictions = async function () {
        var pid = document.getElementById('predProfile').value;
        if (!pid) return alert('Select a profile');
        var resultsDiv = document.getElementById('predictionsResults');
        resultsDiv.innerHTML = '<div class="text-center py-4"><p class="text-ink-gray">Analyzing device data...</p></div>';
        try {
          var r = await fetch(API + '/api/devices/profiles/' + pid + '/predict', { method: 'POST' });
          var data = r.ok ? await r.json() : { predictions: [] };
          var predictions = data.predictions || [];
          if (!predictions.length) {
            resultsDiv.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">check_circle</span><p>No failure predictions generated. Add more component data first.</p></div>';
            return;
          }
          var html2 = '<div class="space-y-2">';
          predictions.forEach(function (pred) {
            var severity = pred.severity || (pred.probability > 70 ? 'high' : pred.probability > 40 ? 'medium' : 'low');
            var sevClass = severity === 'high' || severity === 'critical' ? 'badge-red' : severity === 'medium' || severity === 'warning' ? 'badge-orange' : 'badge-blue';
            html2 += '<div class="data-card"><div class="flex items-center gap-2 mb-2"><span class="badge ' + sevClass + '">' + escapeHtml(severity) + '</span><span class="text-sm font-semibold">' + (pred.probability || 0) + '% probability</span></div>';
            html2 += '<p class="text-sm">' + escapeHtml(pred.message || pred.prediction || 'Prediction') + '</p>';
            html2 += '<p class="text-xs text-ink-gray mt-1">' + escapeHtml(pred.component || '') + (pred.trend ? ' &middot; Trend: ' + escapeHtml(pred.trend) : '') + '</p>';
            html2 += '</div>';
          });
          html2 += '</div>';
          resultsDiv.innerHTML = html2;
        } catch (e) { resultsDiv.innerHTML = '<p class="text-red-600">Failed to generate predictions.</p>'; }
      };
    } catch (e) {
      showError('Failed to load predictions.');
    }
  }

  setupTabs();
  loadTab('profiles');
})();
