#!/usr/bin/env node
/* Polish / English parity check for SARnik's UI strings.
 *
 *   node poznan-trend-detective/tests/i18n_parity.mjs [--strict]
 *
 * Loads web/i18n.js and web/i18n_sar.js into a sandbox with a fake `window`, then:
 *   1. compares the key sets of window.I18N.pl and window.I18N.en recursively
 *      (a key present in one language only is an ERROR; so is a string in one language
 *      and a function in the other, or arrays of different length);
 *   2. calls every function-valued string in both languages with several sets of dummy
 *      arguments (all flags on, all flags off / null, the number 1, numbers that need
 *      a Polish "few" plural) and fails on "undefined", "NaN" or "[object" in any result;
 *   3. checks that every data-i18n* key used in web/index.html resolves in both languages
 *      the way applyLang() in app.js looks it up (ui first, then the top level);
 *   4. prints WARNINGS for likely Polish plural errors (a numeral ending in 2-4, not 12-14,
 *      followed by a genitive plural such as "przelotów", "komórek", "kwadratów") and for
 *      functions whose PL and EN versions take a different number of arguments.
 * Exit code: 1 on any ERROR (and, with --strict, on any WARNING); 0 otherwise.
 * No dependencies beyond Node itself.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, "..", "web");
const strict = process.argv.includes("--strict");

const ctx = { window: {}, console };
vm.createContext(ctx);
for (const f of ["i18n.js", "i18n_sar.js"]) {
  vm.runInContext(fs.readFileSync(path.join(web, f), "utf8"), ctx, { filename: f });
}
const I = ctx.window.I18N;
if (!I || !I.pl || !I.en) { console.error("ERROR window.I18N.pl / .en not defined"); process.exit(1); }

const errors = [], warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

/* ---- dummy arguments ---- */
// A "chameleon": prints as 7, counts as 7, any property is another chameleon, and it can be called.
const FLAG_KEYS = new Set(["sig", "fsig", "wSig", "nisar", "wd", "bands", "city", "own"]);
const NULL_KEYS = new Set(["ratio", "flood", "trend"]);
function chameleon(mode, val = 7) {
  const target = function () {};
  return new Proxy(target, {
    get(_, k) {
      if (k === Symbol.toPrimitive) return (hint) => (hint === "number" ? val : String(val));
      if (k === "toString" || k === "valueOf") return () => String(val);
      if (k === "length") return 3;
      if (typeof k === "symbol") return undefined;
      if (mode === "off" && FLAG_KEYS.has(k)) return false;
      if (mode === "off" && NULL_KEYS.has(k)) return null;
      return chameleon(mode, val);
    },
    apply() { return chameleon(mode, val); },
    has() { return true; },
  });
}
// What does each parameter need to be? Probe once with tracking chameleons: a parameter whose
// properties are read (d.x, m.fmt(...)) is an object, one whose string methods are called is a string.
const STR_METHODS = new Set(Object.getOwnPropertyNames(String.prototype));
function paramKinds(fn, arity) {
  const kinds = Array.from({ length: Math.max(arity, 1) }, () => "num");
  const probe = (i) => new Proxy(function () {}, {
    get(_, k) {
      if (k === Symbol.toPrimitive) return (hint) => (hint === "number" ? 7 : "7");
      if (typeof k === "symbol" || k === "toString" || k === "valueOf") return () => "7";
      if (STR_METHODS.has(k)) { if (kinds[i] === "num") kinds[i] = "str"; return String.prototype[k].bind("Abc"); }
      kinds[i] = "obj";
      return chameleon("on");
    },
    apply() { return chameleon("on"); },
  });
  try { fn(...kinds.map((_, i) => probe(i))); } catch (e) { /* reported by the real calls */ }
  return kinds;
}
function argSets(arity, kinds) {
  const n = Math.max(arity, 1), isObj = kinds.map((k) => k === "obj");
  const fill = (v) => Array.from({ length: n }, (_, i) => (kinds[i] === "obj" ? chameleon("on", typeof v === "number" ? v : 7)
    : kinds[i] === "str" && typeof v === "number" ? `Abc ${v}` : v));
  const sets = [
    { name: "flags on", args: Array.from({ length: n }, () => chameleon("on")), nullOk: false },
    { name: "flags off", args: Array.from({ length: n }, () => chameleon("off")), nullOk: true },
    { name: "number 1", args: fill(1), nullOk: false },
    { name: "number 7", args: fill(7), nullOk: false },
    { name: "true flag", args: [...fill(7).slice(0, -1), true], nullOk: false },
    { name: "false flag", args: [...fill(7).slice(0, -1), false], nullOk: false },
  ];
  // optional trailing arguments (open, yrs, worst): pass null for the last one
  if (n > 1) sets.push({ name: "last arg null", args: [...fill(7).slice(0, -1), null], nullOk: true });
  for (const k of [2, 3, 4, 22, 23, 24]) sets.push({ name: `number ${k}`, args: fill(k), nullOk: false, plural: k });
  return sets.filter((set) => !(isObj[n - 1] && /flag|null/.test(set.name) && !/flags/.test(set.name)));
}

