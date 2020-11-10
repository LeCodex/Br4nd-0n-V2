const {MessageEmbed} = require('discord.js');
const Tiles = require('./tiles.js');

class Player {
	constructor(user, game, reload = false) {
		this.user = user;
		this.index = 0;
		this.score = 0;
		this.effects = [];
		this.pushedBackUpOnce = false;

		var defaultEmojis = ["🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫", "⬜"];
		this.emoji = defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)];
	}

	move(game, amount) {
		if (!amount) return;

		this.effects.forEach(element => {
			if (element.preMove) amount = element.preMove(game, this, this.index, amount);
		});

		var newIndex = (this.index + amount + game.board.length) % game.board.length;
		if (!this.effects.every(e => e.tryToMove ? e.tryToMove(game, this, newIndex) : true)) return;
		if (!game.board[newIndex].tryToMove(game, this, newIndex)) return;

		this.index += amount;

		game.summary.push({
			message: (amount > 0 ? "▶️" : "◀️") + " " + this.user.toString() + " a " + (amount > 0 ? "avancé" : "reculé") + " de " + Math.abs(amount) + (Math.abs(amount) > 1 ? " cases" : " case"),
			persistent: false
		});

		this.effects.forEach(element => {
			if (element.onMove) element.onMove(game, this, this.index, amount);
		});

		if (this.index >= game.board.length) {
			this.index -= game.board.length;
			this.score ++;

			game.summary.push({
				message: "🏅 **" + this.user.toString() + " gagne 1 point!**",
				persistent: false
			});
		} else if (this.index < 0) {
			this.index += game.board.length;
			this.score --;

			game.summary.push({
				message: "❌ **" + this.user.toString() + " perd 1 point!**",
				persistent: false
			});
		}

		var canTriggerEffect = true;
		this.effects.forEach(element => {
			if (element.postMove) canTriggerEffect = element.postMove(game, this, this.index) && canTriggerEffect;
		});

		this.effects = this.effects.filter(e => !e.used);

		if (game.board[this.index].effect && canTriggerEffect) game.board[this.index].effect(game, this, this.index);
	}

	turn(game, result) {
		var place = game.order.indexOf(this.user.id);
		if (place > result) return;

		this.move(game, place + 1);
		this.effects = this.effects.filter(e => !e.used);
	}

	addEffect(game, effect) {
		this.effects.push(effect);

		game.summary.push({
			message: "✨ " + this.user.toString() + " a gagné l'effet " + effect.name
		})
	}
}

module.exports = exports = Player;
