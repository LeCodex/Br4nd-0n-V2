class Cup {
	constructor(mainclass, player, id, fallback) {
		this.emoji = (mainclass.client.emojis.cache.get(id) || fallback).toString();
		this.player = player;
	}

	get fullName() {
		return this.emoji + " " + this.name;
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

	effect(game) {
		if (game.stack.length == 1) return "🧨 La Tasse Bombe n'a aucune tasse à exploser... 🧨";

		var color = game.stack[1].color;
		var amount = 0;

		for (var i = game.stack.length - 1; i >= 0; i --) {
			if (game.stack[i].color === color || game.stack[i].color === "all" || color === "all") {
				amount ++;
				game.stack.splice(i, 1);
			}
		}

		return "💥 Toutes les tasses " + game.mainclass.COLOR_EMOJIS[color] + ", au nombre de " + amount + ", ont explosé! 💥";
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

	effect(game) {
		game.players[game.lastPlayed].draw(game, 1);

		return "⏫ " + game.players[game.lastPlayed].user.toString() + " a pioché une tasse! ⏫";
	}
}


class PaintCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "472452972744409108", "🎨");

		this.name = "Tasse de Peinture";
		this.description = "Change la dernière tasse en une tasse d'une couleur aléatoire";
		this.color = "special";
	}

	effect(game) {
		var cup = game.stack[1];
		var basic_cups = [OrangeCup, PurpleCup, GreenCup, BlueCup];
		var new_cup = new basic_cups[Math.floor(Math.random() * basic_cups.length)](game.mainclass, cup.player);
		game.stack.splice(1, 1, new_cup);

		return "🎨 La dernière tasse a été repeinte en " + new_cup.fullName + "! 🎨";
	}
}


class CactusCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "472452982081060864", "🌵");

		this.name = "Tasse Cactus";
		this.description = "Le joueur qui finit la pile perd 1 point";
		this.color = "special";
	}

	stackEnd(game, winner) {
		winner.score --;

		return "🌵 Ouch! Ca pique!" + winner.user.toString() + " perd **1 point**! 🌵";
	}
}

class StealCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "472453023969312772", "🕵");

		this.name = "Tasse Vol";
		this.description = "La prochaine pile commence avec la tasse d'en dessous";
		this.color = "special";
	}

	stackEnd(game, winner, index) {
		if (index === game.stack.length - 1) return "🤷 Il n'y avait rien à voler pour la Tasse Vol 🤷";

		game.nextStack.push(game.stack[index + 1]);
		return "🕵 ️La Tasse Vol a permis à la " + game.stack[index + 1].fullName + " de survivre! 🕵";
	}
}


class GhostCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "659705735105740811", "👻");

		this.name = "Tasse Fantôme";
		this.description = "Lors d'un sandwich de deux de ces tasses, toutes les tasses entre disparaissent";
		this.color = "special";
	}

	effect(game) {
		var indexes = [];

		game.stack.forEach((cup, i) => {
			if (cup.name === "Tasse Fantôme") indexes.push(i);
		});

		if (indexes.length == 1) return "💀 Il n'y a pas de seconde Tasse Fantôme dans la pile 💀";

		game.stack.splice(indexes[0], indexes[1] - indexes[0] + 1)
		return "👻 ️OoOoOoOh!! Les Tasses Fantôme ont fait *disparaître* " + (indexes[1] - indexes[0] + 1) + " tasses de la pile! 👻";
	}
}

class FireCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "658794574206074889", "🔥");

		this.name = "Tasse de Feu";
		this.description = "Ré-active l'effet de la dernière tasse avec un effet";
		this.color = "special";
	}

	effect(game, index = 0) {
		var first_effect_cup = null;

		for (var i = index + 1; i < game.stack.length; i ++) {
			if (game.stack[i].effect) {
				first_effect_cup = game.stack[i];
				index = i;
				break;
			}
		}

		if (!first_effect_cup) return "💧 Il n'y a pas d'autre tasse avec un effet dans la pile 💧";
		return "🔥 ️La Tasse de Feu est brûlante! Au point qu'elle a déclenchée de nouveau l'effet de la " + first_effect_cup.fullName + "! 🔥\n" + first_effect_cup.effect(game, index);
	}
}

class MagnetCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "472452853714386956", "🧲");

		this.name = "Tasse Aimant";
		this.description = "Force le joueur qui a joué la tasse d'en-dessous à défausser une tasse au hasard";
		this.color = "special";
	}

	effect(game) {
		if (game.stack.length == 1) return "✨ Il n'y avait pas de joueur dont la Tasse Aimant pouvait attirer une tasse ✨";

		var player = game.stack[1].player;
		player.hand.splice(Math.floor(Math.random() * player.hand.length), 1);
		player.sendHand(game, "Vous avez défaussé une tasse")
		return "🧲 ️La Tasse Aimant a attiré une tasse hors de la main de " + player.user.toString() + "! 🧲";
	}
}


class ReverseCup extends Cup {
	constructor(mainclass, player) {
		super(mainclass, player, "666755013485527044", "🔄");

		this.name = "Tasse Essat";
		this.description = "Inverse toute la pile";
		this.color = "special";
	}

	effect(game) {
		game.stack.reverse();
		return "🔄 La pile a été toute renversée! 🔄";
	}
}


module.exports = exports = {BlueCup, PurpleCup, OrangeCup, GreenCup, BombCup, RainbowCup, GoldenCup, PaintCup, CactusCup, StealCup, GhostCup, FireCup, MagnetCup, ReverseCup}
