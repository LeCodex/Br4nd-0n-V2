const {MessageMentions} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Mention";
		this.description = "Redirects mentions of the bot to other modules";
		this.help = {
			"": "Sends the current module the mentions calls (in this channel if it was set)",
			"--channel": "Resets the module called in this channel",
			"<module> [--channel]": "Sets the module the mentions will call. Use --channel to apply this change only to this channel",
		};
		this.commandText = "mention";
		this.color = 0x222222;
		this.auth = [ process.env.ADMIN ];

		this.load("modules", {}).then(e => {this.moduleList = e;});
	}

	command(message, args, kwargs, flags) {
		if (!this.moduleList[message.guild.id]) this.moduleList[message.guild.id] = { server: "ping", channels: {} };
		console.log(this.moduleList[message.guild.id]);

		if (args.length) {
			if (flags.includes("channel")) {
				this.moduleList[message.guild.id].channels[message.channel.id] = args[0];
			} else {
				this.moduleList[message.guild.id].server = args[0];
			}

			this.save("modules", this.moduleList);
			message.reply("The linked command is now: `" + process.env.PREFIX + args[0] + "`" + (flags.includes("channel") ? " (In this channel)" : ""));
		} else {
			if (this.moduleList[message.guild.id].channels[message.channel.id]) {
				message.reply("The linked command is currently: `" + process.env.PREFIX + this.moduleList[message.guild.id].channels[message.channel.id] + "` (In this channel)");
			} else {
				message.reply("The linked command is currently: `" + process.env.PREFIX + this.moduleList[message.guild.id].server + "`");
			}
		}

		this.save("modules", this.moduleList);
	}

	on_message(message) {
		if (message.guild) {
			super.on_message(message);

			var index = message.content.search(MessageMentions.USERS_PATTERN);
			if (!this.moduleList[message.guild.id]) {
				this.moduleList[message.guild.id] = { server: "ping", channels: {} };
				this.save("modules", this.moduleList);
			}

			var moduleName = this.moduleList[message.guild.id].server
			if (this.moduleList[message.guild.id].channels[message.channel.id]) moduleName = this.moduleList[message.guild.id].channels[message.channel.id];

			if (index == 0 && message.mentions.users.first().id == this.client.user.id && this.client.modules[moduleName]) {
				this.client.modules[moduleName]._testForAuth(message);
			}
		}
	}
}

module.exports = exports = {MainClass};
