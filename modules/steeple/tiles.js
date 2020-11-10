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
		this.description = "Empêche le mouvement sur cete case"
	}

	tryToMove(game, player, index) {
		game.summary.push({
			message: "🌵" + player.user.toString() + " a refusé d'aller s'asseoir sur un cactus. Compréhensible."
		});
		return false;
	}
}


class Fountain extends Tile {
	constructor(mainclass) {
		super(mainclass, "0", "⛲");

		this.name = "Fontaine";
		this.description = "Te fais reculer de 1d6 cases"
	}

	effect(game, player, index) {
		game.summary.push({
			message: "💦 ️Splash! " + player.user.toString() + " est tombé dans la fontaine!"
		});

		var amount = -Math.floor(Math.random() * 6 + 1);
		player.move(game, amount);
	}
}


class Couch extends Tile {
	constructor(mainclass) {
		super(mainclass, "0", "🛋️");

		this.name = "Canapé";
		this.description = "Annule ton prochain mouvement"
	}

	effect(game, player, index) {
		game.summary.push({
			message: "🛋️" + player.user.toString() + " est arrivé sur un canapé, et va vouloir y rester..️."
		});

		player.addEffect(game, {
			name: "💤 Confortable 💤",
			tryToMove: function(game, player, index) {
				game.summary.push({
					message: "💤 ️Le canapé est trop confortable pour que " + player.user.toString() + " en parte..."
				});
				this.used = true;

				return false;
			}
		});
	}
}


class Cart extends Tile {
	constructor(mainclass) {
		super(mainclass, "0", "🛒");

		this.name = "Caddie";
		this.description = "Double ton prochain mouvement"
	}

	effect(game, player, index) {
		game.summary.push({
			message: "🛒" + player.user.toString() + " s'est installé dans le caddie"
		});

		player.addEffect(game, {
			name: "⏩ Préparé ⏩",
			preMove: function(game, player, index, amount) {
				this.used = true;

				game.summary.push({
					message: "⏩ ️Zoom! " + player.user.toString() + " est allé deux fois plus loin grâce au caddie!"
				});

				return 2 * amount;
			}
		});
	}
}


class Carousel extends Tile {
	constructor(mainclass) {
		super(mainclass, "0", "🎠");

		this.name = "Carrousel";
		this.description = "Rejoint le joueur le plus proche"
	}

	effect(game, player, index) {
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
				message: "🎠" + player.user.toString() + " prend le carrousel pour rejoindre " + target.user.toString() + "!"
			});

			player.move(game, target.index - player.index);
		} else {
			game.summary.push({
				message: "🎠" + player.user.toString() + " n'avait personne à rejoindre..."
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

	effect(game, player, index) {
		var stops = game.board.filter((e, i) => e.constructor.name === this.constructor.name && i != index);

		if (stops.length) {
			var stop = stops[Math.floor(Math.random() * stops.length)];
			var stopIndex = game.board.indexOf(stop);
			var distance = stopIndex - player.index;

			game.summary.push({
				message: "🚏" + player.user.toString() + " a pris le bus sur " + Math.abs(distance) + (Math.abs(distance) > 1 ? " cases" : " case") + (distance > 0 ? " en avant" : " en arrière")
			});

			player.index = stopIndex;
		} else {
			game.summary.push({
				message: "🚏" + player.user.toString() + " a attendu longtemps à l'arrêt de bus..."
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

	effect(game, player, index) {
		var playersOn = Object.values(game.players).filter(e => e.index === index);

		if (playersOn.length > 1) {
			game.summary.push({
				message: "💫 La boîte en carton a cassé!"
			});

			playersOn.forEach(element => {
				var amount = -Math.floor(Math.random() * 11 + 2);
				element.move(amount);
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

	effect(game, player, index) {
		player.addEffect(game, {
			name: "🧨 Sous Pression 🧨",
			index: index,
			turnEnd: function(game, player, index) {
				this.used = true;

				if (index === this.index) {
					game.summary.push({
						message: "💥 BOUM! " + player.user.toString() + " est resté trop longtemps au même endroit!"
					});

					var amount = -Math.floor(Math.random() * 11 + 2);
					player.move(amount);
				} else {
					game.summary.push({
						message: "🧨 " + player.user.toString() + " a bougé à temps"
					});
				}
			}
		});
	}
}


class Bathtub extends Tile {
	constructor(mainclass) {
		super(mainclass, "0", "🛁");

		this.name = "Baignoire";
		this.description = "Empêche le prochain effet de s'activer"
	}

	effect(game, player, index) {
		player.addEffect(game, {
			name: "🧼 Propre 🧼",
			postMove: function(game, player, index) {
				if (game.board[index].effect) {
					game.summary.push({
						message: "🧼 " + player.user.toString() + " n'active pas l'effet grâce à sa douche"
					});
					this.used = true;

					return false;
				}

				return true;
			}
		});
	}
}


module.exports = exports = { Chair, Cactus, Fountain, Couch, Cart, Carousel, BusStop, Box, Dynamite, Bathtub }
