import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, DragEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  SAMPLE_GUIDELINE,
  appendStages,
  clearRoadmap,
  parseGuideline,
  removeStage,
  replaceRoadmap,
  summarize,
  toStages,
  useProgress,
  useRoadmap,
  type ItemKind,
  type StageStatus,
} from "../data/roadmap";

/* ---------- Motion (respects reduced-motion) ---------- */

const KEYFRAMES = `
@keyframes ms-rise { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes ms-stamp {
  0%   { border-color: #29343a; box-shadow: 0 0 0 0 rgba(155,226,197,0); }
  45%  { border-color: #9be2c5; box-shadow: 0 0 0 5px rgba(155,226,197,.22); }
  100% { border-color: #52715e; box-shadow: 0 0 0 0 rgba(155,226,197,0); }
}
@keyframes ms-pop { 0% { transform: scale(.3); opacity: 0; } 70% { transform: scale(1.18); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
@keyframes ms-pulse { 0%, 100% { opacity: .35; } 50% { opacity: .7; } }
@media (prefers-reduced-motion: reduce) { .ms-anim { animation: none !important; } }
`;

const rise = (i: number): CSSProperties => ({
  animation: "ms-rise .5s cubic-bezier(.2,.7,.2,1) both",
  animationDelay: `${Math.min(i, 12) * 70}ms`,
});

/* ---------- Small pieces ---------- */

const KIND_COLOR: Record<ItemKind, string> = {
  task: "bg-[#3f5d4f]",
  project: "bg-[#e7bd7c]",
  milestone: "bg-[#9be2c5]",
};

const STATUS: Record<StageStatus, { text: string; cls: string }> = {
  "not-started": { text: "Not started", cls: "border-[#35434a] text-[#aab5af]" },
  "in-progress": { text: "In progress", cls: "border-[#5a4a2c] bg-[#2a2418] text-[#e7bd7c]" },
  complete: { text: "Complete", cls: "border-[#3d5748] bg-[#20332a] text-[#a8dfbf]" },
};

function Barcode({ kinds }: { kinds: ItemKind[] }) {
  return (
    <span className="flex flex-wrap items-end gap-[3px]" aria-hidden="true">
      {kinds.slice(0, 28).map((k, i) => (
        <span
          key={i}
          className={`w-[5px] rounded-sm ${KIND_COLOR[k]} ${k === "task" ? "h-3" : "h-4"}`}
        />
      ))}
    </span>
  );
}

const PLACEHOLDER = `Paste your guideline here, for example:

## Stage 1: Schematic basics (1-2 weeks)
- Install the tool
- Draw a first circuit
**Project:** Blink an LED
**Done when:** ERC passes cleanly`;

/* ---------- Page ---------- */

