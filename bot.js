const Discord = require('discord.js');
const client = new Discord.Client();

const _prefix = ";"

client.on('ready', () => {
  console.log('I am ready!');
});

client.on('message', message => {
  if (message.content.startsWith(_prefix)) {
    var args = message.content.substring(1).split(" ");
    var cmd = args.unshift();

    switch(cmd) {
      case "ping":
        message.reply('pong');
        break;
      default:
        message.reply('unknown command')
    }
  }
});

client.login(process.env.BOT_TOKEN);
