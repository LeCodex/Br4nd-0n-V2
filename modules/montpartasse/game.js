const {MessageEmbed} = require('discord.js');
const {DateTime} = require('luxon');
const Cups = require('./cups.js');
const Player = require('./player.js');

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

		this.stack = [];
		this.effectStack = [];
		this.nextStack = [];
		this.specialCups = [];
		this.players = {};
		this.lastPlayed = "";    // The player who last send a command to play a cup and so cannot play
		this.lastCupPlayer = ""; // The player who last played a cup and so will be credited as responsible for the stack collapse
		this.paused = false;
		this.stackMessage = null;
		this.needRefill = false;
		this.lastTimestamp = DateTime.local().setZone("Europe/Paris");
		this.enabled = Object.keys(Cups).slice(this.COLOR_COUNT);
		this.collection = null;
		this.gamerules = {
			refillEmptyHands: false
		};

		if (message) {
			this.channel = message.channel;
			this.rerollSpecials();
			this.newStack();
		}
	}

	get COLOR_COUNT() {
		return 5;
	}

	reload(object) {
		this.parse(object).catch(e => this.client.error(this.channel, "Montpartasse", e));
	}

	newStack(description = "") {
		if (this.stackMessage) this.clearReactionCollector();
		this.stackMessage = null;
		this.stack = [...this.nextStack];
		this.effectStack = [];
		this.lastPlayed = "";

		this.channel.send(
			new MessageEmbed()
			.setTitle("[MONTPARTASSE] Nouvelle pile")
			.setDescription(description + "La table est nettoyée, les morceaux jetés, et les points comptés. Que le jeu continue!")
			.setColor(this.mainclass.color)
			.addField("Tasses spéciales", this.specialCups.length ? this.specialCups.map(e => "__" + e.emoji.toString() + " " + e.name + ":__ " + e.description).join("\n") : "❌ Aucune")
		).then(this.sendStack("Pile vide"));

		this.save();
	}

	async sendStack(info, description = "") {
		var summary = this.stack.reduce((buffer, element) => {
			if (element.color === "none") return buffer;

			if (!buffer[element.color]) buffer[element.color] = 0;
			buffer[element.color] += 1;
			return buffer;
		}, {});

		var content = new MessageEmbed()
			.setTitle("[MONTPARTASSE] " + info)
			.setDescription(this.stack.map(e => e.emoji.toString() + " " + e.player.user.toString()).join("\n") + "\n\n" + this.effectStack.map(e => e.message).join("\n"))
			.setColor(this.mainclass.color)
			.addField("Résumé", Object.keys(summary).length ? Object.keys(summary).sort().map(e => this.mainclass.COLOR_EMOJIS[e].toString() + " : **" + summary[e] + "**").join(" | ") : "❌ Aucune tasse dans la pile")
			.addField("Tasses spéciales", this.specialCups.map(e => "__" + e.emoji.toString() + " " + e.name + ":__ " + e.description).join("\n"));

		if (this.stackMessage) {
			var length = this.channel.messages.cache.keyArray().length
			if (length - this.channel.messages.cache.keyArray().indexOf(this.stackMessage.id) > 10) {
				this.deleteStackMessage();
				this.stackMessage = await this.channel.send(content);
				this.setupReactionCollector();
			} else {
				this.stackMessage.edit(content);
			};
		} else {
			this.stackMessage = await this.channel.send(content);
			this.setupReactionCollector();
		}
	}

	setupReactionCollector() {
		this.clearReactionCollector();

		var emojis = Object.keys(this.mainclass.COLOR_EMOJIS).slice(0, this.COLOR_COUNT - 1).map(e => this.mainclass.COLOR_EMOJIS[e]);
		emojis.push(...this.specialCups.map(e => e.emoji));
		for (var r of emojis) this.stackMessage.react(r).catch(e => this.client.error(this.channel, "Montpartasse", e));
		emojis = Object.values(Cups).map(e => new e(this.mainclass, null).emoji);

		this.collection = this.stackMessage.createReactionCollector((reaction, user) => emojis.map(e => e.toString()).includes(reaction.emoji.toString()) && !user.bot && this.players[user.id], { dispose: true });

		this.collection.on('collect', (reaction, user) => {
			try {
				if (this.paused) return;

				this.checkForRefill();

				var player = this.players[user.id];
				if (!player.hand.length) {
					user.send("Votre main est vide");
				} else {
					var index = player.hand.map(e => e.emoji.toString()).indexOf(reaction.emoji.toString());
					if (index != -1) {
						player.playCup(this, index + 1);
					} else {
						user.send("Vous n'avez pas cette tasse dans votre main");
					}
				}

				reaction.users.remove(user);
			} catch (e) {
				this.client.error(this.channel, "Montpartasse", e);
			}
		});
	}

	clearReactionCollector() {
		if (this.stackMessage) this.stackMessage.reactions.removeAll();
		if (this.collection) this.collection.stop();
	}

	deleteStackMessage() {
		this.stackMessage.delete();
		this.stackMessage = null;
		this.clearReactionCollector();
	}

	checkStackEnd(player) {
		var color_sort = {};
		var rainbow_count = 0;

		for (var cup of this.stack) {
			if (cup.color != "none") {
				if (cup.color === "all") {
					rainbow_count ++;
				} else {
					if (!color_sort[cup.color]) color_sort[cup.color] = 0;
					color_sort[cup.color] += 1;
				}

				console.log(color_sort, rainbow_count);

				if (Object.keys(color_sort).length + rainbow_count === this.COLOR_COUNT) {
					this.endStack(player, null);
					return true;
				}

				for (var [key, amount] of Object.entries(color_sort)) {
					if (amount + rainbow_count === this.COLOR_COUNT) {
						this.endStack(player, key);
						return true;
					}
				}
			}
		}

		this.save();
		return false;
	}

	endStack(player, victorious_color = null) {
		this.nextStack = [];
		var custom_messages = [
			"La pile s'est effrondée! Oh non!",
			"ATCHOUM ! Sortez les cirés, cachez-vous sous les chaises, Chris a éternué ! L'air explusé de son gros nez a provoqué une déviation vers l'ouest qui a fait se renverser la pile.",
			"Un tremblement de terre de magnitude 0.5 sur l'échelle de Richter a fait s'effondrer la pile... Ah non, c'est un jet de trébuchet à tasses. Avec un trébuchet à tasses.",
			"La tasse a été posée, tout le monde a regardé, puis s'est rendu compte qu'une condition était vérifiée et ils ont tapé dedans pour la faire tomber. Des fois on respecte juste les règles.",
			"Nilphesai arrive avec sa grosse boule de bowling de champion départemental de Seine-et-Oise (diamètre d'1m20, pas étonnant) et défonce littéralement la pile. Strike et dix de der.",
			"Pendant qu'AirDur dessinait la pile sur son carnet, la position des anses aidant, elle a activé un sort d'anihilation sur la pile avec sa styloguette. Elle aurait pu anihilier le bar au moins...",
			"Holly a renversé du sel. C'est bien suffisant pour faire tomber une pile. En fait, quoiqu'il fasse, ça fait tomber un truc, ça casse des machins et ça lance des tasses. Souvent dans la gueule.",
			"La table s'est prise une flèche dans le genou, du coup elle est plus droite et la pile s'est renversée en voulant poser la tasse. Et le gâteau c'est du fake, on sait pas cuisiner.",
			"Vous avez fait un rêve la nuit dernière. Vous trouviez la goldentasse, avec la gloire et la richesse que ça implique. Et vous vous en êtes souvenu pile là. Et justement, la pile...",
			"\"Tiens, ça fait longtemps que j'ai pas passé Les Sardines de Patrick Sébastien\" se disait Chris. Quelle bonne idée de faire sauter les gens sur place au moment où vous jouez.",
			"Soudain, une plume de l'oreiller de Venus (dont elle ne se sert jamais) vole en direction de votre aisselle droite. On aura jamais entendu un rire aussi gras.",
			"Au moment où vous posez votre tasse, vous vous rendez compte que Solstice a beaucoup trop de points au classement. La rage vous fait alors faire une clé de bras à la pile. Ippon.",
			"Vous connaissez ce moment, au Jungle Speed, où vous avez une paire avec votre voisin et qu'il y a un pot avec la moitié du paquet ? Pourquoi vous avez sauté sur la pile alors ?",
			"Et c'est à ce moment où quelqu'un a appelé Compote de pommes. L'équivalent de la production annuelle de Normandie a envahi la salle, pour le plaisir de Holly. Moins pour celui de la pile.",
			"Non mais quelle idée de poser la tasse sur l'anse aussi. \"C'est pour les points de style\", sérieux ? Vous voulez encore casser nos jeux, oui. Je vais aller remplir un formulaire.",
			"En posant votre tasse, vous avez louché. Votre œil gauche à vu le nez de Chris qui coulait, le droit a repéré Holly qui dansait. Dégoût 1, pile 0. C'est une référence à Dominique Farrugia.",
			"\"Mais pourquoi pas faire une pyramide ?\". Cette remarque de Tsuby a foutu tout le monde en rogne, qui lui a lancé tout ce qui était à portée : chaises, ampoules, débats, Garfield... Et la pile.",
			"Vous deviez recevoir un appel très important aujourd'hui. Pour ne pas le manquer, vous avez mis votre portable sur vibreur puissance max. Plus qu'à attVRRR VRRR VRRR VRRR VRRR VRRR",
			"Pour une fois que vous jouez correctement, il y a un nouveau client qui entre dans le bar. Pour une fois que quelqu'un entre dans le bar, il y a une tempête à 180 km/h dehors.",
			"La pile était belle, tout était bien aligné. Jusqu'à ce que Chris se rende compte que la première tasse posée était sa BTF (Best Tasse Forever). On ne discute pas les caprices du Pôtron.",
			"En voyant la hauteur de la pile, Chris à eu l'idée d'un concours de pole dance. Mais il n'avait pas précisé que la pile ne devait pas servir de barre. On ne dira pas qui a essayé.",
			"Holly et Chris ont trinqué trop fort, les étincelles ont provoqué un feu ! Les pompiers sont arrivés très rapidement, ils ont juste eu à descendre le long de la barre... Ah, c'était la pile.",
			"En posant votre tasse, la pile s'est transformé en grosse pile AAAAAA dont les volts vous ont touchés. Évidemment, on l'a retirée pour pouvoir continuer à jouer. Votre santé ? Connais pas.",
			"Des indiens qui passaient par là ont pensé que la pile était en fait le totem d'Ysun. Ils ont dansé autour de la table, tenté de scalper Arma (une idée de Chris) puis emmené la pile avec eux.",
			"\"Ok, donc vous avez posé la tasse, puis tout le monde a cligné des yeux en même temps et pouf, apu la pile ? Non mais vous croyez que je vais gober ça ?\" Tout le monde a alors cligné des yeux.",
			"Je sais, on aurait pas dû casser la pile. Mais au bout de 353 mètres de hauteur, fallait qu'on intervienne. La grue coûte une blinde, faut qu'on bouche le toit et un avion a failli rentrer dedans.",
			"Vous connaissez la blague de tasse le Yoshi ? C'est un Yoshi qui devait se prendre une tasse mais comme vous savez pas viser vous avez lancé le Yoshi contre une pile de tasses pour pas vous rater.",
			"C'est alors qu'un camion arriva en trombe dans le bar, manquant d'écraser tout le monde. Seule la pile n'a pas survé... Ah non, c'était le chat de Venus. Désolé, j'ai lu ce qu'a écrit Booti.",
			"Je voulais profiter de ce bot pour vous délivrer un message : vous êtes les meilleurs. Non, vraiment, j'insiste. C'est super de vous avoir ici. La pile ? Oui bah non, on peut pas tout avoir.",
			"En voyant la hauteur de la pile, la Délégation a décidé de faire passer un test anti-dopage aux tasses qui s'y trouvent. Elle les a donc réquisitionnées et emmenées aux toilettes pour... Pardon ?",
			"La dernière tasse que vous avez posée touche le plafond (vous avez fait comment ?). Alphard est alors arrivée avec une masse pour exploser le plafond. On a bien ri, puis on a flippé. Fin du tour.",
			"Solstice se mit alors à raconter une histoire impliquant une petite fille, un chaton et une tronçonneuse. Un truc tellement triste qu'on a retrouvé la pile... Complètement effondrée.",
			"Braxer s'est posé sur la première tasse, pour voir s'il était capable de pondre un œuf. Mais comme il a le vertige et que 30 cm c'est déjà trop haut pour lui, faut qu'on arrête ce tour. Désolé.",
			"Tolizebra a collé des stickers :slurp: sur toute la pile. Quand Booti est arrivé, ça a été un vrai carnage. La panIIIIIIIIIIIIIIIIK, en quelque sorte. Si vous cherchez Toli, il est aux toilettes.",
			"Afin de déconcentrer les joueurs, tout le monde a décidé de sauter sur place au même moment... Le bar s'est effondré. La pile, elle, va bien. Vous par contre, si je vous trouve...",
			"Et là, Nilphesai nous a montré sa dextérité en retirant la nappe sous la pile sans la faire tomber. Mais il n'y avait pas de nappe, il a donc retiré la table. Pas besoin de vous raconter la suite."
		];

		var description = custom_messages[Math.floor(Math.random() * custom_messages.length)] + "\n\n";
		var last_player_score_gain = this.stack.filter(e => e.player.user.id === player.user.id).length;
		player.score += last_player_score_gain;
		description += player.user.toString() + ", vous gagnez **" + last_player_score_gain + (last_player_score_gain > 1 ? " points" : " point") + "** (1 pour chaque tasse que vous avez jouée). "
			+ "Les autres, vous gagnez 1 point " + (victorious_color ? "pour chaque tasse " + this.mainclass.COLOR_EMOJIS[victorious_color].toString() + " que vous avez jouée!\n\n" : "pour chaque couleur que vous avez jouée!\n\n")

		var played_colors = {}
		for (var player_id of Object.keys(this.players)) {
			if (player_id != player.user.id) {
				played_colors[player_id] = [];
				for (var cup of this.stack.filter(e => e.player.user.id === player_id)) {
					if (
						cup.color === "all" ||
						!victorious_color && !played_colors[player_id].includes(cup.color) && cup.color != "none" ||
						victorious_color && cup.color === victorious_color
					) played_colors[player_id].push(cup.color);
				}
			}
		}

		for (var [player_id, colors] of Object.entries(played_colors)) {
			if (colors.length > 0) {
				this.players[player_id].score += colors.length;
				description += this.players[player_id].user.toString() + " gagne **" + colors.length + (colors.length > 1 ? " points" : " point")
					+ "** (" + colors.sort().map(e => this.mainclass.COLOR_EMOJIS[e].toString()).join(", ") + ")\n";
			}
		}

		var trigger_returns = this.stack.reduce((buffer, cup, index) => {
			if (cup.stackEnd) return buffer += cup.stackEnd(this, player, index) + "\n";
			return buffer;
		}, "");

		this.newStack(description + (trigger_returns.length ? "\n" + trigger_returns : "") + "\n");
	}

	checkForRefill() {
		var now = DateTime.local().setZone("Europe/Paris");
		if (this.lastTimestamp.get('hour') < 12 && now.get('hour') >= 12 || this.lastTimestamp.get('hour') >= 12 && now.get('hour') < 12 || this.lastTimestamp.get('day') != now.get('day')) this.refill();
		this.lastTimestamp = DateTime.local().setZone("Europe/Paris");
	}

	rerollSpecials() {
		this.specialCups = [];
		var cups = shuffle([...this.enabled]);

		for (var i = 0; i < Math.min(this.enabled.length, 3); i ++) {
			this.specialCups.push(new Cups[cups.pop()](this.mainclass, null));
		}
	}

	refill() {
		this.rerollSpecials();

		var max = 20;
		var max_refill = 10;

		for (var player of Object.values(this.players)) {
			if (max - player.hand.length > 0) {
				var message = player.draw(this, Math.min(max_refill, max - player.hand.length));
				player.sendHand(this, message);
			}
		}

		this.channel.send(
			new MessageEmbed()
			.setTitle("[MONTPARTASSE] Nouvelle tournée")
			.setDescription("**Les mains ont été de nouveau remplies! Voici les trois nouvelles tasses spéciales!**")
			.setColor(this.mainclass.color)
			.addField("Tasses spéciales", this.specialCups.length ? this.specialCups.map(e => "__" + e.emoji.toString() + " " + e.name + ":__ " + e.description).join("\n") : "❌ Aucune")
		);

		this.save();
	}

	serialize() {
		var object = {
			channel: this.channel.id,
			players: {},
			stack: this.stack.map(e => {return {
				cup: e.constructor.name,
				player: e.player.user.id
			}}),
			specialCups: this.specialCups.map(e => e.constructor.name),
			lastPlayed: this.lastPlayed,
			stackMessage: this.stackMessage ? this.stackMessage.id : null,
			paused: this.paused,
			enabled: this.enabled,
			lastTimestamp: this.lastTimestamp.toMillis(),
			gamerules: this.gamerules,
			effectStack: this.effectStack
		};

		for (var [k, e] of Object.entries(this.players)) {
			object.players[k] = {
				hand: e.hand.map(e => e.constructor.name),
				score: Number(e.score),
				user: e.user.id,
				handMessage: e.handMessage ? e.handMessage.id : null,
				handChannel: e.handMessage ? e.handMessage.channel.id : null
			}
		};

		return object;
	}

	async parse(object) {
		this.channel = await this.client.channels.fetch(object.channel);
		this.players = {};
		this.specialCups = object.specialCups.map(e => new Cups[e](this.mainclass, null));
		this.lastPlayed = object.lastPlayed;
		this.paused = object.paused;
		this.enabled = object.enabled;
		this.gamerules = object.gamerules;
		this.effectStack = object.effectStack;
		this.stackMessage = null;
		if (object.stackMessage) {
			this.stackMessage = await this.channel.messages.fetch(object.stackMessage).catch(e => this.client.error(this.channel, "Montpartasse", e));
			await this.channel.messages.fetch({ after: object.stackMessage }).catch(e => this.client.error(this.channel, "Montpartasse", e));
			this.setupReactionCollector();
		}

		for (var [k, e] of Object.entries(object.players)) {
			var p = new Player(await this.client.users.fetch(e.user, true, true), this, true);
			p.score = e.score;
			p.hand = e.hand.map(f => new Cups[f](this.mainclass, p));
			p.handMessage = null;
			if (e.handChannel) {
				var channel = await this.client.channels.fetch(e.handChannel).catch(e => this.client.error(this.channel, "Montpartasse", e));
				if (e.handMessage) p.handMessage = await channel.messages.fetch(e.handMessage).catch(e => this.client.error(this.channel, "Montpartasse", e));
			}
			this.players[k] = p;
		};

		this.stack = object.stack.map(e => new Cups[e.cup](this.mainclass, this.players[e.player]));
		this.lastTimestamp = object.lastTimestamp ? DateTime.fromMillis(object.lastTimestamp).setZone("Europe/Paris") : this.lastTimestamp;
	}

	save() {
		this.mainclass.load("games").then(object => {
			object.games[this.channel.id] = this.serialize();
			this.mainclass.save("games", object);
		});
	}

	delete_save() {
		this.clearReactionCollector();
		this.mainclass.load("games").then(object => {
			delete object.games[this.channel.id];
			this.mainclass.save("games", object);
		});
	}
}

module.exports = exports = Game;
