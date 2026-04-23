# Rám na míru — průvodce pro juniora

Tento dokument popisuje, **jak získat z API všechna data potřebná pro naplnění
formuláře "Rám na míru"** (typy rámů, barvy, skla, podklady). Výpočet ceny a
samotné přidání do košíku **nejsou v tomto zadání** — ty řeší samostatný
endpoint (návrh `/api/frame/resolve`) a budou předmětem dalšího úkolu.

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
│   → nic nevoláme (cena se počítá na serveru až při        │
│     "Do košíku" — mimo scope tohoto zadání)                │
├────────────────────────────────────────────────────────────┤
│ User klikne "Do košíku"                                    │
│   → TODO: POST /api/frame/resolve { … } (samostatná etapa) │
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

## 5. Detekce jazyka

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

## 6. Cache v sessionStorage

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

## 7. Na co si dát pozor

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

## 8. Reference na starý kód

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

## 9. Existující euroklip jako předloha

Aktuální euroklip řešení je **výrazně jednodušší** (jen jeden select typu),
ale principy fetchování jsou stejné:

- [`init.js:285-296`](../euroclips/data/init.js#L285-L296) — fetch configu přes API + cache
- [`init.js:649-674`](../euroclips/data/init.js#L649-L674) — match produktu podle URL
- [`init.js:897-907`](../euroclips/data/init.js#L897-L907) — naplnění `#frame-type` selectu

Tyto řádky jsou tvá předloha — podle nich postav obdobnou logiku, jen s více
selectboxy a dynamickým `#color`.

---

## 10. Checklist před PR

- [ ] Všechny 3 endpointy se volají paralelně (`Promise.all`)
- [ ] Selectboxy jsou naplněny po `window.load`, ne blokují render
- [ ] Změna `#frame-type` dynamicky aktualizuje `#color`
- [ ] Jazyk se bere z `$.euroclip.LANG`
- [ ] `webramovani=true` je v URL obou enum volání
- [ ] Cache v sessionStorage (volitelné, ale doporučené)
- [ ] Fallback na CZ pro chybějící překlady
- [ ] Rozměry > 9 cm (stejná validace jako euroklip)
- [ ] Manuální test ve všech třech jazycích (CZ/SK/PL) — stačí dočasně
      přepnout `$.euroclip.LANG` v konzoli
