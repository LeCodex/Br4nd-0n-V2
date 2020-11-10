const {MessageEmbed} = require('discord.js');
const {DateTime} = require('luxon');
const {Base} = require(module.parent.path + "/base/main.js");
const Game = require("./game.js");
const Player = require("./player.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Steeple Chaise";
		this.description = "Organise des courses de chaise";
		this.help = {
			"": "Inscris à la prochaine course",
			"rank": "Envoies le classement de la partie",
			"show": "Redescends le message d'info de la partie"
		};
		this.commandText = "steeple";
		this.color = 0xF0486B;
		this.pseudo_auth = [ process.env.ADMIN, "110467274535616512" ];

		// this.load("games", { games : {}, debug: false }).then(object => {
		// 	this.games = {};
		// 	for (var [channel_id, object] of Object.entries(object.games)) {
		// 		this.games[channel_id] = new Game(this)
		// 		this.games[channel_id].reload(object);
		// 	}
		// 	this.debug = object.debug;
		// });
		this.games = {};
	}

	getRankEmoji(rank) {
		if (rank < 4) return ["🥇", "🥈", "🥉"][rank - 1];
		return "🏅";
	}

	command(message, args, kwargs) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			if (!game.order.includes(message.author.id)) {
				game.players[message.author.id] = new Player(message.author, game);
				game.order.push(message.author.id);

				//message.reply("Vous avez été rejoint la partie. Vous êtes placé à la " + game.order.length + (game.order.length == 1 ? "ère" : "ème") + " place dans l'ordre");
				game.sendBoard();
			} else {
				var player = game.players[message.author.id];

				if (player.pushedBackUpOnce) {
					//message.reply("Vous avez déjà été remonté, attendez le prochain lancer");
				} else {
					game.order.splice(game.order.indexOf(message.author.id), 1);
					game.order.unshift(message.author.id);

					player.pushedBackUpOnce = true;

					//message.reply("Vous avez été remonté dans l'ordre. Vous êtes maintenant à la 1ère place");
					game.sendBoard();
				}
			}

			message.delete();
		}
	}

	com_rank(message, args, kwargs) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			var sorted = Object.values(game.players).sort((a, b) => b.score - a.score);

			message.reply(
				new MessageEmbed()
				.setTitle("[STEEPLE CHAISE] Classement")
				.setColor(this.color)
				.addField("Joueurs", sorted.reduce((buffer, e) => {
					if (e.score < buffer.lastScore) {
						buffer.lastScore = e.score;
						buffer.rank++;
					}
					buffer.message += this.getRankEmoji(buffer.rank) + " **" + buffer.rank + ".** " + (e.user ? e.user.toString() : "Joueur non trouvé") + "\n";
					return buffer;
				}, {message: "", rank: 0, lastScore: Infinity}).message, true)
				.addField("Scores", sorted.map(e => "**" + e.score + "** 🔄").join("\n"), true)
			)
		}
	}

	com_show(message, args, kwargs) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			game.deleteBoardMessage();
			game.sendBoard();
		}
	}

	com_start(message, args, kwargs) {
		if (this.pseudo_auth.includes(message.author.id)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].paused = false;
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
				message.reply("Paused");
			};
		};
	}

	com_delete(message, args, kwargs) {
		if (this.pseudo_auth.includes(message.author.id)) {
			if (this.games[message.channel.id]) {
				// this.games[message.channel.id].delete_save();
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
				game.throwDice();
			}

			message.delete();
		}
	}
}

module.exports = exports = {MainClass}
