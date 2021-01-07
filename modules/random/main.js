const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Random";
		this.description = "Multiple random things";
		this.help = {
			"": "Throws a d6",
			"vowel": "Sends a random vowel",
			"consonnant": "Sends a random consonnant",
			"letter": "Sends a random letter. All random letters are spread out according to the Scrabble point distribution",
			"rps (or) shifumi": "Throws a random Rock-Paper-Scissors symbol",
			"card": "Draws a random card"
		}
		this.commandText = "random";
		this.color = 0xff6600;
	}

	command(message, args, kwargs) {
		message.reply(
			new MessageEmbed()
			.setDescription("🎲 Result of the default D6: **" + Math.floor(Math.random() * 6 + 1) + "**")
			.setColor(this.color)
		);
	}

	com_vowel(message, args, kwargs) {
		var vowels = "AAAAAAAAAEEEEEEEEEEEEEEEIIIIIIIIOOOOOOUUUUUUY";
		var result = [];
		var amount = isNaN(args[1]) ? 1 : (Number(args[1]) < 100 ? Number(args[1]) : 100);

		for (var i = 0; i < amount; i ++) {
			result.push(vowels[Math.floor(Math.random() * vowels.length)]);
		}

		message.reply(
			new MessageEmbed()
			.setDescription("🔠 Result of the random vowel(s): **" + result.join(", ") + "**")
			.setColor(this.color)
		);
	}

	com_consonnant(message, args, kwargs) {
		var consonnants = "BBCCDDDFFGGHHJKLLLLLMMMNNNNNNPPQRRRRRRSSSSSSTTTTTTVVWXZ";
		var result = [];
		var amount = isNaN(args[1]) ? 1 : (Number(args[1]) < 100 ? Number(args[1]) : 100);

		for (var i = 0; i < amount; i ++) {
			result.push(consonnants[Math.floor(Math.random() * consonnants.length)]);
		}

		message.reply(
			new MessageEmbed()
			.setDescription("🔠 Result of the random consonnant(s): **" + result.join(", ") + "**")
			.setColor(this.color)
		);
	}

	com_letter(message, args, kwargs) {
		var letters = "AAAAAAAAABBCCDDDEEEEEEEEEEEEEEEFFGGHHIIIIIIIIJKLLLLLMMMNNNNNNOOOOOOPPQRRRRRRSSSSSSTTTTTTUUUUUUVVWXYZ";
		var result = [];
		var amount = isNaN(args[1]) ? 1 : (Number(args[1]) < 100 ? Number(args[1]) : 100);

		for (var i = 0; i < amount; i ++) {
			result.push(letters[Math.floor(Math.random() * letters.length)]);
		}

		message.reply(
			new MessageEmbed()
			.setDescription("🔠 Result of the random letter(s): **" + result.join(", ") + "**")
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

	com_card(message, args, kwargs) {
		var suits = ["❤️", "☘️", "♠️", "🔷"];
		var result = [];
		var amount = isNaN(args[1]) ? 1 : (Number(args[1]) < 52 ? Number(args[1]) : 52);

		for (var i = 0; i < amount; i ++) {
			var card;
			do {
				var value = Math.floor(Math.random() * 13) + 1;
				value = value < 10 ? value + 1 : "AJKQ"[value - 10];
				card = "**" + value + "** " + suits[Math.floor(Math.random() * 4)]
			} while (result.includes(card));

			result.push(card);
		}

		message.reply(
			new MessageEmbed()
			.setDescription("🃏 Card(s) drawn: " + result.join(", "))
			.setColor(this.color)
		);
	}
}

module.exports = exports = {MainClass};
