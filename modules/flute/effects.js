class Effect {
	constructor(data) {
		this.used = false;
		this.data = data || {};
	}

	tryToMove(game, player, index) {
		return true;
	}

	preMove(game, player, index, amount) {
		return amount;
	}

	onMove(game, player, index, amount) {
		return;
	}

	postMove(game, player, index) {
		return true;
	}

	turnEnd(game, player, index) {
		return;
	}

	throwEnd(game, player) {
		return;
	}
}


class Comfortable extends Effect {
	constructor(data) {
		super(data);

		this.name = "💤 Confortable 💤";
	}

	tryToMove(game, player, index) {
		game.summary.push({
			message: "💤 ️Le canapé est trop confortable pour que " + player.user.toString() + " en parte..."
		});
		this.used = true;

		return false;
	}
}


class Prepared extends Effect {
	constructor(data) {
		super(data);

		this.name = "⏩ Préparé ⏩";
	}

	preMove(game, player, index, amount) {
		this.used = true;

		game.summary.push({
			message: "⏩ ️Zoom! " + player.user.toString() + " est allé deux fois plus loin grâce au caddie!"
		});

		return 2 * amount;
	}
}


class Pressured extends Effect {
	constructor(data) {
		super(data);

		this.name = "🧨 Sous Pression 🧨";
	}

	turnEnd(game, player, index) {
		if (this.data.armed) {
			this.used = true;

			if (index === this.data.index) {
				game.summary.push({
					message: "💥 BOUM! " + player.user.toString() + " est resté trop longtemps au même endroit!"
				});

				var amount = -Math.floor(Math.random() * 11 + 2);
				player.move(game, amount);
			} else {
				game.summary.push({
					message: "🧨 " + player.user.toString() + " a bougé à temps"
				});
			}
		}
	}

	throwEnd(game, player) {
		this.data.armed = true;
	}
}


class Clean extends Effect {
	constructor(data) {
		super(data);

		this.name = "🧼 Propre 🧼";
	}

	postMove(game, player, index) {
		if (game.board[index].effect) {
			game.summary.push({
				message: "🧼 " + player.user.toString() + " n'active pas l'effet grâce à sa douche"
			});
			this.used = true;

			return false;
		}

		return true;
	}
}


module.exports = exports = { Comfortable, Prepared, Pressured, Clean }
