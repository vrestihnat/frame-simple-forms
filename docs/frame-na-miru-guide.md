# Rám na míru — průvodce pro juniora

Tento dokument popisuje, **jak získat z API všechna data potřebná pro naplnění
formuláře "Rám na míru"** (typy rámů, barvy, skla, podklady), **jak z vypočtené
ceny dostat ID Upgates produktu** (přes zaokrouhlenou cenovou hladinu), a
**jak produkt přidat do košíku** stejným flow, jaký používá atyp euroklip.

Výpočet ceny probíhá client-side (viz `frame_model.js` v git historii, logika
zůstává stejná) — to **není předmětem tohoto zadání**. Junior dostane
spočítanou cenu (např. `489 Kč`) a od ní pokračuje dál podle sekcí 8 a 9.

Cílem je zrekonstruovat formulář, který v projektu dříve existoval jako
`frame_template.html` + `frame_model.js`, ale nyní místo čtení lokálního
`config.json` a dvou stránek CSV bude vše tahat z `api.ramari.cz`.

---

## 1. Jak vypadá výsledný formulář

Stejný layout jako euroklip (viz [`euroclip_template.html`](../euroclips/data/euroclip_template.html)),
ale s více selectboxy:

| Pole | HTML ID | Co obsahuje | Zdroj dat |
|---|---|---|---|
| Typ rámu | `#frame-type` | `<option>` per typ (Kostička, Galerka, Hliník 7001, …) | `/api/configurator/config?group=frame` |
| Barva / odstín | `#color` | `<option>` per barva pro vybraný typ (hnědá, zlatá, …) | `/api/enum_mouldings?webramovani=true` (filtr podle typu) |
| Sklo | `#glass` | čiré, antireflex, plexi, bez skla | `/api/configurator/config?group=glass` |
| Podklad | `#base` | MDF, lepenka, záda, bez podkladu | `/api/configurator/config?group=base` |
| Šířka | `#size-a` | číslo, cm, min 9 | — |
| Výška | `#size-b` | číslo, cm, min 9 | — |
| Počet kusů | `#kusy` | integer | — |
| "Do košíku" | `#buy_btn` | submit | — |

Jako HTML šablonu lze zkopírovat [`euroclip_template.html`](../euroclips/data/euroclip_template.html)
a přidat `#color`, `#glass`, `#base` selecty (tam, kde jsou dnes u euroklipu jen
`#frame-type` a rozměry).

---

## 2. Tři API volání, která potřebuješ

Všechny tři endpointy jsou GET, bez autentizace, CORS je povolený pro všechny
dantik domény (`dantik.cz`, `dantik.sk`, `dantik.t2.upgates.shop`).

### 2.1 `GET /api/configurator/config?lang=cz`

**Dokumentace:** `https://api.ramari.cz/api/docs` → *ConfiguratorConfig*.

Response:
```json
{
  "lang": "cz",
  "settings": {
    "bars_waste": 1.15,
    "price_coef": 1.35,
    "vat_cz": 1.21,
    "vat_sk": 1.23,
    "eur_rate": 26,
    "hooks": [
      { "name": 1, "price_vat": 8.2,  "upTo": 60 },
      { "name": 2, "price_vat": 16.4, "upTo": 999 }
    ]
  },
  "products": [
    { "group": "frame", "code": "114", "url": "ram-kosticka-atyp", "label": "Rámeček Dantik Kostička", "stock": "Tento rám vyrábíme..." },
    { "group": "frame", "code": "27",  "url": "ram-galerka-atyp",  "label": "Rámeček Dantik Galerka",  "stock": "..." },
    { "group": "glass", "code": "Sklo_2mm",   "url": "sklo-atyp",  "label": "Dantik Sklo a Plexi",     "stock": "..." },
    { "group": "base",  "code": "zada-atyp", "url": "zada-atyp",  "label": "Dantik Záda k rámům...",  "stock": "..." }
  ]
}
```

