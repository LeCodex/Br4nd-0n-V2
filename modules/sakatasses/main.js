const {MessageEmbed, MessageMentions} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Sakatasses";
		this.description = "Compte des tasses comme un businessman compte les étoiles";
		this.help = {
			"": "Envoie votre compte de tasses en MP",
			"add <mention list> <amount>": "Donne autant de tasses à ces utilisateurs. Accepte les chiffres négatifs",
			"set <mention list> <amount>": "Met le compte de tasses de ces utilisateurs au montant indiqué"
		}
		this.commandText = "sak";
		this.color = 0xffff66;
		this.startDisabled = true;

		this.cupEmoji = (this.client.emojis.cache.get("1036945586290708622") || "☕").toString();

		this.load("sakatasses", {}).then(e => {
			this.sak = e; 
			this.ready = true;
		});
	}

	getRankEmoji(rank) {
		if (rank < 4) return ["🥇", "🥈", "🥉"][rank - 1];
		return "🏅";
	}

	checkExistence(guild, user) {
		if (!this.sak[guild.id]) this.sak[guild.id] = {};
		if (user && !this.sak[guild.id][user.id]) this.sak[guild.id][user.id] = 0;
	}

	validate(member) {
		return member.roles.cache.has("472348007267041280") || member.user.id == process.env.ADMIN
	}

	command(message, args, kwargs, flags) {
		this.checkExistence(message.guild, message.author);

		message.reply(
			new MessageEmbed()
			.setDescription(this.cupEmoji + " Sakatasses envoyé en MP!")
			.setColor(this.color)
		);

		message.author.send("Sakatasse: **" + this.sak[message.guild.id][message.author.id] + "** " + this.cupEmoji);
		this.save("sakatasses", this.sak);
	}

	getUsers(message, args, kwargs, flags) {
		if (!this.validate(message.member)) {
			this.command(message, args, kwargs, flags);
			return null;
		}

		args.shift();
		var users = [];

		while (args.length && args[0].match(MessageMentions.USERS_PATTERN)) {
			var user = this.client.getUserFromMention(args[0]);

			if (user) {
				users.push(user);
				args.shift();
			} else {
				message.reply(
					new MessageEmbed()
					.setTitle("❌ Erreur lors de l'ajout des tasses")
					.setDescription("Mention inconnue ou invalide: " + args[0])
					.setColor(this.color)
				);
				return null;
			}
		}

		if (!users.length) {
			message.reply(
				new MessageEmbed()
				.setTitle("❌ Erreur lors de l'ajout des tasses")
				.setDescription("Aucune mention reconnue")
				.setColor(this.color)
			);
			return null;
		}

		return users;
	}

	getUsersAndAmount(message, args, kwargs, flags) {
		var users = this.getUsers(message, args, kwargs, flags);
		if (!users) return [null, null];

		if (!args.length) {
			message.reply(
				new MessageEmbed()
				.setTitle("❌ Erreur lors de l'ajout des tasses")
				.setDescription("Aucune quantité de tasse renseignée")
				.setColor(this.color)
			);
			return [null, null];
		}

		if (isNaN(args[0])) {
			message.reply(
				new MessageEmbed()
				.setTitle("❌ Erreur lors de l'ajout des tasses")
				.setDescription("Nombre de tasses invalide")
				.setColor(this.color)
			);
			return [null, null];
		}

		var amount = Number(args[0]);
		return [users, amount];
	}

	com_add(message, args, kwargs, flags) {
		var [users, amount] = this.getUsersAndAmount(message, args, kwargs, flags);
		if (!users || !amount) return;

		for (var user of users) {
			this.checkExistence(message.guild, user);
			this.sak[message.guild.id][user.id] += amount;
		}

		message.reply(
			new MessageEmbed()
			.setTitle(this.cupEmoji + " Ajout des tasses")
			.setDescription(users.map(e => e.toString()).join(", ") + (users.length > 1 ? " ont " : " a ") + (amount > 0 ? "gagné " : "perdu ") + Math.abs(amount) + " tasse" + (Math.abs(amount) > 1 ? "s" : "") + "!")
			.setColor(this.color)
		);

		this.save("sakatasses", this.sak);
	}

	com_set(message, args, kwargs, flags) {
		var [users, amount] = this.getUsersAndAmount(message, args, kwargs, flags);
		if (!users || !amount) return;

		for (var user of users) {
			this.checkExistence(message.guild, user);
			this.sak[message.guild.id][user.id] = amount;
		}

		message.reply(
			new MessageEmbed()
			.setTitle(this.cupEmoji + " Remplacement des tasses")
			.setDescription(users.map(e => e.toString()).join(", ") + (users.length > 1 ? " ont " : " a ") + "maintenant " + Math.abs(amount) + " tasse" + (Math.abs(amount) > 1 ? "s" : "") + "!")
			.setColor(this.color)
		);

		this.save("sakatasses", this.sak);
	}

	com_reset(message, args, kwargs, flags) {
		var users = this.getUsers(message, args, kwargs, flags);
		if (!users) return;

		for (var user of users) {
			this.checkExistence(message.guild, user);
			delete this.sak[message.guild.id][user.id];
		}

		message.reply(
			new MessageEmbed()
			.setTitle(this.cupEmoji + " Effacement des tasses")
			.setDescription(users.map(e => e.toString()).join(", ") + (users.length > 1 ? " ont eu leur score effacé" : " a eu son score effacé") + ".")
			.setColor(this.color)
		);

		this.save("sakatasses", this.sak);
	}

	com_clear(message, args, kwargs, flags) {
		if (!this.validate(message.member)) {
			this.command(message, args, kwargs, flags);
			return;
		}

		if (message.guild.id in this.sak) delete this.sak[message.guild.id];

		message.reply(
			new MessageEmbed()
			.setTitle(this.cupEmoji + " Suppression totale")
			.setDescription("Tous les scores du serveur ont été réinitialisés")
			.setColor(this.color)
		);

		this.save("sakatasses", this.sak);
	}

	com_rank(message, args, kwargs, flags) {
		if (!this.validate(message.member)) {
			this.command(message, args, kwargs, flags);
			return;
		}

		this.checkExistence(message.guild);
		var sorted = Object.keys(this.sak[message.guild.id]).sort((a, b) => this.sak[message.guild.id][b] - this.sak[message.guild.id][a]);
		if (!sorted.length) {
			message.reply(
				new MessageEmbed()
				.setTitle("❌ Erreur dans l'affichage du classement")
				.setDescription("Aucun utilisateur enregistré sur ce serveur")
				.setColor(this.color)
			);
			return;
		}

		var [users, sak] = this.getRankFields(message.guild.id, sorted);

		message.reply(
			new MessageEmbed()
			.setTitle("[SAKATASSES] Classement")
			.setColor(this.color)
			.addField("Utilisateurs", users, true)
			.addField("Sakatasses", sak, true)
		);

		this.save("sakatasses", this.sak);
	}

	getRankFields(guild, sorted) {
		var message = "";
		var sakMessage = "";
		var rank = 0;
		var lastScore = Infinity;

		for (var e of sorted) {
			var user = this.client.users.cache.get(e);
			var sak = this.sak[guild][e];

			if (sak < lastScore) {
				lastScore = sak;
				rank++;
			}
			
			var userText = this.getRankEmoji(rank) + " **" + rank + ".** " + (user ? user.toString() : "Utilisateur non trouvé") + "\n";
			if (message.length + userText.length > 1024) break;

			var sakText =  "**" + sak + "** " + this.cupEmoji + "\n";
			if (sakMessage.length + sakText.length > 1024) break;

			message += userText;
			sakMessage += sakText;
		}

		return [message, sakMessage];
	}
}

module.exports = exports = {MainClass};
