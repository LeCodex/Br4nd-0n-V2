const {MessageEmbed} = require('discord.js');

class Player {
	constructor(user, game, reload = false) {
		this.user = user;
		this.score = 0;
		this.object = Math.floor(Math.random() * game.availableObjects.length);
		this.turnedOnce = false;

		if (!reload) this.sendObject(game);
	}

	gainOnePoint(game) {
		var newObject;
		do {
			newObject = Math.floor(Math.random() * game.availableObjects.length);
		} while (newObject == this.object);
		this.score++;
		this.object = newObject;

		this.sendObject(game);
	}

	sendObject(game) {
		this.user.send(
			new MessageEmbed()
			.setTitle("[LBPL] Objet à trouver")
			.setDescription("Tu dois faire passer le pion sur cet objet: " + game.objects[this.object].object)
			.setColor(game.mainclass.color)
		)
	}
}

module.exports = exports = Player
