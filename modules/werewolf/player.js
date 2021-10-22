const {MessageEmbed} = require('discord.js');

class Player {
	constructor(user) {
		this.user = user;

		this.nightOrder = -1; // -1: Doesn't wake up. 2 is Werewolf phase
		this.awaitingPower = false; // Everyone must have this set to false before we can proceed to the next step.
		this.infoMessage = null;
		this.voteMessage = null;
		this.lastVote = -1;
		this.death = null; // Set to the reason when has to die
	}

	startGame(game) {
		var embed = new MessageEmbed()
			.setTitle("[LOUP-GAROU] Début de partie: " + this.name)
			.setDescription(this.description + " " + this.team_objective)
			.setColor(this.color);

		embed = this.addRoleInfo(game, embed);
		this.user.send("||\n\n\n\n\n\n\n\n\n\n\n\n||", embed);
	}

	addRoleInfo(game, embed) {
		return embed;
	}

	async sendVote(game, content, emojis, choice_name) {
		this.lastVote = -1;
		this.voteMessage = await game.mainclass.sendChoice(
			this.user,
			content,
			emojis, //.filter((e, i) => i != game.order.indexOf(this.user.id))
			"✅",
			(collection) => collection.collected.array().filter(e => e.users.cache.has(this.user.id)).length == 1,
			null,
			() => true,
			(collection, collected) => {
				var index = emojis.indexOf(collected.firstKey());
				var embed = collection.message.embeds[0];

				embed.setDescription("Tu as voté pour " + collected.firstKey() + " " + choice_name(index));
				this.voteMessage.edit(embed).then(() => {
					this.lastVote = index;
					game.checkVoteEnd();
				}).catch(e => game.client.error(this.channel, "Werewolf", e));
			},
			{ dontDelete: true }
		);
	}

	async sendMayorVote(game) {
		await this.sendVote(
			game,
			new MessageEmbed()
				.setTitle("[LOUP-GAROU] 🎖️ Vote pour le Maire")
				.setDescription("Vote pour le joueur que tu veux voir Maire. Son vote comptera double en cas d'égalité.")
				.setColor(0xEEEEEE),
			game.mainclass.NUMBER_EMOJIS.slice(0, game.order.length),
			index => game.players[game.order[index]].user.toString()
		);
	}

	async sendDayVote(game) {
		await this.sendVote(
			game,
			new MessageEmbed()
				.setTitle("[LOUP-GAROU] 🪓 Vote pour l'élimination")
				.setDescription("Vote pour le joueur que tu veux éliminer.")
				.setColor(0xFF0000),
			game.mainclass.NUMBER_EMOJIS.slice(0, game.order.length),
			index => game.players[game.order[index]].user.toString()
		);
	}
}

//---------------------------VILLAGERS----------------------------

class Villager extends Player {
	constructor(user) {
		super(user);

		this.allegiance = "village";

		this.name = "👨‍🌾 Villageois";
		this.description = "Tu n'as pas de pouvoirs spéciaux.";
		this.team_objective = "Tu dois trouver tous les Loups-Garous.";
		this.color = 0xFFFF00;
	}
}


class Seer extends Villager {
	constructor(user) {
		super(user);

		this.nightOrder = 1;

		this.name = "🔮 Voyante";
		this.description = "Chaque nuit, sauf la première, tu pourras regarder le rôle de quelqu'un.";
		this.color = 0x8A2BE2;
	}

	night_power(game, night) {
		if (night > 1) {

		}
	}
}


class Witch extends Villager {
	constructor(user) {
		super(user);

		this.nightOrder = 3;

		this.name = "⚗️ Sorcière";
		this.description = "Chaque nuit, une fois dans la partie chacune, tu pourras utiliser ta potion de vie ou ta potion de mort.";
		this.color = 0xCC2200;
	}
}


class Cupid extends Villager {
	constructor(user) {
		super(user);

		this.nightOrder = 0;

		this.name = "💘 Cupidon";
		this.description = "Au début de la partie, tu choisiras deux amoureux. Ils ne pourront alors plus vivre l'un sans l'autre.";
		this.color = 0x00FFFF;
	}

	kill_power(game, dead) {

	}
}


class Hunter extends Villager {
	constructor(user) {
		super(user);

		this.name = "🏹 Chasseur";
		this.description = "Quand tu mourras, tu pourras choisir quelqu'un à emmener dans la tombe avec toi.";
		this.color = 0x808000;
	}

	death_power(game) {
		// game.mainclass.sendChoice(
		//	 this.user
		// )
		return "🏹 " + this.user.toString() + ", en tant que Chasseur, va maintenant choisir quelqu'un d'autre à emporter dans la tombe avec lui."
	}
}

//---------------------------WEREWOLVES----------------------------

class Werewolf extends Player {
	constructor(user) {
		super(user);

		this.allegiance = "werewolf";
		this.nightOrder = 2;

		this.name = "🐺 Loup-Garou";
		this.description = "Chaque nuit, tu te réveilleras avec tes compères pour dévorer quelqu'un.";
		this.team_objective = "Vous devez éliminer tous les villageois.";
		this.color = 0xB80000;
	}

	add_role_info(game, embed) {
		return embed.addField("Tes compères", game.order.filter(e => game.players[e].allegiance === "werewolf").map((e, i) => game.mainclass.NUMBER_EMOJIS[i] + " " + game.players[e].user.toString()).join("\n"));
	}

	async night_power() {
		await this.sendVote(
			game,
			new MessageEmbed()
				.setTitle("[LOUP-GAROU] 🐺 Choix de la victime")
				.setDescription("Vote pour le joueur que tu veux voir éliminer ce soir.")
				.setColor(0xB80000),
			game.mainclass.NUMBER_EMOJIS.slice(0, game.order.length),
			index => game.players[game.order[index]].user.toString()
		);
	}
}


class WhiteWolf extends Werewolf {
	constructor(user) {
		super(user);

		this.name = "🌕 Loup Blanc";
		this.description += " De plus, tu pourras, une fois toutes les deux nuits, dévorer une personne supplémentaire, y compris un Loup Garou!";
		this.team_objective = "Soit le dernier en vie.";
		this.color = 0xEEEEEE;
	}
}


module.exports = exports = {Player, Villager, Seer, Witch, Cupid, Hunter, Werewolf, WhiteWolf};
