const {MessageEmbed} = require('discord.js');

/** The Base module class. Every module's MainClass must extend from this. DO NOT INSTANTIATE AS IS. */
class Base {
	/**
	 * Sets up the base values of all modules, such as a reference to the client, a name, description and help message.
	 * @constructor
	 * @param {external:Client} client - The Discord.js bot client.
	 * @property {external:Client} client - The Discord.js bot client.
	 * @property {string} name - The module's name, used for the help command.
	 * @property {string} description - The module's description, used for the help command.
	 * @property {Object} help - Used to create the help message.
	 * @property {string} commandText - The command the bot will be looking for.
	 * @property {number} color - The module's description, used for the help command.
	 * @property {boolean} ready - Starts false. Must be set to true for the module to receive inputs.
	 * @property {Array<external:Snowflake>} auth - The ID of the users that are authorized to run this command. Authorizes everyone if it's empty. Authorizes server owners, roles with the Administrator permission and roles tagged as administrators if it includes the value "Admin".
	 * @property {boolean} dmEnabled - Whether or not the command can be run from DMs. Defaults to false.
	 * @property {boolean} core - Wheter or not this is a core module and it can be disaled or not. Defaults to false.
	 * @property {boolean} startDisabled - Wheter or not this module will be disabled by default on new servers. Defaults to false.
	 * @property {boolean} hidden - Wheter or not this module will be hidden and not ba activalbe except by the bot's admin. Defaults to false.
	 */
	constructor(client) {
		this.client = client;
		this.name = "[TODO] Add name";
		this.description = "[TODO] Add description";
		this.help = {
			"": "[TODO] Add help"
		}
		this.commandText = "";
		this.color = 0xffffff;
		this.ready = false;
		this.auth = [];
		this.dmEnabled = false;
		this.core = false;
		this.startDisabled = false;
		this.hidden = false;
	}

	/**
 	 * Number emojis from 1 to 10.
	 * @readonly
	 * @type {string[]}
	 */
	get NUMBER_EMOJIS() {
		return ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
	}

	authorize(message, originalAuth) {
		if (message.author.id === process.env.ADMIN) return true;

		var auth = originalAuth.filter(e => e !== "Admin");
		if (message.guild) {
			if (originalAuth.includes("Admin")) {
				auth.push(...this.client.admins[message.guild.id].users);
				auth.push(...this.client.admins[message.guild.id].roles);
			}
		}

		var authorized = originalAuth.length === 0 || auth.includes(message.author.id);
		if (message.member) authorized |= message.member.permissions.has("ADMINISTRATOR") || message.member.roles.cache.keyArray().some(e => auth.includes(e));

		return authorized;
	}

