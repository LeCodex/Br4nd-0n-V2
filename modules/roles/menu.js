const {MessageEmbed} = require('discord.js');

class Menu {
	constructor(mainclass, message) {
		this.mainclass = mainclass;
		this.client = mainclass.client;

		this.choices = {};
		this.options = {
			"1️⃣": {value: false, message: "Roles are unique: getting one automatically removes the others"},
			"🔄": {value: false, message: "Replaces the default role new users get. It will be given back if no roles are selected"}
		}
		this.message = null;
		this.collector = null;
		this.endTrigger = null;
		this.mentionBuffer = [];

		if (message) {
			this.channel = message.channel;
			this.admin = message.author;
			this.create();
		}
	}

	create() {
		var options_emojis = ["🆗"]
		options_emojis.push(...Object.keys(this.options));
		this.channel.send(
			new MessageEmbed()
			.setTitle("New role menu")
			.setDescription("")
			.addField("🚧 Under construction; Click 🆗 when done 🚧", "*Please wait for a bit...*")
			.addField("Options", Object.keys(this.options).map(e => "❎ " + e + " - " + this.options[e].message).join("\n"))
			.setColor(this.mainclass.color)
		).then(async m => {for (var emoji of options_emojis) m.react(emoji); return m}).then(m => {
			this.message = m;
			this.awaitMention();

			this.endTrigger = this.message.createReactionCollector((r, u) => options_emojis.includes(r.emoji.name) && u.id === this.admin.id, { dispose: true })

			this.endTrigger.on("collect", (reaction, user) => {
				switch(reaction.emoji.name) {
					case "🆗":
						this.endTrigger.stop("validated");
						break;
					default:
						this.options[reaction.emoji.name].value = true;
						this.updateOptionField();
				}
			});

			this.endTrigger.on("remove", (reaction, user) => {
				this.options[reaction.emoji.name].value = false;
				this.updateOptionField();
			});

			this.endTrigger.on("end", (collected, reason) => {
				if (reason === "validated") this.endCreation();
			});
		});
	}

	awaitMention() {
		var embed = this.message.embeds[0]
		embed.fields[0].value = "Mention the **role(s)** to add the menu";
		embed.setDescription(Object.keys(this.choices).map(e => e + " - " + this.choices[e].mention.toString()).join("\n"));
		this.message.edit(embed);

		this.collector = this.channel.createMessageCollector(m => m.mentions.roles.first() && !Object.values(this.choices).includes(m.mentions.roles.first()) && m.author.id === this.admin.id, { max: 1 })

		this.collector.on("end", (collected, reason) => {
			if (reason != "user") {
				this.mentionBuffer = collected.first().mentions.roles.array();
				collected.first().delete();
				this.awaitReaction();
			}
		});
	}

	awaitReaction() {
		var embed = this.message.embeds[0];
		var mention = this.mentionBuffer.shift();
		embed.fields[0].value = "React with the **emoji** to click to get this role: " + mention.toString();
		this.message.edit(embed);

		this.collector = this.message.createReactionCollector((r, u) => !Object.keys(this.choices).includes(r.emoji.name) && u.id === this.admin.id, { max: 1 })

		this.collector.on("end", (collected, reason) => {
			if (reason != "user") {
				this.choices[collected.first().emoji.toString()] = {mention: mention, emoji: collected.first().emoji};
				this.message.edit(embed).then(() => {
					if (Object.keys(this.choices).length >= 20) {
						this.awaitClose();
					} else if (this.mentionBuffer.length) {
						this.awaitReaction()
					} else {
						this.awaitMention();
					}
				}).catch(e => this.client.error(this.channel, "Roles", e));
				collected.first().users.remove(this.admin);
			}
		});
	}

	awaitClose() {
		var embed = this.message.embeds[0]
		embed.fields[0].value = "**Maximum number of reactions reached**";
		this.message.edit(embed);
	}

	async endCreation() {
		this.endTrigger = null;
		this.collector.stop();
		this.message.delete();

		this.message = await this.channel.send(
			new MessageEmbed()
			.setTitle("Role Menu")
			.setDescription("React with one of the emojis to get the role.\nRemove your reaction to remove it\n\n"
			 	+ Object.keys(this.choices).map(e => e + " - " + this.choices[e].mention.toString()).join("\n"))
			.setColor(this.mainclass.color)
		)

		for (var value of Object.values(this.choices)) await this.message.react(value.emoji);
		this.setupReactionCollector();

		this.mainclass.completeSave();
	}

	setupReactionCollector() {
		this.collector = this.message.createReactionCollector((r, u) => Object.keys(this.choices).includes(r.emoji.toString()), { dispose: true })

		this.collector.on("collect", async (reaction, user) => {
			var member = this.channel.guild.members.cache.get(user.id);

			await member.roles.add(this.choices[reaction.emoji.toString()].mention);

			if (this.options["1️⃣"].value) {
				for (var value of Object.values(this.choices)) {
					if (reaction.emoji.name != value.emoji.name) {
						await this.message.reactions.cache.get(value.emoji.id ? value.emoji.id : value.emoji.name).users.remove(user);
						await member.roles.remove(value.mention);
					}
				}
			}

			if (this.options["🔄"].value) {
				this.mainclass.check_if_data_exists(member);
				var data = this.mainclass.data[member.guild.id];
				var role = member.guild.roles.cache.get(data.role);

				if (role) await member.roles.remove(role);
			}

			user.send("Gave you the role " + this.choices[reaction.emoji.toString()].mention.name);
		});

		this.collector.on("remove", async (reaction, user) => {
			var member = this.channel.guild.members.cache.get(user.id);

			await member.roles.remove(this.choices[reaction.emoji.toString()].mention);

			if (this.options["🔄"].value) {
				this.mainclass.check_if_data_exists(member);
				var data = this.mainclass.data[member.guild.id];
				var role = member.guild.roles.cache.get(data.role);

				if (role) {
					var add_again = !Object.values(this.choices).some(e => member.roles.cache.has(e.mention.id));
					if (add_again) await member.roles.add(role);
				}
			}

			user.send("Took away the role " + this.choices[reaction.emoji.toString()].mention.name);
		});
	}

	updateOptionField() {
		var embed = this.message.embeds[0];
		embed.fields[1].value = Object.keys(this.options).map(e => (this.options[e].value ? "✅" : "❎") + " " + e + " - " + this.options[e].message).join("\n");
		this.message.edit(embed);
	}

	close() {
		if (this.collector) this.collector.stop();
		if (this.endTrigger) this.endTrigger.stop();
		this.message.delete();
	}

	serialize() {
		var object = {};
		object.choices = {};
		object.options = this.options;
		object.message = this.message.id;
		object.channel = this.channel.id;
		object.admin = this.admin.id;

		for (var [key, value] of Object.entries(this.choices)) {
			object.choices[key] = {
				mention: value.mention.id,
				emoji: value.emoji.id ? value.emoji.id : value.emoji.name
			};
		}

		return object;
	}

	async parse(object) {
		this.choices = object.choices;
		this.options = object.options;
		this.channel = await this.client.channels.fetch(object.channel);
		this.message = await this.channel.messages.fetch(object.message);
		this.admin = await this.client.users.fetch(object.admin);
		this.choices = {};

		for (var [key, value] of Object.entries(object.choices)) {
			this.choices[key] = {
				mention: await this.channel.guild.roles.fetch(value.mention),
				emoji: await this.message.reactions.cache.get(value.emoji).emoji
			}
		}

		this.setupReactionCollector();
	}
}

module.exports = exports = Menu
