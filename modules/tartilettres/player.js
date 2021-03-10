const {MessageEmbed} = require('discord.js');

class Player {
	constructor(user, game, reload = false) {
		this.user = user;
		this.game = game;
		this.score = 0;
		this.letters = {};
		this.taboo = [];
		this.possibleTaboos = [];

		// console.log(user);

		if (!reload) this.resetLetters();
	}

	async playWord(word, list) {
		if (list.every(e => this.letters[e])) {
			this.game.channel.send(this.user.toString() + ", Ce mot ne retirerait aucune lettre de votre peigne");
			return;
		}

		for (var char of list) {
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
		this.letters = {};

		if (withTaboo) {
			if (!this.possibleTaboos.length) this.possibleTaboos = "BCDFGHLMNP".split("");

			var index = Math.floor(Math.random() * this.possibleTaboos.length);

			this.taboo.push(this.possibleTaboos.splice(index, 1)[0]);
			if (this.taboo.length > 3) this.taboo.shift();

			for (var letter of this.taboo) this.letters[letter] = true;
		}

		// this.user.send("Votre peigne a été remis à zéro");
	}
}

module.exports = exports = Player;
