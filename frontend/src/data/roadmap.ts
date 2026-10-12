import { useSyncExternalStore } from "react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ItemKind = "task" | "project" | "milestone";

export interface Item {
  id: string;
  label: string;
  kind: ItemKind;
}

export interface Stage {
  id: string;
  num: number;
  title: string;
  duration: string;
  summary: string;
  items: Item[];
}

export interface Roadmap {
  title: string;
  stages: Stage[];
}

export type Progress = Record<string, boolean>;

export interface ParsedItem {
  label: string;
  kind: ItemKind;
}

export interface ParsedStage {
  key: string;
  num: number | null;
  title: string;
  duration: string;
  summary: string;
  items: ParsedItem[];
  included: boolean;
  skipReason: string | null;
}

export interface ParseResult {
  title: string | null;
  stages: ParsedStage[];
}

/* ------------------------------------------------------------------ */
/* Persistent store (localStorage "database")                          */
/* ------------------------------------------------------------------ */

function createStore<T>(key: string, fallback: T) {
  const listeners = new Set<() => void>();

  const read = (): T => {
    try {
      const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };

  let cache: T = read();
  const emit = () => listeners.forEach((l) => l());

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === key) {
        cache = read();
        emit();
      }
    });
  }

  return {
    get: () => cache,
    set(next: T) {
      cache = next;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage unavailable: data lasts for this session only */
      }
      emit();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const roadmapStore = createStore<Roadmap>("myspace.roadmap.v1", { title: "", stages: [] });
const progressStore = createStore<Progress>("myspace.progress.v1", {});

export const useRoadmap = (): Roadmap =>
  useSyncExternalStore(roadmapStore.subscribe, roadmapStore.get);
export const useProgress = (): Progress =>
  useSyncExternalStore(progressStore.subscribe, progressStore.get);

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export function replaceRoadmap(title: string, stages: Stage[]): void {
  roadmapStore.set({ title, stages });
}

/** Appends stages, skipping any already present. Returns how many were added. */
export function appendStages(stages: Stage[]): number {
  const current = roadmapStore.get();
  const existing = new Set(current.stages.map((s) => s.id));
  const fresh = stages.filter((s) => !existing.has(s.id));
  roadmapStore.set({ ...current, stages: [...current.stages, ...fresh] });
  return fresh.length;
}

export function removeStage(id: string): void {
  const current = roadmapStore.get();
  roadmapStore.set({ ...current, stages: current.stages.filter((s) => s.id !== id) });
}

export function clearRoadmap(): void {
  roadmapStore.set({ title: "", stages: [] });
}

export function toggleItem(id: string): void {
  const current = progressStore.get();
  progressStore.set({ ...current, [id]: !current[id] });
}

export function resetProgress(): void {
  progressStore.set({});
}

/* ------------------------------------------------------------------ */
/* Stats shared by the Dashboard and the Planner                       */
/* ------------------------------------------------------------------ */

export type StageStatus = "not-started" | "in-progress" | "complete";

export interface StageStat {
  stage: Stage;
  done: number;
  total: number;
  percent: number;
  complete: boolean;
  status: StageStatus;
}

export function summarize(stages: Stage[], progress: Progress) {
  const perStage: StageStat[] = stages.map((stage) => {
    const done = stage.items.filter((i) => progress[i.id]).length;
    const total = stage.items.length;
    const complete = total > 0 && done === total;
    return {
      stage,
      done,
      total,
      percent: total ? Math.round((done / total) * 100) : 0,
      complete,
      status: complete ? "complete" : done > 0 ? "in-progress" : "not-started",
    };
  });
  const done = perStage.reduce((n, s) => n + s.done, 0);
  const total = perStage.reduce((n, s) => n + s.total, 0);
  const current = perStage.find((s) => !s.complete) ?? null;
  const nextItem = current ? current.stage.items.find((i) => !progress[i.id]) ?? null : null;
  const projectStages = stages.filter((s) => s.items.some((i) => i.kind === "project"));
  return {
    perStage,
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
    current,
    nextItem,
    stagesDone: perStage.filter((s) => s.complete).length,
    projectsBuilt: projectStages.filter((s) =>
      s.items.some((i) => i.kind === "project" && progress[i.id])
    ).length,
    projectsTotal: projectStages.length,
  };
}

/* ------------------------------------------------------------------ */
/* Guideline parser                                                    */
/*                                                                     */
/*   # Title               -> roadmap name                             */
/*   ## Stage 1: Name (2 weeks) -> a stage, with its duration          */
/*   plain line under heading -> stage summary                         */
/*   - bullet / 1. numbered  -> a step                                 */
/*   Project: ...            -> the stage's project                    */
/*   Done when: ...          -> the stage's checkpoint                 */
/* ------------------------------------------------------------------ */

type Token =
  | { type: "title"; text: string }
  | { type: "heading"; level: number; text: string }
  | { type: "bullet"; text: string }
  | { type: "text"; text: string };

const HEADING_RE = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const BULLET_RE = /^\s*(?:[-*•▪◦]|\d+[.)])\s+(?:\[[ xX]\]\s+)?(.+)$/;
const RULE_RE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const STAGE_RE = /^stage\s*(\d+)\b/i;
const LABEL_RE = /^(project|mini[- ]project|done when|milestone|checkpoint)\s*:\s*(.+)$/i;
const LABEL_ONLY_RE = /^(project|mini[- ]project|done when|milestone|checkpoint)\s*:?\s*$/i;

