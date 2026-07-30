
var dsend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.send = function(data) {
    dsend.call(this, data);
    if (typeof data === "object" && data !== null && navigator.userAgent.search("Firefox") === -1){
      //console.log(data);
      var hasIdshp = data.has("id_shipping") || data.has("id_payment");
      if (hasIdshp) {
          console.log('victory');
          // reload the current page
          window.location.reload();
      }
    }
}


/* čistým javascriptem v patičce skrýt a zablokovat důležité funkce webu, které se budou přetěžovat */


function defer(method) {
  if (window.jQuery) {
    method();
  } else {
    setTimeout(function () {
      defer(method)
    }, 50);
  }
}
//window.onload = function() {

if (document.readyState === "complete" || document.readyState === "loaded" || document.readyState === "interactive") {
  defer(fn);
} else {
  window.addEventListener('DOMContentLoaded', function () {
    defer(fn);
  });
}

function fn() {



  if (typeof ($.euroclip) === "undefined") {
    $.euroclip = {};
  }



  $.euroclip.DEBUG = true;
  $.euroclip.HOLDER = $('[data-designer-module="product-detail-top-2"]').first();
  if ($.euroclip.HOLDER.length === 0) {
    $.euroclip.HOLDER = $('#detail .c1303').first(); // fallback pro starý eshop
  }
  // pozn.: pro novou Upgates šablonu (Frame/DEK), která nemá ani jeden z výše
  // uvedených selektorů, se holder vytvoří líně až ve $.euroclip.setup()
  // (jen pro produkt konfigurátoru) — viz fallback v bloku currentProduct !== null
  $.euroclip.WEB_PREFIX = "";

  if (window.location.hostname.indexOf(".sk") > 0) {
    $.euroclip.LANG = "sk";
    $.euroclip.SCRIPT_SOURCE = '/shop-data/js/configurator/euroclip/';
    $.euroclip.SHOP_SOURCE = '/shop-data/js/configurator/';
    $.euroclip.ADDR_BASKET = $.euroclip.WEB_PREFIX + "dantik-sk/e-basket";
    $.euroclip.ADDR_BASKET_2 = $.euroclip.WEB_PREFIX + "dantik-sk/e-shipping";
    $.euroclip.ADDR_BASKET_3 = $.euroclip.WEB_PREFIX + "dantik-sk/e-delivery";
    $.euroclip.ID_SITE = 9862; //ID uživatele eshop-rychle
  } else {
    $.euroclip.LANG = "cz";
    $.euroclip.SCRIPT_SOURCE = '/shop-data/js/configurator/euroclip/';
    $.euroclip.SHOP_SOURCE = '/shop-data/js/configurator/';
    $.euroclip.ADDR_BASKET = $.euroclip.WEB_PREFIX + "dantik-cz/e-basket";
    $.euroclip.ADDR_BASKET_2 = $.euroclip.WEB_PREFIX + "dantik-cz/e-shipping";
    $.euroclip.ADDR_BASKET_3 = $.euroclip.WEB_PREFIX + "dantik-cz/e-delivery";
    $.euroclip.ID_SITE = 21110; //ID uživatele eshop-rychle
  }

  $.euroclip.currentProduct = null; // předvybraný typ produktu, celý objekt z config.csv, podle URL, nemění se... TODO: Má smysl pro rámečky?
  $.euroclip.currentGroup = null;	// vybraná skupina produktů (nelze měnit!) může být frame/euroklip/base/glass


  $.euroclip.log = function (data) {
    if ($.euroclip.DEBUG) {
      if (typeof console !== "undefined") {
        console.log(data);
      }
    }
  };
  $.euroclip.showDialog = function (text) {
    alert(text);
  }
  $.euroclip.showCartSuccess = function () {
    var msgs = {
      cz: "Produkt byl přidán do košíku",
      sk: "Produkt bol pridaný do košíka",
      pl: "Produkt został dodany do koszyka"
    };
    var text = msgs[$.euroclip.LANG] || msgs["cz"];
    var toast = $('<div class="ecf-toast-success">' + text + '</div>');
    toast.css({
      position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
      background: '#43a047', color: '#fff', padding: '14px 32px',
      borderRadius: '8px', fontSize: '1.05em', fontWeight: '600',
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)', zIndex: 99999,
      opacity: 0, transition: 'opacity 0.3s'
    });
    $('body').append(toast);
    setTimeout(function () { toast.css('opacity', 1); }, 10);
    setTimeout(function () {
      toast.css('opacity', 0);
      setTimeout(function () { toast.remove(); }, 300);
    }, 5000);
  }
  // toast po redirectu z addtocart — flag nastavený před window.location.href
  try {
    if (window.sessionStorage && sessionStorage.getItem('euroclip_cart_added') === '1') {
      sessionStorage.removeItem('euroclip_cart_added');
      $.euroclip.log('[euroclip] cart-added flag detected, showing toast');
      $.euroclip.showCartSuccess();
    }
  } catch (e) {}
  $.euroclip.validateInput = function (elem) {
    var $elem = $(elem);
    var val = $elem.val().replace(".", ",").replace(/[^\d,]/g, '')
    $elem.val(val);
    return val;
  }
  /**
   * Parse rozměrů z URL hashe.
   * Formáty:
   *   #20x30                 kompaktní (NxM)
   *   #a=20&b=30             parametrický (aliasy x= a y=)
   *   #sirka=20&vyska=30     české aliasy (i s diakritikou: šířka/výška)
   * Vrací { a: number, b: number } nebo null.
   */
  function parseHashSizes(hash) {
    if (!hash) return null;
    var raw = String(hash).replace(/^#\/?/, '');
    if (!raw) return null;

    var compact = raw.match(/^(\d+(?:[.,]\d+)?)x(\d+(?:[.,]\d+)?)$/i);
    if (compact) {
      return { a: parseFloat(compact[1].replace(',', '.')), b: parseFloat(compact[2].replace(',', '.')) };
    }

    var params = {};
    raw.split('&').forEach(function (pair) {
      var eq = pair.indexOf('=');
      if (eq > 0) {
        var key = pair.slice(0, eq).toLowerCase();
        try {
          key = decodeURIComponent(key).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        } catch (e) {}
        params[key] = decodeURIComponent(pair.slice(eq + 1));
      }
    });
    var a = params.a || params.x || params.sirka;
    var b = params.b || params.y || params.vyska;
    if (a && b) {
      var fa = parseFloat(String(a).replace(',', '.'));
      var fb = parseFloat(String(b).replace(',', '.'));
      if (fa > 0 && fb > 0) return { a: fa, b: fb };
    }
    return null;
  }
  $.euroclip.formatPrice = function (price) {
    price = parseFloat(price).toFixed(2).replace(".", ",");
    return price.replace(/./g, function (c, i, a) {
      return i && c !== "," && ((a.length - i) % 3 === 0) ? ' ' + c : c;
    });
  }
  $.euroclip.getCurrancy = function () {
    if (this.LANG === "cz") {
      return "Kč";
    } else {
      return "EUR";
    }
  }
  $.euroclip.getVAT = function () {
    if (this.LANG === "cz") {
      return parseFloat(this.settings.vat_cz);
    } else {
      return parseFloat(this.settings.vat_sk);
    }
  }
  $.euroclip.getRate = function () {
    if (this.LANG === "cz") {
      return 1;
    } else {
      return parseFloat(this.settings.eur_rate);
    }
  }
  $.euroclip.getCookie = function (cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }


  var href = window.location.pathname;

  if (window.location.hash === "#lukas") {
    console.log("DEBUG MODE");
    $.euroclip.DEBUG = true;
  }

  if (window.location.hash.indexOf("#buy=") == 0) {
    //$.euroclip.DEBUG = true;
    //$.euroclip.log("DEBUG + BUY MODE");

    //#buy=120;ks=2;note=15x15+Ramecek+Dantik+drevena+lista+plexisklo+(11_komplet_7273515_H2_atyp_15.0x15.0_PL_PLEXI)
    var item = decodeURIComponent(window.location.hash).split(";");
    if (item.length == 3 && item[1].indexOf("ks=") == 0 && item[2].indexOf("note=") == 0) {

      $(".basket-table").addClass("load-mask");
      var price = parseInt(item[0].replace("#buy=", ""));
      $.euroclip.log(price);
      price = price / 100;
      var ks = parseInt(item[1].replace("ks=", ""));
      var note = item[2].replace("note=", "").replaceAll("+", " ");

      var url = "https://apiramari.profiramari.cz/api/rounded_bohemian_product/" + price + "/" + $.euroclip.LANG;

      $.euroclip.log(price);
      $.euroclip.log(ks);
      $.euroclip.log(note);

      // upgates: vložení do košíku přes URL
      $.ajax({
        type: "GET",
        url: url,
        dataType: "json",
        headers: {
          Accept: "application/json"
        },
        success: function (data) {
          var productUri = data.uri.replace(/^\//, "/p/");
          var cartUrl = productUri
            + "?addtocart=1"
            + "&quantity=" + ks
            + "&productnote=" + encodeURIComponent(note)
            + "&return=cart";
          $.euroclip.log("upgates cart redirect: " + cartUrl);
          window.location.href = cartUrl;
        },
        error: function () {
          $.euroclip.log("error");
          window.location.href = "/cart";
        }
      });
    }
  }


  /* 
   * OSTICKET
   
   $("body").append(
   '<div class="ost">'+
   '<div id="ost__header" class="ost__header">'+
   'Máte dotaz? Rádi Vám poradíme!'+
   '</div>'+
   '<iframe class="ost__iframe" src="https://osticket.ramari.cz/opencustom.php" title="Dantik helpdesk"></iframe>'+
   '</div>'
   );
   
   $("#ost__header").click(function(e) {
   e.preventDefault();
   $(this).parent().toggleClass("active");
   });
   */


  if ($.euroclip.LANG == "cz" && !$.euroclip.getCookie("geoModalClose")) {
    $.ajax({
      crossDomain: true,
      type: 'GET',
      url: "https://ip2c.org/s", //188.120.29.0
      dataType: "text",
      success: function (data) {
        if (data.indexOf("Slovakia") != "-1") {

          var modal = '' +
                  '<div class="c285 modal show" id="geo-modal"  tabindex="-1" role="dialog">' +
                  '	<div class="c13 c286" style="max-width: 600px; max-height: 700px;" role="document">' +
                  '		<div class="c287 c16">' +
                  '			<div class="c289">' +
                  '				<div class="c290" style="color: #0a3bc2">Nakupujte pohodlne v Eurách</div>' +
                  '				<div class="c291" style="color: #787878"><p>Navštívte našu slovenskú webovú stránku<br> na adrese <a href="https://www.dantik.sk">www.dantik.sk</a><br> a nakupujte oveľa pohodlnejšie.</p>' +
                  '					<p><a href="https://www.dantik.sk" class="btn c39">Prejdite na www.dantik.sk</a></p></div>' +
                  '				<button type="button" class="c1535 geo-modal-close" aria-label="Zavrieť">Zavrieť</button>' +
                  '			</div>' +
                  '			<button type="button" class="c295 geo-modal-close c1522" aria-label="Zavrieť"><span class="c1536 c1523" aria-hidden="true"></span></button>' +
                  '		</div>' +
                  '	</div>' +
                  '</div>' +
                  '<div class="c880 show" id="geo-modal-backdrop"></div>';

          $("body").append(modal);

          $(".geo-modal-close").click(function (e) {
            e.preventDefault();
            $("#geo-modal, #geo-modal-backdrop").fadeOut();

            var date = new Date();
            date.setMonth(date.getMonth() + 2);
            document.cookie = 'geoModalClose=true; path=/; expires=' + date.toGMTString();
          });

        }
      }
    });
  }


  if (!sessionStorage.getItem('config_v2')) {
    var getConfig = $.ajax({
      crossDomain: true,
      type: 'GET',
      url: 'https://apiramari.profiramari.cz/api/configurator/config?lang=' + $.euroclip.LANG,
      dataType: "json",
      success: function (data) {
        // API vrací { lang, settings, products } — klient používá settings + products
        var payload = { settings: data.settings, products: data.products };
        sessionStorage.setItem('config_v2', JSON.stringify(payload));
        $.extend($.euroclip, payload);
      }
    });
  }



  /*
   * KOŠÍK
   */
  if (href == "/" + $.euroclip.ADDR_BASKET) {

    var notes = new Array();

    $('#basket').on("submit", "#basket__form", function () {
      refreshNotes(); //aktualizovat pole s poznámkami (kvůli odebírání položek)
      var date = new Date();
      date.setDate(date.getDate() + 1);
      document.cookie = 'notes=' + JSON.stringify(notes) + '; path=/; expires=' + date.toGMTString();
    });

    $.euroclip.log("Basket loaded!");

    function refreshNotes() {
      var $notes = $('.basket-table textarea[id^="basket__note"]');
      notes = new Array();
      $notes.each(function () {
        var note = $(this).val();
        if (note != "") {
          if (/atyp/.test(note) || /SET/.test(note)) {
            $(this).prev(".custom-note").remove();
            $(this).before("<span class='custom-note'><strong>" + note.replace(" (", "</strong> <small class='c853'>(") + "</small></span>");
            var $prev = $(this).closest(".c1380").prev();
            if (/atyp/.test(note)) {
            $prev.find("a.c1385").replaceWith("<span class='c1385'>Zboží na míru</span>");
            $prev.find(".in-stock").text("Skladem");
            }
            notes.push(Array(encodeURI(note), $prev.find("input.c850").val()));
          }
        }
      });
    }

    refreshNotes();
    $("body").on("DOMSubtreeModified", "#basket", function () {
      if ($('#basket .custom-note').first().length == 0) {
        refreshNotes();
      }
    });

  } else if (href == "/" + $.euroclip.ADDR_BASKET_2) {

    $.euroclip.log("Shipping loaded!");


    $.ajax({
      crossDomain: true,
      type: 'GET',
      url: $.euroclip.SHOP_SOURCE + 'config_cart.json',
      dataType: "json",
      success: function (data) {
        var notes = $.euroclip.getCookie("notes");
        if (notes) {
          notes = JSON.parse(notes);
        } else {
          notes = new Array();
        }
        var hiddenPost = false;
        var hiddenBalikovna = false;
        var hiddenPPL = false;
        var fragile = false;
        var hiddenAtyp = false;
        var totalWeight = 0;

        $("#basket-order .c130").each(function () {
          var note = $(this).text().trim().match(/^([\d]{1,3})(ks|set|tyčí) (.*)/); // rozparsuju počet ks
          if (note != null) {
            notes.push(Array(note[3], note[1]));
          }
        });

        $.euroclip.log(notes);

        for (var i = 0; i < notes.length; i++) {
          if (notes[i] == "") {
            continue;
          }
//          console.log(data);
          var result = notes[i][0].match(/SET.*_([\d]{1,3}[-]?[\d]?) ?x ?([\d]{1,3}[-]?[\d]?)_/i);
//          console.log(result);

          if (!result) {
            result = notes[i][0].match(/([\d]{1,3}[\.,]?[\d]?) ?x ?([\d]{1,3}[\.,]?[\d]?)/i);
//             result = notes[i][0].match(/_([\d]{1,3}[-]?[\d]?) ?x ?([\d]{1,3}[-]?[\d]?)_/i);
          } 
          if (result) {
            if (result[1] > result[2]) {
              var a = parseFloat(result[1].replace('-','.'));
              var b = parseFloat(result[2].replace('-','.'));
            } else {
              var a = parseFloat(result[2].replace('-','.'));
              var b = parseFloat(result[1].replace('-','.'));
            }

            $.euroclip.log(a + " x " + b);
//            console.log(a + " x " + b);
            // max rozměry pro balíkovnu jsou cca 70 x 50
            if (a > data["max_balikovna_a"] || b > data["max_balikovna_b"]) {
              hiddenBalikovna = true;
              hideBalikovna();
            }

            // max rozměry pro poštu jsou cca 100 x 70
            if (a > data["max_post_a"] || b > data["max_post_b"]) {
              hiddenPost = true;
              hidePost();
            }

            // max rozměry pro ppl jsou cca 120 x 60
            if (a > data["max_ppl_a"] || b > data["max_ppl_b"]) {
              hiddenPPL = true;
              hidePPL();
            }

            // max kruhový rozměr = délka + 2xšířka + 2xvýška (7cm) = 300
            $.euroclip.log("Kruhový obvod: " + (2 * b + a + data["max_post_circuit_width"]));
            if ((2 * b + a + data["max_post_circuit_width"]) > data["max_post_circuit"]) {
              hiddenPost = true;
              hidePost();
            }

            // rozlišení sklo x plexi, vypočítání celkové váhy
            var re = new RegExp(data["re_glass"], "ig");
//            console.log(data["re_glass"]);
            if (re.test(notes[i][0])) {
              // skrytí pošty podle max velikosti skleněného rámu
              // max rozměry pro sklo pro poštu jsou 42 x 29.7
              if (a > data["max_glass_a"] || b > data["max_glass_b"]) {
//                console.log("Glass - křehké!");
                $.euroclip.log("Glass - křehké!");
                fragile = true;
                hideNotFragile();
              }
              totalWeight += a * b / 100 / 100 * data["weight_glass"] * notes[i][1];
            } else {
              totalWeight += a * b / 100 / 100 * data["weight_plexi"] * notes[i][1];
            }
          }

          // skrýt dopravu neumožňující 200cm+
          var re = new RegExp(data["re_200"], "g");
          if (re.test(notes[i][0])) {
            hiddenBalikovna = true;
            hideBalikovna();
            hiddenPPL = true;
            hidePPL();
            $.euroclip.log("Přes 2 m");
          }
          // skrýt dopravu neumožňující 300cm+
          var re = new RegExp(data["re_300"], "g");
          if (re.test(notes[i][0])) {
            hiddenBalikovna = true;
            hideBalikovna();
            hiddenPPL = true;
            hidePPL();
            hiddenPost = true;
            hidePost();
            $.euroclip.log("Přes 3 m");
          }
        }

        $.euroclip.log("Celková váha: " + totalWeight);

        // zakázání všech doprav, kde by byla váha nadlimitní
        hideOverweight();

        for (var i = 0; i < notes.length; i++) {
          var re = new RegExp(data["re_atyp"], "ig");
          if (re.test(notes[i][0])) {
            console.log(notes[i][0]);
            hiddenAtyp = true;
            hideAtyp();
            break;
          }
        }

        $("body").on("DOMSubtreeModified", "#basket-shipping__delivery-wrapper", function () {
          if (hiddenPost === true) {
            hidePost();
          }
          if (hiddenBalikovna === true) {
            hideBalikovna();
          }
          if (hiddenPPL === true) {
            hidePPL();
          }
          if (fragile === true) {
            hideNotFragile();
          }
          hideOverweight();
        });

        $("body").on("DOMSubtreeModified", "#basket-shipping__payment-wrapper", function () {
          if (hiddenAtyp === true) {
            hideAtyp();
          }
        });


        // po načtení všech omezení zobrazím zbylé možnosti
        $("body").addClass("basket-loaded");
        selectVisibleShipping();
        selectVisiblePayment();


        function selectVisibleShipping() {
          let to = setTimeout(__selectVisibleShipping, 100);
        }


        function __selectVisibleShipping() {
          if ($("[name=id_shipping]:checked").is(":hidden")) {
            $("[name=id_shipping]:visible").first().click();
          }
          //console.log($("[name=id_shipping]:checked").attr('data-name'));
        }
        function selectVisiblePayment() {
          if ($("[name=id_payment]:checked").is(":hidden")) {
            $("[name=id_payment]:visible").first().click();
          }
        }


        function hidePost() {
          $(".basket-shipping__group-delivery img").each(function () {
            var re = new RegExp(data["re_post"], "ig");
            if (re.test($(this).attr("src"))) {
              $(this).parent().parent().hide();
            }
          });
          selectVisibleShipping();
          $.euroclip.log("HidePost");
        }
        function hideBalikovna() {
          $(".basket-shipping__group-delivery img").each(function () {
            var re = new RegExp(data["re_balikovna"], "ig");
            if (re.test($(this).attr("src"))) {
              $(this).parent().parent().hide();
            }
          });
          selectVisibleShipping();
          $.euroclip.log("HideBalikovna");
        }
        function hidePPL() {
          $(".basket-shipping__group-delivery img").each(function () {
            var re = new RegExp(data["re_ppl"], "ig");
            if (re.test($(this).attr("src"))) {
              $(this).parent().parent().hide();
            }
          });
          selectVisibleShipping();
          $.euroclip.log("HidePPL");
        }
        function hideOverweight() {
          $(".basket-shipping__group-delivery img").each(function () {
            var result = $(this).attr("alt").match(/.+do ([0-9]{1,2}) kg/i);
            if (result && result[1] < totalWeight) {
              $.euroclip.log("hide " + $(this).attr("alt"));
              $(this).parent().parent().hide();
            }
          });
          selectVisibleShipping();
          $.euroclip.log("hideOverweight");
        }
        function hideAtyp() {
          $(".basket-shipping__group-payment img").each(function () {
            var re = new RegExp(data["re_dobirka"], "ig");
            if (re.test($(this).attr("alt"))) {
              $(this).parent().parent().hide();
            }
          });
          selectVisiblePayment();
          $.euroclip.log("hideAtyp");
        }
        function hideNotFragile() {
          $(".basket-shipping__group-delivery img").each(function () {
            var re = new RegExp(data["re_allow_glass"], "ig");
            if (!re.test($(this).attr("alt"))) {
              $(this).parent().parent().hide();
            }
          });
          selectVisibleShipping();
          $.euroclip.log("Hide all not fragile");
        }
      },
      error: function (data, text) {
        $.euroclip.log(data);
        $.euroclip.log(text);
      }
    });

  } else if ($.euroclip.LANG == "sk" && href == "/" + $.euroclip.ADDR_BASKET_3) {

    $.euroclip.log("Delivery loaded!");

    checkICDPH();
    $("#basket-delivery__input-element\\[ic_dph\\]").keyup(function () {
      checkICDPH();
    });

    function checkICDPH() {
      // Platba Bez DPH - musí vyplnit IČ DPH
      if ($("#basket-order-sticky .c146").text().indexOf("Bez DPH") != -1) {
        if ($("#basket-delivery__input-element\\[ic_dph\\]").val() == "") {
          $("#basket-order-sticky button[type='submit']").attr("disabled", true);
          $.euroclip.showDialog('Pre zvolený spôsob platby "Bez DPH" je nutné vyplniť IČ DPH!');
        } else {
          $("#basket-order-sticky button[type='submit']").attr("disabled", false);
        }

        // normální platba - nesmí být IČ DPH
      } else {
        if ($("#basket-delivery__input-element\\[ic_dph\\]").val() != "") {
          $("#basket-order-sticky button[type='submit']").attr("disabled", true);
          $.euroclip.showDialog("Pri nákupe na firmu s IČ DPH je nutné v predchádzajúcom kroku zvoliť platbu Bez DPH.");
        } else {
          $("#basket-order-sticky button[type='submit']").attr("disabled", false);
        }
      }

    }
  } else if ($.euroclip.LANG == "cz" && href == "/" + $.euroclip.ADDR_BASKET_3) {

    $("#basket-delivery__input-element\\[ico\\]").on("input", function () {
      var val = $(this).val();
      setTimeout(function () {
        if (val.length >= 7 && val.length <= 8) {
          document.getElementById("id-load-from-ares-ico").click();
        }
      }, 700);
    });

    /*
     * NĚCO JINÉHO - euroklip
     */
  } else {

    $.euroclip.setup = function () {

      var defaultSizeA = defaultSizeB = 0;

      /*
       * ŘÍDÍCÍ DIV (přednost před URL)
       *
       * Editor vloží do obsahu libovolné stránky / článku v Upgates marker:
       *   <div class="euroclip-config" data-euroclip-code="EKP_K_atyp"></div>
       * volitelně s předvyplněnými rozměry (cm):
       *   <div class="euroclip-config" data-euroclip-code="EKP_K_atyp"
       *        data-size-a="15" data-size-b="20"></div>
       *
       * Konfigurátor se pak vykreslí přímo do tohoto divu (HOLDER), variantu
       * určuje výhradně data-euroclip-code a URL stránky je nepodstatná. Funguje
       * tedy i mimo detail produktu (např. /euroklip-plexi-cire). Když marker
       * není přítomen, spadne se na původní detekci podle URL (níže).
       */
      $.euroclip.log("HOLDER: " + $.euroclip.HOLDER.length + " elements, href: " + href);
      $.euroclip.log("products count: " + ($.euroclip.products ? $.euroclip.products.length : "UNDEFINED"));

      var $ecMarker = $('.euroclip-config[data-euroclip-code]').first();
      if ($ecMarker.length) {
        var ecWantedCode = $ecMarker.attr('data-euroclip-code');
        for (var i = 0; i < $.euroclip.products.length; i++) {
          if ($.euroclip.products[i].code === ecWantedCode) {
            $.euroclip.currentProduct = $.euroclip.products[i];
            $.euroclip.currentGroup = $.euroclip.products[i].group; // frame / euroklip / glass / base
            $.euroclip.log("MARKER MATCH: " + ecWantedCode);
            break;
          }
        }
        if ($.euroclip.currentProduct === null) {
          $.euroclip.log("MARKER: neznámý data-euroclip-code='" + ecWantedCode + "'");
        }
        $.euroclip.HOLDER = $ecMarker; // mount konfigurátoru přímo do markeru
        var ecDa = parseFloat(($ecMarker.attr('data-size-a') || '').replace(',', '.'));
        var ecDb = parseFloat(($ecMarker.attr('data-size-b') || '').replace(',', '.'));
        if (ecDa > 0 && ecDb > 0) { defaultSizeA = ecDa; defaultSizeB = ecDb; }
      }

      /*
       * PRODUKT Z KONFIGU (fallback podle URL, jen když nebyl řídící div)
       */
      if ($.euroclip.currentProduct === null) {
        for (var i = 0; i < $.euroclip.products.length; i++) {
          if (href.endsWith($.euroclip.products[i].url)) {
            $.euroclip.currentProduct = $.euroclip.products[i];
            $.euroclip.currentGroup = $.euroclip.products[i].group; // group je frame, nebo euroklip, nebo glass, nebo base
            $.euroclip.log("MATCH: " + $.euroclip.products[i].code + " | " + $.euroclip.products[i].url);
            break;
          }
        }
      }

      // zkusím parsovat adresu, pokud jsem nenašel v config
      if ($.euroclip.currentProduct === null) {
        $.euroclip.log("NO MATCH for href: " + href);
        //EKP-A-9X13
        var result = href.match(/\/(EKP|EKS)-(A|K)-atyp-([\d]{1,3})x([\d]{1,3})/i);
        if (result) {
          for (var i = 0; i < $.euroclip.products.length; i++) {
            if ($.euroclip.products[i].code.toLowerCase() === result[1].toLowerCase() + "_" + result[2].toLowerCase() + "_atyp") {
              $.euroclip.currentProduct = $.euroclip.products[i];
              $.euroclip.currentGroup = $.euroclip.products[i].group;
              break;
            }
          }
          defaultSizeA = parseInt(result[3]);
          defaultSizeB = parseInt(result[4]);
        }
      }

      // override rozměrů z URL hashe — sdílení odkazů s předvyplněnými rozměry
      // podporované formáty:
      //   #20x30        kompaktní
      //   #a=20&b=30    parametrický (alias x=, y=)
      var hashSizes = parseHashSizes(window.location.hash);
      if (hashSizes) {
        defaultSizeA = hashSizes.a;
        defaultSizeB = hashSizes.b;
        $.euroclip.log("hash sizes: " + defaultSizeA + "x" + defaultSizeB);
      }

      // když rozměry nepřišly zvenčí (marker data-size-*, URL atyp, hash),
      // použij jako default A4 (21 x 29,7 cm)
      if (!(defaultSizeA > 0 && defaultSizeB > 0)) {
        defaultSizeA = 21;
        defaultSizeB = 29.7;
        $.euroclip.log("default A4 sizes: 21x29.7");
      }

      // pokud víme typ - můžeme spustit
      if ($.euroclip.currentProduct !== null) {

        // Vlastní mount konfigurátoru. Vyčleněn do funkce, protože holder
        // nemusí existovat hned: na nové Upgates šabloně (Frame/DEK) se detail
        // produktu (.pd-info) dorenderovává AJAXem až po DOMContentLoaded, takže
        // při čtení configu z cache (config_v2) může setup() proběhnout dřív,
        // než holder vznikne. Holder se proto zajišťuje až níže (viz ecMount).
        var startConfigurator = function () {

        // guard proti dvojímu mountu — jinak by se duplikovaly položky <select>
        if (document.getElementById('euroclipconfig')) {
          return;
        }

        // Zrušit pojistný timeout na reload (konfigurátor se úspěšně spustil)
        if (typeof window.euroclipConfiguratorTimeout !== 'undefined') {
          clearTimeout(window.euroclipConfiguratorTimeout);
        }

        // U mountu přes řídící div ponecháme vlastní nadpis stránky/článku;
        // přejmenování na "Konfigurátor" dává smysl jen na detailu produktu.
        if (!$ecMarker.length) {
          var $h1 = $("h1.c716.c1335");
          if ($h1.length === 0) $h1 = $.euroclip.HOLDER.closest('[data-designer-module]').parent().find('h1').first(); // UpGates
          if ($h1.length === 0) $h1 = $.euroclip.HOLDER.prevAll('h1').first(); // další fallback
          if ($h1.length === 0) $h1 = $("h1").first();
          $.euroclip.log("H1 found: " + $h1.length + " | text: " + $h1.text());
          $h1.text("Konfigurátor");
        }
        $.euroclip.HOLDER.html('<img src="' + $.euroclip.SCRIPT_SOURCE + 'loading.svg" style="width:64px;height:64px;margin:100px auto">').addClass("euroclipconfig").attr('id', 'euroclipconfig');

        // Odebrat předběžnou třídu z head scriptu, konfigurátor se nyní opravdu spouští
        document.documentElement.classList.remove('euroclip-configurator');

        $.euroclip.Frame = function (defaultSizeA, defaultSizeB) {
          this.type = $.euroclip.currentProduct;
          this.sizeA = defaultSizeA;
          this.sizeB = defaultSizeB;
          this.price = 0;
          this.purePrice = 0;
          this.priceProductId = 0;
          this.priceProductUri = "";
          this.standard = false;
          this.xhr = null;
          this.complete = true;
          this.hasFrame = true;
          this.hasGlass = true;
          this.hasHooks = true;
          this.hasBase = true;

          this.init();
        };

        $.euroclip.Frame.prototype = {
          init: function () {
            $("#frame-type").val(this.type.code);
            if (this.sizeA > 8 && this.sizeB > 8) {
              $("#size-a").val(this.sizeA);
              $("#size-b").val(this.sizeB);
            }
            this.setType(this.type);
            this.refreshSizeLabels();
            this.refreshPrice();
          },
          isStandard: function () {
            return this.standard;
          },
          getType: function () {
            return this.type;
          },
          getTypeLabel: function () {
            return this.type.label;
          },
          getSizeA: function () {
            if (this.sizeA > this.sizeB) {
              return this.sizeB;
            }
            return this.sizeA;
          },
          getSizeB: function () {
            if (this.sizeA > this.sizeB) {
              return this.sizeA;
            }
            return this.sizeB;
          },
          getOriginalSizeA: function () {
            return this.sizeA;
          },
          getOriginalSizeB: function () {
            return this.sizeB;
          },
          getPrice: function () {
            return this.price;
          },
          getPriceProductId: function () {
            return this.priceProductId;
          },
          getPriceProductUri: function () {
            return this.priceProductUri;
          },
          getProductCode: function () {
            if (this.getSizeA() > 0 && this.getSizeB() > 0) {
              if (this.standard) {
                return this.getProductTypeCodeWithoutAtyp() + "|" + this.getOriginalSizeA() + "x" + this.getOriginalSizeB();
              } else {
                return this.getProductTypeCode() + "|" + this.getOriginalSizeA() + "x" + this.getOriginalSizeB();
              }
            }
            return "";
          },
          refreshProductCode: function () {
            $("#product-code").text(this.getProductCode());
          },
          setType: function (type) {
            for (var i = 0; i < $.euroclip.products.length; i++) {
              if ($.euroclip.products[i].code === type) {
                this.type = $.euroclip.products[i];
                break;
              }
            }
            $(".euroclipconfig .stock").text(this.type.stock);
            $(".euroclipconfig .label-clip-type").text(this.getTypeLabel());
            this.updateImage();

            return this;
          },
          setSizeA: function (size) {
            this.sizeA = this.validateSize(size);
            this.refreshPrice();
            this.refreshSizeLabels();

            return this;
          },
          setSizeB: function (size) {
            this.sizeB = this.validateSize(size);
            this.refreshPrice();
            this.refreshSizeLabels();

            return this;
          },
          refreshSizeLabels: function () {
            $(".euroclipconfig .label-size-a").text(this.getSizeA().toString().replace(".", ","));
            $(".euroclipconfig .label-size-b").text(this.getSizeB().toString().replace(".", ","));

            return this;
          },
          validateSize: function (size) {
            size = size.toString().replace(",", ".");
            size = Math.abs(parseFloat(size).toFixed(1));
            size = size || 0;
            if (size < 9) {
              size = 9;
            }
            return size;
          }
        }

        if ($.euroclip.currentGroup === "euroklip") {

          var template = $.ajax({
            crossDomain: true,
            type: 'GET',
            url: $.euroclip.SCRIPT_SOURCE + 'euroclip_template.html?v='+ new Date().getTime(), /* TODO: template možná stejný??? */
            dataType: "html",
            success: function (data) {
              $.euroclip.HOLDER.html(data);
            }
          });
          var specific_model = $.ajax({
            crossDomain: true,
            type: 'GET',
            url: $.euroclip.SCRIPT_SOURCE + 'euroclip_model.js',
            dataType: "script"
          });
          // ceník i katalog standardů nyní poskytuje /api/euroclip/resolve
          $.when(template, specific_model).done(function () {
            $.euroclip.load(defaultSizeA, defaultSizeB);
          });

        }



        $.euroclip.load = function (defaultSizeA, defaultSizeB) {

          // naplnění typů euroklipů
          var $frameType = $("#frame-type");
          $frameType.empty(); // idempotence — žádné duplicitní položky při opakovaném load()
          // config vrací stejné euroklipy pod více URL aliasy (CZ/SK varianty),
          // takže se stejný code v products opakuje — do <select> patří každý jen jednou
          var seenCodes = {};
          $($.euroclip.products).each(function (i, item) {
            if (item.group === "euroklip" && !seenCodes[item.code]) {
              seenCodes[item.code] = true;
              if (item.code == $.euroclip.currentProduct.code) {
                $frameType.append('<option value="' + item.code + '" selected>' + item.label + '</option>');
              } else {
                $frameType.append('<option value="' + item.code + '">' + item.label + '</option>');
              }
            }
          });


          // založení objektu
          var clip = new $.euroclip.Frame(defaultSizeA, defaultSizeB);


          // funkce pro aktualizaci popisu zboží
          function updateTextContent() {
            var url = "";
            for (var i = 0; i < $.euroclip.products.length; i++) {
              if ($.euroclip.products[i].code === clip.getType().code) {
                url = $.euroclip.products[i].url;
                break;
              }
            }

            if (url != "") {
              var $desc = $("#detail-anchor-description");
              $.ajax({
                type: "GET",
                url: "/" + $.euroclip.WEB_PREFIX + url.replace("\/", ""),
                dataType: "html",
                success: function (data) {
                  if (data != null) {
                    var $data = $(data);
                    if ($.euroclip.LANG == "sk") {
                      $data.find("#detail-anchor-description img[src^='\/fotky21110']").each(function () {
                        $(this).attr('src', $(this).attr('src').replace('fotky21110', 'fotky9862'));
                      });
                    }
                    $desc.html($data.find("#detail-anchor-description").children());
                    $desc.next(".c783").html($data.find("#detail-anchor-description").next(".c783").children());
                  }
                }
              });
            }
          }

          // změna typu euroklipu
          $frameType.change(function () {
            if ($(this).val() != 0) {
              clip.setType($(this).val());
              clip.refreshPrice();
            } else {
              clip.refreshPrice();
              $("#description").html("");
            }
            updateTextContent();
          });

          $("#colors").hide();

          $("#size-a, #size-b").keydown(function (e) {
            // omezení všeho kromě číslic, ,. , šipek, backspace, del, tab
            var keyCode = (e.keyCode ? e.keyCode : e.which);
            if (!(keyCode == 229 || (keyCode > 95 && keyCode < 106) || (keyCode > 47 && keyCode < 58) || keyCode == 188 || keyCode == 110 || keyCode == 190 || keyCode == 37 || keyCode == 39 || keyCode == 46 || keyCode == 8 || keyCode == 9)) {
              e.preventDefault();
            }
          });
          // debounce size changes so typing isn't interrupted by the resolve request;
          // apply both sizes at once so a B-first-then-A sequence doesn't leave one stale
          var sizeDebounce = null;
          var scheduleSizeCommit = function () {
            clearTimeout(sizeDebounce);
            sizeDebounce = setTimeout(function () {
              clip.sizeA = clip.validateSize($.euroclip.validateInput($("#size-a").get(0)) || 0);
              clip.sizeB = clip.validateSize($.euroclip.validateInput($("#size-b").get(0)) || 0);
              clip.refreshSizeLabels();
              clip.refreshPrice();
            }, 350);
          };
          $("#size-a").keyup(scheduleSizeCommit).focusout(function () {
            if (parseFloat($(this).val()) < 9) {
              $(this).val(9).keyup();
              $.euroclip.showDialog("Omlouváme se, minimální šířka obrázku je 9 cm.");
            }
          });

          $("#size-b").keyup(scheduleSizeCommit).focusout(function () {
            if (parseFloat($(this).val()) < 9) {
              $(this).val(9).keyup();
              $.euroclip.showDialog("Omlouváme se, minimální výška obrázku je 9 cm.");
            }
          });

          $("#kusy").keydown(function (e) {
            // omezení všeho kromě číslic, šipek, backspace, del, tab
            var keyCode = (e.keyCode ? e.keyCode : e.which);
            if (!(keyCode == 229 || (keyCode > 95 && keyCode < 106) || (keyCode > 47 && keyCode < 58) || keyCode == 37 || keyCode == 39 || keyCode == 46 || keyCode == 8 || keyCode == 9)) {
              e.preventDefault();
            }
          });

          $("#complete").change(function () {
            clip.setComplete($(this).is(":checked"));
            clip.refreshPrice();
          });




          // nákup
          $('#euroclipForm').on('keyup', function (event) {
            if (event.keyCode === 13 && event.shiftKey) {
              $('#buy_btn').click();
              event.stopPropagation();
            }
            return false;
          });


          $('#buy_btn').on('click', function (e) {
            e.stopPropagation();

            if (clip.getPrice() > 0 && clip.getPriceProductId() > 0 && clip.getPriceProductUri()) {

              var note = "";
              if (!clip.isStandard()) {
                note = clip.getOriginalSizeA() + "x" + clip.getOriginalSizeB() + " | " + clip.getTypeLabel() + " (" + clip.getProductCode() + ")";
              }

              /* pokud nastala chyba a objednává se prázdný konfugurátor */
              if (clip.getPriceProductId() == 5 || clip.getPriceProductId() == 10 || clip.getPriceProductId() == 15 || clip.getPriceProductId() == 20) {
                return false;
              }

              if (!clip.isStandard() && note == "") {
                //nemelo by nastat
                return false;
              }

              // upgates: vložení do košíku přes veřejnou URL s productnote;
              // return=<konfigurátor> aby uživatel zůstal na stránce a formulář se zresetoval;
              // flag pro toast v sessionStorage přežije redirect a přečte ho init.js při reloadu
              var ks = parseFloat($("#kusy").val()).toFixed(0);
              var cartUrl = clip.getPriceProductUri()
                + "?addtocart=1"
                + "&quantity=" + ks
                + (note ? "&productnote=" + encodeURIComponent(note) : "")
                + "&return=" + encodeURIComponent(window.location.pathname);
              try { sessionStorage.setItem('euroclip_cart_added', '1'); } catch (e) {}
              $.euroclip.log("upgates cart redirect: " + cartUrl);
              window.location.href = cartUrl;
            }

            return false;
          });

          $.euroclip.log("Loaded!");

        };
        }; // konec startConfigurator

        // Zajistit holder a teprve pak spustit konfigurátor.
        if ($.euroclip.HOLDER.length) {
          // starší šablona / starý eshop — holder už v DOM je
          startConfigurator();
        } else {
          // Nová Upgates šablona (Frame/DEK): vytvoříme vlastní holder v pravém
          // sloupci .pd-info. Ten ale chodí AJAXem se zpožděním, proto na něj
          // počkáme (max ~10 s). Děláme to jen pro produkt konfigurátoru, takže
          // na běžných produktech / v košíku se nic neschovává.
          var ecTries = 0;
          var ecMount = function () {
            if (document.getElementById('euroclipconfig')) return; // už namountováno
            var $pdInfo = $('.pd-info').first();
            if ($pdInfo.length) {
              // schovat standardní cenu + košíkový formulář — nahrazuje je konfigurátor
              $pdInfo.find('#snippet--pricesAjax1, #frm-productForm').hide();
              // schovat levý sloupec s fotkou produktu — konfigurátor má vlastní náhled,
              // jinak by se obrázek zobrazoval dvakrát
              $('.row.gy-5 > .pd-photos').hide();
              // pravý sloupec roztáhnout na plnou šířku (grid-agnostic, ať nezůstane prázdná půlka)
              $pdInfo.css({ flex: '0 0 100%', maxWidth: '100%' });
              $.euroclip.HOLDER = $('<div data-designer-module="product-detail-top-2"></div>').prependTo($pdInfo);
              $.euroclip.log('[euroclip] holder vytvořen v .pd-info (nová šablona)');
              startConfigurator();
            } else if (ecTries++ < 100) {
              setTimeout(ecMount, 100); // čekat na AJAX render detailu
            } else {
              $.euroclip.log('[euroclip] .pd-info se neobjevil, konfigurátor nelze namountovat');
            }
          };
          ecMount();
        }
      } else {
        // něco jiného - běžný produkt?
        var $h1check = $("h1.c716.c1335");
        if ($h1check.length === 0) $h1check = $("h1").first();
        if ($h1check.text().indexOf("Zboží na míru") != -1) {
          var $formRemove = $("form.c751");
          if ($formRemove.length === 0) $formRemove = $.euroclip.HOLDER.find("form").first();
          $formRemove.remove();
        }
      }
    }

    if (sessionStorage.getItem('config_v2')) {
      $.extend($.euroclip, JSON.parse(sessionStorage.getItem('config_v2')));
      $.euroclip.setup();
    } else {
      $.when(getConfig).done(function () {
        $.euroclip.setup();
      });
    }



  }

  var notes2add = '';

  $('form').each(function (i, f) {
    //console.log(f.action);
    var founded = false;
    if (f.action.includes($.euroclip.ADDR_BASKET)) {
      var sp = $(this).find('span').each(function (i, s) {
        //console.log($(s).html());
        //val = $(s).html();
        val = $(s).text();
        const re = new RegExp('SET[0-9]{3,}', 'g');

        if (re.test(val)) {
          notes2add = val;
          founded = true;
}
      });
    }

  });
  if (href != "/" + $.euroclip.ADDR_BASKET) {

    $('form').each(function (i, f) {
      if (f.action.includes($.euroclip.ADDR_BASKET)) {
        //var inp = $("<input name='poznamka' type='hidden' value='"+notes2add+"' />");
        //$(this).append(inp);

        $(f).submit(function (event) {



          if (notes2add == '') {
            console.log('get detail');
            var prdct = $(f).closest('.product');
            if (prdct) {
              var href = $(prdct).find('a').attr('href');
              //console.log(href);
              if (href) {
                $.ajax({
                  type: "GET",
                  async: false,
                  url: href,
                  dataType: "text",
                  success: function (data, ev, xhr) {
                    $('span', data).each(function (i, s) {
                      //var val = $(s).html();
                      var val = $(s).text();
                      const re = new RegExp('SET[0-9]{3,}', 'g');
                      if (re.test(val)) {
                        console.log(val);
                        notes2add = val;
                      }
                    });
                  }
                });
              }
            }
            console.log(notes2add);
            if (notes2add == '') {
              return true;
            }
          }

          console.log(notes2add);
          event.preventDefault();
          event.stopPropagation();
          var ks = $(f).find('input[name=kusy]').val() || 1;

          // upgates: vložení do košíku přes URL produktu
          // získáme URL produktu z action formuláře nebo z aktuální stránky
          var productUrl = window.location.pathname;
          var cartUrl = productUrl
            + "?addtocart=1"
            + "&quantity=" + ks
            + "&productnote=" + encodeURIComponent(notes2add)
            + "&return=cart";
          $.euroclip.log("upgates cart redirect: " + cartUrl);
          window.location.href = cartUrl;
          return false;

        });
      }
    });
  }
}
