import { regionMeta, regionSpeciesCount } from "../data/regions.js";
import { count, familyIdxOf, orderIdxOf } from "../data/taxonomy.js";
import { getLocale, t } from "../i18n.js";
import { state } from "../state.js";
import { clear, el } from "../util/dom.js";

const L = (o) => o[getLocale()] || o.en;

const CATALOG = [
	m(
		"lifer-50",
		"count",
		"🥚",
		"Fledgling",
		"Oisillon",
		"Reach 50 lifers",
		"Atteindre 50 oiseaux",
		(c) => c.lifers,
		50,
	),
	m(
		"lifer-100",
		"count",
		"🐤",
		"Birder",
		"Ornithologue amateur",
		"Reach 100 lifers",
		"Atteindre 100 oiseaux",
		(c) => c.lifers,
		100,
	),
	m(
		"lifer-250",
		"count",
		"🦅",
		"Twitcher",
		"Cocheur",
		"Reach 250 lifers",
		"Atteindre 250 oiseaux",
		(c) => c.lifers,
		250,
	),
	m(
		"lifer-500",
		"count",
		"🏆",
		"Big Lister",
		"Grande liste",
		"Reach 500 lifers",
		"Atteindre 500 oiseaux",
		(c) => c.lifers,
		500,
	),
	m(
		"lifer-1000",
		"count",
		"👑",
		"Ornithologist",
		"Ornithologue",
		"Reach 1000 lifers",
		"Atteindre 1000 oiseaux",
		(c) => c.lifers,
		1000,
	),

	m(
		"fam-1",
		"taxa",
		"🪶",
		"First Family",
		"Première famille",
		"Complete a family in your region",
		"Compléter une famille de votre région",
		(c) => c.familiesComplete,
		1,
	),
	m(
		"fam-5",
		"taxa",
		"🎖️",
		"Family Collector",
		"Collectionneur",
		"Complete 5 families",
		"Compléter 5 familles",
		(c) => c.familiesComplete,
		5,
	),
	m(
		"order-half",
		"taxa",
		"🌿",
		"Branching Out",
		"Ramifications",
		"Cover half the orders in your region",
		"Couvrir la moitié des ordres de la région",
		(c) => c.orderCoverPct,
		50,
	),
	m(
		"order-all",
		"taxa",
		"🌳",
		"Tree of Life",
		"Arbre du vivant",
		"Touch every order in your region",
		"Toucher chaque ordre de la région",
		(c) => c.orderCoverPct,
		100,
	),

	m(
		"geo-5",
		"geo",
		"🧭",
		"Passport",
		"Passeport",
		"Birds from 5 countries",
		"Oiseaux de 5 pays",
		(c) => c.countries,
		5,
	),
	m(
		"geo-15",
		"geo",
		"✈️",
		"Globetrotter",
		"Globe-trotter",
		"Birds from 15 countries",
		"Oiseaux de 15 pays",
		(c) => c.countries,
		15,
	),
	m(
		"geo-cont-3",
		"geo",
		"🗺️",
		"Intercontinental",
		"Intercontinental",
		"Birds from 3 continents",
		"Oiseaux de 3 continents",
		(c) => c.continents,
		3,
	),
	m(
		"geo-cont-all",
		"geo",
		"🌍",
		"Seven Seas",
		"Tour du monde",
		"Birds from every continent",
		"Oiseaux de chaque continent",
		(c) => c.continents,
		7,
	),

	m(
		"rare-endemic",
		"rarity",
		"🏝️",
		"Local Legend",
		"Légende locale",
		"See an endemic species",
		"Voir une espèce endémique",
		(c) => c.endemic,
		1,
	),
	m(
		"rare-legendary",
		"rarity",
		"✨",
		"Mythic Sighting",
		"Observation mythique",
		"See a legendary species",
		"Voir une espèce légendaire",
		(c) => c.legendary,
		1,
	),
	m(
		"rare-10",
		"rarity",
		"💎",
		"Rarity Hunter",
		"Chasseur de raretés",
		"See 10 rare-or-better species",
		"Voir 10 espèces rares ou plus",
		(c) => c.rarePlus,
		10,
	),

	m(
		"bigday-10",
		"time",
		"📅",
		"Big Day",
		"Grande journée",
		"10 lifers in one day",
		"10 oiseaux en une journée",
		(c) => c.biggestLiferDay,
		10,
	),
	m(
		"bigday-25",
		"time",
		"🔥",
		"Fallout",
		"Déferlante",
		"25 lifers in one day",
		"25 oiseaux en une journée",
		(c) => c.biggestLiferDay,
		25,
	),
	m(
		"bigyear-100",
		"time",
		"🗓️",
		"Big Year",
		"Grande année",
		"100 lifers in one year",
		"100 oiseaux en une année",
		(c) => c.biggestYear,
		100,
	),

	m(
		"shiny-1",
		"shiny",
		"🌟",
		"It's Shiny!",
		"Chromatique !",
		"Catch a shiny bird",
		"Obtenir un oiseau chromatique",
		(c) => c.shinies,
		1,
	),
	m(
		"shiny-3",
		"shiny",
		"💫",
		"Sparkle Collector",
		"Collectionneur d’éclats",
		"Catch 3 shinies",
		"Obtenir 3 chromatiques",
		(c) => c.shinies,
		3,
	),

	m(
		"region-25",
		"region",
		"🟫",
		"Region Starter",
		"Début de région",
		"Complete 25% of a region",
		"Compléter 25 % d’une région",
		(c) => c.regionPct,
		25,
	),
	m(
		"region-50",
		"region",
		"🟨",
		"Region Adept",
		"Région à moitié",
		"Complete 50% of a region",
		"Compléter 50 % d’une région",
		(c) => c.regionPct,
		50,
	),
	m(
		"region-100",
		"region",
		"🟩",
		"Region Master",
		"Maître de région",
		"Complete a whole region",
		"Compléter une région entière",
		(c) => c.regionPct,
		100,
	),
];

