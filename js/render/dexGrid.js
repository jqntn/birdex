import { speciesCode } from "../data/taxonomy.js";
import { t } from "../i18n.js";
import { state, subscribe } from "../state.js";
import { clear, el } from "../util/dom.js";
import { card } from "./components.js";

const CARD_H = 132;
const GAP = 10;
const CARD_MIN_W = 104;
const ROW_H = CARD_H + GAP;
const BUFFER = 3;

let scroll;
let top;
let win;
let bottom;
let empty;
let cols = 2;
let onCardClick = null;
let scheduled = false;

function mountGrid(root, { onSelect } = {}) {
	onCardClick = onSelect;
	clear(root);
	scroll = el("div", { class: "dex-scroll", id: "dex-scroll" });
	top = el("div", { class: "dex-spacer" });
	win = el("div", { class: "dex-window" });
	bottom = el("div", { class: "dex-spacer" });
	empty = el(
		"div",
		{ class: "dex-empty", style: { display: "none" } },
		t("noMatch"),
	);
	scroll.append(top, win, bottom, empty);
	root.append(scroll);

	scroll.addEventListener("scroll", scheduleRender, { passive: true });
	win.addEventListener("click", (e) => {
		const c = e.target.closest(".card");
		if (c && onCardClick) {
			onCardClick(Number(c.dataset.idx));
		}
	});

	const ro = new ResizeObserver(() => {
		const w = scroll.clientWidth;
		const next = Math.max(2, Math.floor((w + GAP) / (CARD_MIN_W + GAP)));
		if (next !== cols) {
			cols = next;
			win.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
			render();
		}
	});
	ro.observe(scroll);

	win.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

	subscribe(["visible"], () => {
		scroll.scrollTop = 0;
		render();
	});
	subscribe(["caughtSet", "newLifers", "locale"], render);
}

function scheduleRender() {
	if (scheduled) {
		return;
	}
	scheduled = true;
	requestAnimationFrame(() => {
		scheduled = false;
		render();
	});
}

function render() {
	if (!scroll) {
		return;
	}
	const list = state.visible;
	const total = list.length;

	empty.style.display = total === 0 ? "block" : "none";
	if (total === 0) {
		clear(win);
		top.style.height = "0px";
		bottom.style.height = "0px";
		return;
	}

	const rows = Math.ceil(total / cols);
	const viewH = scroll.clientHeight || window.innerHeight;
	const st = scroll.scrollTop;
	const firstRow = Math.max(0, Math.floor(st / ROW_H) - BUFFER);
	const lastRow = Math.min(rows - 1, Math.ceil((st + viewH) / ROW_H) + BUFFER);

	const startIdx = firstRow * cols;
	const endIdx = Math.min(total, (lastRow + 1) * cols);

	top.style.height = `${firstRow * ROW_H}px`;
	bottom.style.height = `${Math.max(0, (rows - 1 - lastRow) * ROW_H)}px`;

	clear(win);
	const frag = document.createDocumentFragment();
	for (let k = startIdx; k < endIdx; k += 1) {
		const i = list[k];
		const caught = state.caughtSet.has(i);
		const shiny =
			caught && Boolean(state.save?.species?.[speciesCode(i)]?.shiny);
		frag.append(card(i, { caught, isNew: state.newLifers.has(i), shiny }));
	}
	win.append(frag);
}

function refreshGrid() {
	render();
}

export { mountGrid, refreshGrid };
