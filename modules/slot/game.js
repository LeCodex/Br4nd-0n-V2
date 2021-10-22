const {MessageEmbed} = require('discord.js');
const Player = require('./player.js');
const Stickers = require('./stickers.js');

function shuffle(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function getRankEmoji(rank) {
	if (rank < 4) return ["🥇", "🥈", "🥉"][rank - 1];
	return "🏅";
}


class Game {
	constructor(mainclass, message) {
		this.mainclass = mainclass;
		this.client = mainclass.client;

		this.players = {};
		this.stickers = [];

		if (message) {
			this.channel = message.channel;
			this.start();
		}
	}

	async reload(object) {
		await this.parse(object);
	}

	start() {
		this.stickers = [
			new Stickers.Coin(this),
			new Stickers.Coin(this),
			new Stickers.Cherry(this),
			new Stickers.MoneyBag(this),
			new Stickers.Dynamite(this),
			new Stickers.Dynamite(this),
			new Stickers.Seven(this),
			new Stickers.Seven(this),
			new Stickers.Seven(this),
		];

		this.save();
	}

	join(message) {
		this.players[message.author.id] = new Player(this, message);
		message.channel.send(message.author.toString() + " joined the game!");

		this.save();
	}

	async pullLever(message) {
		var resultMessage = await message.channel.send(
			new MessageEmbed()
			.setDescription((this.mainclass.slotEmoji + " ").repeat(3) + message.author.toString() + " pulled the lever ! Let's wait for the result...")
			.setColor(this.mainclass.color)
		);

		setTimeout(() => { this.sendResult(message, resultMessage); }, Math.floor(Math.random() * 3000) + 3000);
	}

	getAmount(result) {
		return result.all.reduce((a, e) => a + Math.round(e.value * e.factor), 0);
	}

	sendResult(message, resultMessage) {
		this.stickers = shuffle(this.stickers);
		var result = {rows: [[], [], []], all:[]};

		for (var i = 0; i < 9; i ++) {
			var sticker = this.stickers[i];
			sticker.value = 0;
			sticker.factor = 1;

			result.all.push(sticker);
			result.rows[Math.floor(i / 3)].push(sticker);
		}

		var embed = new MessageEmbed()
			.setTitle("[SLOT] Result of " + message.author.username + "'s try")
			.setDescription(
				// "The machine landed on :\n"
				"-⬜⬜⬜⬜⬜⬜-\n"
				+ "🟥 " + result.rows[0].map(e => e.emoji).join("　") + " 🟥\n"
				+ "▶️ " + result.rows[1].map(e => e.emoji).join("　") + " ◀️\n"
				+ "🟥 " + result.rows[2].map(e => e.emoji).join("　") + " 🟥\n"
				+ "-🟫🟫🟫🟫🟫🟫-"
			)
			.setColor(this.mainclass.color);


		var summary = [];
		var player = this.players[message.author.id];

		for (var sticker of result.rows[1]) {
			if (sticker.effect) summary.push(sticker.effect(player, result));
		}

		for (var row of [0, 2]) {
			for (var sticker of result.rows[row]) {
				if (sticker.passive) summary.push(sticker.passive(player, result));
			}
		}

		for (var sticker of result.rows[1]) {
			if (sticker.endPull) summary.push(sticker.endPull(player, result));
		}

		for (var effect of player.effects) {
			if (effect.effect) {
				var msg = effect.effect(player, result);
				if (msg) summary.push(msg);
			}
		}

		var amount = this.getAmount(result);
		player.points += amount;
		player.pulls ++;
		player.effects = player.effects.filter(e => !e.toRemove);

		embed.addField("Effects", summary.join("\n"));
		embed.addField("Total", (amount >= 0 ? "+" : "") + amount + " :coin:");

		resultMessage.edit(embed);

		this.save();
	}

	async draft(message) {
		var choices = [];
		var keys = Object.keys(Stickers);
		for (var i = 0; i < 3; i ++) {
			var key;
			do {
				key = keys[Math.floor(Math.random() * keys.length)]
			} while (choices.includes(key));

			choices.push(key);
		}

		choices = choices.map(e => new Stickers[e](this));

		var draftMessage = await message.channel.send(
			new MessageEmbed()
			.setTitle("[SLOT] Draft for " + message.author.username)
			.setDescription("Choose one of those stickers to add to the slot machine! Or choose ❌ to not add any.\n\n" + choices.map(e => " • **" + e.toString() + "** : " + e.description).join("\n"))
			.setColor(this.mainclass.color)
		);

		var emojis = choices.map(e => e.emoji);
		emojis.push("❌");
		for (var emoji of emojis) await draftMessage.react(emoji);

		var collected = await draftMessage.awaitReactions((reaction, user) => emojis.includes(reaction.emoji.name) && user.id === message.author.id, { max: 1, time: 300000 }).catch(e => {
			if (e.name === "TimeoutError") {
				draftMessage.edit(
					new MessageEmbed()
					.setTitle("[SLOT] Draft for " + message.author.username)
					.setDescription("No stickers were added!")
					.setColor(this.mainclass.color)
				);
			}
		});

		if (collected.size === 0) return;

		var choice = emojis.indexOf(collected.firstKey())
		if (choice === 3) {
			draftMessage.edit(
				new MessageEmbed()
				.setTitle("[SLOT] Draft for " + message.author.username)
				.setDescription("No stickers were added!")
				.setColor(this.mainclass.color)
			);
		} else {
			var sticker = choices[choice];
			this.stickers.push(sticker);

			if (this.stickers.length > 20) this.stickers.shift();

			draftMessage.edit(
				new MessageEmbed()
				.setTitle("[SLOT] Draft for " + message.author.username)
				.setDescription("The **" + sticker.toString() + "** sticker was added to the slot machine!")
				.setColor(this.mainclass.color)
			);
		}

		draftMessage.reactions.removeAll();
		this.save();
	}

	save() {
		var object = {
			players: {},
			stickers: this.stickers.map(e => { return { type: e.constructor.name, data: e.data }; }),
			channel: this.channel.id
		}

		for (var [key, player] of Object.entries(this.players)) object.players[key] = player.save();

		this.mainclass.load("games", {}).then(e => {
			e[this.channel.id] = object;
			this.mainclass.save("games", e);
		});
	}

	async parse(object) {
		for (var [key, player] of Object.entries(object.players)) {
			this.players[key] = new Player(this);
			this.players[key].reload(player);
			this.players[key].user = await this.mainclass.client.users.fetch(key);
		}

		for (var sticker of object.stickers) {
			this.stickers.push(new Stickers[sticker.type](this, sticker.data));
		}

		this.channel = await this.mainclass.client.channels.fetch(object.channel);
	}
}

module.exports = exports = Game
