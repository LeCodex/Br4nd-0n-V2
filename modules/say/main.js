const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Say";
		this.description = "Nothing to see here";
		this.help = {
			"": "🤫"
		};
		this.commandText = "say";
		this.color = 0x000000;
		this.auth = [ "Noone" ];
		this.ready = true;
		this.hidden = true;
	}

	command(message, args, kwargs, flags) {
		var id = args.shift();

		var channel = this.client.channels.cache.get(id)
		if (!channel) return;

		channel.send(args.join(" "));
		if (message.channel.id === id) message.delete();
	}
}

module.exports = exports = { MainClass }
