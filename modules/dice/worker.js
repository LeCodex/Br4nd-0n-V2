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
		return [null, "❌ **Error while parsing brackets in `" + expression + "`**:\n" + e];
	}
	// console.log(insideBrackets);

	for (var string of insideBrackets) {
		expression = expression.replace("[[" + string + "]]", m => {
			// console.log(m);
			var result;
			[result, results] = parse(m.slice(2, m.length - 2), results);
			return result ? limitedEvaluate(result) : "Invalid";
		});

		if (expression.includes("Invalid")) return null;
	}
	console.log("Nested done: " + expression);

	var result = expression.replace(/([^\s()\[\]\,]+)(d[^\s()\[\]\,]+)/g, (m, p1, p2) => {
		p1 = Number(p1);
		if (isNaN(p1) || !Number.isInteger(p1) || p1 <= 0 || p1 > 999999) return "Invalid";
		if (p1 == 1) return p2;

		return "(" + Array(p1).fill(p2).join(" + ") + ")";
	});
	if (result.includes("Invalid")) {
		return [null, "❌ Error while parsing dice counts in `" + expression + "`"];
	};
	console.log("Dices decomposition: " + result);

	result = result.replace(/d[^\s()\[\]\,]+/g, m => parseDice(m));
	console.log("Dices done: " + result);

	try {
		var evaluation = limitedEvaluate(result);
		results.push("• Result of " + expression + ": " + result + (result != evaluation ? " = " + evaluation : ""));
		return [result, results];
	} catch (e) {
		return [null, "❌ **Error while parsing dice throws, or other error in `" + expression + "`:**\n" + e];
	}
}

function parseDice(expression) {
	var match = expression.match(/d([^\s()\[\]\,]+)/); //(![!(>\d+)(<\d+)\d+]?)?
	var faceCount = Number(match[1]);

	if (isNaN(faceCount) || !Number.isInteger(faceCount) || faceCount <= 0 || faceCount > 999999) return "Invalid";

	// console.log("Dice: " + expression, match, faceCount);

	return Math.floor(Math.random() * faceCount) + 1;
}

workerpool.worker({
  parse
});
