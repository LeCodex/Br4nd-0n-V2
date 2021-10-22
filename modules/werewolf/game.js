const {MessageEmbed} = require('discord.js');
const Roles = require('./player.js');

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
		this.channel = message.channel;
		this.admin = message.author;

		this.players = {};
		this.order = [];
		this.roles = [];
		this.turn = 0;
		this.phase = 0;
		this.checklist = [];
		this.mayor = 0; //User ID of the mayor
		this.infoMessage = null;
		this.voteEnd = {
			condition: null,
			callback: null
		}

		this.create();
	}

	create() {
		function updatePlayerListMessage(game, message) {
			var embed = message.embeds[0];
			var playerList = []
			Object.values(game.players).forEach((element, i) => {
				playerList.push("• " + element.user.toString());
			});

			embed.spliceFields(0, 1, {name: "Joueurs", value: playerList.length ? playerList.join("\n") : "❌ Personne"});
			message.edit(embed).catch(e => game.client.error(this.channel, "Werewolf", e));
		}

		this.mainclass.sendChoice(
			this.channel,
			new MessageEmbed()
				.setTitle("[LOUP-GAROU] Création de la partie")
				.setDescription("Appuyez sur 📩 pour rejoindre la partie.")
				.setColor(this.mainclass.color)
				.addField("Joueurs", "❌ Personne"),
			["📩"],
			"✅",
			(collection, reaction, user) => {
				var playerAmount = Object.keys(this.players).length;
				if (reaction.emoji.name === "📩") {
					this.players[user.id] = new Roles.Player(user);
					if (playerAmount >= 2) reaction.users.remove(this.mainclass.client.user);
					updatePlayerListMessage(this, reaction.message);
				}

				return playerAmount >= 4 || this.mainclass.debug;
			},
			(collection, reaction, user) => {
				var playerAmount = Object.keys(this.players).length;
				if (reaction.emoji.name === "📩") {
					delete this.players[user.id];
					if (playerAmount < 2) reaction.message.react("📩");
					updatePlayerListMessage(this, reaction.message);
				}

				return playerAmount >= 4 || this.mainclass.debug;
			},
			(reaction, user) => user.id === this.admin.id,
			(collected) => this.startGame()
		);
	}

	startGame() {
		for (var player_id of Object.keys(this.players)) this.order.push(player_id);
		this.order = shuffle(this.order);

		if (!this.roles.length) for (var i = 0; i < this.order.length; i ++) this.roles.push(i < this.order.length/3 ? "Werewolf" : "Villager");
		var roles = shuffle(this.roles);
		for (var [player_id, player] of Object.entries(this.players)) this.players[player_id] = new Roles[roles.pop()](player.user);

		for (var player of Object.values(this.players)) player.startGame(this);

		this.dawn();
	}

	async broadcast(content, options = {}) {
		var exceptions = options.exceptions || [];
		var mode = options.mode || "normal";

		for (var [player_id, player] of Object.entries(this.players)) {
			if (!exceptions.includes(player_id)) {
				if (!player.infoMessage || mode === "set") {
					await player.user.send(content).then(m => player.infoMessage = m).catch(e => game.client.error(this.channel, "Werewolf", e));
				} else {
					await player.infoMessage.edit(content).catch(e => game.client.error(this.channel, "Werewolf", e));
				}
			}
		}

		if (!this.infoMessage || mode === "set") {
			await this.channel.send(content).then(m => this.infoMessage = m).catch(e => this.client.error(this.channel, "Werewolf", e));
		} else {
			await this.infoMessage.edit(content).catch(e => this.client.error(this.channel, "Werewolf", e));
		}
	}

	async sendInfo(message = "", options = {}) {
		var hideVotes = options.hideVotes || false;
		var maxNameLength = Object.values(this.players).reduce((acc, element) => Math.max(acc, element.user.username.length), 0);

		var embed = new MessageEmbed()
			.setTitle("[LOUP-GAROU] " + ["🌇 Aube ", "🏙️ Jour ", "🌆 Crépuscule ", "🌃 Nuit "][this.phase] + this.turn)
			.setDescription(message)
			.setColor([0xFFCA7C, 0x7EC0EE, 0xF67A37, 0x131862][this.phase])
			.addField(
				"Villageois",
				this.order.map((e, i) => this.mainclass.NUMBER_EMOJIS[i] + " " + this.players[e].user.toString()
				+ (this.mayor === e ? " 🎖️" : "")
				+ (this.players[e].lastVote > -1 && !hideVotes ? "\t\t\t\t" + this.mainclass.NUMBER_EMOJIS[this.players[e].lastVote] : "")).join("\n"), true //" ".repeat(this.players[e].username.length - maxNameLength + 1)
			);

		await this.broadcast(embed, options);
	}

	runChecklist(options = {}) {
		var first = options.first || false;
		var endMessage = options.endMessage || "";
		var mode = options.mode || "normal";

		if (first) this.checklistMessages = this.checklist.map(e => e.message);

		if (this.checklist.length) {
			var action = this.checklist.shift();
			//this.checklistMessages[0] = "__" + this.checklistMessages[0] + "__";
			this.sendInfo(this.checklistMessages.join("\n")).then(action.callback).catch(e => this.client.error(this.channel, "Werewolf", e));
		} else {
			this.sendInfo(endMessage + "\n" + ["Un nouveau jour se lève.", "", "La nuit tombe sur le village...", ""][this.phase] + "\n\n" + this.checklistMessages.join("\n"), { mode: mode })
			.then(setTimeout(() => {
				this.checklistMessages = [];
				this.phase = (this.phase + 1) % 4;
				var phase_name = ["dawn", "day", "dusk", "night"][this.phase];
				this[phase_name]();
			}, 3000))
			.catch(e => this.client.error(this.channel, "Werewolf", e));
		}
	}

	checkVoteEnd() {
		if (this.voteEnd.condition()) {
			var votes = {}

			for (var player of Object.values(this.players)) {
				player.voteMessage.delete();
				if (!votes[player.lastVote]) votes[player.lastVote] = 0;
				votes[player.lastVote] += 1;
			}

			var results = Object.keys(votes).sort((a, b) => votes[b] - votes[a]);
			this.voteEnd.callback(votes, results);
		}
	}

	checkPowersEnd() {
		if (Object.values(this.players).every(e => !e.awaitingPower)) {
			this.runChecklist();
		}
	}

	checkForDeaths() {
		var dead = [];

		for (var player_id of this.order) {
			var player = this.players[player_id];
			if (player.death) {
				if (!this.checklist.length) this.checklist.push({
					message: "Des morts sont à déplorer :",
					callback: () => this.runChecklist()
				});
				this.checklist[0].message += "\n\t• " + player.user.toString() + " est mort par " + player.death + ".";

				if (player.death_power) {
					if (this.checklist.length < 1) this.checklist.push({
						message: "De mystérieux pouvoirs se sont déclenchés :",
						callback: () => {}
					});
				}

				dead.push(player);
			}
		}

		if (dead.length) {
			for (var player_id of this.order) {
				var player = this.players[player_id];
				if (player.kill_power) {
					if (this.checklist.length < 1) this.checklist.push({
						message: "De mystérieux pouvoirs se sont déclenchés :",
						callback: () => {}
					});

					player.awaitingPower = true;
					this.checklist[0].message += "\n\t• " + player.kill_power(this, dead);
				}
			}

			for (var player of dead) {
				if (player.death_power) {
					player.awaitingPower = true;
					this.checklist[0].message += "\n\t• " + player.death_power(this);
				}
			}
		}

		this.runChecklist({ first: true });
	}

	dawn() {
		this.checkForDeaths();
		this.runChecklist({ first: true });
	}

	day() {
		if (!this.mayor) {
			this.checklist.push({
				message: "**🎖️ Un Maire️ doit être élu.** Son vote comptera double durant les égalités.",
				callback: () => {
					for (var player of Object.values(this.players)) {
						player.sendMayorVote(this).catch(e => this.client.error(this.channel, "Werewolf", e));
					}

					this.voteEnd.condition = () => Object.values(this.players).every(e => e.lastVote > -1);
					this.voteEnd.callback = (votes, results) => {
						this.checklistMessages.shift();
						if (results.length == 1 || votes[results[0]] != votes[results[1]]) {
							this.checklistMessages.push("🎖️ " + this.players[this.order[results[0]]].user.toString() + " a été élu comme Maire.");
							this.mayor = this.order[results[0]];
						} else {
							this.checklistMessages.push("🎖️ Le vote a amené à une égalité. Il est donc reporté à demain.");
						}

						this.runChecklist();
					}
				}
			});
		}

		if (this.turn) {
			this.checklist.push({
				message: "🪓 Quelqu'un doit être éliminé par le village.",
				callback: () => {
					for (var player of Object.values(this.players)) {
						player.sendDayVote(this).catch(e => this.client.error(this.channel, "Werewolf", e));
					}

					this.voteEnd.condition = () => Object.values(this.players).every(e => e.lastVote > -1);
					this.voteEnd.callback = (votes, results) => {
						this.checklistMessages.shift();
						if (results.length == 1 || votes[results[0]] != votes[results[1]]) {
							this.checklistMessages.push("🪓 " + this.players[this.order[results[0]]].user.toString() + " a été désigné pour l'élimination.");
							this.players[this.order[results[0]]].death = "Vote du village";
						} else {
							this.checklistMessages.push("🪓 Le vote a amené à une égalité. Personne n'a été éliminé.");
						}

						this.runChecklist();
					}
				}
			});
		}

		this.runChecklist({ first: true });
	}

	dusk() {
		this.checkForDeaths();

		this.runChecklist({ first: true });
	}

	night() {
		this.turn ++;
		for (var player of Object.values(this.players)) player.lastVote = -1;
		this.runChecklist({ first: true, mode: "set" });
	}

	serialize() {

	}

	parse() {

	}

	save() {

	}
}

module.exports = exports = Game;
