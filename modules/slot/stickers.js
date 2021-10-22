const Food = require("./stickers/food.js");
const Money = require("./stickers/money.js");
const Symbols = require("./stickers/symbols.js");
const Living = require("./stickers/living.js");
const Items = require("./stickers/items.js");
const Environment = require("./stickers/environment.js");

Stickers = {}
Object.assign(Stickers, Food, Money, Symbols, Living, Items, Environment);

// console.log(Stickers);

module.exports = exports = Stickers;
