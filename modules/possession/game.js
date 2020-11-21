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
		this.nextTimestamp = DateTime.local();
		// this.enabled = Object.keys(Tiles).slice(1);
		this.turn = 1;
		// this.maxBoards = 20;
		this.collector = null;
		this.timeout = null;
		this.gamerules = {};
		this.waitDuration = {
			minutes: 0,
			hours: 1
		};
		this.colors = ["🟥", "🟦", "🟩", "🟨", "🟪", "🔴", "🔵", "🟢", "🟡", "🟣"];
		this.availableObjects = ["🧀", "🥩", "🌶️", "🧅", "🥕", "🥑", "🥔", "🍎", "🍒", "🍇", "🌮", "🥞", "🍙", "🍩", "🥬", "🍺"];
		this.objects = [];
		this.pawn = {
			x: 0,
			y: 0
		}
		this.goal = {
			x: 10,
			y: 10
		}
		this.clockwiseRotation = true;

		if (message) {
			this.channel = message.channel;
			this.start();
		}
	}

	async start() {
		this.createWalls();
		this.generateBoard();
		this.path = this.aStar(this.pawn, this.goal);
		this.placeObjects();
		await this.sendBoard();
	}

	setupTimeout(newTurn = true) {
		if (this.timeout) clearTimeout(this.timeout);

		var now = DateTime.local();
		if (newTurn) {
			this.nextTimestamp = this.nextTimestamp.plus(this.waitDuration).set({ second: 0 });
			if (!this.waitDuration.minutes) this.nextTimestamp = this.nextTimestamp.set({ minute: 0 });
		}
		var time = this.nextTimestamp.toMillis() - now.toMillis();

		this.timeout = setTimeout(() => {this.nextTurn()}, time);
	}

	clearReactionCollector() {
		if (this.boardMessage) this.boardMessage.reactions.removeAll();
		if (this.collector) this.collector.stop();
	}

	deleteBoardMessage() {
		if (this.boardMessage) {
			this.boardMessage.delete();
			this.boardMessage = null;
		}
		this.clearReactionCollector();
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

	placeObjects() {
		this.objects = [];

		this.availableObjects.forEach((element, i) => {
			var x, y;
			do {
				x = Math.floor(Math.random() * (this.board.length + 1) / 2) * 2;
				y = Math.floor(Math.random() * (this.board.length + 1) / 2) * 2;
			} while (this.objects.find(e => e.x === x && e.y === y));

			this.objects.push({
				x: x,
				y: y,
				object: element
			});
		});
	}

	async sendBoard() {
		var embed = new MessageEmbed()
			.setTitle(this.mainclass.name)
			.setFooter("Tour " + this.turn)
			.setColor(this.mainclass.color)

		if (Object.values(this.players).length) {
			var sorted = Object.values(this.players).sort((a, b) => b.score != a.score ? b.score - a.score : b.index - a.index);

			embed.addField(
				"Joueurs",
				sorted.reduce((buffer, e) => {
					if (e.score < buffer.lastScore) {
						buffer.lastScore = e.score;
						buffer.lastIndex = e.index;
						buffer.rank++;
					} else if (e.index < buffer.lastIndex) {
						buffer.lastIndex = e.index;
						buffer.rank++;
					}
					buffer.message += getRankEmoji(buffer.rank) + " **" + buffer.rank + ".** " + (e.user ? e.user.toString() : "Joueur non trouvé") + ": **" + e.score + "**\n";
					return buffer;
				}, {message: "", rank: 0, lastScore: Infinity, lastIndex: Infinity}).message
			);
		}

		var board = this.board.map((e, ty) =>
			e.map((f, tx) => {
				if (this.pawn.x === tx && this.pawn.y === ty) return "📍";
				if (this.goal.x === tx && this.goal.y === ty) return "🎯";

				var object = this.objects.find(e => e.x === tx && e.y === ty);
				if (object) return object.object;

				if (this.path.filter(e => e.x === tx && e.y === ty).length) return "🔸";
				return f === -1 ? "⬛" : this.colors[f];
			}).join("")
		).join("\n");

		//console.log(this.path);

		embed.addField(
			"Labyrinthe • Sens de rotation des murs: " + (this.clockwiseRotation ? "🔁" : "🔄"),
			board
		)

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

		var emojis = this.colors.slice(0, this.colors.length / 2);
		for (var i = 0; i < emojis.length; i ++) {
			await this.boardMessage.react(emojis[i]);
		};

		this.collector = this.boardMessage.createReactionCollector((reaction, user) => emojis.includes(reaction.emoji.name) && !user.bot);

		this.collector.on('collect', (reaction, user) => {
			try {
				if (this.paused) return;
				var player = this.players[user.id];

				if (player) {
					if (!player.turnedOnce) {
						player.turnedOnce = true;
						var index = this.colors.indexOf(reaction.emoji.name);

						for (var i = 0; i < this.walls.length; i ++) {
							var element = this.walls[i];

							if (element.color === index) {
								var newDir = (element.direction + (this.clockwiseRotation ? 1 : -1) + 4) % 4;
								var d = Math.round(Math.cos(newDir * Math.PI / 2)) + this.colors.length / 2 * Math.round(Math.sin(newDir * Math.PI / 2));

								if (i + d >= 0 && i + d < this.walls.length) {
									var neighbor = this.walls[i + d];
									if ((neighbor.direction + 2) % 4 === newDir) continue;
								}

								element.direction = newDir;
							}
						};

						this.generateBoard();
						this.path = this.aStar(this.pawn, this.goal);
						this.sendBoard();
					}
				}

				reaction.users.remove(user);
			} catch (e) {
				this.client.error(this.channel, "Labyrinthe", e);
			}
		});
	}

	async nextTurn() {
		Object.values(this.players).forEach((element) => {
			element.turnedOnce = false;
			if (this.path.find(e => e.x === this.objects[element.object].x && e.y === this.objects[element.object].y)) element.gainOnePoint(this);
		});

		this.pawn.x = this.goal.x;
		this.pawn.y = this.goal.y
		do {
			this.goal.x = Math.floor(Math.random() * (this.board.length + 1) / 2) * 2;
			this.goal.y = Math.floor(Math.random() * (this.board.length + 1) / 2) * 2;

			//console.log("Tried " + this.goal.x + "/" + this.goal.y + ": " + getDist(this.pawn, this.goal) + "(" + this.pawn.x + "/" + this.pawn.y + " .. " + this.goal.x + "/" + this.goal.y + ")");
		} while (getDist(this.pawn, this.goal) < 5);

		this.path = this.aStar(this.pawn, this.goal);

		this.turn ++;

		this.clockwiseRotation = !this.clockwiseRotation;
		await this.sendBoard();

		this.setupTimeout(true);
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
}

module.exports = exports = Game
