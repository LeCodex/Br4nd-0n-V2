const Sticker = require("./base.js");

class Devil extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "😈";
		this.description = "Lose 1 point if not in the central stickers";
		this.tags = [ "living" ];
	}

	passive(player, result) {
		this.value -= 1;

		return "😈 The Devil's in the detail... And because of that, you lost 1 point!"
	}
}

class Snake extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "🐍";
		this.description = "If there is any fruit, lose 3 points.";
		this.tags = [ "animal", "living" ];
	}

	effect(player, result) {
		if (result.all.filter(e => e.tags.includes("fruit")).length) {
			this.value -= 3;
			return "🐍 You lost 3 points!";
		}

		return "🐍 The snake didnt find any fruits, thankfully...";
	}
}

class Bacteria extends Sticker {
	constructor(game, data) {
		super(game, data);

		this.emoji = "🦠";
		this.description = "Infects the other central stickers. If it infects a sticker twice, it triples its amount.";
		this.tags = [ "living" ];
	}

	effect(player, result) {
		var infected = [];
		var tripled = [];

		for (var sticker of result.rows[1].filter(e => e !== this)) {
			if (sticker.data.infected) {
				sticker.data.infected = false;
				sticker.factor *= 3;
				tripled.push(sticker);
			} else {
				sticker.data.infected = true;
				infected.push(sticker);
			}
		}

		return "🦠 " + (infected.length ? infected.map(e => e.toString()).join(" and ") + " were infected! ": "") + (tripled.length ? tripled.map(e => e.toString()).join(" and ") + " were tripled!" : "");
	}
}

module.exports = exports = { Devil, Snake, Bacteria };
