const {MessageEmbed} = require('discord.js');
const {DateTime} = require('luxon');
const Tiles = require('./tiles.js');
const Player = require('./player.js');
const Effects = require('./effects.js');

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

		this.board = [];
		this.order = [];
		this.players = {};
		this.summary = [];
		this.boards = [];
		this.paused = false;
		this.boardMessage = null;
		this.nextTimestamp = DateTime.local();
		this.enabled = Object.keys(Tiles).slice(1);
		this.turn = 1;
		this.maxBoards = 20;
		this.collector = null;
		this.timeout = null;
		this.gamerules = {};
		this.waitDuration = {
			minutes: 0,
			hours: 1
		}

		if (message) {
			this.channel = message.channel;
			this.start();
		}
	}

	async start() {
		this.generateBoard(60);
		await this.sendBoard(true);
		this.setupTimeout();
		this.save();
	}

	async reload(object) {
		await this.parse(object);
		if (!this.boardMessage) {
			await this.sendBoard();
			this.save();
		}
		this.setupTimeout(false);
	}

	setupTimeout(newTurn = true) {
		if (this.timeout) clearTimeout(this.timeout);

		var now = DateTime.local();
		if (newTurn) {
			this.nextTimestamp = this.nextTimestamp.plus(this.waitDuration).set({ second: 0 });
			if (!this.waitDuration.minutes) this.nextTimestamp = this.nextTimestamp.set({ minute: 0 });
		}
		var time = this.nextTimestamp.toMillis() - now.toMillis();

		this.timeout = setTimeout(() => {this.throwDice()}, time);
	}

	generateBoard(size) {
		for (var i = 0; i < 4; i++) {
			this.enabled.forEach(element => this.board.push(new Tiles[element](this.mainclass)));
		}

		for (var i = this.board.length; i < size; i++) {
			this.board.push(new Tiles.Chair(this.mainclass));
		}

		this.board = shuffle(this.board);
	}

	async sendBoard(save = false) {
		var board = "";
		var lineSize = 12;
		for (var i = 0; i < Math.ceil(this.board.length / lineSize); i++) {
			var boardLine = "";
			var playerLines = [];
			var maxPlayers = 0;
			for (var j = 0; j < lineSize; j++) {
				if (lineSize * i + j >= this.board.length) break;

				boardLine += this.board[lineSize * i + j].emoji;
				var column = Object.values(this.players).filter(e => e.index == lineSize * i + j).map(e => e.emoji.toString());
				playerLines.push(column);
				maxPlayers = Math.max(maxPlayers, column.length);
			}

			for (var j = playerLines.length; j > 0; j--) {
				if (playerLines[j - 1].length) break;
				playerLines.pop();
			}

			var line = "";
			for (var j = maxPlayers; j > 0; j--) line += playerLines.map(e => e.length >= j ? e[j - 1] : "⬛").join("") + "\n";
			line += boardLine;

			board += line + "\n\n";
		}

		// var board = this.board.map((e, index) =>
		// 	e.emoji.toString() + " " + Object.values(this.players).filter(f => f.index === index).map(f => f.user.toString()).join(" ")
		// ).join("\n")

		var embed = new MessageEmbed()
			.setTitle("Steeple Chaise")
			.setColor(this.mainclass.color)
			.setFooter("Tour #" + this.turn + " • Mettez une réaction à ce message pour changer de pion!")

		if (this.summary.length) {
			var totalLength = 0;
			var field = {
				name: "Résumé du dernier lancer",
				value: ""
			}
			this.summary.forEach((element, i) => {
				totalLength += (element.message + "\n").length;
				if (totalLength >= 1024) {
					embed.addFields(field);
					field.value = "";
					field.name = "Suite du résumé"
					totalLength = (element.message + "\n").length;
				}
				field.value += element.message + "\n";
			});
			if (field.value.trim().length) embed.addFields(field);
		}

		var activeEffects = Object.values(this.players).filter(e => e.effects.length).map(e => e.user.toString() + ": " + e.effects.map(f => f.name).join(", ")).join("\n")
		if (activeEffects.length) {
			embed.addField(
				"Effets actifs",
				activeEffects
			);
		}

		var nbPlayersPerLine = 2;
		if (this.order.length) {
			var field = {
				name: "Ordre",
				value: ""
			}
			this.order.forEach((e, i) => {
				var string = (i + 1) + ". " + (this.players[e].pushedBackUpOnce ? "" : "__") + this.players[e].user.toString() + (this.players[e].pushedBackUpOnce ? "" : "__")  + ": " + this.players[e].emoji.toString() + ((i + 1) % nbPlayersPerLine === 0 ? "\n" : " | ")

				if (field.value.length + string.length >= 1024) {
					embed.addFields(field);
					field.value = "";
					field.name = "Suite de l'ordre"
				}

				field.value += string;
			});
			if (field.value.trim().length) embed.addFields(field);
		}

		embed.addField("Plateau", board);

		if (save) {
			this.boards.unshift(embed);
			if (this.boards.length > this.maxBoards) this.boards.pop();
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

	setupReactionCollector() {
		this.clearReactionCollector();

		this.collector = this.boardMessage.createReactionCollector((reaction, user) => true);

		this.collector.on('collect', (reaction, user) => {
			try {
				if (this.paused) return;

				var banned_emojis = ["⬛", "◼", "◾", "▪", "🖤", "〰", "➗", "✖", "➖", "➕", "➰"];
				var player = this.players[user.id];
				if (player && !banned_emojis.includes(reaction.emoji.name)) {
					player.emoji = reaction.emoji.id ? reaction.emoji : reaction.emoji.name;
					this.sendBoard();
					this.save();
				}

				reaction.users.remove(user);
			} catch (e) {
				this.client.error(this.channel, "Steeple Chaise", e);
			}
		});
	}

	throwDice() {
		this.summary = this.summary.filter(e => e.permanent);
		var diceResult = Math.floor(Math.random() * this.order.length);

		this.order.forEach(element => {
			this.players[element].turn(this, diceResult);
			this.players[element].pushedBackUpOnce = false;

			this.summary.push({
				message: ""
			});
		});

		this.order.forEach(element => {
			var player = this.players[element];
			player.effects.forEach(effect => {
				effect.throwEnd(this, player);
			});
		});

		// this.sendBoard();

		this.turn++;
		this.sendBoard(true);

		this.setupTimeout();
		this.save();
	}

	clearReactionCollector() {
		if (this.boardMessage) this.boardMessage.reactions.removeAll();
		if (this.collector) this.collector.stop();
	}

	deleteBoardMessage() {
		if (this.boardMessage) {
			this.boardMessage.delete();
			this.boardMessage = null;
		}
		this.clearReactionCollector();
	}

	async sendLogs(user) {
		var logMessage = await user.send(this.boards[0]);
		var currentLogIndex = 0;

		var emojis = ["⬅️", "➡️", "❌"];
		for (var emoji of emojis) { await logMessage.react(emoji); }
		var privateCollector = logMessage.createReactionCollector((reaction, user) => emojis.includes(reaction.emoji.name), { idle: 300000 });

		privateCollector.on('collect', (reaction, user) => {
			try {
				var index = emojis.indexOf(reaction.emoji.name);
				switch(index) {
					case 0:
						currentLogIndex = Math.min(currentLogIndex + 1, this.boards.length - 1);
						break;
					case 1:
						currentLogIndex = Math.max(currentLogIndex - 1, 0);
						break;
					case 2:
						privateCollector.stop();
						return;
				}

				console.log(currentLogIndex);
				logMessage.edit(this.boards[currentLogIndex]);
			} catch (e) {
				this.client.error(this.channel, "Steeple Chaise", e);
			}
		});

		privateCollector.on('end', () => {
			logMessage.delete();
		});
	}

	async resendMessage() {
		this.deleteBoardMessage();
		await this.sendBoard();
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
			board: this.board.map(e => e.constructor.name),
			order: this.order,
			summary: this.summary,
			boards: this.boards.map(e => e.toJSON()),
			enabled: this.enabled,
			turn: this.turn,
			waitDuration: this.waitDuration
		};

		for (var [k, e] of Object.entries(this.players)) {
			object.players[k] = {
				score: Number(e.score),
				user: e.user.id,
				effects: e.effects.map(f => {
					return {
						name: f.constructor.name,
						data: f.data
					};
				}),
				pushedBackUpOnce: e.pushedBackUpOnce,
				index: e.index,
				emoji: e.emoji.id ? e.emoji.id : e.emoji
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
		this.summary = object.summary;
		this.boards = object.boards.map(e => new MessageEmbed(e));
		this.turn = object.turn
		this.order = object.order
		this.boardMessage = null;
		if (object.boardMessage) {
			this.boardMessage = await this.channel.messages.fetch(object.boardMessage).catch(e => this.client.error(this.channel, "Steeple", e));
			await this.channel.messages.fetch({ after: object.boardMessage }).catch(e => this.client.error(this.channel, "Steeple", e));
			this.setupReactionCollector();
		}

		for (var [k, e] of Object.entries(object.players)) {
			var p = new Player(await this.client.users.fetch(e.user, true, true), this, true);
			p.score = e.score;
			p.effects = e.effects.map(f => new Effects[f.name](f.data));
			p.pushedBackUpOnce = e.pushedBackUpOnce;
			p.index = e.index;
			p.emoji = isNaN(e.emoji) ? e.emoji : await this.client.emojis.resolve(e.emoji);

			this.players[k] = p;
		};

		this.board = object.board.map(e => new Tiles[e](this.mainclass));
		this.nextTimestamp = object.nextTimestamp ? DateTime.fromMillis(object.nextTimestamp) : this.nextTimestamp;
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
