const {MessageEmbed} = require('discord.js');
const {Base} = require(module.parent.path + "/base/main.js");
const Game = require("./game.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Petri";
		this.description = "A simple strategy game";
		this.help = {
			"create": "Creates a new game",
			"show": "Sends the game message again",
			"rules": "Sends the rules",
			"config": "Changes the settings of the game with arguments <name of setting>=<new value>. Each setting will have conditions for its accepted values"
		};
		this.commandText = "petri";
		this.color = 0x00FFBF;
		// this.pseudo_auth = [];

		this.games = {};
		this.ready = true;
		this.debug = false;
		// this.load("games", { games : {}, debug: false }).then(object => {
		// 	for (var [channel_id, object] of Object.entries(object.games)) {
		// 		this.games[channel_id] = new Game(this)
		// 		this.games[channel_id].reload(object);
		// 	}
		// 	this.debug = object.debug;
		// 	this.ready = true;
		// });
	}

	command(message, args, kwargs, flags) {
		this.com_rules(message, args, kwargs, flags);
	}

	com_create(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			message.reply("Il y a déjà une partie en cours dans ce salon");
		} else {
			var game = this.games[message.channel.id] = new Game(this, message);
		}
	}

	com_show(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			if (game.gameMessage) {
				this.gameMessage.delete();
				this.gameMessage = null;
			}
			game.sendInfo();
		}
	}

	com_start(message, args, kwargs, flags) {
		if (this.authorize(message, this.pseudo_auth)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].paused = false;
				//this.games[message.channel.id].setupTimeout(false);
				message.reply("Unpaused");
			} else {
				this.games[message.channel.id] = new Game(this, message);
			};
		};
	}

	com_rules(message, args, kwargs, flags) {
		message.reply(
			new MessageEmbed()
			.setTitle(":small_orange_diamond: Règles de Petri :small_orange_diamond:")
			.setDescription(`
**:small_blue_diamond: But du jeu : :small_blue_diamond:**
Chaque joueur commence avec une troupe à un endroit aléatoire de la carte de 10x10 au début de la partie.
Le gagnant est le joueur qui est le dernier avec des troupes encore vivantes, ou bien qui arrive à contrôler 50% de la carte.
Après 40 tours de table complets (manche) sans qu'un gagnant ne soit déterminé, le joueur avec le plus de troupes gagne.

**:small_blue_diamond: Déroulement d’un tour : :small_blue_diamond:**
- Le joueur choisit une direction
- Toutes ses troupes essaient de se répliquer dans cette direction:
--- Si la case dans cette direction est vide, une nouvelle troupe de sa couleur est créée
--- Si la case est occupée par une troupe alliée, rien ne se passe
--- Si la case est occupée par une troupe ennemie, un combat se déclenche entre cette troupe et celle qui essaie de se répliquer

**:small_blue_diamond: Les combats : :small_blue_diamond:**
Pour déterminer qui gagne le combat, il suffit de regarder le nombre de troupes alliées se trouvant en une ligne derrière les deux troupes:
- Si l'attaquant en a le plus, il se réplique sur le défenseur
- Si le défenseur en a le plus, rien ne se passe
- S'il y a égalité, le défenseur est tué mais l'attaquant ne se réplique pas`)
			.setColor(this.color)
		)
	}

	com_debug(message, args, kwargs, flags) {
		if (message.author.id === process.env.ADMIN) {
			this.debug = !this.debug
			// this.load("games").then(object =>{
			// 	object.debug = this.debug;
			// 	this.save("games", object);
			// 	message.reply(this.debug);
			// });
		}
	}

	com_config(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];

			if (!game.players[message.author.id]) return;

			for (var key in kwargs) {
				if (game.settings[key] && game.settingsConditions[key](kwargs[key])) {
					game.settings[key] = Number(kwargs[key]);
				}
			}
			message.reply("Settings: ```" + Object.keys(game.settings).map(e => "- " + e + ": " + game.settings[e]).join("\n") + "```");
		}
	}

	com_set(message, args, kwargs, flags) {
		if (message.author.id === process.env.ADMIN) {
			if (this.games[message.channel.id]) {
				var game = this.games[message.channel.id];
				var user = this.client.getUserFromMention(args[1]);

				if (!game.players[user.id]) {
					game.players[user.id] = new Player(user, game);
				}

				var player = game.players[user.id];
				Object.keys(kwargs).forEach(key => {
					player[key] = kwargs[key];
				});

				game.save();
				message.reply("Set " + player.user.username + ": " + Object.keys(kwargs).map(k => k + "=" + player[k]).join(", "));
			};
		}
	}
}

module.exports = exports = { MainClass }
