var {MessageEmbed} = require('discord.js');

class StatLogic {
  constructor(mainclass, author, scoreboard, message, embed, temporary) {
    this.mainclass = mainclass;
    this.author = author;
    this.scoreboard = scoreboard;

    this.resetScoreboardEmbed(message, embed, temporary);
  }

  resetScoreboardEmbed(message = null, embed = null, temporary = false) {
    var description = "📄 - Only show the scoreboard.\n🖋 - Change the emoji of the scoreboard.\n📩 - Enter scores.\n🗑️ - Delete this scoreboard."
    var reply = true;

    if (!message) {
      message = this.message;
      embed = this.message.embeds[0];
      reply = false;
    }

    embed.spliceFields(0, embed.fields.length);
    if (!Object.keys(this.scoreboard.scores).length || !this.scoreboard.criterias.length) {
      embed.addField("❌ No players or no criterias", "Enter a score using 📩", true);
    } else {
      var players = [];
      var criterias = {};

      this.scoreboard.criterias.forEach((element) => {
        criterias[element] = [];
      });

      for (var [key, value] of Object.entries(this.scoreboard.scores)) {
        players.push(message.guild.members.cache.get(key).toString());
        for (var [k, v] of Object.entries(value)) {
          criterias[k].push(v);
        }
        for (var k of Object.keys(criterias)) {
          if (!value[k]) criterias[k].push(0);
        }
      }

      embed.addField("Players", players.join("\n"), true);
      for (var [key, value] of Object.entries(criterias)) {
        embed.addField(key, value.join("\n"), true);
      };
    }
    if (!temporary) embed.setDescription(description);

    (() => reply ? message.reply(embed) : this.message.edit(embed))()
      .then(m => {
        if (!temporary) {
          this.message = m;
          this.resetScoreboardReactions();
        } else {
          delete this.mainclass.statLogics[this.author.id];
        }
      });
  }

  resetScoreboardReactions() {
    var emojiList = ["📄", "🖋", "📩", "🗑️"];
    this.message.reactions.removeAll()
      .then(async () => {for (var r of emojiList) await this.message.react(r)})
      .then(() => this.message.awaitReactions((reaction, user) => emojiList.includes(reaction.emoji.name) && user.id === this.author.id, { max: 1 }))
      .then(c => this.processScoreboardChoice(c))
      .catch(e => this.client.error(this.message.channel, "Stats", e));
  }

