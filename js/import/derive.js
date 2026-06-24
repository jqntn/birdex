import { RARITY } from "../config.js";
import { COUNTRY_CONTINENT } from "../data/continents.js";
import { rarityTier, shinyKey } from "../data/rarity.js";
import { idxOfSci, speciesCode } from "../data/taxonomy.js";

export function deriveFromSightings(
	sightings,
	regionSet,
	biggestDay = null,
	prevShiny = [],
) {
	const species = {};
	const caughtSet = new Set();
	const byRarity = Object.fromEntries(RARITY.map((r) => [r.id, 0]));
	const byYear = {};
	const byCountry = {};
	const byDate = {};
	const continents = new Set();
	const shinyKeyByCode = new Map();
	const unmatched = [];

	let seenInRegion = 0;

	for (const [, rec] of sightings) {
		const idx = idxOfSci(rec.sci);
		if (idx === undefined) {
			unmatched.push(rec);
			continue;
		}
		const code = speciesCode(idx);
		caughtSet.add(idx);

		const inRegion = regionSet ? regionSet.has(idx) : true;
		if (inRegion) {
			seenInRegion += 1;
		}

		const tier = RARITY[rarityTier(idx)].id;
		shinyKeyByCode.set(code, shinyKey(rec.sci));
		byRarity[tier] += 1;

		if (rec.date) {
			const y = rec.date.slice(0, 4);
			byYear[y] = (byYear[y] || 0) + 1;
			byDate[rec.date] = (byDate[rec.date] || 0) + 1;
		}
		if (rec.country) {
			byCountry[rec.country] = (byCountry[rec.country] || 0) + 1;
			const cont = COUNTRY_CONTINENT[rec.country];
			if (cont) {
				continents.add(cont);
			}
		}

		species[code] = {
			count: rec.count,
			totalCount: rec.totalCount,
			timesSeen: rec.timesSeen,
			sp: rec.sp,
			country: rec.country,
			date: rec.date,
			lastDate: rec.lastDate,
			lastSp: rec.lastSp,
			lastCountry: rec.lastCountry,
			exotic: rec.exotic,
			category: rec.category,
			shiny: false,
			rarity: tier,
			outOfRegion: !inRegion,
		};
	}

	let biggestLiferDay = null;
	for (const [date, c] of Object.entries(byDate)) {
		if (!biggestLiferDay || c > biggestLiferDay.count) {
			biggestLiferDay = { date, count: c };
		}
	}

	const shinyTarget = Math.floor(caughtSet.size / 100);
	const shinySet = new Set(
		prevShiny.filter((code) => shinyKeyByCode.has(code)),
	);
	if (shinySet.size < shinyTarget) {
		const ranked = [...shinyKeyByCode.entries()]
			.filter(([code]) => !shinySet.has(code))
			.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
		for (const [code] of ranked) {
			if (shinySet.size >= shinyTarget) {
				break;
			}
			shinySet.add(code);
		}
	}
	const shinies = [...shinySet];
	for (const code of shinies) {
		species[code].shiny = true;
	}

	const agg = {
		liferCount: caughtSet.size,
		seenInRegion,
		byRarity,
		byYear,
		byCountry,
		continents: [...continents],
		biggestDay,
		biggestLiferDay,
		shinies,
	};

	return { species, caughtSet, agg, unmatched };
}
