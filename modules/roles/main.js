const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");
const Menu = require("./menu.js")

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Roles";
		this.description = "Manages role attributions";
		this.help = {
			"": "Shows current parameters",
			"join <role mention>": "Sets the role to be attributed when someone joins the server",
			"menu": "Starts the setup of a reaction menu",
			"close": "Closes the menu in the channel"
		};
		this.commandText = "roles";
		this.color = 0x008800;
		this.auth = [ process.env.ADMIN, "118399702667493380", "110848467756134400" ];

		this.load("data", {}).then(async e => {
			this.data = await this.parse(e).catch(e => {
				this.client.error(null, "Roles", e)
				return {};
			});
			
			this.ready = true;
		});
	}

	on_message(message) {
		if (this.data) {
			super.on_message(message);
		}
	}

	on_guildMemberAdd(member) {
		if (this.data) {
			this.checkIfDataExists(member);
			var data = this.data[member.guild.id];
			var role = member.guild.roles.cache.get(data.role);

			if (role) {
				member.roles.add(role);
			}
		}
	}

	checkIfDataExists(message) {
		if (!this.data[message.guild.id]) {
			this.data[message.guild.id] = {
				role: "",
				menus: {}
			}

			this.completeSave();
		}
	}

	command(message, args, kwargs) {
		this.checkIfDataExists(message);
		var data = this.data[message.guild.id];
		var role = message.guild.roles.cache.get(data.role);

		message.reply(role ? "New users will automatically receive the " + role.toString() + " role" : "No roles has been parametered");
	}

	com_join(message, args, kwargs) {
		this.checkIfDataExists(message);

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
		message.reply("New users will now receive the " + message.mentions.roles.first().toString() + " role");

		this.completeSave();
	}

	com_menu(message, args, kwargs) {
		this.checkIfDataExists(message);
		var data = this.data[message.guild.id];

		if (data.menus[message.channel.id]) {
			message.delete();
			return;
		}

		data.menus[message.channel.id] = new Menu(this, message);
		message.delete();
	}

	com_close(message, args, kwargs) {
		this.checkIfDataExists(message);
		var data = this.data[message.guild.id];

		if (data.menus[message.channel.id]) {
			var menu = data.menus[message.channel.id];
			if (menu.admin.id === message.author.id) {
				menu.close()
				delete data.menus[message.channel.id];
			}
			message.delete();
		}

		this.completeSave();
	}

	completeSave() {
		var object = this.serialize();
		this.save("data", object);
	}

	serialize() {
		var object = {};
		for (var [key,value] of Object.entries(this.data)) {
			object[key] = {
				role: value.role,
				menus: {}
			}
			for (var menu of Object.values(value.menus)) {
				object[key].menus[menu.channel.id] = menu.serialize();
			}
		}

		return object;
	}

	async parse(object) {
		var data = {}
		for (var [key,value] of Object.entries(object)) {
			if (!isNaN(key)) {
				data[key] = {
					role: value.role,
					menus: {}
				}
				for (var menu_data of Object.values(value.menus)) {
					var menu = new Menu(this, null);
					await menu.parse(menu_data);
					data[key].menus[menu.channel.id] = menu;
				}
			}
		}

		return data;
	}
}

module.exports = exports = {MainClass}
