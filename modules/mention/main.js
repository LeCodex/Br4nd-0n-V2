const {MessageEmbed, MessageMentions} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
  constructor(client) {
    super(client);
    this.name = "Mention";
    this.description = "Redirects mentions of the bot to other modules";
    this.help = {
      "": "Sends the current module the mentions calls",
      "<module>": "Sets the module the mentions will call"
    };
    this.command_text = "mention";
    this.color = 0xfffffe;
    this.auth = [ process.env.ADMIN ];

    this.module = this.load("module", "ping");
  }

  command(message, args, kwargs) {
    if (args.length) {
      this.module = args[0];
      this.save("module", this.module);
      message.reply("The linked command is now: `" + process.env.PREFIX + this.module + "`")
    } else {
      message.reply("The linked command is currently: `" + process.env.PREFIX + this.module + "`");
    }
  }

  on_message(message) {
    super.on_message(message);

    if (!message.author.bot) {
      var index = message.content.search(MessageMentions.USERS_PATTERN);
      if (index == 0 && message.mentions.users.first().id == this.client.user.id && this.client.modules[this.module]) {
        this.client.modules[this.module]._testForAuth(message);
      }
    }
  }
}

module.exports = exports = {MainClass};
