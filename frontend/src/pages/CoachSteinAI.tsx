import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowRight, BarChart3, Bot, Check, Clock3, Lightbulb, MessageCircle, RotateCcw, Send, Sparkles, Target, Trophy, WandSparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '../auth/api';
import { useProgress, useRoadmap, summarize, parseGuideline } from '../data/roadmap';
import { analyzeProgress, generateGuideline, sendChat, type CoachChatMessage, type ProgressAnalysis } from '../services/coachstein';

type ToolTab = 'roadmap' | 'progress' | 'chat';

const inputClass = 'mt-2 w-full rounded-xl border border-[#2c3a3e] bg-[#101719] px-4 py-3 text-sm text-[#e6eee8] outline-none transition placeholder:text-[#66766f] hover:border-[#3a5048] focus:border-[#83c5a3] focus:ring-2 focus:ring-[#9be2c5]/10';

function StatCard({ icon: Icon, label, value, detail }: { icon: typeof Target; label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-[#29363a] bg-[#141b20] p-4 sm:p-5">
      <span className="grid size-9 place-items-center rounded-xl border border-[#34483c] bg-[#1d2b25] text-[#9be2c5]"><Icon size={17} /></span>
      <p className="mt-4 text-[11px] text-[#87968e]">{label}</p>
      <p className="mt-1 font-[Manrope] text-2xl font-semibold text-[#e8efe8]">{value}</p>
      <p className="mt-1 text-[10px] text-[#697870]">{detail}</p>
    </article>
  );
}

export default function CoachSteinAI() {
  const navigate = useNavigate();
  const roadmap = useRoadmap();
  const progress = useProgress();
  const quickStats = useMemo(() => summarize(roadmap.stages, progress), [roadmap.stages, progress]);
  const [tab, setTab] = useState<ToolTab>('roadmap');
  const [goal, setGoal] = useState('');
  const [experience, setExperience] = useState('Beginner');
  const [weeklyHours, setWeeklyHours] = useState('6');
  const [targetWeeks, setTargetWeeks] = useState('8');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ title: string; guideline: string; stage_count: number; item_count: number } | null>(null);
  const [analysis, setAnalysis] = useState<ProgressAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatMessages, setChatMessages] = useState<CoachChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatting, setChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatMessages, chatting, tab]);

  const generatedStages = generated ? parseGuideline(generated.guideline).stages.filter((stage) => stage.included) : [];

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      toast.error('Your session has expired. Sign in again to use CoachStein AI.');
      return;
    }
    setGenerating(true);
    setGenerated(null);
    try {
      const result = await generateGuideline(token, {
        learning_goal: goal.trim(),
        current_level: experience,
        weekly_hours: Number(weeklyHours) || undefined,
        target_weeks: Number(targetWeeks) || undefined,
      });
      setGenerated(result);
      toast.success('Your learning guideline is ready.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not generate a guideline. Try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleAnalyze() {
    const token = getAccessToken();
    if (!token) {
      toast.error('Your session has expired. Sign in again to use CoachStein AI.');
      return;
    }
    if (quickStats.total === 0) {
      toast.error('Add a roadmap with trackable steps before analyzing progress.');
      return;
    }
    setAnalyzing(true);
    try {
      const result = await analyzeProgress(token, { roadmap, progress });
      setAnalysis(result);
      toast.success('Your progress analysis is ready.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not analyze your progress. Try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  function addToPlanner() {
    if (!generated) return;
    navigate('/planner', { state: { generatedGuideline: generated.guideline } });
    toast.success('Guideline sent to Planner for review.');
  }

  async function handleChatSubmit(event?: FormEvent<HTMLFormElement>, suggestedPrompt?: string) {
    event?.preventDefault();
    const content = (suggestedPrompt ?? chatInput).trim();
    if (!content || chatting) return;
    const token = getAccessToken();
    if (!token) {
      toast.error('Your session has expired. Sign in again to chat with CoachStein.');
      return;
    }
    const nextMessages = [...chatMessages, { role: 'user' as const, content }];
    setChatMessages(nextMessages);
    setChatInput('');
    setChatting(true);
    try {
      const result = await sendChat(token, nextMessages.slice(-20));
      setChatMessages([...nextMessages, { role: 'assistant', content: result.reply }]);
    } catch (error) {
      setChatMessages(chatMessages);
      setChatInput(content);
      toast.error(error instanceof Error ? error.message : 'Could not get a reply. Please try again.');
    } finally {
      setChatting(false);
    }
  }

  function handleChatKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleChatSubmit(undefined);
    }
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6 py-4 sm:py-8">
      <header className="relative overflow-hidden rounded-3xl border border-[#30453a] bg-gradient-to-br from-[#1a2a23] via-[#141e1d] to-[#141b20] p-6 sm:p-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-[#9be2c5]/[0.08] blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#45634f] bg-[#1e3328]/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.16em] text-[#b5edce]"><Sparkles size={13} /> Engineering AI workspace</span>
            <h1 className="mt-5 font-[Manrope] text-3xl font-semibold tracking-[-.04em] text-[#edf2ed] sm:text-4xl">CoachStein AI</h1>
            <p className="mt-3 text-sm leading-7 text-[#aab7af]">Turn a learning goal into a practical roadmap, or get a clear read on how your current track is going.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/[.08] bg-black/15 px-3 py-2 text-[11px] text-[#8e9d96]"><Bot size={15} className="text-[#9be2c5]" /> Your roadmap stays yours</div>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#29363a] bg-[#101719] p-1.5" role="tablist" aria-label="CoachStein AI tools">
        <button type="button" role="tab" aria-selected={tab === 'roadmap'} onClick={() => setTab('roadmap')} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition ${tab === 'roadmap' ? 'bg-[#20342a] text-[#b5edce] shadow-sm' : 'text-[#899790] hover:text-[#dce5df]'}`}><WandSparkles size={15} /> Generate a learning roadmap</button>
        <button type="button" role="tab" aria-selected={tab === 'progress'} onClick={() => setTab('progress')} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition ${tab === 'progress' ? 'bg-[#20342a] text-[#b5edce] shadow-sm' : 'text-[#899790] hover:text-[#dce5df]'}`}><BarChart3 size={15} /> Analyze my progress</button>
        <button type="button" role="tab" aria-selected={tab === 'chat'} onClick={() => setTab('chat')} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition ${tab === 'chat' ? 'bg-[#20342a] text-[#b5edce] shadow-sm' : 'text-[#899790] hover:text-[#dce5df]'}`}><MessageCircle size={15} /> Ask CoachStein</button>
      </div>

      {tab === 'chat' && (
        <section className="mx-auto flex h-[min(72vh,760px)] min-h-[520px] max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#29363a] bg-[#141b20]" aria-label="Chat with CoachStein">
          <header className="flex items-center justify-between border-b border-[#29363a] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-[#34483c] bg-[#1d2b25] text-[#9be2c5]"><Bot size={19} /></span><div><h2 className="font-[Manrope] text-sm font-semibold text-[#e5ece7]">Chat with CoachStein</h2><p className="mt-0.5 text-[10px] text-[#819088]">Ask about engineering, software, projects, or anything you’re curious about.</p></div></div>
            {chatMessages.length > 0 && <button type="button" onClick={() => setChatMessages([])} disabled={chatting} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#2d3b3e] px-3 text-[11px] text-[#98a69f] transition hover:border-[#486051] hover:text-[#c4d4ca] disabled:opacity-50"><RotateCcw size={13} /> New chat</button>}
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
            {chatMessages.length === 0 ? (
              <div className="flex min-h-full flex-col items-center justify-center text-center">
                <span className="grid size-14 place-items-center rounded-2xl border border-[#34483c] bg-[#1d2b25] text-[#9be2c5]"><MessageCircle size={23} /></span>
                <h3 className="mt-4 font-[Manrope] text-lg font-semibold text-[#e5ece7]">What are you working through?</h3>
                <p className="mt-2 max-w-md text-xs leading-6 text-[#87968e]">Start a conversation with CoachStein. Your recent messages provide context for follow-up questions in this chat.</p>
                <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">
                  {['Explain PID control with a practical example', 'Help me choose a microcontroller for a sensor project', 'How should I structure a FastAPI project?'].map((prompt) => <button key={prompt} type="button" onClick={() => void handleChatSubmit(undefined, prompt)} disabled={chatting} className="rounded-full border border-[#30413a] bg-[#11191b] px-3 py-2 text-[10px] text-[#aab7af] transition hover:border-[#587563] hover:text-[#dce5df] disabled:opacity-50">{prompt}</button>)}
                </div>
              </div>
            ) : chatMessages.map((message, index) => (
              <article key={`${index}-${message.role}`} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${message.role === 'user' ? 'bg-[#26372e] text-[#b5edce]' : 'border border-[#34483c] bg-[#1d2b25] text-[#9be2c5]'}`}>{message.role === 'user' ? <span className="text-[10px] font-semibold">You</span> : <Bot size={15} />}</span>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-6 sm:max-w-[78%] ${message.role === 'user' ? 'rounded-tr-sm bg-[#21352a] text-[#d5e3d9]' : 'rounded-tl-sm border border-[#29383a] bg-[#101719] text-[#c4d0c8]'}`}><p className="whitespace-pre-wrap break-words">{message.content}</p></div>
              </article>
            ))}
            {chatting && <div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg border border-[#34483c] bg-[#1d2b25] text-[#9be2c5]"><Bot size={15} /></span><div className="rounded-2xl rounded-tl-sm border border-[#29383a] bg-[#101719] px-4 py-3"><span className="flex items-center gap-1"><i className="size-1.5 animate-bounce rounded-full bg-[#9be2c5] [animation-delay:-.2s]" /><i className="size-1.5 animate-bounce rounded-full bg-[#9be2c5] [animation-delay:-.1s]" /><i className="size-1.5 animate-bounce rounded-full bg-[#9be2c5]" /><span className="ml-2 text-[10px] text-[#819088]">Thinking…</span></span></div></div>}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleChatSubmit} className="border-t border-[#29363a] bg-[#111719] p-3 sm:p-4">
            <div className="flex items-end gap-2 rounded-xl border border-[#2c3a3e] bg-[#0d1416] p-2 transition focus-within:border-[#628b72] focus-within:ring-2 focus-within:ring-[#9be2c5]/10">
              <textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={handleChatKeyDown} rows={1} maxLength={4000} placeholder="Message CoachStein…" aria-label="Message CoachStein" className="max-h-36 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-xs leading-5 text-[#e6eee8] outline-none placeholder:text-[#66766f]" />
              <button type="submit" disabled={chatting || !chatInput.trim()} aria-label="Send message" className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#9be2c5] text-[#142019] transition hover:bg-[#b0efd1] disabled:cursor-not-allowed disabled:opacity-40"><Send size={16} /></button>
            </div>
            <p className="mt-2 px-1 text-[9px] text-[#65736c]">Enter to send · Shift + Enter for a new line · Chats are kept only for this page session.</p>
          </form>
        </section>
      )}

      {tab === 'roadmap' ? (
        <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
          <form onSubmit={handleGenerate} className="rounded-2xl border border-[#29363a] bg-[#141b20] p-5 sm:p-7">
            <div className="mb-5">
              <p className="font-mono text-[9px] uppercase tracking-[.17em] text-[#91b59f]">Start with your goal</p>
              <h2 className="mt-2 font-[Manrope] text-xl font-semibold text-[#e5ece7]">What do you want to learn?</h2>
              <p className="mt-2 text-xs leading-5 text-[#899790]">Describe the skill, project, or outcome you want to reach. CoachStein will turn it into staged tasks, projects, and checkpoints.</p>
            </div>

            <label htmlFor="learning-goal" className="text-[11px] font-semibold text-[#c7d1ca]">Your learning goal</label>
            <textarea id="learning-goal" required minLength={8} maxLength={1800} rows={5} value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="For example: I want to learn embedded C++ and build a sensor device that reads temperature and publishes data over Wi-Fi." className={`${inputClass} min-h-32 resize-y leading-6`} />
            <div className="mt-1 text-right text-[10px] text-[#66766f]">{goal.length}/1800</div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-[11px] font-semibold text-[#c7d1ca]">Current level
                <select value={experience} onChange={(event) => setExperience(event.target.value)} className={inputClass}>
                  <option>Beginner</option><option>Some experience</option><option>Intermediate</option><option>Advanced</option>
                </select>
              </label>
              <label className="text-[11px] font-semibold text-[#c7d1ca]">Hours each week
                <input type="number" min={1} max={80} value={weeklyHours} onChange={(event) => setWeeklyHours(event.target.value)} className={inputClass} />
              </label>
              <label className="text-[11px] font-semibold text-[#c7d1ca]">Target weeks
                <input type="number" min={1} max={52} value={targetWeeks} onChange={(event) => setTargetWeeks(event.target.value)} className={inputClass} />
              </label>
            </div>

            <button type="submit" disabled={generating || goal.trim().length < 8} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#9be2c5] px-4 text-sm font-semibold text-[#142019] transition hover:bg-[#b0efd1] disabled:cursor-wait disabled:opacity-60">
              {generating ? <><span className="size-4 animate-spin rounded-full border-2 border-[#142019]/25 border-t-[#142019]" /> Building your roadmap…</> : <>Generate learning guideline <ArrowRight size={16} /></>}
            </button>
            <p className="mt-3 flex items-center gap-2 text-[10px] text-[#718078]"><Clock3 size={13} /> AI-generated steps are a starting point; review them before adding to your plan.</p>
          </form>

          <section className="rounded-2xl border border-[#29363a] bg-[#141b20] p-5 sm:p-7" aria-live="polite">
            {!generated ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <span className="grid size-14 place-items-center rounded-2xl border border-[#34483c] bg-[#1d2b25] text-[#9be2c5]"><Lightbulb size={24} /></span>
                <h2 className="mt-5 font-[Manrope] text-lg font-semibold text-[#dce5df]">Your roadmap will appear here</h2>
                <p className="mt-2 max-w-sm text-xs leading-6 text-[#87968e]">You’ll get a sequence of stages with realistic durations, hands-on projects, and clear completion checkpoints.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#29363a] pb-5">
                  <div><p className="font-mono text-[9px] uppercase tracking-[.17em] text-[#91b59f]">Generated guideline</p><h2 className="mt-2 font-[Manrope] text-xl font-semibold text-[#e5ece7]">{generated.title}</h2><p className="mt-1 text-[11px] text-[#819088]">{generated.stage_count} stages · {generated.item_count} actionable steps</p></div>
                  <button type="button" onClick={addToPlanner} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#9be2c5] px-3.5 text-xs font-semibold text-[#142019] transition hover:bg-[#b0efd1]">Review in Planner <ArrowRight size={14} /></button>
                </div>
                <div className="mt-4 max-h-[590px] space-y-3 overflow-y-auto pr-1">
                  {generatedStages.map((stage) => (
                    <article key={stage.key} className="rounded-xl border border-[#2a383b] bg-[#11191b] p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-semibold text-[#dce5df]">{stage.num !== null ? `Stage ${stage.num}: ` : ''}{stage.title}</h3>{stage.duration && <span className="text-[10px] text-[#9db0a4]">{stage.duration}</span>}</div>
                      {stage.summary && <p className="mt-2 text-xs leading-5 text-[#8e9d96]">{stage.summary}</p>}
                      <ul className="mt-3 space-y-2">
                        {stage.items.map((item, index) => <li key={`${stage.key}-${index}`} className="flex gap-2 text-xs leading-5 text-[#b8c4bc]"><span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${item.kind === 'task' ? 'bg-[#82918a]' : item.kind === 'project' ? 'bg-[#e7bd7c]' : 'bg-[#9be2c5]'}`} /><span>{item.label}<span className="ml-2 text-[9px] uppercase tracking-wide text-[#718078]">{item.kind === 'milestone' ? 'checkpoint' : item.kind}</span></span></li>)}
                      </ul>
                    </article>
                  ))}
                </div>
                <details className="mt-4 border-t border-[#29363a] pt-3">
                  <summary className="cursor-pointer text-[11px] text-[#9be2c5]">View Markdown guideline</summary>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-[#101719] p-4 text-[11px] leading-5 text-[#aab7af]">{generated.guideline}</pre>
                </details>
              </>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[#29363a] bg-[#141b20] p-5 sm:p-7">
            <div><p className="font-mono text-[9px] uppercase tracking-[.17em] text-[#91b59f]">Roadmap snapshot</p><h2 className="mt-2 font-[Manrope] text-xl font-semibold text-[#e5ece7]">{roadmap.title || 'Your learning track'}</h2><p className="mt-2 text-xs text-[#899790]">CoachStein will analyze your current stage and completed items, then suggest practical next moves.</p></div>
            <button type="button" onClick={handleAnalyze} disabled={analyzing || quickStats.total === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#9be2c5] px-4 text-sm font-semibold text-[#142019] transition hover:bg-[#b0efd1] disabled:cursor-not-allowed disabled:opacity-50">
              {analyzing ? <><span className="size-4 animate-spin rounded-full border-2 border-[#142019]/25 border-t-[#142019]" /> Analyzing…</> : <><Sparkles size={16} /> Analyze progress with AI</>}
            </button>
          </div>

          {quickStats.total === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#35434a] bg-[#141b20] p-8 text-center">
              <BarChart3 className="mx-auto text-[#9be2c5]" size={25} />
              <h3 className="mt-3 font-semibold text-[#e5ece7]">Add a roadmap to get started</h3>
              <p className="mt-2 text-xs leading-5 text-[#87968e]">Your analysis uses the steps and checkmarks in your current track.</p>
              <button type="button" onClick={() => setTab('roadmap')} className="mt-4 text-xs font-medium text-[#9be2c5] hover:text-[#c5f0d6]">Generate a roadmap</button>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={Target} label="Overall completion" value={`${analysis?.percent ?? quickStats.percent}%`} detail="Across all trackable steps" />
                <StatCard icon={Check} label="Steps completed" value={`${analysis?.completed_items ?? quickStats.done}/${analysis?.total_items ?? quickStats.total}`} detail="Your checked-off tasks and projects" />
                <StatCard icon={Trophy} label="Stages completed" value={`${analysis?.completed_stages ?? quickStats.stagesDone}/${analysis?.total_stages ?? roadmap.stages.length}`} detail="Stages with every step done" />
                <StatCard icon={BarChart3} label="Current stage" value={analysis?.stage_progress.find((stage) => stage.status !== 'complete')?.title ?? quickStats.current?.stage.title ?? 'Complete'} detail="Your next area of focus" />
              </div>

              <section className="rounded-2xl border border-[#29363a] bg-[#141b20] p-5 sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-4"><div><h3 className="font-[Manrope] text-base font-semibold text-[#e5ece7]">Stage-by-stage progress</h3><p className="mt-1 text-[11px] text-[#819088]">Completion is calculated from the checked steps in each stage.</p></div><span className="font-mono text-xs text-[#9be2c5]">{analysis?.percent ?? quickStats.percent}%</span></div>
                <div className="space-y-4">
                  {(analysis?.stage_progress ?? quickStats.perStage.map(({ stage, done, total, percent, status }) => ({ id: stage.id, number: stage.num, title: stage.title, done, total, percent, status }))).map((stage) => (
                    <div key={stage.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate text-[#cbd6ce]">{stage.number}. {stage.title}</span><span className="shrink-0 text-[#84928b]">{stage.done}/{stage.total} · {stage.percent}%</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#202b2b]"><div className="h-full rounded-full bg-gradient-to-r from-[#6fb89b] to-[#9be2c5] transition-[width] duration-500" style={{ width: `${stage.percent}%` }} /></div>
                    </div>
                  ))}
                </div>
              </section>

              {analysis && (
                <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
                  <section className="rounded-2xl border border-[#30453a] bg-gradient-to-br from-[#1a2a23] to-[#141b20] p-5 sm:p-7">
                    <span className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.17em] text-[#9be2c5]"><Sparkles size={13} /> CoachStein readout</span>
                    <p className="mt-4 text-sm leading-7 text-[#d2ddd5]">{analysis.summary}</p>
                    <div className="mt-6 border-t border-white/[.08] pt-5"><h3 className="flex items-center gap-2 text-xs font-semibold text-[#dce5df]"><Check size={14} className="text-[#9be2c5]" /> What is going well</h3><ul className="mt-3 space-y-2">{analysis.strengths.map((strength, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-[#9eada5]"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#9be2c5]" />{strength}</li>)}</ul></div>
                    <div className="mt-5 rounded-xl border border-[#3f5a49] bg-[#15231c]/70 p-4"><p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.15em] text-[#a9dfbd]"><Clock3 size={13} /> This week’s focus</p><p className="mt-2 text-xs leading-5 text-[#d2ddd5]">{analysis.weekly_focus}</p></div>
                  </section>

                  <section className="rounded-2xl border border-[#29363a] bg-[#141b20] p-5 sm:p-7">
                    <div className="mb-4 flex items-center gap-2"><Lightbulb size={17} className="text-[#e7bd7c]" /><h3 className="font-[Manrope] text-base font-semibold text-[#e5ece7]">Recommended next moves</h3></div>
                    <div className="space-y-3">{analysis.recommendations.map((recommendation, index) => <article key={`${recommendation.title}-${index}`} className="rounded-xl border border-[#2a383b] bg-[#11191b] p-4"><div className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#1d2b25] font-mono text-[10px] text-[#9be2c5]">{String(index + 1).padStart(2, '0')}</span><div><h4 className="text-xs font-semibold text-[#dce5df]">{recommendation.title}</h4><p className="mt-1.5 text-xs leading-5 text-[#94a19c]">{recommendation.detail}</p><p className="mt-2 flex gap-2 text-[11px] leading-5 text-[#b5edce]"><ArrowRight size={13} className="mt-0.5 shrink-0" />{recommendation.next_step}</p></div></div></article>)}</div>
                  </section>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