  processScoreboardChoice(collection) {
    var embed = this.message.embeds[0];
    this.message.reactions.removeAll();

    switch(collection.firstKey()) {
      case "📄":
        this.close();
        break;
      case "🖋":
        embed.setDescription("🖋 __React with the emoji you want to set as this scoreboard's emoji.__");

        this.message.edit(embed)
          .then(m => m.awaitReactions((reaction, user) => user.id === this.author.id, { max:1 }))
          .then(c => {
            this.scoreboard.emoji = c.first().emoji.toString();
            this.mainclass.save("stats", this.mainclass.stats);
            this.resetScoreboardEmbed();
          })
          .catch(e => this.client.error(this.message.channel, "Stats", e));
        break;
      case "📩":
        var description = "";
        var numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
        this.scoreboard.criterias.forEach((element, i) => {
          description += "\n • " + numberEmojis[i] + " " + element;
        });

        numberEmojis.splice(this.scoreboard.criterias.length);
        if (this.scoreboard.criterias.length < 10) {
          numberEmojis.push("🔖");
          description += "\n • 🔖 Create a new criteria";
        }

        embed.setDescription("📩 __Choose a criteria:__\n" + description);
        this.message.edit(embed)
          .then(async m => {for (var r of numberEmojis) await m.react(r); return m})
          .then(m => m.awaitReactions((reaction, user) => numberEmojis.includes(reaction.emoji.name) && user.id === this.author.id, { max:1 }))
          .then(rc => {
            this.message.reactions.removeAll();
            if (rc.has("🔖")) {
              embed.setDescription("🔖 Type the name of the new criteria.");
              this.message.edit(embed)
                .then(() => this.message.channel.awaitMessages(m => m.author.id === this.author.id, { max:1 }))
                .then(mc => {
                  var message = mc.first();
                  var criteria = message.content.split(" ").map(e => e.substr(0, 1).toUpperCase() + e.substr(1).toLowerCase()).join(" ");
                  message.delete();
                  this.scoreboard.criterias.push(criteria);
                  this.mainclass.save("stats", this.mainclass.stats);
                  this.chooseCriteria(criteria);
                })
                .catch(e => this.client.error(this.message.channel, "Stats", e));
            } else {
              this.chooseCriteria(this.scoreboard.criterias[numberEmojis.indexOf(rc.firstKey())]);
            }
          })
          .catch(e => this.client.error(this.message.channel, "Stats", e));
        break;
      case "🗑️":
        embed.setDescription("🗑️ __Do you really want to delete this scoreboard?__");

        this.message.edit(embed)
          .then(async m => {for (var r of ["❎", "✅"]) await m.react(r); return m})
          .then(m => m.awaitReactions((reaction, user) => ["❎", "✅"].includes(reaction.emoji.name) && user.id === this.author.id, { max:1 }))
          .then(c => {
            if (c.has("✅")) {
              embed.spliceFields(0, embed.fields.length);
              embed.setDescription("🗑️ Scoreboard deleted.")
              embed.setFooter("This message will be deleted in 10 seconds.")
              this.message.edit(embed)
                .then(() => this.message.reactions.removeAll())
                .then(() => {
                  this.message.delete({ timeout: 10000 });
                  delete this.mainclass.stats[this.message.guild.id][this.scoreboard.name];
                  this.mainclass.save("stats", this.mainclass.stats);
                  delete this.mainclass.statLogics[this.author.id];
                });
            } else {
              this.resetScoreboardEmbed();
            }
          })
          .catch(e => this.client.error(this.message.channel, "Stats", e));
        break;
    }
  }

  chooseCriteria(criteria) {
    var embed = this.message.embeds[0];

    embed.setDescription("📩 Choosen criteria: **" + criteria + "**\n🏅 __Mention all affected players.__");
    this.message.edit(embed)
      .then(m => m.channel.awaitMessages(m => m.author.id === this.author.id, { max:1 }))
      .then(mc => {
        var players = [];
        var message = mc.first();
        var mentions = message.mentions.users;
        mentions.array().forEach((element, i) => {
          players.push(element.id);
          if (!this.scoreboard.scores[element.id]) this.scoreboard.scores[element.id] = {};
        });
        message.delete();

        this.mainclass.save("stats", this.mainclass.stats);
        this.choosePlayers(criteria, players);
      })
      .catch(e => this.client.error(this.message.channel, "Stats", e));
  }

  choosePlayers(criteria, players) {
    var embed = this.message.embeds[0];

    embed.setDescription("📩 Choosen criteria: **" + criteria + "**\n🏅 Choosen players: **" + players.map(e => this.message.guild.members.cache.get(e).toString()).join(", ") + "**\n🔢 __Type the amount to add the the scores (number)__");
    this.message.edit(embed)
      .then(m => m.channel.awaitMessages(m => m.author.id === this.author.id, { max:1 }))
      .then(mc => {
        var message = mc.first();
        var amount = Number(message.content);
        message.delete();

        if (isNaN(amount)) {
          this.author.send("The amount must be a valid number. Use `.` for decimal point.")
          this.choosePlayers(criteria, players);
        } else {
          players.forEach((element, i) => {
            if (!this.scoreboard.scores[element][criteria]) this.scoreboard.scores[element][criteria] = 0;
            this.scoreboard.scores[element][criteria] += amount;
          });

          this.mainclass.save("stats", this.mainclass.stats);
          this.resetScoreboardEmbed();
        }
      })
      .catch(e => this.client.error(this.message.channel, "Stats", e));
  }

  close() {
    var embed = this.message.embeds[0];

    embed.setDescription("");
    this.message.reactions.removeAll();
    return this.message.edit(embed).then(() => delete this.mainclass.statLogics[this.author.id]);
  }
}

module.exports = exports = StatLogic;
