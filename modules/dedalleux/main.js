const {MessageEmbed} = require('discord.js');
const {DateTime} = require('luxon');
const {Base} = require(module.parent.path + "/base/main.js");
const Game = require("./game.js");
const Player = require("./player.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Dédalleux";
		this.description = "Donne ta liste de course à Brax";
		this.help = {
			"": "Rejoins la partie",
			"show": "Redescends le message d'info de la partie"
		};
		this.commandText = "dédale";
		this.color = 0x144350;
		this.pseudo_auth = [ process.env.ADMIN, "110467274535616512" ];

		// this.load("games", { games : {}, debug: false }).then(object => {
		// 	this.games = {};
		// 	for (var [channel_id, object] of Object.entries(object.games)) {
		// 		this.games[channel_id] = new Game(this)
		// 		this.games[channel_id].reload(object);
		// 	}
		// 	this.debug = object.debug;
		// });
		this.debug = false;
		this.games = {};

		this.colors = {
			redSquare: this.client.emojis.cache.get("779815888353493043") || "🟥",
			blueSquare: this.client.emojis.cache.get("779815888580902922") || "🟦",
			greenSquare: this.client.emojis.cache.get("779815888252567563") || "🟩",
			yellowSquare: this.client.emojis.cache.get("779815888701751296") || "🟨",
			purpleSquare: this.client.emojis.cache.get("779815888261087234") || "🟪",
			redCirle: this.client.emojis.cache.get("779815888831512606") || "🛑",
			blueCircle: this.client.emojis.cache.get("779815888337633302") || "♾️",
			greenCircle: this.client.emojis.cache.get("779815888592568380") || "💚",
			yellowCircle: this.client.emojis.cache.get("779815888630972446") || "📀",
			purpleCircle: this.client.emojis.cache.get("779815888601874472") || "🟣"
		};
		this.pawnEmoji = this.client.emojis.cache.get("497047504043376643") || "📍";
	}

	command(message, args, kwargs) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			if (!game.players[message.author.id]) {
				game.players[message.author.id] = new Player(message.author, game);
				game.sendBoard();

		}

		message.delete();
	}

	com_show(message, args, kwargs) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			//game.resendMessage();
		}

		message.delete();
	}

	com_start(message, args, kwargs) {
		if (this.pseudo_auth.includes(message.author.id)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].paused = false;
				//this.games[message.channel.id].setupTimeout(false);
				message.reply("Unpaused");
			} else {
				this.games[message.channel.id] = new Game(this, message);
			};
		};
	}

	com_stop(message, args, kwargs) {
		if (this.pseudo_auth.includes(message.author.id)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].paused = true;
				clearTimeout(this.games[message.channel.id].timeout);
				message.reply("Paused");
			};
		};
	}

	com_delete(message, args, kwargs) {
		if (this.pseudo_auth.includes(message.author.id)) {
			if (this.games[message.channel.id]) {
				//this.games[message.channel.id].delete_save();
				delete this.games[message.channel.id];
				message.reply("Deleted");
			};
		};
	}

	com_debug(message, args, kwargs) {
		if (this.pseudo_auth.includes(message.author.id)) {
			this.debug = !this.debug
			// this.load("games").then(object =>{
			// 	object.debug = this.debug;
			// 	this.save("games", object);
			// 	message.reply(this.debug);
			// });
		}
	}

	com_turn(message, args, kwargs) {
		if (this.games[message.channel.id]) {
			if (this.pseudo_auth.includes(message.author.id)) {
				var game = this.games[message.channel.id];
				game.nextTurn();
			}

			message.delete();
		}
	}

	com_wait(message, args, kwargs) {
		if (this.games[message.channel.id]) {
			if (this.pseudo_auth.includes(message.author.id)) {
				var game = this.games[message.channel.id];
				game.waitDuration = Object.keys(kwargs).reduce((acc, element) => {
					acc[element] = Number(kwargs[element]);
					return acc;
				}, {});
				//game.save();

				message.author.send("Wait duration now is " + game.waitDuration.minutes + " minutes and " + game.waitDuration.hours + " hours.");
			}

			message.delete();
		}
	}

	com_set(message, args, kwargs) {
		if (this.pseudo_auth.includes(message.author.id)) {
			if (this.games[message.channel.id]) {
				var game = this.games[message.channel.id];
				var user = this.client.getUserFromMention(args[1]);

				if (!game.players[user.id]) {
					game.players[user.id] = new Player(user, game);
				}

				var player = game.players[user.id];
				Object.keys(kwargs).forEach(key => {
					player[key] = kwargs[key];
				});

				//this.games[message.channel.id].save();
				message.reply("Set " + player.user.username + ": " + Object.keys(kwargs).map(k => k + "=" + player[k]).join(", "));
			};
		}
	}
}

module.exports = exports = { MainClass }