	_testForAuth(message, content) {
		if (!message.guild && !this.dmEnabled) return;

		var content = content.match(/[^\s"]+|"[^"]*"/g).slice(1); //content.split(/\s+/g).slice(1);
		var args = [], kwargs = {}, flags = [];
		console.log(content);
		// var insideQuotes = false;
		for (var element of content) {
			if (element.startsWith("\"")) element = element.substring(1, element.length - 1);
			if (!element.length) continue;

			if (element.search(/\S+=\S+/) != -1) {
				var key = element.match(/\S+=/)[0];
				var value = element.match(/=\S+/)[0];
				kwargs[key.substring(0, key.length - 1)] = value.substring(1);
			} else if (element.startsWith("--")) {
				flags.push(element.slice(2));
			} else {
				args.push(element);
			}

			// } else if (!insideQuotes) {
			// 	if (element.startsWith("--")) {
			// 		flags.push(element.slice(2));
			// 	} else {
			// 		if (element.startsWith("\"") && !element.endsWith("\"")) {
			// 			insideQuotes = true;
			// 			element = element.slice(1);
			// 		}
			// 		args.push(element);
			// 	}
			// } else {
			// 	if (element.endsWith("\"")) {
			// 		insideQuotes = false;
			// 		element = element.slice(0, -1);
			// 	}
			// 	args[args.length - 1] += " " + element;
			// }
		}

		if (this.authorize(message, this.auth)) {
			this._executeCommand(message, args, kwargs, flags);
		} else {
			message.reply("You are not authorized to run this command.");
		}
	}

	_executeCommand(message, args, kwargs, flags) {
		console.log(args, kwargs, flags);

		if (this["com_" + args[0]]) {
			this["com_" + args[0]](message, args, kwargs, flags);
		} else {
			this.command(message, args, kwargs, flags);
		}
	}

	/**
	 * Callback function called when a message is sent. Defaults to checking for the command and for auth to execute the command.
	 * @method
	 * @param {external:Message} message - The message that was sent.
	 */
	on_message(message) {
		if (message.content.startsWith(process.env.PREFIX) && message.content.split(" ")[0] === process.env.PREFIX + this.commandText) {
			this._testForAuth(message, message.content);
		}
	}

	/**
	 * Callback function called when a member joins a server.
	 * @method
	 * @param {external:Member} member - The member that joined.
	 */
	on_guildMemberAdd(member) {
		return;
	}

	/**
	 * Sends a choice message, using reactions. The message will be deleted once the collector is closed by default.
	 * @async
	 * @method
	 * @param {(external:TextChannel|external:DMChannel)} channel - The Discord channel the message is sent to.
	 * @param {(string|external:MessageEmbed)} content - The content of that message.
	 * @param {string[]} emojis - The emojis to be added as reactions and listened for. Represents the options the user can take.
	 * @param {string} confirmation_emoji - The emoji that will be displayed when either the collect and remove functions return true, and the confirmation_condition is fulfilled. Clicking it will close the collector.
	 * @param {collectionCallback} collect_function - The callback function called on the collection of a reaction.
	 * @param {removalCallback} remove_function - The callback function called on the removal of a reaction. Set to null to use the collect_function.
	 * @param {confirmationCallback} confirmation_condition - The callback function called to verify if the collector should be closed on the collection of the confrimation emoji.
	 * @param {endCallback} end_function - The callback function called once the collector is closed.
	 * @param {Object} options - Options for the message
	 * @param {boolean} options.dontDelete - Prevents the message from being deleted once the collector is closed.

	 * @returns {external:Message} The message that was sent.
	 */
	async sendChoice(channel, content, emojis, confirmation_emoji, collect_function, remove_function, confirmation_condition, end_function, options = {}) {
		if (!remove_function) remove_function = collect_function;

		return await channel.send(content)
			.then(async m => {for (var r of emojis) await m.react(r); return m})
			.then(m => {
				emojis.push(confirmation_emoji);
				var collection = m.createReactionCollector((reaction, user) => emojis.includes(reaction.emoji.name) && !user.bot, { dispose: true });

				function updateConfirmationEmoji(base, can_confirm) {
					if (can_confirm) {
						m.react(confirmation_emoji);
					} else {
						var r = m.reactions.cache.get(confirmation_emoji);
						if (r) r.users.remove(base.client.user);
					}
				};

				collection.on('collect', (reaction, user) => {
					if (reaction.emoji.name === confirmation_emoji) {
						if (confirmation_condition(reaction, user) && m.reactions.cache.get(confirmation_emoji).me) collection.stop();
					} else {
						var can_confirm = collect_function(collection, reaction, user);
						updateConfirmationEmoji(this, can_confirm);
					}
				});

				collection.on('remove', (reaction, user) => {
					if (reaction.emoji.name != confirmation_emoji) {
						var can_confirm = remove_function(collection, reaction, user);
						updateConfirmationEmoji(this, can_confirm);
					}
				});

				collection.on('end', (collected) => {
					if (!options.dontDelete) collection.message.delete();
					end_function(collection, collected);
				});

				return m;
			})
			.catch(e => this.client.error(channel, this.name, e));
	}

	/**
	 * Checks the database to see if a save already exists. If no URL is set in the environement, instead checks for a JSON file.
	 * @async
	 * @param {string} name - The name of the collection to look for. The database has the same name as the module.
	 * @returns {boolean} True if the save already exists, false otherwise
	 */
	async saveExists(name) {
		return this.client.dbSystem.saveExists(this.name.toLowerCase().replace(" ", "_"), name);
	}

	/**
	 * Saves data into the database. If no URL is set in the environement, saves it to a JSON file instead.
	 * @async
	 * @param {string} name - The name of the collection to look for. The database has the same name as the module.
	 * @param {Object} data - The data to be stored into the database.
	 */
	async save(name, data) {
		this.client.dbSystem.save(this.name.toLowerCase().replace(" ", "_"), name, data);
	}

	/**
	 * Loads data from the database. If no URL is set in the environement, loads the JSON file instead.
	 * @async
	 * @param {string} name - The name of the collection to look for. The database has the same name as the module.
	 * @param {Object} fallback - The data to be saved in case no save already exists.
	 * @returns {Object} The object fetched from the database, or the fallback object if no save exists.
	 */
	async load(name, fallback) {
		return this.client.dbSystem.load(this.name.toLowerCase().replace(" ", "_"), name, fallback)
	}
}

module.exports = exports = {Base}

/**
 * Called when an emoji is collected.
 * @callback collectionCallback
 * @param {external:Collection<Emoji,external:MessageReaction>} collection - The current collection of all reactions.
 * @param {external:MessageReaction} reaction - The reaction that was added.
 * @param {external:User} user - The user that added that reaction.
 */

/**
 * Called when an emoji is removed.
 * @callback removalCallback
 * @param {external:Collection<Emoji,external:MessageReaction>} collection - The current collection of all reactions.
 * @param {external:MessageReaction} reaction - The reaction that was added.
 * @param {external:User} user - The user that added that reaction.
 */

/**
 * Called to verify if the collection can be closed when someone clicks on the confrimation emoji.
 * @callback confirmationCallback
 * @param {external:MessageReaction} reaction - The reaction that was added.
 * @param {external:User} user - The user that added that reaction.
 */

/**
 * Called once the reaction collector is closed.
 * @callback endCallback
 * @param {external:ReactionCollector} collection - The ReactionCollector object.
 * @param {external:Collection<Emoji,external:MessageReaction>} collected - The collection of MessageReactions that were collected.
 */
