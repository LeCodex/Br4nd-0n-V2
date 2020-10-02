const {MessageEmbed} = require('discord.js');
const Cups = require('./cups.js');

class Player {
  constructor(user, game, reload = false) {
    this.user = user;
    this.hand = [];
    this.score = 0;

    if (!reload) {
      var message = this.draw(game, 5);
      this.sendHand(game, message);
    }
  }

  draw(game, amount) {
    var valid_cups = Object.values(Cups).slice(0, 4);
    valid_cups.push(...game.specialCups.map(e => e.constructor));

    for (var i = 0; i < amount; i ++) {
      this.hand.push(new valid_cups[Math.floor(Math.random() * valid_cups.length)](game.mainclass, this));
    }

    return "Vous avez pioché " + amount + " tasses";
  }

  sendHand(game, message = "") {
    this.user.send(
      new MessageEmbed()
      .setTitle("[MONTPARTASSE] Votre main")
      .setDescription(message + "\n\n" + this.hand.map((e, i) => game.mainclass.NUMBER_EMOJIS[i] + " __" + e.emoji + " " + e.name + (e.description? ":__ " + e.description: "__")).join("\n"))
      .setColor(game.mainclass.color)
    );
  }

  playCup(game, index) {
    if (game.lastPlayed === this.user.id && !game.mainclass.debug) {
      game.channel.send(
        new MessageEmbed()
        .setTitle("[MONTPARTASSE] Lancer raté")
        .setDescription("Vous venez de lancer une tasse, attendez que quelqu'un d'autre joue avant!")
        .setColor(game.mainclass.color)
      );
      return;
    }

    game.lastPlayed = this.user.id;

    var cup = this.hand.splice(index - 1, 1)[0];
    game.stack.unshift(cup);
    var effect_return = "";
    if (cup.effect) effect_return = cup.effect(game);

    game.sendStack("Tasse de " + this.user.username, effect_return);

    var message = "";
    if (!this.hand.length) message = this.draw(game, 5);
    this.sendHand(game, message);

    game.checkStackEnd(this);
  }
}

module.exports = exports = Player;
