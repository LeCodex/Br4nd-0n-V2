const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");

class MainClass extends Base {
  constructor(client) {
    super(client);
    this.name = "Help";
    this.description = "Sends help messages or just shows all active modules";
    this.help = {
      "": "Sends a list of all active modules",
      "<module>": "Sends the help message of that module"
    };
    this.command_text = "help";
    this.color = 0x00ff00;
  }

  command(message, args, kwargs) {
    if (args.length) {
      var command_text = args.join(" ").toLowerCase();
      if (Object.keys(this.client.modules).includes(command_text)) {
        var mod = this.client.modules[command_text];
        var embed = new MessageEmbed().setTitle("[HELP] " + mod.name + " Module").setColor(mod.color).setDescription(mod.description);
        for (var [key, value] of Object.entries(mod.help)) {
          embed.addField("`" + process.env.PREFIX + mod.command_text + (key.length ? " " + key : "") + "`", value, false)
        };

        message.reply(embed);
      } else {
        message.reply(new MessageEmbed()
          .setTitle("[HELP] Unknown Module")
          .setDescription("The module you requested is either inactive or inexistant")
          .setColor(this.color));
      }
    } else {
      var embed = new MessageEmbed().setTitle("[HELP] Active modules").setColor(this.color);
      Object.values(this.client.modules).forEach((element) => {
        embed.addField(element.name + " (" + element.command_text + ")", element.description, true);
      });

      message.reply(embed);
    }
  }
}

module.exports = exports = {MainClass};
