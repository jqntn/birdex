import { COUNTABLE_CATEGORIES } from "../config.js";
import { countryOf, normSci, parseEbirdDate } from "../util/format.js";

function parseCsv(text) {
	let input = text;
	if (input.charCodeAt(0) === 0xfe_ff) {
		input = input.slice(1);
	}
	const rows = [];
	let row = [];
	let field = "";
	let q = false;
	let i = 0;
	const n = input.length;
	while (i < n) {
		const c = input[i];
		if (q) {
			if (c === '"') {
				if (input[i + 1] === '"') {
					field += '"';
					i += 2;
				} else {
					q = false;
					i += 1;
				}
			} else {
				field += c;
				i += 1;
			}
		} else if (c === '"') {
			q = true;
			i += 1;
		} else if (c === ",") {
			row.push(field);
			field = "";
			i += 1;
		} else if (c === "\r") {
			i += 1;
		} else if (c === "\n") {
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
			i += 1;
		} else {
			field += c;
			i += 1;
		}
	}
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

const WHITESPACE_RE = /\s+/;
const binomial = (sci) => sci.trim().split(WHITESPACE_RE).slice(0, 2).join(" ");

const NON_SPECIES = /\bsp\.|\/| x |×|\(|\[/i;

function parseEbirdData(text) {
	const rows = parseCsv(text);
	if (rows.length === 0) {
		return {
			sightings: new Map(),
			rows: 0,
			countable: 0,
			skipped: 0,
			biggestDay: null,
			biggestCountDay: null,
		};
	}

	const header = rows[0].map((h) => h.trim());
	const find = (...names) => {
		for (const name of names) {
			const i = header.indexOf(name);
			if (i >= 0) {
				return i;
			}
		}
		return -1;
	};
	const ci = {
		common: find("Common Name"),
		sci: find("Scientific Name"),
		count: find("Count"),
		region: find("State/Province", "S/P", "State"),
		date: find("Date"),
		sub: find("Submission ID", "SubID"),
		category: find("Category"),
		countable: find("Countable"),
	};

	const agg = new Map();
	const dayMap = new Map();
	const dayCount = new Map();
	let dataRows = 0;
	let countable = 0;
	let skipped = 0;

	for (let r = 1; r < rows.length; r += 1) {
		const cells = rows[r];
		if (cells.length === 1 && cells[0] === "") {
			continue;
		}
		const sciRaw = (cells[ci.sci] || "").trim();
		if (!sciRaw) {
			continue;
		}
		dataRows += 1;

		if (ci.category >= 0) {
			const cat = (cells[ci.category] || "").trim().toLowerCase();
			if (cat && cat !== "issf" && !COUNTABLE_CATEGORIES.has(cat)) {
				skipped += 1;
				continue;
			}
		}
		if (ci.countable >= 0 && (cells[ci.countable] || "").trim() === "0") {
			skipped += 1;
			continue;
		}
		if (NON_SPECIES.test(sciRaw)) {
			skipped += 1;
			continue;
		}

		const bin = binomial(sciRaw);
		if (bin.split(" ").length < 2) {
			skipped += 1;
			continue;
		}

		const key = normSci(bin);
		const iso = parseEbirdDate(cells[ci.date])?.iso || null;
		if (iso) {
			let day = dayMap.get(iso);
			if (!day) {
				day = new Set();
				dayMap.set(iso, day);
			}
			day.add(key);
		}
		const region = (cells[ci.region] || "").trim();
		const country = countryOf(region);
		const rawCount = Number.parseInt((cells[ci.count] || "").trim(), 10);
		let cnt = 1;
		if (Number.isFinite(rawCount) && rawCount > 0) {
			cnt = rawCount;
		}
		if (iso) {
			dayCount.set(iso, (dayCount.get(iso) || 0) + cnt);
		}
		let sub = "";
		if (ci.sub >= 0) {
			sub = (cells[ci.sub] || "").trim();
		}

		let a = agg.get(key);
		if (!a) {
			a = {
				sci: bin,
				common: (cells[ci.common] || "").trim(),
				firstDate: null,
				firstSp: region,
				firstCountry: country,
				firstCount: cnt,
				lastDate: null,
				lastSp: region,
				lastCountry: country,
				totalCount: 0,
				subs: new Set(),
				rowCount: 0,
			};
			agg.set(key, a);
			countable += 1;
		}
		a.totalCount += cnt;
		a.rowCount += 1;
		if (sub) {
			a.subs.add(sub);
		}
		if (!a.common && cells[ci.common]) {
			a.common = (cells[ci.common] || "").trim();
		}
		if (iso && (!a.firstDate || iso < a.firstDate)) {
			a.firstDate = iso;
			a.firstSp = region;
			a.firstCountry = country;
			a.firstCount = cnt;
		}
		if (iso && (!a.lastDate || iso > a.lastDate)) {
			a.lastDate = iso;
			a.lastSp = region;
			a.lastCountry = country;
		}
	}

	let biggestDay = null;
	for (const [date, set] of dayMap) {
		if (!biggestDay || set.size > biggestDay.count) {
			biggestDay = { date, count: set.size };
		}
	}

	let biggestCountDay = null;
	for (const [date, c] of dayCount) {
		if (!biggestCountDay || c > biggestCountDay.count) {
			biggestCountDay = { date, count: c };
		}
	}

	const sightings = new Map();
	for (const [key, a] of agg) {
		let timesSeen = a.rowCount;
		if (a.subs.size > 0) {
			timesSeen = a.subs.size;
		}
		sightings.set(key, {
			sci: a.sci,
			common: a.common,
			count: a.firstCount,
			totalCount: a.totalCount,
			timesSeen,
			sp: a.firstSp,
			country: a.firstCountry,
			date: a.firstDate,
			lastDate: a.lastDate,
			lastSp: a.lastSp,
			lastCountry: a.lastCountry,
			exotic: "",
			category: "species",
		});
	}

	return {
		sightings,
		rows: dataRows,
		countable,
		skipped,
		biggestDay,
		biggestCountDay,
	};
}

export { binomial, NON_SPECIES, parseCsv, parseEbirdData };
