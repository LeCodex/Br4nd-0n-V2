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

function getRankEmoji(rank) {
	if (rank < 4) return ["🥇", "🥈", "🥉"][rank - 1];
	return "🏅";
}


class Game {
	constructor(mainclass, message) {
		this.mainclass = mainclass;
		this.client = mainclass.client;

		this.dice = [];
		for (var i = 0; i < 3; i ++) {
			this.dice.push(Math.floor(Math.random() * 6));
		}

		this.scoreCategories = {
			sum1: {name: "Somme des 1", count: (tray) => tray.filter(e => e === 0).length},
			sum2: {name: "Somme des 2", count: (tray) => tray.filter(e => e === 1).length * 2},
			sum3: {name: "Somme des 3", count: (tray) => tray.filter(e => e === 2).length * 3},
			sum4: {name: "Somme des 4", count: (tray) => tray.filter(e => e === 3).length * 4},
			sum5: {name: "Somme des 5", count: (tray) => tray.filter(e => e === 4).length * 5},
			sum6: {name: "Somme des 6", count: (tray) => tray.filter(e => e === 5).length * 6},

			three: {name: "Brelan", count: (tray) => {
				var triple = tray.reduce((a, e) => { a[e] += 1; return a }, [0, 0, 0, 0, 0, 0]).map((e, i) => [e, i+1]).filter(e => e[0] >= 3)[0];
				return triple ? triple[1] * 3 : 0;
			}},
			four: {name: "Carré", count: (tray) => {
				var quadruple = tray.reduce((a, e) => { a[e] += 1; return a }, [0, 0, 0, 0, 0, 0]).map((e, i) => [e, i+1]).filter(e => e[0] >= 4)[0];
				return quadruple ? quadruple[1] * 4 : 0;
			}},
			full: {name: "Full", count: (tray) => {
				var counts = tray.reduce((a, e) => { a[e] += 1; return a }, [0, 0, 0, 0, 0, 0]);
				return counts.filter(e => e === 2).length === counts.filter(e => e === 3).length ? 25 : 0;
			}},
			small: {name: "Petite suite", count: (tray) => {
				var origin = tray.reduce((a, e) => Math.min(e, a));

				for (var i = 1; i < 4; i ++) {
					if (!tray.includes(origin + i)) return 0;
				}

				return 30;
			}},
			big: {name: "Grande suite", count: (tray) => tray.reduce((a, e) => { a[e] += 1; return a }, [0, 0, 0, 0, 0, 0]).filter(e => e).length === 5 ? 40 : 0},
			yams: {name: "Yams", count: (tray) => tray.reduce((a, e) => a * (a === e ? 1 : 0), tray[0]) * 50},
			chance: {name: "Chance", count: (tray) => tray.reduce((a, e) => a + e)}
		}
		this.players = {};
		this.lastPlayed = 0;

		if (message) {
			this.channel = message.channel;
			this.start();
		}
	}

	async reload(object) {
		await this.parse(object);
		if (!this.boardMessage) {
			await this.sendMessage();
			// this.save();
		}
		this.setupTimeout(false);
	}

	async start() {
		await this.sendMessage();

		// this.save();
	}

	async sendMessage() {
		var embed = new MessageEmbed()
			.setTitle("[YAMS] Dés disponibles")
			.setDescription(this.dice.map(e => this.mainclass.faces[e]).join(""))
			.setColor(this.mainclass.color)

		if (Object.values(this.players).length) {
			var sorted = Object.values(this.players).sort((a, b) => b.score - a.score);

			embed.addField(
				"Joueurs",
				sorted.reduce((acc, e) => {
					if (e.score < acc.lastScore) {
						acc.lastScore = e.score;
						acc.lastIndex = e.index;
						acc.rank++;
					} else if (e.index < acc.lastIndex) {
						acc.lastIndex = e.index;
						acc.rank++;
					}
					acc.message += getRankEmoji(acc.rank) + " **" + acc.rank + ".** " + (e.user ? e.user.toString() : "Joueur non trouvé") + ": **" + e.score + "**" + (e.pointsGained !== null ? " (+" + e.pointsGained + ")" : "") + " | " + e.tray.map(e => this.mainclass.faces[e]).join("") + "\n";
					return acc;
				}, {message: "", rank: 0, lastScore: Infinity, lastIndex: Infinity}).message
			);
		}

		if (this.boardMessage) {
			var length = this.channel.messages.cache.keyArray().length
			if (length - this.channel.messages.cache.keyArray().indexOf(this.boardMessage.id) > 10) {
				this.deleteBoardMessage();
				this.boardMessage = await this.channel.send(embed);
				this.setupReactionCollector();
			} else {
				this.boardMessage.edit(embed);
			};
		} else {
			this.boardMessage = await this.channel.send(embed);
			this.setupReactionCollector();
		}
	}

