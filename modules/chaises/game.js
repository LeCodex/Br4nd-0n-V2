const {MessageEmbed} = require('discord.js');
const {DateTime} = require('luxon');
const Player = require('./player.js');


class Game {
	constructor(mainclass, message) {
		this.mainclass = mainclass;
		this.client = mainclass.client;

		this.players = {};
		this.paused = false;
		this.boardMessage = null;
		this.previousPlayers = [];
		this.waitAmount = 2;
		this.chairs = [];
		
		if (message) {
			this.channel = message.channel;
			this.start();
		}
	}

	async start() {
		for (var i = 0; i < 50; i++) this.chairs.push(null);
		await this.sendBoard(true);
		this.save();
	}

	async reload(object) {
		await this.parse(object);
		if (!this.boardMessage) {
			await this.sendBoard();
			this.save();
		}
	}

	async sendBoard() {
		var message = "";
		
		var columns = [];
		var rowCount = 0, maxRowCount = 5;
		for (var i = 0; i < maxRowCount; i++) columns.push([]);

		// Store columns
		var maxIndexLength = String(this.chairs.length-1).length;
		this.chairs.forEach((chair, i) => {
			var indexString = (i+1).toString().padStart(maxIndexLength, "0");
			var placeString = chair ? this.players[chair].toString() : "..." 
			columns[rowCount].push(`[${indexString}] ${placeString}`);
			rowCount = (rowCount + 1) % maxRowCount;
		});

		// Render chairs with padding
		rowCount = 0;
		var i = 0, columnsMaxLengths = columns.map(e => e.reduce((acc, str) => Math.max(acc, str.length), 0));
		while (i < columns[rowCount].length) {
			var tileString = columns[rowCount][i];
			message += tileString;

			if (++rowCount == maxRowCount) {
				rowCount = 0; i++;
				message += "\n";
			} else {
				var padding = columnsMaxLengths[rowCount-1] - tileString.length;
				if (padding > 0) message += " ".repeat(padding);
				message += " | ";
			};
		}

		// Render scores
		message += "\n- SCORES -\n";
		var playersByScore = {}, maxScore = 0;
		for (var player of Object.values(this.players)) {
			if (!playersByScore[player.score]) playersByScore[player.score] = [];
			if (maxScore < player.score) maxScore = player.score;
			playersByScore[player.score].push(player);
		}

		for (var i = maxScore; i > 0; i--) {
			if (playersByScore[i]) message += `${i}. ${playersByScore[i].map(e => e.toString()).join(", ")}\n`;
		}

		// Render last players
		message += "\n- DERNIERS JOUEURS -\n";
		message += this.previousPlayers.map(e => this.players[e].toString()).join(", ");

		message = "```\n" + message + "```";
		this.boardMessage = await this.channel.send(message);
		// if (this.boardMessage) {
		// 	var length = this.channel.messages.cache.keyArray().length;
		// 	if (length - this.channel.messages.cache.keyArray().indexOf(this.boardMessage.id) > 10) {
		// 		this.deleteBoardMessage();
		// 		this.boardMessage = await this.channel.send(message);
		// 	} else {
		// 		await this.boardMessage.edit(message);
		// 	};
		// } else {
		// 	this.boardMessage = await this.channel.send(message);
		// }
	}

	async markChair(index, player) {
		// Mark the player as having played
		this.previousPlayers.push(player.user.id);
		if (this.previousPlayers.length > this.waitAmount) this.previousPlayers.shift();

		if (!this.chairs[index]) {
			// Just place the cutout in the chair
			this.chairs[index] = player.user.id;
		} else if (this.chairs[index] == player.user.id) {
			// Burn all the cutouts
			this.chairs = this.chairs.map(e => e == player.user.id ? null : e);
		} else {
			// Replace the cutout and give a point
			this.players[this.chairs[index]].score++;
			this.chairs[index] = player.user.id;
		}

		await this.sendBoard();
		this.save();
	}

	deleteBoardMessage() {
		if (this.boardMessage) {
			this.boardMessage.delete();
			this.boardMessage = null;
		}
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
			previousPlayers: this.previousPlayers,
			waitAmount: this.waitAmount,
			chairs: this.chairs
		};

		for (var [k, e] of Object.entries(this.players)) {
			object.players[k] = {
				score: Number(e.score),
				user: e.user.id
			}
		}

		return object;
	}

	async parse(object) {
		this.channel = await this.client.channels.fetch(object.channel);
		this.players = {};
		this.paused = object.paused;
		this.previousPlayers = object.previousPlayers;
		this.waitAmount = object.waitAmount;
		
		this.boardMessage = null;
		if (object.boardMessage) {
			this.boardMessage = await this.channel.messages.fetch(object.boardMessage).catch(e => this.client.error(this.channel, this.mainclass.name, e));
			if (this.boardMessage) {
				await this.channel.messages.fetch({ after: object.boardMessage }).catch(e => this.client.error(this.channel, this.mainclass.name, e));
			}
		}

		for (var [k, e] of Object.entries(object.players)) {
			var p = new Player(await this.client.users.fetch(e.user, true, true), this, true);
			p.score = e.score;
			this.players[k] = p;
		};

		this.chairs = object.chairs;
	}

	save() {
		this.mainclass.load("games", {games: {}}).then(object => {
			object.games[this.channel.id] = this.serialize();
			this.mainclass.save("games", object);
		});
	}

	delete_save() {
		this.mainclass.load("games", {games: {}}).then(object => {
			delete object.games[this.channel.id];
			this.mainclass.save("games", object);
		});
	}
}

module.exports = exports = Game
