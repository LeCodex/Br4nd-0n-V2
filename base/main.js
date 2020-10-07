const fs = require('fs');
const {MessageEmbed} = require('discord.js');

class Base {
  /*
    constructor(client)
    Instantiates the module class.

    @param {Client} client The Discord.js bot client
  */
  constructor(client) {
    this.client = client;
    this.name = "[TODO] Add name";
    this.description = "[TODO] Add description";
    this.help = {
      "": "[TODO] Add help"
    }
    this.command_text = "";
    this.color = 0xffffff;
    this.auth = [];

    this.databaseEventBuckets = [];
  }

  get NUMBER_EMOJIS() {
    return ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
  }

  _testForAuth(message) {
    var args = message.content.split(" ").slice(1);
    var kwargs = {};
    for (var index = args.length - 1; index >= 0; index--) {
      var element = args[index];
      if (element.search(/\S+=\S+/) != -1) {
        var key = element.match(/\S+=/)[0];
        var value = element.match(/=\S+/)[0];
        kwargs[key.substring(0, key.length - 1)] = value.substring(1);
        args.splice(index, 1);
      }
    };

    if (this.auth.length == 0 || this.auth.includes(message.author.id)) {
      this._executeCommand(message, args, kwargs);
    } else {
      message.reply("You are not authorized to run this command.");
    }
  }

  _executeCommand(message, args, kwargs) {
    if (this["com_" + args[0]]) {
      this["com_" + args[0]](message, args, kwargs);
    } else {
      this.command(message, args, kwargs);
    }
  }

  on_message(message) {
    if (message.content.startsWith(process.env.PREFIX) && message.content.split(" ")[0] === process.env.PREFIX + this.command_text) {
      this._testForAuth(message);
    }
  }

  async sendChoice(channel, content, emojis, confirmation_emoji, collect_function, remove_function, confirmation_condition, end_function, options = {}) {
    if (!remove_function) remove_function = collect_function;

    return await channel.send(content)
      .then(async m => {for (var r of emojis) await m.react(r); return m})
      .then(m => {
        emojis.push(confirmation_emoji);
        var collection = m.createReactionCollector((reaction, user) => emojis.includes(reaction.emoji.name) && !user.bot, { dispose: true });

        function updateConfirmationEmoji(base, can_confirm) {
          if (can_confirm) {
            m.react(confirmation_emoji);
          } else {
            var r = m.reactions.cache.get(confirmation_emoji);
            if (r) r.users.remove(base.client.user);
          }
        };

        collection.on('collect', (reaction, user) => {
          if (reaction.emoji.name === confirmation_emoji) {
            if (confirmation_condition(reaction, user) && m.reactions.cache.get(confirmation_emoji).me) collection.stop();
          } else {
            var can_confirm = collect_function(collection, reaction, user);
            updateConfirmationEmoji(this, can_confirm);
          }
        });

        collection.on('remove', (reaction, user) => {
          if (reaction.emoji.name != confirmation_emoji) {
            var can_confirm = remove_function(collection, reaction, user);
            updateConfirmationEmoji(this, can_confirm);
          }
        });

        collection.on('end', (collected) => {
          if (!options.dontDelete) collection.message.delete();
          end_function(collection, collected);
        });

        return m;
      })
      .catch(e => this.client.error(channel, this.name, e));
  }

  _getSavePath() {
    return this.client.path + "\\saves\\" + this.name.toLowerCase() + "\\";
  }

  async saveExists(name) {
    const ret = await this.client.mongo.db(this.name.toLowerCase()).listCollections({name: name}).hasNext();
    console.log(ret);
    return ret;
  }

  save(name, data) {
    const collection = this.client.mongo.db(this.name.toLowerCase()).collection(name);
    collection.replaceOne({}, data, { upsert: true });
    console.log(this.name + " Database Saved");

    // var string = JSON.stringify(data);
    // if (!fs.existsSync(this._getSavePath())) fs.mkdirSync(this._getSavePath());
    // fs.writeFile(this._getSavePath() + name + ".json", string, err => {if (err != null) console.log(err)});
    // console.log(this.name + " JSON Data Saved");
  }

  async load(name, fallback) {
    if (!await this.saveExists(name)) {
      this.save(name, fallback);
      return fallback;
    }
    var ret = await this.client.mongo.db(this.name.toLowerCase()).collection(name).findOne();
    return ret;

    // var string = fs.readFileSync(this._getSavePath() + name + ".json");
    // return JSON.parse(string);
  }
}

module.exports = exports = {Base}
