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

		this.scoreCategories = {
			sum1: {name: "Somme des 1", count: (player) => player.tray.filter(e => e === 0).length},
			sum2: {name: "Somme des 2", count: (player) => player.tray.filter(e => e === 1).length * 2},
			sum3: {name: "Somme des 3", count: (player) => player.tray.filter(e => e === 2).length * 3},
			sum4: {name: "Somme des 4", count: (player) => player.tray.filter(e => e === 3).length * 4},
			sum5: {name: "Somme des 5", count: (player) => player.tray.filter(e => e === 4).length * 5},
			sum6: {name: "Somme des 6", count: (player) => player.tray.filter(e => e === 5).length * 6}
		}

		this.paused = false;
		this.players = {};
		this.lastPlayed = 0;
		this.lastTimestamp = 0;
		this.boardMessage = null;
		this.collector = null;

		if (message) {
			this.channel = message.channel;
			this.start();
		}
	}

	async reload(object) {
		await this.parse(object);
		if (!this.boardMessage) {
			await this.sendMessage();
			this.save();
		}

		this.resetTimeout();
	}

	get allFigures() {
		return {
			triple: {name: "3️⃣ Brelan (Somme des dés)", count: (player) => player.tray.reduce((a, e) => { a[e] += 1; return a }, [0, 0, 0, 0, 0, 0]).filter(e => e[0] >= 3).length ? player.tray.reduce((a, e) => a + e + 1, 0) : 0},
			quadruple: {name: "4️⃣ Carré (Somme des dés)", count: (player) => player.tray.reduce((a, e) => { a[e] += 1; return a }, [0, 0, 0, 0, 0, 0]).filter(e => e[0] >= 4).length ? player.tray.reduce((a, e) => a + e + 1, 0) : 0},
			doublePairs: {name: "2️⃣ Double paire (Somme des dés)", count: (player) => player.tray.reduce((a, e) => { a[e] += 1; return a }, [0, 0, 0, 0, 0, 0]).filter(e => e[0] >= 2).length >= 2 ? player.tray.reduce((a, e) => a + e + 1, 0) : 0},
			full: {name: "🏠 Full (25 points)", count: (player) => {
				var counts = player.tray.reduce((a, e) => { a[e] += 1; return a }, [0, 0, 0, 0, 0, 0]);
				return counts.filter(e => e === 2).length === counts.filter(e => e === 3).length && counts.filter(e => e === 2).length === 1 ? 25 : 0;
			}},

			palindrome: {name: "🔀 Palindrome (Somme des dés)", count: (player) => player.tray[0] === player.tray[4] && player.tray[1] === player.tray[3] ? player.tray.reduce((a, e) => a + e + 1, 0) : 0},
			increasing: {name: "📈 Séquence croissante (Somme des dés de la séquence)", count: (player) => {
				var sequences = [], sequence= [];
				var max_number = -1;
				for (var number of player.tray) {
					if (number > max_number) {
						sequence.push(number);
						max_number = number;
					} else {
						sequences.push(sequence);
						sequence = [];
						max_number = -1;
					}
				}

				var totals = sequences.map(e => e.reduce((a, f) => a + f + 1, 0));
				totals.sort();
				return totals[0];
			}},
			decreasing: {name: "📉 Séquence décroissante (Somme des dés de la séquence)", count: (player) => {
				var sequences = [], sequence= [];
				var min_number = 6;
				for (var number of player.tray) {
					if (number < min_number) {
						sequence.push(number);
						min_number = number;
					} else {
						sequences.push(sequence);
						sequence = [];
						min_number = -1;
					}
				}

				var totals = sequences.map(e => e.reduce((a, f) => a + f + 1, 0));
				totals.sort();
				return totals[0];
			}},
			fifteen: {name: "🎯 15 pile", count: (player) => player.tray.reduce((a, e) => a + e + 1, 0) === 15 ? 15 : 0},

			even: {name: "✌️ Somme des pairs", count: (player) => player.tray.reduce((a, e) => a + (e + 1) * (e % 2), 0)},
			odd: {name: "☝️ Somme des impairs", count: (player) => player.tray.reduce((a, e) => a + (e + 1) * ((e + 1) % 2), 0)},
			petals: {name: "🌹 Pétales (2pts par 3, 4pts par 5, si que des impairs)", count: (player) => player.tray.filter(e => e % 2).length === 5 ? player.tray.reduce((a, e) => a + [0, 0, 2, 0, 4, 0][e], 0) : 0},
			price_is_right: {name: "*️⃣ Multiplication (40 ou moins)", count: (player) => player.tray.reduce((a, e) => a * e, 1) <= 40 ? player.tray.reduce((a, e) => a * e, 1) : 0},
			repetition: {name: "🔁 Répétition (30 points)", count: (player) => player.tray.reduce((a, e) => { a[e] += 1; return a }, [0, 0, 0, 0, 0, 0]) === player.oldTray.reduce((a, e) => { a[e] += 1; return a }, [0, 0, 0, 0, 0, 0]) ? 30 : 0},

			mini: {name: "🦠 Mini suite (25 points)", count: (player) => {
				var origin = player.tray.reduce((a, e) => Math.min(e, a));
				for (var i = 1; i < 3; i ++) {
					if (!player.tray.includes(origin + i)) return 0;
				}
				return 25;
			}},
			small: {name: "🐛 Petite suite (30 points)", count: (player) => {
				var origin = player.tray.reduce((a, e) => Math.min(e, a));
				for (var i = 1; i < 4; i ++) {
					if (!player.tray.includes(origin + i)) return 0;
				}
				return 30;
			}},
			big: {name: "🐍 Grande suite (40 points)", count: (player) => {
				var origin = player.tray.reduce((a, e) => Math.min(e, a));
				for (var i = 1; i < 5; i ++) {
					if (!player.tray.includes(origin + i)) return 0;
				}
				return 40;
			}},

			yams: {name: "🎲 Yams (50 points)", count: (player) => {
				for (var i = 1; i < player.tray.length; i ++) {
					if (player.tray[i] !== player.tray[0]) return 0;
				}
				return 50;
			}},
			quinte: {name: "🃏 Quinte Flush (Grande suite dans l'ordre croissant, 60 points)", count: (player) => player.tray.reduce((a, e) => [e, e === a + 1], [player.tray[0]-1, true])[1] ? 60 : 0}
		};
	}

	async start() {
		this.rerollEverything();

		var figures = this.allFigures;
		var keys = Object.keys(figures);

		for (var i = 0; i < 6; i ++) {
			var key = keys.splice(Math.floor(Math.random() * keys.length), 1)[0];
			this.scoreCategories[key] = figures[key];
		}
		this.scoreCategories.chance = {name: "Chance (Somme des dés)", count: (player) => player.tray.reduce((a, e) => a + e + 1, 0)}

		this.save();
	}

	resetTimeout() {
		clearTimeout(this.timeout);
		this.timeout = setTimeout(() => { this.rerollEverything() }, this.lastTimestamp - Date.now() + 1440000);
	}

	async rerollEverything() {
		this.dice = [];
		for (var i = 0; i < 3; i ++) {
			this.dice.push(Math.floor(Math.random() * 6));
		}

		this.lastTimestamp = Date.now();
		this.resetTimeout();

		await this.resendMessage();
	}

	async sendMessage() {
		var embed = new MessageEmbed()
			.setTitle("[YAMS] Dés disponibles" + (this.lastPlayed ? " | Dernier dé pris par " + this.players[this.lastPlayed].user.displayName : ""))
			.setDescription(this.dice.map(e => this.mainclass.faces[e]).join(""))
			.setColor(this.mainclass.color)

		if (Object.values(this.players).length) {
			var sorted = Object.values(this.players).sort((a, b) => b.score - a.score);
			var value = sorted.reduce((acc, e) => {
				if (e.score < acc.lastScore) {
					acc.lastScore = e.score;
					acc.lastIndex = e.index;
					acc.rank++;
				} else if (e.index < acc.lastIndex) {
					acc.lastIndex = e.index;
					acc.rank++;
				}
				acc.message.push(getRankEmoji(acc.rank) + " **" + acc.rank + ".** " + (this.lastPlayed === e.user.id ? "__" : "") + (e.user ? e.user.toString() : "Joueur non trouvé") + (this.lastPlayed === e.user.id ? "__" : "") + ": **" + e.score + "**" + (e.pointsGained !== null ? " (+" + e.pointsGained + ")" : "") + " | " + e.tray.map(e => this.mainclass.faces[e]).join(""));
				return acc;
			}, {message: [], rank: 0, lastScore: Infinity, lastIndex: Infinity}).message;

			var totalLength = 0;
			var field = {
				name: "Joueurs",
				value: ""
			}
			value.forEach((element, i) => {
				totalLength += (element + "\n").length;
				if (totalLength >= 1024) {
					embed.addFields(field);
					field.value = "";
					field.name = "Suite des joueurs"
					totalLength = (element + "\n").length;
				}
				field.value += element + "\n";
			});
			if (field.value.trim().length) embed.addFields(field);
		}

		if (this.boardMessage) {
			var length = this.channel.messages.cache.keyArray().length
			if (length - this.channel.messages.cache.keyArray().indexOf(this.boardMessage.id) > 10) {
				this.deleteMessage();
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

	async setupReactionCollector(skip_reacting = false) {
		this.clearReactionCollector();

		var emojis = this.mainclass.NUMBER_EMOJIS.slice(0, this.dice.length);
		if (!skip_reacting) {
			for (var e of emojis) {
				await this.boardMessage.react(e);
			};
		}

		this.collector = this.boardMessage.createReactionCollector((reaction, user) => (emojis.includes(reaction.emoji.name) || emojis.includes(reaction.emoji)) && !user.bot);

		this.collector.on('collect', (reaction, user) => {
			try {
				reaction.users.remove(user);

				if (this.paused) return;

				if (!this.players[user.id]) this.players[user.id] = new Player(this.channel.guild.members.cache.get(user.id), this);
				var player = this.players[user.id];
				var index = emojis.indexOf(reaction.emoji.name);
				if (index === -1) index = emojis.indexOf(reaction.emoji);

				if (this.lastPlayed === user.id && !this.mainclass.debug) return;
				this.lastPlayed = user.id;
				this.lastTimestamp = Date.now();

				for (var p of Object.values(this.players)) p.pointsGained = null;

				player.tray.push(this.dice[index]);
				this.dice[index] = Math.floor(Math.random() * 6);

				if (player.tray.length === 5) {
					var max_score = 0;
					var category = "";

					for (var [c, o] of Object.entries(this.scoreCategories)) {
						var new_score = o.count(player) - (player.points[c] ? player.points[c] : 0);
						if (new_score > max_score) {
							max_score = new_score;
							category = c;
						}
					}

					player.oldTray = [...player.tray];
					player.tray = [];
					if (max_score > 0) player.gainPoints(max_score, category);
				}

				this.resetTimeout();
				this.sendMessage().then(() => { this.save(); });
			} catch (e) {
				this.client.error(this.channel, "Yams", e);
			}
		});
	}

	clearReactionCollector() {
		if (this.collector) this.collector.stop();
	}

	deleteMessage() {
		if (this.boardMessage) {
			this.boardMessage.delete();
			this.boardMessage = null;
		}
		this.clearReactionCollector();
	}

	async resendMessage() {
		this.deleteMessage();
		await this.sendMessage();
		this.save();
	}

	serialize() {
		var object = {
			channel: this.channel.id,
			players: {},
			boardMessage: this.boardMessage ? this.boardMessage.id : null,
			paused: this.paused,
			dice: this.dice,
			lastPlayed: this.lastPlayed,
			lastTimestamp: this.lastTimestamp,
			scoreCategories: Object.keys(this.scoreCategories)
		};

		for (var [k, e] of Object.entries(this.players)) {
			object.players[k] = {
				score: Number(e.score),
				user: e.user.id,
				tray: e.tray,
				oldTray: e.oldTray,
				points: e.points,
				pointsGained: e.pointsGained,
				sheetChannel: e.sheetMessage ? e.sheetMessage.channel.id : null,
				sheetMessage: e.sheetMessage ? e.sheetMessage.id : null
			}
		}

		return object;
	}

	async parse(object) {
		this.channel = await this.client.channels.fetch(object.channel);
		this.players = {};
		this.dice = object.dice;
		this.paused = object.paused;
		this.lastPlayed = object.lastPlayed;
		this.lastTimestamp = object.lastTimestamp;

		var scoreCategoriesKeys = object.scoreCategories;
		var figures = this.allFigures;
		for (var key of scoreCategoriesKeys) {
			if (figures[key]) this.scoreCategories[key] = figures[key];
		}
		this.scoreCategories.chance = {name: "Chance (Somme des dés)", count: (player) => player.tray.reduce((a, e) => a + e + 1, 0)}

		this.boardMessage = null;
		if (object.boardMessage) {
			this.boardMessage = await this.channel.messages.fetch(object.boardMessage);
			await this.channel.messages.fetch({ after: object.boardMessage });
			this.setupReactionCollector(true);
		}

		for (var [k, e] of Object.entries(object.players)) {
			var p = new Player(await this.channel.guild.members.fetch(e.user, true, true), this, true);
			p.score = e.score;
			p.tray = e.tray;
			p.oldTray = e.oldTray;
			p.points = e.points;
			p.sheetMessage = null;
			if (e.sheetChannel) {
				var channel = await this.client.channels.fetch(e.sheetChannel);
				if (e.sheetMessage) p.sheetMessage = await channel.messages.fetch(e.sheetMessage);
			}

			this.players[k] = p;
		}
	}

	save() {
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
