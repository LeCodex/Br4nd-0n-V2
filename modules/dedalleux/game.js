const {MessageEmbed} = require('discord.js');
const {DateTime} = require('luxon');
const Player = require('./player.js');

function shuffle(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function getDist(start, end) {
	//console.log(start.x - end.x, start.y - end.y);
	return Math.sqrt((start.x - end.x) ** 2 + (start.y - end.y) ** 2);
}

function getRankEmoji(rank) {
	if (rank < 4) return ["🥇", "🥈", "🥉"][rank - 1];
	return "🏅";
}


class Game {
	constructor(mainclass, message) {
		this.mainclass = mainclass;
		this.client = mainclass.client;

		this.walls = [];
		this.board = [];
		this.players = {};
		this.path = [];
		this.paused = false;
		this.boardMessage = null;
		this.nextTimestamp = null;
		// this.enabled = Object.keys(Tiles).slice(1);
		this.turn = 1;
		this.pickedUp = 0;
		// this.maxBoards = 20;
		this.collector = null;
		this.timeout = null;
		this.clockwiseRotation = true;
		this.gamerules = {};
		this.waitDuration = {
			minutes: 0,
			hours: 1
		};
		this.pawn = {
			x: 0,
			y: 0
		};
		this.goal = {
			x: 10,
			y: 10
		};
		this.colors = Object.values(this.mainclass.colors);
		this.availableItems = ["🍅", "🥩", "🌶️", "🧅", "🥕", "🥑", "🥔", "🍯", "🌰", "🍍", "🌮", "🧀", "🍐", "🌭", "🥦", "🥓"];
		this.items = [];

		if (message) {
			this.channel = message.channel;
			this.start();
		}
	}

	async reload(object) {
		await this.parse(object);
		if (!this.boardMessage) {
			await this.sendBoard();
			this.save();
		}
		this.setupTimeout(false);
	}

	async start() {
		this.createWalls();
		this.generateBoard();
		this.path = this.aStar(this.pawn, this.goal);
		this.placeItems();
		await this.sendBoard();
		this.setupTimeout();

		this.save();
	}

	setupTimeout(newTurn = true) {
		if (this.timeout) clearTimeout(this.timeout);

		var now = DateTime.local();
		if (newTurn) {
			if (!this.nextTimestamp) this.nextTimestamp = DateTime.local();
			this.nextTimestamp = this.nextTimestamp.plus(this.waitDuration).set({ second: 0 });
			if (!this.waitDuration.minutes) this.nextTimestamp = this.nextTimestamp.set({ minute: 0 });
		}
		var time = this.nextTimestamp.toMillis() - now.toMillis();

		console.log(this.nextTimestamp, now, this.waitDuration, time);
		this.timeout = setTimeout(() => {this.nextTurn()}, time);
	}

	createWalls() {
		for (var i = 0; i < Math.pow(this.colors.length / 2, 2); i ++) {
			var wall = {
				color: i % (this.colors.length / 2),
				direction: Math.floor(Math.random() * 4)
			};

			this.walls.unshift(wall);
		}

		this.walls = shuffle(this.walls);
		this.walls.forEach((element, i) => {
			var d = Math.round(Math.cos(element.direction * Math.PI / 2)) + this.colors.length / 2 * Math.round(Math.sin(element.direction * Math.PI / 2));

			if (i + d >= 0 && i + d < this.walls.length) {
				var neighbor = this.walls[i + d];
				var tries = 0;
				while ((neighbor.direction + 2) % 4 === element.direction && tries < 4) {
					element.direction = Math.floor(Math.random() * 4);
					tries ++;
				}
			}
		});

	}

	generateBoard() {
		this.board = [];
		for (var y = 0; y < this.colors.length + 1; y ++) {
			this.board.push([]);
			for (var x = 0; x < this.colors.length + 1; x ++) {
				this.board[y].push(-1);
			}
		}

		this.walls.forEach((element, i) => {
			var cy = Math.floor(i / (this.colors.length / 2)) * 2 + 1, cx = (i % (this.colors.length / 2)) * 2 + 1;
			this.board[cy][cx] = element.color + this.colors.length / 2;
			for (var d = 0; d < 1; d ++) {
				var ry = Math.round(cy + Math.sin((element.direction + d) * Math.PI / 2)), rx = Math.round(cx + Math.cos((element.direction + d) * Math.PI / 2));
				this.board[ry][rx] = element.color;
			}
		});
	}

	placeItems() {
		this.items = [];
		var borderItemsCount = 0;

		this.availableItems.forEach((element, i) => {
			var x, y;
			do {
				x = Math.floor(Math.random() * (this.board.length + 1) / 2) * 2;
				y = Math.floor(Math.random() * (this.board.length + 1) / 2) * 2;
			} while (
				this.items.find(e => e.x === x && e.y === y) ||
				x === y === 0 || x === y === this.board.length - 1 || x === 0 && y === this.board.length - 1 || x === this.board.length - 1 && y === 0 ||
				(x === 0 || y === 0 || x === this.board.length - 1 || y === this.board.length - 1) && borderItemsCount >= 4
			);

			this.items.push({
				x: x,
				y: y,
				item: element
			});

			if (x === 0 || y === 0 || x === this.board.length - 1 || y === this.board.length - 1) borderItemsCount ++;
		});
	}

	async sendBoard() {
		var embed = new MessageEmbed()
			.setTitle(this.mainclass.name + " • Sens de rotation des murs: " + (this.clockwiseRotation ? "🔁" : "🔄"))
			.setFooter("Tour #" + this.turn + " • Nombre d'ingrédients ramassés: " + this.pickedUp)
			.setColor(this.mainclass.color)

		if (Object.values(this.players).length) {
			var sorted = Object.values(this.players).sort((a, b) => b.score - a.score);
			var roundValue = Object.keys(this.players).length - sorted.reduce((acc, e) => e.gainedOnePoint ? acc + 1 : acc, -1);
			var hiddenItem = this.items.find(g => this.goal.x === g.x && this.goal.y === g.y);

			embed.addField(
				"Joueurs" + (hiddenItem ? " • Ingrédient caché par la cible: " + hiddenItem.item: ""), // • Nombre de joueurs qui ont récupéré leur ingrédient: " + roundValue
				sorted.reduce((acc, e) => {
					if (e.score < acc.lastScore) {
						acc.lastScore = e.score;
						acc.lastIndex = e.index;
						acc.rank++;
					} else if (e.index < acc.lastIndex) {
						acc.lastIndex = e.index;
						acc.rank++;
					}
					acc.message += getRankEmoji(acc.rank) + " **" + acc.rank + ".** " + (e.user ? e.user.toString() : "Joueur non trouvé") + ": **" + e.score + "**" + (e.gainedOnePoint ? " (+" + roundValue + ")" : "") + "\n";
					return acc;
				}, {message: "", rank: 0, lastScore: Infinity, lastIndex: Infinity}).message
			);
		}

		var board = this.board.map((e, ty) =>
			e.map((f, tx) => {
				if (this.pawn.x === tx && this.pawn.y === ty) return this.mainclass.pawnEmoji.toString();
				if (this.goal.x === tx && this.goal.y === ty) return "🎯";

				var o = this.items.find(g => g.x === tx && g.y === ty);
				if (o) return o.item;

				if (this.path.filter(g => g.x === tx && g.y === ty).length) return "🔸";
				return f === -1 ? "⬛" : this.colors[f].toString();
			}).join("")
		).join("\n");

		//console.log(this.path);

		embed.setDescription(board);

		if (this.boardMessage) {
			var length = this.channel.messages.cache.keyArray().length
			if (length - this.channel.messages.cache.keyArray().indexOf(this.boardMessage.id) > 10) {
				this.deleteBoardMessage();
				this.boardMessage = await this.channel.send(embed);
				this.setupReactionCollector();
			} else {
				this.boardMessage.edit(embed);
			};
		} else {
			this.boardMessage = await this.channel.send(embed);
			this.setupReactionCollector();
		}
	}

	async setupReactionCollector() {
		this.clearReactionCollector();

		var emojis = this.colors.slice(this.colors.length / 2);
		for (var i = 0; i < emojis.length; i ++) {
			await this.boardMessage.react(emojis[i]);
		};

		this.collector = this.boardMessage.createReactionCollector((reaction, user) => (emojis.includes(reaction.emoji.name) || emojis.includes(reaction.emoji)) && !user.bot);

		this.collector.on('collect', (reaction, user) => {
			try {
				reaction.users.remove(user);
				
				if (this.paused) return;

				var now = DateTime.local().toMillis();
				if (this.nextTimestamp - now <= 30000) return;

				var player = this.players[user.id];

				if (player) {
					if (!player.turnedOnce) {
						player.turnedOnce = true;
						var index = this.colors.indexOf(reaction.emoji.name);
						if (index == -1) index = this.colors.indexOf(reaction.emoji);
						index -= this.colors.length / 2

						var moved = true;
						var turned = [];
						while (moved) {
							moved = false;
							for (var i = 0; i < this.walls.length; i ++) {
								var element = this.walls[i];

								if (element.color === index) {
									var shouldTurn = true;
									var newDir = (element.direction + (this.clockwiseRotation ? 1 : -1) + 4) % 4;
									var d = Math.round(Math.cos(newDir * Math.PI / 2)) + this.colors.length / 2 * Math.round(Math.sin(newDir * Math.PI / 2));

									if (i + d >= 0 && i + d < this.walls.length && !(d === -1 && i % (this.colors.length / 2) === 0) && !(d === 1 && (i + 1) % (this.colors.length / 2) === 0)) {
										var neighbor = this.walls[i + d];
										if ((neighbor.direction + 2) % 4 === newDir) shouldTurn = false;
									}

									if (shouldTurn && !turned.includes(i)) {
										turned.push(i);
										element.direction = newDir;
										moved = true;

										//console.log(turned);
									}
								}
							}
						}

						this.generateBoard();
						this.path = this.aStar(this.pawn, this.goal);
						this.sendBoard().then(() => { this.save(); });
					}
				}
			} catch (e) {
				this.client.error(this.channel, "Labyrinthe", e);
			}
		});
	}

	clearReactionCollector() {
		//if (this.boardMessage) this.boardMessage.reactions.removeAll();
		if (this.collector) this.collector.stop();
	}

	deleteBoardMessage() {
		if (this.boardMessage) {
			this.boardMessage.delete();
			this.boardMessage = null;
		}
		this.clearReactionCollector();
	}

	async nextTurn() {
		Object.values(this.players).forEach((element) => { element.turnedOnce = false; element.gainedOnePoint = false; });

		var winners = [];
		while ((this.pawn.x != this.goal.x || this.pawn.y != this.goal.y) && this.path.length) {
			this.pawn = this.path.shift();

			if (this.items.find(e => e.x === this.pawn.x && e.y === this.pawn.y)) this.pickedUp ++;
			Object.values(this.players).forEach((element) => { if (this.pawn.x === this.items[element.item].x && this.pawn.y === this.items[element.item].y) winners.push(element) });
		}

		for (var player of winners) {
			player.gainPoints(this, Object.keys(this.players).length - winners.length + 1);
		}

		do {
			this.goal.x = Math.floor(Math.random() * (this.board.length + 1) / 2) * 2;
			this.goal.y = Math.floor(Math.random() * (this.board.length + 1) / 2) * 2;

			//console.log("Tried " + this.goal.x + "/" + this.goal.y + ": " + getDist(this.pawn, this.goal) + "(" + this.pawn.x + "/" + this.pawn.y + " .. " + this.goal.x + "/" + this.goal.y + ")");
		} while (getDist(this.pawn, this.goal) < 7);

		this.path = this.aStar(this.pawn, this.goal);

		this.turn ++;

		this.clockwiseRotation = !this.clockwiseRotation;
		await this.sendBoard();

		this.setupTimeout(true);
		this.save();
	}

	aStar(start, goal) {
		var h = (n) => getDist(n, goal);

		function reconstructPath(cameFrom, current) {
			var totalPath = [current];
			while (cameFrom.has(current)) {
				current = cameFrom.get(current);
				totalPath.unshift(current);
			}

			return totalPath;
		}

		var openSet = [start];
		var closedSet = [];
		var cameFrom = new WeakMap();
		var gScore = new WeakMap();
		var fScore = new WeakMap();

		gScore.set(start, 0);
		fScore.set(start, h(start));

		while (openSet.length) {
			var current = openSet.reduce((acc, element) => fScore.get(element) < fScore.get(acc) ? element : acc);
			if (current.x === goal.x && current.y === goal.y) return reconstructPath(cameFrom, current);

			//console.log("Position: " + current.x + "/" + current.y)
			closedSet.push(current);
			openSet.splice(openSet.indexOf(current), 1);
			for (var r = 0; r < 4; r ++) {
				var dx = Math.round(Math.cos(r * Math.PI / 2));
				var dy = Math.round(Math.sin(r * Math.PI / 2));
				//console.log("Rotation " + r + ": " + dx + "/" + dy);

				if (current.x + dx >= 0 && current.x + dx < this.board.length && current.y + dy >= 0 && current.y + dy < this.board.length) {
					//console.log("Inbound");
					if (this.board[current.y + dy][current.x + dx] === -1) {
						//console.log("Testing " + (current.x + dx) + "/" + (current.y + dy) + " from " + current.x + "/" + current.y);
						var neighbor = {
							x: current.x + dx,
							y: current.y + dy
						};
						var tentative_gScore = gScore.get(current) + 1;
						if (tentative_gScore < (gScore.has(neighbor) ? gScore.get(neighbor) : Infinity)) {
							cameFrom.set(neighbor, current);
							gScore.set(neighbor, tentative_gScore);
							fScore.set(neighbor, gScore.get(neighbor) + h(neighbor));

							if (!openSet.find(e => e.x === neighbor.x && e.y === neighbor.y) && !closedSet.find(e => e.x === neighbor.x && e.y === neighbor.y)) openSet.push(neighbor);
						}
					}
				}
			}

			//console.log(openSet);
		}

		this.channel.stopTyping();
		return [start];
	}

	async resendMessage() {
		this.deleteBoardMessage();
		await this.sendBoard();
		this.save();
	}

	serialize() {
		var object = {
			channel: this.channel.id,
			players: {},
			boardMessage: this.boardMessage ? this.boardMessage.id : null,
			paused: this.paused,
			nextTimestamp: this.nextTimestamp.toMillis(),
			gamerules: this.gamerules,
			enabled: this.enabled,
			turn: this.turn,
			waitDuration: this.waitDuration,
			walls: this.walls,
			path: this.path,
			pickedUp: this.pickedUp,
			clockwiseRotation: this.clockwiseRotation,
			pawn: this.pawn,
			goal: this.goal,
			items: this.items
		};

		for (var [k, e] of Object.entries(this.players)) {
			object.players[k] = {
				score: Number(e.score),
				user: e.user.id,
				turnedOnce: e.turnedOnce,
				item: e.item,
				gainedOnePoint: e.gainedOnePoint,
				itemChannel: e.itemMessage ? e.itemMessage.channel.id : null,
				itemMessage: e.itemMessage ? e.itemMessage.id : null
			}
		}

		return object;
	}

	async parse(object) {
		this.channel = await this.client.channels.fetch(object.channel);
		this.players = {};
		this.paused = object.paused;
		this.enabled = object.enabled;
		this.gamerules = object.gamerules;
		this.waitDuration = object.waitDuration;
		this.turn = object.turn;
		this.walls = object.walls;
		this.path = object.path;
		this.pickedUp = object.pickedUp;
		this.clockwiseRotation = object.clockwiseRotation;
		this.pawn = object.pawn;
		this.goal = object.goal;
		this.items = object.items;
		this.nextTimestamp = object.nextTimestamp ? DateTime.fromMillis(object.nextTimestamp) : this.nextTimestamp;
		this.boardMessage = null;
		if (object.boardMessage) {
			this.boardMessage = await this.channel.messages.fetch(object.boardMessage);
			await this.channel.messages.fetch({ after: object.boardMessage });
			this.setupReactionCollector();
		}

		for (var [k, e] of Object.entries(object.players)) {
			var p = new Player(await this.client.users.fetch(e.user, true, true), this, true);
			p.score = e.score;
			p.turnedOnce = e.turnedOnce;
			p.item = e.item;
			p.itemMessage = null;
			p.gainedOnePoint = e.gainedOnePoint;
			if (e.itemChannel) {
				var channel = await this.client.channels.fetch(e.itemChannel);
				if (e.itemMessage) p.itemMessage = await channel.messages.fetch(e.itemMessage);
			}

			this.players[k] = p;
		};

		this.generateBoard();
	}

	save() {
		this.mainclass.load("games").then(object => {
			object.games[this.channel.id] = this.serialize();
			this.mainclass.save("games", object);
		});
	}

	delete_save() {
		this.clearReactionCollector();
		clearTimeout(this.timeout);
		this.mainclass.load("games").then(object => {
			delete object.games[this.channel.id];
			this.mainclass.save("games", object);
		});
	}
}

module.exports = exports = Game
