const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");
const Game = require("./game.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Petri";
		this.description = "A simple strategy game";
		this.help = {
			"create": "Creates a new game",
			"show": "Sends the game message again",
			"rules": "Sends the rules"
		};
		this.commandText = "petri";
		this.color = 0x00FFBF;
		// this.pseudo_auth = [];

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
		this.com_rules(message, args, kwargs, flags);
	}

	com_create(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			message.reply("Il y a déjà une partie en cours dans ce salon");
		} else {
			var game = this.games[message.channel.id] = new Game(this, message);
		}
	}

	com_show(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			if (game.infoMessage) game.deleteStackMessage();
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

	com_rules(message, args, kwargs, flags) {

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
