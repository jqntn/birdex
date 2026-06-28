import { RARITY } from "../config.js";
import { rarityTier } from "../data/rarity.js";
import {
	families,
	familyIdxOf,
	familyName,
	orderIdxOf,
	orders,
	speciesCode,
} from "../data/taxonomy.js";
import { getLocale, t } from "../i18n.js";
import { emit, state, subscribe } from "../state.js";
import { clear, el } from "../util/dom.js";

let onChange = null;
let rootEl = null;

function mountFilters(root, opts = {}) {
	({ onChange } = opts);
	rootEl = root;
	render(root);
	subscribe(["locale"], () => render(rootEl));
}

function render(root) {
	clear(root);
	const f = state.filters;

	const seen = el(
		"div",
		{ class: "seg" },
		...["all", "seen", "unseen"].map((v) => {
			let activeClass = "";
			if (f.seen === v) {
				activeClass = " active";
			}
			return el(
				"button",
				{
					class: `seg-btn${activeClass}`,
					type: "button",
					onclick: () => {
						emit({ filters: { ...state.filters, seen: v } });
						render(root);
						onChange?.();
					},
				},
				t(v),
			);
		}),
	);

	const orderSel = el(
		"select",
		{
			class: "sel",
			onchange: (e) => {
				let oi = null;
				if (e.target.value !== "") {
					oi = Number(e.target.value);
				}
				emit({ filters: { ...state.filters, orderIdx: oi, familyIdx: null } });
				render(root);
				onChange?.();
			},
		},
		el("option", { value: "" }, t("order")),
		...orders().map((o, i) =>
			el("option", { value: i, selected: f.orderIdx === i }, o.name),
		),
	);

	const fams = families()
		.map((fam, i) => ({ fam, i }))
		.filter(
			({ fam }) =>
				f.orderIdx === null ||
				f.orderIdx === undefined ||
				fam.orderIdx === f.orderIdx,
		)
		.sort((a, b) =>
			familyName(a.i, getLocale()).localeCompare(familyName(b.i, getLocale())),
		);
	const famSel = el(
		"select",
		{
			class: "sel",
			onchange: (e) => {
				let familyIdx = null;
				if (e.target.value !== "") {
					familyIdx = Number(e.target.value);
				}
				emit({
					filters: {
						...state.filters,
						familyIdx,
					},
				});
				onChange?.();
			},
		},
		el("option", { value: "" }, t("family")),
		...fams.map(({ i }) =>
			el(
				"option",
				{ value: i, selected: f.familyIdx === i },
				familyName(i, getLocale()),
			),
		),
	);

	const rarSel = el(
		"select",
		{
			class: "sel",
			onchange: (e) => {
				let rarity = null;
				if (e.target.value !== "") {
					rarity = e.target.value;
				}
				emit({
					filters: {
						...state.filters,
						rarity,
					},
				});
				onChange?.();
			},
		},
		el("option", { value: "" }, t("rarity")),
		...RARITY.map((r) => {
			let label = r.en;
			if (getLocale() === "fr") {
				label = r.fr;
			}
			return el("option", { value: r.id, selected: f.rarity === r.id }, label);
		}),
	);

	const shinySel = el(
		"select",
		{
			class: "sel",
			onchange: (e) => {
				let shiny = null;
				if (e.target.value !== "") {
					shiny = e.target.value;
				}
				emit({
					filters: {
						...state.filters,
						shiny,
					},
				});
				onChange?.();
			},
		},
		el("option", { value: "" }, t("shiny")),
		el(
			"option",
			{ value: "shiny", selected: f.shiny === "shiny" },
			t("shinyOnly"),
		),
		el(
			"option",
			{ value: "regular", selected: f.shiny === "regular" },
			t("notShiny"),
		),
	);

	const sortSel = el(
		"select",
		{
			class: "sel sort-sel",
			onchange: (e) => {
				emit({ sort: e.target.value });
				onChange?.();
			},
		},
		...[
			["dex", "sortDex"],
			["name", "sortName"],
			["rarity", "sortRarity"],
			["count", "sortCount"],
			["date", "sortDate"],
		].map(([value, key]) =>
			el("option", { value, selected: state.sort === value }, t(key)),
		),
	);

	root.append(seen, orderSel, famSel, rarSel, shinySel, sortSel);
}

function isShiny(i) {
	return Boolean(state.save.species[speciesCode(i)]?.shiny);
}

function filterPredicate() {
	const f = state.filters;
	const caught = state.caughtSet;
	const region = state.regionSet;
	return (i) => {
		if (!region.has(i)) {
			return false;
		}
		if (f.seen === "seen" && !caught.has(i)) {
			return false;
		}
		if (f.seen === "unseen" && caught.has(i)) {
			return false;
		}
		if (
			f.orderIdx !== null &&
			f.orderIdx !== undefined &&
			orderIdxOf(i) !== f.orderIdx
		) {
			return false;
		}
		if (
			f.familyIdx !== null &&
			f.familyIdx !== undefined &&
			familyIdxOf(i) !== f.familyIdx
		) {
			return false;
		}
		if (
			f.rarity !== null &&
			f.rarity !== undefined &&
			RARITY[rarityTier(i)].id !== f.rarity
		) {
			return false;
		}
		if (f.shiny === "shiny" && !isShiny(i)) {
			return false;
		}
		if (f.shiny === "regular" && isShiny(i)) {
			return false;
		}
		return true;
	};
}

export { filterPredicate, mountFilters };