**Co dostáváš:**
- `settings` — globální koeficienty, **pro formulář je nepotřebuješ** (použije je server při výpočtu ceny).
- `products` — seznam 54 položek se čtyřmi hodnotami `group`: `euroklip`, `frame`, `glass`, `base`. Pro formulář rám na míru zajímají poslední tři.

**Užitečné query parametry:**
- `lang=cz|sk|pl` — `label` a `stock` se vrátí v daném jazyce (fallback CZ).
- `group=frame|glass|base` — filter, vrátí jen jednu skupinu. Pokud chceš 3 samostatné requesty → `?group=frame`, `?group=glass`, `?group=base`. Pokud chceš jedním requestem → bez parametru a filter si udělej v JS.

### 2.2 `GET /api/enum_mouldings?webramovani=true`

Seznam všech **konkrétních lišt** (barev + odstínů), které mají být na webu. Vrátí pole ~3800 položek.

Z pohledu formuláře potřebuješ:

```json
{
  "cis3": "114.hneda",              // unikátní kód barvy (value do <option>)
  "profil": 114,                    // číslo profilu — koresponduje s frame.code
  "webnazevcz": "Kostička hnědá",   // label v CZ
  "webnazevsk": "Kocka hnedá",      // label v SK
  "okraj1": 20,                     // šířka okraje × 10 (cm) — pro ilustrační obrázek
  ...
}
```

Ostatní sloupce (cenové) klient ignoruje — pricing řeší server.

**Klíč pro spojení s typem rámu:** `profil` z `enum_mouldings` = `code` z
`products[] group=frame`. Oba jsou číslo (pozor — v `products` je to string
`"114"`, v `enum_mouldings` je to integer `114`; při porovnání převeď na
stejný typ).

### 2.3 `GET /api/enumgoods?webramovani=true`

Seznam konkrétních skel a podkladů (po kusech, ne po typech). Cca 200 položek.

```json
{
  "klasifikace": "Sklo_2mm.cire",    // unikátní kód
  "webnazevcz": "Sklo čiré 2 mm",
  "webnazevsk": "Sklo číre 2 mm",
  "jesklo": true,                    // true = sklo, false = sklu neříkej ani jednou
  "jepodklad": false,                // true = podklad
  "rozmerx": 70,                     // max šířka (cm) — pro validaci u podkladů
  "rozmery": 100,                    // max výška
  ...
}
```

Filtr v JS:
- Skla: `item.jesklo === true`
- Podklady: `item.jepodklad === true`

Na rozdíl od lišt **nemají vazbu na typ rámu** — jsou globální. Uživatel si
je vybírá nezávisle.

---

## 3. Kdy co volat — workflow formuláře

```
┌────────────────────────────────────────────────────────────┐
│ Load stránky                                               │
│   ├─ GET /api/configurator/config?lang={LANG}              │
│   ├─ GET /api/enum_mouldings?webramovani=true              │
│   └─ GET /api/enumgoods?webramovani=true                   │
│                                                            │
│   → naplň #frame-type z products (group=frame)             │
│   → naplň #glass z products (group=glass)                  │
│   → naplň #base z products (group=base)                    │
│   → #color zůstane prázdný (dokud nevybere typ)            │
├────────────────────────────────────────────────────────────┤
│ User vybere typ v #frame-type                              │
│   → vyfiltruj enum_mouldings, kde profil == vybraný code   │
│   → naplň #color z filtrovaných lišt                       │
│   → zobraz #color (byl skrytý)                             │
├────────────────────────────────────────────────────────────┤
│ User vybere barvu, sklo, podklad, zadá rozměry a ks        │
│   → client-side výpočet ceny (mimo scope — viz frame_model │
│     v git historii; logika zůstává nezměněna)              │
│   → debounce 350 ms, abychom nevolali API na každý         │
│     keystroke (stejně jako euroklip)                       │
├────────────────────────────────────────────────────────────┤
│ Cena spočítána → získej ID produktu podle ceny             │
│   GET /api/rounded_bohemian_product/{roundedPrice}/{lang}  │
│   → ulož response.uri a response.upgatesId do modelu       │
│   → povol #buy_btn                                         │
├────────────────────────────────────────────────────────────┤
│ User klikne "Do košíku"                                    │
│   → sessionStorage.setItem('euroclip_cart_added', '1')     │
│   → redirect na                                            │
│     {uri}?addtocart=1                                      │
│          &quantity={ks}                                    │
│          &productnote={sestavená poznámka}                 │
│          &return={currentPath}                             │
│   → Upgates přidá produkt, přesměruje zpět na konfigurátor │
│   → init.js přečte sessionStorage flag a zobrazí toast     │
└────────────────────────────────────────────────────────────┘
```

