const {MessageEmbed} = require('discord.js');
const Fruits = require('./fruits.js');

class Player {
	constructor(user, game, reload = false) {
		this.user = user;
		this.game = game;
		this.score = 0;
		this.fruit = null;
		this.recipes = [];
		this.infoMessage = null;

		// console.log(user);

		if (!reload) {
			this.giveNewFruit();
			// this.sendInfo();
		}
	}

	async playFruit(index) {
		// for (var i = game.stack.length - 1; i >= 0; i--) {
		// 	if (game.stack[i].passive) game.stack[i].passive(game, i, cup);
		// }
		this.game.blenders[index].push(this.fruit);

		this.fruit.effect();
	}

	async sendInfo(message = "") {
		var embed =
			new MessageEmbed()
			.setDescription(message + "\nFruit: " + this.fruit.fullName + (this.recipes.length ? "\n\nRecettes:\n • " + this.recipes.join("\n • ") : ""))
			.setColor(this.game.mainclass.color);

		if (this.infoMessage) {
			this.infoMessage.edit(embed);
		} else {
			this.infoMessage = await this.user.send(embed);
		}

		this.game.save();
	}

	giveNewFruit() {
		var fruits = this.game.availableFruits.map(e => Fruits[e]);
		this.fruit = new fruits[Math.floor(Math.random() * this.game.availableFruits.length)](this);
	}
}

module.exports = exports = Player;
