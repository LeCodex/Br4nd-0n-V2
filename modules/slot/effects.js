const {MessageEmbed} = require('discord.js');

class Effect {
	constructor(player, data) {
		this.player = player;
		this.data = data || {};

		this.name = this.constructor.name;
		this.toRemove = false;
	}

	toString() {
		return this.emoji + " " + this.name;
	}
}

class Caffeinated extends Effect {
	constructor(player, data) {
		super(player, data);

		this.emoji = "☕";
		this.description = "Next time you would lose points, instead lose half as many."
	}

	effect(player, result) {
		var amount = this.player.game.getAmount(result);
		if (amount < 0) {
			this.toRemove = true;

			for (var sticker of result.all) sticker.factor /= 2;
			return "☕ But your coffee prevented you from losing all those points! (+" + (this.player.game.getAmount(result) - amount) + " points)";
		}

		return null;
	}
}

class Drunk extends Effect {
	constructor(player, data) {
		super(player, data);

		this.emoji = "🍺";
		this.description = "Next time you would gain points, instead gain half as many."
	}

	effect(player, result) {
		var amount = this.player.game.getAmount(result);
		if (amount > 0) {
			this.toRemove = true;

			for (var sticker of result.all) sticker.factor /= 2;
			return "🍺 But your beer prevented you from gaining all those points... (-" + (amount - this.player.game.getAmount(result)) + " points)";
		}

		return null;
	}
}


module.exports = exports = { Caffeinated, Drunk };
