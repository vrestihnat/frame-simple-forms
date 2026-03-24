$.extend($.euroclip.Frame.prototype, {
	refreshPrice: function () {
    $.euroclip.log("fm::refreshPrice");
		this.updateLabelClip();
		this.updateImage();


		if (this.getSizeA() === 0 || this.getSizeB() === 0) {
			this.price = 0;
			$(".label-sizes").hide();

			$(".euroclipconfig .price-value").html($.euroclip.formatPrice(this.price) + "&nbsp;" + $.euroclip.getCurrancy());
			$(".euroclipconfig .price-novat-value").html($.euroclip.formatPrice(this.price / $.euroclip.getVAT()) + "&nbsp;" + $.euroclip.getCurrancy());
      $("#buy_btn").attr("disabled", true);
		} else {
			$.euroclip.log("výroba na míru");
			$.euroclip.log(this);

			var result = 0;
			var obvod = 2 * (this.getSizeA() + this.getSizeB()) / 100; // m
			var plocha = this.getSizeA() * this.getSizeB() / 10000;	// m2

			if (this.getHasFrame()) {
				var sirka_ramu = parseFloat(this.color.border) / 100 * 8;	// m
				var spotreba = (obvod + sirka_ramu) * parseFloat($.euroclip.settings.bars_waste); // m
				var cena_ram = (spotreba * this.color.price_vat + this.color.price_fix) * parseFloat($.euroclip.settings.price_coef) * $.euroclip.getVAT();
			} else {
				var cena_ram = 0;
			}



			if (this.getHasGlass()) {
				var cena_sklo = (plocha * this.glass.price_vat + this.glass.price_fix) * parseFloat($.euroclip.settings.price_coef) * $.euroclip.getVAT();
			} else {
				var cena_sklo = 0;
			}



			if (this.getHasBase()) {
				var cena_podklad = (plocha * this.base.price_vat + this.base.price_fix) * parseFloat($.euroclip.settings.price_coef) * $.euroclip.getVAT();
			} else {
				var cena_podklad = 0;
			}



			if (this.getHasHooks()) {
				for (var i = 0; i < $.euroclip.settings.hooks.length; i++) {
					if (this.getOriginalSizeA() < $.euroclip.settings.hooks[i].upTo) {
						break;
					}
				}
				if (i >= $.euroclip.settings.hooks.length) {
					i = $.euroclip.settings.hooks.length - 1;
				}
				var cena_hacky = parseFloat($.euroclip.settings.hooks[i].price_vat) * parseFloat($.euroclip.settings.price_coef) * $.euroclip.getVAT();
			} else {
				var cena_hacky = 0;
			}




			if ($.euroclip.DEBUG) {
				var container = $("<div id='temp-price'></div>");
				container.append("Cena rám: " + cena_ram + "<br>");
				container.append("Cena sklo: " + cena_sklo + "<br>");
				container.append("Cena podklad: " + cena_podklad + "<br>");
				container.append("Cena háčky: " + cena_hacky + "<br>");
				$("#temp-price").remove();
				$("#img-clip-type").parent().parent().append(container);
			}



			var result = (cena_ram + cena_sklo + cena_podklad + cena_hacky) / $.euroclip.getRate();
      $.euroclip.log("result "+result);
      $.euroclip.log("purePrice "+this.purePrice);

			if (result > 0) {
				if (result != this.purePrice) {
          $("#buy_btn").attr("disabled", true); //aby nešlo koupit vždy během výpočtu
					this.purePrice = result;

					var that = this;

					if (this.xhr != null)
						this.xhr.abort();
					this.xhr = $.ajax({
						crossDomain: true,
						async : false,
						type: 'GET',
						url: "https://api.ramari.cz/api/rounded_bohemian_product/" + Math.round(result) + "/" + $.euroclip.LANG,
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

							$(".euroclipconfig .price-value").html($.euroclip.formatPrice(that.price) + "&nbsp;" + $.euroclip.getCurrancy());
							$(".euroclipconfig .price-novat-value").html($.euroclip.formatPrice(that.price / $.euroclip.getVAT()) + "&nbsp;" + $.euroclip.getCurrancy());
						}
					});
				}
				$(".label-sizes").show();

			} else {
				this.price = 0;
				$.euroclip.showDialog("Omlouváme se, na základě zadaných parametrů nelze rám vyrobit.");
				$(".label-sizes").hide();

				$(".euroclipconfig .price-value").html($.euroclip.formatPrice(this.price) + "&nbsp;" + $.euroclip.getCurrancy());
				$(".euroclipconfig .price-novat-value").html($.euroclip.formatPrice(this.price / $.euroclip.getVAT()) + "&nbsp;" + $.euroclip.getCurrancy());
			}

			this.refreshProductCode();

		}

		return this;
	},


	updateLabelClip: function () {
		var label = "";
		if (this.getHasFrame()) {
			label = this.getTypeLabel();
		} else if (this.getHasGlass()) {
			label = eval("this.glass.name_" + $.euroclip.LANG);
		} else if (this.getHasBase()) {
			label = eval("this.base.name_" + $.euroclip.LANG);
		}
		$(".euroclipconfig .label-clip-type").text(label);
	},
	updateImage: function () {
		$.euroclip.log("UpdateImageCall");

		if (this.getHasFrame() && this.color) {
			$("#img-clip-type").attr("src", $.euroclip.SHOP_SOURCE + this.color.img_frame);
			$("#img-clip-type2").show().attr("src", $.euroclip.SHOP_SOURCE + this.color.img_profile);
		} else if (this.getHasGlass() && this.glass) {
			$("#img-clip-type").attr("src", $.euroclip.SHOP_SOURCE + this.glass.img);
			$("#img-clip-type2").hide();
		} else if (this.getHasBase() && this.base) {
			$("#img-clip-type").attr("src", $.euroclip.SHOP_SOURCE + this.base.img);
			$("#img-clip-type2").hide();
		} else {
			$("#img-clip-type").attr("src", $.euroclip.SHOP_SOURCE + "_empty.jpg");
			$("#img-clip-type2").hide();
		}
	},

	getPriceProductUri: function () {
		return this.priceProductUri;
	},

	getProductTypeCode: function () {
		var complete = "";
		if (this.isComplete()) {
			complete = "komplet|";
		}
		return (complete + this.getColorCode() + "|" + this.getGlassCode() + "|" + this.getBaseCode() + "|" + this.getHooksCode() + "|atyp").replace(/\|{2,}/g, "|").replace(/^\|/g, "");
	},


	getColorCode: function () {
		if (this.getHasFrame()) {
			return this.color.code;
		} else {
			return "";
		}
	},
	setColor: function (color) {
		var self = this;
		$($.euroclip.bars).each(function (i, item) {
			if (item.code == color) {
				self.color = item;
				return false;
			}
		});
		//this.updateImage();
		return this;
	},
	refreshColors: function () {
		var $oldSelected = $("#color option:selected");
		var $color = $("#color").empty();
		var typeCode = this.type.code;
		$($.euroclip.bars).each(function (i, item) {
			if (item.profile == typeCode) {
				var $elem = $('<option value="' + item.code + '">' + eval("item.color_" + $.euroclip.LANG) + '</option>');
				if (item.code == $oldSelected.val() && eval("item.color_" + $.euroclip.LANG) == $oldSelected.text()) {
					$elem.prop("selected", true);
				}
				$color.append($elem);
			}
		});
	},


	getGlassCode: function () {
		if (this.getHasGlass() && this.glass) { // TODO: při načítání špatně setlý getHasGlass, glass je chvíli prázdný
			return this.glass.code;
		} else {
			return "";
		}
	},
	setGlass: function (glass) {
		var self = this;
		$($.euroclip.glasses).each(function (i, item) {
			if (item.code === glass) {
				self.glass = item;
				return false;
			}
		});
		return this;
	},
	refreshGlasses: function () {
		var $glass = $("#glass").empty();
		$($.euroclip.glasses).each(function (i, item) {
			$glass.append('<option value="' + item.code + '">' + eval("item.name_" + $.euroclip.LANG) + '</option>');
		});
	},


	getBaseCode: function () {
		if (this.getHasBase() && this.base) {
			return this.base.code;
		} else {
			return "";
		}
	},
	setBase: function (base) {
		var self = this;
		$($.euroclip.bases).each(function (i, item) {
			if (item.code === base) {
				self.base = item;
				return false;
			}
		});
		return this;
	},
	refreshBases: function () {
		var $oldSelected = $("#base option:selected");
		var $base = $("#base").empty();

		for (var i = 0; i < $.euroclip.bases.length; i++) {
			var sizes = $.euroclip.bases[i].upTo.split("x"); // 70x100
			if (this.getSizeA() > sizes[0] || this.getSizeB() > sizes[1]) {
				continue;
			}
			$base.append('<option value="' + $.euroclip.bases[i].code + '">' + eval("$.euroclip.bases[i].name_" + $.euroclip.LANG) + '</option>');
		}
		$base.append('<option value="0">- bez podkladu -</option>');

		if (!this.isComplete()) {
			var callChange = true;
			$base.find("option").each(function () {
				$this = $(this);
				if ($this.val() == $oldSelected.val() && $this.text() == $oldSelected.text()) {
					$this.prop("selected", true);
					callChange = false;
					return false;
				}
			});
			if (callChange) {
				$("#base").change();
			}
		} else {
			$("#base").change();
		}
	},


	getHooksCode: function () {
		if (this.hasHooks) {
			return "hacek";
		} else {
			return "";
		}
	},


	setComplete: function (complete) {
		this.complete = complete;

		if (!complete) {
			$("#hooks, #bases").show();
			$("#glass").append('<option value="0" class="no-complete">- bez skla -</option>');
			$("#frame-type").append('<option value="0" class="no-complete">- bez rámu -</option>');
		} else {
			$("#hooks, #bases").hide();
			$("#colors").show();

			$(".no-complete").remove();
			this.refreshBases();
			this.setHasFrame(true);
			this.setHasGlass(true);
			this.setHasHooks(true);
			$("#hook").val(1);
			$("#frame-type, #glass").change();
		}
	},
	isComplete: function () {
		return this.complete;
	},


	setHasFrame: function (frame) {
		this.hasFrame = frame;
	},
	getHasFrame: function () {
		return this.hasFrame;
	},
	setHasGlass: function (glass) {
		this.hasGlass = glass;
	},
	getHasGlass: function () {
		return this.hasGlass;
	},
	setHasBase: function (base) {
		this.hasBase = base;
	},
	getHasBase: function () {
		return this.hasBase;
	},
	setHasHooks: function (hooks) {
		if (hooks == 1) {
			this.hasHooks = true;
		} else {
			this.hasHooks = false;
		}
	},
	getHasHooks: function () {
		return this.hasHooks;
	}
});
