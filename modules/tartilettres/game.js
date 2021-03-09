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

function getDist(start, end) {
	//console.log(start.x - end.x, start.y - end.y);
	return Math.sqrt((start.x - end.x) ** 2 + (start.y - end.y) ** 2);
}

function getRankEmoji(rank) {
	if (rank < 4) return ["🥇", "🥈", "🥉"][rank - 1];
	return "🏅";
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
			"```Longueur attendue: " + this.wordLength + " caractères\n" + sorted.map(e =>
				  e.user.displayName + " ".repeat(maxLength - e.user.displayName.length + 1) + ": "
				+ this.letters.map(l => e.letters[l] ? "_": l).join("")
				+ "  (" + e.score + ")"
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
				completed: Number(e.completed),
				user: e.user.id,
				letters: e.letters
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
			p.completed = e.completed || 0;
			p.letters = e.letters || {};

			this.players[k] = p;
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
