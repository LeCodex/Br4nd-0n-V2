const {Client, MessageEmbed} = require('discord.js');
const client = new Client();
const {MongoClient} = require("mongodb");

require('dotenv').config();
require('toml-require').install();

const fs = require('fs');
const toml = require('toml');
const concat = require('concat-stream');

client.mongo = new MongoClient(process.env.MONGO_DB_URL, { useUnifiedTopology: true });
client.config = require("./config.toml");
client.modules = {};
client.path = module.path;

async function loadModules() {
  console.log("MongoDB connected");

  try {
    const files = await fs.promises.readdir('./modules');
    for (const file of files) {
      const path = './modules/' + file
      const stat = await fs.promises.stat(path);

      if (stat.isDirectory()) {
        const mainfile = require(path + '/main.js');
        const mod = new mainfile.MainClass(client);
        client.modules[mod.command_text] = mod;
        console.log("Loaded module " + mod.name + " (" + mod.description + "), command text: " + process.env.PREFIX + mod.command_text + "");
      }
    }
  } catch(e) {
      console.error("Failed to load modules: ", e);
  }
}

client.on('ready', () => {
  if (client.mongo.isConnected()) {
    loadModules();
  } else {
    client.mongo.connect(err => {
      if (err) {
        console.error(err);
        return
      }
      loadModules();
    });
  }
});

client.on('message', message => {
  if (!message.author.bot && message.guild) {
    Object.values(client.modules).forEach((element) => {
      try {
        element.on_message(message);
      } catch(e) {
        client.error(message.channel, element.name, e);
      }
    });
  }
});

client.error = function(channel, name, e) {
  console.error("Error caused by " + name + " module: ", e);
  channel.send(new MessageEmbed()
    .setTitle("Error caused by " + name + " module")
    .setColor(0xff0000)
    .setDescription("```js\n" + e.stack + "```")
    .setFooter("This message will be deleted in one minute")
  ).then(message => {
    message.delete({ timeout: 60000 });
  });
}

client.login(process.env.BOT_TOKEN).catch(console.error);

const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('ok');
});
server.listen(3000);