---

## 4. Ukázkový kód

Funguje v prostředí projektu (jQuery je dostupné, stejně jako `$.euroclip.LANG`).

```js
async function loadFrameFormData() {
  const lang = $.euroclip.LANG; // "cz" | "sk" | "pl"
  const API = 'https://api.ramari.cz/api';

  // 1. paralelní fetch všech tří endpointů
  const [config, mouldings, goods] = await Promise.all([
    fetch(`${API}/configurator/config?lang=${lang}`).then(r => r.json()),
    fetch(`${API}/enum_mouldings?webramovani=true`).then(r => r.json()),
    fetch(`${API}/enumgoods?webramovani=true`).then(r => r.json()),
  ]);

  const nameField = lang === 'sk' ? 'webnazevsk' : 'webnazevcz'; // PL zatím fallback na CZ

  // 2. typy rámů (select #frame-type)
  const frameTypes = config.products.filter(p => p.group === 'frame');
  fillSelect('#frame-type', frameTypes, p => p.label, p => p.code);

  // 3. skla (select #glass) + možnost "bez skla"
  const glasses = config.products.filter(p => p.group === 'glass');
  fillSelect('#glass', glasses, p => p.label, p => p.code, { emptyOption: '- bez skla -' });

  // 4. podklady (select #base) + možnost "bez podkladu"
  const bases = config.products.filter(p => p.group === 'base');
  fillSelect('#base', bases, p => p.label, p => p.code, { emptyOption: '- bez podkladu -' });

  // 5. #color se plní dynamicky až po výběru typu
  $('#color').closest('.ecf-field').hide();

  $('#frame-type').on('change', function () {
    const selectedCode = parseInt($(this).val(), 10);
    const colors = mouldings.filter(m => m.profil === selectedCode);
    fillSelect('#color', colors, m => m[nameField], m => m.cis3);
    $('#color').closest('.ecf-field').toggle(colors.length > 0);
  });

  // 6. stock info — zobraz u vybraného typu (volitelné)
  $('#frame-type').on('change', function () {
    const selected = frameTypes.find(p => p.code === $(this).val());
    $('.stock-info').text(selected ? selected.stock : '');
  });
}

/** pomocná funkce na naplnění <select> */
function fillSelect($selector, items, labelFn, valueFn, opts = {}) {
  const $el = $($selector).empty();
  if (opts.emptyOption) {
    $el.append(`<option value="0">${opts.emptyOption}</option>`);
  }
  items.forEach(item => {
    $el.append(`<option value="${valueFn(item)}">${labelFn(item)}</option>`);
  });
}

// spusť na load
$(function () { loadFrameFormData(); });
```

---

## 5. Předvyplnění rozměrů z URL hashe

