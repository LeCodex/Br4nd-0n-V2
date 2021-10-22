const Sticker = require("./base.js");

class Hole extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "🕳️";
		this.description = "Lose 5 points and nullifies all other central stickers.";
		this.tags = [ "environment" ];
	}

	effect(player, result) {
		this.value -= 5;
		for (var sticker of result.rows[1].filter(e => e !== this)) sticker.factor = 0;

		return "🕳️ **All other central stickers fell in the hole.** You lost 5 points!"
	}
}

class Hotel extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "🏨";
		this.description = "Âlways gain 1 point for each living sticker if present. If there isn't any, lose 2 points.";
		this.tags = [ "environment", "building" ];
	}

	effect(player, result) {
		var amount = 0;
		for (var sticker of result.rows[1].filter(e => e !== this)) amount += 1;

		if (amount === 0) amount = -2;

		this.value += amount;

		return "🏨 You " + (amount > 0 ? "gained " : "lost ") + amount + " points!"
	}
}

module.exports = exports = { Hole, Hotel };
