const {MessageEmbed} = require('discord.js');
const Player = require('./player.js');
const Fruits = require('./fruits.js');

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

		this.players = {};
		this.lastPlayed = "";
		this.paused = false;
		this.availableFruits = Object.values(Fruits);
		this.blenders = [
			[],
			[],
			[],
			[],
			[],
			[]
		];

		this.infoMessage = null;
		this.reactionCollector = null;

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

	joinGame(user) {
		if (!this.players[user.id]) { this.players[user.id] = new Player(user, this); }
		return this.players[user.id];
	}

	tryAndPlayFruit(player, index) {
		if (this.lastPlayed === player.user.id && !this.mainclass.debug) {
			player.user.send("Vous avez déjà joué, veuillez attendre");
		} else if (index < 0 || index >= this.blenders.length) {
			player.user.send("Veuillez renseinger un index présent sous un des mixeurs");
		} else if (this.blenders[index].some(e => e.player === player)) {
			player.user.send("Vous avez déjà joué dans ce mixeur");
		} else {
			player.playFruit(index);
		}
	}

	async sendInfo(message = "", summary = "") {
		var sorted = Object.values(this.players).sort((a, b) => b.score - a.score);

		var rows = [];
		for (var i = 0; i < this.blenders.length; i ++) {
			var blender = this.blenders[i];
			var row = this.mainclass.NUMBER_EMOJIS[i] + "🍶⬛";

			for (var j = 0; j < 3; j ++) row += blender.length > j ? blender[j].emoji : "⬛";

			row += " - ";
			row += blender.map(e => e.player.user.toString()).join(", ");

			rows.push(row);
		}

		// for (var player of Object.values(this.players)) {
		// 	var row = [];
		//
		// 	for (var i = 0; i < this.blenders.length; i++) {
		// 		var blender = this.blenders[i];
		//
		// 		var fruit = blender.filter(e => e.player === player);
		// 		if (fruit.length) {
		// 			row.push(fruit[0].emoji);
		// 		} else {
		// 			row.push("⬛");
		// 		}
		// 	}
		//
		// 	row.push(player.user.toString())
		// 	rows.push(row.join("⬛"));
		// }
		//
		// var limit = this.blenders.length * 2 + 1;
		// rows.push(this.blenders.map((e, i) => "🍶").join("⬛"));
		// rows.push(this.blenders.map((e, i) => this.mainclass.NUMBER_EMOJIS[i]).join("⬛"));

		var embed =
			new MessageEmbed()
			.setTitle("[COUP D'JUS] " + message)
			.addField(
				"Mixeurs",
				rows.join("\n")
			)
			.setColor(this.mainclass.color);

		if (summary.length) embed.addField("Résumé", summary);

		if (this.infoMessage) {
			await this.infoMessage.edit(embed);
		} else {
			this.infoMessage = await this.channel.send(embed);
			this.setupReactionCollector();
		}
	}

	async nextTurn(player, message) {
		var summary = [];

		var gains = {}
		for (var blender of this.blenders) {
			if (blender.length >= 3) {
				gains[blender[0].player.user.id] = 1;
				gains[blender[1].player.user.id] = gains[blender[1].player.user.id] ? gains[blender[1].player.user.id] + 1 : 1;

				var recipe = blender.map(e => e.emoji);
				summary.push("La recette " + recipe + " a été complétée!");

				var used = false;
				for (var ply of Object.values(this.players)) {
					if (ply.recipes.includes(recipe)) {
						gains[ply.user.id] = gains[ply.user.id] ? gains[ply.user.id] + 1 : 1;
						used = true;
						summary.push(ply.user.toString() + " avait cette recette!");
					}
				}

				if (!used) {
					player.recipes.unshift(recipe);
					if (player.recipes.length > 3) player.recipes.pop();
					summary.push("Personne ne l'avait, donc " + player.user.toString() + " l'a récupérée");
				}

				blender.length = 0;
			}
		}

		for (var id of Object.keys(gains)) {
			var player = this.players[id]
			player.score += gains[id];
			summary.push(player.user.toString() + " a gagné " + gains[id] + (gains[id] > 1 ? " points" : " point"))
		}

		if (player) {
			this.lastPlayed = player.user.id;
			player.giveNewFruit();
			player.sendInfo();
		}

		await this.sendInfo(message, summary.join("\n"));

		// this.save();
	}

	setupReactionCollector() {
		this.clearReactionCollector();

		var emojis = this.mainclass.NUMBER_EMOJIS.slice(0, this.blenders.length);
		for (var r of emojis) this.infoMessage.react(r);

		this.collection = this.infoMessage.createReactionCollector((reaction, user) => emojis.includes(reaction.emoji.toString()) && !user.bot, { dispose: true });

		this.collection.on('collect', (reaction, user) => {
			if (this.paused) return;

			var index = emojis.indexOf(reaction.emoji.toString());
			var player = this.joinGame(this.channel.guild.members.cache.get(user.id));
			this.tryAndPlayFruit(player, index);

			reaction.users.remove(user);
		});
	}

	clearReactionCollector() {
		if (this.collection) this.collection.stop();
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
