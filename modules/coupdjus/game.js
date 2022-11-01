const {MessageEmbed} = require('discord.js');
const {DateTime} = require('luxon');
const Player = require('./player.js');
const Fruits = require('./fruits.js');

function shuffle(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function getRankEmoji(rank) {
	if (rank < 4) return ["🥇", "🥈", "🥉"][rank - 1];
	return "🏅";
}


class Game {
	constructor(mainclass, message) {
		this.mainclass = mainclass;
		this.client = mainclass.client;

		this.players = {};
		this.lastPlayed = "";
		this.paused = false;
		this.availableFruits = Object.keys(Fruits);
		this.title = "";
		this.summary = "";
		this.blenders = [
			[],
			[],
			[],
			[],
			[],
			[]
		];

		this.timeout = null;
		this.nextTimestamp = null;
		this.waitDuration = {
			minutes: 30,
			hours: 0
		};
		this.maxActions = 3;

		this.infoMessage = null;
		this.reactionCollector = null;

		if (message) {
			this.channel = message.channel;
			this.start();
		}
	}

	async reload(object) {
		await this.parse(object);
		this.setupTimeout(false);
	}

	async start() {
		await this.sendInfo();
		this.setupTimeout();
	}

	setupTimeout(newTurn = true) {
		if (this.timeout) clearTimeout(this.timeout);

		var now = DateTime.local();
		if (newTurn) {
			if (!this.nextTimestamp) this.nextTimestamp = DateTime.local();
			this.nextTimestamp = this.nextTimestamp.plus(this.waitDuration).set({ second: 0 });
			if (!this.waitDuration.minutes) this.nextTimestamp = this.nextTimestamp.set({ minute: 0 });
		}
		var time = this.nextTimestamp.toMillis() - now.toMillis();

		// console.log(this.nextTimestamp, now, this.waitDuration, time);
		this.timeout = setTimeout(() => {this.recharge()}, time);
	}

	joinGame(user) {
		var joined = false;
		if (!this.players[user.id]) { this.players[user.id] = new Player(user, this); joined = true; }
		return [this.players[user.id], joined];
	}

	tryAndPlayFruit(player, index) {
		if (this.lastPlayed === player.user.id && !this.mainclass.debug) {
			player.user.send("Vous avez déjà joué, veuillez attendre");
		} else if (player.actions == 0) {
			player.user.send("Vous n'avez plus d'actions, veuillez attendre");
		} else if (index < 0 || index >= this.blenders.length) {
			player.user.send("Veuillez renseinger un index présent sous un des mixeurs");
		} else if (this.blenders[index].some(e => e.player === player) && !this.mainclass.debug) {
			player.user.send("Vous avez déjà joué dans ce mixeur");
		} else {
			this.summary = "";
			player.playFruit(index);
		}
	}

	async sendInfo(message = "", summary = "") {
		var sorted = Object.values(this.players).sort((a, b) => b.score - a.score);

		this.title = message.length ? message : this.title;
		this.summary = summary.length ? summary : this.summary;

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

		var sorted = Object.values(this.players).sort((a, b) => b.score - a.score);
		var embed =
			new MessageEmbed()
			.setTitle("[COUP D'JUS] " + this.title)
			.addField(
				"Mixeurs",
				rows.join("\n")
			)
			.setColor(this.mainclass.color);

		if (sorted.length)
			embed.addField(
				"Cuisiniers",
				sorted.reduce((buffer, e) => {
					if (e.score < buffer.lastScore) {
						buffer.lastScore = e.score;
						buffer.rank++;
					}
					buffer.message += getRankEmoji(buffer.rank)
									+ " **" + buffer.rank + ".** "
									+ (e.user ? e.user.toString() : "Joueur non trouvé") + ": "
									+ e.fruit.emoji + " (" + e.score + " pts, " + e.actions + "/" + this.maxActions + ")\n";
					return buffer;
				}, {message: "", rank: 0, lastScore: Infinity}).message
			)

		if (this.summary.length) embed.addField("Résumé", this.summary);

		if (this.infoMessage) {
			var length = this.channel.messages.cache.keyArray().length
			if (length - this.channel.messages.cache.keyArray().indexOf(this.infoMessage.id) > 10) {
				await this.deleteInfoMessage();
				this.infoMessage = await this.channel.send(embed);
				this.setupReactionCollector();
			} else {
				this.infoMessage.edit(embed);
			};
		} else {
			this.infoMessage = await this.channel.send(embed);
			this.setupReactionCollector();
		}

		this.save();
	}

	async nextTurn(player, message) {
		var summary = [];

		var gains = {}
		for (var blender of this.blenders) {
			if (blender.length >= 3) {
				gains[blender[0].player.user.id] = 1;
				gains[blender[1].player.user.id] = gains[blender[1].player.user.id] ? gains[blender[1].player.user.id] + 1 : 1;

				var recipe = blender.map(e => e.emoji).join("");
				summary.push("La recette " + recipe + " a été complétée!");

				var used = false;
				for (var ply of Object.values(this.players)) {
					if (ply.recipes.includes(recipe)) {
						gains[blender[2].player.user.id] = 1;
						gains[ply.user.id] = gains[ply.user.id] ? gains[ply.user.id] + 1 : 1;
						used = true;
						summary.push(ply.user.toString() + " a cette recette!");
					}
				}

				if (!used) {
					player.recipes.unshift(recipe);
					if (player.recipes.length > 4) player.recipes.pop();
					summary.push("Personne ne l'avait, donc " + player.user.toString() + " l'a récupérée");
				}

				blender.length = 0;
			}
		}

		for (var id of Object.keys(gains)) {
			var ply = this.players[id]
			ply.score += gains[id];
			summary.push(ply.user.toString() + " a gagné " + gains[id] + (gains[id] > 1 ? " points" : " point"))
		}

		this.lastPlayed = player.user.id;
		player.giveNewFruit();
		await player.sendInfo();

		await this.sendInfo(message, summary.join("\n"));
	}

	async recharge() {
		for (var player of this.players) {
			player.actions = this.maxActions;
		}

		await this.sendInfo(message, summary.join("\n"));

		this.setupTimeout(true);
		this.save();
	}

	setupReactionCollector() {
		this.clearReactionCollector();

		var emojis = this.mainclass.NUMBER_EMOJIS.slice(0, this.blenders.length);
		for (var r of emojis) this.infoMessage.react(r);

		this.collection = this.infoMessage.createReactionCollector((reaction, user) => emojis.includes(reaction.emoji.toString()) && !user.bot, { dispose: true });

		this.collection.on('collect', (reaction, user) => {
			if (this.paused) return;

			var index = emojis.indexOf(reaction.emoji.toString());
			var [player, joined] = this.joinGame(this.channel.guild.members.cache.get(user.id));
			if (!joined) {
				this.tryAndPlayFruit(player, index);
			} else {
				player.sendInfo();
			}

			reaction.users.remove(user);
		});
	}

	clearReactionCollector() {
		if (this.collection) this.collection.stop();
	}

	async deleteInfoMessage() {
		this.clearReactionCollector();
		await this.infoMessage.delete();
		this.infoMessage = null;
	}


	serialize() {
		var object = {
			channel: this.channel.id,
			infoMessage: this.infoMessage ? this.infoMessage.id : null,
			players: {},
			paused: this.paused,
			nextTimestamp: this.nextTimestamp?.toMillis(),
			waitDuration: this.waitDuration,
			maxActions: this.maxActions,
			lastPlayed: this.lastPlayed,
			title: this.title,
			summary: this.summary,
			availableFruits: this.availableFruits,
			blenders: this.blenders.map(e => e.map(f => {
				return {
					name: f.constructor.name,
					player: f.player.user.id
				};
			}))
		};

		for (var [k, e] of Object.entries(this.players)) {
			object.players[k] = {
				score: Number(e.score),
				user: e.user.id,
				actions: e.actions,
				fruit: e.fruit.constructor.name,
				recipes: e.recipes,
				infoChannel: e.infoMessage.channel.id,
				infoMessage: e.infoMessage.id
			}
		}

		return object;
	}

	async parse(object) {
		this.channel = await this.client.channels.fetch(object.channel);
		this.players = {};
		this.paused = object.paused;
		this.lastPlayed = object.lastPlayed;
		this.title = object.title;
		this.summary = object.summary;
		this.availableFruits = object.availableFruits;
		this.waitDuration = object.waitDuration;
		this.maxActions = object.maxActions;
		this.nextTimestamp = object.nextTimestamp ? DateTime.fromMillis(object.nextTimestamp) : this.nextTimestamp;

		this.infoMessage = null;
		if (object.infoMessage) {
			this.infoMessage = await this.channel.messages.fetch(object.infoMessage);
			await this.channel.messages.fetch({ after: object.infoMessage });
			this.setupReactionCollector();
		}

		for (var [k, e] of Object.entries(object.players)) {
			var p = new Player(await this.channel.guild.members.fetch(e.user, true, true), this, true);
			p.score = e.score;
			p.actions = e.actions;
			p.fruit = new Fruits[e.fruit](p);
			p.recipes = e.recipes;
			p.infoMessage = null;
			if (e.infoChannel) {
				var channel = await this.client.channels.fetch(e.infoChannel);
				if (e.infoMessage) p.infoMessage = await channel.messages.fetch(e.infoMessage);
			}

			this.players[k] = p;

			// console.log(p);
		};

		this.blenders = object.blenders.map(e => e.map(f => new Fruits[f.name](this.players[f.player])));
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