const clean = (s: string): string =>
  s
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__|`)/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\*+|\*+$/g, "")
    .trim();

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const kindFromLabel = (label: string): ItemKind =>
  /project/i.test(label) ? "project" : "milestone";

function firstSentence(s: string): string {
  const m = s.match(/^(.{20,200}?[.!?])(\s|$)/);
  if (m && m[1]) return m[1];
  return s.length > 200 ? `${s.slice(0, 197)}…` : s;
}

function parseHeading(raw: string): { num: number | null; title: string; duration: string } {
  let text = clean(raw);
  let num: number | null = null;
  const m = text.match(/^stage\s*(\d+)\s*[:.\-–—]?\s*(.*)$/i);
  if (m) {
    num = Number(m[1]);
    text = m[2] || text;
  }
  let duration = "";
  const d = text.match(/\s*\(([^()]*)\)\s*$/);
  if (d && d[1] && /\d|week|month|day|hour|ongoing/i.test(d[1])) {
    duration = d[1].trim();
    text = text.slice(0, d.index).trim();
  }
  text = text.replace(/[:\-–—]\s*$/, "").trim();
  return { num, title: text, duration };
}

function tokenize(input: string): Token[] {
  const out: Token[] = [];
  for (const raw of input.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim() || RULE_RE.test(line) || line.trim().startsWith("|")) continue;
    const h = line.match(HEADING_RE);
    if (h) {
      out.push({ type: "heading", level: (h[1] ?? "#").length, text: h[2] ?? "" });
      continue;
    }
    const b = line.match(BULLET_RE);
    if (b) {
      out.push({ type: "bullet", text: b[1] ?? "" });
      continue;
    }
    out.push({ type: "text", text: line.trim() });
  }
  return out;
}

export function parseGuideline(input: string): ParseResult {
  let tokens = tokenize(input);

  // Work out which heading level means "stage" and whether a single # is the title.
  const headings = tokens.filter(
    (t): t is Extract<Token, { type: "heading" }> => t.type === "heading"
  );
  const levels = [...new Set(headings.map((h) => h.level))].sort((a, b) => a - b);
  const h1Count = headings.filter((h) => h.level === 1).length;
  const h1IsTitle = levels.length > 1 && levels[0] === 1 && h1Count === 1;
  const stageLevel = h1IsTitle ? levels[1] ?? 2 : levels[0] ?? 1;

  tokens = tokens.map((t): Token => {
    if (t.type !== "heading") return t;
    if (h1IsTitle && t.level === 1) return { type: "title", text: t.text };
    if (t.level > stageLevel) return { type: "text", text: t.text };
    return t;
  });

  // "Stage 3 ..." written as a plain line still counts as a stage heading.
  tokens = tokens.map((t): Token => {
    if (t.type !== "text") return t;
    const c = clean(t.text);
    return STAGE_RE.test(c) && c.length <= 90
      ? { type: "heading", level: stageLevel, text: t.text }
      : t;
  });

  // No headings at all: a short plain line followed by bullets is a stage.
  if (!tokens.some((t) => t.type === "heading")) {
    const snapshot = tokens;
    tokens = snapshot.map((t, i): Token => {
      const next = snapshot[i + 1];
      if (t.type === "text" && next?.type === "bullet") {
        const c = clean(t.text);
        if (c.length <= 80 && !/[.!?]$/.test(c) && !LABEL_ONLY_RE.test(c) && !LABEL_RE.test(c)) {
          return { type: "heading", level: stageLevel, text: t.text };
        }
      }
      return t;
    });
  }

  let title: string | null = null;
  const stages: ParsedStage[] = [];
  let cur: ParsedStage | null = null;
  let pending: ItemKind | null = null;

  for (const t of tokens) {
    if (t.type === "title") {
      title = clean(t.text);
      continue;
    }
    if (t.type === "heading") {
      const h = parseHeading(t.text);
      cur = {
        key: `${stages.length}:${h.title}`,
        num: h.num,
        title: h.title || "Untitled stage",
        duration: h.duration,
        summary: "",
        items: [],
        included: true,
        skipReason: null,
      };
      stages.push(cur);
      pending = null;
      continue;
    }
    if (!cur) continue;

    const text = clean(t.text);
    if (!text) continue;

    const only = text.match(LABEL_ONLY_RE);
    if (only) {
      pending = kindFromLabel(only[1] ?? "");
      continue;
    }
    const labelled = text.match(LABEL_RE);
    if (labelled) {
      cur.items.push({
        label: capitalize(labelled[2] ?? ""),
        kind: kindFromLabel(labelled[1] ?? ""),
      });
      pending = null;
      continue;
    }
    if (t.type === "bullet" || pending) {
      cur.items.push({ label: capitalize(text), kind: pending ?? "task" });
      pending = null;
      continue;
    }
    if (!cur.summary && cur.items.length === 0) cur.summary = firstSentence(text);
  }

  // Skip sections that are clearly not stages (e.g. "Resources").
  const hasNumbered = stages.some((s) => s.num !== null);
  for (const s of stages) {
    if (s.items.length === 0) {
      s.included = false;
      s.skipReason = "No steps found";
    } else if (hasNumbered && s.num === null) {
      s.included = false;
      s.skipReason = "Not a numbered stage";
    }
  }

  return { title, stages };
}

/* ------------------------------------------------------------------ */
/* Parsed -> database records (stable ids keep progress on re-import)  */
/* ------------------------------------------------------------------ */

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function toStages(parsed: ParsedStage[]): Stage[] {
  const seenStages = new Set<string>();
  return parsed
    .filter((s) => s.included)
    .map((s, index) => {
      let id = `st_${hash(s.title.toLowerCase())}`;
      for (let n = 2; seenStages.has(id); n++) id = `st_${hash(s.title.toLowerCase())}_${n}`;
      seenStages.add(id);

      const seenItems = new Set<string>();
      const items: Item[] = s.items.map((item) => {
        const base = `${id}_${hash(`${item.kind}:${item.label.toLowerCase()}`)}`;
        let itemId = base;
        for (let n = 2; seenItems.has(itemId); n++) itemId = `${base}_${n}`;
        seenItems.add(itemId);
        return { id: itemId, label: item.label, kind: item.kind };
      });

      return {
        id,
        num: s.num ?? index + 1,
        title: s.title,
        duration: s.duration,
        summary: s.summary,
        items,
      };
    });
}

/* ------------------------------------------------------------------ */
/* Sample guideline (same format you would paste)                      */
/* ------------------------------------------------------------------ */

export const SAMPLE_GUIDELINE = `# KiCad: beginner to pro

