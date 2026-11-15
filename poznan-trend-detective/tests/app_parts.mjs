#!/usr/bin/env node
// Checks of the app's core parts (web/app/*.js) and style parts (web/css/*.css).
// Needs nothing but Node: the JavaScript parser (acorn 8.14.0, MIT) is vendored in tests/vendor/.
//
// The core used to be one file (web/app.js, one IIFE). It is now split into plain scripts that index.html loads in
// order and that share the page's global scope. That keeps every name visible to every part, but brings rules that
// the single file enforced by itself (web/app/README.md):
//   1. each part is a valid classic script (no `return` outside a function: inside the IIFE that was legal);
//   2. code that runs while the parts load (top-level statements, and the functions they call, transitively) uses
//      only names declared in the same or an earlier part: a function declaration is not hoisted across files;
//   3. no top-level name is declared twice across the parts (a duplicate const stops a whole part from loading,
//      a duplicate function silently replaces the earlier one);
//   4. no top-level name takes the name of a JavaScript or browser global, of a library (L, maplibregl) or of a name
//      declared by another script of the page (inline scripts of index.html, i18n.js, i18n_sar.js, the modules);
//   5. index.html loads exactly the parts in web/app/ and web/css/, in the order of their numbers;
//   6. every part starts with "use strict" and, after the first, with the stop line (see 01-helpers.js);
//   7. the extension modules in web/sarnik/ keep their code inside a function: no global names;
//   8. no merge-conflict markers left in any part or in index.html.
// Usage: node poznan-trend-detective/tests/app_parts.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { parse } from "./vendor/acorn.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, "..", "web");
const errors = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); };
const read = (...p) => fs.readFileSync(path.join(web, ...p), "utf8");
const list = (dir, ext) => fs.readdirSync(path.join(web, dir)).filter((f) => new RegExp(`^\\d\\d[a-z]?-[a-z0-9-]+\\.${ext}$`).test(f)).sort();
const parseScript = (src, file) => {
  try { return parse(src, { ecmaVersion: "latest", sourceType: "script", locations: true }); } catch (e) { errors.push(`${file}: not a valid browser script: ${e.message}`); return null; }
};
// names a Program declares at its top level (function, class, var, let, const, with destructuring)
function declared(ast) {
  const out = [];
  const pat = (p) => {
    if (!p) return;
    if (p.type === "Identifier") out.push(p.name);
    else if (p.type === "ObjectPattern") p.properties.forEach((q) => pat(q.type === "RestElement" ? q.argument : q.value));
    else if (p.type === "ArrayPattern") p.elements.forEach(pat);
    else if (p.type === "AssignmentPattern") pat(p.left);
    else if (p.type === "RestElement") pat(p.argument);
  };
  for (const st of ast.body) {
    if (st.type === "FunctionDeclaration" || st.type === "ClassDeclaration") out.push(st.id.name);
    else if (st.type === "VariableDeclaration") st.declarations.forEach((d) => pat(d.id));
  }
  return out;
}

const js = list("app", "js"), css = list("css", "css");
ok(js.length > 1, "no parts in web/app/");
ok(css.length > 1, "no parts in web/css/");
ok(!fs.existsSync(path.join(web, "app.js")), "web/app.js is back: the core lives in web/app/ (see web/app/README.md)");
ok(!fs.existsSync(path.join(web, "styles.css")), "web/styles.css is back: the styles live in web/css/ (see web/css/README.md)");

