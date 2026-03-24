/*!
 * DANTIK structured data injector (schema.org Product/Offer JSON-LD)
 * Added by Lukas (Lukin) — 2026-01-29
 * SaaS workaround: loaded via .csv file as <script src="...">
 */

(function () {
  // --- debug "beacon"
  window.__DANTIK_SD_LOADED__ = (window.__DANTIK_SD_LOADED__ || 0) + 1;
  console.log("[DANTIK SD] loaded", window.__DANTIK_SD_LOADED__, "on", location.pathname);

  function q(sel, root) { return (root || document).querySelector(sel); }
  function t(el) { return el ? (el.textContent || "").trim() : ""; }

  function canonicalUrl() {
    var c = q("link[rel='canonical']");
    return c ? c.href : location.href.split("#")[0];
  }

  function parsePriceFromText(str) {
    if (!str) return null;
    // najdi první číslo typu 67,00 / 67.00 / 1 234,50
    var s = str.replace(/\u00A0/g, " ");
    var m = s.match(/(\d{1,3}(?:[ \u00A0]\d{3})*|\d+)([.,]\d{1,2})?/);
    if (!m) return null;
    var num = m[0].replace(/\s|\u00A0/g, "").replace(",", ".");
    var f = parseFloat(num);
    if (isNaN(f)) return null;
    return f.toFixed(2);
  }

  function detectCurrencyFromText(str) {
    var s = (str || "").toUpperCase();
    if (s.includes("EUR") || s.includes("€")) return "EUR";
    if (s.includes("CZK") || s.includes("KČ")) return "CZK";
    return (location.hostname.indexOf(".sk") > -1) ? "EUR" : "CZK";
  }

  function availabilityFromText(str) {
    var s = (str || "").toLowerCase();
    if (s.includes("skladom") || s.includes("na sklade") || s.includes("skladem")) return "https://schema.org/InStock";
    if (s.includes("nedostup") || s.includes("vypred") || s.includes("vyprod")) return "https://schema.org/OutOfStock";
    if (s.includes("objed") || s.includes("do")) return "https://schema.org/BackOrder";
    return "https://schema.org/InStock";
  }

  function injectJsonLd(obj) {
    if (document.getElementById("dantik-jsonld-product")) return;
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.id = "dantik-jsonld-product";
    s.text = JSON.stringify(obj);
    (document.head || document.documentElement).appendChild(s);
  }

  function isBadPage() {
    var p = (location.pathname || "").toLowerCase();
    return p.includes("/e-basket") || p.includes("/e-shipping") || p.includes("/e-delivery");
  }

  function extractPropsFromPage() {
    // bereme text z detailu produktu; když ho nenajdeme, vezmeme body
    var root =
      q("#detail") ||
      q(".detail") ||
      q(".product-detail") ||
      q("main") ||
      document.body;

    var lines = (root.innerText || "")
      .split(/\r?\n/)
      .map(function (x) { return x.trim(); })
      .filter(Boolean);

    var props = {};

    function normalizeLabel(s) {
      return (s || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace("výrobca", "vyrobca")
        .replace("výrobce", "vyrobca")
        .replace("kód zboží", "kod zbozi")
        .replace("číslo produktu", "cislo produktu");
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      // "EAN kód: 859..."
      var m = line.match(/^([^:]{2,40}):\s*(.+)$/);
      if (m) {
        var label = normalizeLabel(m[1]);
        var value = (m[2] || "").trim();
        if (value.length > 0 && value.length < 160) props[label] = value;
        continue;
      }

      // "EAN859..." nebo "SKUSET_..."
      var m2 = line.match(/^(sku|ean)\s*([0-9A-Z_\-\.]{6,})$/i);
      if (m2) {
        props[normalizeLabel(m2[1])] = m2[2];
      }
    }

    return props;
  }

  function mapToFields(props) {
    function pick() {
      for (var i = 0; i < arguments.length; i++) {
        var k = arguments[i];
        if (props[k]) return props[k];
      }
      return null;
    }

    var sku = pick("sku", "cislo produktu", "kod zbozi");
    var gtin = pick("ean", "ean kod", "ean kód"); // po normalizaci by mělo skončit jako "ean kod"
    var brand = pick("vyrobca");

    // additional properties: vše ostatní (kromě identifikátorů)
    var skip = new Set(["sku", "cislo produktu", "kod zbozi", "ean", "ean kod", "vyrobca"]);
    var additional = [];

    Object.keys(props).forEach(function (k) {
      if (skip.has(k)) return;
      additional.push({ "@type": "PropertyValue", "name": k, "value": props[k] });
    });

    return { sku: sku, gtin: gtin, brand: brand, additional: additional };
  }

  function findName() {
    return t(q("h1.c716.c1335")) || t(q("h1"));
  }

  function findBuyBoxText() {
    // vezmeme text z oblasti kolem tlačítka do košíku, když najdeme
    var btn = Array.prototype.slice.call(document.querySelectorAll("button, a")).find(function (el) {
      var s = t(el).toLowerCase();
      return s.includes("pridať do košíka") || s.includes("přidat do košíku") || s.includes("pridat do kosika");
    });

    var box = btn ? btn.closest("section, article, div") : null;
    return (box && box.innerText) ? box.innerText : (document.body.innerText || "");
  }

  function run() {
    if (isBadPage()) return;

    var name = findName();
    if (!name) return;

    var buyText = findBuyBoxText();
    var price = parsePriceFromText(buyText);
    var currency = detectCurrencyFromText(buyText);
    var availability = availabilityFromText(buyText);

    if (!price) {
      // fallback: zkus najít první krátký text s EUR/CZK
      var els = Array.prototype.slice.call(document.querySelectorAll("body *"));
      var hit = els.find(function (el) {
        var s = t(el);
        if (!s || s.length > 80) return false;
        var up = s.toUpperCase();
        return up.includes("EUR") || up.includes("CZK") || up.includes("KČ") || up.includes("€");
      });
      if (hit) {
        var s2 = t(hit);
        currency = detectCurrencyFromText(s2);
        price = parsePriceFromText(s2);
      }
    }

    if (!price) {
      console.warn("[DANTIK SD] price not found, skipping JSON-LD");
      return;
    }

    var props = extractPropsFromPage();
    var mapped = mapToFields(props);

    var jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": name,
      "sku": mapped.sku || undefined,
      "gtin": mapped.gtin || undefined,
      "brand": { "@type": "Brand", "name": mapped.brand || "DANTIK" },
      "additionalProperty": mapped.additional.length ? mapped.additional : undefined,
      "offers": {
        "@type": "Offer",
        "url": canonicalUrl(),
        "priceCurrency": currency,
        "price": price,
        "availability": availability,
        "itemCondition": "https://schema.org/NewCondition"
      }
    };

    // úklid undefined
    Object.keys(jsonLd).forEach(function (k) { if (jsonLd[k] === undefined) delete jsonLd[k]; });
    Object.keys(jsonLd.offers).forEach(function (k) { if (jsonLd.offers[k] === undefined) delete jsonLd.offers[k]; });

    injectJsonLd(jsonLd);
    console.log("[DANTIK SD] JSON-LD injected", { price: price, currency: currency, sku: mapped.sku, gtin: mapped.gtin });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
