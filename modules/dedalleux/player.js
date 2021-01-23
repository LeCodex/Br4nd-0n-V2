const {MessageEmbed} = require('discord.js');

class Player {
	constructor(user, game, reload = false) {
		this.user = user;
		this.score = 0;
		this.item = Math.floor(Math.random() * game.availableItems.length);
		this.turnedOnce = false;
		this.itemMessage = null;
		this.gainedOnePoint = false;

		if (!reload) this.sendItem(game);
	}

	gainPoints(game, amount) {
		this.gainedOnePoint = true;
		var newItem;
		do {
			newItem = Math.floor(Math.random() * game.availableItems.length);
		} while (newItem == this.item);
		this.score += amount;
		this.item = newItem;

		this.sendItem(game);
	}

	async sendItem(game) {
		var embed = new MessageEmbed()
			.setTitle("Ingrédient à récupérer: " + game.items[this.item].item)
			.setColor(game.mainclass.color);

		if (this.itemMessage) {
			this.itemMessage.edit(embed);
		} else {
			this.itemMessage = await this.user.send(embed);
		}
	}
}

module.exports = exports = Player
