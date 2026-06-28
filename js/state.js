import { DEFAULT_LOCALE, DEFAULT_REGION } from "./config.js";
import { ALL_REGIONS } from "./data/regions.js";
import { blankSave } from "./persistence.js";

const state = {
	locale: DEFAULT_LOCALE,
	region: DEFAULT_REGION,

	save: blankSave(),
	caughtSet: new Set(),
	regionSet: ALL_REGIONS,

	filters: {
		seen: "all",
		orderIdx: null,
		familyIdx: null,
		rarity: null,
		shiny: null,
	},
	sort: "dex",
	sortDir: "fwd",
	query: "",
	visible: [],

	newLifers: new Set(),
};

const subs = new Map();

function subscribe(keys, fn) {
	for (const k of [].concat(keys)) {
		if (!subs.has(k)) {
			subs.set(k, new Set());
		}
		subs.get(k).add(fn);
	}
	return () => {
		for (const k of [].concat(keys)) {
			subs.get(k)?.delete(fn);
		}
	};
}

function emit(patch) {
	Object.assign(state, patch);
	const notified = new Set();
	for (const k of Object.keys(patch)) {
		for (const fn of subs.get(k) || []) {
			if (!notified.has(fn)) {
				notified.add(fn);
				fn(state, k);
			}
		}
	}
}

export { emit, state, subscribe };
