const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Random";
		this.description = "Multiple random generators";
		this.help = {
			"": "Throws a d6",
			"vowel [amount]": "Sends a random vowel using Scrabble distribution. Use --uniform for a uniform one",
			"consonnant [amount]": "Sends a random consonnant using Scrabble distribution. Use --uniform for a uniform one",
			"letter [amount]": "Sends a random letter using Scrabble distribution. Use --uniform for a uniform one",
			"rps (or) shifumi": "Throws a random Rock-Paper-Scissors symbol",
			"card [amount]": "Draws a random card. Use --noRepeat to make sure all cards drawn are unique"
		}
		this.commandText = "random";
		this.color = 0xff6600;
		this.dmEnabled = true;
	}

	reply(message, content) {
		message.reply(
			new MessageEmbed()
			.setDescription(message.author.toString() + ", " + content)
			.setColor(this.color)
		);
	}

	command(message, args, kwargs, flags) {
		this.reply(message, "🎲 Result of the default D6: **" + Math.floor(Math.random() * 6 + 1) + "**");
	}

	com_vowel(message, args, kwargs, flags) {
		var vowels = "AAAAAAAAAEEEEEEEEEEEEEEEIIIIIIIIOOOOOOUUUUUUY";
		var result = [];
		var amount = isNaN(args[1]) ? 1 : (Number(args[1]) < 100 ? Number(args[1]) : 100);

		if (flags.includes("uniform")) vowels = "AEIOUY";

		for (var i = 0; i < amount; i ++) {
			var choice = Math.floor(Math.random() * vowels.length);

			result.push(vowels[choice]);
			if (flags.includes("noRepeat")) vowels = vowels.slice(0, choice) + vowels.slice(choice + 1, vowels.length);
			if (!vowels.length) break;
		}

		this.reply(message, "🔠 Result of the random vowel(s): **" + result.join(", ") + "**");
	}

	com_consonnant(message, args, kwargs, flags) {
		var consonnants = "BBCCDDDFFGGHHJKLLLLLMMMNNNNNNPPQRRRRRRSSSSSSTTTTTTVVWXZ";
		var result = [];
		var amount = isNaN(args[1]) ? 1 : (Number(args[1]) < 100 ? Number(args[1]) : 100);

		if (flags.includes("uniform")) consonnants = "BCDFGHJKLMNPQRSTVWXZ";

		for (var i = 0; i < amount; i ++) {
			var choice = Math.floor(Math.random() * consonnants.length);

			result.push(consonnants[choice]);
			if (flags.includes("noRepeat")) consonnants = consonnants.slice(0, choice) + consonnants.slice(choice + 1, consonnants.length);
			if (!consonnants.length) break;
		}

		this.reply(message, "🔠 Result of the random consonnant(s): **" + result.join(", ") + "**");
	}

	com_letter(message, args, kwargs, flags) {
		var letters = "AAAAAAAAABBCCDDDEEEEEEEEEEEEEEEFFGGHHIIIIIIIIJKLLLLLMMMNNNNNNOOOOOOPPQRRRRRRSSSSSSTTTTTTUUUUUUVVWXYZ";
		var result = [];
		var amount = isNaN(args[1]) ? 1 : (Number(args[1]) < 100 ? Number(args[1]) : 100);

		if (flags.includes("uniform")) letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

		for (var i = 0; i < amount; i ++) {
			var choice = Math.floor(Math.random() * letters.length);

			result.push(letters[choice]);
			if (flags.includes("noRepeat")) letters = letters.slice(0, choice) + letters.slice(choice + 1, letters.length);
			if (!letters.length) break;
		}

		this.reply(message, "🔠 Result of the random letter(s): **" + result.join(", ") + "**");
	}

	com_rps(message, args, kwargs, flags) {
		var throws = [":rock: Rock", "📄 Paper", "✂️ Scissors"];

		this.reply(message, "✊ Result of the throw: **" + throws[Math.floor(Math.random() * throws.length)] + "**");
	}

	com_shifumi(message, args, kwargs, flags) {
		this.com_rps(message, args, kwargs, flags);
	}

	com_card(message, args, kwargs, flags) {
		var suits = ["❤️", "☘️", "♠️", "🔷"];
		var result = [];
		var amount = isNaN(args[1]) ? 1 : (Number(args[1]) < 52 ? Number(args[1]) : 52);
		var noRepeat = flags.includes("noRepeat") ? true : false;

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
