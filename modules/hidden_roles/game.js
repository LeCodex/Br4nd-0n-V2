const {MessageEmbed} = require('discord.js');

function shuffle(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

class Game {
	constructor(mainclass, message) {
		this.mainclass = mainclass;
		this.client = mainclass.client;
		this.channel = message.channel;
		this.admin = message.author;

		this.players = {};
		this.leftovers = []
		this.order = [];
		this.roles = {};

		this.channel.send("Game created");
	}

	sendRoles() {
		var fields = Object.keys(this.roles).map(e => {
			return {
				name: e,
				value: this.roles[e].join("\n") || "❌ Vide",
				inline: true
			}
		});

		this.channel.send(
			new MessageEmbed()
			.setTitle("[HIDDEN ROLES] Role List by Teams")
			.addFields(...fields)
			.setColor(this.mainclass.color)
		)
	}

	start(users) {
		var roles = JSON.parse(JSON.stringify(this.roles));
		this.order = shuffle(users.array().map(e => e.id));
		this.players = {};

		var collision = this.order.filter(e => this.mainclass.userToGame[e] && this.mainclass.userToGame[e] != this.channel.id);
		if (collision.length) {
			this.channel.send("**Error:** At least one of the participants (" + collision.map(e => users.get(e).toString()).join(", ") + ") is already in another game. Players cannot be part of two games at the same time.")
			this.order = [];
			return;
		}

		for (var player_id of this.order) {
			var keys = Object.keys(roles);
			var team = keys[Math.floor(Math.random() * keys.length)];
			var role = roles[team].splice(Math.floor(Math.random() * roles[team].length), 1)[0];
			var user = users.get(player_id)
			this.players[player_id] = {user: user, team: team, role: role};

			if (!roles[team].length) delete roles[team];
		}

		for (var [player_id, player] of Object.entries(this.players)) {
			player.user.send(
				new MessageEmbed()
				.setTitle("[HIDDEN ROLES] Your role and team")
				.setDescription("You are on the **" + player.team + "** team.\nYour role is **" + player.role + "**.")
				.addField("Players", this.order.map((e, i) => "**" + (i + 1) + ".** " + this.players[e].user.toString()).join("\n"))
				.setColor(this.mainclass.color)
			);

			this.mainclass.userToGame[player_id] = this.channel.id;
		}

		this.leftovers = roles;

		this.channel.send(
			new MessageEmbed()
			.setTitle("[HIDDEN ROLES] Roles and teams attributed")
			.addField("Players", this.order.map((e, i) => "**" + (i + 1) + ".** " + this.players[e].user.toString()).join("\n"))
			.setColor(this.mainclass.color)
		);
	}
}

module.exports = exports = Game;
