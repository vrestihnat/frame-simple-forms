$.extend($.euroclip.Frame.prototype, {
	setStandard: function (standard) {
		this.standard = standard;
		return this;
	},
	refreshPrice: function () {
		$.euroclip.log("refreshPrice");
		$("#buy_btn").attr("disabled", true); //aby nešlo koupit vždy během výpočtu
		this.setStandard(false);

		if (this.getSizeA() === 0 || this.getSizeB() === 0) {
			this.price = 0;
			$(".label-sizes").hide();

			$(".euroclipconfig .price-value").html($.euroclip.formatPrice(this.price) + "&nbsp;" + $.euroclip.getCurrancy());
			$(".euroclipconfig .price-novat-value").html($.euroclip.formatPrice(this.price * 100 / (100 + $.euroclip.getVAT())) + "&nbsp;" + $.euroclip.getCurrancy());
			return this;
		}

		var typeCode = this.getProductTypeCodeWithoutAtyp();
		var a = this.getSizeA();
		var b = this.getSizeB();
		var requestCode = typeCode + "_" + a + "x" + b;

		var that = this;
		if (this.xhr != null) {
			this.xhr.abort();
		}
		this.xhr = $.ajax({
			crossDomain: true,
			type: 'POST',
			async: false,
			url: "https://api.ramari.cz/api/euroclip/resolve",
			contentType: "application/json",
			dataType: "json",
			headers: { Accept: "application/json" },
			data: JSON.stringify({ code: requestCode, lang: $.euroclip.LANG }),
			success: function (data) {
				that.purePrice = data.computedPrice || data.price.value;
				that.price = data.price.value;
				that.setStandard(!!data.isStandard);

				// upgates addtocart podle code z API (standard: EKS_K_18x24, atyp: ID-500)
				that.priceProductCode = data.code;
				that.priceProductUri = null;
				that.priceProductId = 1;
				$.euroclip.log("priceProductCode " + that.priceProductCode);

				$(".euroclipconfig .price-value").html($.euroclip.formatPrice(that.price) + "&nbsp;" + $.euroclip.getCurrancy());
				$(".euroclipconfig .price-novat-value").html($.euroclip.formatPrice(data.price.valueNoVat) + "&nbsp;" + $.euroclip.getCurrancy());
				$(".label-sizes").show();
				$("#buy_btn").attr("disabled", false);
			},
			error: function (xhr) {
				that.price = 0;
				var payload = null;
				try { payload = xhr.responseJSON || JSON.parse(xhr.responseText); } catch (e) {}
				if (payload && payload.error === "SIZE_OUT_OF_RANGE") {
					$.euroclip.showDialog("Zadaný rozměr je příliš velký!");
				} else if (payload && payload.message) {
					$.euroclip.showDialog(payload.message);
				}
				$(".label-sizes").hide();
				$(".euroclipconfig .price-value").html($.euroclip.formatPrice(that.price) + "&nbsp;" + $.euroclip.getCurrancy());
				$(".euroclipconfig .price-novat-value").html($.euroclip.formatPrice(that.price * 100 / (100 + $.euroclip.getVAT())) + "&nbsp;" + $.euroclip.getCurrancy());
			}
		});

		this.refreshProductCode();
		return this;
	},
	getPriceProductUri: function () {
		return this.priceProductUri;
	},
	getPriceProductCode: function () {
		return this.priceProductCode;
	},
	getProductTypeCode: function () {
		return this.type.code;
	},
	getProductTypeCodeWithoutAtyp: function () {
		return this.type.code.replace("_atyp", "");
	},
	updateImage: function () {
		$("#img-clip-type").attr("src", $.euroclip.SHOP_SOURCE + this.getProductTypeCodeWithoutAtyp() + ".jpg");
	}
});
