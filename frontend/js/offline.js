(function () {
  const API = window.location.origin;
  const container = document.getElementById('offlineContent');
  let currentTab = 'browse';

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
      case 'browse': loadBrowse(); break;
      case 'generate': loadGenerate(); break;
      default: loadBrowse();
    }
  }

  async function loadBrowse() {
    try {
      var r = await fetch(API + '/api/offline/packs?limit=50');
      var data = r.ok ? await r.json() : { packs: [] };
      var packs = data.packs || [];

      let html = '<div class="flex gap-3 mb-4 flex-wrap">';
      html += '<input class="form-input max-w-[200px]" id="browseDevice" placeholder="Filter by device">';
      html += '<button class="btn-primary" onclick="window.filterBrowsePacks()"><span class="material-symbols-outlined text-lg">search</span> Filter</button>';
      html += '</div>';

      if (!packs.length) {
        html += '<div class="empty-state"><span class="material-symbols-outlined">cloud_off</span><p>No offline packs yet. Generate one from the Generate tab.</p></div>';
        container.innerHTML = html;
        return;
      }

      html += '<div class="space-y-2" id="packList">';
      packs.forEach(function (p) {
        var label = [p.device, p.brand, p.model].filter(Boolean).join(' - ') || 'Unknown';
        var sizeStr = p.size ? (p.size > 1024 ? Math.round(p.size / 1024) + ' KB' : p.size + ' B') : 'Unknown size';
        html += '<div class="data-card pack-item" data-device="' + escapeHtml((p.device||'').toLowerCase()) + '">';
        html += '<div class="flex justify-between items-center">';
        html += '<div><div class="data-card-title">' + escapeHtml(label) + '</div>';
        html += '<div class="data-card-sub">' + escapeHtml(p.packType || 'all') + ' pack &middot; ' + sizeStr + ' &middot; ' + (p.entryCount || p.count || 0) + ' entries &middot; Created ' + (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '') + '</div></div>';
        html += '<div class="flex gap-2"><button class="btn-secondary text-xs" onclick="window.viewPack(\'' + escapeHtml(p.id) + '\')"><span class="material-symbols-outlined text-lg">visibility</span> View</button>';
        html += '<button class="btn-primary text-xs" onclick="window.downloadPack(\'' + escapeHtml(p.id) + '\')"><span class="material-symbols-outlined text-lg">download</span> Download</button></div>';
        html += '</div></div>';
      });
      html += '</div>';

      container.innerHTML = html;

      window.filterBrowsePacks = function () {
        var q = document.getElementById('browseDevice').value.toLowerCase();
        document.querySelectorAll('.pack-item').forEach(function (el) {
          el.style.display = q ? (el.dataset.device.includes(q) ? '' : 'none') : '';
        });
      };

      window.viewPack = async function (id) {
        try {
          var r = await fetch(API + '/api/offline/packs/' + id);
          var data = r.ok ? await r.json() : {};
          var pack = data.pack || {};
          var win = window.open('', '_blank');
          win.document.write('<html><head><title>Offline Pack - ' + escapeHtml(id) + '</title>');
          win.document.write('<style>body{font-family:monospace;font-size:12px;padding:20px;background:#f6f0e6;white-space:pre-wrap}</style></head><body>');
          win.document.write('<h2>Offline Pack: ' + escapeHtml(pack.device || '') + ' - ' + escapeHtml(pack.model || '') + '</h2>');
          win.document.write('<pre>' + escapeHtml(JSON.stringify(pack, null, 2)) + '</pre>');
          win.document.write('</body></html>');
        } catch (e) { alert('Failed to view pack'); }
      };

      window.downloadPack = async function (id) {
        try {
          var r = await fetch(API + '/api/offline/packs/' + id);
          var data = r.ok ? await r.json() : {};
          var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'offline-pack-' + id + '.json';
          a.click();
          URL.revokeObjectURL(url);
        } catch (e) { alert('Failed to download'); }
      };
    } catch (e) {
      showError('Failed to load packs.');
    }
  }

  async function loadGenerate() {
    let html = '<div class="max-w-2xl stat-card"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Generate Offline Pack</h3>';
    html += '<p class="text-sm text-ink-gray mb-3">Generate a downloadable repair pack for offline use.</p>';
    html += '<div class="space-y-3">';
    html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-3">';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Device Type *</label><input class="form-input" id="genDevice" value="laptop"></div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Brand *</label><input class="form-input" id="genBrand" placeholder="e.g. Dell"></div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Model *</label><input class="form-input" id="genModel" placeholder="e.g. XPS 13"></div>';
    html += '</div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Pack Type</label>';
    html += '<select class="form-select" id="genType"><option value="all">All</option><option value="repair_trees">Repair Trees</option><option value="guides">Guides</option><option value="common_fixes">Common Fixes</option><option value="diagnostic_flows">Diagnostic Flows</option></select></div>';
    html += '<div class="flex gap-3">';
    html += '<button class="btn-primary" onclick="window.generateSinglePack()"><span class="material-symbols-outlined text-lg">add_box</span> Generate Pack</button>';
    html += '<button class="btn-secondary" onclick="window.generateAllPacks()"><span class="material-symbols-outlined text-lg">dataset</span> Generate All</button>';
    html += '</div>';
    html += '<div id="genResult" class="hidden mt-3"></div></div></div>';

    container.innerHTML = html;

    window.generateSinglePack = async function () {
      var device = document.getElementById('genDevice').value.trim();
      var brand = document.getElementById('genBrand').value.trim();
      var model = document.getElementById('genModel').value.trim();
      var type = document.getElementById('genType').value;
      if (!device || !brand || !model) return alert('Device, brand, and model are required');
      var resultDiv = document.getElementById('genResult');
      resultDiv.classList.remove('hidden');
      resultDiv.innerHTML = '<div class="text-center py-2"><p class="text-ink-gray">Generating pack...</p></div>';
      try {
        var r = await fetch(API + '/api/offline/packs/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device: device, brand: brand, model: model, packType: type })
        });
        var data = r.ok ? await r.json() : { error: 'Generation failed' };
        if (data.pack) {
          resultDiv.innerHTML = '<p class="text-green-600">Pack generated! ID: <strong>' + escapeHtml(data.pack.id) + '</strong> &middot; ' + (data.pack.entryCount || data.pack.count || 0) + ' entries</p>';
        } else {
          resultDiv.innerHTML = '<p class="text-red-600">' + escapeHtml(data.error || 'Generation failed') + '</p>';
        }
      } catch (e) { resultDiv.innerHTML = '<p class="text-red-600">Error generating pack.</p>'; }
    };

    window.generateAllPacks = async function () {
      var device = document.getElementById('genDevice').value.trim();
      var brand = document.getElementById('genBrand').value.trim();
      var model = document.getElementById('genModel').value.trim();
      if (!device || !brand || !model) return alert('Device, brand, and model are required');
      var resultDiv = document.getElementById('genResult');
      resultDiv.classList.remove('hidden');
      resultDiv.innerHTML = '<div class="text-center py-2"><p class="text-ink-gray">Generating all packs...</p></div>';
      try {
        var r = await fetch(API + '/api/offline/packs/generate-all', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device: device, brand: brand, model: model })
        });
        var data = r.ok ? await r.json() : { error: 'Generation failed' };
        if (data.packs) {
          resultDiv.innerHTML = '<p class="text-green-600">' + data.count + ' packs generated for ' + escapeHtml(device) + ' - ' + escapeHtml(model) + '!</p>';
        } else {
          resultDiv.innerHTML = '<p class="text-red-600">' + escapeHtml(data.error || 'Generation failed') + '</p>';
        }
      } catch (e) { resultDiv.innerHTML = '<p class="text-red-600">Error generating packs.</p>'; }
    };
  }

  setupTabs();
  loadTab('browse');
})();
