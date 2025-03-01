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
		if (!amount) {
			game.summary.push({
				message: "⏺️ " + this.toString() + " a fait du sur-place"
			});
			return;
		}

		this.effects.forEach(element => {
			amount = element.preMove(game, this, this.index, amount);
		});

		var newIndex = (this.index + amount + game.board.length) % game.board.length;
		if (!this.effects.every(e => e.tryToMove(game, this, newIndex))) return;
		if (!game.board[newIndex].tryToMove(game, this, newIndex)) return;

		var oldIndex = this.index;
		this.index += amount;

		game.summary.push({
			message: (amount > 0 ? "▶️" : "◀️") + " " + this.toString() + " a " + (amount > 0 ? "avancé" : "reculé") + " de " + Math.abs(amount) + (Math.abs(amount) > 1 ? " cases" : " case")
		});

		this.effects.forEach(element => {
			element.onMove(game, this, this.index, amount);
		});

		this.checkForWrapping(game);

		var canTriggerEffect = this.index != oldIndex;
		this.effects.forEach(element => {
			canTriggerEffect = element.postMove(game, this, this.index) && canTriggerEffect;
		});

		this.effects = this.effects.filter(e => !e.used);

		if (game.board[this.index].effect && canTriggerEffect) game.board[this.index].effect(game, this, this.index, amount);

		this.checkForWrapping(game);
	}

	checkForWrapping(game) {
		if (this.index >= game.board.length) {
			this.index -= game.board.length;
			this.score ++;

			game.summary.push({
				message: "🏅 **" + this.toString() + " a gagné 1 point!**"
			});
		} else if (this.index < 0) {
			if (this.score) {
				this.index += game.board.length;
				this.score --;

				game.summary.push({
					message: "❌ **" + this.toString() + " a perdu 1 point!**"
				});
			} else {
				this.index = 0;

				game.summary.push({
					message: "↪ **" + this.toString() + " ne peut pas descendre en dessous de 0 point**"
				});
			}
		}
	}

	turn(game, result) {
		var place = game.order.indexOf(this.user.id);
		if (place <= result) this.move(game, place + 1);

		this.effects.forEach(element => {
			if (element.turnEnd) element.turnEnd(game, this, this.index);
		});
		this.effects = this.effects.filter(e => !e.used);
	}

	addEffect(game, effect) {
		this.effects.push(effect);

		game.summary.push({
			message: "✨ " + this.toString() + " a gagné l'effet " + effect.name
		})
	}

	toString() {
		return this.emoji.toString() + " " + this.user.toString()
	}
}

module.exports = exports = Player;
