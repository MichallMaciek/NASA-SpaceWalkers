// SARnik core, part 31 of 32: search box (Nominatim).
// The parts in web/app/ are plain scripts loaded in order by index.html. Together they are the former web/app.js:
// they share one scope, so a top-level name declared in one part is visible in every other part. Rules: web/app/README.md
"use strict";
if (window.SARNIK_STOP) throw window.SARNIK_STOP; // the core stopped in part 01: Leaflet or the texts did not load
  /* ================= search ================= */
  let searchT = null, results = [], active = -1, searchNote = ""; // searchNote: one line shown when there is nothing to pick
  const VIEWBOX = "16.42,52.71,17.45,52.12";
  async function geocode(q) {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=pl&viewbox=${VIEWBOX}&bounded=1&accept-language=${lang}&q=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error("HTTP " + r.status); // 429 or a failure is not the same as "nothing found"
    return r.json();
  }
  async function reverseGeocode(lat, lng) {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (geoCache.has(key)) return geoCache.get(key);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=${lang}&lat=${lat}&lon=${lng}`);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const a = (await r.json()).address || {};
      const street = [a.road || a.pedestrian || a.hamlet || a.suburb, a.house_number].filter(Boolean).join(" ");
      const res = [street, a.city || a.town || a.village || a.municipality || ""].filter(Boolean).join(", ") || null;
      if (res) geoCache.set(key, res);
      return res;
    } catch (e) {
      const area = state.sel && state.sel.area ? state.sel.area : "Poznań";
      return `${area} (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`;
    }
  }
  function shortName(r) {
    const a = r.address || {};
    const main = [a.road || r.name, a.house_number].filter(Boolean).join(" ") || r.name || r.display_name.split(",")[0];
    return { main, sub: [a.suburb, a.city || a.town || a.village || a.municipality || ""].filter(Boolean).join(", ") };
  }
  function renderSuggest() {
    const ul = $("#suggest"), q = $("#q");
    const open = results.length > 0 || !!searchNote;
    q.setAttribute("aria-expanded", String(open));
    if (active >= 0 && results.length) q.setAttribute("aria-activedescendant", `sg-${active}`); else q.removeAttribute("aria-activedescendant");
    if (!open) { ul.hidden = true; return; }
    // nothing to pick: say so in one row instead of staying silent (no result, or the address service is down)
    ul.innerHTML = results.length
      ? results.map((r, k) => { const n = shortName(r); return `<li role="option" id="sg-${k}" data-k="${k}" aria-selected="${k === active}">${esc(n.main)}<small>${esc(n.sub)}</small></li>`; }).join("")
      : `<li class="none" role="option" aria-disabled="true" aria-selected="false">${esc(searchNote)}</li>`;
    ul.hidden = false;
    ul.querySelectorAll("li[data-k]").forEach((li) => li.addEventListener("mousedown", (e) => { e.preventDefault(); pickResult(+li.dataset.k); }));
    const cur = ul.querySelector('[aria-selected="true"]');
    if (cur) cur.scrollIntoView({ block: "nearest" });
  }
  const closeSuggest = () => { results = []; searchNote = ""; active = -1; renderSuggest(); };
  function pickResult(k) {
    const r = results[k]; if (!r) return;
    const n = shortName(r), label = n.main + (n.sub ? `, ${n.sub}` : "");
    $("#q").value = label; closeSuggest();
    selectParcelAt(+r.lat, +r.lon, { zoom: 18, label }); // the plot under the address (21a-parcels.js); none: the 1 km circle
  }
  function initSearch() {
    const q = $("#q");
    // the box and its list are one combobox for assistive technology
    q.setAttribute("role", "combobox"); q.setAttribute("aria-autocomplete", "list"); q.setAttribute("aria-controls", "suggest"); q.setAttribute("aria-expanded", "false");
    q.addEventListener("input", () => {
      clearTimeout(searchT);
      const v = q.value.trim();
      if (v.length < 3) { closeSuggest(); return; }
      searchT = setTimeout(async () => {
        let found = [], note = "";
        try { found = await geocode(v); } catch (e) { note = U().searchFail; }
        // an answer that arrives after the text changed, or after the box lost focus, must not reopen the list
        if (q.value.trim() !== v || document.activeElement !== q) return;
        // the same street often comes back several times (one row per segment): show each name once
        const seen = new Set();
        results = found.filter((r) => { const n = shortName(r), k = `${n.main}|${n.sub}`; if (seen.has(k)) return false; seen.add(k); return true; });
        searchNote = results.length ? "" : (note || U().searchNone);
        active = -1; renderSuggest();
      }, 450);
    });
    q.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { active = Math.min(results.length - 1, active + 1); renderSuggest(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { active = Math.max(0, active - 1); renderSuggest(); e.preventDefault(); }
      else if (e.key === "Enter") { if (results.length) pickResult(active < 0 ? 0 : active); e.preventDefault(); }
      // Escape closes the list and keeps what was typed (a second Escape clears the box, as usual for a search field)
      else if (e.key === "Escape" && !$("#suggest").hidden) { e.preventDefault(); clearTimeout(searchT); closeSuggest(); }
    });
    q.addEventListener("blur", () => setTimeout(closeSuggest, 150));
  }

