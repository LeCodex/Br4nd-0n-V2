const Effects = require("./effects.js");

class Tile {
	constructor(mainclass, id, fallback) {
		this.emoji = mainclass.client.emojis.cache.get(id) || fallback;
	}

	get fullName() {
		return this.emoji.toString() + " " + this.name;
	}

	tryToMove(game, player, index) {
		return true;
	}
}


class Chair extends Tile {
	constructor(mainclass) {
		super(mainclass, "0", "🪑");

		this.name = "Chaise";
	}
}


class Cactus extends Tile {
	constructor(mainclass) {
		super(mainclass, "0", "🌵");

		this.name = "Cactus";
		this.description = "Empêche le mouvement sur cette case"
	}

	effect(game, player, index, amount) {
		game.summary.push({
			message: "🌵" + player.toString() + " a refusé d'aller s'asseoir sur un cactus et est revenu en arrière."
		});

		player.index -= amount;
	}
}


class Fountain extends Tile {
	constructor(mainclass) {
		super(mainclass, "0", "⛲");

		this.name = "Fontaine";
		this.description = "Te fais reculer de 1d6 cases"
	}

	effect(game, player, index, amount) {
		game.summary.push({
			message: "💦 ️Splash! " + player.toString() + " est tombé dans la fontaine!"
		});

		var rndAmount = -Math.floor(Math.random() * 6 + 1);
		player.move(game, rndAmount);
	}
}


class Couch extends Tile {
	constructor(mainclass) {
		super(mainclass, "0", "🛋️");

		this.name = "Canapé";
		this.description = "Annule ton prochain mouvement"
	}

	effect(game, player, index, amount) {
		game.summary.push({
			message: "🛋️" + player.toString() + " est arrivé sur un canapé, et va vouloir y rester..️."
		});

		player.addEffect(game, new Effects.Comfortable());
	}
}


class Cart extends Tile {
	constructor(mainclass) {
		super(mainclass, "0", "🛒");

		this.name = "Caddie";
		this.description = "Double ton prochain mouvement"
	}

	effect(game, player, index, amount) {
		game.summary.push({
			message: "🛒" + player.toString() + " s'est installé dans le caddie"
		});

		player.addEffect(game, new Effects.Prepared());
	}
}


class Carousel extends Tile {
	constructor(mainclass) {
		super(mainclass, "0", "🎠");

		this.name = "Carrousel";
		this.description = "Echange de place avec le joueur le plus proche"
	}

	effect(game, player, index, amount) {
		var target = Object.values(game.players).reduce((acc, element) => {
			var dist = Math.abs(element.index - player.index);
			if (dist < acc.minDist && element != player) {
				acc.minDist = dist;
				acc.target = element;
			}
			return acc;
		}, {minDist: Infinity, target: null}).target;

		if (target) {
			game.summary.push({
				message: "🎠" + player.toString() + " a pris le carrousel pour inverser de place avec " + target.toString() + "!"
			});

			var index = target.index;
			target.index = player.index;
			player.index = index;
		} else {
			game.summary.push({
				message: "🎠" + player.toString() + " n'avait personne avec qui échanger de place..."
			});
		}
	}
}


class BusStop extends Tile {
	constructor(mainclass) {
		super(mainclass, "0", "🚏");

		this.name = "Arrêt de bus";
		this.description = "Te téléporte à un autre 🚏 aléatoire"
	}

	effect(game, player, index, amount) {
		var stops = game.board.filter((e, i) => e.constructor.name === this.constructor.name && i != index);

		if (stops.length) {
			var stop = stops[Math.floor(Math.random() * stops.length)];
			var stopIndex = game.board.indexOf(stop);
			var distance = stopIndex - player.index;

			game.summary.push({
				message: "🚏" + player.toString() + " a pris le bus sur " + Math.abs(distance) + (Math.abs(distance) > 1 ? " cases" : " case") + (distance > 0 ? " en avant" : " en arrière")
			});

			player.index = stopIndex;
		} else {
			game.summary.push({
				message: "🚏" + player.toString() + " a attendu longtemps à l'arrêt de bus..."
			});
		}
	}
}


class Box extends Tile {
	constructor(mainclass) {
		super(mainclass, "0", "📦");

		this.name = "Boîte en carton";
		this.description = "Si plus de 3 joueurs sont dessus, ils doivent tous reculer de 2d6 cases"
	}

	effect(game, player, index, amount) {
		var playersOn = Object.values(game.players).filter(e => e.index === index);

		if (playersOn.length > 1) {
			game.summary.push({
				message: "💫 La boîte en carton a cassé!"
			});

			playersOn.forEach(element => {
				var rndAmount = -Math.floor(Math.random() * 11 + 2);
				element.move(game, rndAmount);
			});
		} else {
			game.summary.push({
				message: "📦 La boîte craque mais ne cède pas..."
			});
		}
	}
}


class Dynamite extends Tile {
	constructor(mainclass) {
		super(mainclass, "0", "🧨");

		this.name = "Dynamite";
		this.description = "Si tu restes dessus pendant un tour complet, elle explose et tu recules de 2d6 cases"
	}

	effect(game, player, index, amount) {
		player.addEffect(game, new Effects.Pressured({ index: index, armed: false }));
	}
}


class Bathtub extends Tile {
	constructor(mainclass) {
		super(mainclass, "0", "🛁");

		this.name = "Baignoire";
		this.description = "Empêche le prochain effet de s'activer"
	}

	effect(game, player, index, amount) {
		player.addEffect(game, new Effects.Clean());
	}
}


module.exports = exports = { Chair, Cactus, Fountain, Couch, Cart, Carousel, BusStop, Box, Dynamite, Bathtub }