/* ---- output checks ---- */
function strings(v, out = []) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  else if (v != null) out.push(String(v));
  return out;
}
const GEN_PL = /(?<!\bze? )(?<![\d,.])((?:\d*[02-9])?[234]) (przelotów|komórek|kwadratów|punktów|miejsc|lat|gmin|hektarów)\b/u;
const ONE_PL = /(?<![\d,.])1 (przelotów|przeloty|komórek|komórki|kwadratów|kwadraty|punktów|miejsc|lat|lata|gmin|hektarów|rzeczy)\b/u;
const plural = new Map(); // "where: phrase" -> numbers that produced it
function checkOutput(where, set, res, lang) {
  for (const s of strings(res)) {
    if (/\bundefined\b/.test(s)) err(`${where} [${set.name}] contains "undefined": ${short(s)}`);
    if (/\bNaN\b/.test(s)) err(`${where} [${set.name}] contains "NaN": ${short(s)}`);
    if (s.includes("[object")) err(`${where} [${set.name}] contains "[object": ${short(s)}`);
    if (!set.nullOk && /\bnull\b/.test(s)) err(`${where} [${set.name}] contains "null": ${short(s)}`);
    if (lang === "pl" && set.plural) {
      const m = s.match(GEN_PL);
      if (m && !/^1[234]$/.test(m[1])) note(where, `"N ${m[2]}" where N ends in 2-4 (needs the nominative plural)`, m[1], s);
    }
    if (lang === "pl" && set.name === "number 1") {
      const m = s.match(ONE_PL);
      if (m) note(where, `"1 ${m[1]}" (needs the singular)`, "1", s);
    }
  }
}
function note(where, what, n, s) {
  const k = `${where}: ${what}`;
  if (!plural.has(k)) plural.set(k, { ns: [], ex: short(s) });
  plural.get(k).ns.push(n);
}
const short = (s) => { const t = s.replace(/\s+/g, " ").trim(); return t.length > 160 ? t.slice(0, 157) + "..." : t; };

/* ---- recursive comparison ---- */
let nKeys = 0, nFns = 0, nCalls = 0;
const kind = (v) => (Array.isArray(v) ? "array" : v === null ? "null" : typeof v);
function walk(pl, en, p) {
  const keys = new Set([...Object.keys(pl), ...Object.keys(en)]);
  for (const k of keys) {
    const where = p ? `${p}.${k}` : k;
    nKeys++;
    if (!(k in pl)) { err(`missing in PL: ${where} (EN: ${short(preview(en[k]))})`); continue; }
    if (!(k in en)) { err(`missing in EN: ${where} (PL: ${short(preview(pl[k]))})`); continue; }
    const a = pl[k], b = en[k];
    if (kind(a) !== kind(b)) { err(`type differs at ${where}: PL ${kind(a)}, EN ${kind(b)}`); continue; }
    if (Array.isArray(a)) { if (a.length !== b.length) err(`array length differs at ${where}: PL ${a.length}, EN ${b.length}`); continue; }
    if (typeof a === "function") {
      nFns++;
      if (a.length !== b.length) warn(`argument count differs at ${where}: PL ${a.length}, EN ${b.length}`);
      for (const [lang, fn] of [["pl", a], ["en", b]]) {
        for (const set of argSets(Math.max(a.length, b.length), paramKinds(fn, Math.max(a.length, b.length)))) {
          nCalls++;
          let res;
          try { res = fn(...set.args); } catch (e) { err(`${lang}.${where} [${set.name}] throws: ${e.message}`); continue; }
          checkOutput(`${lang}.${where}`, set, res, lang);
        }
      }
      continue;
    }
    if (a && typeof a === "object") { walk(a, b, where); continue; }
    if (typeof a === "string") {
      for (const [lang, s] of [["pl", a], ["en", b]]) {
        if (/\bundefined\b|\bNaN\b/.test(s)) err(`${lang}.${where} contains undefined/NaN: ${short(s)}`);
      }
      if (a.trim() === "" && b.trim() !== "" || b.trim() === "" && a.trim() !== "") err(`empty in one language only: ${where}`);
    }
  }
}
const preview = (v) => (typeof v === "function" ? v.toString() : typeof v === "string" ? JSON.stringify(v) : kind(v));
walk(I.pl, I.en, "");

/* ---- index.html keys, resolved like applyLang() ---- */
const html = fs.readFileSync(path.join(web, "index.html"), "utf8");
const used = [...html.matchAll(/data-i18n(-ph|-title|-aria)?="([^"]+)"/g)].map((m) => ({ attr: `data-i18n${m[1] || ""}`, key: m[2] }));
for (const { attr, key } of used) {
  for (const lang of ["pl", "en"]) {
    const u = I[lang].ui || {}, t = I[lang];
    const v = attr === "data-i18n-title" ? u[key] : (u[key] ?? t[key]);
    if (typeof v !== "string") err(`index.html ${attr}="${key}" does not resolve to a string in ${lang.toUpperCase()} (got ${kind(v)})`);
  }
}

/* ---- report ---- */
for (const [k, { ns, ex }] of plural) warn(`Polish plural ${k}, for n = ${ns.join(", ")}; e.g. ${ex}`);
console.log(`i18n parity: ${nKeys} keys compared, ${nFns} function pairs, ${nCalls} calls, ${used.length} index.html keys`);
for (const e of errors) console.log(`ERROR   ${e}`);
for (const w of warnings) console.log(`WARNING ${w}`);
console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length || (strict && warnings.length) ? 1 : 0);
