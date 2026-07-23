/*
 * cart/shipping.js — Dantik Upgates: filtrování doprav a plateb v košíku.
 *
 * Samostatný vanilla-JS modul (bez jQuery), nezávislý na configurátoru
 * (euroclips/data/init.js). Registruje se vlastním <script> v Upgates šabloně.
 *
 * Tok:
 *  - /cart     posbírá z každého řádku košíku poznámku, rozměr, množství, URL
 *              a uloží je do localStorage (na /shipment už poznámka v DOM není).
 *  - /shipment sestaví obsah košíku; pokud obsahuje aspoň jedno zboží na míru
 *              (kód produktu ve tvaru ID-<číslo>), pošle ho na
 *              POST https://apiramari.profiramari.cz/api/cart/shipping-options
 *              a podle odpovědi schová nevhodné dopravy/platby a vybere
 *              první viditelnou možnost. Bez zboží na míru se API nevolá.
 *
 * Rozhodovací logika (rozměry, váha, sklo/plexi, atyp) je celá na API —
 * server-side port původního klientského filtru z frame-simple-forms/old/init.js.
 */
(function () {
  "use strict";

  var API_URL = "https://apiramari.profiramari.cz/api/cart/shipping-options";
  var STORE_KEY = "dantik_cart_notes";

  var LANG = (function () {
    try {
      if (window.upgates && window.upgates.language) {
        return String(window.upgates.language);
      }
    } catch (e) {}
    return location.hostname.indexOf(".sk") > -1 ? "sk"
         : location.hostname.indexOf(".pl") > -1 ? "pl"
         : "cz";
  })();

  function log() {
    if (window.DANTIK_SHIPPING_DEBUG && window.console) {
      console.log.apply(console, ["[shipping]"].concat([].slice.call(arguments)));
    }
  }

  function ready(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  // ---------------------------------------------------------------------------
  // /cart — sběr poznámek
  // ---------------------------------------------------------------------------

  function harvestCart() {
    var rows = document.querySelectorAll("tr[data-id]");
    var lines = [];
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var rawId = tr.getAttribute("data-id") || "";
      var id = rawId.split("_")[0];
      if (!id) {
        continue;
      }

      // poznámka (text "Poznámka: …") — najdi listový element uvnitř řádku
      var note = "";
      var all = tr.querySelectorAll("*");
      for (var j = 0; j < all.length; j++) {
        var el = all[j];
        if (el.children.length === 0) {
          var t = (el.textContent || "").trim();
          if (/^Pozn/i.test(t)) {
            note = t.replace(/^Pozn\S*\s*:?\s*/i, "").trim();
            break;
          }
        }
      }

      // množství
      var qtyEl = tr.querySelector(".QuantityObject, input[name^='p']");
      var qty = qtyEl ? parseInt(qtyEl.value, 10) : 1;
      if (!qty || qty < 1) {
        qty = 1;
      }

      // titulek + URL produktu (odkaz s neprázdným textem)
      var title = "", url = "";
      var links = tr.querySelectorAll("a[href*='/p/']");
      for (var k = 0; k < links.length; k++) {
        var href = links[k].getAttribute("href") || "";
        var txt = (links[k].textContent || "").trim();
        if (href && !url) {
          url = href;
        }
        if (txt && !title) {
          title = txt;
        }
      }

      lines.push({
        id: id,
        lineKey: tr.getAttribute("data-keyname") || rawId,
        note: note,
        quantity: qty,
        title: title,
        url: url
      });
    }

    if (lines.length) {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify({ lang: LANG, lines: lines }));
        log("harvested", lines);
      } catch (e) {
        log("localStorage write failed", e);
      }
    }
  }

  function initCart() {
    harvestCart();
    // Upgates překresluje košík AJAXem (změna množství / odebrání) — sleduj
    var target = document.querySelector("#snippet--cart, #basket, main") || document.body;
    if (window.MutationObserver) {
      var obs = new MutationObserver(debounce(harvestCart, 300));
      obs.observe(target, { childList: true, subtree: true });
    }
  }

  // ---------------------------------------------------------------------------
  // /shipment — filtr doprav a plateb
  // ---------------------------------------------------------------------------

  function readStoredLines() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) {
        return [];
      }
      var data = JSON.parse(raw);
      return (data && data.lines) || [];
    } catch (e) {
      return [];
    }
  }

  function cartProductsFromUpgates() {
    try {
      if (window.upgates && window.upgates.cart && window.upgates.cart.products) {
        return window.upgates.cart.products;
      }
    } catch (e) {}
    return [];
  }

  function buildProducts() {
    var lines = readStoredLines();
    var upg = cartProductsFromUpgates();

    // index Upgates produktů podle id (kvůli code/title/qty)
    var byId = {};
    for (var i = 0; i < upg.length; i++) {
      byId[String(upg[i].id)] = upg[i];
    }

    // primárně harvestované řádky (mají poznámku), obohacené o code z Upgates
    if (lines.length) {
      return lines.map(function (l) {
        var u = byId[String(l.id)] || {};
        return {
          upgatesId: String(l.id),
          code: u.code || "",
          title: l.title || u.title || "",
          note: l.note || "",
          quantity: l.quantity || u.quantity || 1,
          url: l.url || ""
        };
      });
    }

    // fallback: bez poznámek (uživatel přišel přímo na /shipment)
    return upg.map(function (u) {
      return {
        upgatesId: String(u.id),
        code: u.code || "",
        title: u.title || "",
        note: "",
        quantity: u.quantity || 1,
        url: ""
      };
    });
  }

  // Vystoupej od radio inputu k řádku, který nese text možnosti.
  function optionRow(input) {
    var label = input.closest && input.closest("label");
    if (label && label.textContent.trim().length > 3) {
      return label;
    }
    var el = input, depth = 0;
    while (el && el.parentElement && depth < 6) {
      el = el.parentElement;
      if ((el.textContent || "").trim().length > 3) {
        return el;
      }
      depth++;
    }
    return input.parentElement || input;
  }

  function collectMethods(name) {
    var out = [];
    var inputs = document.querySelectorAll("input[name='" + name + "']");
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      var id = (input.id || "").replace(/^shp-(ship|pay)-/, "");
      var row = optionRow(input);
      out.push({
        id: id,
        name: (row.textContent || "").replace(/\s+/g, " ").trim(),
        input: input,
        row: row
      });
    }
    return out;
  }

  function applyHide(methods, hideIds) {
    var hide = {};
    for (var i = 0; i < (hideIds || []).length; i++) {
      hide[String(hideIds[i])] = true;
    }
    var hiddenAny = false;
    for (var j = 0; j < methods.length; j++) {
      var m = methods[j];
      if (hide[String(m.id)]) {
        m.row.style.display = "none";
        if (m.input.checked) {
          m.input.checked = false;
        }
        hiddenAny = true;
        log("hide", m.id, m.name);
      }
    }
    return hiddenAny;
  }

  // Vyber první viditelnou možnost, pokud aktuálně vybraná je schovaná / žádná.
  function selectFirstVisible(name) {
    var inputs = document.querySelectorAll("input[name='" + name + "']");
    var checkedVisible = false, first = null;
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      var visible = input.offsetParent !== null || optionRow(input).style.display !== "none";
      var rowHidden = optionRow(input).style.display === "none";
      if (rowHidden) {
        continue;
      }
      if (!first) {
        first = input;
      }
      if (input.checked) {
        checkedVisible = true;
      }
    }
    if (!checkedVisible && first) {
      first.click();
      log("auto-select", name, first.id);
    }
  }

  function applyResult(result) {
    var ships = collectMethods("shipments");
    var pays = collectMethods("payments");
    applyHide(ships, result.hideShipmentIds);
    applyHide(pays, result.hidePaymentIds);
    selectFirstVisible("shipments");
    selectFirstVisible("payments");
  }

  // Zboží na míru poznáme podle kódu ve tvaru ID-<číslo> (např. ID-12345).
  function isCustomProduct(p) {
    return /^ID-\d+/i.test(String(p.code || "").trim());
  }

  function requestAndApply() {
    var products = buildProducts();
    var shipments = collectMethods("shipments").map(stripDom);
    var payments = collectMethods("payments").map(stripDom);

    if (!shipments.length) {
      log("no shipments on page yet");
      return;
    }

    if (!products.some(isCustomProduct)) {
      log("no custom (ID-<n>) product in cart, skipping API");
      return;
    }

    var payload = { lang: LANG, products: products, shipments: shipments, payments: payments };
    log("request", payload);

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (result) {
        log("response", result);
        window.__dantikShippingResult = result;
        applyResult(result);
      })
      .catch(function (e) { log("API error", e); });
  }

  function stripDom(m) {
    return { id: m.id, name: m.name };
  }

  function initShipment() {
    requestAndApply();
    // Upgates překresluje seznam doprav/plateb AJAXem (změna adresy apod.) —
    // re-aplikuj poslední výsledek, ať schování nezmizí.
    var target = document.querySelector("#snippet--shipment, main") || document.body;
    if (window.MutationObserver) {
      var obs = new MutationObserver(debounce(function () {
        if (window.__dantikShippingResult) {
          applyResult(window.__dantikShippingResult);
        }
      }, 200));
      obs.observe(target, { childList: true, subtree: true });
    }
  }

  // ---------------------------------------------------------------------------

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  ready(function () {
    var path = location.pathname.replace(/\/+$/, "");
    if (/\/cart$/.test(path)) {
      initCart();
    } else if (/\/shipment$/.test(path)) {
      initShipment();
    }
  });
})();
