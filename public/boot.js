// If the app never starts, say so instead of leaving a white page. The commonest cause is GitHub Pages serving
// this repository's unbuilt source ("Deploy from a branch"), where the browser refuses to run src/main.ts.
// A file of its own, not inline, so the page's Content-Security-Policy can allow scripts from Scout alone.
// Built with textContent: the reason can carry an error message, which must never become markup.
(function () {
  function el(tag, style, text) {
    var e = document.createElement(tag);
    if (style) e.setAttribute('style', style);
    if (text) e.textContent = text;
    return e;
  }
  function fail(why) {
    if (window.__scoutBooted || document.getElementById('boot-fail')) return;
    var d = el('div', 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:#fff9db;font:18px/1.45 system-ui,sans-serif;color:#212529;text-align:center');
    d.id = 'boot-fail';
    var box = el('div', 'max-width:440px');
    var again = el('button', 'font:inherit;font-weight:800;padding:12px 22px;border-radius:16px;border:3px solid #121512;background:#2f9e44;color:#fff', 'Try again');
    again.addEventListener('click', function () { location.reload(); });
    box.append(
      el('div', 'font-size:64px', '🧭'),
      el('h1', 'margin:8px 0', 'Scout could not start'),
      el('p', '', 'Ask a grown-up to try again in a minute.'),
      el('p', 'font-size:14px;color:#495057', 'For whoever published this page: ' + why),
      again);
    d.appendChild(box);
    document.body.appendChild(d);
  }
  window.__scoutFail = fail;
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'SCRIPT') fail('the app\'s script did not load. If this is GitHub Pages, set Settings → Pages → Source to "GitHub Actions" and re-run the "Deploy to Pages" workflow; "Deploy from a branch" serves the unbuilt source.');
  }, true);
  setTimeout(function () { fail('the app did not start within 30 seconds. Check the connection, then reload.'); }, 30000);
})();
