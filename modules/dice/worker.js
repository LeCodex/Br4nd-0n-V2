const workerpool = require('workerpool');
const XRegExp = require('xregexp');
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

function parse(expression, results = []) {
	// console.log(expression);

	var insideBrackets;
	try {
		insideBrackets = XRegExp.matchRecursive(expression, '\\[\\[', '\\]\\]', 'g');
	} catch (e) {
		return [null, "❌ **Error while parsing brackets in " + expression + "**:\n" + e];
	}
	// console.log(insideBrackets);

	for (var string of insideBrackets) {
		expression = expression.replace("[[" + string + "]]", m => {
			console.log(m);
			var result;
			[result, results] = parse(m.slice(2, m.length - 2), results);
			return result ? limitedEvaluate(result) : "Invalid";
		});

		if (expression.includes("Invalid")) return null;
	}
	// console.log("Nested done: " + expression);

	var result = expression.replace(/([\d.]+)(d[\d.]+)/g, (m, p1, p2) => {
		p1 = Number(p1);
		if (!Number.isInteger(p1) || p1 <= 0 || p1 > 65535) return "Invalid";
		if (p1 == 1) return p2;

		return "(" + Array(p1).fill(p2).join(" + ") + ")";
	});
	if (result.includes("Invalid")) {
		return [null, "❌ Error while parsing dice counts in " + expression];
	};
	// console.log("Dices decomposition: " + expression);

	result = result.replace(/d[\d.]+/g, m => parseDice(m));
	// console.log("Dices done: " + expression);

	try {
		var evaluation = limitedEvaluate(result);
		results.push("• Result of " + expression + ": " + result + (result != evaluation ? " = " + evaluation : ""));
		return [result, results];
	} catch (e) {
		return [null, "❌ **Error while parsing dice throws, or other error in " + expression + ":**\n" + e];
	}
}

function parseDice(expression) {
	var match = expression.match(/d([\d.]+)/); //(![!(>\d+)(<\d+)\d+]?)?
	var faceCount = Number(match[1]);

	if (!Number.isInteger(faceCount) || faceCount <= 0 || faceCount > 65535) return "Invalid";

	// console.log("Dice: " + expression, match, faceCount);

	return Math.floor(Math.random() * faceCount) + 1;
}

workerpool.worker({
  parse: parse
});
