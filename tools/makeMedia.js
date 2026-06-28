import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const API = "https://en.wikipedia.org/w/api.php";
const UA = "Birdex/1.0 (https://jqntn.github.io/birdex) media-manifest-builder";
const BATCH = 50;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PX_RE = /\d+px/;
const FILE_PREFIX_RE = /^File:/;

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decodeEntities = (s) =>
	String(s).replace(
		/&(?:#(\d+)|#x([0-9a-f]+)|(amp|lt|gt|quot|apos|nbsp));/gi,
		(m, dec, hex, name) => {
			let fromHex;
			if (hex) {
				fromHex = String.fromCodePoint(Number.parseInt(hex, 16));
			} else {
				fromHex = ENT[name.toLowerCase()] ?? m;
			}
			if (dec) {
				return String.fromCodePoint(Number(dec));
			}
			return fromHex;
		},
	);
const strip = (html) => {
	if (html) {
		return decodeEntities(String(html).replace(/<[^>]+>/g, ""))
			.replace(/\s+/g, " ")
			.trim();
	}
	return "";
};

async function api(params) {
	const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
	for (let attempt = 0; ; attempt += 1) {
		let res;
		try {
			res = await fetch(url, {
				headers: { "User-Agent": UA, accept: "application/json" },
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

async function leadImages(sci) {
	const out = new Array(sci.length).fill(null);
	for (let i = 0; i < sci.length; i += BATCH) {
		const slice = sci.slice(i, i + BATCH);
		const q =
			(
				await api({
					action: "query",
					redirects: "1",
					titles: slice.join("|"),
					prop: "pageimages",
					piprop: "name",
				})
			).query || {};
		const norm = new Map((q.normalized || []).map((n) => [n.from, n.to]));
		const redir = new Map((q.redirects || []).map((r) => [r.from, r.to]));
		const page = new Map((q.pages || []).map((p) => [p.title, p]));
		for (let j = 0; j < slice.length; j += 1) {
			let t = slice[j];
			if (norm.has(t)) {
				t = norm.get(t);
			}
			if (redir.has(t)) {
				t = redir.get(t);
			}
			const p = page.get(t);
			if (p?.pageimage) {
				out[i + j] = p.pageimage.replace(/ /g, "_");
			}
		}
		if ((i / BATCH) % 20 === 0) {
			console.log(`[media] lead images ${i}/${sci.length}`);
		}
		await sleep(100);
	}
	return out;
}

const ODD_MIME = (mime) =>
	mime === "image/tiff" ||
	mime.startsWith("video/") ||
	mime === "application/ogg" ||
	mime === "image/svg+xml";
function thumbTemplate(file, ii) {
	if (!(ii.thumburl && ODD_MIME(ii.mime || ""))) {
		return null;
	}
	const name = decodeURIComponent(
		new URL(ii.thumburl).pathname.split("/").pop(),
	);
	return name.replace(PX_RE, "{w}px").replace(file, "{f}");
}

async function imageInfo(files) {
	const info = new Map();
	const uniq = [...new Set(files.filter(Boolean))];
	for (let i = 0; i < uniq.length; i += BATCH) {
		const slice = uniq.slice(i, i + BATCH);
		const q =
			(
				await api({
					action: "query",
					titles: slice.map((f) => `File:${f}`).join("|"),
					prop: "imageinfo",
					iiprop: "extmetadata|mime|size|url",
					iiurlwidth: "1280",
					iiextmetadatafilter: ["Artist", "LicenseShortName"].join("|"),
				})
			).query || {};
		for (const p of q.pages || []) {
			const ii = p.imageinfo?.[0];
			if (!ii) {
				continue;
			}
			const file = p.title.replace(FILE_PREFIX_RE, "").replace(/ /g, "_");
			const m = ii.extmetadata || {};
			const t = thumbTemplate(file, ii);
			let tField = {};
			if (t) {
				tField = { t };
			}
			info.set(file, {
				by: strip(m.Artist?.value),
				l: strip(m.LicenseShortName?.value),
				mime: ii.mime || "",
				w: ii.width || 0,
				h: ii.height || 0,
				...tField,
			});
		}
		if ((i / BATCH) % 20 === 0) {
			console.log(`[media] image info ${i}/${uniq.length}`);
		}
		await sleep(100);
	}
	return info;
}

(async () => {
	const core = JSON.parse(
		readFileSync(join(DATA_DIR, "taxonomy.core.json"), "utf8"),
	);
	const { sci } = core;
	console.log(`[media] resolving lead images for ${sci.length} species…`);
	const files = await leadImages(sci);
	console.log(
		`[media] ${files.filter(Boolean).length} lead images found; fetching attribution…`,
	);
	const info = await imageInfo(files);

	const items = {};
	let kept = 0;
	let skipped = 0;
	for (let i = 0; i < sci.length; i += 1) {
		const file = files[i];
		if (!file) {
			continue;
		}
		const inf = info.get(file);
		if (!inf) {
			skipped += 1;
			continue;
		}
		const h = createHash("md5").update(file).digest("hex").slice(0, 2);
		const portrait = inf.h && inf.w && inf.h > inf.w;
		let phField = {};
		if (portrait) {
			phField = { ph: inf.h };
		}
		let tField = {};
		if (inf.t) {
			tField = { t: inf.t };
		}
		items[i] = {
			f: file,
			h,
			by: inf.by || "",
			l: inf.l || "",
			w: inf.w || 0,
			...phField,
			...tField,
		};
		kept += 1;
	}

	const dest = join(DATA_DIR, "media.json");
	const text = JSON.stringify({ count: sci.length, items });
	writeFileSync(dest, text);
	const pct = ((kept / sci.length) * 100).toFixed(1);
	console.log(
		`[media] ${kept} species with photos (${pct}% coverage), ${skipped} skipped → data/media.json (${(text.length / 1024).toFixed(0)} KB)`,
	);
})();