Konfigurátor podporuje sdílení odkazu s konkrétními rozměry přes URL hash.
Junior to nemusí implementovat sám — euroklip už to umí ([init.js:691-720](../euroclips/data/init.js#L691-L720))
a stejnou logiku stačí použít i pro rámy. Stačí vědět, že to existuje.

Podporované formáty (lze míchat):

| URL | Rozměry |
|---|---|
| `https://www.dantik.cz/p/ekp-k-atyp#15x20` | 15 × 20 cm |
| `https://www.dantik.cz/p/ekp-k-atyp#a=15&b=20` | 15 × 20 cm |
| `https://www.dantik.cz/p/ekp-k-atyp#x=15&y=20` | 15 × 20 cm (alias) |
| `https://www.dantik.cz/p/ekp-k-atyp#sirka=15&vyska=20` | 15 × 20 cm (české aliasy, funguje i `šířka`/`výška`) |

Hash má **prioritu nad path** — pokud je URL `/p/EKP-K-atyp-19x43#10x20`,
zobrazí se 10×20.

Helper je v `init.js`:
```js
function parseHashSizes(hash) {
  // viz init.js – sdílíme s euroklipem
}
```

Pro rámy bys to **využil pro generování shareable linků** — např. když user
vyplní 30×40 cm a klikne "Sdílet konfiguraci", vygeneruj
`location.pathname + '#a=30&b=40'`.

---

## 6. Detekce jazyka

Viz [`init.js`](../euroclips/data/init.js) řádky 57–73 — projekt už má konstantu
`$.euroclip.LANG`:

```js
if (window.location.hostname.indexOf(".sk") > 0) {
  $.euroclip.LANG = "sk";
} else {
  $.euroclip.LANG = "cz";
}
```

Pro rámy na míru použij stejnou logiku (až přibude PL doména, dopíše se
`.indexOf(".pl") > 0 → "pl"`).

Při volání API **vždy předej `?lang=${LANG}`**, u `enum_mouldings` a
`enumgoods` použij jazyk pro výběr pole `webnazev{cz,sk}`.

---

## 7. Cache v sessionStorage

Pro snížení počtu requestů se v projektu cachuje config mezi navigacemi (per-tab):

```js
if (!sessionStorage.getItem('config_v2')) {
  // fetch, pak:
  sessionStorage.setItem('config_v2', JSON.stringify({ settings, products }));
}
```

Stejný pattern lze použít pro `mouldings` a `goods` (klíče `mouldings_v1`,
`goods_v1`). **Důležité:** pokud změníš strukturu response, vždy zvyš verzi
klíče (`_v2`, `_v3`), jinak klienti uvidí starý cache.

---

## 8. Na co si dát pozor

1. **Typy porovnávání** — `frame.code` je string (`"114"`), `mouldings.profil` je integer (`114`). Vždy převeď na stejný typ:
   ```js
   mouldings.filter(m => String(m.profil) === String(selectedCode))
   ```
2. **Počet barev per typ** — některé typy rámů mají **desítky barev** (např. hliník 7001), jiné **jednu**. Select musí být scrollovatelný.
3. **`webramovani=true`** — bez tohoto parametru vrátí `enum_mouldings` i interní ERP materiál, který na webu nemá být.
4. **PL překlady** — `webnazevpl` zatím v DB není. Pro PL použij fallback na CZ (`webnazevcz`) a **napiš jasný TODO komentář**, ať někdo dodá překlady (Ramari API migrace).
5. **Rozměry podkladů** — u jepodklad je `rozmerx` / `rozmery` maximum. Pokud user zadá větší rozměr než má podklad (např. 120×80 vs podklad 70×100), podklad by měl být z `#base` select **vyloučen** (nebo zvýrazněn jako "není k dispozici ve zvolené velikosti"). Euroklipy tohle neřeší, u rámů je to potřeba.
6. **Prázdné hodnoty** — pokud user chce **jen rám bez skla a podkladu**, pošli do `/api/frame/resolve` jejich code jako `null` nebo `"0"`. Server si to vyloží.

---

## 9. Od ceny k ID produktu: `rounded_bohemian_product`

Když máš spočítanou cenu (např. `489.50 Kč`), musíš ji zaokrouhlit na nejbližší
**cenovou hladinu** — to je produkt, který v Upgatesu reálně existuje a do
kterého uživatele pošleme.

### Endpoint

```
GET https://api.ramari.cz/api/rounded_bohemian_product/{price}/{country}
```

- `price` — zaokrouhlená cena jako integer (`Math.round(clientPrice)`), např. `490`
- `country` — `cz` nebo `sk` (podle jazyka — pro `pl` zatím zadávej `cz`)

### Response

```json
{
  "id": 123,
  "czk": 500,
  "eur": 20,
  "uri": "/p/id-500",
  "upgatesId": 15583
}
```

- `czk` / `eur` — zaokrouhlená cena daného produktu (použij jako finální cenu v UI místo té spočítané — je to ta, kterou uživatel reálně zaplatí)
- `uri` — path na Upgatesu, pod kterým produkt existuje (už obsahuje `/p/` prefix)
- `upgatesId` — numerické ID produktu v Upgatesu (ukládej si ho pro debugging, ale do košíku vkládáme přes `uri`)

### Jak je to **analogické k atyp euroklipu**

Euroklip pro atyp rozměry volá interně totéž:

1. `POST /api/euroclip/resolve` → server spočítá cenu z gridu a sám zavolá rounded_bohemian_product
2. Vrátí `{ code: "id-500", uri: "/p/id-500", upgatesId: 15583, price: { value: 500, ... } }`

U rámu počítáš client-side, takže si `rounded_bohemian_product` **voláš přímo ty**.

### Kdy volat

- **Ne** na každý keystroke — zdržíš UI
- **Ano** po stabilizaci ceny (debounce 350 ms po posledním změněném rozměru/barvě/sklu/podkladu — stejně jako euroklip v [init.js:1033-1044](../euroclips/data/init.js#L1033-L1044))
- Do té doby drž `#buy_btn` **disabled**

### Na co si dát pozor

- Když `rounded_bohemian_product` vrátí 404 (cena mimo rozsah hladin), zobraz
  dialog "Tento rám bohužel neumíme takhle velký vyrobit" — neukazuj
  JS chybu uživateli.
- `uri` je plná cesta včetně `/p/`, takže ji **neprefixuj** znovu. Stačí:
  ```js
  window.location.href = resp.uri + '?addtocart=1&...';
  ```

---

## 10. Přidání do košíku

Stejný mechanismus jako atyp euroklip (viz
[init.js:1253-1280](../euroclips/data/init.js#L1253-L1280)).

### 9.1 Sestavení `productnote`

Uživatel na detailu objednávky uvidí text, který sestavíš z výběru. Pro rám
doporučená struktura (stejný formát, jako euroklip používá pro atyp kódy):

```
{A}x{B} | Rámeček {colorLabel} / sklo {glassLabel} / podklad {baseLabel} ({colorCode}|{glassCode}|{baseCode}|atyp)
```

Příklad:
```
30x40 | Rámeček Dantik Kostička hnědá / sklo Sklo čiré 2 mm / podklad MDF 3 mm (114.hneda|Sklo_2mm.cire|Z4-MDF|atyp)
```

Pravidla:
- Všechny části jsou volitelné — pokud user zvolil "bez skla", sklo vynech
- `|` jako oddělovač jednotlivých komponent v druhé části; oddělovač mezi
  rozměrem a popisem je ` | ` (mezera, pipe, mezera)
- Kód na konci v závorce má pořadí `color|glass|base|atyp` (pro atyp rámy
  je poslední segment vždy literál `atyp`)
- V `productnote` může být pipe `|` i diakritika `č ř ž` — `encodeURIComponent`
  se o to postará.

Viz `frame_model.js::getProductTypeCode()` v [git historii](#section-10) pro
původní implementaci v `komplet|...` tvaru.

### 9.2 Sestavení URL

```js
var ks = parseInt($('#kusy').val(), 10) || 1;
var note = '...'; // viz výše
var returnPath = window.location.pathname; // aby user skončil zpět na konfigurátoru

var cartUrl = clip.getPriceProductUri()
  + '?addtocart=1'
  + '&quantity=' + ks
  + '&productnote=' + encodeURIComponent(note)
  + '&return=' + encodeURIComponent(returnPath);

// flag pro toast po reloadu — init.js ho přečte a zobrazí zelený toast
try { sessionStorage.setItem('euroclip_cart_added', '1'); } catch (e) {}

window.location.href = cartUrl;
```

### 9.3 Co se stane potom

1. Prohlížeč navigate na `{uri}?addtocart=1&...`
2. Upgates přidá položku do košíku a redirect zpět na `returnPath`
3. Stránka se načte znovu — konfigurátor je reset (prázdné rozměry, výchozí typy)
4. `init.js` při startu najde `sessionStorage.euroclip_cart_added === '1'`,
   smaže flag a zobrazí **zelený toast** "Produkt byl přidán do košíku" na 5 s
5. Horní lišta Upgatesu ukazuje aktualizovaný počet kusů v košíku

### 9.4 Ověření před submitem

Dřív než do košíku:

```js
if (clip.getPrice() > 0
    && clip.getUpgatesId() > 0
    && clip.getPriceProductUri()) {
  // OK, pokračuj s cartUrl
} else {
  // ještě se něco nespočítalo — nech buy_btn disabled
  return false;
}
```

---

## 11. Reference na starý kód

Kdybys chtěl vidět, jak frontend dělal ty samé věci před přesunem na API,
podívej se do git historie:

```bash
# klientská pricing logika + definice Frame objektu
git show c8ba221^:euroclips/data/frame_model.js

# HTML struktura původního formuláře
git show c8ba221^:euroclips/data/frame_template.html

# init.js před oříznutím — sekce kolem řádku 285 (getBars, getGoods)
# a kolem řádku 978 (loadování frame_template)
git show c8ba221^:euroclips/data/init.js | less
```

**Neopisuj pricing logiku** z `frame_model.js` — ta se odstěhuje na API
(senior ti řekne, až bude připraven `/api/frame/resolve`). Zajímá tě jen
**UI a naplnění selectů**.

---

## 12. Existující euroklip jako předloha

Aktuální euroklip řešení je **výrazně jednodušší** (jen jeden select typu),
ale principy fetchování jsou stejné:

- [`init.js:285-296`](../euroclips/data/init.js#L285-L296) — fetch configu přes API + cache
- [`init.js:649-674`](../euroclips/data/init.js#L649-L674) — match produktu podle URL
- [`init.js:897-907`](../euroclips/data/init.js#L897-L907) — naplnění `#frame-type` selectu

Tyto řádky jsou tvá předloha — podle nich postav obdobnou logiku, jen s více
selectboxy a dynamickým `#color`.

---

## 13. Checklist před PR

**Naplnění formuláře (sekce 1–7):**
- [ ] Všechny 3 endpointy se volají paralelně (`Promise.all`)
- [ ] Selectboxy jsou naplněny po `window.load`, ne blokují render
- [ ] Změna `#frame-type` dynamicky aktualizuje `#color`
- [ ] Jazyk se bere z `$.euroclip.LANG`
- [ ] `webramovani=true` je v URL obou enum volání
- [ ] Cache v sessionStorage (volitelné, ale doporučené)
- [ ] Fallback na CZ pro chybějící překlady
- [ ] Rozměry > 9 cm (stejná validace jako euroklip)

**ID produktu podle ceny (sekce 8):**
- [ ] Client-side cena je zaokrouhlena (`Math.round`) před posláním do API
- [ ] Volání `rounded_bohemian_product` je debounced (350 ms) — ne per keystroke
- [ ] Během čekání na response je `#buy_btn` disabled
- [ ] 404 response zobrazí dialog, ne JS chybu
- [ ] Finální cena v UI je z response.czk/eur, ne z client-side výpočtu

**Do košíku (sekce 9):**
- [ ] `productnote` obsahuje rozměr, popis v jazyce UI a kódy v závorce
- [ ] URL má `quantity`, `productnote`, `return=<current path>`
- [ ] Před redirectem: `sessionStorage.setItem('euroclip_cart_added', '1')`
- [ ] Submit je chráněn podmínkou (cena > 0, uri, upgatesId)

**Celkové:**
- [ ] Manuální test ve všech třech jazycích (CZ/SK/PL) — stačí dočasně
      přepnout `$.euroclip.LANG` v konzoli
- [ ] Test add-to-cart → stránka se resetuje → zelený toast se zobrazí
- [ ] Košík v headeru Upgatesu ukazuje zvýšený počet položek
