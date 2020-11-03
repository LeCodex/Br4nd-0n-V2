class Cup {
	constructor(mainclass, player, id, fallback) {
		this.emoji = mainclass.client.emojis.cache.get(id) || fallback;
		this.player = player;
	}

	get fullName() {
		return this.emoji.toString() + " " + this.name;
	}

	async effect(game, index, effect_return = "", persistent = false) {
		game.effectStack.push({
			message: effect_return,
			persistent: persistent
		});
		var member = await game.channel.guild.members.fetch(game.lastPlayed);
		game.sendStack("Tasse de " + member.displayName).then(() => {
			var message = "";
			if (!this.player.hand.length && game.gamerules.refillEmptyHands) message = this.player.draw(game, 20);
			this.player.sendHand(game, message).then(() => game.checkStackEnd(game.players[game.lastPlayed])).catch(e => game.client.error(game.channel, "Montpartasse", e));
		}).catch(e => game.client.error(game.channel, "Montpartasse", e));
	}
}


class BlueCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "0", mainclass.COLOR_EMOJIS.blue);

		this.color = "blue";
		this.name = "Tasse bleue";
	}
}


class PurpleCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "0", mainclass.COLOR_EMOJIS.purple);

		this.color = "purple";
		this.name = "Tasse violette";
	}
}


class OrangeCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "0", mainclass.COLOR_EMOJIS.orange);

		this.color = "orange";
		this.name = "Tasse orange";
	}
}


class GreenCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "0", mainclass.COLOR_EMOJIS.green);

		this.color = "green";
		this.name = "Tasse verte";
	}
}


class CottonCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "0", mainclass.COLOR_EMOJIS.none);

		this.name = "Tasse de Coton";
		this.description = "N'est d'aucune couleur";
		this.color = "none";
	}
}

class BombCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "472452844470009876", "💣");

		this.name = "Tasse Bombe";
		this.description = "Explose toutes les tasses de la même couleur que celle d'en-dessous";
		this.color = "special";
	}

	effect(game, index) {
		if (game.stack.length - index === 1) {
			super.effect(game, index, "🧨 La Tasse Bombe n'a aucune tasse à faire exploser... 🧨");
		} else {
			var color = game.stack[index + 1].color;
			var amount = 0;

			if (color != "none") {
				for (var i = game.stack.length - 1; i >= 0; i --) {
					if (game.stack[i].color === color || game.stack[i].color === "all" || color === "all") {
						amount ++;
						game.stack.splice(i, 1);
					}
				}
			}

			// var max = 2;
			// var amount = Math.min(game.stack.length, max);
			// var exploded = [];
			// for (var i = Math.min(game.stack.length - 1, index + max); i > index ; i --) {
			// 	var cup = game.stack[i];
			// 	exploded.push(cup.fullName);
			// 	game.stack.splice(i, 1)
			// }

			if (amount) {
				// (exploded.length > 1 ? "Les " + exploded.slice(0, -1).join(", ") + " et " + exploded[exploded.length - 1] + " ont explosé" : "La " + exploded[0] + " a explosé")
				super.effect(game, index, "💥 Les tasses " + game.mainclass.COLOR_EMOJIS[color].toString()+ ", au nombre de " + amount + ", ont explosé à cause de " + game.players[game.lastPlayed].user.toString() + "! 💥", true);
			} else {
				super.effect(game, index, "🧨 La Tasse Bombe n'a trouvé aucune tasse à exploser... 🧨");
			}
		}
	}
}


class RainbowCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "0", mainclass.COLOR_EMOJIS.all);

		this.name = "Tasse Arc-en-ciel";
		this.description = "Est de toutes les couleurs à la fois";
		this.color = "all";
	}
}


class GoldenCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "472452835242541076", "📀");

		this.name = "Tasse Dorée";
		this.description = "Pioche une tasse";
		this.color = "special";
	}

	effect(game, index) {
		var message = game.players[game.lastPlayed].draw(game, 1);
		game.players[game.lastPlayed].sendHand(game, message);

		super.effect(game, index, "⏫ " + game.players[game.lastPlayed].user.toString() + " a pioché une tasse! ⏫");
	}
}


class PaintCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "472452972744409108", "🎨");

		this.name = "Tasse de Peinture";
		this.description = "Change la dernière tasse en une tasse d'une couleur aléatoire";
		this.color = "special";
	}

	effect(game, index) {
		if (game.stack.length - index === 1) {
			super.effect(game, index, "🌂 Il n'y avait pas de tasses à repeindre... 🌂");
		} else {
			var cup = game.stack[index + 1];
			var basic_cups = [OrangeCup, PurpleCup, GreenCup, BlueCup];
			var new_cup = new basic_cups[Math.floor(Math.random() * basic_cups.length)](game.mainclass, cup.player);
			game.stack.splice(index + 1, 1, new_cup);

			super.effect(game, index, "🎨 La dernière tasse a été repeinte en " + new_cup.fullName + "! 🎨");
		}
	}
}


class CactusCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "472452982081060864", "🌵");

		this.name = "Tasse Cactus";
		this.description = "Enlève la couleur de la tasse d'en-dessous";
		this.color = "special";
	}

	effect(game, index) {
		if (game.stack.length === index) {
			super.effect(game, index, "🌴 Il n'y a aucune autre tasse à percer... 🌴");
		} else {
			var cup = game.stack[index + 1];
			game.stack.splice(index + 1, 1, new CottonCup(game.mainclass, cup.player));
			super.effect(game, index, "🌵 La Tasse Cactus a percé plein de trous dans la " + cup.fullName + ". On arrive plus à voir de quelle couleur elle est! 🌵");
		}
	}
}


class StealCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "472453023969312772", "🕵");

		this.name = "Tasse Vol";
		this.description = "Prend le contrôle de la tasse d'en-dessous";
		this.color = "special";
	}

	effect(game, index) {
		if (game.stack.length - index === 1) {
			super.effect(game, index, "🤷 Il n'y a rien à voler pour la Tasse Vol 🤷");
		} else {
			var old_player = game.stack[index + 1].player;
			game.stack[index + 1].player = game.players[game.lastPlayed];
			super.effect(game, index, "🕵 ️La Tasse Vol a pris le contrôle de la " + game.stack[index + 1].fullName + " de " + old_player.user.toString() + "! 🕵");
		}
	}
}


class GhostCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "659705735105740811", "👻");

		this.name = "Tasse Fantôme";
		this.description = "N'est d'aucune couleur, mais rapporte 1 point bonus si tu finis la pile";
		this.color = "none";
	}

	stackEnd(game, winner) {
		if (winner.user.id === this.player.user.id) {
			winner.score ++;
			return "👻 ️" + this.player.user.toString() + " a fini la pile! **1 point bonus**! 👻";
		}
		return "👻 ️" + this.player.user.toString() + " n'a pas réussi à finir la pile... 👻";
	}
}


class FireCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "658794574206074889", "🔥");

		this.name = "Tasse de Feu";
		this.description = "Ré-active l'effet de la dernière tasse avec un effet";
		this.color = "special";
	}

	effect(game, index) {
		var first_effect_cup = null;
		var new_index = index;

		for (var i = index + 1; i < game.stack.length; i ++) {
			if (game.stack[i].color === "special") {
				first_effect_cup = game.stack[i];
				new_index = i;
				break;
			}
		}

		if (!first_effect_cup) {
			super.effect(game, index, "💧 Il n'y a pas d'autre tasse avec un effet dans la pile 💧");
		} else {
			game.effectStack.push({
				message: "🔥 ️La Tasse de Feu est brûlante! Au point qu'elle a déclenchée de nouveau l'effet de la " + first_effect_cup.fullName + "! 🔥",
				persistent: false
			});
			first_effect_cup.effect(game, new_index);
		}
	}
}


class MagnetCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "472452853714386956", "🧲");

		this.name = "Tasse Aimant";
		this.description = "Force le joueur qui a joué la tasse d'en-dessous à jouer une tasse au hasard de sa main";
		this.color = "special";
	}

	effect(game, index) {
		if (game.stack.length - index == 1) {
			super.effect(game, index, "✨ Il n'y a pas de joueur dont la Tasse Aimant pouvait attirer une tasse... ✨");
		} else {
			var player = game.stack[index + 1].player;

			if (player.hand.length) {
				var index = Math.floor(Math.random() * player.hand.length);
				var cup = player.hand.splice(index, 1)[0];
				player.sendHand(game, "Vous avez été forcé de jouer une tasse");
				game.stack.unshift(cup);
				game.lastPlayed = player.user.id;

				game.effectStack.push({
					message: "🧲 ️La Tasse Aimant a attiré une tasse hors de la main de " + player.user.toString() + "! 🧲",
					persistent: false
				})
				cup.effect(game, 0);
			} else {
				super.effect(game, index, "✨ " + player.user.toString() + " n'a plus de tasses en main à attirer... ✨")
			}
		}

	}
}


class ReverseCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "666755013485527044", "🔄");

		this.name = "Tasse Essat";
		this.description = "Inverse toute la pile";
		this.color = "special";
	}

	effect(game, index) {
		game.stack.reverse();
		super.effect(game, index, "🔄 La pile a été toute renversée! 🔄");
	}
}


class CarCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "472452992822542338", "🚚");

		this.name = "Tasse Voiture";
		this.description = "Défausse toutes les tasses de ta main de la même couleur que celle d'en-dessous, puis pioches-en autant";
		this.color = "special";
	}

	effect(game, index) {
		if (game.stack.length - index == 1) {
			super.effect(game, index, "📄 La livraison n'a pas de tasse de référence pour l'échange... 📄");
		} else {
			var color = game.stack[index + 1].color;
			var amount = 0;
			var player = game.players[game.lastPlayed];

			if (color != "none") {
				for (var i = player.hand.length - 1; i >= 0; i --) {
					var cup = player.hand[i];
					if (cup.color === color || cup.color === "all" || color === "all") {
						amount ++;
						player.hand.splice(i, 1);
					}
				}
			}

			player.draw(game, amount);

			super.effect(game, index, "🚚 Une livraison de tasse a échangé les tasses " + game.mainclass.COLOR_EMOJIS[color].toString() + " de " + player.user.toString() + " pour " + amount + (amount > 1 ? " nouvelles tasses" : " nouvelle tasse") + "! 🚚");
		}
	}
}


module.exports = exports = {BlueCup, PurpleCup, OrangeCup, GreenCup, CottonCup, BombCup, RainbowCup, GoldenCup, PaintCup, CactusCup, StealCup, GhostCup, FireCup, MagnetCup, ReverseCup, CarCup}
