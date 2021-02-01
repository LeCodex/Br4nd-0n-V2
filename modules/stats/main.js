const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");
const StatLogic = require("./stat_logic.js")

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Stats";
		this.description = "Stores scoreboards for everything and anything";
		this.help = {
			"": "Sends a list of all created scoreboards",
			"<scoreboard>": "Sends the requested scoreboard. Use sort=<criteria> to get a sorted list",
			"<scoreboard> edit=true": "Opens the scoreboard in edit mode"
		};
		this.commandText = "stats";
		this.color = 0x990099;

		this.statLogics = [];
		this.load("stats", {}).then(e => {this.stats = e; this.ready = true;});
	}

	command(message, args, kwargs, flags) {
		if (args.length) {
			if (this.statLogics[message.author.id]) {
				this.statLogics[message.author.id].close().then(() => this.openNewScoreboard(message, args, kwargs, flags))
			} else {
				this.openNewScoreboard(message, args, kwargs, flags)
			}
		} else {
			var embed = new MessageEmbed().setTitle("[STATS] Stored Scoreboards").setColor(this.color);
			var description = [];
			for (var [key, value] of Object.entries(this.stats[message.guild.id])) {
				description.push(value.emoji + " " + key);
			}

			if (!description.length) description = ["❌ No scoreboards created"]
			embed.description = description.join("\n");
			message.reply(embed);
		}
	}

	openNewScoreboard(message, args, kwargs, flags) {
		var name = args.map(e => e = e.substr(0, 1).toUpperCase() + e.substr(1).toLowerCase()).join(" ");
		if (!this.stats[message.guild.id]) this.stats[message.guild.id] = {};
		if (!this.stats[message.guild.id][name]) {
			this.stats[message.guild.id][name] = {name: name, emoji : "🚫", criterias: [], scores: {}};
			this.save("stats", this.stats);
			kwargs.edit = true;
		}

		var scoreboard = this.stats[message.guild.id][name];
		var embed = new MessageEmbed().setTitle("[STATS] " + name).setColor(this.color);

		this.statLogics[message.author.id] = new StatLogic(this, message.author, scoreboard, message, embed, !kwargs.edit);
	}
}

module.exports = exports = {MainClass};
