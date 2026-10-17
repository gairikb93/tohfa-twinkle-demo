/* Shop page: filtering, sorting, loading / empty / error states. */
(function () {
  "use strict";
  var $ = TT.$, esc = TT.esc;
  var grid = $("#grid"), pills = $("#pills"), tiers = $("#tiers"), sortEl = $("#sort"), banner = $("#banner");
  var state = { c: "all", t: "all", sort: "curated" };

  var q = new URLSearchParams(location.search).get("c");
  if (q) state.c = q;

  function visible(list) {
    var out = list.filter(function (p) { return (state.c === "all" || p.col === state.c) && (state.t === "all" || p.tier === state.t); });
    if (state.sort === "low") out.sort(function (a, b) { return a.price - b.price; });
    if (state.sort === "high") out.sort(function (a, b) { return b.price - a.price; });
    return out;
  }

  function buildControls(list) {
    var cols = window.TT_COLLECTIONS.filter(function (c) { return list.some(function (p) { return p.col === c.id; }); });
    if (list.some(function (p) { return p.col === "more"; })) cols.push({ id: "more", short: "More" });
    if (state.c !== "all" && !cols.some(function (c) { return c.id === state.c; })) state.c = "all";
    var all = [{ id: "all", short: "All" }].concat(cols);
    pills.innerHTML = all.map(function (c) {
      var n = c.id === "all" ? list.length : list.filter(function (p) { return p.col === c.id; }).length;
      return '<button class="pill" data-c="' + esc(c.id) + '" aria-pressed="' + (state.c === c.id) + '">' + esc(c.short) + "<sup>" + n + "</sup></button>";
    }).join("");
    var ts = ["Essential", "Classic", "Premium", "Signature"].filter(function (t) { return list.some(function (p) { return p.tier === t; }); });
    tiers.innerHTML = '<span class="tracked">Tier</span>' + [{ id: "all", l: "All" }].concat(ts.map(function (t) { return { id: t, l: t }; })).map(function (t) {
      return '<button class="tchip" data-t="' + esc(t.id) + '" aria-pressed="' + (state.t === t.id) + '">' + esc(t.l) + "</button>";
    }).join("");
  }

  function render() {
    var list = visible(TT.store.products);
    $$pressed();
    if (!list.length) {
      grid.innerHTML = '<div class="state"><span class="eyebrow">' + TT.icons.spark + 'Nothing here</span><h3>No gifts match that filter</h3><p>Try another tier, or browse the whole collection.</p><button class="btn" data-reset><span>Clear filters</span><span class="ic">' + TT.icons.arrow + "</span></button></div>";
      return;
    }
    grid.innerHTML = list.map(TT.card).join("");
    TT.reveal(grid);
  }

  function $$pressed() {
    TT.$$(".pill").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-c") === state.c)); });
    TT.$$(".tchip").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-t") === state.t)); });
  }

  document.addEventListener("click", function (e) {
    var p = e.target.closest(".pill"), t = e.target.closest(".tchip"), r = e.target.closest("[data-reset]");
    if (p) { state.c = p.getAttribute("data-c"); history.replaceState(null, "", state.c === "all" ? "shop.html" : "shop.html?c=" + state.c); render(); }
    if (t) { state.t = t.getAttribute("data-t"); render(); }
    if (r) { state.c = "all"; state.t = "all"; history.replaceState(null, "", "shop.html"); render(); }
  });
  sortEl.addEventListener("change", function () { state.sort = sortEl.value; render(); });

  TT.ready.then(function (S) {
    if (S.error) {
      banner.innerHTML = '<div class="banner err" role="alert">Live availability could not be loaded, so you are seeing our catalogue prices. You can still send your order by Instagram.</div>';
    }
    buildControls(S.products);
    render();
  });
})();
