const {MessageEmbed} = require('discord.js');
const {DateTime} = require('luxon');
const {Base} = require(module.parent.path + "/base/main.js");
const Game = require("./game.js");
const Player = require("./player.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Yams";
		this.description = "Récupère des dés";
		this.help = {
			"": "Rejoins la partie",
			"show": "Redescends le message d'info de la partie"
		};
		this.commandText = "yams";
		this.color = 0x4ba250;
		this.pseudo_auth = [ "Admin" ];
		this.startDisabled = true;

		this.faces = [
			this.client.emojis.cache.get("780049455511765003") || "1️⃣",
			this.client.emojis.cache.get("780049455911141376") || "2️⃣",
			this.client.emojis.cache.get("780049455897772032") || "3️⃣",
			this.client.emojis.cache.get("780049456322183170") || "4️⃣",
			this.client.emojis.cache.get("780049455935914014") || "5️⃣",
			this.client.emojis.cache.get("780488746822533163") || "6️⃣"
		];

		this.games = {};
		this.load("games", { games : {}, debug: false }).then(object => {
			for (var [channel_id, object] of Object.entries(object.games)) {
				this.games[channel_id] = new Game(this)
				this.games[channel_id].reload(object);
			}
			this.debug = object.debug;
			this.ready = true;
		});
	}

	command(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			if (!game.players[message.author.id]) {
				game.players[message.author.id] = new Player(message.member, game);
				game.sendMessage().then(() => { game.save(); });
			}
		}

		message.delete();
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
				//this.games[message.channel.id].setupTimeout(false);
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
				clearTimeout(this.games[message.channel.id].timeout);
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

	com_debug(message, args, kwargs, flags) {
		if (message.author.id === process.env.ADMIN) {
			this.debug = !this.debug
			this.load("games").then(object =>{
				object.debug = this.debug;
				this.save("games", object);
				message.reply(this.debug);
			});
		}
	}

	com_set(message, args, kwargs, flags) {
		if (message.author.id === process.env.ADMIN) {
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

				game.save();
				message.reply("Set " + player.user.username + ": " + Object.keys(kwargs).map(k => k + "=" + player[k]).join(", "));
			};
		}
	}
}

module.exports = exports = { MainClass }
