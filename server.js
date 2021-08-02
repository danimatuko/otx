const express = require("express");
const app = express();
const port = 5000;
const axios = require("axios");
app.use(express.json());
const connectToDB = require("./db/connect");
const Domain = require("./models/Domain");
const dotenv = require("dotenv");
dotenv.config();

connectToDB();

const save = async (domain) => {
	try {
		const domainExist = Domain.findOne({ name: domain.name });
		if (domainExist) throw new Error("domain already exist");

		await Domain.create({
			name: domain.name,
			pretenders: domain.pretenders
		});
	} catch (error) {
		console.log(error);
	}
};

const fetchData = async (url) => {
	let page = 1;
	let hasMoreResults;

	const pretenders = [];
	let domain = {
		name: "",
		pretenders: []
	};

	do {
		const { data } = await axios.get(
			`https://otx.alienvault.com/otxapi/indicators/?type=domain&include_inactive=0&sort=-modified&q=${url}&page=${page}&limit=10`
		);
		// add name
		if (data.previous == null) {
			domain.name = data.next
				.split("q=")[1]
				.substring(0, data.next.split("q=")[1].indexOf("&"));
		}

		page++;
		hasMoreResults = data.next;
		!hasMoreResults
			? console.log(`Done fetching for" + ${domain.name}!`)
			: console.log(`[${domain.name}] ${data.next}`);
		pretenders.push(...data.results.map((ind) => ind.indicator));
	} while (hasMoreResults !== null);
	domain.pretenders = pretenders;

	return domain;
};

app.post("/check", async (req, res) => {
	const url = req.body.url;
	// let hasMoreResults;
	try {
		const domainExist = await Domain.findOne({ name: url });
		if (domainExist) return res.send("domain already exist");

		domain = await fetchData(url);
		console.log("after fetch", domain);
		//save to DB
		await save(domain);
		console.log("after save1", domain);

		res.status(201).json(domain);
	} catch (error) {
		res.json(error);
	}
});

app.post("/check-multiple", async (req, res) => {
	const urls = req.body.urls;

	try {
		const promisesArr = [];
		urls.forEach((url) => {
			promisesArr.push(fetchData(url));
		});

		let results = await Promise.all(promisesArr);

		results.forEach((domain) => {
			save(domain);
		});

		res.status(201).json(results);
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
