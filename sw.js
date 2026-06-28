const CACHE = "birdex-20260628-154052";
const THUMBS = "birdex-thumbs";
const THUMBS_MAX = 600;

const ignore = () => undefined;

const PRECACHE = [
	"./",
	"./index.html",
	"./css/styles.css",
	"./manifest.webmanifest",
	"./version.js",
	"./vendor/fuse.esm.js",
	"./assets/icons/icon.svg",
	"./assets/icons/icon-192.png",
	"./assets/icons/icon-512.png",
	"./assets/icons/maskable-512.png",
	"./js/app.js",
	"./js/config.js",
	"./js/state.js",
	"./js/persistence.js",
	"./js/i18n.js",
	"./js/util/dom.js",
	"./js/util/hash.js",
	"./js/util/format.js",
	"./js/util/noop.js",
	"./js/data/taxonomy.js",
	"./js/data/regions.js",
	"./js/data/rarity.js",
	"./js/data/continents.js",
	"./js/csv/ebirdParser.js",
	"./js/import/derive.js",
	"./js/import/importFlow.js",
	"./js/search/search.js",
	"./js/render/components.js",
	"./js/render/dexGrid.js",
	"./js/render/filters.js",
	"./js/render/detailView.js",
	"./js/render/statsPage.js",
	"./js/render/achievements.js",
	"./data/taxonomy.core.json",
	"./data/taxonomy.meta.json",
	"./data/taxonomy.names.fr.json",
	"./data/taxonomy.names.en.json",
	"./data/rarity.json",
	"./data/regions/_index.json",
	"./data/regions/world.json",
	"./data/media.json",
	"./data/regionNames.json",
];

async function cacheOne(c, u) {
	try {
		const r = await fetch(u, { cache: "reload" });
		if (r.ok) {
			await c.put(u, r);
		}
	} catch {
		ignore();
	}
}

async function precache() {
	const c = await caches.open(CACHE);
	await Promise.all(PRECACHE.map((u) => cacheOne(c, u)));
	await globalThis.skipWaiting();
}

globalThis.addEventListener("install", (e) => {
	e.waitUntil(precache());
});

globalThis.addEventListener("activate", (e) => {
	e.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((k) => k !== CACHE && k !== THUMBS)
						.map((k) => caches.delete(k)),
				),
			)
			.then(() => globalThis.clients.claim()),
	);
});

globalThis.addEventListener("fetch", (e) => {
	const { request } = e;
	if (request.method !== "GET") {
		return;
	}
	const url = new URL(request.url);

	if (
		url.hostname.endsWith("wikipedia.org") ||
		url.hostname.endsWith("wikimedia.org")
	) {
		e.respondWith(thumbStrategy(request));
		return;
	}

	if (url.origin !== location.origin) {
		return;
	}

	if (request.mode === "navigate") {
		e.respondWith(
			fetch(request)
				.then((r) => {
					const copy = r.clone();
					caches.open(CACHE).then((c) => c.put("./index.html", copy));
					return r;
				})
				.catch(() => caches.match("./index.html")),
		);
		return;
	}

	if (url.pathname.includes("/data/")) {
		e.respondWith(cacheFirst(request));
		return;
	}

	e.respondWith(staleWhileRevalidate(request));
});

async function cacheFirst(request) {
	const cached = await caches.match(request);
	if (cached) {
		return cached;
	}
	const res = await fetch(request);
	if (res.ok) {
		(await caches.open(CACHE)).put(request, res.clone());
	}
	return res;
}

async function staleWhileRevalidate(request) {
	const cache = await caches.open(CACHE);
	const cached = await cache.match(request);
	const network = fetch(request)
		.then((res) => {
			if (res.ok) {
				cache.put(request, res.clone());
			}
			return res;
		})
		.catch(() => cached);
	return cached || network;
}

async function thumbStrategy(request) {
	const cache = await caches.open(THUMBS);
	const cached = await cache.match(request);
	if (cached) {
		return cached;
	}
	try {
		const res = await fetch(request);
		if (res.ok) {
			cache.put(request, res.clone());
			trimCache(cache, THUMBS_MAX);
		}
		return res;
	} catch {
		return cached || Response.error();
	}
}

async function trimCache(cache, max) {
	const keys = await cache.keys();
	if (keys.length <= max) {
		return;
	}
	for (let i = 0; i < keys.length - max; i += 1) {
		cache.delete(keys[i]);
	}
}
