const fs = require('fs');

class Base {
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
  }

  _execCommand(message) {
    if (message.content.startsWith(this.client.config.prefix) && !message.author.bot) {
      var args = message.content.substring(this.client.config.prefix.length).split(" ");
      var cmd = args.shift();
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

      if (cmd == this.command_text) {
        if (this.auth.length == 0 || this.auth.includes(message.author.id)) {
          if (this["com_" + args[0]]) {
            this["com_" + args[0]](message, args, kwargs);
          } else {
            this.command(message, args, kwargs);
          }
        } else {
          message.reply("You are not authorized to run this command.");
        }
      }
    }
  }

  on_message(message) {
    this._execCommand(message);
  }

  _get_save_path() {
    return this.client.path + "\\saves\\" + this.name.toLowerCase() + "\\"
  };

  load(name) {
    var string = fs.readFileSync(this._get_save_path() + name + ".json");
    return JSON.parse(string);
  }

  save(name, data) {
    var string = JSON.stringify(data);
    if (!fs.existsSync(this._get_save_path())) fs.mkdirSync(this._get_save_path());
    fs.writeFile(this._get_save_path() + name + ".json", string, err => {if (err != null) console.log(err)});
    console.log(this.name + " Data Saved");
  }

  save_exists(name) {
    return fs.existsSync(this._get_save_path() + name + ".json");
  }
}

module.exports = exports = {Base}
