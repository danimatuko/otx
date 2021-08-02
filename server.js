const express = require("express");
const app = express();
const port = 5000;
const axios = require("axios");
app.use(express.json());
const connectToDB = require("./db/connect");
const Domain = require("./models/Domain");
const Pretender = require("./models/Pretender");
const dotenv = require("dotenv");
dotenv.config();

connectToDB();

const save = async (domain) => {
	try {
		const domainExist = Domain.findOne({ name: domain.name });
		if (domainExist) console.log("domain already exist");

		await Domain.create({
			name: domain.name,
			pretenders: domain.pretenders
		});
	} catch (error) {
		console.log(error);
	}
};

app.post("/check", async (req, res) => {
	const url = req.body.url;
	try {
		const domainExist = await Domain.findOne({ name: url });
		if (domainExist) return res.send("domain already exist");

		const { data } = await axios.get(
			`https://otx.alienvault.com/otxapi/indicators/?type=domain&include_inactive=0&sort=-modified&q=${url}&page=1&limit=10`
		);

		/* SAVE DOMAIN TO DB */
		const saveDomain = await Domain.create({
			name: data.next.split("q=")[1].substring(0, data.next.split("q=")[1].indexOf("&")),
			pretenders: data.results.map((ind) => ind.indicator)
		});

		res.status(201).json(saveDomain);
	} catch (error) {
		res.json(error);
	}
});

app.post("/check-multiple", async (req, res) => {
	const urls = req.body.urls;

	try {
		const promisesArr = [];
		urls.forEach((url) => {
			promisesArr.push(
				axios.get(
					`https://otx.alienvault.com/otxapi/indicators/?type=domain&include_inactive=0&sort=-modified&q=${url}&page=1&limit=10`
				)
			);
		});

		let results = await Promise.all(promisesArr);

		const arr = [];
		results.forEach((result) => {
			arr.push({
				name: result.data.next
					.split("q=")[1]
					.substring(0, result.data.next.split("q=")[1].indexOf("&")),
				pretenders: result.data.results.map((ind) => ind.indicator)
			});
		});

		arr.forEach((domain) => {
			save(domain);
		});

		res.status(201).json(arr);
	} catch (error) {
		res.json(error);
	}
});

app.delete(`/delete`, async (req, res) => {
	try {
		await Domain.deleteMany({});
		res.status(200).json({ message: "all domains removed" });
	} catch (error) {
		res.status(500).send(error.message);
	}
});

app.delete(`/delete/:id`, async (req, res) => {
	try {
		const domain = await Domain.findById(req.params.id);
		if (domain) {
			await domain.remove();
			res.status(200).json({ message: "domain removed" });
		} else {
			res.status(404).send("domain not found");
		}
	} catch (error) {
		res.status(500).send(error.message);
	}
});

app.listen(port, () => {
	console.log(`app listening at http://localhost:${port}`);
});
