const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Random";
		this.description = "Multiple random things";
		this.help = {
			"": "Throws a d6",
			"vowel [amount]": "Sends a random vowel",
			"consonnant [amount]": "Sends a random consonnant",
			"letter [amount]": "Sends a random letter. All random letters are spread out according to the Scrabble point distribution",
			"rps (or) shifumi": "Throws a random Rock-Paper-Scissors symbol",
			"card [amount]": "Draws a random card. Use noRepeat=false to allow the bot to draw the same card mutliple times"
		}
		this.commandText = "random";
		this.color = 0xff6600;
	}

	reply(message, content) {
		message.reply(
			new MessageEmbed()
			.setDescription(message.author.toString() + ", " + content)
			.setColor(this.color)
		);
	}

	command(message, args, kwargs) {
		this.reply(message, "🎲 Result of the default D6: **" + Math.floor(Math.random() * 6 + 1) + "**");
	}

	com_vowel(message, args, kwargs) {
		var vowels = "AAAAAAAAAEEEEEEEEEEEEEEEIIIIIIIIOOOOOOUUUUUUY";
		var result = [];
		var amount = isNaN(args[1]) ? 1 : (Number(args[1]) < 100 ? Number(args[1]) : 100);

		for (var i = 0; i < amount; i ++) {
			result.push(vowels[Math.floor(Math.random() * vowels.length)]);
		}

		this.reply(message, "🔠 Result of the random vowel(s): **" + result.join(", ") + "**");
	}

	com_consonnant(message, args, kwargs) {
		var consonnants = "BBCCDDDFFGGHHJKLLLLLMMMNNNNNNPPQRRRRRRSSSSSSTTTTTTVVWXZ";
		var result = [];
		var amount = isNaN(args[1]) ? 1 : (Number(args[1]) < 100 ? Number(args[1]) : 100);

		for (var i = 0; i < amount; i ++) {
			result.push(consonnants[Math.floor(Math.random() * consonnants.length)]);
		}

		this.reply(message, "🔠 Result of the random consonnant(s): **" + result.join(", ") + "**");
	}

	com_letter(message, args, kwargs) {
		var letters = "AAAAAAAAABBCCDDDEEEEEEEEEEEEEEEFFGGHHIIIIIIIIJKLLLLLMMMNNNNNNOOOOOOPPQRRRRRRSSSSSSTTTTTTUUUUUUVVWXYZ";
		var result = [];
		var amount = isNaN(args[1]) ? 1 : (Number(args[1]) < 100 ? Number(args[1]) : 100);

		for (var i = 0; i < amount; i ++) {
			result.push(letters[Math.floor(Math.random() * letters.length)]);
		}

		this.reply(message, "🔠 Result of the random letter(s): **" + result.join(", ") + "**");
	}

	com_rps(message, args, kwargs) {
		var throws = [":rock: Rock", "📄 Paper", "✂️ Scissors"];

		this.reply(message, "✊ Result of the throw: **" + throws[Math.floor(Math.random() * throws.length)] + "**");
	}

	com_shifumi(message, args, kwargs) {
		this.com_rps(message, args, kwargs);
	}

	com_card(message, args, kwargs) {
		var suits = ["❤️", "☘️", "♠️", "🔷"];
		var result = [];
		var amount = isNaN(args[1]) ? 1 : (Number(args[1]) < 52 ? Number(args[1]) : 52);
		var noRepeat = kwargs.noRepeat === "false" ? false : true;

		for (var i = 0; i < amount; i ++) {
			var card;
			do {
				var value = Math.floor(Math.random() * 13) + 1;
				value = value < 10 ? value + 1 : "AJKQ"[value - 10];
				card = "**" + value + "** " + suits[Math.floor(Math.random() * 4)]
			} while (result.includes(card) && noRepeat);

			result.push(card);
		}

		this.reply(message, "🃏 Card(s) drawn: " + result.join(", "));
	}
}

module.exports = exports = {MainClass};
