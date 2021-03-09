const {MessageEmbed} = require('discord.js');
const {DateTime} = require('luxon');
const {Base} = require(module.parent.path + "/base/main.js");
const Game = require("./game.js");
const Player = require("./player.js");
const fs = require('fs');

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Tartilettres";
		this.description = "Joue au Scrabble avec des peignes";
		this.help = {
			"<mot>": "Valide un mot",
			"show": "Renvoies le message d'info de la partie"
		};
		this.commandText = "tarti";
		this.color = 0x008000;
		this.pseudo_auth = [ "Admin" ];
		this.startDisabled = true;

		this.words = fs.readFileSync(module.path + '/fr.txt').toString().split("\n");

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
			if (!game.players[message.author.id]) { game.players[message.author.id] = new Player(message.member, game); }

			if (game.lastPlayed === message.author.id) {
				message.reply("Vous avez déjà joué au tour précédent, veuillez attendre");
			} else if (args.length === 0 || !this.words.includes(args[0])) {
				message.reply("Veuillez renseigner un mot valide");
			} else if (game.saidWords.includes(args[0])) {
				message.reply("Le mot a déjà été proposé");
			} else if (args[0].length !== game.wordLength) {
				message.reply("Le mot n'a pas la bonne longueur");
			} else {
				var player = game.players[message.author.id];
				player.playWord(args[0]);
			}
		}

		// message.delete();
	}

	com_show(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			game.sendTable();
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
			this.load("games").then(object =>{
				object.debug = this.debug;
				this.save("games", object);
				message.reply(this.debug);
			});
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
