/* FixItSelf shared chrome: theme + sidebar + nav highlight */
(function () {
  'use strict';

  var html = document.documentElement;
  var STORAGE_KEY = 'fixitself.theme';

  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function setStored(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) {}
  }

  function applyTheme(isDark) {
    if (isDark) {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
    }
    var toggle = document.getElementById('darkModeToggle');
    if (toggle) {
      var icon = toggle.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
      toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    }
  }

  function initTheme() {
    var stored = getStored();
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored ? stored === 'dark' : prefersDark;
    applyTheme(isDark);

    var toggle = document.getElementById('darkModeToggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var next = !html.classList.contains('dark');
        applyTheme(next);
        setStored(next ? 'dark' : 'light');
      });
    }

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!getStored()) applyTheme(e.matches);
      });
    }
  }

  function initSidebar() {
    var toggle = document.getElementById('sidebarToggle');
    var sidebar = document.getElementById('appSidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (!toggle || !sidebar || !overlay) return;

    function close() {
      sidebar.classList.remove('is-open');
      overlay.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
    function open() {
      sidebar.classList.add('is-open');
      overlay.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    toggle.addEventListener('click', function () {
      if (sidebar.classList.contains('is-open')) close(); else open();
    });
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('is-open')) close();
    });
  }

  function highlightNav() {
    var path = window.location.pathname;
    var file = path.split('/').pop() || 'index.html';
    if (path === '/' || file === '') file = 'index.html';

    var primaryLinks = document.querySelectorAll('[data-nav] a');
    primaryLinks.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      var hrefFile = href.split('/').pop();
      if (hrefFile === file || (file === 'index.html' && (href === '/' || href === 'index.html'))) {
        a.classList.add('is-active');
      }
    });

    var sidebarLinks = document.querySelectorAll('#appSidebar a[href]');
    sidebarLinks.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      var hrefFile = href.split('/').pop();
      if (hrefFile === file || (file === 'index.html' && (href === '/' || href === 'index.html'))) {
        a.classList.add('is-active');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initTheme();
      initSidebar();
      highlightNav();
    });
  } else {
    initTheme();
    initSidebar();
    highlightNav();
  }
})();
