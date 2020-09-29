const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
  constructor(client) {
    super(client);
    this.name = "Rules";
    this.description = "Aloows for rule verification by asking for a word";
    this.help = {
      "": "Shows current parameters",
      "role <role mention>": "Sets the role to be attributed",
      "channel <channel mention>": "Sets the channel in which the word must be typed",
      "words <word list>": "Set all acceptable words"
    };
    this.command_text = "rules";
    this.color = 0xffff00;
    this.auth = [ process.env.ADMIN ];

    this.data = this.load("data", {});
  }

  check_if_data_exists(message) {
    if (!this.data[message.guild.id]) {
      this.data[message.guild.id] = {
        role: undefined,
        channel: undefined,
        words: undefined
      }
      this.save("data", this.data);
    }
  }

  command(message, args, kwargs) {
    this.check_if_data_exists(message);
    var channel = this.client.channels.cache.get(this.data[message.guild.id].channel);
    var role = message.guild.roles.cache.get(this.data[message.guild.id].role);

    message.reply("The user must type " + this.data[message.guild.id].words + " in " + (channel ? channel.toString() : channel) + " to get the role " + (role ? role.toString() : role));
  }

  com_role(message, args, kwargs) {
    this.check_if_data_exists(message);

    if (!message.mentions.roles.array().length) {
      message.reply("Missing role mention");
      return;
    }

    this.data[message.guild.id].role = message.mentions.roles.first().id;
    message.reply("Role is now set to " + message.mentions.roles.first().toString());

    this.save("data", this.data);
  }

  com_channel(message, args, kwargs) {
    this.check_if_data_exists(message);

    if (!message.mentions.channels.array().length) {
      message.reply("Missing channel mention");
    } else {
      this.data[message.guild.id].channel = message.mentions.channels.first().id;
      message.reply("Channel is now set to " + message.mentions.channels.first().toString());

      this.save("data", this.data);
    }
  }

  com_words(message, args, kwargs) {
    this.check_if_data_exists(message);

    if (args.length == 1) {
      message.reply("Missing words");
    } else {
      this.data[message.guild.id].words = args.slice(1);
      message.reply("Words are now set to " + this.data[message.guild.id].words);

      this.save("data", this.data);
    }

  }

  on_message(message) {
    super.on_message(message);

    if (!message.guild) return ;
    if (!this.data[message.guild.id]) return;

    var data = this.data[message.guild.id];
    if (!data.role || !data.channel || !data.words) return;

    if (message.channel.id == data.channel) {
      if (data.words.includes(message.content)) message.member.roles.add(data.role);
      message.delete();
    }
  }
}

module.exports = exports = {MainClass}
