import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCSVObjects } from "./lib/csvParse.js";
import { fetchTaxonomyCSV } from "./lib/ebird.js";
import { deltaPack } from "./lib/pack.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const REGIONS_DIR = join(DATA_DIR, "regions");

const isExtinct = (v) => {
	const s = String(v ?? "")
		.trim()
		.toUpperCase();
	return s === "TRUE" || s === "1" || s === "YES";
};

async function buildTaxonomy(build = new Date().toISOString()) {
	mkdirSync(DATA_DIR, { recursive: true });

	console.log("[taxonomy] fetching English taxonomy…");
	const enRows = parseCSVObjects(await fetchTaxonomyCSV());
	console.log(`[taxonomy] English rows: ${enRows.length}`);

	console.log("[taxonomy] fetching French taxonomy…");
	const frRows = parseCSVObjects(await fetchTaxonomyCSV({ locale: "fr" }));
	console.log(`[taxonomy] French rows: ${frRows.length}`);

	const frByCode = new Map(frRows.map((r) => [r.SPECIES_CODE, r.COMMON_NAME]));

	enRows.sort(
		(a, b) =>
			Number.parseFloat(a.TAXON_ORDER) - Number.parseFloat(b.TAXON_ORDER),
	);

	const orderKeys = [];
	const orderIndex = new Map();
	const families = [];
	const familyIndex = new Map();

	const sci = [];
	const code = [];
	const orderIdx = [];
	const familyIdx = [];
	const extinct = [];
	const namesEn = [];
	const namesFr = [];

	for (const r of enRows) {
		const orderName = r.ORDER || "Incertae Sedis";
		if (!orderIndex.has(orderName)) {
			orderIndex.set(orderName, orderKeys.length);
			orderKeys.push(orderName);
		}
		const oi = orderIndex.get(orderName);

		const famCode = r.FAMILY_CODE || "unknown";
		if (!familyIndex.has(famCode)) {
			familyIndex.set(famCode, families.length);
			families.push({
				code: famCode,
				sci: r.FAMILY_SCI_NAME || "",
				com: r.FAMILY_COM_NAME || "",
				orderIdx: oi,
			});
		}
		const fi = familyIndex.get(famCode);

		sci.push(r.SCIENTIFIC_NAME);
		code.push(r.SPECIES_CODE);
		orderIdx.push(oi);
		familyIdx.push(fi);
		let extinctFlag = 0;
		if (isExtinct(r.EXTINCT)) {
			extinctFlag = 1;
		}
		extinct.push(extinctFlag);
		namesEn.push(r.COMMON_NAME);
		namesFr.push(frByCode.get(r.SPECIES_CODE) || r.COMMON_NAME);
	}

	const count = sci.length;

	const orders = orderKeys.map((name, i) => {
		const famCount = families.filter((f) => f.orderIdx === i).length;
		return { name, familyCount: famCount };
	});

	const core = { build, count, sci, code, orderIdx, familyIdx, extinct };
	const meta = { build, count, orders, families };

	writeFileSync(join(DATA_DIR, "taxonomy.core.json"), JSON.stringify(core));
	writeFileSync(join(DATA_DIR, "taxonomy.meta.json"), JSON.stringify(meta));
	writeFileSync(
		join(DATA_DIR, "taxonomy.names.en.json"),
		JSON.stringify({ build, names: namesEn }),
	);
	writeFileSync(
		join(DATA_DIR, "taxonomy.names.fr.json"),
		JSON.stringify({ build, names: namesFr }),
	);

	mkdirSync(REGIONS_DIR, { recursive: true });
	const allIdx = Array.from({ length: count }, (_, i) => i);
	writeFileSync(
		join(REGIONS_DIR, "world.json"),
		JSON.stringify({ code: "world", count, deltas: deltaPack(allIdx) }),
	);
	const indexPath = join(REGIONS_DIR, "_index.json");
	let existing = null;
	try {
		existing = JSON.parse(readFileSync(indexPath, "utf8"));
	} catch {
		existing = null;
	}
	if (
		!(existing && Array.isArray(existing.regions)) ||
		existing.regions.length <= 1
	) {
		writeFileSync(
			indexPath,
			JSON.stringify({
				build,
				regions: [
					{ code: "world", type: "world", en: "World", fr: "Monde", count },
				],
			}),
		);
	}

	console.log(
		`[taxonomy] wrote ${count} species, ${orders.length} orders, ${families.length} families`,
	);
	return { count, orders: orders.length, families: families.length };
}

if (
	import.meta.url === `file://${process.argv[1]}` ||
	process.argv[1]?.endsWith("fetchTaxonomy.js")
) {
	buildTaxonomy().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}

export { buildTaxonomy };
