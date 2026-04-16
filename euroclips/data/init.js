
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
  $.euroclip.WEB_PREFIX = "";

  if (window.location.hostname.indexOf(".sk") > 0) {
    $.euroclip.LANG = "sk";
    $.euroclip.SCRIPT_SOURCE = 'https://data.ramari.cz/wholesale/frame-simple-forms/euroclips/data/';
    $.euroclip.SHOP_SOURCE = 'https://data.ramari.cz/wholesale/frame-simple-forms/euroclips/';
    $.euroclip.ADDR_BASKET = $.euroclip.WEB_PREFIX + "dantik-sk/e-basket";
    $.euroclip.ADDR_BASKET_2 = $.euroclip.WEB_PREFIX + "dantik-sk/e-shipping";
    $.euroclip.ADDR_BASKET_3 = $.euroclip.WEB_PREFIX + "dantik-sk/e-delivery";
    $.euroclip.ID_SITE = 9862; //ID uživatele eshop-rychle
  } else {
    $.euroclip.LANG = "cz";
    $.euroclip.SCRIPT_SOURCE = 'https://data.ramari.cz/wholesale/frame-simple-forms/euroclips/data/';
    $.euroclip.SHOP_SOURCE = 'https://data.ramari.cz/wholesale/frame-simple-forms/euroclips/';
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
  $.euroclip.validateInput = function (elem) {
    var $elem = $(elem);
    var val = $elem.val().replace(".", ",").replace(/[^\d,]/g, '')
    $elem.val(val);
    return val;
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

      var url = "https://api.ramari.cz/api/rounded_bohemian_product/" + price + "/" + $.euroclip.LANG;

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


  if (!sessionStorage.getItem('components')) {
    var getBars = $.ajax({
      crossDomain: true,
      type: 'GET',
      url: "https://api.ramari.cz/api/enum_mouldings?webramovani=true",
      headers: {
        Accept: "application/json"
      },
      success: function (data) {
        var parsedBars = [];
        for (var i = 0; i < data.length; i++) {
          var obj = {};

          obj["profile"] = parseInt(data[i]["profil"]);
          obj["code"] = data[i]["cis3"];
          obj["color_cz"] = data[i]["webnazevcz"];
          obj["color_sk"] = data[i]["webnazevsk"];
          obj["price_vat"] = parseFloat(data[i]["cenamo"]);
          obj["price_fix"] = parseFloat(data[i]["cena1ram"]);
          obj["img_frame"] = "../fotos/RamarskyMaterial/Listy/" + data[i]["cis3"] + ".jpg";
          obj["img_profile"] = "../fotos/RamarskyMaterial/Profily/profil" + obj["profile"] + ".jpg";
          obj["border"] = parseInt(data[i]["okraj1"]) / 10;

          parsedBars.push(obj);
        }

        $.euroclip.bars = parsedBars;
      }
    });

    var getGoods = $.ajax({
      crossDomain: true,
      type: 'GET',
      url: "https://api.ramari.cz/api/enumgoods?webramovani=true",
      headers: {
        Accept: "application/json"
      },
      success: function (data) {
        var parsedGlasses = [];
        var parsedBases = [];

        for (var i = 0; i < data.length; i++) {
          var obj = {};

          obj["code"] = data[i]["klasifikace"];
          obj["name_cz"] = data[i]["webnazevcz"];
          obj["name_sk"] = data[i]["webnazevsk"];
          obj["price_vat"] = parseFloat(data[i]["cenamo"]);
          obj["price_fix"] = parseFloat(data[i]["mofix"]);
          obj["url"] = data[i]["url"];
          obj["img"] = "../fotos/RamarskyMaterial/Deskovy_material/" + data[i]["klasifikace"] + ".jpg";

          if (data[i]["jesklo"] == true) {
            parsedGlasses.push(obj);
          } else if (data[i]["jepodklad"] == true) {
            if (parseInt(data[i]["rozmerx"]) > parseInt(data[i]["rozmery"])) {
              obj["upTo"] = parseInt(data[i]["rozmery"]) + "x" + parseInt(data[i]["rozmerx"]);
            } else {
              obj["upTo"] = parseInt(data[i]["rozmerx"]) + "x" + parseInt(data[i]["rozmery"]);
            }
            parsedBases.push(obj);
          }
        }

        function sortByPrice(a, b) {
          if (a.price_vat > b.price_vat) {
            return 1;
          } else {
            return -1;
          }
        }

        $.euroclip.glasses = parsedGlasses;
        $.euroclip.bases = parsedBases.sort(sortByPrice);
      }
    });

    $.when(getBars, getGoods).done(function () {
      sessionStorage.setItem('components', JSON.stringify([$.euroclip.bars, $.euroclip.glasses, $.euroclip.bases]));
    });

  } else {
    var obj = JSON.parse(sessionStorage.getItem('components'));
    $.euroclip.bars = obj[0];
    $.euroclip.glasses = obj[1];
    $.euroclip.bases = obj[2];
  }


  if (!sessionStorage.getItem('config')) {
    var getConfig = $.ajax({
      crossDomain: true,
      type: 'GET',
      url: $.euroclip.SHOP_SOURCE + 'config.json?v=' + new Date().getTime(), // cache-busting',
      dataType: "json",
      success: function (data) {
        sessionStorage.setItem('config', JSON.stringify(data));
        $.extend($.euroclip, data);
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
     * Napínání plátna
     */
  } else if (href == "/napnuti-obrazu-na-platne-postou" /*+ $.euroclip.ADDR_BASKET_3*/) {
    $.euroclip.log("Napínání");

    $.euroclip.HOLDER.html('<img src="' + $.euroclip.SCRIPT_SOURCE + 'loading.svg" style="width:64px;height:64px;margin:100px auto">').addClass("tensioning").attr('id', 'tensioning');

    var template = $.ajax({
      crossDomain: true,
      type: 'GET',
      url: $.euroclip.SCRIPT_SOURCE + 'tensioning_template.html',
      dataType: "html",
      success: function (data) {
        $.euroclip.HOLDER.html(data);
        if ($.euroclip.currentGroup == "euroklip") {
          $("#colors").hide();
        }
      }
    });
    var specific_model = $.ajax({
      crossDomain: true,
      type: 'GET',
      url: $.euroclip.SCRIPT_SOURCE + 'tensioning_model.js',
      dataType: "script"
    });

    if (sessionStorage.getItem('config')) {
      $.extend($.euroclip, JSON.parse(sessionStorage.getItem('config')));
      $.when(template, specific_model).done(function () {
        $.euroclip.loadTensioning();
      });
    } else {
      $.when(template, specific_model, getConfig).done(function () {
        $.euroclip.loadTensioning();
      });
    }

    /*
     * NĚCO JINÉHO - euroklip nebo frame
     */
  } else {

    $.euroclip.setup = function () {

      var defaultSizeA = defaultSizeB = 0;

      /*
       * PRODUKT Z KONFIGU
       */
      $.euroclip.log("HOLDER: " + $.euroclip.HOLDER.length + " elements, href: " + href);
      $.euroclip.log("products count: " + ($.euroclip.products ? $.euroclip.products.length : "UNDEFINED"));
      for (var i = 0; i < $.euroclip.products.length; i++) {
        if (href.endsWith($.euroclip.products[i].url)) {
          $.euroclip.currentProduct = $.euroclip.products[i];
          $.euroclip.currentGroup = $.euroclip.products[i].group; // group je frame, nebo euroklip, nebo glass, nebo base
          $.euroclip.log("MATCH: " + $.euroclip.products[i].code + " | " + $.euroclip.products[i].url);
          break;
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

      // pokud víme typ - můžeme spustit
      if ($.euroclip.currentProduct !== null) {

        // Zrušit pojistný timeout na reload (konfigurátor se úspěšně spustil)
        if (typeof window.euroclipConfiguratorTimeout !== 'undefined') {
          clearTimeout(window.euroclipConfiguratorTimeout);
        }

        var $h1 = $("h1.c716.c1335");
        if ($h1.length === 0) $h1 = $.euroclip.HOLDER.closest('[data-designer-module]').parent().find('h1').first(); // UpGates
        if ($h1.length === 0) $h1 = $.euroclip.HOLDER.prevAll('h1').first(); // další fallback
        if ($h1.length === 0) $h1 = $("h1").first();
        $.euroclip.log("H1 found: " + $h1.length + " | text: " + $h1.text());
        $h1.text("Konfigurátor");
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
            if ($.euroclip.currentGroup == "euroklip" || this.getHasFrame()) {
              return this.type.label;
            } else {
              return "";
            }
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

            // krom euroklipů je volání přesunuto k výpočtu ceny
            if ($.euroclip.currentGroup == "euroklip") {
              $(".euroclipconfig .label-clip-type").text(this.getTypeLabel());
              this.updateImage();
            }

            return this;
          },
          setSizeA: function (size) {
            this.sizeA = this.validateSize(size);
            if ($.euroclip.currentGroup != "euroklip") {
              this.refreshBases();
            }
            this.refreshPrice();
            this.refreshSizeLabels();

            return this;
          },
          setSizeB: function (size) {
            this.sizeB = this.validateSize(size);
            if ($.euroclip.currentGroup != "euroklip") {
              this.refreshBases();
            }
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
          },
          refreshColors: function () {}, // pouze pro frame
          refreshGlasses: function () {} // pouze pro frame
        }

        if ($.euroclip.currentGroup === "euroklip") {

          ajaxCsvConfig = function (filename, type, floatItems) {
            return $.ajax({
              crossDomain: true,
              type: 'GET',
              url: $.euroclip.SHOP_SOURCE + filename + '.csv',
              dataType: "text",
              success: function (csv) {
                var lines = csv.trim().split(/\r\n|\n/);
                var result = [];
                var headers = lines[0].split(";");

                for (var i = 1; i < lines.length; i++) {
                  var obj = {};
                  var currentline = lines[i].split(";");

                  for (var j = 0; j < headers.length; j++) {
                    if (floatItems) {
                      obj[headers[j]] = parseFloat(currentline[j].replace(",", "."));
                    } else {
                      obj[headers[j]] = currentline[j].replace(",", ".");
                    }
                  }
                  result.push(obj);
                }
                if (type === "prices") {
                  $.euroclip.prices = result;
                } else if (type === "prices_standard") {
                  $.euroclip.prices_standard = result;
                }
              }
            });
          }

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

        } else {
          var template = $.ajax({
            crossDomain: true,
            type: 'GET',
            url: $.euroclip.SCRIPT_SOURCE + 'frame_template.html',
            dataType: "html",
            success: function (data) {
              $.euroclip.HOLDER.html(data);
            }
          });
          var specific_model = $.ajax({
            crossDomain: true,
            type: 'GET',
            url: $.euroclip.SCRIPT_SOURCE + 'frame_model.html',
            dataType: "script"
          });

          if ($.euroclip.bars && $.euroclip.glasses && $.euroclip.bases) {
            $.when(template, specific_model).done(function () {
              $.euroclip.load(defaultSizeA, defaultSizeB);
            });
          } else {
            $.when(getBars, getGoods, template, specific_model).done(function () {
              $.euroclip.load(defaultSizeA, defaultSizeB);
            });
          }

        }



        $.euroclip.load = function (defaultSizeA, defaultSizeB) {

          // naplnění typů
          var $frameType = $("#frame-type");

          if ($.euroclip.currentGroup == "euroklip") {
            $($.euroclip.products).each(function (i, item) {
              if ($.euroclip.currentGroup == item.group) { // pouze euroklipy
                if (item.code == $.euroclip.currentProduct.code) {
                  $frameType.append('<option value="' + item.code + '" selected>' + item.label + '</option>');
                } else {
                  $frameType.append('<option value="' + item.code + '">' + item.label + '</option>');
                }
              }
            });
          } else {
            $($.euroclip.products).each(function (i, item) {
              if (item.group == "frame") { // pouze rámy, ne euroklipy, skla, podklady
                if (item.group == $.euroclip.currentProduct.group) {
                  $frameType.append('<option value="' + item.code + '" selected>' + item.label + '</option>');
                } else {
                  $frameType.append('<option value="' + item.code + '">' + item.label + '</option>');
                }
              }
            });
          }


          // založení objektu
          var clip = new $.euroclip.Frame(defaultSizeA, defaultSizeB);


          // funkce pro aktualizaci popisu zboží
          function updateTextContent() {
            var url = "";
            if ($.euroclip.currentGroup == "euroklip") {
              for (var i = 0; i < $.euroclip.products.length; i++) {
                if ($.euroclip.products[i].code === clip.getType().code) {
                  url = $.euroclip.products[i].url;
                  break;
                }
              }
            } else if (clip.getHasFrame()) {
              url = clip.type.url;
            } else if (clip.getHasGlass()) {
              url = clip.glass.url;
            } else if (clip.getHasBase()) {
              url = clip.base.url;
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

          // odchytávání událostí - změna typu (Euroklip - SKLA; Frame: galerka, kostička...)
          $frameType.change(function () {
            if ($(this).val() != 0) {
              clip.setType($(this).val());
              if ($.euroclip.currentGroup != "euroklip") {
                clip.refreshColors();
                clip.setHasFrame(true);
                $("#color").change();
                $("#colors").show();
              } else {
                $("#colors").hide();
                clip.refreshPrice();
              }
            } else {
              clip.setHasFrame(false);
              $("#colors").hide();
              clip.refreshPrice();

              $("#description").html("");
            }
            updateTextContent();
          });

          if ($.euroclip.currentGroup != "euroklip") {

            // naplnění barev (typů lišt)
            if ($.euroclip.bars) {
              clip.refreshColors();
              $("#colors").show();

              // odchytávání událostí
              $("#color").change(function () {
                clip.setColor($(this).val());
                clip.refreshPrice();
              }).change();
            }

            // naplnění skel
            if ($.euroclip.glasses) {
              clip.refreshGlasses();
              $("#glasses").show();

              // odchytávání událostí
              $("#glass").change(function () {
                if ($(this).val() != 0) {
                  clip.setGlass($(this).val());
                  clip.setHasGlass(true);
                } else {
                  clip.setHasGlass(false);
                }
                clip.refreshPrice();
                updateTextContent();
              }).change();
            }

            // podklady
            if ($.euroclip.bases) {
              clip.refreshBases();
              $("#base").change(function () {
                if ($(this).val() != 0) {
                  clip.setBase($(this).val());
                  clip.setHasBase(true);
                } else {
                  clip.setHasBase(false);
                }
                clip.refreshPrice();
                updateTextContent();
              }).change();
            }

            /* háčky a podklady */

            $("#hook").change(function () {
              clip.setHasHooks($(this).val());
              clip.refreshPrice();
            });
          } else {
            $("#colors").hide();
          }

          $("#size-a, #size-b").keydown(function (e) {
            // omezení všeho kromě číslic, ,. , šipek, backspace, del, tab
            var keyCode = (e.keyCode ? e.keyCode : e.which);
            if (!(keyCode == 229 || (keyCode > 95 && keyCode < 106) || (keyCode > 47 && keyCode < 58) || keyCode == 188 || keyCode == 110 || keyCode == 190 || keyCode == 37 || keyCode == 39 || keyCode == 46 || keyCode == 8 || keyCode == 9)) {
              e.preventDefault();
            }
          });
          $("#size-a").keyup(function () {
            clip.setSizeA($.euroclip.validateInput(this));
          }).focusout(function () {
            if (parseFloat($(this).val()) < 9) {
              $(this).val(9).keyup();
              $.euroclip.showDialog("Omlouváme se, minimální šířka obrázku je 9 cm.");
            }
          });

          $("#size-b").keyup(function () {
            clip.setSizeB($.euroclip.validateInput(this));
          }).focusout(function () {
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


          /*
           * pouze podklad - produkt
           */
          if ($.euroclip.currentGroup == "base") {
            $("#complete").prop("checked", false).change();
            $("#frame-type, #glass").val(0).change();

            $("#complete2-checkbox").show();
            $("#frames, #colors, #glasses, #complete-checkbox").hide();

            $("#base").val($.euroclip.currentProduct.code).change();

            $("#complete2").change(function () {
              if ($(this).is(":checked")) {
                $("#frames, #glasses").show();
              } else {
                $("#frames, #colors, #glasses").hide();
                $("#frame-type, #glass").val(0).change();
              }
            });
          }
          /*
           * pouze sklo - produkt
           */
          if ($.euroclip.currentGroup == "glass") {
            $("#complete").prop("checked", false).change();
            $("#frame-type, #base").val(0).change();

            $("#complete2-checkbox").show();
            $("#frames, #colors, #bases, #complete-checkbox").hide();

            $("#glass").val($.euroclip.currentProduct.code).change();

            $("#complete2").change(function () {
              if ($(this).is(":checked")) {
                $("#frames, #bases").show();
              } else {
                $("#frames, #colors, #bases").hide();
                $("#frame-type, #glass").val(0).change();
              }
            });
          }





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

            if (clip.getPrice() > 0 && clip.getPriceProductId() > 0) {

              var note = "";
              if (!clip.isStandard()) {
                note = clip.getOriginalSizeA() + "x" + clip.getOriginalSizeB() + " | " + clip.getTypeLabel() + " (" + clip.getProductCode() + ")";
              }

              /* pokud nastala chyba a objednává se prázdný konfugurátor */
              /* TODO: zde by měly být asi ID všech konfigurátorů...?? */
              if (clip.getPriceProductId() == 5 || clip.getPriceProductId() == 10 || clip.getPriceProductId() == 15 || clip.getPriceProductId() == 20) {
                return false;
              }

              /* přidání poznámky do cookie */
              var notes = $.euroclip.getCookie("notes");
              if (notes) {
                notes = JSON.parse(notes);
              } else {
                notes = new Array();
              }
              notes.push(encodeURI(note));
              var date = new Date();
              date.setDate(date.getDate() + 1);

              document.cookie = 'notes=' + JSON.stringify(notes) + '; path=/; expires=' + date.toGMTString();
              if (!clip.isStandard() && note == "") {
                //nemelo by nastat
                return false;
              }
              // upgates: vložení do košíku přes URI produktové stránky
              var ks = parseFloat($("#kusy").val()).toFixed(0);
              var cartUrl = clip.getPriceProductUri()
                + "?addtocart=1"
                + "&quantity=" + ks
                + "&productnote=" + encodeURIComponent(note)
                + "&return=cart";
              $.euroclip.log("upgates cart redirect: " + cartUrl);
              window.location.href = cartUrl;
            }

            return false;
          });

          $.euroclip.log("Loaded!");

        };
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

    if (sessionStorage.getItem('config')) {
      $.extend($.euroclip, JSON.parse(sessionStorage.getItem('config')));
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
