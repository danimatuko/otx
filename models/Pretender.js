const mongoose = require("mongoose");
const pretenderSchema = mongoose.Schema({
	domain: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: "Domain"
	},
	list: {
		type: [String]
	}
});

const Pretender = mongoose.model("Pretender", pretenderSchema);

module.exports = Pretender;
