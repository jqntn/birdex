import { DATA, EBIRD_EXPORT_URL } from "../config.js";
import { parseEbirdData } from "../csv/ebirdParser.js";
import * as tax from "../data/taxonomy.js";
import { t } from "../i18n.js";
import { patchSave } from "../persistence.js";
import { reconcileAchievements } from "../render/achievements.js";
import { emit, state } from "../state.js";
import { clear, el } from "../util/dom.js";
import { deriveFromSightings } from "./derive.js";

let cbImported = null;
let cbSkip = null;

export function setImportCallbacks({ onImported, onSkip }) {
	cbImported = onImported;
	cbSkip = onSkip;
}

export function recomputeRegionStats(save, regionSet) {
	if (!save?.agg) {
		return save;
	}
	let seen = 0;
	for (const code in save.species) {
		const i = tax.idxOfCode(code);
		const inRegion = regionSet
			? i !== null && i !== undefined && regionSet.has(i)
			: true;
		save.species[code].outOfRegion = !inRegion;
		if (inRegion) {
			seen++;
		}
	}
	save.agg.seenInRegion = seen;
	return save;
}

export function importText(text) {
	const parsed = parseEbirdData(text);
	const prev = state.save;
	const prevShiny = prev?.species
		? Object.keys(prev.species).filter((c) => prev.species[c].shiny)
		: [];
	const { species, caughtSet, agg, unmatched } = deriveFromSightings(
		parsed.sightings,
		state.regionSet,
		parsed.biggestDay,
		prevShiny,
	);

	const hadPrevImport = Boolean(prev?.importedAt);
	const prevSnapshot = new Set(prev?.prevSnapshot || []);

	const newCodes = Object.keys(species);
	const newLifers = new Set();
	if (hadPrevImport) {
		for (const code of newCodes) {
			if (!prevSnapshot.has(code)) {
				const i = tax.idxOfCode(code);
				if (i !== null && i !== undefined) {
					newLifers.add(i);
				}
			}
		}
	}

	const save = patchSave(prev, {
		importedAt: Date.now(),
		species,
		agg,
		prevSnapshot: newCodes,
		skippedOnboarding: true,
	});
	const freshAchievements = reconcileAchievements(save, Date.now());
	patchSave(save, {});

	emit({ save, caughtSet, newLifers });

	const summary = {
		countable: parsed.countable,
		skipped: parsed.skipped,
		unmatched: unmatched.length,
		newLifers: newLifers.size,
		freshAchievements,
	};
	cbImported?.(summary);
	return summary;
}

async function handleFile(file) {
	const text = await file.text();
	importText(text);
}

export async function loadDemo() {
	if (state.save?.importedAt && !confirm(t("replaceConfirm"))) {
		return;
	}
	try {
		const res = await fetch(DATA.demo, { cache: "no-cache" });
		if (!res.ok) {
			throw new Error(String(res.status));
		}
		importText(await res.text());
	} catch {
		alert(t("demoError"));
	}
}

function demoButton() {
	return el(
		"button",
		{ class: "btn demo", type: "button", onclick: () => loadDemo() },
		t("demoBtn"),
	);
}

export function renderOnboarding(root) {
	clear(root);
	const card = el(
		"div",
		{ class: "onboard" },
		el("div", { class: "onboard-logo" }, "🪶"),
		el("h1", { class: "onboard-title" }, t("welcomeTitle")),
		el("p", { class: "onboard-sub" }, t("welcomeSub")),
		el(
			"ol",
			{ class: "onboard-steps" },
			el(
				"li",
				{},
				t("step1"),
				el(
					"a",
					{
						class: "btn primary",
						href: EBIRD_EXPORT_URL,
						target: "_blank",
						rel: "noopener",
					},
					t("step1btn"),
				),
			),
			el("li", {}, t("step2"), dropzone()),
		),
		demoButton(),
		el(
			"button",
			{ class: "btn ghost", type: "button", onclick: () => cbSkip?.() },
			t("skip"),
		),
	);
	root.append(card);
}

export function dropzone() {
	const input = el("input", {
		type: "file",
		accept: ".csv,text/csv",
		style: { display: "none" },
		onchange: (e) => {
			if (e.target.files[0]) {
				handleFile(e.target.files[0]);
			}
		},
	});
	const zone = el(
		"div",
		{ class: "dropzone", tabindex: "0" },
		el("div", { class: "dz-icon" }, "⬇"),
		el("div", { class: "dz-hint" }, t("dropHint")),
		input,
	);
	zone.addEventListener("click", () => input.click());
	zone.addEventListener("keydown", (e) => {
		if (e.key === "Enter" || e.key === " ") {
			input.click();
		}
	});
	zone.addEventListener("dragover", (e) => {
		e.preventDefault();
		zone.classList.add("drag");
	});
	zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
	zone.addEventListener("drop", (e) => {
		e.preventDefault();
		zone.classList.remove("drag");
		const f = e.dataTransfer.files[0];
		if (f) {
			handleFile(f);
		}
	});
	return zone;
}
