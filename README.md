# Br4nd-0n
A modular Discord bot written in JS on top of discord.js.


## What is this?
Br4nd-0n was originally my first ever Discord bot, back in 2017. 
Its codebase was pretty terrible and not that practical to navigate and make changes to, so I decided to go back to it to revamp it entirely.
Now, it has a module-based structure, allowing me to add new fonctionnalities and commands without having to worry about the basic concerns (like listening for commands) every time.


## Why is this public?
There are two main reasons why this repository is public:
1. The way I am currently hosting this bot (on Repl.it) requires this repository to be public,
2. I want to eventually make this into a bot core that annyone can download and build on top of, in order to quickly make bots that can do anything.


## What are the modules currently available?
If I ever make it into a full release, I will include the following core modules, that are either required or really useful for the bot usage:
- **ping:** Simply pings the bot, and receives both the ping, uptime, and average websocket ping.
- **help:** Allows you to see the help message of any module, as well as the list of all modules currently enabled.
- **restart:** Simply restarts the bot without having to restart its hosting hardware. Requires the bot to be started with `sh main.sh` and not `node bot.js`.
- **mention:** Redirects pings of the bot to one module. Useful for frequently used commands and is server-based. *(TODO: Add the possibility for it to be channel-based)*
- **modules:** *TODO: Add module to enable/disable modules on a server basis.*

All other modules are specific to this bot and may not be useful for a more general use.
A release would obviously also come with the base module class as well as the bot.js file.


## Who works on this?
I am currently the only person on board for this project, having done all the code for it.
**BUT**, there is a documentation currently up on github-pages (https://lecodex.github.io/Br4nd-0n-V2/) that you can use to start making modules for this bot right now, so feel free to download the files and experiment!

The Issues tab is also open for any suggestions on what I shoud do for the core of the bot.


## How do I start the bot?
The bot requires a .env file to work. In it, you will need to specify the following values:
- TOKEN: Your bot's token.
- ADMIN: The user ID of the administrator of the bot. This user will have access to all modules no matter what the auth says.
- PREFIX: The prefix used for commands. This will probably be moved somewhere else for it to be server-based instead of being global.
- MONGO_DB_URL: Not required. This is the database that the bot currently uses. If not specified, the bot will default to using JSON files to store the modules' data.

Once this file is created, all you have to do is run `sh main.sh` and the bot should start (use the ping command to make sure it's responding).


## What is planned for the future?
Here's a list of everything I feel is needed for me to consider it complete:
- [ ] Add a "modules" module
- [ ] Add a permissions check for modules to prevent errors
- [ ] Change the save of the modules to be more service-agnostic, allowing users to use any database they want.
- [ ] Use config.toml
  - [ ] Move the prefix to config.toml for modifications
  - [ ] Add the error channel to config.toml
  - [ ] Add a rate limit check to prevent bucket-lock (server warns)
