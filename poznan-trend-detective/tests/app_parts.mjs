#!/usr/bin/env node
// Checks of the app's core parts (web/app/*.js) and style parts (web/css/*.css). No dependencies.
//
// The core used to be one file (web/app.js, one IIFE). It is now split into plain scripts that index.html loads in
// order and that share the page's global scope. That keeps every name visible to every part, but it brings rules
// that the old single file enforced by itself:
//   1. each part is a valid classic script (no `return` outside a function: inside the IIFE that was legal);
//   2. no top-level name is declared twice across the parts (a duplicate const stops a whole part from loading,
//      a duplicate function silently replaces the earlier one);
//   3. no top-level name takes the name of a browser global, of a library (L, maplibregl) or of the inline script
//      in index.html: a part's top-level names are visible to every script of the page;
//   4. index.html loads exactly the parts in web/app/ and web/css/, in the order of their numbers;
//   5. every part starts with "use strict" and, after the first, with the stop line (see 01-helpers.js);
//   6. the extension modules in web/sarnik/ keep their code inside a function, so they add no global names.
// Usage: node poznan-trend-detective/tests/app_parts.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "web");
const errors = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); };
const list = (dir, ext) => fs.readdirSync(path.join(web, dir)).filter((f) => new RegExp(`^\\d\\d[a-z]?-[a-z0-9-]+\\.${ext}$`).test(f)).sort();

const js = list("app", "js"), css = list("css", "css");
ok(js.length > 1, "no parts in web/app/");
ok(css.length > 1, "no parts in web/css/");
ok(!fs.existsSync(path.join(web, "app.js")), "web/app.js is back: the core lives in web/app/ (see web/app/README.md)");
ok(!fs.existsSync(path.join(web, "styles.css")), "web/styles.css is back: the styles live in web/css/ (see web/css/README.md)");

