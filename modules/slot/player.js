const {MessageEmbed} = require('discord.js');
const Effects = require('./effects.js');

class Player {
	constructor(game, message) {
		this.game = game;

		this.lastPullTimestamp = 0;
		this.lastDraftTimestamp = 0;
		this.points = 0;
		this.pulls = 0;
		this.effects = [];

		if (message) {
			this.user = message.author;
		}
	}

	reload(object) {
		this.parse(object);
	}

	getInfo() {
		var embed = new MessageEmbed()
			.setTitle("[SLOT] " + this.user.username + "'s info")
			.addField("Points", this.points + " :coin:", true)
			.addField("Pulls", this.pulls + " 📍", true)
			.setColor(this.game.mainclass.color)

		if (this.effects.length) embed.addField("Effects", this.effects.map(e => " • **" + e.toString() + "** : " + e.description).join("\n"))

		return embed;
	}

	addEffect(name) {
		if (!Effects[name]) {
			console.log("Unkown effect " + effect);
			return;
		}

		var effect = new Effects[name](this);
		this.effects.push(effect);
	}

	save() {
		var object = {
			lastDraftTimestamp: this.lastDraftTimestamp,
			lastPullTimestamp: this.lastPullTimestamp,
			points: this.points,
			pulls: this.pulls,
			effects: this.effects.map(e => { return { type: e.constructor.name, data: e.data }; })
		}

		return object;
	}

	parse(object) {
		this.lastPullTimestamp = object.lastPullTimestamp || 0;
		this.lastDraftTimestamp = object.lastDraftTimestamp || 0;
		this.points = object.points || 0;
		this.pulls = object.pulls || 0;

		for (var effect of object.effects) {
			this.effects.push(new Effects[effect.type](this, effect.data));
		}
	}
}

module.exports = exports = Player;
