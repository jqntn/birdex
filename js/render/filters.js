import { RARITY } from "../config.js";
import { rarityTier } from "../data/rarity.js";
import * as tax from "../data/taxonomy.js";
import { getLocale, t } from "../i18n.js";
import { emit, state, subscribe } from "../state.js";
import { clear, el } from "../util/dom.js";

let onChange = null;
let rootEl = null;

export function mountFilters(root, opts = {}) {
	onChange = opts.onChange;
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
		...["all", "seen", "unseen"].map((v) =>
			el(
				"button",
				{
					class: `seg-btn${f.seen === v ? " active" : ""}`,
					type: "button",
					onclick: () => {
						emit({ filters: { ...state.filters, seen: v } });
						render(root);
						onChange?.();
					},
				},
				t(v),
			),
		),
	);

	const orderSel = el(
		"select",
		{
			class: "sel",
			onchange: (e) => {
				const oi = e.target.value === "" ? null : Number(e.target.value);
				emit({ filters: { ...state.filters, orderIdx: oi, familyIdx: null } });
				render(root);
				onChange?.();
			},
		},
		el("option", { value: "" }, t("order")),
		...tax
			.orders()
			.map((o, i) =>
				el("option", { value: i, selected: f.orderIdx === i }, o.name),
			),
	);

	const fams = tax
		.families()
		.map((fam, i) => ({ fam, i }))
		.filter(
			({ fam }) =>
				f.orderIdx === null ||
				f.orderIdx === undefined ||
				fam.orderIdx === f.orderIdx,
		)
		.sort((a, b) =>
			tax
				.familyName(a.i, getLocale())
				.localeCompare(tax.familyName(b.i, getLocale())),
		);
	const famSel = el(
		"select",
		{
			class: "sel",
			onchange: (e) => {
				emit({
					filters: {
						...state.filters,
						familyIdx: e.target.value === "" ? null : Number(e.target.value),
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
				tax.familyName(i, getLocale()),
			),
		),
	);

	const rarSel = el(
		"select",
		{
			class: "sel",
			onchange: (e) => {
				emit({
					filters: {
						...state.filters,
						rarity: e.target.value === "" ? null : e.target.value,
					},
				});
				onChange?.();
			},
		},
		el("option", { value: "" }, t("rarity")),
		...RARITY.map((r) =>
			el(
				"option",
				{ value: r.id, selected: f.rarity === r.id },
				getLocale() === "fr" ? r.fr : r.en,
			),
		),
	);

	root.append(seen, orderSel, famSel, rarSel);
}

export function filterPredicate() {
	const f = state.filters;
	const caught = state.caughtSet;
	const region = state.regionSet;
	return (i) => {
		if (region && !region.has(i)) {
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
			tax.orderIdxOf(i) !== f.orderIdx
		) {
			return false;
		}
		if (
			f.familyIdx !== null &&
			f.familyIdx !== undefined &&
			tax.familyIdxOf(i) !== f.familyIdx
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
		return true;
	};
}
