import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("new.html", "utf8");
const games = fs.readFileSync("games.js", "utf8");

new vm.Script(games, { filename: "games.js" });

const scriptTag = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
let match;
let inlineCount = 0;
while ((match = scriptTag.exec(html))) {
  if (/\bsrc\s*=/.test(match[1])) continue;
  const code = match[2].trim();
  if (!code) continue;
  try {
    new vm.Script(code, { filename: "new.html:inline-script-" + (++inlineCount) });
  } catch (error) {
    console.error("Inline script syntax error:", error.message);
    process.exitCode = 1;
    break;
  }
}
if (!inlineCount) {
  console.error("No inline scripts were validated; the HTML script extractor may be broken.");
  process.exitCode = 1;
}

const checks = [
  ["popup overlay preserves existing page content", html.includes("Do not replace content already written")],
  ["custom favicon settings are supported", games.includes("function getDisguiseSettings()") && games.includes('parsed.protocol === "https:" || parsed.protocol === "http:"')],
  ["game fetch has a timeout", games.includes("setTimeout(() => fetchAbort.abort(), 8000)")],
  ["search has an accessible label", html.includes('aria-label="Search games"')],
  ["native cursor is preserved", !html.includes("cursor:none!important")],
  ["reduced-motion support exists", html.includes("prefers-reduced-motion:reduce")],
  ["nav cards are keyboard focusable", (html.match(/class="nav-card" role="button" tabindex="0"/g) || []).length >= 3]
];
for (const [label, ok] of checks) {
  console.log((ok ? "PASS " : "FAIL ") + label);
  if (!ok) process.exitCode = 1;
}
console.log("Validated " + inlineCount + " inline script blocks plus games.js syntax.");
