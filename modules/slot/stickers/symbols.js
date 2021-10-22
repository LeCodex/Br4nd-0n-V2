const Sticker = require("./base.js");

class Seven extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "7️⃣";
		this.description = "Gain 7 points if all central stickers are Sevens";
		this.tags = [ "number", "symbol" ];
	}

	effect(player, result) {
		if (result.rows[1].every(e => e.name === "Seven")) {
			this.value += 7;
			return "7️⃣ **JACKPOT!** You gained 7 points!";
		}

		return "#️⃣ Better luck next time..";
	}
}

class Reverser extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "🔄";
		this.description = "Always reverses the amount of points gained/lost if present.";
		this.tags = [ "symbol" ];
	}

	endPull(player, result) {
		for (var sticker of result.all) sticker.factor *= -1

		return "🔄 The amount of points was reversed!";
	}

	passive(player, result) {
		return this.endPull(player, result);
	}
}

class OneHundred extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.name = "100"
		this.emoji = "💯";
		this.description = "If your score is a multiple of 10, gain 10 points, otherwise lose 1 point.";
		this.tags = [ "symbol", "number" ];
	}

	effect(player, result) {
		if (player.points % 10 === 0) {
			this.value += 10;
			return "💯 You gained 10 points!"
		}

		this.value -= 1;
		return "💯 You lost 1 point!"
	}
}

module.exports = exports = { Seven, Reverser, OneHundred };
