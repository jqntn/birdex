import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data", "media.json");
const API = "https://en.wikipedia.org/w/api.php";
const UA = "Birdex/1.0 (https://jqntn.github.io/birdex) media-augment";
const BATCH = 50;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
	const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
	for (let attempt = 0; ; attempt++) {
		let res;
		try {
			res = await fetch(url, {
				headers: { "User-Agent": UA, Accept: "application/json" },
			});
		} catch (e) {
			if (attempt < 5) {
				await sleep(800 * 2 ** attempt);
				continue;
			}
			throw e;
		}
		if ((res.status === 429 || res.status >= 500) && attempt < 5) {
			await sleep(800 * 2 ** attempt);
			continue;
		}
		if (!res.ok) {
			throw new Error(`${res.status} ${url}`);
		}
		return res.json();
	}
}

const ODD_MIME = (mime) =>
	mime === "image/tiff" ||
	mime.startsWith("video/") ||
	mime === "application/ogg" ||
	mime === "image/svg+xml";
function thumbTemplate(file, ii) {
	if (!ii.thumburl) {
		return null;
	}
	const name = decodeURIComponent(
		new URL(ii.thumburl).pathname.split("/").pop(),
	);
	return name.replace(/\d+px/, "{w}px").replace(file, "{f}");
}

const titleToFile = (title) => title.replace(/^File:/, "").replace(/ /g, "_");

(async () => {
	const data = JSON.parse(readFileSync(DATA, "utf8"));
	const items = data.items || {};
	const fileToKeys = new Map();
	for (const k of Object.keys(items)) {
		const f = items[k].f;
		if (!f) {
			continue;
		}
		if (!fileToKeys.has(f)) {
			fileToKeys.set(f, []);
		}
		fileToKeys.get(f).push(k);
	}
	const files = [...fileToKeys.keys()];
	console.log(
		`[augment] ${files.length} unique files across ${Object.keys(items).length} items`,
	);

	const meta = new Map();
	for (let i = 0; i < files.length; i += BATCH) {
		const slice = files.slice(i, i + BATCH);
		const q =
			(
				await api({
					action: "query",
					titles: slice.map((f) => `File:${f}`).join("|"),
					prop: "imageinfo",
					iiprop: "size|mime",
				})
			).query || {};
		for (const p of q.pages || []) {
			const ii = p.imageinfo?.[0];
			if (!ii) {
				continue;
			}
			meta.set(titleToFile(p.title), {
				w: ii.width || 0,
				h: ii.height || 0,
				mime: ii.mime || "",
			});
		}
		if ((i / BATCH) % 20 === 0) {
			console.log(`[augment] size ${i}/${files.length}`);
		}
		await sleep(100);
	}

	const odd = files.filter((f) => ODD_MIME(meta.get(f)?.mime || ""));
	console.log(`[augment] ${odd.length} odd-format files needing a template`);
	const tmpl = new Map();
	for (let i = 0; i < odd.length; i += BATCH) {
		const slice = odd.slice(i, i + BATCH);
		const q =
			(
				await api({
					action: "query",
					titles: slice.map((f) => `File:${f}`).join("|"),
					prop: "imageinfo",
					iiprop: "mime|url",
					iiurlwidth: "1280",
				})
			).query || {};
		for (const p of q.pages || []) {
			const ii = p.imageinfo?.[0];
			if (!ii) {
				continue;
			}
			const file = titleToFile(p.title);
			const t = thumbTemplate(file, ii);
			if (t) {
				tmpl.set(file, t);
			}
		}
		await sleep(100);
	}

	let withW = 0;
	let withPh = 0;
	let withT = 0;
	let missing = 0;
	for (const [f, keys] of fileToKeys) {
		const m = meta.get(f);
		const t = tmpl.get(f);
		const portrait = m?.w && m.h && m.h > m.w;
		if (!m?.w) {
			missing++;
		}
		for (const k of keys) {
			const it = items[k];
			items[k] = {
				f: it.f,
				h: it.h,
				by: it.by || "",
				l: it.l || "",
				w: m?.w || 0,
				...(portrait ? { ph: m.h } : {}),
				...(t ? { t } : {}),
			};
			if (m?.w) {
				withW++;
			}
			if (portrait) {
				withPh++;
			}
			if (t) {
				withT++;
			}
		}
	}
	console.log(
		`[augment] set w on ${withW} items, ph on ${withPh} portraits, t on ${withT} items, ${missing} files missing width`,
	);

	writeFileSync(DATA, JSON.stringify({ count: data.count, items }));
	console.log(`[augment] wrote ${DATA}`);
})();
