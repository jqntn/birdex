import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const CACHE_RE = /const CACHE = ['"][^'"]*['"];/;

export function makeBuildId(d = new Date()) {
	const p = (n) => String(n).padStart(2, "0");
	return (
		`${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-` +
		`${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
	);
}

export function stampVersion(build = makeBuildId()) {
	writeFileSync(join(ROOT, "version.js"), `export const BUILD = "${build}";\n`);

	const swPath = join(ROOT, "sw.js");
	if (existsSync(swPath)) {
		let sw = readFileSync(swPath, "utf8");
		if (CACHE_RE.test(sw)) {
			sw = sw.replace(CACHE_RE, `const CACHE = "birdex-${build}";`);
			writeFileSync(swPath, sw);
			console.log(`[version] BUILD=${build}, sw.js cache → birdex-${build}`);
		} else {
			console.warn("[version] sw.js found but no CACHE constant to replace");
		}
	} else {
		console.log(`[version] BUILD=${build} (sw.js not present yet)`);
	}
	return build;
}

if (process.argv[1]?.endsWith("stampVersion.js")) {
	stampVersion();
}
