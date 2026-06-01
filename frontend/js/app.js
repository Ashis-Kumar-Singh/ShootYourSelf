(function () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function (registration) {
      registration.update().catch(function () {});
    }).catch(function () {});
  }
})();
