const Sticker = require("./base.js");

class Cherry extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "🍒";
		this.description = "Double the amount of points you lose/gain";
		this.tags = [ "fruit", "food" ];
	}

	endPull(player, result) {
		for (var sticker of result.all) sticker.factor *= 2;

		return "🍒 The amount of points was doubled!!";
	}
}

class Coffee extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "☕";
		this.description = "Next time you would lose points, instead lose half as many.";
		this.tags = [ "food", "drink" ];
	}

	effect(player, result) {
		player.addEffect("Caffeinated");

		return "☕ You feel refreshed and alert!"
	}
}

class Beer extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "🍺";
		this.description = "Next time you would gain points, instead gain half as many.";
		this.tags = [ "food", "drink", "alcohol" ];
	}

	effect(player, result) {
		player.addEffect("Drunk");

		return "🍺 You feel woozy and slow..."
	}
}

class Banana extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "🍌";
		this.description = "50% chance of losing 2 points.";
		this.tags = [ "food", "fruit" ];
	}

	effect(player, result) {
		if (Math.random() < .5) {
			this.value -= 2;
			return "🍌 You slipped and lost 2 points!"
		} else {
			return "🍌 You managed to dodge the banana..."
		}
	}
}

module.exports = exports = { Cherry, Coffee, Beer, Banana };
