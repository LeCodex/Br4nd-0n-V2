const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");
const workerpool = require('workerpool');
const pool = workerpool.pool("./modules/dice/worker.js");
const { create, all } = require('mathjs');

const math = create(all);
const limitedEvaluate = math.evaluate;

math.import({
  'import':     function () { throw new Error('Function import is disabled') },
  'createUnit': function () { throw new Error('Function createUnit is disabled') },
  'evaluate':   function () { throw new Error('Function evaluate is disabled') },
  'parse':      function () { throw new Error('Function parse is disabled') },
  'simplify':   function () { throw new Error('Function simplify is disabled') },
  'derivative': function () { throw new Error('Function derivative is disabled') }
}, { override: true });

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Dice";
		this.description = "Throws dice following Roll20 dice throw syntax";
		this.help = {
			"XdY": "Throws a X dice with Y faces",
			"dX + dY": "Throws multiple dices with different face counts"
		}
		this.commandText = "roll";
		this.color = 0xff3300;
		this.dmEnabled = true;
	}

	command(message, args, kwargs, flags) {
		var promise = pool.exec("parse", [args.join(" ")])
			.then(([lastResult, results]) => {
				if (lastResult) {
					// console.log(lastResult, results);
					lastResult = limitedEvaluate(lastResult);
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
						.setDescription(results)
						.setColor(this.color)
					);
				}
			})
			.catch(e => message.reply(
				new MessageEmbed()
				.setTitle("🎲 Dice Roll Failed")
				.setDescription("❌ **The process returned the following error:**\n" + e)
				.setColor(this.color)
			));

		promise.timeout(5000);
	}
}

module.exports = exports = {MainClass};
