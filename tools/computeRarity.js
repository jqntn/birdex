import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deltaUnpack } from "./lib/pack.js";
import { COUNTRIES } from "./regionCodes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const REGIONS_DIR = join(DATA_DIR, "regions");

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

const JSON_EXT_RE = /\.json$/;

function computeRarity(build = new Date().toISOString()) {
	const core = JSON.parse(
		readFileSync(join(DATA_DIR, "taxonomy.core.json"), "utf8"),
	);
	const { count, extinct, familyIdx } = core;

	const famCounts = new Map();
	for (const fi of familyIdx) {
		famCounts.set(fi, (famCounts.get(fi) || 0) + 1);
	}
	const monotypic = familyIdx.map((fi) => famCounts.get(fi) === 1);

	const occ = new Uint16Array(count);
	let countryFiles = 0;
	let files = [];
	try {
		files = readdirSync(REGIONS_DIR).filter((f) => f.endsWith(".json"));
	} catch {
		files = [];
	}
	for (const f of files) {
		const code = f.replace(JSON_EXT_RE, "");
		if (!COUNTRY_CODES.has(code)) {
			continue;
		}
		const region = JSON.parse(readFileSync(join(REGIONS_DIR, f), "utf8"));
		for (const idx of deltaUnpack(region.deltas)) {
			occ[idx] += 1;
		}
		countryFiles += 1;
	}

	const partial = countryFiles === 0;
	const tiers = new Uint8Array(count);
	for (let i = 0; i < count; i += 1) {
		if (partial) {
			if (extinct[i]) {
				tiers[i] = 4;
			} else {
				tiers[i] = 0;
			}
			continue;
		}
		const o = occ[i];
		if (extinct[i] || o === 0 || (monotypic[i] && o <= 3)) {
			tiers[i] = 4;
		} else if (o === 1) {
			tiers[i] = 3;
		} else if (o <= 4) {
			tiers[i] = 2;
		} else if (o <= 19) {
			tiers[i] = 1;
		} else {
			tiers[i] = 0;
		}
	}

	const dist = [0, 0, 0, 0, 0];
	for (const t of tiers) {
		dist[t] += 1;
	}

	writeFileSync(
		join(DATA_DIR, "rarity.json"),
		JSON.stringify({
			build,
			partial,
			countriesUsed: countryFiles,
			tiers: Array.from(tiers),
		}),
	);
	let source;
	if (partial) {
		source = "PARTIAL (no country lists; extinct→legendary only) ";
	} else {
		source = `from ${countryFiles} countries `;
	}
	console.log(
		`[rarity] ${source}` +
			`dist common/uncommon/rare/endemic/legendary = ${dist.join("/")}`,
	);
	return { partial, dist };
}

if (process.argv[1]?.endsWith("computeRarity.js")) {
	computeRarity();
}

export { computeRarity };
