function shuffle(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

class Fruit {
	constructor(mainclass, player, id, fallback) {
		this.emoji = mainclass.client.emojis.cache.get(id) || fallback;
		this.player = player;
	}

	get fullName() {
		return this.emoji.toString() + " " + this.name;
	}

	async effect(effect_return = "", persistent = false) {
		// this.player.game.effectStack.push({
		// 	message: effect_return,
		// 	persistent: persistent
		// });

		return this.player.game.nextTurn(this.player, this.fullName + " de " + this.player.user.displayName);
	}
}


class Banana extends Fruit {
	constructor(player) {
		super(player.game.mainclass, player, "0", "🍌");
		this.name = "Banane";
	}
}


class Cherry extends Fruit {
	constructor(player) {
		super(player.game.mainclass, player, "0", "🍒");
		this.name = "Cerise";
	}
}


class Orange extends Fruit {
	constructor(player) {
		super(player.game.mainclass, player, "0", "🍊");
		this.name = "Orange";
	}
}


class Grape extends Fruit {
	constructor(player) {
		super(player.game.mainclass, player, "0", "🍇");
		this.name = "Raisin";
	}
}


class Kiwi extends Fruit {
	constructor(player) {
		super(player.game.mainclass, player, "0", "🥝");
		this.name = "Kiwi";
	}
}


module.exports = exports = {Banana, Cherry, Orange, Grape, Kiwi}
