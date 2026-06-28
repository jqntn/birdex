import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { fetchRegionSpecies, sleep } from "./lib/ebird.js";
import { loadEnv } from "./lib/env.js";
import { deltaPack } from "./lib/pack.js";
import { CONTINENT_NAMES, COUNTRIES } from "./regionCodes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const REGIONS_DIR = join(DATA_DIR, "regions");

const CONCURRENCY = 3;
const SPACING_MS = 200;
const MAX_RETRIES = 3;

async function buildRegions({
	force = false,
	build = new Date().toISOString(),
} = {}) {
	loadEnv();
	const apiKey = process.env.EBIRD_API_KEY;
	if (!apiKey) {
		throw new Error(
			"EBIRD_API_KEY missing. Get a free key at https://ebird.org/api/keygen, " +
				"then set it in tools/.env (EBIRD_API_KEY=...) or the environment.",
		);
	}

	mkdirSync(REGIONS_DIR, { recursive: true });
	const core = JSON.parse(
		readFileSync(join(DATA_DIR, "taxonomy.core.json"), "utf8"),
	);
	const codeToIdx = new Map(core.code.map((c, i) => [c, i]));

	const indexRegions = [
		{
			code: "world",
			type: "world",
			en: "World",
			fr: "Monde",
			count: core.count,
		},
	];
	const continentSets = new Map();

	async function fetchOne(country) {
		const file = join(REGIONS_DIR, `${country.code}.json`);
		if (!force && existsSync(file)) {
			const cached = JSON.parse(readFileSync(file, "utf8"));
			return {
				country,
				count: cached.count,
				indices: reconstruct(cached.deltas),
			};
		}
		let attempt = 0;
		for (;;) {
			try {
				const codes = await fetchRegionSpecies(country.code, apiKey);
				if (codes === null) {
					console.warn(
						`[regions] ${country.code} (${country.name}) → 404, skipping`,
					);
					return null;
				}
				const indices = [];
				for (const c of codes) {
					const idx = codeToIdx.get(c);
					if (idx !== undefined) {
						indices.push(idx);
					}
				}
				writeFileSync(
					file,
					JSON.stringify({
						code: country.code,
						count: indices.length,
						deltas: deltaPack(indices),
					}),
				);
				return { country, count: indices.length, indices };
			} catch (e) {
				attempt += 1;
				if (
					(e.status === 429 || (e.status >= 500 && e.status < 600)) &&
					attempt <= MAX_RETRIES
				) {
					const backoff = 500 * 2 ** attempt;
					console.warn(
						`[regions] ${country.code} ${e.status}, retry ${attempt} in ${backoff}ms`,
					);
					await sleep(backoff);
					continue;
				}
				console.error(`[regions] ${country.code} failed: ${e.message}`);
				return null;
			}
		}
	}

	const results = [];
	for (let i = 0; i < COUNTRIES.length; i += CONCURRENCY) {
		const batch = COUNTRIES.slice(i, i + CONCURRENCY);
		const batchOut = await Promise.all(batch.map(fetchOne));
		results.push(...batchOut);
		console.log(
			`[regions] ${Math.min(i + CONCURRENCY, COUNTRIES.length)}/${COUNTRIES.length}`,
		);
		await sleep(SPACING_MS);
	}

	for (const r of results) {
		if (!r) {
			continue;
		}
		const { country, count, indices } = r;
		indexRegions.push({
			code: country.code,
			type: "country",
			en: country.name,
			fr: country.name,
			continent: country.continent,
			count,
		});
		if (!continentSets.has(country.continent)) {
			continentSets.set(country.continent, new Set());
		}
		const set = continentSets.get(country.continent);
		for (const idx of indices) {
			set.add(idx);
		}
	}

	for (const [cont, set] of continentSets) {
		const indices = [...set].sort((a, b) => a - b);
		const code = `cont-${cont}`;
		writeFileSync(
			join(REGIONS_DIR, `${code}.json`),
			JSON.stringify({
				code,
				count: indices.length,
				deltas: deltaPack(indices),
			}),
		);
		const names = CONTINENT_NAMES[cont.toLowerCase()] || { en: cont, fr: cont };
		indexRegions.push({
			code,
			type: "continent",
			en: names.en,
			fr: names.fr,
			count: indices.length,
		});
	}

	indexRegions.sort((a, b) => {
		const rank = { world: 0, continent: 1, country: 2 };
		if (rank[a.type] !== rank[b.type]) {
			return rank[a.type] - rank[b.type];
		}
		return a.en.localeCompare(b.en);
	});

	writeFileSync(
		join(REGIONS_DIR, "_index.json"),
		JSON.stringify({ build, regions: indexRegions }),
	);
	const countries = indexRegions.filter((r) => r.type === "country").length;
	console.log(
		`[regions] wrote ${countries} countries + ${continentSets.size} continents + world`,
	);
	return { countries, continents: continentSets.size };
}

function reconstruct(deltas) {
	const out = [];
	let acc = 0;
	for (const d of deltas) {
		acc += d;
		out.push(acc);
	}
	return out;
}

if (process.argv[1]?.endsWith("fetchRegions.js")) {
	const force = process.argv.includes("--force");
	buildRegions({ force }).catch((e) => {
		console.error(e.message);
		process.exit(1);
	});
}

export { buildRegions };
