#!/usr/bin/env node
// Keeps the ?v= numbers in web/*.html in step.
//
// Every script, stylesheet and data file is addressed with ?v=<number>, so that a new deploy is never mixed with
// files a browser still holds from the previous one. index.html also preloads six data files; a preload is only
// used when its address is exactly the one app.js fetches, and app.js takes its number from its own <script> tag.
// One number in all places is therefore required, and easy to get wrong by hand.
//
//   node tools/stamp-assets.mjs            write a new number (the current Unix time) into every ?v= of web/*.html
//   node tools/stamp-assets.mjs 1794700000 write this number instead
//   node tools/stamp-assets.mjs --check    change nothing; exit 1 if the numbers differ or a local script,
//                                          stylesheet or data preload has none
//
// Run it before `firebase deploy` (or put the --check form in CI). It needs nothing but Node.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const web = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "web");
const pages = fs.readdirSync(web).filter((f) => f.endsWith(".html")).sort();
const arg = process.argv[2];
const check = arg === "--check";
if (arg && !check && !/^\d+$/.test(arg)) { console.error("usage: stamp-assets.mjs [--check | <number>]"); process.exit(2); }

// local addresses that must carry a stamp: scripts, stylesheets and preloaded data (fonts have the version in their file name)
const REF = /\b(?:src|href)="([^"#?]+\.(?:js|css|json|geojson))(\?v=([^"]*))?"/g;
const isLocal = (url) => !/^(?:[a-z]+:)?\/\//i.test(url) && !url.startsWith("data:");

const problems = [], stamps = new Set();
for (const page of pages) {
  fs.readFileSync(path.join(web, page), "utf8").split("\n").forEach((line, i) => {
    for (const m of line.matchAll(REF)) {
      if (!isLocal(m[1])) continue;
      if (!m[2]) problems.push(`${page}:${i + 1}: ${m[1]} has no ?v= number`);
      else stamps.add(m[3]);
      if (!fs.existsSync(path.join(web, m[1]))) problems.push(`${page}:${i + 1}: ${m[1]} does not exist in web/`);
    }
  });
}

if (check) {
  if (stamps.size > 1) problems.push(`the pages carry ${stamps.size} different numbers: ${[...stamps].join(", ")}`);
  if (problems.length) { console.error("stamp check failed:\n  " + problems.join("\n  ")); process.exit(1); }
  console.log(`stamp check passed: ${pages.join(", ")} all use ?v=${[...stamps][0]}`);
  process.exit(0);
}

const stamp = arg || String(Math.floor(Date.now() / 1000));
for (const page of pages) {
  const file = path.join(web, page), before = fs.readFileSync(file, "utf8");
  const after = before.replace(REF, (whole, url) => (isLocal(url) ? whole.replace(/"[^"]*"$/, `"${url}?v=${stamp}"`) : whole));
  if (after !== before) fs.writeFileSync(file, after);
  console.log(`${page}: ${after === before ? "unchanged" : "stamped"} ?v=${stamp}`);
}
