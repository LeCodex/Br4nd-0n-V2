const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");
const Game = require("./game.js");
const Player = require("./player.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Coup d'jus";
		this.description = "Fais des smoothies de manière douteuse";
		this.help = {
			"": "Rejoins la partie ou renvoies tes informations",
			"show": "Renvoies le message d'info de la partie",
			"<index>": "Joues ton fruit dans le mixeur à cet index"
		};
		this.commandText = "coupdjus";
		this.color = 0x50E3C2;
		this.pseudo_auth = [ "Admin" ];
		this.startDisabled = true;

		this.games = {};
		this.ready = true;
		this.debug = false;
		// this.load("games", { games : {}, debug: false }).then(object => {
		// 	for (var [channel_id, object] of Object.entries(object.games)) {
		// 		this.games[channel_id] = new Game(this)
		// 		this.games[channel_id].reload(object);
		// 	}
		// 	this.debug = object.debug;
		// 	this.ready = true;
		// });
	}

	command(message, args, kwargs, flags) {
		message.delete();

		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			var player = game.joinGame(message.member);

			if (args.length === 0) {
				if (player.infoMessage) {
					player.infoMessage.delete();
					player.infoMessage = null;
				}

				player.sendInfo();
				return;
			}

			if (isNaN(args[0])) {
				message.author.send("Veuillez renseigner un index valide");
				return;
			}

			var index = Number(args[0]) - 1;

			game.tryAndPlayFruit(player, index)
		}
	}

	com_show(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			game.sendInfo();
		}
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
			// this.load("games").then(object =>{
			// 	object.debug = this.debug;
			// 	this.save("games", object);
			// 	message.reply(this.debug);
			// });
		}
	}

	// com_turn(message, args, kwargs, flags) {
	// 	if (this.games[message.channel.id]) {
	// 		if (this.pseudo_auth.includes(message.author.id)) {
	// 			var game = this.games[message.channel.id];
	// 			game.nextTurn();
	// 		}
	//
	// 		message.delete();
	// 	}
	// }

	// com_wait(message, args, kwargs, flags) {
	// 	if (this.games[message.channel.id]) {
	// 		if (this.pseudo_auth.includes(message.author.id)) {
	// 			var game = this.games[message.channel.id];
	// 			game.waitDuration = Object.keys(kwargs).reduce((acc, element) => {
	// 				acc[element] = Number(kwargs[element]);
	// 				return acc;
	// 			}, {});
	// 			game.save();
	//
	// 			message.author.send("Wait duration now is " + game.waitDuration.minutes + " minutes and " + game.waitDuration.hours + " hours.");
	// 		}
	//
	// 		message.delete();
	// 	}
	// }

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
