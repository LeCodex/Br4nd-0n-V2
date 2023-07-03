const {MessageEmbed} = require('discord.js');

class Player {
	constructor(user, game, reload = false) {
		this.game = game;
		this.user = user;
		this.score = 0;
	}

	rollDice() {
		if (this.game.previousPlayers.includes(this.user.id) && !this.game.mainclass.debug) {
			this.game.channel.send("Veuillez attendre que les autres joueurs jouent");
			return;
		}

		let result = Math.floor(Math.random() * this.game.chairs.length);
		this.game.channel.send(`${this} a lancé un ${result+1}!`);
		this.game.markChair(result, this);
	}

	toString() {
		return this.user.username;
	}
}

module.exports = exports = Player;
