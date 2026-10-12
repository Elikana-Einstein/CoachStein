import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, CircuitBoard, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type AuthMode = 'login' | 'signup';

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isSignup = mode === 'signup';
  const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      if (isSignup) {
        const authenticated = await signUp(email, password);
        if (!authenticated) {
          setNotice('Account created. Check your email for the confirmation link, then sign in.');
          return;
        }
      } else await signIn(email, password);
      navigate(destination, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to authenticate. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#0c1214] text-[#e7eee8] lg:grid-cols-[1.05fr_.95fr]">
      <div aria-hidden="true" className="pointer-events-none absolute -left-36 -top-40 size-[500px] rounded-full bg-[#9be2c5]/[0.06] blur-[110px]" />
      <section className="relative hidden flex-col justify-between border-r border-white/[0.06] px-12 py-10 lg:flex xl:px-20">
        <Link to="/login" className="flex w-fit items-center gap-3" aria-label="MySpace home">
          <span className="grid size-10 place-items-center rounded-xl bg-[#9be2c5] font-[Manrope] text-lg font-extrabold text-[#15221b]">M</span>
          <span><strong className="block font-[Manrope] text-base tracking-tight">MySpace</strong><small className="font-mono text-[9px] tracking-[.18em] text-[#74817b]">ENGINEERING WORKSPACE</small></span>
        </Link>

        <div className="relative max-w-xl pb-8">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#33483d] bg-[#1c2b24]/70 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.12em] text-[#a7d9bb]"><span className="size-1.5 rounded-full bg-[#9be2c5]" /> Your next build starts here</span>
          <h1 className="font-[Manrope] text-4xl font-semibold leading-[1.12] tracking-[-.04em] text-[#eff4ef] xl:text-5xl">Make your engineering goals <span className="text-[#9be2c5]">real, one step at a time.</span></h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[#95a29c]">Bring your learning routes, hands-on projects, and daily practice into one calm place designed for steady progress.</p>

          <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            {[['01', 'Map your route'], ['02', 'Build with focus'], ['03', 'Track your growth']].map(([number, title]) => (
              <div key={number} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                <span className="font-mono text-[9px] text-[#9be2c5]">{number}</span>
                <p className="mt-2 text-[11px] font-medium text-[#c7d1ca]">{title}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#697670]"><ShieldCheck size={14} className="text-[#88bd9e]" /> Private workspace, built around your goals</div>
      </section>

      <section className="relative flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:justify-center lg:px-12 xl:px-20">
        <Link to="/login" className="mb-12 flex w-fit items-center gap-2.5 lg:hidden">
          <span className="grid size-9 place-items-center rounded-[10px] bg-[#9be2c5] font-[Manrope] text-base font-extrabold text-[#15221b]">M</span>
          <span className="font-[Manrope] text-sm font-bold">MySpace</span>
        </Link>

        <div className="mx-auto w-full max-w-[410px]">
          <div className="mb-8">
            <p className="font-mono text-[9px] uppercase tracking-[.2em] text-[#91b59f]">{isSignup ? 'Create your workspace' : 'Welcome back'}</p>
            <h2 className="mt-3 font-[Manrope] text-3xl font-semibold tracking-[-.04em] text-[#edf2ed]">{isSignup ? 'Start building.' : 'Sign in to MySpace.'}</h2>
            <p className="mt-2 text-sm leading-6 text-[#87958e]">{isSignup ? 'Set up your account and give your next goal a home.' : 'Pick up where you left off on your engineering route.'}</p>
          </div>

          <div className="mb-7 grid grid-cols-2 rounded-xl border border-[#283638] bg-[#11191b] p-1">
            <Link to="/login" className={`rounded-lg py-2.5 text-center text-xs font-medium transition ${!isSignup ? 'bg-[#22312a] text-[#b8e6c9] shadow-sm' : 'text-[#87958e] hover:text-[#dbe5dd]'}`}>Sign in</Link>
            <Link to="/signup" className={`rounded-lg py-2.5 text-center text-xs font-medium transition ${isSignup ? 'bg-[#22312a] text-[#b8e6c9] shadow-sm' : 'text-[#87958e] hover:text-[#dbe5dd]'}`}>Create account</Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block text-xs font-medium text-[#c7d1ca]">
              Email address
              <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[#2a383b] bg-[#11191b] px-3.5 transition focus-within:border-[#628b72] focus-within:ring-2 focus-within:ring-[#9be2c5]/10">
                <Mail size={16} className="shrink-0 text-[#798a82]" />
                <input autoComplete="email" type="email" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="min-w-0 flex-1 bg-transparent text-sm text-[#e6eee8] outline-none placeholder:text-[#57655f]" />
              </span>
            </label>

            <label className="block text-xs font-medium text-[#c7d1ca]">
              Password
              <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[#2a383b] bg-[#11191b] px-3.5 transition focus-within:border-[#628b72] focus-within:ring-2 focus-within:ring-[#9be2c5]/10">
                <LockKeyhole size={16} className="shrink-0 text-[#798a82]" />
                <input autoComplete={isSignup ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} required minLength={isSignup ? 8 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? 'At least 8 characters' : 'Enter your password'} className="min-w-0 flex-1 bg-transparent text-sm text-[#e6eee8] outline-none placeholder:text-[#57655f]" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="grid size-7 shrink-0 place-items-center rounded-md text-[#728078] transition hover:bg-white/5 hover:text-[#c5d4ca]" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </span>
            </label>

            {isSignup && <p className="-mt-2 flex items-center gap-2 text-[10px] text-[#78867f]"><Check size={13} className="text-[#8cc5a3]" /> Use at least 8 characters.</p>}
            {error && <p role="alert" className="rounded-lg border border-[#78443e]/60 bg-[#3a211f]/50 px-3 py-2.5 text-xs leading-5 text-[#f1aaa0]">{error}</p>}
            {notice && <p role="status" className="rounded-lg border border-[#42634f]/60 bg-[#1e3326]/50 px-3 py-2.5 text-xs leading-5 text-[#a8dfbf]">{notice}</p>}

            <button type="submit" disabled={submitting} className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#9be2c5] px-4 text-sm font-semibold text-[#142019] shadow-[0_8px_24px_rgba(89,173,128,.12)] transition hover:bg-[#b0efd1] disabled:cursor-wait disabled:opacity-60">
              {submitting ? 'Connecting…' : isSignup ? 'Create your account' : 'Sign in'}
              {!submitting && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          <p className="mt-7 text-center text-[11px] text-[#78867f]">
            {isSignup ? 'Already have an account?' : 'New to MySpace?'}{' '}
            <Link to={isSignup ? '/login' : '/signup'} className="font-medium text-[#a9dfbd] hover:text-[#cff1da]">{isSignup ? 'Sign in' : 'Create an account'}</Link>
          </p>
          <p className="mt-10 text-center text-[10px] leading-5 text-[#5e6c66]">By continuing, you agree to use your workspace responsibly and keep your account details secure.</p>
        </div>
        <div className="mx-auto mt-auto flex w-full max-w-[410px] items-center justify-center gap-2 pt-10 text-[10px] text-[#65736c] lg:absolute lg:bottom-7 lg:left-1/2 lg:mt-0 lg:-translate-x-1/2 lg:pt-0"><CircuitBoard size={13} className="text-[#769b83]" /> A workspace for curious builders</div>
      </section>
    </main>
  );
}
