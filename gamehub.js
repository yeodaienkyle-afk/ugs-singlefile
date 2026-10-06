/* gamehub.js - same convention as games.js, but lists whatever .html
   games are inside the gamehub/ folder of yeodaienkyle-afk/ugs-singlefile.
   Add a game: drop <name>.html into the gamehub/ folder - it shows up here. */
(function () {
  const REPO = "yeodaienkyle-afk/ugs-singlefile";
  const CDN = "https://cdn.jsdelivr.net/gh/" + REPO + "@main/";
  const FOLDER = "gamehub";
  const CACHE_KEY = "ugs-gamehub-list";
  const CACHE_MS = 60 * 60 * 1000; // 1 hour

  /* Used if the folder listing can't be fetched. Keep "credits" first. */
  const FALLBACK_FILES = ["credits"];

  const allChars = [
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  ];

  /* ---------- fetch the list of games in the gamehub/ folder ---------- */

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const c = JSON.parse(raw);
      if (c && Date.now() - c.t < CACHE_MS && Array.isArray(c.names)) return c.names;
    } catch (e) {}
    return null;
  }

  function writeCache(names) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), names: names })); } catch (e) {}
  }

  function listViaGithub() {
    return fetch("https://api.github.com/repos/" + REPO + "/contents/" + FOLDER)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (entries) {
        if (!Array.isArray(entries)) return [];
        return entries
          .filter(function (e) { return e.type === "file" && /\.html?$/i.test(e.name); })
          .map(function (e) { return e.name.replace(/\.html?$/i, ""); });
      });
  }

  function finalize(names) {
    if (!names || !names.length) return FALLBACK_FILES.slice();
    const seen = {};
    const clean = [];
    names.forEach(function (n) {
      const t = (n || "").trim();
      if (t && !seen[t.toLowerCase()]) { seen[t.toLowerCase()] = 1; clean.push(t); }
    });
    if (!clean.length) return FALLBACK_FILES.slice();
    clean.sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
    // credits always first, same convention as games.js
    const i = clean.findIndex(function (n) { return n.toLowerCase() === "credits"; });
    if (i > 0) clean.unshift(clean.splice(i, 1)[0]);
    return clean;
  }

  function loadFiles() {
    const cached = readCache();
    if (cached) return Promise.resolve(finalize(cached));
    return listViaGithub()
      .then(function (names) {
        writeCache(names);
        return finalize(names);
      })
      .catch(function () {
        // network/API failed: use a stale cache if we have one, else fallback
        const stale = (function () {
          try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const c = JSON.parse(raw);
            if (c && Array.isArray(c.names)) return c.names;
          } catch (e) {}
          return null;
        })();
        if (stale) return finalize(stale);
        return FALLBACK_FILES.slice();
      });
  }

  /* ---------- launcher (same convention as games.js: popup-safe) ---------- */

  function normalizeFileName(name) {
    if (/\.html?$/i.test(name)) return name;
    return name + ".html";
  }

  function launchGame(file) {
    const normalized = normalizeFileName(file);
    const encoded = encodeURIComponent(normalized);
    const cacheBust = Date.now();

    const sources = [
      FOLDER + "/" + encoded + "?t=" + cacheBust,
      CDN + FOLDER + "/" + encoded + "?t=" + cacheBust,
      "https://cdn.jsdelivr.net/gh/" + REPO + "/" + FOLDER + "/" + encoded + "?t=" + cacheBust,
    ];

    // Open during the click event. Opening after fetch resolves is blocked
    // by most browsers because the user gesture has already ended.
    const newWin = window.open("about:blank", "_blank");
    if (!newWin) {
      alert("Allow pop-ups for this page to open games.");
      return;
    }
    newWin.document.write("<p>Loading " + normalized.replace(/[&<>"']/g, "") + "...</p>");
    newWin.document.close();

    function trySource(i) {
      if (i >= sources.length) {
        newWin.document.open();
        newWin.document.write("<p>Couldn't load this game. Check your connection and try again.</p>");
        newWin.document.close();
        return;
      }
      fetch(sources[i])
        .then(function (response) {
          if (!response.ok) throw new Error(response.status);
          return response.text();
        })
        .then(function (text) {
          // document.write on about:blank otherwise resolves relative game
          // assets against the launcher, not the fetched game's folder.
          const gameUrl = new URL(sources[i], document.baseURI);
          const baseHref = new URL(".", gameUrl).href;
          const baseTag = '<base href="' + baseHref.replace(/&/g, "&amp;").replace(/"/g, "&quot;") + '">';
          if (!/<base\b/i.test(text)) {
            if (/<head\b[^>]*>/i.test(text)) {
              text = text.replace(/<head\b[^>]*>/i, function (head) { return head + baseTag; });
            } else if (/<html\b[^>]*>/i.test(text)) {
              text = text.replace(/<html\b[^>]*>/i, function (html) { return html + "<head>" + baseTag + "</head>"; });
            } else {
              text = "<head>" + baseTag + "</head>" + text;
            }
          }
          newWin.document.open();
          newWin.document.write(text);
          newWin.document.close();
        })
        .catch(function () { trySource(i + 1); });
    }
    trySource(0);
  }

  /* ---------- rendering (same convention as games.js) ---------- */

  function render(files) {
    const filesByChar = {};
    allChars.forEach(function (char) { filesByChar[char] = []; });

    files.forEach(function (file) {
      const lower = file.toLowerCase();
      // Credits always appears as the very first button (top of the "0" section)
      if (lower === "credits") {
        filesByChar["0"].unshift(file);
        return;
      }
      const base = lower.startsWith("cl") ? lower.substring(2) : lower;
      if (base.length > 0) {
        const lead = (base[0].normalize("NFD").replace(/\p{M}/gu, "")[0]) || base[0];
        const firstChar = lead.toUpperCase();
        if (filesByChar[firstChar]) filesByChar[firstChar].push(file);
      }
    });

    const container = document.getElementById("sections-container");
    allChars.forEach(function (char) {
      const section = document.createElement("div");
      section.className = "letter-section";
      section.id = "section-" + char;

      const header = document.createElement("div");
      header.className = "letter-header";
      header.textContent = char;
      section.appendChild(header);

      const buttonsContainer = document.createElement("div");
      buttonsContainer.className = "buttons-container";

      if (filesByChar[char].length > 0) {
        filesByChar[char].forEach(function (file) {
          const btn = document.createElement("input");
          btn.type = "button";
          btn.value = file;
          btn.onclick = function () { launchGame(file); };
          buttonsContainer.appendChild(btn);
        });
      } else {
        section.className = "letter-section empty";
        const emptyMsg = document.createElement("div");
        emptyMsg.className = "empty-message";
        emptyMsg.textContent = "no games here yet";
        buttonsContainer.appendChild(emptyMsg);
      }

      section.appendChild(buttonsContainer);
      container.appendChild(section);
    });

    // sidebar letter buttons, same convention as games.js
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
      allChars.forEach(function (char) {
        const btn = document.createElement("button");
        btn.className = "sidebar-btn" + (filesByChar[char].length === 0 ? " empty" : "");
        btn.textContent = char;
        if (filesByChar[char].length === 0) {
          btn.disabled = true;
        } else {
          btn.onclick = function () {
            const target = document.getElementById("section-" + char);
            if (target) target.scrollIntoView({ behavior: "smooth" });
          };
        }
        sidebar.appendChild(btn);
      });
    }

    const lol = document.getElementById("lolbutton");
    if (lol) lol.remove();
  }

  function init() {
    const container = document.getElementById("sections-container");
    if (!container) return;
    loadFiles()
      .then(render)
      .catch(function () { render(FALLBACK_FILES.slice()); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
