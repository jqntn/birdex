const TAXONOMY_URL = "https://api.ebird.org/v2/ref/taxonomy/ebird";
const SPPLIST_URL = "https://api.ebird.org/v2/product/spplist";

export async function fetchTaxonomyCSV({ locale } = {}) {
	const params = new URLSearchParams({ fmt: "csv", cat: "species" });
	if (locale) {
		params.set("locale", locale);
	}
	const url = `${TAXONOMY_URL}?${params}`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`taxonomy fetch ${res.status} for ${url}`);
	}
	return res.text();
}

export async function fetchRegionSpecies(regionCode, apiKey) {
	const url = `${SPPLIST_URL}/${regionCode}`;
	const res = await fetch(url, { headers: { "X-eBirdApiToken": apiKey } });
	if (res.status === 404) {
		return null;
	}
	if (!res.ok) {
		const body = await res.text().catch(() => "");
		const err = new Error(
			`spplist ${res.status} for ${regionCode}: ${body.slice(0, 120)}`,
		);
		err.status = res.status;
		throw err;
	}
	return res.json();
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
