import { DEFAULT_LOCALE, DEFAULT_REGION, LS_KEY } from "./config.js";
import { ignore } from "./util/noop.js";

const blankSave = () => ({
	version: 1,
	importedAt: null,
	locale: DEFAULT_LOCALE,
	region: DEFAULT_REGION,
	skippedOnboarding: false,
	species: {},
	agg: null,
	achievements: {},
	prevSnapshot: [],
});

export function loadSave() {
	try {
		const raw = localStorage.getItem(LS_KEY);
		if (!raw) {
			return null;
		}
		const obj = JSON.parse(raw);
		return { ...blankSave(), ...obj };
	} catch {
		return null;
	}
}

export function saveAll(save) {
	try {
		localStorage.setItem(LS_KEY, JSON.stringify(save));
	} catch {
		ignore();
	}
}

export function patchSave(current, patch) {
	const save = current || blankSave();
	Object.assign(save, patch);
	saveAll(save);
	return save;
}

export function clearAll() {
	try {
		localStorage.removeItem(LS_KEY);
	} catch {
		ignore();
	}
}

export { blankSave };
