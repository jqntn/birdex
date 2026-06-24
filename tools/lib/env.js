import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ENV_LINE_RE = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i;

const ignore = () => undefined;

export function loadEnv() {
	try {
		const text = readFileSync(join(__dirname, "..", ".env"), "utf8");
		for (const line of text.split("\n")) {
			const m = line.match(ENV_LINE_RE);
			if (!m) {
				continue;
			}
			const [, key, rawVal] = m;
			let val = rawVal.trim();
			if (
				(val.startsWith('"') && val.endsWith('"')) ||
				(val.startsWith("'") && val.endsWith("'"))
			) {
				val = val.slice(1, -1);
			}
			if (!(key in process.env)) {
				process.env[key] = val;
			}
		}
	} catch {
		ignore();
	}
}
