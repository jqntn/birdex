import { RARITY } from "../config.js";
import { CONTINENT_NAMES, COUNTRY_NAMES } from "../data/continents.js";
import { regionMeta, regionSpeciesCount } from "../data/regions.js";
import { count, familyIdxOf, familyName, idxOfCode } from "../data/taxonomy.js";
import { getLocale, t } from "../i18n.js";
import { state } from "../state.js";
import { clear, el } from "../util/dom.js";
import { flagEmoji } from "../util/format.js";
import { progressBar } from "./components.js";

const L = (o) => (getLocale() === "fr" ? o.fr : o.en);

export function renderStats(root) {
	clear(root);
	const { save } = state;
	const agg = save?.agg;
	const total = count();

	root.append(el("div", { class: "page-head" }, el("h2", {}, t("stats"))));

	if (!agg) {
		root.append(el("div", { class: "muted" }, t("welcomeSub")));
		return;
	}

	const rDenom = regionSpeciesCount(state.region, total);
	const rm = regionMeta(state.region);
	root.append(
		el(
			"section",
			{ class: "stat-block" },
			progressBar(
				agg.seenInRegion,
				rDenom,
				`${t("completion")} — ${rm ? L(rm) : t("world")}`,
			),
			progressBar(agg.liferCount, total, `${t("completion")} — ${t("world")}`),
		),
	);

	const liferByDate = {};
	for (const code of Object.keys(save.species)) {
		const d = save.species[code]?.date;
		if (d) {
			liferByDate[d] = (liferByDate[d] || 0) + 1;
		}
	}
	let liferDay = null;
	for (const [d, c] of Object.entries(liferByDate)) {
		if (!liferDay || c > liferDay.count) {
			liferDay = { date: d, count: c };
		}
	}
	const speciesDay = "biggestLiferDay" in agg ? agg.biggestDay : null;

	const dayHero = (d, label) =>
		el(
			"section",
			{ class: "stat-hero" },
			el("div", { class: "hero-num" }, String(d.count)),
			el(
				"div",
				{ class: "hero-txt" },
				el("div", { class: "hero-label" }, label),
				el("div", { class: "hero-sub" }, d.date),
			),
		);
	if (liferDay || speciesDay) {
		const row = el("div", { class: "stat-hero-row" });
		if (liferDay) {
			row.append(dayHero(liferDay, t("biggestLiferDay")));
		}
		if (speciesDay) {
			row.append(dayHero(speciesDay, t("biggestDay")));
		}
		root.append(row);
	}

	const years = Object.keys(agg.byYear).sort();
	if (years.length > 0) {
		const max = Math.max(...years.map((y) => agg.byYear[y]));
		const chart = el("div", { class: "bar-chart" });
		for (const y of years) {
			const v = agg.byYear[y];
			chart.append(
				el(
					"div",
					{ class: "bar-col" },
					el("div", { class: "bar-val" }, String(v)),
					el("div", {
						class: "bar",
						style: { height: `${Math.max(6, (v / max) * 100)}%` },
					}),
					el("div", { class: "bar-x" }, y),
				),
			);
		}
		root.append(section(t("perYear"), chart));
	}

	const rdist = agg.byRarity;
	const rtotal = Object.values(rdist).reduce((a, b) => a + b, 0) || 1;
	const stack = el("div", { class: "rarity-stack" });
	for (const r of RARITY) {
		const v = rdist[r.id] || 0;
		if (!v) {
			continue;
		}
		stack.append(
			el("span", {
				class: `r-${r.id}`,
				style: { width: `${(v / rtotal) * 100}%` },
				title: `${L(r)}: ${v}`,
			}),
		);
	}
	const legend = el(
		"div",
		{ class: "rarity-legend" },
		...RARITY.map((r) =>
			el(
				"span",
				{ class: "leg" },
				el("i", { class: `dot r-${r.id}` }),
				`${L(r)} ${rdist[r.id] || 0}`,
			),
		),
	);
	root.append(section(t("rarityDist"), el("div", {}, stack, legend)));

	const famCount = new Map();
	for (const code of Object.keys(save.species)) {
		const i = idxOfCode(code);
		if (i === null || i === undefined) {
			continue;
		}
		const fi = familyIdxOf(i);
		famCount.set(fi, (famCount.get(fi) || 0) + 1);
	}
	const topFams = [...famCount.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 8);
	if (topFams.length > 0) {
		const [[, maxF]] = topFams;
		const rows = el("div", { class: "hbars" });
		for (const [fi, v] of topFams) {
			rows.append(
				el(
					"div",
					{ class: "hbar-row" },
					el("span", { class: "hbar-label" }, familyName(fi, getLocale())),
					el(
						"span",
						{ class: "hbar-track" },
						el("span", {
							class: "hbar-fill",
							style: { width: `${(v / maxF) * 100}%` },
						}),
					),
					el("span", { class: "hbar-val" }, String(v)),
				),
			);
		}
		root.append(section(t("topFamilies"), rows));
	}

	const countries = Object.entries(agg.byCountry).sort((a, b) => b[1] - a[1]);
	if (countries.length > 0) {
		const chips = el(
			"div",
			{ class: "chips" },
			...countries.map(([cc, v]) =>
				el(
					"span",
					{ class: "chip" },
					`${flagEmoji(cc)} ${COUNTRY_NAMES[cc] || cc} ${v}`,
				),
			),
		);
		root.append(section(`${t("countries")} (${countries.length})`, chips));
	}
	if (agg.continents?.length > 0) {
		const chips = el(
			"div",
			{ class: "chips" },
			...agg.continents.map((c) =>
				el(
					"span",
					{ class: "chip" },
					L(CONTINENT_NAMES[c] || { fr: c, en: c }),
				),
			),
		);
		root.append(
			section(`${t("continents")} (${agg.continents.length})`, chips),
		);
	}
}

function section(title, body) {
	return el(
		"section",
		{ class: "stat-block" },
		el("h3", { class: "stat-title" }, title),
		body,
	);
}