// 5. index.html loads exactly these files, in order
const html = read("index.html");
const tagsJs = [...html.matchAll(/<script src="app\/([^"?]+)\?v=\d+"><\/script>/g)].map((m) => m[1]);
const tagsCss = [...html.matchAll(/<link rel="stylesheet" href="css\/([^"?]+)\?v=\d+">/g)].map((m) => m[1]);
ok(JSON.stringify(tagsJs) === JSON.stringify(js), `index.html must load the web/app/ parts in order:\n  html:  ${tagsJs.join(" ")}\n  files: ${js.join(" ")}`);
ok(JSON.stringify(tagsCss) === JSON.stringify(css), `index.html must load the web/css/ parts in order:\n  html:  ${tagsCss.join(" ")}\n  files: ${css.join(" ")}`);
ok(![...html.matchAll(/<script\b[^>]*src="app\/[^>]*>/g)].some((m) => /\b(async|defer|type=)/.test(m[0])), "core parts must be plain, ordered scripts (no async, defer or type=module)");

// 8. conflict markers
const MARK = /^(<{7}|={7}|>{7})( |$)/m;
for (const f of js) ok(!MARK.test(read("app", f)), `web/app/${f}: unresolved merge conflict (<<<<<<< / ======= / >>>>>>>)`);
for (const f of css) ok(!MARK.test(read("css", f)), `web/css/${f}: unresolved merge conflict (<<<<<<< / ======= / >>>>>>>)`);
ok(!MARK.test(html), "index.html: unresolved merge conflict");

// 1, 6. every part on its own, as the browser compiles it
const STOP = "if (window.SARNIK_STOP) throw window.SARNIK_STOP;";
const src = js.map((f) => read("app", f));
const asts = js.map((f, i) => parseScript(src[i], `web/app/${f}`));
js.forEach((f, i) => {
  const code = src[i].replace(/^\s*\/\*[\s\S]*?\*\//, "").split(/\r?\n/).filter((l) => l.trim() && !/^\s*\/\//.test(l));
  ok(code[0] === '"use strict";', `web/app/${f}: the first statement must be "use strict";`);
  if (i > 0) ok(code[1] && code[1].startsWith(STOP), `web/app/${f}: the second line must be the stop line (${STOP} ...)`);
});
try { new vm.Script(src.join("\n;\n"), { filename: "all parts" }); } catch (e) { errors.push(`the parts together do not compile: ${e.message}`); }

// 3. top-level names, each in one part only
const decl = new Map(); // name -> { file, idx, node }
asts.forEach((ast, idx) => {
  if (!ast) return;
  for (const st of ast.body) {
    const names = st.type === "FunctionDeclaration" || st.type === "ClassDeclaration" || st.type === "VariableDeclaration" ? declared({ body: [st] }) : [];
    for (const n of names) {
      if (decl.has(n)) errors.push(`${n} is declared at top level in web/app/${decl.get(n).file} and again in web/app/${js[idx]}`);
      else decl.set(n, { file: js[idx], idx, node: st });
    }
  }
});

// 4. names owned by JavaScript, the browser, the libraries or the page's other scripts
const others = { "index.html (inline scripts)": [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n;\n") };
for (const f of ["i18n.js", "i18n_sar.js"]) if (fs.existsSync(path.join(web, f))) others[f] = read(f);
const owned = new Map();
for (const [f, s] of Object.entries(others)) { const a = parseScript(s, f); if (a) declared(a).forEach((n) => owned.set(n, f)); }
const js_builtins = vm.runInNewContext("Object.getOwnPropertyNames(globalThis)");
const BROWSER = ["window", "self", "document", "location", "top", "parent", "frames", "frameElement", "opener", "name",
  "status", "history", "navigator", "clientInformation", "screen", "event", "origin", "length", "closed", "external",
  "performance", "crypto", "caches", "localStorage", "sessionStorage", "indexedDB", "open", "close", "stop", "print",
  "find", "focus", "blur", "alert", "confirm", "prompt", "postMessage", "scroll", "scrollTo", "scrollBy", "fetch",
  "Image", "Audio", "Option", "Node", "Text", "Comment", "Document", "Element", "Event", "Range", "Selection", "File",
  "Blob", "Request", "Response", "Headers", "Worker", "Notification", "CSS", "Animation", "History", "Location",
  "Screen", "Storage", "Touch", "Path2D", "Plugin", "chrome", "styleSheets", "getSelection", "atob", "btoa",
  "structuredClone", "queueMicrotask", "createImageBitmap", "requestAnimationFrame", "cancelAnimationFrame",
  "requestIdleCallback", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "matchMedia",
  "getComputedStyle", "innerWidth", "innerHeight", "outerWidth", "outerHeight", "scrollX", "scrollY", "pageXOffset",
  "pageYOffset", "screenX", "screenY", "devicePixelRatio", "visualViewport", "customElements", "toolbar", "menubar",
  "scrollbars", "statusbar", "locationbar", "personalbar", "isSecureContext", "crossOriginIsolated", "trustedTypes",
  "speechSynthesis", "reportError", "console", "L", "maplibregl", "I18N", "SARNIK", "SARNIK_MODULES", "SARNIK_STOP"];
const RESERVED = new Set([...js_builtins, ...BROWSER]);
// event-handler properties of window (onload, onclick...): a top-level function with that name would install a handler
const ON = /^on(abort|afterprint|animation\w+|auxclick|beforeprint|beforeunload|blur|cancel|canplay\w*|change|click|close|contextmenu|copy|cut|dblclick|device\w+|drag\w*|drop|durationchange|ended|error|focus\w*|gotpointercapture|hashchange|input|invalid|key\w+|languagechange|load\w*|lostpointercapture|message\w*|mouse\w+|offline|online|page\w+|paste|pause|play\w*|pointer\w+|popstate|progress|ratechange|rejectionhandled|reset|resize|scroll\w*|search|security\w+|seek\w+|select\w*|stalled|storage|submit|suspend|timeupdate|toggle|touch\w+|transition\w+|unhandledrejection|unload|volumechange|waiting|wheel)$/;
for (const [n, d] of decl) {
  if (RESERVED.has(n) || ON.test(n)) errors.push(`top-level name ${n} (web/app/${d.file}) is a JavaScript, browser or library global: rename it`);
  if (owned.has(n)) errors.push(`top-level name ${n} (web/app/${d.file}) is already declared by ${owned.get(n)}: rename it`);
}

// 2. load order: what runs while the parts load may only use names from the same or an earlier part
const DEFERRED = new Set(["addEventListener", "on", "once", "then", "catch", "finally", "setTimeout", "setInterval",
  "requestAnimationFrame", "requestIdleCallback", "observe"]);
function refs(node) { // identifiers a node uses when it runs (not inside functions it only creates), and the names it calls
  const acc = new Set(), calls = new Set();
  const visit = (n, how) => {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression" || n.type === "FunctionDeclaration") {
      if (how === "now") visit(n.body, null); // a callback handed to forEach, map, new Promise...: runs right away
      return;
    }
    if (n.type === "ClassDeclaration" || n.type === "ClassExpression") { visit(n.superClass, null); return; }
    if (n.type === "Identifier") { acc.add(n.name); return; }
    if (n.type === "MemberExpression") { visit(n.object, null); if (n.computed) visit(n.property, null); return; }
    if (n.type === "Property") { if (n.computed) visit(n.key, null); visit(n.value, null); return; }
    if (n.type === "CallExpression" || n.type === "NewExpression") {
      const c = n.callee;
      if (c.type === "FunctionExpression" || c.type === "ArrowFunctionExpression") visit(c.body, null);
      else visit(c, null);
      if (c.type === "Identifier") calls.add(c.name);
      const m = c.type === "MemberExpression" && !c.computed ? c.property.name : c.type === "Identifier" ? c.name : "";
      n.arguments.forEach((a) => visit(a, DEFERRED.has(m) ? null : "now"));
      return;
    }
    for (const k of Object.keys(n)) {
      if (k === "loc" || k === "start" || k === "end" || k === "type") continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach((x) => visit(x, null));
      else if (v && typeof v.type === "string") visit(v, null);
    }
  };
  visit(node, null);
  return { acc, calls };
}
function bodyOf(name) {
  const d = decl.get(name);
  if (!d) return null;
  if (d.node.type === "FunctionDeclaration") return d.node.body;
  if (d.node.type === "VariableDeclaration") {
    const v = d.node.declarations.find((x) => x.id.type === "Identifier" && x.id.name === name);
    if (v && v.init && /Function/.test(v.init.type)) return v.init.body;
  }
  return null;
}
asts.forEach((ast, idx) => {
  if (!ast) return;
  for (const st of ast.body) {
    if (st.type === "FunctionDeclaration") continue;
    if (st.type === "VariableDeclaration" && st.declarations.every((d) => d.init && /Function/.test(d.init.type))) continue;
    const seen = new Set(), stack = [{ node: st, via: [] }];
    while (stack.length) {
      const { node, via } = stack.pop();
      const { acc, calls } = refs(node);
      for (const n of acc) {
        const d = decl.get(n);
        if (d && d.idx > idx) errors.push(`web/app/${js[idx]}:${st.loc.start.line} runs while the page loads and uses ${n}, declared in the later part web/app/${d.file}${via.length ? ` (through ${via.join(" -> ")})` : ""}: call it from 32-main.js or move it earlier`);
      }
      for (const c of calls) {
        const d = decl.get(c);
        if (!d || d.idx > idx || seen.has(c)) continue;
        seen.add(c);
        const b = bodyOf(c);
        if (b) stack.push({ node: b, via: via.concat(c) });
      }
    }
  }
});

// 7. extension modules (and the contract's example module): code inside a function, no global names
const mods = [];
const sk = path.join(web, "sarnik");
if (fs.existsSync(sk)) for (const f of fs.readdirSync(sk).filter((x) => x.endsWith(".js"))) mods.push([`web/sarnik/${f}`, fs.readFileSync(path.join(sk, f), "utf8")]);
const ex = path.resolve(here, "..", "..", "docs", "planwyd", "kontrakt", "example_module.js");
if (fs.existsSync(ex)) mods.push(["docs/planwyd/kontrakt/example_module.js", fs.readFileSync(ex, "utf8")]);
for (const [f, s] of mods) {
  const a = parseScript(s, f);
  if (!a) continue;
  const bad = a.body.filter((st) => !(st.type === "ExpressionStatement" && (st.directive
    || st.expression.type === "CallExpression"
    || (st.expression.type === "UnaryExpression" && st.expression.argument.type === "CallExpression")
    || (st.expression.type === "AssignmentExpression" && st.expression.left.type === "MemberExpression"))));
  ok(!bad.length, `${f}: line ${bad.map((b) => b.loc.start.line).join(", ")} adds a global name: keep the module inside (function () { ... })(); (a manifest sets window.SARNIK_MODULES = ...)`);
}

// CSS parts: not empty
css.forEach((f) => ok(read("css", f).replace(/\/\*[\s\S]*?\*\//g, "").trim().length > 0, `web/css/${f}: no rules`));

if (errors.length) { errors.forEach((e) => console.log("FAIL " + e)); process.exit(1); }
console.log(`OK   ${js.length} core parts and ${css.length} style parts: valid scripts, loaded in order, ${decl.size} top-level names (none twice, none reserved), nothing at load uses a later part; ${mods.length} modules add no globals`);