// 4. index.html loads exactly these files, in order
const html = fs.readFileSync(path.join(web, "index.html"), "utf8");
const tagsJs = [...html.matchAll(/<script src="app\/([^"?]+)\?v=\d+"><\/script>/g)].map((m) => m[1]);
const tagsCss = [...html.matchAll(/<link rel="stylesheet" href="css\/([^"?]+)\?v=\d+">/g)].map((m) => m[1]);
ok(JSON.stringify(tagsJs) === JSON.stringify(js), `index.html must load web/app/ parts in order:\n  html:  ${tagsJs.join(" ")}\n  files: ${js.join(" ")}`);
ok(JSON.stringify(tagsCss) === JSON.stringify(css), `index.html must load web/css/ parts in order:\n  html:  ${tagsCss.join(" ")}\n  files: ${css.join(" ")}`);
ok(!/\b(async|defer)\b[^>]*src="app\//.test(html) && !/src="app\/[^"]*"[^>]*\b(async|defer|type="module")/.test(html), "core parts must be plain, ordered scripts (no async, defer or type=module)");

// 1, 5. every part on its own, as the browser compiles it
const STOP = "if (window.SARNIK_STOP) throw window.SARNIK_STOP;";
const src = js.map((f) => fs.readFileSync(path.join(web, "app", f), "utf8"));
js.forEach((f, i) => {
  try { new vm.Script(src[i], { filename: f }); } catch (e) { errors.push(`${f}: not a valid browser script: ${e.message}`); }
  const code = src[i].replace(/^\s*\/\*[\s\S]*?\*\//, "").split("\n").filter((l) => l.trim() && !/^\s*\/\//.test(l));
  ok(code[0] === '"use strict";', `${f}: the first statement must be "use strict";`);
  if (i > 0) ok(code[1] && code[1].startsWith(STOP), `${f}: the second line must be the stop line (${STOP} ...)`);
});

// 2. all parts as one script: a name declared twice with const/let/class (or once as a function) does not compile
try { new vm.Script(src.join("\n;\n"), { filename: "all parts" }); } catch (e) { errors.push(`the parts together: ${e.message} (a top-level name is declared in two parts)`); }

// top-level names (two-space indent: the parts keep the indent of the old IIFE body)
const names = new Map();
const addName = (n, f) => { if (!names.has(n)) names.set(n, []); names.get(n).push(f); };
js.forEach((f, i) => {
  for (const line of src[i].split("\n")) {
    let m = line.match(/^ {2}(?:async\s+)?function\s*\*?\s*([\w$]+)\s*\(/) || line.match(/^ {2}class\s+([\w$]+)/);
    if (m) { addName(m[1], f); continue; }
    m = line.match(/^ {2}(?:const|let|var)\s+(.*)$/);
    if (!m) continue;
    // declarators at bracket depth 0, up to the first `=` of each
    let depth = 0, seg = "", segs = [];
    for (const ch of m[1].replace(/\s\/\/.*$/, "")) { // without a trailing comment; stop at the end of the statement
      if ("([{".includes(ch)) depth++;
      if (")]}".includes(ch)) depth--;
      if (ch === ";" && depth === 0) break;
      if (ch === "," && depth === 0) { segs.push(seg); seg = ""; } else seg += ch;
    }
    segs.push(seg);
    for (const s of segs) {
      const lhs = s.split("=")[0].trim();
      if (/^[\[{]/.test(lhs)) (lhs.match(/[\w$]+/g) || []).forEach((n) => addName(n, f));
      else { const id = lhs.match(/^[\w$]+/); if (id) addName(id[0], f); }
    }
  }
});
for (const [n, fs_] of names) if (new Set(fs_).size > 1) errors.push(`${n} is declared at top level in ${[...new Set(fs_)].join(" and ")}`);

// 3. names the page's other scripts or the browser own
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].flatMap((m) => [...m[1].matchAll(/\b(?:var|let|const|function)\s+([\w$]+)/g)].map((x) => x[1]));
const RESERVED = new Set([...inline, "window", "self", "document", "location", "top", "parent", "frames", "opener", "name", "status",
  "history", "navigator", "screen", "event", "origin", "length", "closed", "external", "performance", "crypto", "caches",
  "localStorage", "sessionStorage", "indexedDB", "open", "close", "stop", "print", "find", "focus", "blur", "alert", "confirm",
  "prompt", "postMessage", "scroll", "scrollTo", "scrollBy", "fetch", "Image", "Map", "Set", "WeakMap", "URL", "Node", "Text",
  "Element", "Event", "Option", "Audio", "Range", "Selection", "File", "Blob", "Request", "Response", "Headers", "Worker",
  "Notification", "CSS", "requestAnimationFrame", "cancelAnimationFrame", "setTimeout", "clearTimeout", "setInterval",
  "clearInterval", "matchMedia", "getComputedStyle", "innerWidth", "innerHeight", "devicePixelRatio", "visualViewport",
  "customElements", "toolbar", "menubar", "onload", "onerror", "console", "Promise", "JSON", "Math", "Date", "Intl",
  "L", "maplibregl", "I18N", "SARNIK", "SARNIK_MODULES", "SARNIK_STOP"]);
for (const n of names.keys()) ok(!RESERVED.has(n), `top-level name ${n} (${names.get(n)[0]}) is a browser, library or page global: rename it`);

// 6. extension modules: code inside a function, nothing declared at the top of the file
const sk = path.join(web, "sarnik");
if (fs.existsSync(sk)) for (const f of fs.readdirSync(sk).filter((x) => x.endsWith(".js"))) {
  const t = fs.readFileSync(path.join(sk, f), "utf8");
  const top = t.split("\n").filter((l) => /^(?:const|let|var|function|async function|class)\s/.test(l));
  ok(!top.length, `web/sarnik/${f}: declares top-level names (${top.map((l) => l.slice(0, 40)).join("; ")}): wrap the module in (function () { ... })();`);
}

// CSS parts are plain files; check they are not empty
css.forEach((f) => ok(fs.readFileSync(path.join(web, "css", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").trim().length > 0, `${f}: no rules`));

if (errors.length) { errors.forEach((e) => console.log("FAIL " + e)); process.exit(1); }
console.log(`OK   ${js.length} core parts and ${css.length} style parts: valid scripts, loaded in order, ${names.size} top-level names, none twice, none reserved`);
