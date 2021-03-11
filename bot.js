const { Client, MessageEmbed, Intents } = require('discord.js');
const client = new Client({ ws: { intents: Intents.ALL } });
const { MongoClient } = require("mongodb");
const DB = require("./db.js");

require('dotenv').config();
require('toml-require').install();

const fs = require('fs');
const toml = require('toml');
const concat = require('concat-stream');

var ready = false;

if (process.env.MONGO_DB_URL) client.mongo = new MongoClient(process.env.MONGO_DB_URL, { useUnifiedTopology: true });
client.config = require("./config.toml");
client.modules = {};
client.modulesConstants = {
	dm: [],
	core: [],
	default: []
}
client.path = module.path;
client.dbSystem = new DB(client);

async function loadModules() {
	if (process.env.MONGO_DB_URL) console.log("MongoDB connected");

	const files = await fs.promises.readdir('./modules');
	for (const file of files) {
		try {
			const path = './modules/' + file
			const stat = await fs.promises.stat(path);

			if (stat.isDirectory()) {
				const mainfile = require(path + '/main.js');
				const mod = new mainfile.MainClass(client);
				client.modules[mod.commandText] = mod;

				if (mod.dmEnabled) client.modulesConstants.dm.push(mod.commandText);
				if (mod.core) client.modulesConstants.core.push(mod.commandText);
				if (!mod.startDisabled && !mod.core && !mod.hidden) client.modulesConstants.default.push(mod.commandText);

				console.log("Loaded module " + mod.name + " (" + mod.description + "), command text: " + process.env.PREFIX + mod.commandText + "");
			}
		} catch(e) {
			console.error("Failed to load module from " + file + ": ", e);
		}
	}

	client.enabledModules = await client.dbSystem.load("core", "modules", {});
	client.admins = await client.dbSystem.load("core", "admins", {});

	for (var guildID of Object.keys(client.enabledModules)) client.enabledModules[guildID] = client.enabledModules[guildID].filter(e => !client.modulesConstants.core.includes(e));
	ready = true;
}

client.on('ready', () => {
	if (!client.mongo) {
		loadModules();
	} else if (client.mongo.isConnected()) {
		loadModules();
	} else {
		client.mongo.connect(err => {
			if (err) {
				console.error(err);
				return;
			}
			loadModules();
		});
	}
});

client.on('message', message => {
	if (!message.author.bot && ready) {
		client.checkModulesOnInput(message, "on_message");
	}
});

client.on('guildMemberAdd', member => {
	if (!member.bot && ready) {
		client.checkModulesOnInput(member, "on_guildMemberAdd");
	}
});

client.checkModulesOnInput = function(input, method) {
	var modules = [...client.modulesConstants.dm];
	if (input.guild) {
		if (!client.admins[input.guild.id]) {
			client.admins[input.guild.id] = {
				users: [ input.guild.owner.id ],
				roles: []
			};
			client.dbSystem.save("core", "admins", client.admins);
		}

		if (!client.enabledModules[input.guild.id]) {
			client.enabledModules[input.guild.id] = [...client.modulesConstants.default];
			client.dbSystem.save("core", "modules", client.enabledModules);
		}

		modules = [...client.enabledModules[input.guild.id]];
		modules.push(...client.modulesConstants.core);
	}

	modules.forEach((key) => {
		var element = client.modules[key];
		if (!element.ready) return;

		try {
			element[method](input);
		} catch(e) {
			client.error(input.channel, element.name, e);
		}
	});
}

process.on('uncaughtException', function (err) {
  client.error(null, "Unknown", err);
});

process.on('unhandledRejection', function (err) {
  client.error(null, "Unknown", err);
});

client.error = function(channel, name, error) {
	console.error("Error caused by " + name + " module: ", error);
	embed = new MessageEmbed()
		.setTitle("Error caused by " + name + " module")
		.setColor(0xff0000)
		.setDescription("```js\n" + error.stack + "```")

	client.channels.cache.get("474301772463341569").send(embed); //"<@240947137750237185>"
	if (channel)
		channel.send(embed.setFooter("This message will be deleted in one minute")).then(message => {
			message.delete({ timeout: 60000 });
		}).catch(console.error);
}

client.getUserFromMention = function(mention) {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

		return client.users.cache.get(mention);
	}
}

client.getRoleFromMention = function(guild, mention) {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('&')) {
			mention = mention.slice(1);
		}

		return guild.roles.cache.get(mention);
	}
}

client.login(process.env.BOT_TOKEN).catch(console.error);

const http = require('http');
const server = http.createServer((req, res) => {
	res.writeHead(200);
	res.end('ok');
});
server.listen(3000);

/**
 * Discord.js client.
 * @external Client
 * @see {@link https://discord.js.org/?source=post_page---------------------------#/docs/main/stable/class/Client|Client}
 */

/**
 * Twitter Snowflake.
 * @external Snowflake
 * @see {@link https://discord.js.org/?source=post_page---------------------------#/docs/main/stable/typedef/Snowflake|Snowflake}
 */

/**
 * Discord.js User.
 * @external User
 * @see {@link https://discord.js.org/?source=post_page---------------------------#/docs/main/stable/class/User|User}
 */

/**
 * Discord.js Message.
 * @external Message
 * @see {@link https://discord.js.org/?source=post_page---------------------------#/docs/main/stable/class/Message|Message}
 */

/**
 * Discord.js Message Embed.
 * @external MessageEmbed
 * @see {@link https://discord.js.org/?source=post_page---------------------------#/docs/main/stable/class/MessageEmbed|MessageEmbed}
 */

/**
 * Discord.js Message Reaction.
 * @external MessageReaction
 * @see {@link https://discord.js.org/?source=post_page---------------------------#/docs/main/stable/class/MessageReaction|MessageReaction}
 */

/**
 * Discord.js Text Channel.
 * @external TextChannel
 * @see {@link https://discord.js.org/?source=post_page---------------------------#/docs/main/stable/class/TextChannel|TextChannel}
 */

/**
 * Discord.js DM Channel.
 * @external DMChannel
 * @see {@link https://discord.js.org/?source=post_page---------------------------#/docs/main/stable/class/DMChannel|DMChannel}
 */

/*
 * Discord.js EmojiIdentifierResolvable.
 * @external EmojiIdentifierResolvable
 * @see {@link https://discord.js.org/?source=post_page---------------------------#/docs/main/stable/typedef/EmojiIdentifierResolvable|EmojiIdentifierResolvable}
 */

/**
 * Collection.
 * @external Collection
 * @see {@link https://discord.js.org/?source=post_page---------------------------#/docs/collection/master/class/Collection|Collection}
 */
