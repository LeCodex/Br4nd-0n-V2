const {MessageEmbed} = require('discord.js');

class Player {
	constructor(user, game, reload = false) {
		this.user = user;
		this.game = game;
		this.completed = -1;
		this.letters = {};

		// console.log(user);

		if (!reload) this.resetLetters();
	}

	get score() {
		return this.completed * this.game.letters.length + Object.keys(this.letters).filter(e => this.game.letters.includes(e)).length;
	}

	async playWord(word) {
		for (var char of word.split("").map(e => e.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase())) { this.letters[char] = true; }

		if (this.game.letters.every(e => this.letters[e])) this.resetLetters();

		this.game.saidWords.push(word);
		await this.game.nextTurn(this.user.id);
	}

	resetLetters() {
		this.completed ++;
		this.letters = {};
		this.user.send("Votre peigne a été remis à zéro");
	}
}

module.exports = exports = Player;