function m(id, group, icon, nameEn, nameFr, descEn, descFr, value, goal) {
	return {
		id,
		group,
		icon,
		name: { en: nameEn, fr: nameFr },
		desc: { en: descEn, fr: descFr },
		value,
		goal,
	};
}

export function buildContext() {
	const { save, caughtSet, regionSet, region } = state;
	const agg = save?.agg;
	const total = count();

	const famTotal = new Map();
	const famCaught = new Map();
	const orderTotal = new Set();
	const orderCaught = new Set();
	for (let i = 0; i < total; i += 1) {
		const inRegion = regionSet ? regionSet.has(i) : true;
		if (!inRegion) {
			continue;
		}
		const fi = familyIdxOf(i);
		const oi = orderIdxOf(i);
		famTotal.set(fi, (famTotal.get(fi) || 0) + 1);
		orderTotal.add(oi);
		if (caughtSet.has(i)) {
			famCaught.set(fi, (famCaught.get(fi) || 0) + 1);
			orderCaught.add(oi);
		}
	}
	let familiesComplete = 0;
	for (const [fi, totalN] of famTotal) {
		if (totalN > 0 && famCaught.get(fi) === totalN) {
			familiesComplete += 1;
		}
	}
	const orderCoverPct =
		orderTotal.size > 0 ? (orderCaught.size / orderTotal.size) * 100 : 0;

	const regionDenom = regionSpeciesCount(region, total);
	const regionPct = regionDenom
		? ((agg?.seenInRegion || 0) / regionDenom) * 100
		: 0;
	const biggestYear = agg ? Math.max(0, ...Object.values(agg.byYear || {})) : 0;
	const r = agg?.byRarity || {};

	return {
		lifers: agg?.liferCount || 0,
		familiesComplete,
		orderCoverPct,
		countries: agg ? Object.keys(agg.byCountry || {}).length : 0,
		continents: agg ? (agg.continents || []).length : 0,
		endemic: r.endemic || 0,
		legendary: r.legendary || 0,
		rarePlus: (r.rare || 0) + (r.endemic || 0) + (r.legendary || 0),
		biggestDay: agg?.biggestDay?.count || 0,
		biggestLiferDay: agg?.biggestLiferDay?.count || 0,
		biggestYear,
		shinies: agg ? (agg.shinies || []).length : 0,
		regionPct,
	};
}

export function deriveAchievements() {
	const ctx = buildContext();
	return CATALOG.map((a) => {
		const value = Math.floor(a.value(ctx));
		return {
			...a,
			value,
			unlocked: value >= a.goal,
			progress: Math.min(1, value / a.goal),
		};
	});
}

export function reconcileAchievements(save, nowEpoch) {
	const list = deriveAchievements();
	const fresh = [];
	save.achievements = save.achievements || {};
	for (const a of list) {
		if (a.unlocked && !save.achievements[a.id]) {
			save.achievements[a.id] = nowEpoch;
			fresh.push(a.id);
		}
	}
	return fresh;
}

export function renderBadges(root) {
	clear(root);
	const list = deriveAchievements();
	const unlocked = list.filter((a) => a.unlocked).length;
	const rm = regionMeta(state.region);

	root.append(
		el(
			"div",
			{ class: "page-head" },
			el("h2", {}, t("badges")),
			el("div", { class: "muted" }, `${unlocked} / ${list.length}`),
		),
	);
	if (rm) {
		root.append(
			el(
				"div",
				{ class: "muted small region-note" },
				`${t("region")}: ${L(rm)}`,
			),
		);
	}

	const groups = {};
	for (const a of list) {
		groups[a.group] ||= [];
		groups[a.group].push(a);
	}

	const grid = el("div", { class: "badge-grid" });
	for (const a of list) {
		const card = el(
			"div",
			{ class: `badge ${a.unlocked ? "unlocked" : "locked"}` },
			el("div", { class: "badge-icon" }, a.icon),
			el("div", { class: "badge-name" }, L(a.name)),
			el("div", { class: "badge-desc" }, L(a.desc)),
			el(
				"div",
				{ class: "badge-bar" },
				el("span", { style: { width: `${a.progress * 100}%` } }),
			),
			el("div", { class: "badge-prog" }, `${a.value} / ${a.goal}`),
		);
		grid.append(card);
	}
	root.append(grid);
}
