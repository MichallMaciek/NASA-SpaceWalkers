// Moduł przykładowy do kontraktu rozszerzeń SARnik (docs/planwyd/KONTRAKT.md).
// Pokazuje pełny cykl: teksty w dwóch językach, zapytanie po wybraniu miejsca, wiersz przeglądu.
// Nie jest częścią aplikacji; służy do testu kontraktu (selftest.mjs) i jako wzór dla modułów.
(function () {
  const SK = window.SARNIK;
  if (!SK) return; // bez rdzenia moduł jest bezczynny

  // czysta funkcja: da się ją testować bez sieci
  const parse = (text) => {
    const m = /value=(-?\d+(?:\.\d+)?)/.exec(String(text));
    return m ? Number(m[1]) : null;
  };

  SK.register("example", {
    pure: { parse },
    i18n: {
      pl: {
        title: "Przykład (test kontraktu)",
        checking: "Sprawdzam usługę…",
        unavailable: "Usługa nie odpowiedziała. To nie znaczy, że wszystko jest w porządku.",
        nodata: "Brak danych dla tego miejsca.",
        high: (v) => `Wartość ${v}: powyżej progu.`,
        low: (v) => `Wartość ${v}: poniżej progu.`,
        src: "usługa przykładowa",
      },
      en: {
        title: "Example (contract test)",
        checking: "Checking the service…",
        unavailable: "The service did not answer. That does not mean everything is fine.",
        nodata: "No data for this place.",
        high: (v) => `Value ${v}: above the threshold.`,
        low: (v) => `Value ${v}: below the threshold.`,
        src: "example service",
      },
    },
    onSelect(sel, ctx) {
      ctx.fetchOnce(sel, "example", (signal) =>
        fetch(`https://example.invalid/point?lat=${sel.lat}&lng=${sel.lng}`, { signal }).then((r) => r.text()), 6000);
    },
    checks(sel, ctx) {
      const s = ctx.t("example"), r = sel.ext && sel.ext.example;
      if (!r || r.st === "loading") return { id: "value", lvl: "info", pending: true, t: s.title, v: s.checking, src: s.src };
      if (r.st !== "ok") return { id: "value", lvl: "info", t: s.title, v: s.unavailable, src: s.src };
      const v = parse(r.data);
      if (v == null) return { id: "value", lvl: "info", t: s.title, v: s.nodata, src: s.src };
      return { id: "value", lvl: v >= 5 ? "warn" : "ok", t: s.title, v: (v >= 5 ? s.high : s.low)(ctx.num(v, 1)), src: s.src };
    },
  });
})();
