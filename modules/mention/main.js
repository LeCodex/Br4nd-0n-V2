const {MessageMentions} = require('discord.js');
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
    this.color = 0x222222;
    this.auth = [ process.env.ADMIN ];

    this.moduleList = this.load("modules", {});
  }

  command(message, args, kwargs) {
    if (args.length) {
      this.moduleList[message.guild.id] = args[0];
      this.save("modules", this.moduleList);
      message.reply("The linked command is now: `" + process.env.PREFIX + this.moduleList[message.guild.id] + "`")
    } else {
      if (!this.moduleList[message.guild.id]) {
        this.moduleList[message.guild.id] = "ping";
        this.save("modules", this.moduleList);
      }
      message.reply("The linked command is currently: `" + process.env.PREFIX + this.moduleList[message.guild.id] + "`");
    }
  }

  on_message(message) {
    super.on_message(message);

    var index = message.content.search(MessageMentions.USERS_PATTERN);
    if (!this.moduleList[message.guild.id]) {
      this.moduleList[message.guild.id] = "ping";
      this.save("modules", this.moduleList);
    }
    if (index == 0 && message.mentions.users.first().id == this.client.user.id && this.client.modules[this.moduleList[message.guild.id]]) {
      this.client.modules[this.moduleList[message.guild.id]]._testForAuth(message);
    }
  }
}

module.exports = exports = {MainClass};
