const {MessageEmbed} = require('discord.js');
const {Player} = require('./player.js');
const globals = require('./globals.js');

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

		this.players = {};
		this.order = [];
		this.turn = -1;
		this.round = 1;
		this.lastMove = "";
		this.battles = [];
		this.map = [];
		this.settings = {
			height: 10,
			width: 10,
			wallAmount: 2
		}
		this.settingsConditions = {
			height: x => x >= 4 && x % 2 == 0,
			width: x => x >= 4 && x % 2 == 0,
			wallAmount: x => x >= 0
		}

		this.gameMessage = null;
		this.reactionCollector = null;

		if (message) {
			this.channel = message.channel;
			this.start();
		}
	}

	async reload(object) {
		await this.parse(object);
	}

	async start() {
		var get_embed = () => new MessageEmbed()
			.setTitle("[PETRI] Nouvelle partie")
			.setDescription("Appuyez sur la réaction :envelope_with_arrow: pour rejoindre/quitter")
			.addField("Joueurs", Object.keys(this.players).length ? Object.values(this.players).map(e => e.user.toString()).join("\n") : "🚫 Aucun")
			.setColor(this.mainclass.color)

		var join_message = await this.channel.send(get_embed())

		var emojis = ["📩", "✅"];
		await join_message.react("📩");
		var can_start = false;

		this.collection = join_message.createReactionCollector((reaction, user) => emojis.includes(reaction.emoji.toString()) && !user.bot, { dispose: true });

		var check_player_amounts = async function(self) {
			await join_message.edit("", get_embed());

			var amount = Object.keys(self.players).length
			if (amount >= 2 && amount <= globals.PLAYER_EMOJIS.length) {
				if (!can_start) await join_message.react("✅");
				can_start = true;
			} else if (can_start) {
				await join_message.reactions.cache.get("✅").remove();
				can_start = false;
			};
		}

		this.collection.on('collect', async (reaction, user) => {
			if (reaction.emoji.toString() == "📩") {
				this.players[user.id] = new Player(this, this.channel.guild.members.cache.get(user.id));

				await check_player_amounts(this);
			} else if (can_start && this.players[user.id]) {
				await join_message.delete();
				await this.startGame();
			}
		});

		this.collection.on('remove', async (reaction, user) => {
			if (reaction.emoji.toString() == "📩") {
				delete this.players[user.id];

				await check_player_amounts(this);
			}
		});
	}

	async startGame() {
		this.collection.stop();
		this.collection = null;

		for (var id of Object.keys(this.players)) {
			this.order.push(id)
		}

		this.order = shuffle(this.order)

		for (var i = 0; i < this.order.length; i ++) {
			var id = this.order[i];
			this.players[id].index = i;
		}

		this.createMap();

		this.turn = 0;
		await this.sendInfo();
	}

	inside(x, y) {
		return y >= 0 && y < this.settings.height && x >= 0 && x < this.settings.width
	}

	createMap() {
		for (var y = 0; y < this.settings.height; y ++) {
			this.map.push([])
			for (var x = 0; x < this.settings.width; x ++) {
				this.map[y].push(-1) // -1 = vide, -2 = mur
			}
		}

		function check_bloating(self, map) {
			for (var y = 0; y < map.length; y++) {
				for (var x = 0; x < map[y].length; x++) {
					var count = 0;
					for (var dy = -1; dy <= 1; dy++) {
						for (var dx = -1; dx <= 1; dx++) {
							if (self.inside(x + dx, y + dy)) if (map[y + dy][x + dx] == -2) count += 1;
						}
					}

					if (count >= 2) return false;
				}
			}

			return true;
		}

		var new_map = null;
		do {
			new_map = JSON.parse(JSON.stringify(this.map));

			for (var my = 0; my < this.settings.height; my += this.settings.height/2) {
				for (var mx = 0; mx < this.settings.width; mx += this.settings.width/2) {
					for (var i = 0; i < this.settings.wallAmount; i++) {
						while (true) {
							y = my + Math.floor(Math.random() * this.settings.height/2)
							x = mx + Math.floor(Math.random() * this.settings.width/2)

							if (new_map[y][x] == -1) {
								new_map[y][x] = -2;
								break;
							}
						}
					}
				}
			}

			var r = Math.round(Math.min(this.settings.height, this.settings.width)/3), a = Math.random() * Math.PI * 2

			for (var i = 0; i < this.order.length; i++) {
				var id = this.order[i];

				while (new_map[Math.round(this.settings.height/2 - .5 + r * Math.sin(a))][Math.round(this.settings.width/2 - .5 + r * Math.cos(a))] != -1) a += Math.PI / 20

				this.players[id].spawn(new_map, Math.round(this.settings.height/2 - .5 + r * Math.sin(a)), Math.round(this.settings.width/2 - .5 + r * Math.cos(a)))
				a += Math.PI / this.order.length * 2;
			}

			var valid = check_bloating(this, new_map);
		} while (!valid)

		this.map = new_map;
	}

	async sendInfo() {
		var map = this.map.map(r => r.map(t => (t < 0 ? ["⬛", "⬜"][-t - 1] : globals.PLAYER_EMOJIS[t])).join("")).join("\n");

		var embed =
			new MessageEmbed()
			.setTitle("[PETRI Manche " + this.round + "] Tour de " + this.players[this.order[this.turn]].user.displayName)
			.setDescription(map)
			.addField(
				"Joueurs (Score de Domination: " + Math.floor(this.settings.width * this.settings.height / 2) + ")",
				this.order.map(e => this.players[e]).map(e => globals.PLAYER_EMOJIS[e.index] + " " + e.user.toString() + ": " + e.score).join("\n")
			)
			.setColor(globals.PLAYER_COLORS[this.players[this.order[this.turn]].index]);

		if (this.battles.length) embed.addField("Combats", this.battles.join("\n"));

		if (this.gameMessage) {
			var length = this.channel.messages.cache.keyArray().length
			if (length - this.channel.messages.cache.keyArray().indexOf(this.gameMessage.id) > 10) {
				await this.gameMessage.delete();
				this.gameMessage = await this.channel.send(embed);
				this.setupReactionCollector();
			} else {
				await this.gameMessage.edit({embed: embed});
			};
		} else {
			this.gameMessage = await this.channel.send(embed);
			this.setupReactionCollector();
		}
	}

	async nextTurn(player, message) {
		for (var player of Object.values(this.players)) player.score = 0;

		var reverse = this.order.map(e => this.players[e].index)
		var alive = this.order.map(e => false);
		for (var row of this.map) for (var tile of row) if (tile >= 0) { this.players[this.order[reverse.indexOf(tile)]].score += 1; alive[tile] = true; }

		do {
			this.turn = (this.turn + 1) % this.order.length
			if (this.turn == 0) this.round += 1;
		} while (!this.players[this.order[this.turn]].score)

		await this.sendInfo();

		if (alive.filter(e => e).length == 1) {
			await this.endGame(this.turn, "Annihilation");
			return;
		}

		for (var player of Object.values(this.players)) if (player.score >= this.settings.width * this.settings.height / 2) await this.endGame(reverse.indexOf(player.index), "Domination");
		// this.save();
	}

	async endGame(index, reason) {
		this.clearReactionCollector();
		await this.gameMessage.reactions.removeAll();

		var sorted = Object.values(this.players);
		sorted.sort((a, b) => b.score - a.score);
		this.channel.send(
			new MessageEmbed()
			.setTitle("Victoire de " + this.players[this.order[index]].user.displayName + " par " + reason + "!")
			.setDescription(sorted.map((e, i) => this.mainclass.NUMBER_EMOJIS[i] + globals.PLAYER_EMOJIS[e.index] + " " + e.user.toString() + ": " + e.score).join("\n"))
			.setColor(this.mainclass.color)
		);

		delete this.mainclass.games[this.channel.id];
	}

	setupReactionCollector() {
		this.clearReactionCollector();

		var emojis = globals.CHOICE_EMOJIS;
		for (var r of emojis) this.gameMessage.react(r);

		var death_wish = this.order.map(e => false);

		this.collection = this.gameMessage.createReactionCollector((reaction, user) => emojis.includes(reaction.emoji.toString()) && !user.bot, { dispose: true });

		this.collection.on('collect', async (reaction, user) => {
			await reaction.users.remove(user);

			if (this.order[this.turn] === user.id) {
				var index = emojis.indexOf(reaction.emoji.toString());

				if (index < 4) {
					this.players[user.id].move(index);

					death_wish[this.players[user.id].index] = false;

					this.nextTurn();
				} else if (index == 4) {
					if (death_wish[this.players[user.id].index]) {
						for (var [y, row] of this.map.entries()) {
							for (var [x, tile] of row.entries()) {
								if (tile == this.players[user.id].index) this.map[y][x] = -1;
							}
						}

						this.nextTurn();
					}

					death_wish[this.players[user.id].index] = true;
				}
			}
		});
	}

	clearReactionCollector() {
		if (this.collection) this.collection.stop();
		this.collection = null;
	}

	serialize() {
		var object = {
			channel: this.channel.id,
			players: {},
			paused: this.paused,
			lastPlayed: this.lastPlayed,
			wordLength: this.wordLength,
			saidWords: this.saidWords
		};

		for (var [k, e] of Object.entries(this.players)) {
			object.players[k] = {
				score: Number(e.score),
				user: e.user.id,
				letters: e.letters,
				taboo: e.taboo,
				possibleTaboos: e.possibleTaboos
			}
		}

		return object;
	}

	async parse(object) {
		this.channel = await this.client.channels.fetch(object.channel);
		this.players = {};
		this.paused = object.paused;
		this.lastPlayed = object.lastPlayed;
		this.wordLength = object.wordLength || 7;
		this.saidWords = object.saidWords || [];

		for (var [k, e] of Object.entries(object.players)) {
			var p = new Player(await this.channel.guild.members.fetch(e.user, true, true), this, true);
			p.letters = e.letters || {};
			p.score = e.score || this.letters.filter(e => p.letters[e]).length;
			p.taboo = typeof(e.taboo) === "object" ? (e.taboo ? e.taboo : []) : (e.taboo ? [e.taboo] : []);
			p.possibleTaboos = e.possibleTaboos || [];

			this.players[k] = p;

			// console.log(p);
		};
	}

	save() {
		this.mainclass.load("games").then(object => {
			object.games[this.channel.id] = this.serialize();
			this.mainclass.save("games", object);
		});
	}

	delete_save() {
		this.mainclass.load("games").then(object => {
			delete object.games[this.channel.id];
			this.mainclass.save("games", object);
		});
	}
}

module.exports = exports = Game
