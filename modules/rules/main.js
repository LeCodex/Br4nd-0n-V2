const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Rules";
		this.description = "Allows for rule verification by asking for a word";
		this.help = {
			"": "Shows current parameters",
			"role <role mention>": "Sets the role to be attributed",
			"channel <channel mention>": "Sets the channel in which the word must be typed",
			"words <word list>": "Set all acceptable words",
			"welcome <channel mention>": "Sets the welcome message. %u will be replaced by the user",
			"welcome_channel <channel mention>": "Sets the channel in which the welcome message will be sent",
			"<subcommmand> reset": "Resets the given value"
		};
		this.commandText = "rules";
		this.color = 0xffff00;
		this.auth = [ process.env.ADMIN ];

		this.load("data", {}).then(e => {this.data = e;});
	}

	check_if_data_exists(message) {
		if (!this.data[message.guild.id]) {
			this.data[message.guild.id] = {}
			this.save("data", this.data);
		}
	}

	command(message, args, kwargs) {
		this.check_if_data_exists(message);
		var data = this.data[message.guild.id];
		var channel = this.client.channels.cache.get(data.channel);
		var welcome_channel = this.client.channels.cache.get(data.welcome_channel);
		var role = message.guild.roles.cache.get(data.role);

		message.reply(data.words && channel && role ? "The user must type " + data.words + " in " + channel.toString() + " to get the role " + role.toString()
			+ (data.welcome_message && welcome_channel ? "\nThe bot will send " + data.welcome_message + " in " + welcome_channel.toString() : "\nWelcome message not fully parametered")
			: "Some parameters are missing");
	}

	com_role(message, args, kwargs) {
		this.check_if_data_exists(message);

		if (args[1] == "reset") {
			this.data[message.guild.id].role = undefined;
			message.reply("Reset");
			this.save("data", this.data);
			return;
		}

		if (!message.mentions.roles.array().length) {
			message.reply("Missing role mention");
			return;
		}

		this.data[message.guild.id].role = message.mentions.roles.first().id;
		message.reply("Role is now set to " + message.mentions.roles.first().toString());

		this.save("data", this.data);
	}

	com_channel(message, args, kwargs) {
		this.check_if_data_exists(message);

		if (args[1] == "reset") {
			this.data[message.guild.id].channel = undefined;
			message.reply("Reset");
			this.save("data", this.data);
			return;
		}

		if (!message.mentions.channels.array().length) {
			message.reply("Missing channel mention");
		} else {
			this.data[message.guild.id].channel = message.mentions.channels.first().id;
			message.reply("Channel is now set to " + message.mentions.channels.first().toString());

			this.save("data", this.data);
		}
	}

	com_words(message, args, kwargs) {
		this.check_if_data_exists(message);

		if (args[1] == "reset") {
			this.data[message.guild.id].words = undefined;
			message.reply("Reset");
			this.save("data", this.data);
			return;
		}

		if (args.length == 1) {
			message.reply("Missing words");
		} else {
			this.data[message.guild.id].words = args.slice(1);
			message.reply("Words are now set to " + this.data[message.guild.id].words);

			this.save("data", this.data);
		}
	}

	com_welcome(message, args, kwargs) {
		this.check_if_data_exists(message);

		if (args[1] == "reset") {
			this.data[message.guild.id].welcome_message = undefined;
			message.reply("Reset");
			this.save("data", this.data);
			return;
		}

		if (args.length == 1) {
			message.reply("Missing welcome message");
		} else {
			this.data[message.guild.id].welcome_message = args.slice(1).join(" ");
			message.reply("Welcome message is now set to " + this.data[message.guild.id].welcome_message);

			this.save("data", this.data);
		}
	}

	com_welcome_channel(message, args, kwargs) {
		this.check_if_data_exists(message);

		if (args[1] == "reset") {
			this.data[message.guild.id].welcome_channel = undefined;
			message.reply("Reset");
			this.save("data", this.data);
			return;
		}

		if (!message.mentions.channels.array().length) {
			message.reply("Missing channel mention");
		} else {
			this.data[message.guild.id].welcome_channel = message.mentions.channels.first().id;
			message.reply("Welcome message's channel is now set to " + message.mentions.channels.first().toString());

			this.save("data", this.data);
		}
	}

	on_message(message) {
		super.on_message(message);

		if (!message.guild) return ;
		if (!this.data[message.guild.id]) return;

		var data = this.data[message.guild.id];
		if (!data.role || !data.channel || !data.words) return;

		if (message.channel.id == data.channel) {
			if (data.words.includes(message.content)) {
				message.member.roles.add(data.role).catch(e => this.client.error(message.channel, "Rules", e));

				if (data.welcome_message && data.welcome_channel) {
					var channel = this.client.channels.cache.get(data.welcome_channel);

					if (channel) channel.send(
						new MessageEmbed()
						.setDescription(data.welcome_message.replace("%u", message.author.toString()))
					);
				}
			}
			message.delete().catch(e => this.client.error(message.channel, "Rules", e));
		}
	}
}

module.exports = exports = {MainClass}
