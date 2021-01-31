var DB = {};
const fs = require('fs');

function _getSavePath(mdl) {
	return "./saves/" + mdl.toLowerCase() + "\\";
}

DB.save = async function(mdl, name, data) {
	if (process.env.MONGO_DB_URL) {
		const collection = this.client.mongo.db(mdl).collection(name);
		await collection.replaceOne({}, data, { upsert: true });
		console.log(mdl + " Database Saved");
	} else {
		var string = JSON.stringify(data);
		if (!fs.existsSync(_getSavePath(mdl))) fs.mkdirSync(_getSavePath(mdl));
		fs.writeFile(_getSavePath(mdl) + name + ".json", string, err => {if (err != null) console.log(err)});
		console.log(mdl + " JSON Data Saved");
	}
}

DB.load = async function(mdl, name, fallback) {
	if (!await this.saveExists(mdl, name)) {
		this.save(mdl, name, fallback);
		return fallback;
	}

	if (process.env.MONGO_DB_URL) {
		return await this.client.mongo.db(mdl).collection(name).findOne();
	} else {
		var string = fs.readFileSync(_getSavePath(mdl) + name + ".json");
		return JSON.parse(string);
	}
}

DB.saveExists = async function(mdl, name) {
	if (process.env.MONGO_DB_URL) {
		return await this.client.mongo.db(mdl).listCollections({name: name}).hasNext();
	} else {
		return fs.existsSync(_getSavePath(mdl) + name + ".json");
	}
}

module.exports = exports = DB;
