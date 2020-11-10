const {MessageEmbed} = require('discord.js');
const {DateTime} = require('luxon');
const Tiles = require('./tiles.js');
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

		this.board = [];
		this.order = [];
		this.players = {};
		this.summary = [];
		this.paused = false;
		this.boardMessage = null;
		this.lastTimestamp = DateTime.local().setZone("Europe/Paris");
		this.enabled = Object.keys(Tiles).slice(1);
		this.collector = null;
		this.timeout = null;
		this.gamerules = {
			refillEmptyHands: false
		};
		this.waitDuration = {
			minutes: 0,
			hours: 1
		}

		if (message) {
			this.channel = message.channel;
			this.start();
		}
	}

	start() {
		this.generateBoard(60);
		this.sendBoard();
		this.setupTimeout();
	}

	setupTimeout() {
		clearTimeout(this.timeout);
		this.lastTimestamp = DateTime.local().setZone("Europe/Paris");
		var nextHour = this.lastTimestamp;
		if (this.waitDuration.hours) nextHour.set({ minute: 0 });
		nextHour = nextHour.set({ second: 0 }).plus(this.waitDuration);
		var time = nextHour.toMillis() - this.lastTimestamp.toMillis();

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

	async sendBoard(message) {
		var board = "";
		var lineSize = 15;
		for (var i = 0; i < Math.ceil(this.board.length / lineSize); i++) {
			var boardLine = "";
			var playerLines = [];
			var maxPlayers = 0;
			for (var j = 0; j < lineSize; j++) {
				if (lineSize * i + j >= this.board.length) break;

				boardLine += this.board[lineSize * i + j].emoji;
				var lines = Object.values(this.players).filter(e => e.index == lineSize * i + j).map(e => e.emoji.toString());
				playerLines.push(lines);
				maxPlayers = Math.max(maxPlayers, lines.length);
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
			.setTitle("[STEEPLE CHAISE] " + (message ? message : "Plateau"))
			.setDescription(board)
			.setColor(this.mainclass.color)

		var nbPlayersPerLine = 2;
		if (this.order.length) {
			embed.addField(
				"Ordre",
				this.order.map((e, i) => (this.players[e].pushedBackUpOnce ? "" : "**") + (i + 1) + "." + (this.players[e].pushedBackUpOnce ? " " : "** ") + this.players[e].user.toString() + ": " + this.players[e].emoji.toString() + ((i + 1) % nbPlayersPerLine === 0 ? "\n" : " | ")).join("")
			);
		}

		var activeEffects = Object.values(this.players).filter(e => e.effects.length).map(e => e.user.toString() + ": " + e.effects.map(f => f.name).join(", ")).join("\n")
		if (activeEffects.length) {
			embed.addField(
				"Effets actifs",
				activeEffects
			);
		}

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
			embed.addFields(field);
		}

		if (this.boardMessage) {
			this.boardMessage.edit(embed);
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

				var player = this.players[user.id];
				if (player) {
					player.emoji = reaction.emoji;
					this.sendBoard();
				}

				reaction.users.remove(user);
			} catch (e) {
				this.client.error(this.channel, "Steeple Chaise", e);
			}
		});
	}

	clearReactionCollector() {
		if (this.boardMessage) this.boardMessage.reactions.removeAll();
		if (this.collector) this.collector.stop();
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

		this.boardMessage = null;
		this.sendBoard();

		this.setupTimeout();
	}

	deleteBoardMessage() {
		if (this.boardMessage) {
			this.boardMessage.delete();
			this.boardMessage = null;
		}
		this.clearReactionCollector();
	}
}

module.exports = exports = Game
