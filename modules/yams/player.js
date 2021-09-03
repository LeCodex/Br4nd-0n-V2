const {MessageEmbed} = require('discord.js');

class Player {
	constructor(user, game, reload = false) {
		this.user = user;
		this.game = game;
		this.sheetMessage = null;
		this.tray = [];
		this.points = {};
		this.score = 0;
		this.pointsGained = null;

		if (!reload) this.sendSheet(game);
	}

	gainPoints(amount, category) {
		var old_score = this.points[category] ?? 0;
		this.points[category] = amount;

		this.pointsGained = amount - old_score;
		this.score += this.pointsGained;
		this.sendSheet();
	}

	async sendSheet() {
		var embed = new MessageEmbed()
			.setTitle("Score et catégories | Total: " + this.score)
			.setDescription("```" + Object.keys(this.game.scoreCategories).map(e => this.game.scoreCategories[e].name + ": " + (this.points[e] ?? 0)).join("\n") + "```")
			.setColor(this.game.mainclass.color);

		if (this.sheetMessage) {
			this.sheetMessage.edit(embed);
		} else {
			this.sheetMessage = await this.user.send(embed);
		}
	}
}

module.exports = exports = Player;
