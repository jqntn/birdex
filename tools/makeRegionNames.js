import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./lib/env.js";
import { COUNTRIES } from "./regionCodes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
	loadEnv();
	const key = process.env.EBIRD_API_KEY;
	if (!key) {
		throw new Error("EBIRD_API_KEY missing. Set it in tools/.env");
	}

	const names = {};
	const Concurrency = 3;

	async function fetchOne(country) {
		for (let attempt = 0; ; attempt++) {
			try {
				const res = await fetch(
					`https://api.ebird.org/v2/ref/region/list/subnational1/${country.code}?key=${key}`,
				);
				if ((res.status === 429 || res.status >= 500) && attempt < 4) {
					await sleep(500 * 2 ** attempt);
					continue;
				}
				if (!res.ok) {
					return;
				}
				for (const r of await res.json()) {
					if (r.code && r.name) {
						names[r.code] = r.name;
					}
				}
				return;
			} catch {
				if (attempt < 4) {
					await sleep(500 * 2 ** attempt);
					continue;
				}
				return;
			}
		}
	}

	for (let i = 0; i < COUNTRIES.length; i += Concurrency) {
		await Promise.all(COUNTRIES.slice(i, i + Concurrency).map(fetchOne));
		if (i % 30 === 0) {
			console.log(
				`[regionNames] ${Math.min(i + Concurrency, COUNTRIES.length)}/${COUNTRIES.length}`,
			);
		}
		await sleep(150);
	}

	const text = JSON.stringify({ names });
	writeFileSync(join(DATA_DIR, "regionNames.json"), text);
	console.log(
		`[regionNames] ${Object.keys(names).length} subnational regions → data/regionNames.json (${(text.length / 1024).toFixed(0)} KB)`,
	);
})();
