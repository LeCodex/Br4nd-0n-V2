const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");
const {evaluate} = require("mathjs");
var XRegExp = require('xregexp');

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Dice";
		this.description = "Throws dice following standard";
		this.help = {
			"XdY": "Throws a X dice with Y faces",
			"dX + dY": "Throws multiple dices with different face counts"
		}
		this.commandText = "roll";
		this.color = 0xff3300;
	}

	command(message, args, kwargs) {
		var results = []
		var lastResult = this.parse(args.join(" "), results);

		if (lastResult) {
			lastResult = evaluate(lastResult);
			var content = "```" + results.join("\n") + "```";

			message.reply(
				new MessageEmbed()
				.setTitle("🎲 Dice Roll Result: " + lastResult)
				.setDescription(content.length < 2048 ? content : "The whole calculation is too long to be displayed in this message.")
				.setColor(this.color)
			);
		} else {
			message.reply(
				new MessageEmbed()
				.setTitle("🎲 Dice Roll Failed")
				.setDescription(results[results.length - 1])
				.setColor(this.color)
			);
		}
	}

	parse(expression, results) {
		//console.log(expression);
		var insideBrackets;

		try {
			insideBrackets = XRegExp.matchRecursive(expression, '\\[\\[', '\\]\\]', 'g');
		} catch {
			results.push("❌ Error while parsing brackets in " + expression);
			return null;
		}

		// console.log(insideBrackets);
		for (var string of insideBrackets) {
			expression = expression.replace("[[" + string + "]]", m => {
				// console.log(m);
				var result = this.parse(m.slice(2, m.length - 2), results);
				return result ? evaluate(result) : "Invalid";
			});

			if (expression.includes("Invalid")) return null;
		}
		//console.log("Nested done: " + expression);

		var result = expression.replace(/(\d+)(d\d+)/g, (m, p1, p2) => {
			p1 = Number(p1);
			if (!Number.isInteger(p1) || p1 <= 0 || p1 > Number.MAX_SAFE_INTEGER) return "Invalid";

			return Array(p1).fill(p2).join(" + ");
		});
		if (result.includes("Invalid")) {
			results.push("❌ Error while parsing dice counts in " + expression);
			return null;
		};
		//console.log("Dices decomposition: " + expression);

		result = result.replace(/d\d+/g, m => this.parseDice(m));
		//console.log("Dices done: " + expression);

		try {
			var evaluation = evaluate(result)
			results.push("• Result of " + expression + ": " + result + (result != evaluation ? " = " + evaluation : ""));
			return result;
		} catch {
			results.push("❌ Error while parsing dice throws, or other error in " + expression);
			return null;
		}
	}

	parseDice(expression) {
		var match = expression.match(/d(\d+)/); //(![!(>\d+)(<\d+)\d+]?)?
		var faceCount = Number(match[1]);

		if (!Number.isInteger(faceCount) || faceCount <= 0 || faceCount > Number.MAX_SAFE_INTEGER) return "Invalid";

		//console.log("Dice: " + expression, match, faceCount);

		return Math.floor(Math.random() * faceCount) + 1;
	}
}

module.exports = exports = {MainClass};