## Stage 0: Electronics basics (1-2 weeks)
The circuit knowledge a tool can't replace.
- Review Ohm's law and basic passive components
- Learn diodes, LEDs and transistors as switches
- Understand regulators, pull-ups and decoupling capacitors
- Read a datasheet: pinout, ratings and typical application

**Done when:** you can explain why every part in a simple LED or regulator circuit is there

## Stage 1: Schematic basics (1-2 weeks)
Draw clean, correct schematics in KiCad.
- Install KiCad 10 and create a new project
- Learn the project files (.kicad_pro, .kicad_sch, .kicad_pcb)
- Place symbols, wires, labels and power symbols
- Learn the core shortcuts (A, W, L, R, M, E)
- Annotate, run ERC and understand every warning
- Assign a footprint to every symbol

**Project:** an LED blinker with a 555 timer, or a 5 V to 3.3 V regulator board
**Done when:** you can draw a clean schematic that passes ERC with no unexplained warnings

## Stage 2: First PCB, design to fab (2-3 weeks)
Take a board from schematic to a physical order.
- Update the PCB from the schematic
- Draw the board outline on Edge.Cuts
- Place parts: connectors at edges, decoupling close to ICs
- Route a 2-layer board with a ground pour
- Run DRC and fix every violation
- Generate Gerbers and drill files
- Check them in the Gerber viewer and order from a fab

**Project:** a small microcontroller board with USB, LEDs and buttons
**Done when:** you have received the board and it works, or you understand why it didn't

## Stage 3: Libraries and parts (2 weeks)
Never depend on a footprint you haven't checked.
- Create a custom symbol from a datasheet
- Create a custom footprint from a land-pattern drawing
- Set up a project library and a personal library
- Understand library tables
- Add 3D models and check clearances in the 3D viewer
- Add MPN and supplier fields for the BOM
- Print a footprint 1:1 and verify it against the real part

**Done when:** you can build a correct footprint for any part from its datasheet

## Stage 4: Intermediate design (1-2 months)
Multi-layer boards, rules and production outputs.
- Use hierarchical sheets and buses
- Set up net classes and custom design rules
- Design a 4-layer stackup with zones and via stitching
- Route a USB differential pair and a crystal
- Size traces for current and add thermal vias
- Generate BOM and pick-and-place files for assembly
- Put the design in Git with a sensible .gitignore
- Write a design checklist and review before layout

**Project:** a 4-layer board with USB-C input, buck converter, STM32 and a sensor
**Done when:** the board passes first-time testing

## Stage 5: Advanced and professional (ongoing)
High-speed, EMC, automation and process.
- Calculate a stackup and controlled impedance with your fab
- Length-tune a high-speed interface
- Lay out a switching regulator with clean return paths
- Run an ngspice simulation of an analog circuit
- Write custom DRC rules
- Automate outputs with KiBot or CI
- Panelize and check the fab's DFM rules
- Hold a formal design review, add test points and write bring-up notes

**Project:** a board worth selling: full design, fab, bring-up and a revision 2
**Done when:** revision 2 fixes only small issues and you can explain every decision

## Resources
- The official KiCad documentation
- Shawn Hymel's KiCad series for Digi-Key
- Howard Johnson's High-Speed Digital Design
`;