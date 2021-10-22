const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");
const Game = require("./game.js");
const Player = require('./player.js');

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Slot Machine";
		this.description = "A crowd-managed slot machine where everyone can win or lose anything";
		this.help = {
			"": "Shows your current status, as well as join the current game if not already in it",
			"pull": "Pulls the lever of the slot machine!",
			"inventory": "Sends the current stickers on the slots",
			"rank": "Sends the rank of all players in the game"
		};
		this.commandText = "slot";
		this.color = 0xdc143c;

		this.pseudo_auth = [ "Admin" ];
		this.slotEmoji = (client.emojis.cache.get("811534932731363349") || "🎰").toString();

		this.games = {};
		this.load("games", {}).then(e => {
			for (var [id, object] of Object.entries(e)) {
				this.games[id] = new Game(this, null)
				this.games[id].reload(object)
			}

			this.ready = true;
		})
	}

	command(message, args, kwargs, flags) {
		if (!this.games[message.channel.id]) {
			message.reply("There is no game in this channel");
			return;
		}

		var game = this.games[message.channel.id]

		if (!game.players[message.author.id]) {
			game.join(message)
		}

		message.channel.send(game.players[message.author.id].getInfo());
	}

	com_start(message, args, kwargs, flags) {
		if (!this.authorize(message, this.pseudo_auth)) return;

		if (this.games[message.channel.id]) {
			message.reply("There is already a game in this channel");
			return;
		}

		this.games[message.channel.id] = new Game(this, message);
		message.channel.send("Game created")
	}

	com_pull(message, args, kwargs, flags) {
		if (!this.games[message.channel.id]) {
			message.reply("There is no game in this channel");
			return;
		}

		var game = this.games[message.channel.id]

		if (!game.players[message.author.id]) {
			game.join(message);
		}

		game.pullLever(message);
	}

	com_draft(message, args, kwargs, flags) {
		if (!this.games[message.channel.id]) {
			message.reply("There is no game in this channel");
			return;
		}

		var game = this.games[message.channel.id]

		if (!game.players[message.author.id]) {
			game.join(message);
		}

		game.draft(message);
	}
}

module.exports = exports = {MainClass}
