const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Random";
		this.description = "Multiple random generators";
		this.help = {
			"": "Throws a d6",
			"vowel [amount]": "Sends a random vowel using Scrabble distribution.\nUse --uniform for a uniform one.\nUse --unique to avoid repeats",
			"consonant [amount]": "Sends a random consonant using Scrabble distribution.\nUse --uniform for a uniform one.\nUse --unique to avoid repeats",
			"letter [amount]": "Sends a random letter using Scrabble distribution.\nUse --uniform for a uniform one.\nUse --unique to avoid repeats",
			"rps/shifumi": "Throws a random Rock-Paper-Scissors symbol",
			"card [amount]": "Draws a random card.\nUse --unique to make sure all cards drawn are unique",
			"choices [list of choices seperated by spaces]": "Returns one of the choices at random, following a uniform distribution",
			"8ball": "Get a answer to your question from the magic 8-ball"
		}
		this.commandText = "random";
		this.color = 0xff6600;
		this.dmEnabled = true;
		this.ready = true;
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
			if (flags.includes("unique")) vowels = vowels.slice(0, choice) + vowels.slice(choice + 1, vowels.length);
			if (!vowels.length) break;
		}

		this.reply(message, "🔠 Result of the random vowel(s): **" + result.join(", ") + "**");
	}

	com_consonant(message, args, kwargs, flags) {
		var consonants = "BBCCDDDFFGGHHJKLLLLLMMMNNNNNNPPQRRRRRRSSSSSSTTTTTTVVWXZ";
		var result = [];
		var amount = isNaN(args[1]) ? 1 : (Number(args[1]) < 100 ? Number(args[1]) : 100);

		if (flags.includes("uniform")) consonants = "BCDFGHJKLMNPQRSTVWXZ";

		for (var i = 0; i < amount; i ++) {
			var choice = Math.floor(Math.random() * consonants.length);

			result.push(consonants[choice]);
			if (flags.includes("unique")) consonants = consonants.slice(0, choice) + consonants.slice(choice + 1, consonants.length);
			if (!consonants.length) break;
		}

		this.reply(message, "🔠 Result of the random consonant(s): **" + result.join(", ") + "**");
	}

	com_letter(message, args, kwargs, flags) {
		var letters = "AAAAAAAAABBCCDDDEEEEEEEEEEEEEEEFFGGHHIIIIIIIIJKLLLLLMMMNNNNNNOOOOOOPPQRRRRRRSSSSSSTTTTTTUUUUUUVVWXYZ";
		var result = [];
		var amount = isNaN(args[1]) ? 1 : (Number(args[1]) < 100 ? Number(args[1]) : 100);

		if (flags.includes("uniform")) letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

		for (var i = 0; i < amount; i ++) {
			var choice = Math.floor(Math.random() * letters.length);

			result.push(letters[choice]);
			if (flags.includes("unique")) letters = letters.slice(0, choice) + letters.slice(choice + 1, letters.length);
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
		var unique = flags.includes("unique") ? true : false;

		for (var i = 0; i < amount; i ++) {
			var card;
			do {
				var value = Math.floor(Math.random() * 13) + 1;
				value = value < 10 ? value + 1 : "AJKQ"[value - 10];
				card = "**" + value + "** " + suits[Math.floor(Math.random() * 4)]
			} while (result.includes(card) && unique);

			result.push(card);
		}

		this.reply(message, "🃏 Card(s) drawn: " + result.join(", "));
	}

	com_choice(message, args, kwargs, flags) {
		args.splice();
		this.reply(message, "🔮 I choose **" + args[Math.floor(Math.random() * args.length)] + "**!");
	}

	com_8ball(message, args, kwargs, flags) {
		var answers = [
			"It is certain.",
			"It is decidedly so.",
			"Without a doubt.",
			"Yes – definitely.",
			"You may rely on it.",

			"As I see it, yes.",
			"Most likely.",
			"Outlook good.",
			"Yes.",
			"Signs point to yes.",

			"Reply hazy, try again.",
			"Ask again later.",
			"Better not tell you now.",
			"Cannot predict now.",
			"Concentrate and ask again.",

			"Don't count on it.",
			"My reply is no.",
			"My sources say no.",
			"Outlook not so good.",
			"Very doubtful."
		];

		this.reply(message, "🎱 " + answers[Math.floor(Math.random() * answers.length)]);
	}
}

module.exports = exports = {MainClass};
