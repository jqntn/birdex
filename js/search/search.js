import Fuse from "../../vendor/fuse.esm.js";
import { commonName, count, loadNames, sciName } from "../data/taxonomy.js";

let fuse = null;
let building = null;

export function buildIndex() {
	if (fuse) {
		return fuse;
	}
	if (building) {
		return building;
	}
	building = (async () => {
		await Promise.all([loadNames("fr"), loadNames("en")]);
		const n = count();
		const docs = new Array(n);
		for (let i = 0; i < n; i += 1) {
			docs[i] = {
				i,
				sci: sciName(i),
				fr: commonName(i, "fr"),
				en: commonName(i, "en"),
			};
		}
		fuse = new Fuse(docs, {
			keys: [
				{ name: "fr", weight: 2 },
				{ name: "en", weight: 2 },
				{ name: "sci", weight: 1 },
			],
			threshold: 0.34,
			ignoreLocation: true,
			minMatchCharLength: 2,
			includeScore: false,
		});
		return fuse;
	})();
	return building;
}

export function search(query) {
	if (!(fuse && query.trim())) {
		return null;
	}
	return fuse.search(query.trim()).map((r) => r.item.i);
}
