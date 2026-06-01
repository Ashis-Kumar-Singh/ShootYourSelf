(function () {
  var API_BASE = window.location.origin;

  function isOnline() {
    return navigator.onLine !== false;
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function retryWithBackoff(fn, maxRetries, initialDelay) {
    maxRetries = maxRetries || 2;
    initialDelay = initialDelay || 1000;
    return attempt(1);

    function attempt(retryCount) {
      return fn().catch(function (err) {
        if (retryCount > maxRetries || !isOnline()) throw err;
        var wait = initialDelay * Math.pow(2, retryCount - 1) + Math.random() * 500;
        return delay(Math.min(wait, 8000)).then(function () {
          return attempt(retryCount + 1);
        });
      });
    }
  }

  function apiFetch(path, options) {
    if (!isOnline()) {
      return Promise.reject(new Error('You appear to be offline.'));
    }
    options = options || {};
    var url = API_BASE + path;
    return fetch(url, options).then(function (response) {
      if (!response.ok) {
        return response.json().then(function (data) {
          var err = new Error(data.error || 'Request failed with status ' + response.status);
          err.status = response.status;
          throw err;
        }).catch(function (e) {
          if (e instanceof SyntaxError) {
            var err = new Error('Request failed with status ' + response.status);
            err.status = response.status;
            throw err;
          }
          throw e;
        });
      }
      return response.json();
    });
  }

  function getJSON(path) {
    return apiFetch(path, { headers: { 'Accept': 'application/json' } });
  }

  function postJSON(path, data) {
    return apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  window.API = {
    isOnline: isOnline,

    config: {
      get: function () {
        return getJSON('/api/config');
      },
    },

    devices: {
      get: function () {
        return getJSON('/api/devices');
      },
      getCategories: function (deviceId) {
        return getJSON('/api/categories?device=' + encodeURIComponent(deviceId || 'laptop'));
      },
    },

    search: {
      run: function (device, brand, model, category, context) {
        var url = '/api/model-search?device=' + encodeURIComponent(device || 'laptop') +
          '&brand=' + encodeURIComponent(brand || '') +
          '&model=' + encodeURIComponent(model || '') +
          '&category=' + encodeURIComponent(category || 'troubleshooting') +
          '&context=' + encodeURIComponent(context || '');
        return retryWithBackoff(function () { return getJSON(url); }, 1, 1500);
      },
      upvote: function (link) {
        return retryWithBackoff(function () { return postJSON('/api/upvote', { link: link }); }, 1, 1000);
      },
      extractContent: function (url) {
        return postJSON('/api/extract-content', { url: url });
      },
    },

    sessions: {
      create: function (device, brand, model, category) {
        return postJSON('/api/sessions', { device: device, brand: brand, model: model, category: category });
      },
      addStep: function (sessionId, stepType, stepData) {
        return postJSON('/api/sessions/' + encodeURIComponent(sessionId) + '/steps', { stepType: stepType, stepData: stepData });
      },
      complete: function (sessionId, outcome, data) {
        return postJSON('/api/sessions/' + encodeURIComponent(sessionId) + '/complete', Object.assign({ outcome: outcome || 'fixed' }, data || {}));
      },
    },

    feedback: {
      send: function (issueId, helpful, device, brand, model, category) {
        return postJSON('/api/feedback', { issueId: issueId, helpful: helpful, device: device, brand: brand, model: model, category: category });
      },
    },

    popular: {
      get: function () {
        return getJSON('/api/popular');
      },
    },
  };
})();
