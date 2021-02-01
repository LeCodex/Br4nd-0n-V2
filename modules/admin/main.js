const {MessageEmbed, MessageMentions} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Admin";
		this.description = "Manages permissions on the bot. Roles with Administrator permission and server owners are administrators by default";
		this.help = {
			"": "Sends the bot's admin information on this server",
			"add <role/user mention list>": "Add that role/user as an administrator for the bot",
			"remove <role/user mention list>": "Remove that role/user from being an administrator for the bot",
		};
		this.commandText = "admin";
		this.color = 0x4B0082;
		this.auth = [ "Admin" ];
		this.core = true;
		this.ready = true;
	}

	command(message, args, kwargs, flags) {
		var users = this.client.admins[message.guild.id].users.map(e => " • " + this.client.users.cache.get(e).toString())
		var roles = this.client.admins[message.guild.id].roles.map(e => " • " + message.guild.roles.cache.get(e).toString())
		message.reply(
			new MessageEmbed()
			.setTitle("Administrators")
			.addField("Users", users.length ? users.join("\n") : "❌ No users")
			.addField("Roles", roles.length ? roles.join("\n") : "❌ No roles")
			.setColor(this.color)
		);
	}

	getUsersAndRoles(message, args) {
		args.shift();
		var users = [], roles = [];

		while (args.length && (args[0].match(MessageMentions.USERS_PATTERN) || args[0].match(MessageMentions.ROLES_PATTERN))) {
			var user = this.client.getUserFromMention(args[0]);

			if (user) {
				users.push(user);
				args.shift();
			} else {
				var role = this.client.getRoleFromMention(message.guild, args[0]);

				if (role) {
					roles.push(role);
					args.shift();
				} else {
					message.reply(
						new MessageEmbed()
						.setDescription("❌ **Error:** Unkown or invalid user or role mention : " + args[0])
						.setColor(this.color)
					);
					return [null, null];
				}
			}
		}

		if (users.length + roles.length === 0) {
			message.reply(
				new MessageEmbed()
				.setDescription("❌ **Error:** No mention received")
				.setColor(this.color)
			);
			return [null, null];
		}

		return [users, roles];
	}

	com_add(message, args, kwargs, flags) {
		var [users, roles] = this.getUsersAndRoles(message, args);

		if (!users || !roles) return;

		users = users.map(e => e.id);
		roles = roles.map(e => e.id);

		this.client.admins[message.guild.id].users.push(...users);
		this.client.admins[message.guild.id].roles.push(...roles);
		this.command(message);

		this.client.dbSystem.save("core", "admins", this.client.admins);
	}

	com_remove(message, args, kwargs, flags) {
		var [users, roles] = this.getUsersAndRoles(message, args);

		if (!users || !roles) return;

		users = users.map(e => e.id).filter(e => e !== message.guild.owner.id);
		roles = roles.map(e => e.id);

		this.client.admins[message.guild.id].users = this.client.admins[message.guild.id].users.filter(e => !users.includes(e));
		this.client.admins[message.guild.id].roles = this.client.admins[message.guild.id].roles.filter(e => !roles.includes(e));
		this.command(message);

		this.client.dbSystem.save("core", "admins", this.client.admins);
	}
}

module.exports = exports = { MainClass }
