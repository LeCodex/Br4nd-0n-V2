const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Links";
		this.description = "Sends the link to the bot's Github and Repl.it repositories";
		this.help = {
			"": "Sends thoses links"
		};
		this.commandText = "links";
		this.color = 0xfffffe;
		this.ready = true;
	}

	command(message, args, kwargs, flags) {
		message.reply(
			new MessageEmbed()
			.setThumbnail(this.client.user.displayAvatarURL())
			.setTitle("Links")
			.setDescription("The code for this bot is entirely open-source. Feel free to leave suggestions on the repository's Issues page.")
			.addField("GitHub", "https://github.com/LeCodex/Br4nd-0n-V2")
			.addField("Repl.it", "https://repl.it/@LeCodex/Br4nd-0n-V2")
			.setColor(this.color)
		);
	}
}

module.exports = exports = {MainClass}
