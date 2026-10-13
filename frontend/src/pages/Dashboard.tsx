import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { BookOpen, ChevronDown, X } from "lucide-react";
import {
  resetProgress,
  saveCurrentGuideline,
  selectGuideline,
  summarize,
  toggleItem,
  useGuidelines,
  useProgress,
  useRoadmap,
  type Roadmap,
  type SavedGuideline,
  type ItemKind,
} from "../data/roadmap";

/* ---------- Small UI pieces ---------- */

function ProgressRing({ percent }: { percent: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" role="img" aria-label={`${percent}% complete`}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#26332f" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#9be2c5"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-[#eef2ed]">{percent}%</span>
        <span className="text-[11px] text-[#84928b]">complete</span>
      </div>
    </div>
  );
}

function Bar({ percent, done }: { percent: number; done: boolean }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#202b2b]">
      <div
        className={`h-full rounded-full transition-all duration-500 ${done ? "bg-[#9be2c5]" : "bg-[#6fb89b]"}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

const KIND_TAG: Record<Exclude<ItemKind, "task">, { text: string; cls: string }> = {
  project: { text: "Project", cls: "border-[#5a4a2c] bg-[#2a2418] text-[#e7bd7c]" },
  milestone: { text: "Done when", cls: "border-[#3d5748] bg-[#20332a] text-[#a8dfbf]" },
};

const NEXT_PREFIX: Record<ItemKind, string> = {
  task: "Next",
  project: "Next project",
  milestone: "Next check",
};

function GuidelinesNavbar({ roadmap, guidelines, onSelect }: { roadmap: Roadmap; guidelines: SavedGuideline[]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const active = guidelines.find((guideline) => guideline.title === roadmap.title && guideline.stages.map((stage) => stage.id).join(":") === roadmap.stages.map((stage) => stage.id).join(":"));

  return (
    <div className="relative z-30 mb-5">
      <nav aria-label="Dashboard navigation" className="flex min-h-12 items-center justify-between rounded-xl border border-[#29363a] bg-[#12191c] px-3 py-2">
        <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#2e4038] bg-[#18231e] px-3 text-xs font-semibold text-[#bce8cb] transition hover:border-[#52715e] hover:bg-[#1d2b25]">
          <BookOpen size={15} /> My guidelines <span className="rounded-full bg-[#25372d] px-1.5 py-0.5 font-mono text-[9px] text-[#a8dfbf]">{guidelines.length}</span><ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <span className="hidden text-[10px] text-[#6f7d77] sm:block">Choose a saved learning route</span>
      </nav>

      {open && <>
        <button type="button" aria-label="Close guidelines menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default bg-black/45" />
        <section role="dialog" aria-modal="true" aria-labelledby="guidelines-title" className="absolute left-0 top-14 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#34443e] bg-[#151e20] shadow-[0_24px_70px_rgba(0,0,0,.55)]">
          <header className="flex items-start justify-between border-b border-[#29363a] px-4 py-3.5">
            <div><h2 id="guidelines-title" className="text-sm font-semibold text-[#e5ece7]">Your guidelines</h2><p className="mt-1 text-[10px] text-[#819088]">Select one to make it your dashboard route.</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-7 place-items-center rounded-md text-[#819088] hover:bg-white/5 hover:text-[#e5ece7]"><X size={15} /></button>
          </header>
          <div className="max-h-[min(55vh,420px)] space-y-1 overflow-y-auto p-2">
            {guidelines.length ? [...guidelines].sort((a, b) => b.updatedAt - a.updatedAt).map((guideline) => {
              const stats = summarize(guideline.stages, guideline.progress);
              const selected = active?.id === guideline.id;
              return <button key={guideline.id} type="button" onClick={() => { onSelect(guideline.id); setOpen(false); }} className={`block w-full rounded-xl border p-3 text-left transition ${selected ? "border-[#52715e] bg-[#1c2b24]" : "border-transparent hover:border-[#34443e] hover:bg-[#1a2424]"}`}>
                <span className="flex items-center justify-between gap-3"><span className="truncate text-xs font-semibold text-[#dce5df]">{guideline.title || "Untitled guideline"}</span>{selected && <span className="shrink-0 rounded-full bg-[#294332] px-2 py-0.5 text-[9px] text-[#b5edce]">Active</span>}</span>
                <span className="mt-1.5 flex items-center justify-between gap-3 text-[10px] text-[#819088]"><span>{guideline.stages.length} stages · {stats.total} steps</span><span>{stats.percent}% complete</span></span>
                <span className="mt-2 block h-1 overflow-hidden rounded-full bg-[#26312f]"><span className="block h-full rounded-full bg-[#83c5a3]" style={{ width: `${stats.percent}%` }} /></span>
              </button>;
            }) : <div className="px-3 py-7 text-center"><BookOpen size={20} className="mx-auto text-[#789b85]" /><p className="mt-3 text-xs font-medium text-[#cbd6ce]">No saved guidelines yet</p><p className="mt-1 text-[10px] leading-5 text-[#819088]">Build a route in Planner and it will be available here.</p><Link onClick={() => setOpen(false)} to="/planner" className="mt-3 inline-block text-[11px] font-medium text-[#9be2c5] hover:text-[#c8efd6]">Open Planner →</Link></div>}
          </div>
        </section>
      </>}
    </div>
  );
}

/* ---------- Dashboard ---------- */

export default function Dashboard() {
  const roadmap = useRoadmap();
  const progress = useProgress();
  const guidelines = useGuidelines();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    saveCurrentGuideline();
  }, [roadmap, progress]);

  const summary = useMemo(() => summarize(roadmap.stages, progress), [roadmap.stages, progress]);

  const isOpen = (id: string) => open[id] ?? id === summary.current?.stage.id;
  const toggleOpen = (id: string) => setOpen((o) => ({ ...o, [id]: !isOpen(id) }));

  const resetAll = () => {
    if (window.confirm("Reset all progress? This can't be undone.")) {
      resetProgress();
      toast.success("Roadmap progress reset.");
    }
  };

  /* Empty state: nothing imported yet */
  if (roadmap.stages.length === 0) {
    return (
      <div className="mx-auto max-w-6xl py-4 sm:py-8">
        <GuidelinesNavbar roadmap={roadmap} guidelines={guidelines} onSelect={(id) => { if (selectGuideline(id)) toast.success("Guideline loaded on your dashboard."); }} />
        <p className="mb-2 text-xs font-medium text-[#91b59f]">Your personal workspace</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#eef2ed] sm:text-4xl">Welcome back.</h1>
        <section className="mt-8 rounded-2xl border border-dashed border-[#35434a] bg-[#141b20] p-8 text-center sm:p-12">
          <h2 className="text-xl font-semibold text-[#e8efe8]">Nothing to track yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#94a19c]">
            Add your guideline in the Planner and it shows up here as stages, steps and progress.
          </p>
          <Link
            to="/planner"
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-[#9be2c5] px-4 text-sm font-semibold text-[#142019] transition hover:bg-[#b0efd1]"
          >
            Add your guideline
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl py-4 sm:py-8">
      <GuidelinesNavbar roadmap={roadmap} guidelines={guidelines} onSelect={(id) => { if (selectGuideline(id)) toast.success("Guideline loaded on your dashboard."); }} />
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-xs font-medium text-[#91b59f]">Learning track</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#eef2ed] sm:text-4xl">
            {roadmap.title || "Your roadmap"}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#8e9b9b]">
            Tick off each step as you finish it. Your progress is saved in this browser.
          </p>
        </div>
        <Link
          to="/planner"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#9be2c5] bg-[#9be2c5] px-4 text-sm font-semibold text-[#142019] transition hover:bg-[#b0efd1]"
        >
          Open Planner <span aria-hidden="true">↗</span>
        </Link>
      </div>

      {/* Overview */}
      <section className="rounded-2xl border border-[#2a3739] bg-gradient-to-br from-[#1b2926] via-[#17211f] to-[#151b20] p-6 sm:p-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <ProgressRing percent={summary.percent} />

          <div className="min-w-0 flex-1">
            {summary.current && summary.nextItem ? (
              <>
                <p className="text-xs font-medium text-[#a8dfbf]">
                  Now on stage {summary.current.stage.num}: {summary.current.stage.title}
                </p>
                <h2 className="mt-2 text-xl font-semibold leading-snug text-[#e8efe8] sm:text-2xl">
                  {NEXT_PREFIX[summary.nextItem.kind]}: {summary.nextItem.label}
                </h2>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => toggleItem(summary.nextItem!.id)}
                    className="inline-flex h-10 items-center rounded-lg bg-[#9be2c5] px-4 text-sm font-semibold text-[#142019] transition hover:bg-[#b0efd1]"
                  >
                    Mark as done
                  </button>
                  <button
                    onClick={() => setOpen((o) => ({ ...o, [summary.current!.stage.id]: true }))}
                    className="text-sm font-medium text-[#a8e7c5] hover:text-[#d0f3df]"
                  >
                    See this stage
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-[#a8dfbf]">All stages complete</p>
                <h2 className="mt-2 text-xl font-semibold text-[#e8efe8] sm:text-2xl">
                  You finished the whole roadmap.
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#94a19c]">
                  Add your next guideline in the Planner to keep going.
                </p>
              </>
            )}
          </div>

          <dl className="grid grid-cols-3 gap-3 md:w-72 md:grid-cols-1">
            <div className="rounded-xl border border-white/10 bg-black/15 px-4 py-3">
              <dt className="text-xs text-[#84928b]">Steps done</dt>
              <dd className="mt-0.5 text-lg font-semibold text-[#dce6de]">
                {summary.done}<span className="text-sm font-normal text-[#84928b]"> / {summary.total}</span>
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/15 px-4 py-3">
              <dt className="text-xs text-[#84928b]">Stages complete</dt>
              <dd className="mt-0.5 text-lg font-semibold text-[#dce6de]">
                {summary.stagesDone}<span className="text-sm font-normal text-[#84928b]"> / {roadmap.stages.length}</span>
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/15 px-4 py-3">
              <dt className="text-xs text-[#84928b]">Projects built</dt>
              <dd className="mt-0.5 text-lg font-semibold text-[#e7bd7c]">
                {summary.projectsBuilt}<span className="text-sm font-normal text-[#84928b]"> / {summary.projectsTotal}</span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Stages */}
      <section className="mt-6 space-y-3" aria-label="Stages">
        {summary.perStage.map(({ stage, done, total, percent, complete }) => {
          const expanded = isOpen(stage.id);
          const isCurrent = summary.current?.stage.id === stage.id;
          const status = complete ? "Complete" : done > 0 ? "In progress" : "Not started";
          return (
            <div
              key={stage.id}
              className={`rounded-xl border bg-[#141b20] transition ${
                isCurrent ? "border-[#52715e]" : "border-[#29343a]"
              }`}
            >
              <button
                onClick={() => toggleOpen(stage.id)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-4 p-5 text-left"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    complete ? "bg-[#9be2c5] text-[#142019]" : "border border-[#37464b] text-[#9fb0a8]"
                  }`}
                >
                  {complete ? "✓" : stage.num}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-base font-semibold text-[#dce5df]">{stage.title}</span>
                    {stage.duration && <span className="text-xs text-[#788780]">{stage.duration}</span>}
                  </span>
                  {stage.summary && <span className="mt-0.5 block text-xs text-[#85918f]">{stage.summary}</span>}
                  <span className="mt-3 flex items-center gap-3">
                    <span className="flex-1"><Bar percent={percent} done={complete} /></span>
                    <span className="w-28 text-right text-xs text-[#9fb0a8]">
                      {done}/{total} · {status}
                    </span>
                  </span>
                </span>

                <span aria-hidden="true" className={`text-[#788780] transition-transform ${expanded ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>

              {expanded && (
                <ul className="space-y-1 border-t border-[#222d31] px-5 py-4">
                  {stage.items.map((item) => {
                    const checked = !!progress[item.id];
                    const tag = item.kind === "task" ? null : KIND_TAG[item.kind];
                    return (
                      <li key={item.id}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition hover:bg-[#18221f]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleItem(item.id)}
                            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[#9be2c5]"
                          />
                          <span
                            className={`flex-1 text-sm leading-5 ${
                              checked ? "text-[#6f7d77] line-through" : "text-[#cdd8d1]"
                            }`}
                          >
                            {item.label}
                          </span>
                          {tag && (
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${tag.cls}`}>
                              {tag.text}
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      {/* Quick links + reset */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link to="/planner" className="group rounded-xl border border-[#29343a] bg-[#141b20] p-5 transition hover:border-[#52715e] hover:bg-[#18221f]">
          <h3 className="text-base font-semibold text-[#dce5df]">Plan your next step</h3>
          <p className="mt-1 text-xs leading-5 text-[#85918f]">See the whole route or add another guideline.</p>
          <span className="mt-4 inline-block text-sm text-[#9be2c5] transition group-hover:translate-x-1">→</span>
        </Link>
        <Link to="/calendar" className="group rounded-xl border border-[#29343a] bg-[#141b20] p-5 transition hover:border-[#52715e] hover:bg-[#18221f]">
          <h3 className="text-base font-semibold text-[#dce5df]">Schedule a session</h3>
          <p className="mt-1 text-xs leading-5 text-[#85918f]">Put practice time on your week.</p>
          <span className="mt-4 inline-block text-sm text-[#9be2c5] transition group-hover:translate-x-1">→</span>
        </Link>
        <Link to="/mycoach" className="group rounded-xl border border-[#29343a] bg-[#141b20] p-5 transition hover:border-[#52715e] hover:bg-[#18221f]">
          <h3 className="text-base font-semibold text-[#dce5df]">Review with My Coach</h3>
          <p className="mt-1 text-xs leading-5 text-[#85918f]">Reflect on what worked and what to change.</p>
          <span className="mt-4 inline-block text-sm text-[#9be2c5] transition group-hover:translate-x-1">→</span>
        </Link>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={resetAll} className="text-xs text-[#788780] transition hover:text-[#e9a0a0]">
          Reset progress
        </button>
      </div>
    </div>
  );
}
