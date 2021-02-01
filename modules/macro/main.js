const {MessageEmbed, MessageMentions} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

function format(a, arguments) {
    for (var k in arguments) {
        if (!isNaN(k)) a = a.replace(new RegExp("\%" + k, 'g'), arguments[k]);
    }
	return a;
}

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Macro";
		this.description = "Redirects mentions of the bot and other macros to other modules";
		this.help = {
			"": "Sends the current module the mentions calls (in this channel if it was set) and all other macros.",
			"mention <command> [--channel]": "Sets the command the mentions will call. You don't need to specify the prefix in the command.\nUse --channel to apply this change only to this channel.",
			"mention clear": "Clears the link to mentions in this channel",
			"create <macro> <command> [--exact] [--ignoreCase] [--channel]": "Creates a macro. You don't need to specify the prefix in the command for the macro. If the command is not one of the modules', it will instead just send it as a message"
				+ "\nUse %n to add arguments and %[0, 1, 2, ...] to use them in the command. Use %a in the command to add the mention of the message's author"
				+ "\nUse --exact to require the macro to be sent in its own message, instead of triggering when it's detected in any message. Anything typed after the macro will be added as arguments."
				+ "\nUse --ignoreCase to make the search ignore the case of the macro."
				+ "\nUse --channel to apply this macro only in this channel.",
			"delete <macro>": "Deletes the macro if it exists."
		};
		this.commandText = "macro";
		this.color = 0x222222;
		this.auth = [ "Admin" ];

		this.load("modules", {}).then(e => {this.moduleList = e; this.ready = true;});
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
			if (args[1] === "clear") {
				if (this.moduleList[message.guild.id].mention.channels[message.channel.id]) {
					delete this.moduleList[message.guild.id].mention.channels[message.channel.id];
					this.save("modules", this.moduleList);

					message.reply("The link to the mention has been removed in this channel");
				} else {
					message.reply("No link to the mention has been found in this channel");
				}
			} else {
				if (flags.includes("channel")) {
					this.moduleList[message.guild.id].mention.channels[message.channel.id] = args[1];
				} else {
					this.moduleList[message.guild.id].mention.server = args[1];
				}

				this.save("modules", this.moduleList);
				message.reply("The linked command/message is now: `" + args[1] + "`" + (flags.includes("channel") ? " (In this channel)" : ""));
			}
		} else {
			if (this.moduleList[message.guild.id].mention.channels[message.channel.id]) {
				message.reply("The linked command/message is currently: `" + this.moduleList[message.guild.id].mention.channels[message.channel.id] + "` (In this channel)");
			} else {
				message.reply("The linked command/message is currently: `" + this.moduleList[message.guild.id].mention.server + "`");
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
			message.reply("No macro with this name has been found");
		}

		this.save("modules", this.moduleList);
	}

	on_message(message) {
		if (message.guild) {
			super.on_message(message);

			var list = this.moduleList[message.guild.id];
			var index = message.content.search(MessageMentions.USERS_PATTERN);
			this.checkSave(message);

			var command = list.mention.channels[message.channel.id];
			if (!command) command = list.mention.server;

			if (index === 0 && message.mentions.users.first().id == this.client.user.id) {
				var content = message.content.split(" ").slice(1).join(" ");
				for (var element of Object.values(this.client.modules)) {
					try {
						if (element.commandText === command.split(" ")[0]) {
							element._testForAuth(message, command + " " + content);
							return;
						}
					} catch(e) {
						client.error(message.channel, element.name, e);
					}
				};

				message.channel.send(command);
			}

			Object.keys(list.macros.server).forEach(element => this.checkForMacro(element, list.macros.server[element], message));
			if (list.macros.channels[message.channel.id]) Object.keys(list.macros.channels[message.channel.id]).forEach(element => this.checkForMacro(element, list.macros.channels[message.channel.id][element], message));
		}
	}

	checkForMacro(key, value, message) {
		var content = message.content;
		var regex = new RegExp((value.exact ? "^" : "") + key.replace(/%n/g, "(\\S+)"), (value.ignoreCase ? "i" : ""));
		var match = content.match(regex);

		if (match) {
			var command;

			if (value.exact) {
				command = content.replace(regex, value.command);
			} else {
				command = value.command;
			}

		 	match.shift();
			console.log(match);
			command = format(command, match);
			command = command.replace(/%a/g, message.author.toString());

			console.log(command);

			for (var element of Object.values(this.client.modules)) {
				try {
					if (element.commandText === value.command.split(" ")[0]) {
						element._testForAuth(message, command);
						return;
					}
				} catch(e) {
					client.error(message.channel, element.name, e);
				}
			};

			var msg = value.command;
			msg = format(msg, match);
			msg = msg.replace(/%a/g, message.author.toString());

			message.channel.send(msg);
		}
	}
}

module.exports = exports = {MainClass};
