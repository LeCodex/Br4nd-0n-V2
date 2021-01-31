const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Restart";
		this.description = "Closes the bot's program";
		this.help = {
			"": "Exits the program"
		};
		this.commandText = "restart";
		this.color = 0xffffff;
		this.auth = [ process.env.ADMIN ];
		this.hidden = true;
	}

	command(message, args, kwargs, flags) {
		message.reply("The bot will restart.")
			.then(() => process.exit(1));
	}
}

module.exports = exports = {MainClass}
