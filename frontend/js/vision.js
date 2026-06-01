(function () {
  const API = window.location.origin;
  const container = document.getElementById('visionContent');
  let currentTab = 'analyze';

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
      case 'analyze': loadAnalyze(); break;
      case 'capabilities': loadCapabilities(); break;
      case 'overlay': loadOverlay(); break;
      default: loadAnalyze();
    }
  }

  async function loadCapabilities() {
    try {
      const res = await fetch(API + '/api/vision/capabilities');
      const caps = res.ok ? await res.json() : {};

      let html = '<div class="stat-card mb-6"><h3 class="font-headline text-lg font-bold text-forest-deep mb-2">Detection Capabilities</h3>';
      html += '<p class="text-sm text-ink-gray mb-4">The visual diagnosis engine can detect the following hardware issues:</p>';

      const features = caps.features || caps.capabilities || [];
      if (features.length) {
        html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">';
        features.forEach(function (f) {
          const name = typeof f === 'string' ? f : (f.name || f.label || 'Unknown');
          html += '<div class="data-card flex items-center gap-2"><span class="material-symbols-outlined text-forest-deep">check_circle</span><span>' + escapeHtml(name) + '</span></div>';
        });
        html += '</div>';
      } else {
        html += '<p class="text-ink-gray">No capabilities loaded.</p>';
      }
      html += '</div>';

      if (caps.models) {
        html += '<div class="stat-card"><h3 class="font-headline text-lg font-bold text-forest-deep mb-2">AI Models</h3><div class="space-y-2">';
        Object.entries(caps.models).forEach(function (_a) {
          var key = _a[0], val = _a[1];
          html += '<div class="flex items-center gap-2 text-sm"><span class="material-symbols-outlined text-forest-deep text-lg">model_training</span><span class="font-semibold">' + escapeHtml(key) + '</span><span class="text-ink-gray">' + escapeHtml(typeof val === 'string' ? val : JSON.stringify(val)) + '</span></div>';
        });
        html += '</div></div>';
      }

      container.innerHTML = html;
    } catch (e) {
      showError('Failed to load capabilities.');
    }
  }

  async function loadAnalyze() {
    let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">';

    html += '<div class="stat-card"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Upload Image</h3>';
    html += '<p class="text-sm text-ink-gray mb-3">Upload a photo of the damaged hardware for AI analysis.</p>';
    html += '<div class="border-2 border-dashed border-outline-variant/40 rounded-xl p-8 text-center cursor-pointer hover:border-forest-deep/40 transition-all" id="dropZone" onclick="document.getElementById(\'imageInput\').click()">';
    html += '<span class="material-symbols-outlined text-4xl text-outline-variant">image</span>';
    html += '<p class="text-sm text-ink-gray mt-2">Click to upload or drag & drop</p>';
    html += '<p class="text-xs text-ink-gray/60 mt-1">JPEG, PNG (max 10MB)</p>';
    html += '<input type="file" id="imageInput" accept="image/*" class="hidden" onchange="window.handleImageUpload(event)">';
    html += '</div>';
    html += '<div id="previewArea" class="mt-3 hidden"><img id="previewImg" class="w-full rounded-xl max-h-64 object-contain bg-surface-container-high"><div class="flex gap-2 mt-2"><button class="btn-primary" onclick="window.analyzeUploadedImage()"><span class="material-symbols-outlined text-lg">search</span> Analyze</button><button class="btn-secondary" onclick="window.clearImage()">Clear</button></div></div>';
    html += '</div>';

    html += '<div class="stat-card"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Analyze from URL</h3>';
    html += '<p class="text-sm text-ink-gray mb-3">Or provide a URL to an image of the hardware.</p>';
    html += '<div class="flex gap-2"><input class="form-input" id="imageUrl" placeholder="https://example.com/photo.jpg"><button class="btn-primary" onclick="window.analyzeUrlImage()"><span class="material-symbols-outlined text-lg">link</span> Analyze</button></div>';
    html += '</div>';

    html += '</div>';

    html += '<div id="analysisResults" class="mt-6 hidden"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Analysis Results</h3><div class="space-y-2" id="analysisList"></div></div>';

    container.innerHTML = html;

    var dropZone = document.getElementById('dropZone');
    if (dropZone) {
      dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('border-forest-deep'); });
      dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('border-forest-deep'); });
      dropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropZone.classList.remove('border-forest-deep');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
      });
    }

    window.handleImageUpload = function (event) {
      if (event.target.files.length) handleFile(event.target.files[0]);
    };

    function handleFile(file) {
      if (!file.type.startsWith('image/')) return alert('Please select an image file');
      if (file.size > 10 * 1024 * 1024) return alert('Image too large (max 10MB)');
      var reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('previewArea').classList.remove('hidden');
        window._uploadedBase64 = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    window.clearImage = function () {
      document.getElementById('previewArea').classList.add('hidden');
      document.getElementById('imageInput').value = '';
      window._uploadedBase64 = null;
    };

    window.analyzeUploadedImage = async function () {
      var data = window._uploadedBase64;
      if (!data) return alert('Upload an image first');
      var resultsDiv = document.getElementById('analysisResults');
      var list = document.getElementById('analysisList');
      resultsDiv.classList.remove('hidden');
      list.innerHTML = '<div class="text-center py-4"><p class="text-ink-gray">Analyzing image...</p></div>';
      try {
        var r = await fetch(API + '/api/vision/analyze', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: data.split(',')[1] || data, mimeType: data.includes('png') ? 'image/png' : 'image/jpeg' })
        });
        var result = r.ok ? await r.json() : { error: 'Analysis failed' };
        renderAnalysis(result, list);
      } catch (e) { list.innerHTML = '<p class="text-red-600">Error analyzing image.</p>'; }
    };

    window.analyzeUrlImage = async function () {
      var url = document.getElementById('imageUrl').value.trim();
      if (!url) return alert('Enter an image URL');
      var resultsDiv = document.getElementById('analysisResults');
      var list = document.getElementById('analysisList');
      resultsDiv.classList.remove('hidden');
      list.innerHTML = '<div class="text-center py-4"><p class="text-ink-gray">Fetching and analyzing image...</p></div>';
      try {
        var r = await fetch(API + '/api/vision/analyze-url', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url })
        });
        var result = r.ok ? await r.json() : { error: 'Analysis failed' };
        renderAnalysis(result, list);
      } catch (e) { list.innerHTML = '<p class="text-red-600">Error analyzing image.</p>'; }
    };

    function renderAnalysis(result, list) {
      var detections = result.detections || result.results || [];
      if (typeof detections === 'object' && !Array.isArray(detections)) {
        detections = [detections];
      }
      if (result.error) {
        list.innerHTML = '<p class="text-red-600">' + escapeHtml(result.error) + '</p>';
        return;
      }
      if (!detections.length) {
        list.innerHTML = '<div class="data-card"><p>No issues detected in the image.</p></div>';
        return;
      }
      var html = '';
      detections.forEach(function (d) {
        var label = d.label || d.type || d.name || 'Issue';
        var confidence = d.confidence || d.score || 0;
        var confClass = confidence >= 70 ? 'badge-green' : confidence >= 40 ? 'badge-orange' : 'badge-red';
        html += '<div class="data-card"><div class="flex justify-between items-center"><div class="data-card-title">' + escapeHtml(label) + '</div><span class="badge ' + confClass + '">' + Math.round(confidence) + '%</span></div>';
        if (d.description) html += '<p class="text-sm text-ink-gray mt-1">' + escapeHtml(d.description) + '</p>';
        if (d.location) html += '<p class="text-xs text-ink-gray/60 mt-1">Location: ' + escapeHtml(JSON.stringify(d.location)) + '</p>';
        html += '</div>';
      });
      list.innerHTML = html;
    }
  }

  async function loadOverlay() {
    let html = '<div class="stat-card mb-6"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">Repair Step Overlay</h3>';
    html += '<p class="text-sm text-ink-gray mb-3">Generate visual overlay data for repair guidance.</p>';
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Step</label><input class="form-input" id="ovStep" value="1" type="number" min="1"></div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Total Steps</label><input class="form-input" id="ovTotal" value="5" type="number" min="1"></div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Path Type</label><select class="form-select" id="ovType"><option value="screw">Screw</option><option value="pry">Pry</option><option value="cable">Cable</option></select></div>';
    html += '<div class="flex items-end"><button class="btn-primary" onclick="window.generateOverlay()"><span class="material-symbols-outlined text-lg">layers</span> Generate</button></div>';
    html += '</div><div id="overlayOutput" class="hidden"><pre class="text-xs bg-surface-container-high/60 rounded-xl p-4 overflow-auto max-h-96"></pre></div></div>';

    html += '<div class="stat-card"><h3 class="font-headline text-lg font-bold text-forest-deep mb-3">AR Overlay Generator</h3>';
    html += '<p class="text-sm text-ink-gray mb-3">Generate full AR overlay for a device repair step.</p>';
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Device Type</label><select class="form-select" id="arDevice"><option value="laptop">Laptop</option><option value="phone">Phone</option></select></div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Step</label><input class="form-input" id="arStep" value="1" type="number" min="1"></div>';
    html += '<div><label class="text-xs text-ink-gray block mb-1">Width</label><input class="form-input" id="arWidth" value="640" type="number"></div>';
    html += '<div class="flex items-end"><button class="btn-primary" onclick="window.generateAROverlay()"><span class="material-symbols-outlined text-lg">view_in_ar</span> Generate</button></div>';
    html += '</div><div id="arOverlayOutput" class="hidden"><pre class="text-xs bg-surface-container-high/60 rounded-xl p-4 overflow-auto max-h-96"></pre></div></div>';

    container.innerHTML = html;

    window.generateOverlay = async function () {
      try {
        var step = document.getElementById('ovStep').value;
        var total = document.getElementById('ovTotal').value;
        var type = document.getElementById('ovType').value;
        var r = await fetch(API + '/api/vision/overlay/step?step=' + step + '&totalSteps=' + total);
        var data = r.ok ? await r.json() : {};
        var out = document.getElementById('overlayOutput');
        out.classList.remove('hidden');
        out.querySelector('pre').textContent = JSON.stringify(data, null, 2);
      } catch (e) { alert('Failed to generate'); }
    };

    window.generateAROverlay = async function () {
      try {
        var device = document.getElementById('arDevice').value;
        var step = document.getElementById('arStep').value;
        var width = document.getElementById('arWidth').value;
        var r = await fetch(API + '/api/ar/overlay?deviceType=' + device + '&step=' + step + '&width=' + width + '&height=' + Math.round(width * 0.5625));
        var data = r.ok ? await r.json() : {};
        var out = document.getElementById('arOverlayOutput');
        out.classList.remove('hidden');
        out.querySelector('pre').textContent = JSON.stringify(data, null, 2);
      } catch (e) { alert('Failed to generate'); }
    };
  }

  setupTabs();
  loadTab('analyze');
})();
