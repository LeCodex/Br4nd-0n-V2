const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");
const humanizeDuration = require('humanize-duration');

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Ping";
		this.description = "Answers with Pong!";
		this.help = {
			"": "Pong!"
		}
		this.command_text = "ping";
		this.color = 0x00ffff;
	}

	command(message, args, kwargs) {
		message.reply(new MessageEmbed()
			.setDescription("🏓 Pong! (**" + (Date.now() - message.createdTimestamp)
				+ "ms**).\n🤖 __" + this.client.user.username + "__ has been up for **" + humanizeDuration(this.client.uptime, { largest: 2, round: true, conjunction: " and ", serialComma: false })
				+ "**.\n🔄 Average websocket ping: **" + this.client.ws.ping + "ms**.")
			.setColor(this.color));
	}
}

module.exports = exports = {MainClass};
