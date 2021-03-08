const {MessageEmbed} = require('discord.js');

class Player {
	constructor(user, game, reload = false) {
		this.user = user;
		this.game = game;
		this.score = 0;
		this.letters = [];

		// console.log(user);

		if (!reload) this.resetLetters();
	}

	async playWord(word) {
		for (var char of word.split("").map(e => e.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase())) {
			var index = this.game.letters.indexOf(char);

			if (index !== -1 && this.letters[index]) {
				this.letters[index] = false;
				this.score ++;
			}
		}

		await this.game.nextTurn(this.user.id);
		if (this.letters.every(e => !e)) this.resetLetters();
	}

	resetLetters() {
		this.letters = this.game.letters.map(e => true);
		this.user.send("Votre peigne a été remis à zéro");
	}
}

module.exports = exports = Player;
