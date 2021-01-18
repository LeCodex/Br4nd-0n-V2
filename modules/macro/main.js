const {MessageEmbed, MessageMentions} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Macro";
		this.description = "Redirects mentions of the bot and other macros to other modules";
		this.help = {
			"": "Sends the current module the mentions calls (in this channel if it was set) and all other macros.",
			"mention <module> [--channel]": "Sets the module the mentions will call.\nUse --channel to apply this change only to this channel.",
			"create <macro> <command> [--exact] [--ignoreCase] [--channel]": "Creates a macro. You don't need to specify the prefix in the command for the macro. If the command is not one of the modules', it will instead just send it as a message"
				// + "\nUse %n to add arguments and use them in the command.",
				+ "\nUse --exact to require the macro to be sent in its own message, instead of triggering when it's detected in any message. Anything typed after the macro will be added as arguments."
				+ "\nUse --ignoreCase to make the search ignore the case of the macro."
				+ "\nUse --channel to apply this macro only in this channel.",
			"delete <macro>": "Deletes the macro if it exists."
		};
		this.commandText = "macro";
		this.color = 0x222222;
		this.auth = [ process.env.ADMIN ];

		this.load("modules", {}).then(e => {this.moduleList = e});
	}

	checkSave(message) {
		if (!this.moduleList[message.guild.id]) {
			this.moduleList[message.guild.id] = { mention: { server: "ping", channels: {} }, macros: { server: {"Ping!": {command: "ping", exact: true}}, channels: {} } };
			this.save("modules", this.moduleList);
		}
	}

	command(message, args, kwargs, flags) {
		this.checkSave(message);

		var list = this.moduleList[message.guild.id];
		var mentionChannels = Object.keys(list.mention.channels);
		var macroChannels = Object.keys(list.macros.channels);

		message.reply(
			new MessageEmbed()
			.setTitle("[MACRO] Macro list")
			.addField("Mention", "**Server:** `" + list.mention.server + "`" + (mentionChannels.length ? "\n\n**Channels:**\n" + mentionChannels.map(e => this.client.channels.cache.get(e).toString() + ": `" + list.mention.channels[e] + "`").join("\n") : ""))
			.addField("Macros", "**Server:**\n"
				+ Object.keys(list.macros.server).map(e => e + " -> `" + list.macros.server[e].command + "`" + (list.macros.server[e].exact ? " (Exact)": "")).join("\n")
				+ (macroChannels.length ?
					"\n\n**Channels:**\n"
					+ macroChannels.map(e =>
						this.client.channels.cache.get(e).toString() + ":\n--• "
						+ Object.keys(list.macros.channels[e]).map(f => f + " -> `" + list.macros.channels[e][f].command + "`" + (list.macros.channels[e][f].exact ? " (Exact)": "")).join("\n--• ")
					).join("\n\n")
					: "")
			)
			.setColor(this.color)
		);
	}

	com_mention(message, args, kwargs, flags) {
		this.checkSave(message);
		console.log(this.moduleList[message.guild.id]);

		if (args.length) {
			if (flags.includes("channel")) {
				this.moduleList[message.guild.id].mention.channels[message.channel.id] = args[1];
			} else {
				this.moduleList[message.guild.id].mention.server = args[1];
			}

			this.save("modules", this.moduleList);
			message.reply("The linked module is now: `" + process.env.PREFIX + args[1] + "`" + (flags.includes("channel") ? " (In this channel)" : ""));
		} else {
			if (this.moduleList[message.guild.id].mention.channels[message.channel.id]) {
				message.reply("The linked module is currently: `" + process.env.PREFIX + this.moduleList[message.guild.id].mention.channels[message.channel.id] + "` (In this channel)");
			} else {
				message.reply("The linked module is currently: `" + process.env.PREFIX + this.moduleList[message.guild.id].mention.server + "`");
			}
		}
	}

	com_create(message, args, kwargs, flags) {
		this.checkSave(message);

		var macro = {
			command: args[2],
			exact: flags.includes("exact"),
			ignoreCase: flags.includes("ignoreCase")
		};

		if (flags.includes("channel")) {
			if (!this.moduleList[message.guild.id].macros.channels[message.channel.id]) this.moduleList[message.guild.id].macros.channels[message.channel.id] = {};
			this.moduleList[message.guild.id].macros.channels[message.channel.id][args[1]] = macro;

			message.reply("Created channel macro " + args[1] + " linked to the command/message `" + args[2] + "`");
		} else {
			this.moduleList[message.guild.id].macros.server[args[1]] = macro;

			message.reply("Created server macro " + args[1] + " linked to the command/message `" + args[2] + "`");
		}

		this.save("modules", this.moduleList);
	}

	com_delete(message, args, kwargs, flags) {
		this.checkSave(message);
		var channelObject = this.moduleList[message.guild.id].macros.channels[message.channel.id];

		if (Object.keys(this.moduleList[message.guild.id].macros.server).includes(args[1])) {
			delete this.moduleList[message.guild.id].macros.server[args[1]];

			message.reply("Deleted the server macro " + args[1]);
		} else if (channelObject && Object.keys(channelObject).includes(args[1])) {
			delete channelObject[args[1]];
			if (!Object.keys(channelObject).length) delete this.moduleList[message.guild.id].macros.channels[message.channel.id];

			message.reply("Deleted the channel macro " + args[1]);
		} else {
			message.reply("No macro with this name has been found")
		}

		this.save("modules", this.moduleList);
	}

	on_message(message) {
		if (message.guild) {
			super.on_message(message);

			var list = this.moduleList[message.guild.id];
			var index = message.content.search(MessageMentions.USERS_PATTERN);
			this.checkSave(message);

			var moduleName = list.mention.channels[message.channel.id];
			if (!moduleName) moduleName = list.mention.server;

			if (index === 0 && message.mentions.users.first().id == this.client.user.id && this.client.modules[moduleName]) {
				this.client.modules[moduleName]._testForAuth(message, message.content);
			}

			Object.keys(list.macros.server).forEach(element => this.checkForMacro(element, list.macros.server[element], message));
			if (list.macros.channels[message.channel.id]) Object.keys(list.macros.channels[message.channel.id]).forEach(element => this.checkForMacro(element, list.macros.channels[message.channel.id][element], message));
		}
	}

	checkForMacro(key, value, message) {
		var content = message.content;

		if (value.ignoreCase) {
			key = key.toLowerCase();
			content = message.content.toLowerCase();
		}
		var index = content.search(key);

		if (index === 0 && value.exact) {
			console.log("Found exact", value.command);
			var content = content.replace(key, process.env.PREFIX + value.command);
			for (var element of Object.values(this.client.modules)) {
				try {
					if (element.commandText === value.command.split(" ")[0]) {
						element._testForAuth(message, content);
						return;
					}
				} catch(e) {
					client.error(message.channel, element.name, e);
				}
			};

			message.channel.send(value.command);
		} else if (index != -1 && !value.exact) {
			console.log("Found non exact");
			for (var element of Object.values(this.client.modules)) {
				try {
					if (element.commandText === value.command.split(" ")[0]) {
						element._testForAuth(message, value.command);
						return;
					}
				} catch(e) {
					client.error(message.channel, element.name, e);
				}
			};

			message.channel.send(value.command);
		}
	}
}

module.exports = exports = {MainClass};