export default function Planner() {
  const location = useLocation();
  const navigate = useNavigate();
  const roadmap = useRoadmap();
  const progress = useProgress();
  const hasRoadmap = roadmap.stages.length > 0;
  const summary = useMemo(() => summarize(roadmap.stages, progress), [roadmap.stages, progress]);

  const [studioOpen, setStudioOpen] = useState<boolean>(!hasRoadmap);
  const [text, setText] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [mode, setMode] = useState<"replace" | "add">("replace");
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [dragging, setDragging] = useState<boolean>(false);
  const [building, setBuilding] = useState<boolean>(false);

  const typerRef = useRef<number | null>(null);
  const buildRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showStudio = studioOpen || !hasRoadmap;
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stopTyping = () => {
    if (typerRef.current !== null) {
      window.clearInterval(typerRef.current);
      typerRef.current = null;
    }
  };

  useEffect(
    () => () => {
      stopTyping();
      if (buildRef.current !== null) window.clearTimeout(buildRef.current);
    },
    []
  );

  useEffect(() => {
    const incomingGuideline = (location.state as { generatedGuideline?: unknown } | null)?.generatedGuideline;
    if (typeof incomingGuideline !== "string" || !incomingGuideline.trim()) return;
    setText(incomingGuideline);
    setName(parseGuideline(incomingGuideline).title ?? "");
    setOverrides({});
    setStudioOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  /* Parsing happens live as you type */
  const parsed = useMemo(() => parseGuideline(text), [text]);
  const stagesView = useMemo(
    () => parsed.stages.map((s) => ({ ...s, included: overrides[s.key] ?? s.included })),
    [parsed, overrides]
  );
  const included = stagesView.filter((s) => s.included);
  const stepCount = included.reduce((n, s) => n + s.items.length, 0);
  const projectCount = included.reduce((n, s) => n + s.items.filter((i) => i.kind === "project").length, 0);
  const checkCount = included.reduce((n, s) => n + s.items.filter((i) => i.kind === "milestone").length, 0);

  const loadSample = () => {
    stopTyping();
    setOverrides({});
    if (reduceMotion()) {
      setText(SAMPLE_GUIDELINE);
      return;
    }
    setText("");
    let i = 0;
    typerRef.current = window.setInterval(() => {
      i = Math.min(SAMPLE_GUIDELINE.length, i + 56);
      setText(SAMPLE_GUIDELINE.slice(0, i));
      if (i >= SAMPLE_GUIDELINE.length) stopTyping();
    }, 16);
  };

  const readFile = (file: File) => {
    stopTyping();
    setOverrides({});
    file.text()
      .then((contents) => {
        setText(contents);
        toast.success("Guideline loaded from file.");
      })
      .catch(() => toast.error("That file couldn't be read as text."));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = "";
  };

  const build = () => {
    if (!included.length || building) return;
    setBuilding(true);
    const delay = reduceMotion() ? 150 : included.length * 200 + 650;
    buildRef.current = window.setTimeout(() => {
      const stages = toStages(included);
      const steps = stages.reduce((n, s) => n + s.items.length, 0);
      if (hasRoadmap && mode === "add") {
        const added = appendStages(stages);
        const skipped = stages.length - added;
        toast.success(
          skipped === 0
            ? `Added ${added} ${added === 1 ? "stage" : "stages"} to your roadmap.`
            : `Added ${added} new, skipped ${skipped} already in your roadmap.`
        );
      } else {
        replaceRoadmap(name.trim() || parsed.title || "My roadmap", stages);
        toast.success(`Roadmap built: ${stages.length} stages, ${steps} steps. Progress on unchanged steps was kept.`);
      }
      setText("");
      setName("");
      setOverrides({});
      setBuilding(false);
      setStudioOpen(false);
    }, delay);
  };

  const confirmRemove = (id: string, title: string) => {
    if (window.confirm(`Remove "${title}" from your roadmap?`)) {
      removeStage(id);
      toast.success(`Removed "${title}" from your roadmap.`);
    }
  };

  const confirmClear = () => {
    if (window.confirm("Delete the whole roadmap? Your ticked steps are kept in case you re-import it.")) {
      clearRoadmap();
      setStudioOpen(true);
      toast.success("Roadmap cleared. Your completed steps are kept.");
    }
  };

  return (
    <section className="mx-auto max-w-6xl py-4 sm:py-8">
      <style>{KEYFRAMES}</style>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#91b59f]">Learning plan</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#eef2ed]">
            {hasRoadmap && roadmap.title ? roadmap.title : "Roadmap planner"}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#8e9b9b]">
            {hasRoadmap
              ? "Your stages in the order you'll tackle them."
              : "Paste a guideline once and it becomes a trackable roadmap."}
          </p>
        </div>
        {hasRoadmap && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStudioOpen(!showStudio)}
              className="inline-flex h-10 items-center rounded-lg border border-[#35434a] px-4 text-sm font-medium text-[#cdd8d1] transition hover:border-[#52715e] hover:bg-[#18221f]"
            >
              {showStudio ? "Close" : "Add guideline"}
            </button>
            <Link
              to="/dashboard"
              className="inline-flex h-10 items-center rounded-lg bg-[#9be2c5] px-4 text-sm font-semibold text-[#142019] transition hover:bg-[#b0efd1]"
            >
              Track progress
            </Link>
          </div>
        )}
      </div>

      {/* ---------------- Import studio ---------------- */}
      {showStudio && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* Input */}
          <div className="rounded-2xl border border-[#2a3739] bg-gradient-to-br from-[#1b2926] via-[#17211f] to-[#151b20] p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#e8efe8]">
              {hasRoadmap ? "Add a guideline" : "Drop in your guideline"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#94a19c]">
              Paste it exactly as you have it. Nothing to reformat: the structure is picked out for you.
            </p>

            {hasRoadmap && (
              <div className="mt-4 inline-flex rounded-lg border border-[#2f3d40] p-0.5" role="group" aria-label="Import mode">
                {(["replace", "add"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      mode === m ? "bg-[#9be2c5] text-[#142019]" : "text-[#9fb0a8] hover:text-[#dce5df]"
                    }`}
                  >
                    {m === "replace" ? "Replace roadmap" : "Add to roadmap"}
                  </button>
                ))}
              </div>
            )}

            {(!hasRoadmap || mode === "replace") && (
              <div className="mt-4">
                <label htmlFor="roadmap-name" className="sr-only">Roadmap name</label>
                <input
                  id="roadmap-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={parsed.title ? `Name: ${parsed.title}` : "Roadmap name (optional)"}
                  className="h-10 w-full rounded-lg border border-[#2f3d40] bg-[#10171a] px-3 text-sm text-[#e2e9e3] placeholder:text-[#667570] focus:border-[#52715e] focus:outline-none"
                />
              </div>
            )}

            <div
              className="relative mt-3"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <label htmlFor="guideline-text" className="sr-only">Guideline text</label>
              <textarea
                id="guideline-text"
                value={text}
                onChange={(e) => {
                  stopTyping();
                  setText(e.target.value);
                }}
                placeholder={PLACEHOLDER}
                spellCheck={false}
                className="h-80 w-full resize-y rounded-xl border border-[#2f3d40] bg-[#10171a] p-4 font-mono text-[13px] leading-6 text-[#d4dfd8] placeholder:text-[#566560] focus:border-[#52715e] focus:outline-none"
              />
              {dragging && (
                <div className="absolute inset-0 grid place-items-center rounded-xl border-2 border-dashed border-[#9be2c5] bg-[#10171a]/90 text-sm font-medium text-[#a8dfbf]">
                  Drop a .md or .txt file
                </div>
              )}
            </div>

            <ul className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#9fb0a8]" aria-label="How the text is read">
              <li className="rounded-full border border-[#2f3d40] px-2.5 py-1">Heading → stage</li>
              <li className="rounded-full border border-[#2f3d40] px-2.5 py-1">Bullet → step</li>
              <li className="rounded-full border border-[#5a4a2c] px-2.5 py-1 text-[#e7bd7c]">Project: → project</li>
              <li className="rounded-full border border-[#3d5748] px-2.5 py-1 text-[#a8dfbf]">Done when: → checkpoint</li>
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={loadSample}
                disabled={building}
                className="inline-flex h-9 items-center rounded-lg border border-[#3d5748] bg-[#20332a] px-3 text-xs font-medium text-[#a8dfbf] transition hover:bg-[#26402f] disabled:opacity-50"
              >
                Try the KiCad guideline
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={building}
                className="inline-flex h-9 items-center rounded-lg border border-[#35434a] px-3 text-xs font-medium text-[#cdd8d1] transition hover:border-[#52715e] disabled:opacity-50"
              >
                Upload a file
              </button>
              <input ref={fileRef} type="file" accept=".md,.markdown,.txt,text/plain" className="hidden" onChange={onPick} />
              {text && !building && (
                <button
                  onClick={() => {
                    stopTyping();
                    setText("");
                    setOverrides({});
                  }}
                  className="text-xs text-[#788780] transition hover:text-[#dce5df]"
                >
                  Clear text
                </button>
              )}
            </div>
          </div>

          {/* Live structure */}
          <div className="flex min-h-[28rem] flex-col rounded-2xl border border-[#29343a] bg-[#141b20] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#e8efe8]">Live structure</h2>
                <p className="mt-1 text-sm text-[#85918f]">Updates as you type or paste.</p>
              </div>
              <button
                onClick={build}
                disabled={!included.length || building}
                className="inline-flex h-10 shrink-0 items-center rounded-lg bg-[#9be2c5] px-4 text-sm font-semibold text-[#142019] transition hover:bg-[#b0efd1] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {building
                  ? "Building…"
                  : included.length
                    ? `${hasRoadmap && mode === "add" ? "Add" : "Build"} ${included.length} ${included.length === 1 ? "stage" : "stages"}`
                    : "Build roadmap"}
              </button>
            </div>

            {included.length > 0 && (
              <dl className="mt-4 flex flex-wrap gap-2 text-xs" aria-live="polite">
                {[
                  [included.length, "stages", "text-[#dce6de]"],
                  [stepCount, "steps", "text-[#dce6de]"],
                  [projectCount, "projects", "text-[#e7bd7c]"],
                  [checkCount, "checkpoints", "text-[#a8dfbf]"],
                ].map(([n, label, cls]) => (
                  <div key={String(label)} className="flex items-baseline gap-1.5 rounded-lg border border-white/10 bg-black/15 px-3 py-1.5">
                    <dd className={`text-sm font-semibold ${cls}`}>{n}</dd>
                    <dt className="text-[#84928b]">{label}</dt>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-4 flex-1 overflow-y-auto lg:max-h-[30rem]">
              {stagesView.length === 0 ? (
                text.trim() ? (
                  <p className="rounded-xl border border-dashed border-[#35434a] p-5 text-sm leading-6 text-[#94a19c]">
                    No stages found yet. Start a line with <code className="text-[#a8dfbf]">##</code> to name a stage, then list its steps as bullets.
                  </p>
                ) : (
                  <div className="space-y-3" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="ms-anim rounded-xl border border-dashed border-[#2f3d40] p-4"
                        style={{ animation: "ms-pulse 2.4s ease-in-out infinite", animationDelay: `${i * 0.35}s` }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="size-8 rounded-full bg-[#202b2b]" />
                          <span className="h-3 w-40 rounded bg-[#202b2b]" />
                        </div>
                        <span className="mt-3 block h-2 w-3/4 rounded bg-[#1b2526]" />
                      </div>
                    ))}
                    <p className="pt-1 text-center text-xs text-[#667570]">Your roadmap will assemble here.</p>
                  </div>
                )
              ) : (
                <ul className="space-y-3">
                  {stagesView.map((s, i) => {
                    const includedIndex = included.findIndex((x) => x.key === s.key);
                    const stamping = building && s.included;
                    return (
                      <li
                        key={s.key}
                        className={`ms-anim rounded-xl border bg-[#10171a] p-4 transition-opacity ${
                          s.included ? "border-[#29343a]" : "border-[#222d31] opacity-55"
                        }`}
                        style={
                          stamping
                            ? { animation: "ms-stamp .7s ease both", animationDelay: `${includedIndex * 200}ms` }
                            : rise(i)
                        }
                      >
                        <div className="flex items-center gap-3">
                          <span className="relative grid size-8 shrink-0 place-items-center rounded-full border border-[#35434a] text-xs font-semibold text-[#a8dfbf]">
                            {s.num ?? "·"}
                            {stamping && (
                              <span
                                className="ms-anim absolute inset-0 grid place-items-center rounded-full bg-[#9be2c5] text-sm font-bold text-[#142019]"
                                style={{ animation: "ms-pop .4s ease both", animationDelay: `${includedIndex * 200 + 250}ms` }}
                              >
                                ✓
                              </span>
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#e2e9e3]">{s.title}</p>
                            <p className="text-xs text-[#83908d]">
                              {s.included
                                ? s.duration || `${s.items.length} ${s.items.length === 1 ? "step" : "steps"}`
                                : s.skipReason
                                  ? `Skipped: ${s.skipReason}`
                                  : "Skipped by you"}
                            </p>
                          </div>
                          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-[#9fb0a8]">
                            <input
                              type="checkbox"
                              checked={s.included}
                              disabled={building}
                              onChange={() => setOverrides((o) => ({ ...o, [s.key]: !s.included }))}
                              className="size-4 cursor-pointer accent-[#9be2c5]"
                              aria-label={`Include ${s.title}`}
                            />
                            Include
                          </label>
                        </div>
                        {s.included && (
                          <div className="mt-3 space-y-2.5">
                            {s.summary && <p className="text-xs leading-5 text-[#85918f]">{s.summary}</p>}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                              <Barcode kinds={s.items.map((x) => x.kind)} />
                              <span className="text-xs text-[#9fb0a8]">
                                {s.items.filter((x) => x.kind === "task").length} steps
                              </span>
                              {s.items.some((x) => x.kind === "project") && (
                                <span className="rounded-full border border-[#5a4a2c] bg-[#2a2418] px-2 py-0.5 text-[11px] text-[#e7bd7c]">Project</span>
                              )}
                              {s.items.some((x) => x.kind === "milestone") && (
                                <span className="rounded-full border border-[#3d5748] bg-[#20332a] px-2 py-0.5 text-[11px] text-[#a8dfbf]">Done when</span>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Roadmap timeline ---------------- */}
      {hasRoadmap && (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-[#29343a] bg-[#141b20] px-5 py-4">
            <div className="min-w-[12rem] flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-[#202b2b]">
                <div className="h-full rounded-full bg-[#9be2c5] transition-all duration-500" style={{ width: `${summary.percent}%` }} />
              </div>
            </div>
            <p className="text-sm text-[#cdd8d1]">
              <span className="font-semibold text-[#eef2ed]">{summary.percent}%</span> done · {summary.done} of {summary.total} steps · {summary.stagesDone} of {roadmap.stages.length} stages
            </p>
          </div>

          <ol className="mt-5 grid gap-3">
            {summary.perStage.map((stat, i) => {
              const { stage } = stat;
              const project = stage.items.find((x) => x.kind === "project");
              const check = stage.items.find((x) => x.kind === "milestone");
              const tasks = stage.items.filter((x) => x.kind === "task").length;
              const last = i === summary.perStage.length - 1;
              return (
                <li key={stage.id} className="ms-anim relative pl-14" style={rise(i)}>
                  <span
                    className={`absolute left-0 top-4 grid size-10 place-items-center rounded-xl border text-sm font-semibold ${
                      stat.complete
                        ? "border-[#9be2c5] bg-[#9be2c5] text-[#142019]"
                        : "border-[#35434a] bg-[#1b2529] text-[#a8dfbf]"
                    }`}
                  >
                    {stat.complete ? "✓" : stage.num}
                  </span>
                  {!last && <span aria-hidden="true" className="absolute left-5 top-14 -bottom-3 w-px bg-[#2a3739]" />}

                  <div className="rounded-xl border border-[#29343a] bg-[#141b20] p-4 sm:p-5">
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                      <div className="min-w-0 flex-1">
                        <h2 className="font-medium text-[#e2e9e3]">{stage.title}</h2>
                        <p className="mt-1 text-xs text-[#83908d]">
                          {[stage.duration, `${tasks} ${tasks === 1 ? "step" : "steps"}`].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${STATUS[stat.status].cls}`}>
                        {STATUS[stat.status].text}
                      </span>
                    </div>

                    {stage.summary && <p className="mt-3 text-sm leading-6 text-[#94a19c]">{stage.summary}</p>}

                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#202b2b]">
                        <div className="h-full rounded-full bg-[#6fb89b] transition-all duration-500" style={{ width: `${stat.percent}%` }} />
                      </div>
                      <span className="text-xs text-[#9fb0a8]">{stat.done}/{stat.total}</span>
                    </div>

                    {(project || check) && (
                      <dl className="mt-4 space-y-2 border-t border-[#222d31] pt-3 text-sm">
                        {project && (
                          <div className="flex gap-3">
                            <dt className="w-20 shrink-0 text-xs font-medium text-[#e7bd7c]">Project</dt>
                            <dd className="text-[#cdd8d1]">{project.label}</dd>
                          </div>
                        )}
                        {check && (
                          <div className="flex gap-3">
                            <dt className="w-20 shrink-0 text-xs font-medium text-[#a8dfbf]">Done when</dt>
                            <dd className="text-[#cdd8d1]">{check.label}</dd>
                          </div>
                        )}
                      </dl>
                    )}

                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => confirmRemove(stage.id, stage.title)}
                        className="text-xs text-[#788780] transition hover:text-[#e9a0a0]"
                      >
                        Remove stage
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 flex justify-end">
            <button onClick={confirmClear} className="text-xs text-[#788780] transition hover:text-[#e9a0a0]">
              Delete roadmap
            </button>
          </div>
        </>
      )}
    </section>
  );
}
