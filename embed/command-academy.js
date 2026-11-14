/*
 * Command Academy embed loader.
 * Put <div id="command-academy"></div> and this script on a page.
 * The loader injects the stylesheet and application bundle from this GitHub Pages site.
 */
(function () {
  'use strict';
  const loader = document.currentScript;
  if (!loader) return;
  const rootUrl = new URL('../', loader.src);
  const targetSelector = loader.getAttribute('data-target') || '#command-academy';
  let target = document.querySelector(targetSelector);
  if (!target) {
    target = document.createElement('div');
    target.id = 'command-academy';
    (document.body || document.documentElement).appendChild(target);
  }
  const stylesheetUrl = new URL('assets/css/command-academy.css', rootUrl).href;
  if (!document.querySelector('link[data-command-academy-css]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = stylesheetUrl;
    link.setAttribute('data-command-academy-css', 'true');
    document.head.appendChild(link);
  }
  const bundleUrl = new URL('assets/js/app.js', rootUrl).href;
  const start = () => {
    if (!window.CommandAcademy) {
      target.textContent = 'Command Academy failed to initialize: application bundle not found.';
      return;
    }
    window.CommandAcademy.mount(target, rootUrl, { platform: loader.dataset.platform || 'linux' });
  };
  if (window.CommandAcademy) {
    start();
  } else {
    const script = document.createElement('script');
    script.src = bundleUrl;
    script.onload = start;
    script.onerror = () => { target.textContent = 'Command Academy could not load its JavaScript bundle.'; };
    document.head.appendChild(script);
  }
})();
