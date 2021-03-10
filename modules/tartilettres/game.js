const {MessageEmbed} = require('discord.js');
const {DateTime} = require('luxon');
const Player = require('./player.js');

function shuffle(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}


class Game {
	constructor(mainclass, message) {
		this.mainclass = mainclass;
		this.client = mainclass.client;

		this.letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
		this.players = {};
		this.lastPlayed = "";
		this.paused = false;
		this.saidWords = [];

		if (message) {
			this.channel = message.channel;
			this.start();
		}
	}

	async reload(object) {
		await this.parse(object);
	}

	async start() {
		await this.nextTurn();
	}

	async sendTable() {
		var maxLength = Object.values(this.players).reduce((acc, e) => Math.max(acc, e.user.displayName.length), 0);
		var sorted = Object.values(this.players).sort((a, b) => b.score - a.score);

		this.channel.send(
			"```\nLongueur attendue: " + this.wordLength + " caractères\n" + sorted.map(e =>
				  e.user.displayName + " ".repeat(maxLength - e.user.displayName.length + 1) + ": "
				+ this.letters.map(l => e.letters[l] ? "_": l).join("")
				+ "  (" + e.score + ")"
				+ (e.taboo.length ? "  ❌ " + e.taboo.join(",") : "")
			).join("\n") + "```"
		);
	}

	async nextTurn(id) {
		if (id) {
			this.lastPlayed = id;
			var player = this.players[id];
		}

		this.wordLength = Math.floor(Math.random() * 6) + 5;
		await this.sendTable();

		this.save();
	}

	serialize() {
		var object = {
			channel: this.channel.id,
			players: {},
			paused: this.paused,
			lastPlayed: this.lastPlayed,
			wordLength: this.wordLength,
			saidWords: this.saidWords
		};

		for (var [k, e] of Object.entries(this.players)) {
			object.players[k] = {
				score: Number(e.score),
				user: e.user.id,
				letters: e.letters,
				taboo: e.taboo,
				possibleTaboos: e.possibleTaboos
			}
		}

		return object;
	}

	async parse(object) {
		this.channel = await this.client.channels.fetch(object.channel);
		this.players = {};
		this.paused = object.paused;
		this.lastPlayed = object.lastPlayed;
		this.wordLength = object.wordLength || 7;
		this.saidWords = object.saidWords || [];

		for (var [k, e] of Object.entries(object.players)) {
			var p = new Player(await this.channel.guild.members.fetch(e.user, true, true), this, true);
			p.letters = e.letters || {};
			p.score = e.score || this.letters.filter(e => p.letters[e]).length;
			p.taboo = typeof(e.taboo) === "object" ? (e.taboo ? e.taboo : []) : (e.taboo ? [e.taboo] : []);
			p.possibleTaboos = e.possibleTaboos || [];

			this.players[k] = p;

			// console.log(p);
		};
	}

	save() {
		this.mainclass.load("games").then(object => {
			object.games[this.channel.id] = this.serialize();
			this.mainclass.save("games", object);
		});
	}

	delete_save() {
		this.mainclass.load("games").then(object => {
			delete object.games[this.channel.id];
			this.mainclass.save("games", object);
		});
	}
}

module.exports = exports = Game
