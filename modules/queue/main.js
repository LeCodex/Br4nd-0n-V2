const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Queue";
		this.description = "Manages queues";
		this.help = {
			"": "Sends the current queue",
			"add [mention]": "Add yourself to the queue. If a mention is given, add that user instead",
			"remove [mention/index]": "Remove yourself from the queue. If a mention or an index is given, remove that user instead",
			"next": "Removes the first person in the queue and pings them",
			"clear": "Removes all the users from the queue"
		}
		this.commandText = "queue";
		this.color = 0x4e6c75;

		this.queues = {};
		this.load("queues", {}).then(async (object) => {
			for (var key in object) {
				this.queues[key] = object[key].map(async (e) => await this.client.users.fetch(e));
			}
			this.ready = true;
		});
	}

	checkQueue(message) {
		if (!this.queues[message.guild.id]) this.queues[message.guild.id] = [];
		return this.queues[message.guild.id];

		this.save("queues", this.serialize());
	}

	command(message, args, kwargs, flags) {
		var queue = this.checkQueue(message);

		message.reply(
			new MessageEmbed()
			.setTitle("Current queue")
			.setDescription(queue.length ? queue.map((e, i) => "• **" + (i + 1) + ".** " + e.toString()).join("\n") : "❌ No user in the queue")
			.setColor(this.color)
		);
	}

	com_add(message, args, kwargs, flags) {
		var queue = this.checkQueue(message);

		var user;
		if (args.length > 1) {
			user = this.client.getUserFromMention(args[1]);
			if (!user) {
				message.reply("Invalid mention");
				return;
			}
		} else {
			user = message.author;
		}

		if (queue.includes(user)) {
			message.reply("The user is already in the queue");
			return;
		}

		queue.push(user);
		message.reply(user.username + " was added to the queue at index " + queue.length + ".");

		this.save("queues", this.serialize());
	}

	com_next(message, args, kwargs, flags) {
		var queue = this.checkQueue(message);

		if (!queue.length) {
			message.reply("The queue is empty");
			return;
		}

		var user = queue.shift();
		message.channel.send(user.toString() + ", you are next! (" + queue.length + " user(s) left in the queue)");

		this.save("queues", this.serialize());
	}

	com_remove(message, args, kwargs, flags) {
		var queue = this.checkQueue(message);

		var user;
		if (args.length > 1) {
			user = this.client.getUserFromMention(args[1]);

			if (!user) {
				var index = Number(args[1]);
				if (isNaN(args[1])) {
					message.reply("Invalid index or mention");
					return;
				} else {
					if (index < 1 || index > queue.length) {
						message.reply("Index out of range")
						return;
					} else {
						user = queue[index - 1];
					}
				}
			}
		} else {
			user = message.author;
		}

		if (!queue.includes(user)) {
			message.reply("The user is not in the queue");
			return;
		}

		var index = queue.indexOf(user);
		queue.splice(index, 1);
		message.reply(user.username + " was removed from the queue.");

		this.save("queues", this.serialize());
	}

	com_clear(message, args, kwargs, flags) {
		var queue = this.checkQueue(message);

		if (!queue.length) {
			message.reply("The queue is empty");
			return;
		}

		queue.splice(0, queue.length);
		message.reply("The queue was cleared");

		this.save("queues", this.serialize());
	}

	serialize() {
		var object = {};

		for (var key in this.queues) {
			object[key] = this.queues[key].map(e => e.id);
		}

		return object;
	}
}

module.exports = exports = {MainClass};
