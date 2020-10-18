const {MessageEmbed} = require('discord.js');
const Cups = require('./cups.js');

class Player {
	constructor(user, game, reload = false) {
		this.user = user;
		this.hand = [];
		this.handMessage = null;
		this.score = 0;

		if (!reload) var message = this.draw(game, 20);
	}

	draw(game, amount) {
		var basic_cups = Object.values(Cups).slice(0, game.COLOR_COUNT - 1);
		var special_cups = game.specialCups.map(e => e.constructor);

		for (var i = 0; i < amount; i ++) {
			var isSpecialCup = Math.random() < .3;
			var cupConstructor = null;

			if (isSpecialCup) {
				cupConstructor = special_cups[Math.floor(Math.random() * special_cups.length)];
			} else {
				cupConstructor = basic_cups[Math.floor(Math.random() * basic_cups.length)];
			}
			this.hand.push(new cupConstructor(game.mainclass, this));
		}

		return "Vous avez pioché " + amount + " tasses";
	}

	async sendHand(game, message = "") {
		var content = new MessageEmbed()
			.setTitle("[MONTPARTASSE] Votre main")
			.setDescription(message + "\n\n" + this.hand.reduce((acc, e, i) => {
				var message = "**" + (i + 1) + ".** __";
				if (e.description) {
					message += "**" + e.fullName + "**"
					if (!acc.specials.includes(e.name)) {
						acc.specials.push(e.name);
						message += ":__ " + e.description;
					} else {
						message += "__";
					}
				} else {
					message += e.fullName + "__";
				}

				acc.list.push(message);
				return acc
			}, {list: [], specials: []}).list.join("\n"))
			.setColor(game.mainclass.color);

		if (this.handMessage) {
			this.handMessage.edit(content);
		} else {
			this.handMessage = await this.user.send(content);
		}
	}

	playCup(game, index) {
		if (game.lastPlayed === this.user.id && !game.mainclass.debug) {
			this.user.send(
				new MessageEmbed()
				.setTitle("[MONTPARTASSE] Lancer raté")
				.setDescription("Vous venez de lancer une tasse, attendez que quelqu'un d'autre joue avant!")
				.setColor(game.mainclass.color)
			);
			return;
		}

		game.effectStack = game.effectStack.filter(e => e.persistent);
		game.lastPlayed = this.user.id;

		var cup = this.hand.splice(index - 1, 1)[0];
		game.stack.unshift(cup);
		cup.effect(game, 0);
	}
}

module.exports = exports = Player;
