const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");
const Game = require("./game.js")

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Hidden Roles";
		this.description = "Offers useful commands to manage a hidden role game";
		this.help = {
			"": "Create a game in the channel, or shows all the infos of the current game",
			"roles <role names>": "Change the roles of all teams.\nUse `team=<team name>` to affect only one team.\nUse `operation=<set/remove>` to change the type of operation on the role list. Defaults to add",
			"remove <team names>": "Delete the named teams and all their roles",
			"send <mentions>": "Sends a unique role and team pairing to each mentionned user, and remembers them",
			"peek <index>": "*Can be used in DMs.*\nLook at the role and team of the player at that index",
			"call [team=<team name>] [role=<role name>]": "*Can be used in DMs.*\nGet the name of all players with that role and/or team",
			"swap <index> [second index]": "*Can be used in DMs.*\nSwap role and team with that player. If you precise a second player, instead swap both of them",
			"end": "Close the game"
		};
		this.commandText = "hr";
		this.color = 0x5599BB;
		this.dmEnabled = true;

		this.games = {}
		this.userToGame = {}
		this.ready = true;
	}

	command(message, args, kwargs, flags) {
		if (message.guild) {
			if (!this.games[message.channel.id]) {
				this.games[message.channel.id] = new Game(this, message);
			} else {
				this.games[message.channel.id].sendRoles();
			}
		}
	}

	com_roles(message, args, kwargs, flags) {
		if (message.guild) {
			if (this.games[message.channel.id]) {
				var game = this.games[message.channel.id];
				args.splice(0, 1);
				if (kwargs.team) {
					if (!game.roles[kwargs.team]) game.roles[kwargs.team] = [];
					game.roles[kwargs.team] = this.changeArray(game.roles[kwargs.team], args, kwargs.operation || "add");
				} else {
					if (!Object.keys(game.roles).length) game.roles.None = [];
					for (var key of Object.keys(game.roles)) {
						game.roles[key] = this.changeArray(game.roles[key], args, kwargs.operation || "add");
					}
				}

				game.sendRoles();
			} else {
				message.channel.send("There is no game currently running in this channel");
			}
		}
	}

	com_remove(message, args, kwargs, flags) {
		if (message.guild) {
			if (this.games[message.channel.id]) {
				var game = this.games[message.channel.id];
				if (message.author.id === game.admin.id) {
					delete game.roles[args[1]];
					game.sendRoles();
				} else {
					message.channel.send("You are not authorized to run this command");
				}
			} else {
				message.channel.send("There is no game currently running in this channel");
			}
		}
	}

	com_send(message, args, kwargs, flags) {
		if (message.guild) {
			if (this.games[message.channel.id]) {
				var game = this.games[message.channel.id];
				if (message.author.id === game.admin.id) {
					game.start(message.mentions.users);
				} else {
					message.channel.send("You are not authorized to run this command");
				}
			} else {
				message.channel.send("There is no game currently running in this channel");
			}
		}
	}

	com_peek(message, args, kwargs, flags) {
		var gameID = this.userToGame[message.author.id];
		if (this.games[gameID]) {
			var game = this.games[gameID];
			if (isNaN(args[1])) {
				message.reply("Invalid index");
			} else if (Number(args[1]) > 0 && Number(args[1]) <= game.order.length) {
				var index = Number(args[1]);
				var player = game.players[game.order[index - 1]];
				message.reply(
					new MessageEmbed()
					.setTitle("[HIDDEN ROLES] Peeking at " + player.user.username + "'s card")
					.setDescription("They are on the **" + player.team + "** team.\nTheir role is **" + player.role + "**.")
					.setColor(this.color)
				);
			} else {
				message.reply("Index out of range");
			}
		} else {
			message.reply("You are not part of a game");
		}
	}

	com_call(message, args, kwargs, flags) {
		var gameID = this.userToGame[message.author.id];
		if (this.games[gameID]) {
			var game = this.games[gameID];
			message.reply(
				new MessageEmbed()
				.setTitle("[HIDDEN ROLES] Calling players")
				.setDescription(
					Object.values(game.players).filter(e => {
						console.log(kwargs, e);
						var valid = true;
						if (kwargs.role) valid = e.role.includes(kwargs.role);
						if (kwargs.team) valid = e.team.includes(kwargs.team);
						return valid;
					}).map(e => e.user.toString()).join(", ") + " answered the call."
				)
				.setColor(this.color)
			);
		} else {
			message.reply("You are not part of a game");
		}
	}

	com_swap(message, args, kwargs, flags) {
		var gameID = this.userToGame[message.author.id];
		if (this.games[gameID]) {
			var game = this.games[gameID];
			var self = game.players[message.author.id];

			if (isNaN(args[1])) {
				message.reply("Invalid index");
			} else if (Number(args[1]) > 0 && Number(args[1]) <= game.order.length) {
				var player = game.players[game.order[Number(args[1]) - 1]];

				if (args.length > 2) {
					if (isNaN(args[2])) {
						message.reply("Invalid second index");
					} else if (Number(args[2]) > 0 && Number(args[2]) <= game.order.length) {
						var player2 = game.players[game.order[Number(args[2]) - 1]];
						[player2.role, player2.team, player.role, player.team] = [player.role, player.team, player2.role, player2.team];

						message.reply(
							new MessageEmbed()
							.setTitle("[HIDDEN ROLES] Swapping " + player.user.username + " and " + player2.user.username)
							.setDescription("You swapped their roles and teams")
							.setColor(this.color)
						);

						player.user.send(
							new MessageEmbed()
							.setTitle("[HIDDEN ROLES] Swapped with " + player2.user.username)
							.setDescription("You are now on the **" + player.team + "** team.\nYour role is now **" + player.role + "**.")
							.setColor(this.color)
						);

						player2.user.send(
							new MessageEmbed()
							.setTitle("[HIDDEN ROLES] Swapped with " + player.user.username)
							.setDescription("You are now on the **" + player2.team + "** team.\nYour role is now **" + player2.role + "**.")
							.setColor(this.color)
						);
					} else {
						message.reply("Second index out of range");
					};
				} else {
					[self.role, self.team, player.role, player.team] = [player.role, player.team, self.role, self.team];

					message.reply(
						new MessageEmbed()
						.setTitle("[HIDDEN ROLES] Swapped with " + player.user.username)
						.setDescription("You are now on the **" + self.team + "** team.\nYour role is now **" + self.role + "**.")
						.setColor(this.color)
					);

					player.user.send(
						new MessageEmbed()
						.setTitle("[HIDDEN ROLES] Swapped with " + self.user.username)
						.setDescription("You are now on the **" + player.team + "** team.\nYour role is now **" + player.role + "**.")
						.setColor(this.color)
					);
				}
			} else {
				message.reply("Index out of range");
			};
		} else {
			message.reply("You are not part of a game");
		}
	}

	com_reveal(message, args, kwargs, flags) {
		var gameID = this.userToGame[message.author.id];
		if (this.games[gameID]) {
			var game = this.games[gameID];
			var self = game.players[message.author.id];

			switch(args[1]) {
				case "team":
					game.channel.send(message.author.toString() + " revealed themselves as part of the **" + self.team + "** team!");
					break;

				case "role":
					game.channel.send(message.author.toString() + " revealed themselves as **" + self.role + "**!");
					break;

				case "both":
					game.channel.send(message.author.toString() + " revealed themselves as **" + self.role + "** and as part of the **" + self.team + "** team!");
					break;
			}
		} else {
			message.reply("You are not part of a game");
		}
	}

	com_tell(message, args, kwargs, flags) {
		var gameID = this.userToGame[message.author.id];
		if (this.games[gameID]) {
			var game = this.games[gameID];
			var self = game.players[message.author.id];
			args.shift();
			var index = Number(args.shift());
			var mesg = "**[" + self.team + "] " + self.role + ":** " + args.join(" ");

			if (isNaN(index)) {
				message.reply("Invalid index");
			} else if (index > 0 && index <= game.order.length) {
				var player = game.players[game.order[index - 1]];
				self.user.send("Sent \"" + msg + "\"");
				player.user.send(msg);
			} else if (index === 0) {
				game.channel.send(msg);
				// Object.keys(game.players).forEach(element => {
				// 	if (element != message.author.id) game.players[element].user.send(msg)
				// });
				self.user.send("Sent \"" + msg + "\"");
			} else {
				message.reply("Index out of range");
			}
		} else {
			message.reply("You are not part of a game");
		}
	}

	com_end(message, args, kwargs, flags) {
		if (message.guild) {
			if (this.games[message.channel.id]) {
				var game = this.games[message.channel.id];
				if (message.author.id === game.admin.id) {
					for (var [key, value] of Object.entries(this.userToGame)) {
						if (value === game.channel.id) delete this.userToGame[key];
					}

					delete this.games[message.channel.id];
					message.channel.send("Game deleted");
				} else {
					message.channel.send("You are not authorized to run this command");
				}
			} else {
				message.channel.send("There is no game currently running in this channel");
			}
		}
	}

	changeArray(array, value, operation) {
		switch(operation) {
			case "set":
				array = value;
				break;
			case "add":
				array.push(...value);
				break;
			case "remove":
				array = array.filter(e => !value.includes(e));
				break;
		}

		return array;
	}
}

module.exports = exports = {MainClass};
