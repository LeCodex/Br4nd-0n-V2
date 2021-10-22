const Sticker = require("./base.js");

class Dynamite extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "🧨";
		this.description = "Lose 1 point";
		this.tags = [ "item" ]
	}

	effect(player, result) {
		this.value -= 1;

		return "💥 You lost 1 point!"
	}
}

class Dice extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "🎲";
		this.description = "Gain between -3 and 3 points.";
		this.tags = [ "item" ];
	}

	effect(player, result) {
		var side = Math.floor(Math.random() * 7) - 3;
		this.value += side;

		return "🎲 The dice landed on " + side + ", and you " + (side >= 0 ? "gained" : "lost") + " that many points!"
	}
}

class Joker extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "🃏";
		this.description = "Gain 1 point for each Joker stickers everywhere.";
		this.tags = [ "card", "item" ];
	}

	effect(player, result) {
		var amount = this.game.stickers.filter(e => e.name === this.name).length
		this.value += amount;

		return "🃏 There are " + amount + " Joker stickers in total, and you gained that many points!"
	}
}

class Scissors extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "✂️";
		this.description = "Prevents one sticker on the central row to give or take points.";
		this.tags = [ "item", "tool" ];
	}

	endPull(player, result) {
		var cut = result.rows[1][Math.floor(Math.random() * result.rows[1].length)];
		cut.factor = 0;

		return "✂️ The scissors cut the " + cut.toString() + ", so it didn't give or take any points."
	}
}

class Ticket extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "🎫";
		this.description = "Resets your draft wait time.";
		this.tags = [ "item" ];
	}

	effect(player, result) {
		player.lastDraftTimestamp = 0;

		return "🎫 You can do another draft!"
	}
}

module.exports = exports = { Dynamite, Dice, Joker, Scissors, Ticket };
