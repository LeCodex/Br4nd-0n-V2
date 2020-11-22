const {MessageEmbed} = require('discord.js');

class Player {
	constructor(user, game, reload = false) {
		this.user = user;
		this.score = 0;
		this.item = Math.floor(Math.random() * game.availableItems.length);
		this.turnedOnce = false;
		this.itemMessage = null;

		if (!reload) this.sendItem(game);
	}

	gainOnePoint(game) {
		var newItem;
		do {
			newItem = Math.floor(Math.random() * game.availableItems.length);
		} while (newItem == this.item);
		this.score ++;
		this.item = newItem;

		this.sendItem(game);
	}

	async sendItem(game) {
		if (this.itemMessage) {
			await this.itemMessage.delete();
			this.itemMessage = null;
		}
		
		this.itemMessage = await this.user.send(
			new MessageEmbed()
			.setTitle("Ingrédient à récupérer: " + game.items[this.item].item)
			.setColor(game.mainclass.color)
		);
	}
}

module.exports = exports = Player
