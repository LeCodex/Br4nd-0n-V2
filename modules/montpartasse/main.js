const {MessageEmbed} = require('discord.js');
const {DateTime} = require('luxon');
const {Base} = require(module.parent.path + "/base/main.js");
const Game = require("./game.js");
const Player = require("./player.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Montpartasse";
		this.description = "S'amuse à empiler des tasses de toutes les couleurs";
    this.help = {
      "": "Reçoit une main ou voit sa propre main",
      "<nombre ou emoji>": "Joue une tasse",
      "rank": "Envoies le classement de la partie",
      "show": "Redescends le message d'info de la partie"
    };
    this.command_text = "montpartasse";
    this.color = 0xFF69B4;

    var object = this.load("games", { games : {}, debug: false });
    this.games = {};
    for (var [channel_id, object] of Object.entries(object.games)) {
      this.games[channel_id] = new Game(this)
      this.games[channel_id].reload(object);
    }
    this.debug = object.debug;

    var emojis = this.client.emojis.cache;
    this.COLOR_EMOJIS = {
      blue: (emojis.get("472452877391233025") || "🔵").toString() ,
      orange: (emojis.get("472452943950643210") || "🟠").toString(),
      purple: (emojis.get("472453014020685824") || "🟣").toString(),
      green: (emojis.get("472453002238754857") || "🟢").toString(),
      special: (emojis.get("472452927802310676") || "⚪").toString(),
      all: (emojis.get("666367471648768029") || "🌈").toString()
    };
  }

  getRankEmoji(rank) {
    if (rank < 4) return ["🥇", "🥈", "🥉"][rank - 1];
    return "🏅";
  }

  command(message, args, kwargs) {
    if (this.games[message.channel.id]) {
      var game = this.games[message.channel.id]
      if (game.paused) return;

      var now = DateTime.local().setZone("Europe/Paris");
      if (game.lastTimestamp.get('hour') < 12 && now.get('hour') >= 12 || game.lastTimestamp.get('hour') >= 12 && now.get('hour') < 12 || game.lastTimestamp.get('day') != now.get('day')) game.refill();
      game.lastTimestamp = DateTime.local().setZone("Europe/Paris");

      if (!game.players[message.author.id]) {
        game.players[message.author.id] = new Player(message.author, game);
        game.save();
      }

      var player = game.players[message.author.id];
      if (args.length) {
        if (!player.hand.length) {
          message.author.send("Votre main est vide");
        } else {
          if (player.hand.map(e => e.emoji).indexOf(args[0]) != -1) {
            player.playCup(game, player.hand.map(e => e.emoji).indexOf(args[0]) + 1);
          } else if (!isNaN(Number(args[0]))) {
            var index = Number(args[0]);
            if (index > 0 && index <= player.hand.length) {
              player.playCup(game, index);
            } else {
              message.author.send("Index invalide");
            }
          } else {
            message.author.send("Vous n'avez pas cette tasse dans votre main");
          }
        }
      } else {
        game.players[message.author.id].handMessage = null;
        game.players[message.author.id].sendHand(game);
      }
    }

    message.delete();
  }

  com_rank(message, args, kwargs) {
    if (this.games[message.channel.id]) {
      var game = this.games[message.channel.id];
      var sorted = Object.values(game.players).sort((a, b) => b.score - a.score);

      message.reply(
        new MessageEmbed()
        .setTitle("[MONTPARTASSE] Classement")
        .setColor(this.color)
        .addField("Joueurs", sorted.reduce((buffer, e) => {
          if (e.score < buffer.lastScore) {
            buffer.lastScore = e.score;
            buffer.rank++;
          }
          buffer.message += this.getRankEmoji(buffer.rank) + " **" + buffer.rank + ".** " + e.user.toString() + "\n";
          return buffer;
        }, {message: "", rank: 0, lastScore: Infinity}).message, true)
        .addField("Scores", sorted.map(e => e.score + " " + this.COLOR_EMOJIS.special).join("\n"), true)
      )
    }
  }

  com_show(message, args, kwargs) {
    if (this.games[message.channel.id]) {
      var game = this.games[message.channel.id];
      if (game.stackMessage) {
        game.stackMessage.delete();
        game.stackMessage = null;
        game.sendStack("Tasse de " + game.players[game.lastPlayed].user.username).then(() => game.save());
      }
    }
  }

  com_start(message, args, kwargs) {
    if (message.author.id === process.env.ADMIN) {
      if (this.games[message.channel.id]) {
        this.games[message.channel.id].paused = false;
        message.reply("Unpaused");
      } else {
        this.games[message.channel.id] = new Game(this, message);
      };
    };
  }

  com_stop(message, args, kwargs) {
    if (message.author.id === process.env.ADMIN) {
      if (this.games[message.channel.id]) {
        this.games[message.channel.id].paused = true;
        message.reply("Paused");
      };
    };
  }

  com_delete(message, args, kwargs) {
    if (message.author.id === process.env.ADMIN) {
      if (this.games[message.channel.id]) {
        this.games[message.channel.id].delete_save();
        delete this.games[message.channel.id];
        message.reply("Deleted");
      };
    };
  }

  com_refill(message, args, kwargs) {
    if (message.author.id === process.env.ADMIN) {
      if (this.games[message.channel.id]) {
        this.games[message.channel.id].refill();
        this.games[message.channel.id].lastTimestamp = DateTime.local().setZone("Europe/Paris");
        message.reply("Refilled");
      };
    }
  }

  com_enable(message, args, kwargs) {
    if (message.author.id === process.env.ADMIN) {
      if (this.games[message.channel.id]) {
        this.games[message.channel.id].enabled.push(...args.slice(1).filter(e => !this.games[message.channel.id].enabled.includes(e)));
        this.games[message.channel.id].save();
        message.reply("Enabled: "+ this.games[message.channel.id].enabled);
      };
    }
  }

  com_newStack(message, args, kwargs) {
    if (message.author.id === process.env.ADMIN) {
      if (this.games[message.channel.id]) {
        this.games[message.channel.id].needRefill = true;
        this.games[message.channel.id].newStack();
      };
    }
  }

  com_disable(message, args, kwargs) {
    if (message.author.id === process.env.ADMIN) {
      if (this.games[message.channel.id]) {
        for (var cup of args.slice(1)) {
          if (this.games[message.channel.id].enabled.includes(cup)) this.games[message.channel.id].enabled.splice(this.games[message.channel.id].enabled.indexOf(cup), 1);
        }
        this.games[message.channel.id].save();
        message.reply("Disabled: " + this.games[message.channel.id].enabled);
      };
    }
  }

  com_debug(message, args, kwargs) {
    if (message.author.id === process.env.ADMIN) {
      this.debug = !this.debug
      var object = this.load("games");
      object.debug = this.debug;
      this.save("games", object);
      message.reply(this.debug);
    }
  }
}

module.exports = exports = {MainClass}
