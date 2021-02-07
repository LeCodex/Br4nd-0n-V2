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
			"role <role mention> --temporary": "Sets the role to be given to newcomers until they validate the rules",
			"channel <channel mention>": "Sets the channel in which the word must be typed",
			"words <word list>": "Set all acceptable words",
			"welcome <channel mention>": "Sets the welcome message. %u will be replaced by the user",
			"welcome_channel <channel mention>": "Sets the channel in which the welcome message will be sent",
			"<subcommmand> reset": "Resets the given value"
		};
		this.commandText = "rules";
		this.color = 0xffff00;
		this.auth = [ "Admin" ];

		this.load("data", {}).then(e => {this.data = e; this.ready = true;});
	}

	checkIfDataExists(message) {
		if (!this.data[message.guild.id]) {
			this.data[message.guild.id] = {}
			this.save("data", this.data);
		}
	}

	command(message, args, kwargs, flags) {
		this.checkIfDataExists(message);
		var data = this.data[message.guild.id];
		var channel = this.client.channels.cache.get(data.channel);
		var welcome_channel = this.client.channels.cache.get(data.welcome_channel);
		var role = message.guild.roles.cache.get(data.role);
		var temp_role = message.guild.roles.cache.get(data.temp_role);

		message.reply(data.words && channel && role ? "The user must type " + data.words + " in " + channel.toString() + " to get the role " + role.toString()
			+ (data.welcome_message && welcome_channel ? "\nThe bot will send " + data.welcome_message + " in " + welcome_channel.toString() : "\nWelcome message not parametered")
			+ (data.temp_role ? "\nNewcomers will receive the " + temp_role.toString() + " role until they confirmed the rules" : "\nTemporary role not paramatered")
			: "Some parameters are missing");
	}

	com_role(message, args, kwargs, flags) {
		this.checkIfDataExists(message);

		var key = "role", name = "Role"
		if (flags.includes("temporary")) { key = "temp_role"; name = "Temporary role" }

		if (args[1] == "reset") {
			this.data[message.guild.id][key] = undefined;
			message.reply("Reset");
			this.save("data", this.data);
			return;
		}

		if (!message.mentions.roles.array().length) {
			message.reply("Missing role mention");
			return;
		}

		this.data[message.guild.id][key] = message.mentions.roles.first().id;
		message.reply(name + " is now set to " + message.mentions.roles.first().toString());

		this.save("data", this.data);
	}

	com_channel(message, args, kwargs, flags) {
		this.checkIfDataExists(message);

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

	com_words(message, args, kwargs, flags) {
		this.checkIfDataExists(message);

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

	com_welcome(message, args, kwargs, flags) {
		this.checkIfDataExists(message);

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

	com_welcome_channel(message, args, kwargs, flags) {
		this.checkIfDataExists(message);

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

		if (message.channel.id === data.channel) {
			if (data.words.includes(message.content)) {
				message.member.roles.add(data.role).catch(e => this.client.error(message.channel, "Rules", e));
				if (data.temp_role) message.member.roles.remove(data.temp_role).catch(e => this.client.error(message.channel, "Rules", e));

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

	on_guildMemberAdd(member) {
		this.checkIfDataExists(member);
		var data = this.data[member.guild.id];
		var role = member.guild.roles.cache.get(data.temp_role);

		if (role) { member.roles.add(role); }
	}
}

module.exports = exports = {MainClass}
