const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");
const DB = require(module.parent.path + "/db.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Modules";
		this.description = "Manages other modules";
		this.help = {
			"": "Sends the list of enabled/disabled modules",
			"enable <commands>": "Enables the modules with those commands",
			"disable <commands>": "Disables the modules with those commands"
		}
		this.commandText = "modules";
		this.color = 0x123456;
		this.auth = [process.env.ADMIN];
		this.core = true;
	}

	command(message, args, kwargs, flags) {
		var enabled = [...this.client.enabledModules[message.guild.id]];
		var disabled = Object.keys(this.client.modules).filter(e => !this.client.modules[e].hidden && !this.client.modules[e].core && !enabled.includes(e));

		message.reply(
			new MessageEmbed()
			.setTitle("Enabled/Disabled modules")
			.setDescription("```diff\n*Core modules:\n" + this.client.modulesConstants.core.map(e => "*  " + e).join("\n") + "\n======================\n+Enabled modules:\n" + enabled.map(e => "+  " + e).join("\n") + "\n======================\n-Disabled modules:\n" + disabled.map(e => "-  " + e).join("\n") + "```")
			.setColor(this.color)
		);
	}

	com_enable(message, args, kwargs, flags) {
		args.shift();
		if (!args.length) {
			message.reply(
				new MessageEmbed()
				.setDescription("❌ **Error:** No modules sent")
				.setColor(this.color)
			);
			return;
		}

		var enablable = Object.keys(this.client.modules).filter(e => !this.client.enabledModules[message.guild.id].includes(e));
		var invalid = args.filter(e => !enablable.includes(e) || this.client.modules[e] && this.client.modules[e].hidden && message.author.id != process.env.ADMIN);
		if (invalid.length) {
			message.reply(
				new MessageEmbed()
				.setDescription("❌ **Error:** Unrecognized/Invalid modules (" + invalid.join(", ") + ")")
				.setColor(this.color)
			);
			return;
		}

		this.client.enabledModules[message.guild.id].push(...args);
		this.client.enabledModules[message.guild.id].sort();
		message.reply(
			new MessageEmbed()
			.setDescription("✅ Enabled " + args.map(e => this.client.modules[e].name).join(", "))
			.setColor(this.color)
		);

		DB.save("core", "modules", this.client.enabledModules);
	}

	com_disable(message, args, kwargs, flags) {
		args.shift();
		if (!args.length) {
			message.reply(
				new MessageEmbed()
				.setDescription("❌ **Error:** No modules sent")
				.setColor(this.color)
			);
			return;
		}

		var invalid = args.filter(e => !this.client.enabledModules[message.guild.id].includes(e));
		if (invalid.length) {
			message.reply(
				new MessageEmbed()
				.setDescription("❌ **Error:** Unrecognized/Invalid modules (" + invalid.join(", ") + ")")
				.setColor(this.color)
			);
			return;
		}

		this.client.enabledModules[message.guild.id] = this.client.enabledModules[message.guild.id].filter(e => !args.includes(e));
		message.reply(
			new MessageEmbed()
			.setDescription("❎ Disabled " + args.map(e => this.client.modules[e].name).join(", "))
			.setColor(this.color)
		);

		DB.save("core", "modules", this.client.enabledModules);
	}
}

module.exports = exports = {MainClass};
