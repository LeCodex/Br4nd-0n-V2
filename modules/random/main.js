const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Random";
		this.description = "Multiple random things";
		this.help = {
			"": "Throws a d6",
			"dice X": "Throws a dice with X faces",
			"vowel": "Sends a random vowel",
			"consonnant": "Sends a random consonnant",
			"letter": "Sends a random letter",
			"rps (or) shifumi": "Throws a random Rock-Paper-Scissors symbol"
		}
		this.commandText = "random";
		this.color = 0x66ff00;
	}

	command(message, args, kwargs) {
		message.reply(
			new MessageEmbed()
			.setDescription("🎲 Result of the D6: **" + Math.floor(Math.random() * 6) + "**")
			.setColor(this.color)
		);
	}

	com_dice(message, args, kwargs) {
		var faceCount = args[1];

		if (isNaN(faceCount) || faceCount <= 0) {
			message.reply(
				new MessageEmbed()
				.setDescription("❌ Invalid face count")
				.setColor(this.color)
			);
		} else {
			message.reply(
				new MessageEmbed()
				.setDescription("🎲 Result of the D" + faceCount + ": **" + Math.floor(Math.random() * faceCount) + "**")
				.setColor(this.color)
			);
		}
	}

	com_vowel(message, args, kwargs) {
		var vowels = "AEIOUY";

		message.reply(
			new MessageEmbed()
			.setDescription("🔠 Result of the random vowel: **" + vowels[Math.floor(Math.random() * vowels.length)] + "**")
			.setColor(this.color)
		);
	}

	com_consonnant(message, args, kwargs) {
		var consonnants = "BCDFGHJKLMNPQRSTVWXZ";

		message.reply(
			new MessageEmbed()
			.setDescription("🔠 Result of the random consonnant: **" + consonnants[Math.floor(Math.random() * consonnants.length)] + "**")
			.setColor(this.color)
		);
	}

	com_letter(message, args, kwargs) {
		var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

		message.reply(
			new MessageEmbed()
			.setDescription("🔠 Result of the random letter: **" + letters[Math.floor(Math.random() * letters.length)] + "**")
			.setColor(this.color)
		);
	}

	com_rps(message, args, kwargs) {
		var throws = [":rock: Rock", "📄 Paper", "✂️ Scissors"];

		message.reply(
			new MessageEmbed()
			.setDescription("✊ Result of the throw: **" + throws[Math.floor(Math.random() * throws.length)] + "**")
			.setColor(this.color)
		);
	}

	com_shifumi(message, args, kwargs) {
		this.com_rps(message, args, kwargs);
	}
}

module.exports = exports = {MainClass};
