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
		} else {
			var prices = $.euroclip.prices_standard;
			var result = 0;

			if (prices) {
				// nejprve zkusíme najít ve standardech
				for (var i = 0; i < prices.length; i++) {
					if (prices[i].RozmerA == this.getSizeA() && prices[i].RozmerB == this.getSizeB()) {
						$.euroclip.log("get standard price");
						var url = "/" + $.euroclip.WEB_PREFIX + this.getProductTypeCodeWithoutAtyp() + "-" + this.getSizeA() + "x" + this.getSizeB();
						url = url.replace(/(_|\.)/gi, "-");

						// načtení ID daného cenového produktu
						this.priceProductId = 0;
						var that = this;
						if (this.xhr != null)
							this.xhr.abort();
						this.xhr = $.ajax({
							type: "GET",
							url: url,
							async: false,
							dataType: "html",
							success: function (data) {
								price = data.match(/\"price\": \"([0-9]+\.*[0-9]*)\",/);
								dataId = data.match(/name=\"pid\" value=\"([0-9]+)/);
								if (dataId != null && price != null) {
									that.priceProductId = dataId[1];	
									$.euroclip.log("priceProductId " + that.priceProductId);

									// nastavím reálnou cenu produktu
									result = prices[i][that.getProductTypeCodeWithoutAtyp()] = parseFloat(price[1]);

									that.setStandard(true);
									$.euroclip.log("standard");
									$.euroclip.log(prices[i]);

								} else {
									$.euroclip.log("standard produkt nenalezen");
								}
							}
						});
						break;
					}
				}
			}

			// pokud není ve standardech, vyrobíme na míru
			if (result == 0) {
				$.euroclip.log("výroba na míru");
				prices = $.euroclip.prices;//$.euroclip.log($.euroclip.prices);
				for (var i = 0; i < prices.length; i++) {
					if (prices[i].RozmerA >= this.getSizeA() && prices[i].RozmerB >= this.getSizeB()) {
						if (prices[i][this.getProductTypeCodeWithoutAtyp()] > 0) {
							// hledání nejlepší ceny z ostatních vyhovujících rozměrů
							if (result == 0 || result > prices[i][this.getProductTypeCodeWithoutAtyp()]) {
								result = prices[i][this.getProductTypeCodeWithoutAtyp()];
								$.euroclip.log(prices[i]);
							}
						}
					}
				}
			}
			if (result > 0) {
				if (result != this.purePrice) {
					
					this.purePrice = result;

					if (!this.isStandard()) {
						// načtení ID daného cenového produktu

						var that = this;
						
						if (this.xhr != null)
							this.xhr.abort();
						this.xhr = $.ajax({
							crossDomain: true,
							type: 'GET',
							async: false,
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

								$.ajax({
									type: "GET",
									url: data["uri"],
									dataType: "html",
									async: false,
									success: function (data) {
										data = data.match(/name=\"pid\" value=\"([0-9]+)/);
										if (data != null) {
											that.priceProductId = data[1];							
											$.euroclip.log("priceProductId " + that.priceProductId);
											$("#buy_btn").attr("disabled", false);
										}
									}
								});

								$(".euroclipconfig .price-value").html($.euroclip.formatPrice(that.price) + "&nbsp;" + $.euroclip.getCurrancy());
								$(".euroclipconfig .price-novat-value").html($.euroclip.formatPrice(that.price / $.euroclip.getVAT()) + "&nbsp;" + $.euroclip.getCurrancy());
							}
						});
					} else {
						this.price = result;
						$(".euroclipconfig .price-value").html($.euroclip.formatPrice(that.price) + "&nbsp;" + $.euroclip.getCurrancy());
						$(".euroclipconfig .price-novat-value").html($.euroclip.formatPrice(that.price / $.euroclip.getVAT()) + "&nbsp;" + $.euroclip.getCurrancy());
						$("#buy_btn").attr("disabled", false);
					}					
				} else {
					$("#buy_btn").attr("disabled", false);
				}
				$(".label-sizes").show();
				
			} else {
				this.price = 0;
				$.euroclip.showDialog("Zadaný rozměr je příliš velký!");
				$(".label-sizes").hide();
				
				$(".euroclipconfig .price-value").html($.euroclip.formatPrice(this.price) + "&nbsp;" + $.euroclip.getCurrancy());
				$(".euroclipconfig .price-novat-value").html($.euroclip.formatPrice(this.price * 100 / (100 + $.euroclip.getVAT())) + "&nbsp;" + $.euroclip.getCurrancy());

			}

			// až nakonec, když víme, zda není standard
			this.refreshProductCode();
			
		}

		
		return this;
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
