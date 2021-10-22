class Sticker {
	constructor(game, data) {
		this.game = game;
		this.data = data || {};
		this.tags = [];

		this.name = this.constructor.name;
		this.value = 0;
		this.factor = 1;
	}

	toString() {
		return this.emoji + " " + this.name;
	}
}

module.exports = exports = Sticker;
