const {MessageEmbed} = require('discord.js');

class Player {
	constructor(user, game, reload = false) {
		this.user = user;
		this.game = game;
		this.score = 0;
		this.letters = {};
		this.taboo = null;

		// console.log(user);

		if (!reload) this.resetLetters();
	}

	async playWord(word) {
		for (var char of word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().split("")) {
			if (!this.letters[char]) {
				this.letters[char] = true;
				this.score ++;
			}
		}

		if (this.game.letters.every(e => this.letters[e])) this.resetLetters(true);

		this.game.saidWords.push(word);
		await this.game.nextTurn(this.user.id);
	}

	resetLetters(withTaboo = false) {
		// this.completed ++;
		if (withTaboo) {
			var possibleTaboos = "BCDFGHLMNP";
			var index = Math.floor(Math.random() * possibleTaboos.length);

			this.taboo = possibleTaboos.charAt(index);
		}

		this.letters = {};
		this.user.send("Votre peigne a été remis à zéro");
	}
}

module.exports = exports = Player;
