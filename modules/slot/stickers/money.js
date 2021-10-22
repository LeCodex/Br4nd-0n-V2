const Sticker = require("./base.js");

class Coin extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "🪙";
		this.description = "Gain 1 point";
		this.tags = [ "money", "item" ];
	}

	effect(player, result) {
		this.value += 1;

		return ":coin: You gained 1 point!"
	}
}

class MoneyBag extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.name = "Money Bag";
		this.emoji = "💰";
		this.description = "Gain 3 points if there is a :coin: Coin in the central stickers";
		this.tags = [ "money", "item" ];
	}

	effect(player, result) {
		if (result.rows[1].some(e => e.name === "Coin")) {
			this.value += 3;
			return "💰 Even more money! You gained 3 points!";
		}

		return "💰 The bag seems empty...";
	}
}

class Bill extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "💵";
		this.description = "Doubles the amount of points of money stickers.";
		this.tags = [ "money", "item" ];
	}

	effect(player, result) {
		var money = [];
		for (var sticker of result.all.filter(e => e.tags.includes("money") && e !== this)) {
			sticker.factor *= 2;
			money.push(sticker);
		}

		return "💵 " + (money.length ? money.map(e => e.toString()).join(" and ") : "Nothing") + " received interest!"
	}
}

module.exports = exports = { Coin, MoneyBag, Bill };
