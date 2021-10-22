const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");
const Game = require("./game.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Werewolf";
		this.description = "Gère des parties de Loup-Garou";
		this.help = {
			"": "Démarre une partie dans le salon",
			"rules": "Envoies les règles du jeu"
		};
		this.commandText = "ww";
		this.color = 0x8B4513;

		this.load("games", { debug: false }).then(e => {
			this.games = e;
			this.debug = this.games.debug;
		});
	}

	command(message, args, kwargs, flags) {
		if (!this.games[message.channel.id]) {
			this.games[message.channel.id] = new Game(this, message);
		} else {
			message.reply("Il y a déjà une partie en cours dans ce salon.")
		}
	}

	com_debug(message, args, kwargs, flags) {
		this.debug = !this.debug;
		message.reply("Debug: " + this.debug);
		this.games.debug = this.debug;
		this.save("games", this.games);
	}
}

module.exports = exports = {MainClass};
