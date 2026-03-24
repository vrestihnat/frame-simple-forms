
$.euroclip.BlindFrame = function () {
	this.sizeA = 0;
	this.sizeB = 0;
	this.format = "";
	this.side = "";
	this.price = 0;
	this.priceProductId = 0;
	this.priceProductUri = "";
	this.bar = 2000;
	this.xhr = null;
	this.xhr2 = null;

	this.init();
};

$.euroclip.BlindFrame.prototype = {
	init: function () {
		this.refreshPrice();
	},
	refreshPrice: function () {
		$("#buy_btn").attr("disabled", true); //aby nešlo koupit vždy během výpočtu
		this.refreshProductCode();

		if (this.getSizeA() === 0 || this.getSizeB() === 0 || this.format =="" || (this.format == "dleobr" && this.side == "")) {
			this.price = 0;
			this.redrawPrice();
		} else {
			var that = this;

			if (this.xhr != null)
				this.xhr.abort();

			this.xhr = $.ajax({
				crossDomain: true,
				type: 'GET',
				async : false,
				url: "https://api.ramari.cz/api/enum_blindframe_plate_price/649/" + this.getSizeA() + "/" + this.getSizeB() + "/" + $.euroclip.LANG,
				headers: {
					Accept: "application/json"
				},
				success: function (res) {
					var price = res.cena;
					price /= $.euroclip.getRate();
					price *= $.euroclip.getVAT();

					if (price > 0) {

						that.priceProductId = 0;

						$.ajax({
							crossDomain: true,
							async : false,
							type: 'GET',
							url: "https://api.ramari.cz/api/rounded_bohemian_product/" + Math.round(price) + "/" + $.euroclip.LANG,
							headers: {
								Accept: "application/json"
							},
							success: function (data) {
								if ($.euroclip.LANG === "cz") {
									that.price = data["czk"];
								} else {
									that.price = data["eur"];
								}

								// upgates: uložíme URI produktu, nepotřebujeme pid
								that.priceProductUri = data["uri"].replace(/^\//, "/p/");
								that.priceProductId = 1; // pro zpětnou kompatibilitu (> 0 check)
								$.euroclip.log("priceProductUri " + that.priceProductUri);
								$("#buy_btn").attr("disabled", false);

								that.redrawPrice();
							}
						});
					}

				}
			});
		}
		$.euroclip.log(this);
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
	setSizeA: function (size) {
		this.sizeA = this.validateSize(size);
		this.refreshPrice();
	},
	setSizeB: function (size) {
		this.sizeB = this.validateSize(size);
		this.refreshPrice();
	},
	getSizeA: function () {
		return this.sizeA;
	},
	getSizeB: function () {
		return this.sizeB;
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
	setFormat: function (format) {
		this.format = format;
		this.refreshPrice();
	},
	setSide: function (side) {
		this.side = side;
		this.refreshPrice();
	},
	getSide: function () {
		return this.side;
	},
	getProductCode: function () {
		if (this.getSizeA() > 0 && this.getSizeB() > 0 && !(this.format == "dleobr" && this.side == "")) {
			if (this.format == "presne") {
				var tail = "";
			} else {
				var tail = "_" + this.side;
			}
			return "nap_" + this.bar + "_" + this.getSizeA() + "x" + this.getSizeB() + "_" + this.format + tail + "_atyp";
		}
		return "";
	},
	getLabel: function () {
		return "Napínání plátna offline";
	},
	refreshProductCode: function () {
		$("#product-code").text(this.getProductCode());
	},
	redrawPrice: function () {
		$("#tensioning .price-value").html($.euroclip.formatPrice(this.price) + "&nbsp;" + $.euroclip.getCurrancy());
		$("#tensioning .price-novat-value").html($.euroclip.formatPrice(this.price / $.euroclip.getVAT()) + "&nbsp;" + $.euroclip.getCurrancy());
	}
}


$.euroclip.loadTensioning = function() {

	$.euroclip.log("tensioning model loaded");


	var blindFrame = new $.euroclip.BlindFrame();

	$("#tg-size-a, #tg-size-b").keydown(function (e) {
		// omezení všeho kromě číslic, ,. , šipek, backspace, del, tab
		var keyCode = (e.keyCode ? e.keyCode : e.which);
		if (!(keyCode == 229 || (keyCode > 95 && keyCode < 106) || (keyCode > 47 && keyCode < 58) || keyCode == 188 || keyCode == 110 || keyCode == 190 || keyCode == 37 || keyCode == 39 || keyCode == 46 || keyCode == 8 || keyCode == 9)) {
			e.preventDefault();
		}
	});
	$("#tg-size-a").keyup(function () {
		blindFrame.setSizeA($.euroclip.validateInput(this));
	}).focusout(function () {
		if ($(this).val() < 9) {
			$(this).val(9).keyup();
			$.euroclip.showDialog("Omlouváme se, minimální šířka obrázku je 9 cm.");
		}
	});

	$("#tg-size-b").keyup(function () {
		blindFrame.setSizeB($.euroclip.validateInput(this));
	}).focusout(function () {
		if ($(this).val() < 9) {
			$(this).val(9).keyup();
			$.euroclip.showDialog("Omlouváme se, minimální výška obrázku je 9 cm.");
		}
	});

	$(".tg .btn").click(function(e) {
		e.preventDefault();
		$(this).closest(".tg-block").find(".btn").removeClass("active");
		$(this).addClass("active");
	});
	$("#tg-presne").click(function(e) {
		$(".step--3 .step__count").text("2");
		$(".step--3").slideDown();
		$(".step--2").slideUp();
		blindFrame.setFormat("presne");
		//blindFrame.setSide("");
	});
	$("#tg-dleobr").click(function(e) {
		$(".step--3 .step__count").text("3");
		if(blindFrame.getSide() == "") {
			$(".step--3").slideUp();
		}
		$(".step--2").slideDown();
		blindFrame.setFormat("dleobr");
	});
	$("#tg-barva").click(function(e) {
		$(".step--3").slideDown();
		blindFrame.setSide("barva");
	});
	$("#tg-bily").click(function(e) {
		$(".step--3").slideDown();
		blindFrame.setSide("bily");
	});



	$('#buy_btn').on('click', function (e) {
		e.stopPropagation();
		if (blindFrame.getPrice() > 0 && blindFrame.getPriceProductId() > 0 && blindFrame.getPriceProductUri()) {

			var note = blindFrame.getSizeA() + "x" + blindFrame.getSizeB() + " | " + blindFrame.getLabel() + " (" + blindFrame.getProductCode() + ")";

			/* přidání poznámky do cookie */
			var notes = $.euroclip.getCookie("notes");
			if (notes) {
				notes = JSON.parse(notes);
			} else {
				notes = new Array();
			}
			notes.push(note);
			var date = new Date();
			date.setDate(date.getDate()+1);
			document.cookie = 'notes=' + JSON.stringify(notes) + '; path=/; expires=' + date.toGMTString();

			// upgates: vložení do košíku přes URL
			var cartUrl = blindFrame.getPriceProductUri()
				+ "?addtocart=1"
				+ "&quantity=1"
				+ "&productnote=" + encodeURIComponent(note)
				+ "&return=cart";
			window.location.href = cartUrl;
		}

		return false;
	});

};
