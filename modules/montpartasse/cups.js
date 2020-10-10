class Cup {
	constructor(mainclass, player, id, fallback) {
		this.emoji = (mainclass.client.emojis.cache.get(id) || fallback).toString();
		this.player = player;
	}

	get fullName() {
		return this.emoji + " " + this.name;
	}

	effect(game, index, effect_return = "") {
		game.effectStack.push(effect_return);
		game.sendStack("Tasse de " + game.channel.guild.members.cache.get(game.lastPlayed).displayName, game.effectStack.join("\n")).then(() => {
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


class BombCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "472452844470009876", "💣");

		this.name = "Tasse Bombe";
		this.description = "Explose toutes les tasses de la même couleur que celle en-dessous";
		this.color = "special";
	}

	effect(game, index) {
		if (game.stack.length === 1) return "🧨 La Tasse Bombe n'a aucune tasse à exploser... 🧨";

		var color = game.stack[index + 1].color;
		var amount = 0;

		for (var i = game.stack.length - 1; i >= 0; i --) {
			if (game.stack[i].color === color || game.stack[i].color === "all" || color === "all") {
				amount ++;
				game.stack.splice(i, 1);
			}
		}

		super.effect(game, index, "💥 Toutes les tasses " + game.mainclass.COLOR_EMOJIS[color] + ", au nombre de " + amount + ", ont explosé! 💥");
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
		game.players[game.lastPlayed].draw(game, 1);

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
		var cup = game.stack[index + 1];
		var basic_cups = [OrangeCup, PurpleCup, GreenCup, BlueCup];
		var new_cup = new basic_cups[Math.floor(Math.random() * basic_cups.length)](game.mainclass, cup.player);
		game.stack.splice(index + 1, 1, new_cup);

		super.effect(game, index, "🎨 La dernière tasse a été repeinte en " + new_cup.fullName + "! 🎨");
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
		if (game.stack.length - index === 1) {
			super.effect(game, index, "🌴 Il n'y a aucune autre tasse à percer... 🌴");
		} else {
			var cup = game.stack[index + 1];
			game.stack.splice(index + 1, 1, new CottonCup(game.mainclass, cup.player));
			super.effect(game, index, "🌵 La Tasse Cactus a percé plein de trous dans la " + cup.fullName + ". On arrive plus à voir de quelle couleur elle est! 🌵");
		}
	}
}


class CottonCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "472452900602249216", "🥛");

		this.name = "Tasse de Coton";
		this.description = "N'est d'aucune couleur";
		this.color = "none";
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
			super.effect(game, index, "🤷 Il n'y avait rien à voler pour la Tasse Vol 🤷");
		} else {
			var old_player = game.stack[index + 1].player;
			game.stack[index + 1].player = this.player;
			super.effect(game, index, "🕵 ️La Tasse Vol a pris le contrôle de la " + game.stack[index + 1].fullName + " de " + old_player.user.toString() + "! 🕵");
		}
	}
}


class GhostCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "659705735105740811", "👻");

		this.name = "Tasse Fantôme";
		this.description = "N'est d'aucune couleur, mais rapporte 2 points si tu finis la pile";
		this.color = "none";
	}

	stackEnd(game, winner) {
		if (winner.user.id === this.player.user.id) {
			winner.score ++;
			return "👻 ️" + this.player.user.toString() + " a fini la pile! La Tasse Fantôme lui rapporte donc un point bonus! 👻";
		}
		return "👻 ️" + this.player.user.toString() + " n'a pas réussi à finir la pile: la Tasse Fantôme disparaît sans laisser de points... 👻";
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

		if (!first_effect_cup) super.effect(game, index, "💧 Il n'y a pas d'autre tasse avec un effet dans la pile 💧");
		game.effectStack.push("🔥 ️La Tasse de Feu est brûlante! Au point qu'elle a déclenchée de nouveau l'effet de la " + first_effect_cup.fullName + "! 🔥");
		first_effect_cup.effect(game, new_index);
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
			super.effect(game, index, "✨ Il n'y a pas de joueur dont la Tasse Aimant pouvait attirer une tasse ✨");
		} else {
			var player = game.stack[index + 1].player;
			var index = Math.floor(Math.random() * player.hand.length);
			var cup = player.hand.splice(index, 1)[0];
			player.sendHand(game, "Vous avez été forcé de jouer une tasse");
			game.stack.unshift(cup);
			game.lastPlayed = player.user.id;

			game.effectStack.push("🧲 ️La Tasse Aimant a attiré une tasse hors de la main de " + player.user.toString() + "! 🧲")
			cup.effect(game, index + 1);
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
		this.description = "Défausse toutes les tasses de ta main de la même couleur que celle d'en-desosus, puis pioches-en autant";
		this.color = "special";
	}

	effect(game, index) {
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

		super.effect(game, index, "🚚 Une livraison de tasse a échangé les tasses " + game.mainclass.COLOR_EMOJIS[color] + " de " + player.user.toString() + " pour " + amount + (amount > 1 ? " nouvelles tasses" : " nouvelle tasse") + "! 🚚");
	}
}


module.exports = exports = {BlueCup, PurpleCup, OrangeCup, GreenCup, CottonCup, BombCup, RainbowCup, GoldenCup, PaintCup, CactusCup, StealCup, GhostCup, FireCup, MagnetCup, ReverseCup, CarCup}
