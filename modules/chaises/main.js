const {MessageEmbed} = require('discord.js');
const {DateTime} = require('luxon');
const {Base} = require(module.parent.path + "/base/main.js");
const Game = require("./game.js");
const Player = require("./player.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Tasses musicales";
		this.description = "TOUT LE MONDE VEUT PRENDDRE?";
		this.help = {
			"": "Rejoins la partie et lances le dé",
			"show": "Redescends le message d'info de la partie"
		};
		this.commandText = "chaises";
		this.color = 0xad8d52;
		this.pseudo_auth = [ "Admin" ];
		this.startDisabled = true;

		this.debug = false;

		this.load("games", { games : {}, debug: false }).then(object => {
			this.games = {};
			for (var [channel_id, object] of Object.entries(object.games)) {
				this.games[channel_id] = new Game(this)
				this.games[channel_id].reload(object);
			}
			this.debug = object.debug;
			this.ready = true;
		});
	}

	command(message, args, kwargs, flags) {
		message.delete();

		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			if (!Object.keys(game.players).includes(message.author.id)) game.players[message.author.id] = new Player(message.author, game);
			var player = game.players[message.author.id];
			player.rollDice();
		}
	}

	com_show(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			game.resendMessage();
		}

		message.delete();
	}

	com_start(message, args, kwargs, flags) {
		if (this.authorize(message, this.pseudo_auth)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].paused = false;
				message.reply("Unpaused");
			} else {
				this.games[message.channel.id] = new Game(this, message);
			};
		};
	}

	com_stop(message, args, kwargs, flags) {
		if (this.authorize(message, this.pseudo_auth)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].paused = true;
				message.reply("Paused");
			};
		};
	}

	com_delete(message, args, kwargs, flags) {
		if (this.authorize(message, this.pseudo_auth)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].delete_save();
				delete this.games[message.channel.id];
				message.reply("Deleted");
			};
		};
	}

	async com_debug(message, args, kwargs, flags) {
		if (message.author.id === process.env.ADMIN) {
			this.debug = !this.debug

			object = await this.load("games", {});
			object.debug = this.debug;
			this.save("games", object);
			message.reply(this.debug);
		}
	}

	com_set(message, args, kwargs, flags) {
		if (this.authorize(message, this.pseudo_auth)) {
			if (this.games[message.channel.id]) {
				var game = this.games[message.channel.id];
				var user = this.client.getUserFromMention(args[1])

				if (!game.players[user.id]) {
					game.players[user.id] = new Player(user, game);
				}

				var player = game.players[user.id];
				Object.keys(kwargs).forEach(key => {
					player[key] = kwargs[key];
				});

				this.games[message.channel.id].save();
				message.reply("Set " + player.user.username + ": " + Object.keys(kwargs).map(k => k + "=" + player[k]).join(", "));
			};
		}
	}
}

module.exports = exports = {MainClass}