	async setupReactionCollector() {
		this.clearReactionCollector();

		var emojis = this.mainclass.NUMBER_EMOJIS.slice(0, this.dice.length);
		for (var e of emojis) {
			await this.boardMessage.react(e);
		};

		this.collector = this.boardMessage.createReactionCollector((reaction, user) => (emojis.includes(reaction.emoji.name) || emojis.includes(reaction.emoji)) && !user.bot);

		this.collector.on('collect', (reaction, user) => {
			try {
				reaction.users.remove(user);

				if (this.paused) return;
				if (this.lastPlayed === user.id && !this.mainclass.debug) return;

				this.lastPlayed = user.id

				for (var p of Object.values(this.players)) p.pointsGained = null;

				var player = this.players[user.id];
				var index = emojis.indexOf(reaction.emoji.name);
				if (index === -1) index = emojis.indexOf(reaction.emoji);

				if (player) {
					player.tray.push(this.dice[index]);
					this.dice[index] = Math.floor(Math.random() * 6);

					if (player.tray.length === 5) {
						var max_score = 0;
						var category = "";

						for (var [c, o] of Object.entries(this.scoreCategories)) {
							var new_score = o.count(player.tray) - (player.points[c] ? player.points[c] : 0);
							if (new_score > max_score) {
								max_score = new_score;
								category = c;
							}
						}

						if (max_score > 0) player.gainPoints(max_score, category);
						player.tray = [];
					}

					this.sendMessage().then(() => { this.save(); });
				}
			} catch (e) {
				this.client.error(this.channel, "Yams", e);
			}
		});
	}

	clearReactionCollector() {
		//if (this.boardMessage) this.boardMessage.reactions.removeAll();
		if (this.collector) this.collector.stop();
	}

	deleteBoardMessage() {
		if (this.boardMessage) {
			this.boardMessage.delete();
			this.boardMessage = null;
		}
		this.clearReactionCollector();
	}

	async resendMessage() {
		this.deleteBoardMessage();
		await this.sendMessage();
		this.save();
	}

	serialize() {
		var object = {
			channel: this.channel.id,
			players: {},
			boardMessage: this.boardMessage ? this.boardMessage.id : null,
			paused: this.paused,
			nextTimestamp: this.nextTimestamp.toMillis(),
			gamerules: this.gamerules,
			enabled: this.enabled,
			turn: this.turn,
			waitDuration: this.waitDuration,
			walls: this.walls,
			path: this.path,
			pickedUp: this.pickedUp,
			clockwiseRotation: this.clockwiseRotation,
			pawn: this.pawn,
			goal: this.goal,
			items: this.items
		};

		for (var [k, e] of Object.entries(this.players)) {
			object.players[k] = {
				score: Number(e.score),
				user: e.user.id,
				turnedOnce: e.turnedOnce,
				item: e.item,
				gainedOnePoint: e.gainedOnePoint,
				itemChannel: e.itemMessage ? e.itemMessage.channel.id : null,
				itemMessage: e.itemMessage ? e.itemMessage.id : null
			}
		}

		return object;
	}

	async parse(object) {
		this.channel = await this.client.channels.fetch(object.channel);
		this.players = {};
		this.paused = object.paused;
		this.enabled = object.enabled;
		this.gamerules = object.gamerules;
		this.waitDuration = object.waitDuration;
		this.turn = object.turn;
		this.walls = object.walls;
		this.path = object.path;
		this.pickedUp = object.pickedUp;
		this.clockwiseRotation = object.clockwiseRotation;
		this.pawn = object.pawn;
		this.goal = object.goal;
		this.items = object.items;
		this.nextTimestamp = object.nextTimestamp ? DateTime.fromMillis(object.nextTimestamp) : this.nextTimestamp;
		this.boardMessage = null;
		if (object.boardMessage) {
			this.boardMessage = await this.channel.messages.fetch(object.boardMessage);
			await this.channel.messages.fetch({ after: object.boardMessage });
			this.setupReactionCollector();
		}

		for (var [k, e] of Object.entries(object.players)) {
			var p = new Player(await this.client.users.fetch(e.user, true, true), this, true);
			p.score = e.score;
			p.turnedOnce = e.turnedOnce;
			p.item = e.item;
			p.itemMessage = null;
			p.gainedOnePoint = e.gainedOnePoint;
			if (e.itemChannel) {
				var channel = await this.client.channels.fetch(e.itemChannel);
				if (e.itemMessage) p.itemMessage = await channel.messages.fetch(e.itemMessage);
			}

			this.players[k] = p;
		};

		this.generateBoard();
	}

	save() {
		return;

		this.mainclass.load("games").then(object => {
			object.games[this.channel.id] = this.serialize();
			this.mainclass.save("games", object);
		});
	}

	delete_save() {
		this.clearReactionCollector();
		clearTimeout(this.timeout);
		this.mainclass.load("games").then(object => {
			delete object.games[this.channel.id];
			this.mainclass.save("games", object);
		});
	}
}

module.exports = exports = Game
