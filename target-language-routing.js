(function () {
  'use strict';

  var key = 'talktag.targetLanguage';
  var path = window.location.pathname;
  var isHome = path === '/' || /\/index\.html$/.test(path);
  var saved;
  try { saved = window.localStorage.getItem(key); } catch (_) { saved = null; }

  // Only the entry page makes an automatic choice. Explicit page URLs and
  // section links must remain stable, including links shared by other people.
  if (isHome && !window.location.search && !window.location.hash) {
    var preferred = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    var target = saved === 'english' || saved === 'korean'
      ? saved
      : /^ko(?:-|$)/i.test(preferred) ? 'english' : 'korean';
    if (target === 'english') window.location.replace('/E-english.html');
  }

  function remember(event) {
    var link = event.target.closest('a[data-target-language], .language-switch a');
    if (!link) return;
    var target = link.getAttribute('data-target-language');
    if (!target && link.closest('.language-switch')) {
      var destination = new URL(link.href, window.location.href);
      if (/\/E-english\.html$/.test(destination.pathname)) target = 'english';
      else if (destination.pathname === '/') target = 'korean';
    }
    if (target !== 'english' && target !== 'korean') return;
    try { window.localStorage.setItem(key, target); } catch (_) { /* Navigation still works. */ }
  }
  document.addEventListener('click', remember);
})();
