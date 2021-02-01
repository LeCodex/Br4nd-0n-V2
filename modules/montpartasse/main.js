const {MessageEmbed} = require('discord.js');
const {DateTime} = require('luxon');
const {Base} = require(module.parent.path + "/base/main.js");
const Game = require("./game.js");
const Player = require("./player.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Montpartasse";
		this.description = "S'amuse à empiler des tasses de toutes les couleurs";
		this.help = {
			"": "Reçoit une main ou voit sa propre main",
			"<nombre ou emoji>": "Joue une tasse",
			"rank": "Envoies le classement de la partie",
			"show": "Redescends le message d'info de la partie"
		};
		this.commandText = "montpartasse";
		this.color = 0xFF69B4;
		this.pseudo_auth = [ process.env.ADMIN, "110467274535616512" ];
		this.startDisabled = true;

		var emojis = this.client.emojis.cache;
		this.COLOR_EMOJIS = {
			blue: emojis.get("765264328550383626") || "🔵" ,
			green: emojis.get("765264398037680129") || "🟢",
			orange: emojis.get("765264363237933096") || "🟠",
			purple: emojis.get("765264431050653696") || "🟣",
			special: emojis.get("472452927802310676") || "⚪",
			all: emojis.get("666367471648768029") || "🌈",
			none: emojis.get("472452900602249216") || "🥛"
		};
		
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

	getRankEmoji(rank) {
		if (rank < 4) return ["🥇", "🥈", "🥉"][rank - 1];
		return "🏅";
	}

	command(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id]
			if (game.paused) return;

			game.checkForRefill();

			if (!game.players[message.author.id]) {
				game.players[message.author.id] = new Player(message.author, game);
				game.save();
			}

			var player = game.players[message.author.id];
			if (args.length) {
				if (!player.hand.length) {
					message.author.send("Votre main est vide");
				} else {
					var index = player.hand.map(e => e.emoji.toString()).indexOf(args[0]);
					if (index != -1) {
						player.playCup(game, index + 1);
					} else if (!isNaN(Number(args[0]))) {
						var index = Number(args[0]);
						if (index > 0 && index <= player.hand.length) {
							player.playCup(game, index);
						} else {
							message.author.send("Index invalide");
						}
					} else {
						message.author.send("Vous n'avez pas cette tasse dans votre main");
					}
				}
			} else {
				if (player.handMessage) {
					player.handMessage.delete();
					player.handMessage = null;
				}
				player.sendHand(game).then(game.save());
			}
		}

		message.delete();
	}

	com_rank(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			var sorted = Object.values(game.players).sort((a, b) => b.score - a.score);

			message.reply(
				new MessageEmbed()
				.setTitle("[MONTPARTASSE] Classement")
				.setColor(this.color)
				.addField("Joueurs", sorted.reduce((buffer, e) => {
					if (e.score < buffer.lastScore) {
						buffer.lastScore = e.score;
						buffer.rank++;
					}
					buffer.message += this.getRankEmoji(buffer.rank) + " **" + buffer.rank + ".** " + (e.user ? e.user.toString() : "Joueur non trouvé") + "\n";
					return buffer;
				}, {message: "", rank: 0, lastScore: Infinity}).message, true)
				.addField("Scores", sorted.map(e => "**" + e.score + "** " + this.COLOR_EMOJIS.special.toString()).join("\n"), true)
			)
		}
	}

	com_show(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			if (game.stackMessage) game.deleteStackMessage();
			game.sendStack(game.lastPlayed ? "Tasse de " + game.channel.guild.members.cache.get(game.lastPlayed).displayName : "Pile vide").then(() => game.save());
		}
	}

	com_start(message, args, kwargs, flags) {
		if (this.pseudo_auth.includes(message.author.id)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].paused = false;
				message.reply("Unpaused");
			} else {
				this.games[message.channel.id] = new Game(this, message);
			};
		};
	}

	com_stop(message, args, kwargs, flags) {
		if (this.pseudo_auth.includes(message.author.id)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].paused = true;
				message.reply("Paused");
			};
		};
	}

	com_delete(message, args, kwargs, flags) {
		if (this.pseudo_auth.includes(message.author.id)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].delete_save();
				delete this.games[message.channel.id];
				message.reply("Deleted");
			};
		};
	}

	com_refill(message, args, kwargs, flags) {
		if (this.pseudo_auth.includes(message.author.id)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].refill();
				this.games[message.channel.id].lastTimestamp = DateTime.local().setZone("Europe/Paris");
				message.reply("Refilled");
			};
		}
	}

	com_enable(message, args, kwargs, flags) {
		if (this.pseudo_auth.includes(message.author.id)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].enabled.push(...args.slice(1).filter(e => !this.games[message.channel.id].enabled.includes(e)));
				this.games[message.channel.id].save();
				message.reply("Enabled: "+ this.games[message.channel.id].enabled);
			};
		}
	}

	com_newStack(message, args, kwargs, flags) {
		if (this.pseudo_auth.includes(message.author.id)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].needRefill = true;
				this.games[message.channel.id].newStack();
			};
		}
	}

	com_disable(message, args, kwargs, flags) {
		if (this.pseudo_auth.includes(message.author.id)) {
			if (this.games[message.channel.id]) {
				for (var cup of args.slice(1)) {
					if (this.games[message.channel.id].enabled.includes(cup)) this.games[message.channel.id].enabled.splice(this.games[message.channel.id].enabled.indexOf(cup), 1);
				}
				this.games[message.channel.id].save();
				message.reply("Disabled: " + this.games[message.channel.id].enabled);
			};
		}
	}

	com_set(message, args, kwargs, flags) {
		if (this.pseudo_auth.includes(message.author.id)) {
			if (this.games[message.channel.id]) {
				var game = this.games[message.channel.id];
				var user = this.client.getUserFromMention(args[1])

				if (!game.players[user.id]) {
					game.players[user.id] = new Player(user, game);
					game.players[user.id].sendHand(game);
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

	com_gamerules(message, args, kwargs, flags) {
		if (this.pseudo_auth.includes(message.author.id)) {
			if (this.games[message.channel.id]) {
				var game = this.games[message.channel.id];
				Object.keys(kwargs).forEach(key => {
					game.gamerules[key] = (kwargs[key] === "true" ? true : false);
				});

				this.games[message.channel.id].save();
				message.reply("Gamerules set to: " + Object.keys(game.gamerules).map(k => k + "=" + game.gamerules[k]).join(", "));
			};
		}
	}

	com_debug(message, args, kwargs, flags) {
		if (this.pseudo_auth.includes(message.author.id)) {
			this.debug = !this.debug
			this.load("games").then(object =>{
				object.debug = this.debug;
				this.save("games", object);
				message.reply(this.debug);
			});
		}
	}
}

module.exports = exports = {MainClass}
