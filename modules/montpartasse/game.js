const {MessageEmbed} = require('discord.js');
const Cups = require('./cups.js');
const Player = require('./player.js');

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


class Game {
  constructor(mainclass, message) {
    this.mainclass = mainclass;
    this.client = mainclass.client;

    this.stack = [];
    this.nextStack = [];
    this.specialCups = [];
    this.players = {};
    this.lastPlayed = "";
    this.paused = false;
    this.stackMessage = null;
    this.needRefill = false;
    this.lastTimestamp = Date.now();

    if (message) {
      this.channel = message.channel;
      this.newStack();
    }
  }

  get COLOR_COUNT() {
    return 5;
  }

  reload(object) {
    this.deserialize(object);
  }

  newStack(description = "") {
    this.stackMessage = null;
    this.stack = [...this.nextStack];

    if (this.needRefill) {
      this.specialCups = [];
      var cups = shuffle(Object.keys(Cups).slice(4));

      for (var i = 0; i < 3; i ++) {
        this.specialCups.push(new Cups[cups.pop()](this, null));
      }
    }

    this.channel.send(
      new MessageEmbed()
      .setTitle("[MONTPARTASSE] Nouvelle pile")
      .setDescription(description + "La table est nettoyée, les morceaux jetés, et les points comptés. " + (this.needRefill ? "__**Les mains ont été de nouveau remplies! Voici les trois nouvelles tasses spéciales!**__" : "Que le jeu continue!"))
      .setColor(this.mainclass.color)
      .addField("Tasses spéciales", this.specialCups.map(e => "__" + e.emoji + " " + e.name + ":__ " + e.description).join("\n"))
    );

    this.save();
  }

  sendStack(info, description) {
    var content = new MessageEmbed()
      .setTitle("[MONTPARTASSE] " + info)
      .setDescription(this.stack.map(e => e.emoji + " " + e.player.user.toString()).join("\n") + "\n\n" + description)
      .setColor(this.mainclass.color)
      .addField("Tasses spéciales", this.specialCups.map(e => "__" + e.emoji + " " + e.name + ":__ " + e.description).join("\n"));

    if (this.stackMessage) {
      this.stackMessage.edit(content);
    } else {
      this.channel.send(content).then(m => {this.stackMessage = m;});
    }
  }

  checkStackEnd(player) {
    var color_sort = {};

    for (var cup of this.stack) {
      if (!color_sort[cup.color]) color_sort[cup.color] = 0;
      color_sort[cup.color] += 1;
    }

    var rainbow_count = color_sort["all"] ? color_sort["all"]: 0;
    if (color_sort["all"]) delete color_sort["all"];

    console.log(color_sort, rainbow_count);

    if (Object.keys(color_sort).length + rainbow_count == this.COLOR_COUNT) {
      this.endStack(player);
      return;
    }

    for (var amount of Object.values(color_sort)) {
      if (amount + rainbow_count == this.COLOR_COUNT) {
        this.endStack(player);
        return;
      }
    }

    this.save();
  }

  endStack(player) {
    this.nextStack = [];

    var description = "La pile s'est effrondée! Oh non!\n";
    var last_player_score_gain = this.stack.filter(e => e.player.user.id === player.user.id).length;
    player.score += last_player_score_gain;
    description += player.user.toString() + ", vous gagnez **" + last_player_score_gain + "** points (1 pour chaque tasse que vous avez joué). Les autres, vous gagnez 1 point pour chaque couleur que vous avez joué!\n\n"

    var played_colors = {}
    for (var player_id of Object.keys(this.players)) {
      if (player_id != player.user.id) {
        played_colors[player_id] = [];
        for (var cup of this.stack.filter(e => e.player.user.id === player_id)) {
          if (!played_colors[player_id].includes(cup.color) && cup.color != "all") played_colors[player_id].push(cup.color);
        }
      }
    }

    for (var [player_id, colors] of Object.entries(played_colors)) {
      if (colors.length > 0) {
        this.players[player_id].score += colors.length;
        description += this.players[player_id].user.toString() + " gagne **" + colors.length + (colors.length > 1 ? " points" : " point") + "** (" + colors.sort().map(e => this.mainclass.COLOR_EMOJIS[e]).join(", ") + ")\n";
      }
    }

    var trigger_returns = this.stack.reduce((buffer, cup, index) => {
      if (cup.stackEnd) return buffer += cup.stackEnd(this, player, index) + "\n";
      return buffer;
    }, "");

    this.newStack(description + (trigger_returns.length ? "\n" + trigger_returns : "") + "\n");
  }

  refillHands() {
    this.needRefill = true;

    for (var player of Object.values(this.players)) {
      if (5 - player.hand.length > 0) {
        var message = player.draw(this, 5 - player.hand.length);
        player.sendHand(this, message);
      }
    }
  }

  serialize() {
    var object = {
      channel: this.channel.id,
      players: {},
      stack: this.stack.map(e => {return {
        cup: e.constructor.name,
        player: e.player.user.id
      }}),
      specialCups: this.specialCups.map(e => e.constructor.name),
      lastPlayed: this.lastPlayed
    };

    for (var [k, e] of Object.entries(this.players)) {
      object.players[k] = {
        hand: e.hand.map(e => e.constructor.name),
        score: e.score,
        user: e.user.id
      }
    };

    return object;
  }

  deserialize(object) {
    this.channel = this.client.channels.cache.get(object.channel);
    this.players = {};
    this.specialCups = object.specialCups.map(e => new Cups[e](this.mainclass, null));
    this.lastPlayed = object.lastPlayed;

    for (var [k, e] of Object.entries(object.players)) {
      var p = new Player(this.client.users.cache.get(e.user), this, true);
      p.score = e.score;
      p.hand = e.hand.map(f => new Cups[f](this.mainclass, p));
      this.players[k] = p;
    };

    this.stack = object.stack.map(e => new Cups[e.cup](this.mainclass, this.players[e.player]));
  }

  save() {
    var object = this.mainclass.load("games");
    object.games[this.channel.id] = this.serialize();
    this.mainclass.save("games", object);
  }

  delete_save() {
    var object = this.mainclass.load("games");
    delete object.games[this.channel.id];
    this.mainclass.save("games", object);
  }
}

module.exports = exports = Game;
