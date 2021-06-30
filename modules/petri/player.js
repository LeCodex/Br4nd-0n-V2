const {MessageEmbed} = require('discord.js');
const globals = require('./globals.js')

class Player {
	constructor(game, user, reload = false) {
		this.game = game;
		this.user = user;
		this.score = 0;
	}

	spawn(map, y, x) {
		map[y][x] = this.index
	}

	move(index) {
		var dx = [-1, 0, 0, 1][index];
		var dy = [0, -1, 1, 0][index];

		var new_map = JSON.parse(JSON.stringify(this.game.map));
		this.game.battles = [];

		for (var [y, row] of this.game.map.entries()) {
			for (var [x, tile] of row.entries()) {
				if (tile == this.index && this.game.inside(x + dx, y + dy)) {
					var new_tile = this.game.map[y + dy][x + dx];

					if (new_tile == -1) {
						new_map[y + dy][x + dx] = this.index;
					} else if (new_tile != this.index && new_tile >= 0) {
						var owner = this.game.players[this.game.order[new_tile]];

						var attack = this.getPower(x, y, -dx, -dy);
						var defense = owner.getPower(x + dx, y + dy, dx, dy);

						var diff = attack - defense
						diff += this.onAttack(attack, defense, new_tile)
						diff += owner.onDefense(attack, defense, this)

						if (diff > 0) {
							new_map[y + dy][x + dx] = this.index;
							this.game.battles.push(globals.PLAYER_EMOJIS[this.index] + " " + this.user.toString() + " 🗡️ " + globals.PLAYER_EMOJIS[owner.index] + " " + owner.user.toString());
						} else if (diff == 0) {
							new_map[y + dy][x + dx] = -1;
							this.game.battles.push(globals.PLAYER_EMOJIS[this.index] + " " + this.user.toString() + " ⚔️️ " + globals.PLAYER_EMOJIS[owner.index] + " " + owner.user.toString());
						} else {
							this.game.battles.push(globals.PLAYER_EMOJIS[owner.index] + " " + owner.user.toString() + " 🛡️ " + globals.PLAYER_EMOJIS[this.index] + " " + this.user.toString());
						}
					}
				}
			}
		}

		this.game.map = new_map;
	}

	getPower(x, y, dx, dy) {
		var power = 0, tdx = 0, tdy = 0;

		while (this.game.map[y + tdy][x + tdx] == this.index) {
			power += 1;
			tdx += dx;
			tdy += dy;
			if (!this.game.inside(x + tdx, y + tdy)) break;
		}

		return power;
	}

	onAttack(attack, defense, defender) {
		return 0;
	}

	onDefense(attack, defense, attacker) {
		return 0;
	}
}

module.exports = exports = {Player};
