const mongoose = require("mongoose");
const domainSchema = mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	pretender: {
		type: [String]
	}
});

const Domain = mongoose.model("Domain", domainSchema);

module.exports = Domain;
