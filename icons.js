/* icons.js - Lucide-style icon loader for the Sx/UGS portal.
   Icons come from the portal's own backend (getPortalIcons) and are cached
   in localStorage for a day, so it's one tiny request per day per device.

   USAGE
   1. include:  <script src=".../icons.js"></script>
   2. use:      <span data-icon="trophy"></span>  (auto-replaced after load)
      or in JS:  await PortalIcons.ready();
                 el.innerHTML = PortalIcons.svg("zap", 18);
   Icons use currentColor - they inherit your CSS text color.
*/
window.PortalIcons = (function () {
  const API = "https://superagent-9b1c1681.base44.app/functions/getPortalIcons";
  const CACHE_KEY = "ugs-portal-icons";
  const CACHE_MS = 24 * 60 * 60 * 1000; // 1 day
  let icons = null;
  let loading = null;

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const c = JSON.parse(raw);
      if (c && Date.now() - c.t < CACHE_MS && c.icons && Object.keys(c.icons).length) return c.icons;
    } catch (e) {}
    return null;
  }

  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), icons: data })); } catch (e) {}
  }

  function load() {
    if (icons) return Promise.resolve(icons);
    if (loading) return loading;
    const cached = readCache();
    if (cached) {
      icons = cached;
      return Promise.resolve(icons);
    }
    loading = fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data || !data.icons) throw new Error("bad response");
        icons = data.icons;
        writeCache(icons);
        return icons;
      })
      .catch(function () {
        // offline / blocked: fall back to any stale cache we have
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) {
            const c = JSON.parse(raw);
            if (c && c.icons) { icons = c.icons; return icons; }
          }
        } catch (e) {}
        return (icons = {});
      });
    return loading;
  }

  /* get an icon as an inline svg string (size in px, extra class optional) */
  function svg(name, size, cls) {
    if (!icons || !icons[name]) return "";
    return icons[name]
      .replace('width="24" height="24"', 'width="' + (size || 24) + '" height="' + (size || 24) + '"')
      .replace("<svg ", '<svg class="' + (cls || "portal-icon") + '" ');
  }

  /* replace every [data-icon] element with its icon, portal-wide */
  function replaceAll() {
    const nodes = document.querySelectorAll("[data-icon]");
    nodes.forEach(function (el) {
      const name = (el.getAttribute("data-icon") || "").toLowerCase();
      const size = parseInt(el.getAttribute("data-icon-size") || "24", 10);
      if (name && icons && icons[name]) el.innerHTML = svg(name, size);
    });
  }

  function ready() {
    return load().then(function () { replaceAll(); return true; });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { ready(); });
  } else {
    ready();
  }

  return { ready: ready, svg: svg, replaceAll: replaceAll, load: load };
})();
