/* Tohfa & Twinkle — storefront core: catalogue (Hostinger live or built-in), cart, checkout, shared UI. */
(function () {
  "use strict";
  var CFG = window.TT_CONFIG;
  var TT = (window.TT = {});
  document.documentElement.classList.remove("no-js");

  /* ---------- helpers ---------- */
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); };
  var norm = function (s) { return String(s || "").toLowerCase().replace(/&amp;/g, "and").replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim(); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  TT.esc = esc; TT.$ = $; TT.$$ = $$;

  var fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: CFG.CURRENCY.code, maximumFractionDigits: 0 });
  TT.money = function (n) { return fmt.format(n); };

  var I = TT.icons = {
    spark: '<svg class="spark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.5c.7 5.2 2.5 8.4 5.6 9.7 1.6.7 3.4 1 4.9 1.3-5.3.9-8.4 2.7-9.6 5.8-.6 1.5-.9 3.2-1.2 4.7-.9-5.3-2.7-8.4-5.8-9.6C4.4 12.8 2.700 12.500 1.500 12.300c5.300-.9 8.400-2.700 9.600-5.800C11.700 5 12 3.200 12 1.500z"/></svg>',
    arrow: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12L12 4M5.500 4H12v6.500"/></svg>',
    plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>',
    minus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M3 8h10"/></svg>',
    check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.500l3.200 3L13 4.500"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6.500a3 3 0 016 0V8"/></svg>',
    insta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><rect x="3.500" y="3.500" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r=".6" fill="currentColor"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 18.500V6.500a2.500 2.500 0 012.500-2.500h11A2.500 2.500 0 0120 6.500v8a2.500 2.500 0 01-2.500 2.500H8.500L4 18.500z"/></svg>',
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.500" y="8.500" width="17" height="11" rx="2"/><path d="M3.500 12.500h17M12 8.500v11M12 8.500C12 6 10.500 4.500 9 4.500S6.500 6.500 9.500 8.500M12 8.500c0-2.500 1.500-4 3-4s2.500 2 -.5 4"/></svg>'
  };

  /* ---------- catalogue ---------- */
  var S = (TT.store = { products: [], source: "local", error: null });
  var LOCAL = window.TT_PRODUCTS.map(function (p) { return Object.assign({ available: true }, p); });

  function priceOf(variant) {
    var pr = variant && variant.prices && variant.prices[0];
    if (!pr) return null;
    var digits = pr.currency && pr.currency.decimal_digits != null ? pr.currency.decimal_digits : CFG.CURRENCY.digits;
    var amt = pr.sale_amount != null && pr.sale_amount > 0 && pr.sale_amount < pr.amount ? pr.sale_amount : pr.amount;
    return amt / Math.pow(10, digits);
  }

  function fetchJSON(url) {
    return fetch(url, { headers: { Accept: "application/json" } }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function loadLive() {
    var base = CFG.API_BASE + "/channels/" + encodeURIComponent(CFG.SALES_CHANNEL_ID);
    return Promise.all([fetchJSON(base + "/products?limit=100"), fetchJSON(base + "/variants?limit=100")]).then(function (res) {
      var prods = res[0].data || [], vars = res[1].data || [];
      if (!prods.length) throw new Error("empty");
      var byProd = {};
      vars.forEach(function (v) { (byProd[v.product_id] = byProd[v.product_id] || []).push(v); });
      var byName = {};
      LOCAL.forEach(function (p) { byName[norm(p.name)] = p; byName[norm(p.sub + " " + p.name)] = p; byName[norm(p.name + " " + p.sub)] = p; });
      var out = [];
      prods.forEach(function (lp) {
        var vs = byProd[lp.id] || [];
        var v = vs.filter(function (x) { return x.is_available; })[0] || vs[0];
        if (!v) return;
        var price = priceOf(v);
        if (price == null) return;
        var m = byName[norm(lp.title)] || LOCAL.filter(function (p) { return norm(lp.title).indexOf(norm(p.name)) === 0; })[0];
        var base = m ? Object.assign({}, m) : { id: lp.id, name: lp.title || "Gift", sub: lp.subtitle || "", col: "more", tier: "", box: "", img: lp.thumbnail || "", desc: (lp.description || "").replace(/<[^>]+>/g, ""), inside: "", perfect: "" };
        base.variantId = v.id;
        base.price = price;
        base.available = lp.is_available !== false && v.is_available !== false;
        out.push(base);
      });
      if (!out.length) throw new Error("no purchasable variants");
      var order = function (p) { var i = LOCAL.map(function (l) { return l.id; }).indexOf(p.id); return i < 0 ? 999 : i; };
      out.sort(function (a, b) { return order(a) - order(b); });
      S.products = out; S.source = "live";
    });
  }

  TT.ready = (function () {
    S.products = LOCAL.slice();
    if (!CFG.SALES_CHANNEL_ID) return Promise.resolve(S);
    return loadLive().catch(function (e) { S.error = e; S.products = LOCAL.slice(); S.source = "local"; return S; }).then(function () { return S; });
  })();

  TT.byId = function (id) { return S.products.filter(function (p) { return p.id === id; })[0]; };

  /* ---------- product card + modal ---------- */
  TT.card = function (p, i) {
    var chip = p.tier ? '<span class="chip' + (p.tier === "Signature" ? " sig" : "") + '">' + esc(p.tier) + "</span>" : "";
    var img = p.img ? '<img src="' + esc(p.img) + '" alt="' + esc(p.name + " — " + p.sub) + '" loading="lazy" width="900" height="1200">' : "";
    return '<article class="pcard rv" style="--i:' + ((i || 0) % 4) + '" data-open="' + esc(p.id) + '" tabindex="0" aria-label="' + esc(p.name) + '">' +
      '<div class="bezel"><div class="core"><div class="pimg">' + img + chip + "</div></div></div>" +
      '<div class="pbody"><div class="pmeta">' + esc(p.box) + "</div><h3>" + esc(p.name) + '</h3><div class="psub">' + esc(p.sub) + "</div>" +
      '<div class="pfoot"><div class="price">' + TT.money(p.price) + "<small>" + (p.box ? "per box" : "") + "</small></div>" +
      '<button class="add" data-add="' + esc(p.id) + '"' + (p.available ? "" : " disabled") + ' aria-label="Add ' + esc(p.name) + ' to your box"><span>' + (p.available ? "Add" : "Sold out") + '</span><span class="ic">' + I.plus + "</span></button></div></div></article>";
  };

  var modal;
  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "modal"; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = '<div class="bezel"><button class="x" data-close aria-label="Close">' + I.close + '</button><div class="core"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener("click", function (e) { if (e.target === modal || e.target.closest("[data-close]")) closeModal(); });
    return modal;
  }
  var lastFocus;
  function openModal(id) {
    var p = TT.byId(id); if (!p) return;
    var m = ensureModal();
    $(".core", m).innerHTML =
      '<div class="mimg">' + (p.img ? '<img src="' + esc(p.img) + '" alt="' + esc(p.name) + '">' : "") + "</div>" +
      '<div class="mtxt"><span class="eyebrow">' + I.spark + esc(p.sub) + (p.tier ? " · " + esc(p.tier) : "") + "</span><h2>" + esc(p.name) + "</h2>" +
      '<p class="lede">' + esc(p.desc) + "</p><dl class=\"dl\">" +
      (p.inside ? "<div><dt>What’s inside</dt><dd>" + esc(p.inside) + "</dd></div>" : "") +
      (p.perfect ? "<div><dt>Perfect for</dt><dd>" + esc(p.perfect) + "</dd></div>" : "") +
      (p.note ? "<div><dt>Please note</dt><dd>" + esc(p.note) + " Keep away from children and pets.</dd></div>" : "") + "</dl>" +
      '<div class="pfoot" style="padding:0;margin-top:auto"><div class="price">' + TT.money(p.price) + "<small>" + esc(p.box) + "</small></div>" +
      '<button class="btn" data-add="' + esc(p.id) + '"' + (p.available ? "" : " disabled") + "><span>Add to your box</span><span class=\"ic\">" + I.plus + "</span></button></div></div>";
    lastFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    m.classList.add("open"); m.setAttribute("aria-hidden", "false");
    $("[data-close]", m).focus();
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  TT.openProduct = openModal;

  /* ---------- toast ---------- */
  var toastEl, toastT;
  TT.toast = function (msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.innerHTML = I.spark + "<span>" + esc(msg) + "</span>";
    toastEl.classList.add("show"); clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  };

  /* ---------- cart ---------- */
  var KEY = "tt_cart_v1";
  var cart = {};
  try { cart = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { cart = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} }
  function count() { return Object.keys(cart).reduce(function (a, k) { return a + cart[k]; }, 0); }
  function lines() { return Object.keys(cart).map(function (id) { var p = TT.byId(id); return p ? { p: p, q: cart[id] } : null; }).filter(Boolean); }
  function total() { return lines().reduce(function (a, l) { return a + l.p.price * l.q; }, 0); }

  var drawer, scrim;
  function buildDrawer() {
    scrim = document.createElement("div"); scrim.className = "scrim"; scrim.setAttribute("data-cart-close", "");
    drawer = document.createElement("aside"); drawer.className = "drawer"; drawer.setAttribute("aria-label", "Your gift box"); drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = '<div class="dr-head"><h2>Your gift box</h2><button class="x" style="position:static" data-cart-close aria-label="Close gift box">' + I.close + '</button></div><div class="dr-body"></div><div class="dr-foot"></div>';
    document.body.appendChild(scrim); document.body.appendChild(drawer);
  }
  function renderCart() {
    var n = count();
    $$("[data-cart-count]").forEach(function (el) { el.textContent = n; el.classList.add("pop"); setTimeout(function () { el.classList.remove("pop"); }, 280); });
    if (!drawer) return;
    var body = $(".dr-body", drawer), foot = $(".dr-foot", drawer), ls = lines();
    if (!ls.length) {
      body.innerHTML = '<div class="dr-empty">' + I.gift.replace("<svg", '<svg width="44" height="44" style="color:var(--gold-500)"') + "<h3>Nothing here yet</h3><p>Choose a few candles and they will wait here, gift-ready.</p></div>";
      foot.innerHTML = '<a class="btn" href="shop.html"><span>Browse the shop</span><span class="ic">' + I.arrow + "</span></a>";
      return;
    }
    body.innerHTML = ls.map(function (l) {
      return '<div class="line"><img src="' + esc(l.p.img) + '" alt="" width="76" height="96"><div><h4>' + esc(l.p.name) + "</h4><small>" + esc(l.p.box) + '</small><div class="qty"><button data-dec="' + esc(l.p.id) + '" aria-label="Fewer">' + I.minus + "</button><span>" + l.q + '</span><button data-inc="' + esc(l.p.id) + '" aria-label="More">' + I.plus + '</button></div></div><div class="lp">' + TT.money(l.p.price * l.q) + "</div></div>";
    }).join("");
    var live = S.source === "live" && ls.every(function (l) { return l.p.variantId; });
    foot.innerHTML = '<div class="tot"><span class="tracked">Subtotal</span><b>' + TT.money(total()) + "</b></div>" +
      '<div class="cerr" hidden></div>' +
      '<button class="btn gold" data-checkout><span>' + (live ? "Checkout securely" : "Send order on Instagram") + '</span><span class="ic">' + I.arrow + "</span></button>" +
      '<p class="dr-note">' + (live ? "Shipping and payment are confirmed at checkout." : "We confirm your order and delivery details by DM.") + "</p>";
  }
  function setCart(open) {
    if (!drawer) buildDrawer();
    renderCart();
    document.documentElement.classList.toggle("cart-open", open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.style.overflow = open ? "hidden" : "";
  }
  TT.add = function (id, q) {
    var p = TT.byId(id); if (!p || !p.available) return;
    cart[id] = (cart[id] || 0) + (q || 1); save(); renderCart();
  };

  function orderText() {
    var t = "Hi Tohfa & Twinkle! I'd like to order:\n\n";
    lines().forEach(function (l) { t += "- " + l.p.name + " (" + l.p.box + ") x" + l.q + " — " + TT.money(l.p.price * l.q) + "\n"; });
    return t + "\nTotal: " + TT.money(total()) + "\nGift note / delivery details: ";
  }
  function showCartErr(msg) { var e = $(".cerr", drawer); if (e) { e.textContent = msg; e.hidden = false; } }
  function checkout(btn) {
    var ls = lines(); if (!ls.length) return;
    var live = S.source === "live" && ls.every(function (l) { return l.p.variantId; });
    if (!live) {
      var text = orderText();
      try { navigator.clipboard && navigator.clipboard.writeText(text); } catch (e) {}
      var w = CFG.WHATSAPP ? window.open("https://wa.me/" + CFG.WHATSAPP.replace(/\D/g, "") + "?text=" + encodeURIComponent(text), "_blank", "noopener") : window.open("https://ig.me/m/" + CFG.INSTAGRAM, "_blank", "noopener");
      TT.toast(w === null ? "Order copied. Message @" + CFG.INSTAGRAM + " on Instagram and paste it in." : "Order copied — paste it into the chat");
      return;
    }
    btn.disabled = true; btn.style.opacity = ".6";
    var origin = location.origin + location.pathname.replace(/[^/]*$/, "");
    fetch(CFG.API_BASE + "/channels/" + encodeURIComponent(CFG.SALES_CHANNEL_ID) + "/checkout", {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ items: ls.map(function (l) { return { variant_id: l.p.variantId, quantity: l.q }; }), success_url: origin + "success.html", cancel_url: origin + "cancel.html", locale: "en" })
    }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) { if (!d.url) throw new Error("no url"); location.href = d.url; })
      .catch(function () { btn.disabled = false; btn.style.opacity = ""; showCartErr("Checkout could not start. Please try again, or order by Instagram DM."); });
  }
  TT.clearCart = function () { cart = {}; save(); renderCart(); };

  /* ---------- global events ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    var add = t.closest("[data-add]");
    if (add) {
      e.stopPropagation();
      TT.add(add.getAttribute("data-add"));
      var span = add.querySelector("span"); var old = span.textContent;
      add.classList.add("done"); span.textContent = "Added";
      setTimeout(function () { add.classList.remove("done"); span.textContent = old; }, 1200);
      TT.toast("Added to your gift box"); return;
    }
    if (t.closest("[data-cart-open]")) { closeModal(); setCart(true); return; }
    if (t.closest("[data-cart-close]")) { setCart(false); return; }
    var inc = t.closest("[data-inc]"), dec = t.closest("[data-dec]");
    if (inc) { cart[inc.getAttribute("data-inc")]++; save(); renderCart(); return; }
    if (dec) { var k = dec.getAttribute("data-dec"); cart[k]--; if (cart[k] <= 0) delete cart[k]; save(); renderCart(); return; }
    var co = t.closest("[data-checkout]"); if (co) { checkout(co); return; }
    var open = t.closest("[data-open]"); if (open) { openModal(open.getAttribute("data-open")); return; }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeModal(); if (drawer) setCart(false); closeMenu(); }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".pcard[data-open]")) { e.preventDefault(); openModal(e.target.getAttribute("data-open")); }
  });

  /* ---------- nav ---------- */
  var root = document.documentElement;
  function closeMenu() { root.classList.remove("menu-open"); document.body.style.overflow = ""; var b = $(".burger"); if (b) b.setAttribute("aria-expanded", "false"); }
  var burger = $(".burger");
  if (burger) burger.addEventListener("click", function () {
    var o = !root.classList.contains("menu-open");
    root.classList.toggle("menu-open", o); document.body.style.overflow = o ? "hidden" : ""; burger.setAttribute("aria-expanded", o);
  });
  $$(".overlay-menu a").forEach(function (a) { a.addEventListener("click", closeMenu); });

  var nav = $(".nav");
  var darks = $$("[data-dark]");
  if (nav && darks.length && "IntersectionObserver" in window) {
    var active = new Set();
    var dio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? active.add(e.target) : active.delete(e.target); });
      nav.classList.toggle("over-dark", active.size > 0);
    }, { rootMargin: "-40px 0px -92% 0px" });
    darks.forEach(function (d) { dio.observe(d); });
  }

  /* ---------- reveal ---------- */
  var rio = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }) : null;
  TT.reveal = function (scope) {
    $$(".rv:not(.in)", scope).forEach(function (el) { rio ? rio.observe(el) : el.classList.add("in"); });
  };
  TT.reveal();

  renderCart();
  TT.ready.then(renderCart);
})();
