import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';

type AuthMode = 'login' | 'signup';
type NodeState = 'off' | 'lit' | 'error';

interface RouteStep {
  label: string;
  hint: string;
  state: NodeState;
}

/* ---------- The route: a trace that lights up as the form is completed ---------- */

const KEYFRAMES = `
@keyframes route-y  { from { top: 16px; opacity: 0; } 15%, 85% { opacity: 1; } to { top: calc(100% - 30px); opacity: 0; } }
@keyframes route-x  { from { left: calc(12.5% - 6px); opacity: 0; } 15%, 85% { opacity: 1; } to { left: calc(87.5% - 6px); opacity: 0; } }
@keyframes route-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .route-anim { animation: none !important; }
  .route-fill { transition: none !important; }
}
`;

function Pad({ state }: { state: NodeState }) {
  const ring =
    state === 'lit' ? 'border-[#9be2c5]/60 bg-[#9be2c5]/10'
    : state === 'error' ? 'border-[#f2a29a]/60 bg-[#f2a29a]/10'
    : 'border-white/15 bg-[#0e1517]';
  const dot =
    state === 'lit' ? 'bg-[#9be2c5] shadow-[0_0_12px_rgba(155,226,197,.85)]'
    : state === 'error' ? 'bg-[#f2a29a] shadow-[0_0_12px_rgba(242,162,154,.7)]'
    : 'bg-white/20';
  return (
    <span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${ring}`}>
      <span className={`size-2.5 rounded-full transition-all duration-300 ${dot}`} />
    </span>
  );
}

const PULSE =
  'route-anim pointer-events-none absolute z-20 size-3 rounded-full bg-[#ffd98a] shadow-[0_0_14px_rgba(255,217,138,.9)]';

function Route({
  steps,
  filled,
  pulsing,
  vertical = false,
}: {
  steps: RouteStep[];
  filled: boolean[];
  pulsing: boolean;
  vertical?: boolean;
}) {
  const last = steps.length - 1;

  if (vertical) {
    return (
      <ol className="relative" aria-hidden="true">
        {pulsing && <span className={`${PULSE} left-[10px]`} style={{ animation: 'route-y 1.1s ease-in-out infinite' }} />}
        {steps.map((step, i) => (
          <li
            key={step.label}
            className="route-anim relative flex gap-4 pb-9 last:pb-0"
            style={{ animation: 'route-in .5s ease both', animationDelay: `${i * 90}ms` }}
          >
            <Pad state={step.state} />
            {i < last && (
              <span className="absolute bottom-0 left-[15px] top-8 w-[2px] overflow-hidden rounded-full bg-white/[0.08]">
                <span className={`route-fill block size-full origin-top bg-[#9be2c5] transition-transform duration-500 ${filled[i] ? 'scale-y-100' : 'scale-y-0'}`} />
              </span>
            )}
            <div className="pt-0.5">
              <p className={`text-sm font-medium transition-colors ${step.state === 'off' ? 'text-[#8a9892]' : 'text-[#e7eee8]'}`}>{step.label}</p>
              <p className={`mt-0.5 text-xs transition-colors ${step.state === 'error' ? 'text-[#f2a29a]' : 'text-[#78867f]'}`}>{step.hint}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className="relative grid grid-cols-4" aria-hidden="true">
      {pulsing && <span className={`${PULSE} top-[10px]`} style={{ animation: 'route-x 1.1s ease-in-out infinite' }} />}
      {steps.map((step, i) => (
        <li key={step.label} className="relative flex flex-col items-center gap-2 text-center">
          <Pad state={step.state} />
          {i < last && (
            <span className="absolute left-1/2 top-[15px] h-[2px] w-full overflow-hidden rounded-full bg-white/[0.08]">
              <span className={`route-fill block size-full origin-left bg-[#9be2c5] transition-transform duration-500 ${filled[i] ? 'scale-x-100' : 'scale-x-0'}`} />
            </span>
          )}
          <span className={`text-[11px] transition-colors ${step.state === 'off' ? 'text-[#78867f]' : 'text-[#cfdad2]'}`}>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Page ---------- */

const inputClass =
  'mt-1.5 h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-sm text-[#e6eee8] outline-none transition-colors placeholder:text-[#667770] hover:border-white/[0.14] focus:border-[#8fdcbb]/70 focus:bg-white/[0.045]';

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
  const [arrived, setArrived] = useState(false);
  const isSignup = mode === 'signup';
  const requestedPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const destination = requestedPath?.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/dashboard';

  // Switching between sign in and create account starts fresh.
  useEffect(() => {
    setError('');
    setNotice('');
    setArrived(false);
  }, [mode]);

  // Show errors returned by an email-confirmation or OAuth callback.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const callbackError = params.get('error_description') || params.get('error');
    if (!callbackError) return;

    setError(callbackError);
    toast.error(callbackError);
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      if (isSignup) {
        const authenticated = await signUp(email, password);
        if (!authenticated) {
          const confirmationMessage = 'Account created. Check your email for the confirmation link.';
          setNotice(confirmationMessage);
          toast.success(confirmationMessage, { duration: 6000 });
          return;
        }
      } else await signIn(email, password);

      toast.success(isSignup ? 'Account created. Welcome to CoachStein!' : 'Welcome back!');
      // Let the route finish lighting up before moving on.
      setArrived(true);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        await new Promise((resolve) => setTimeout(resolve, 450));
      }
      navigate(destination, { replace: true });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to authenticate. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const passwordValid = password.length >= (isSignup ? 8 : 1);
  const ready = emailValid && passwordValid;

  const steps: RouteStep[] = [
    {
      label: 'Email',
      hint: emailValid ? 'Looks good' : 'Enter your email address',
      state: emailValid ? 'lit' : 'off',
    },
    {
      label: 'Password',
      hint: passwordValid ? (isSignup ? 'Long enough' : 'Got it') : isSignup ? 'At least 8 characters' : 'Enter your password',
      state: passwordValid ? 'lit' : 'off',
    },
    {
      label: 'Ready',
      hint: error
        ? "That didn't work. Check your details."
        : submitting && !arrived
          ? 'Connecting…'
          : ready
            ? 'All set. Press the button.'
            : 'Waiting for the fields above',
      state: error ? 'error' : ready ? 'lit' : 'off',
    },
    {
      label: 'Workspace',
      hint: arrived ? "You're in" : notice ? 'Confirm your email to enter' : 'Your roadmap is waiting',
      state: arrived ? 'lit' : 'off',
    },
  ];
  const filled = [emailValid, ready && !error, arrived];
  const pulsing = submitting && !arrived;

  return (
    <main className="grid min-h-screen bg-[#0c1214] text-[#e7eee8] lg:grid-cols-[1.05fr_.95fr]">
      <style>{KEYFRAMES}</style>

      {/* Left: the route */}
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] px-12 py-10 lg:flex xl:px-20">
        <svg
          aria-hidden="true"
          viewBox="0 0 420 300"
          className="pointer-events-none absolute -bottom-8 -right-12 w-[420px] text-[#9be2c5]/10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M0 250 H110 L150 210 H300 L330 180 H420" />
          <path d="M0 200 H70 L110 160 H220 L250 130 H420" />
          <path d="M120 300 V270 L160 230 H260" />
          <circle cx="300" cy="210" r="6" />
          <circle cx="220" cy="160" r="6" />
          <circle cx="260" cy="230" r="6" />
        </svg>

        <Link to="/login" className="relative flex w-fit items-center gap-2.5" aria-label="CoachStein home">
          <span className="grid size-9 place-items-center rounded-xl bg-[#9be2c5] font-[Manrope] text-base font-extrabold text-[#15221b]">C</span>
          <span className="font-[Manrope] text-base font-bold tracking-tight">CoachStein</span>
        </Link>

        <div className="relative max-w-sm">
          <h1 className="font-[Manrope] text-4xl font-semibold leading-tight tracking-[-.03em] text-[#eff4ef]">
            Light up your workspace.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#95a29c]">
            Add your details and watch the route connect.
          </p>
          <div className="mt-10">
            <Route steps={steps} filled={filled} pulsing={pulsing} vertical />
          </div>
        </div>

        <p className="relative text-xs text-[#697670]">A workspace for curious builders</p>
      </section>

      {/* Right: the form */}
      <section className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-24">
        <div className="mx-auto w-full max-w-[380px]">
          <Link to="/login" className="mb-8 flex w-fit items-center gap-2.5 lg:hidden" aria-label="CoachStein home">
            <span className="grid size-9 place-items-center rounded-xl bg-[#9be2c5] font-[Manrope] text-base font-extrabold text-[#15221b]">C</span>
            <span className="font-[Manrope] text-base font-bold tracking-tight">CoachStein</span>
          </Link>

          <div className="mb-8 lg:hidden">
            <Route steps={steps} filled={filled} pulsing={pulsing} />
          </div>

          <h2 className="font-[Manrope] text-2xl font-semibold tracking-tight text-[#edf2ed]">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-1.5 text-sm text-[#87958e]">
            {isSignup ? 'It only takes a minute to get started.' : 'Sign in to pick up where you left off.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-[13px] font-medium text-[#b9c6bd]">Email</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                maxLength={320}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError('');
                }}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-[13px] font-medium text-[#b9c6bd]">Password</label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  required
                  minLength={isSignup ? 8 : 1}
                  maxLength={128}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError('');
                  }}
                  placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
                  className={`${inputClass} pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 mt-1.5 rounded-r-xl px-3.5 text-xs text-[#9fb0a8] hover:text-[#e6eee8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9be2c5]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-[#78443e]/60 bg-[#3a211f]/50 px-3 py-2.5 text-sm text-[#f1aaa0]">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="rounded-xl border border-[#42634f]/60 bg-[#1e3326]/50 px-3 py-2.5 text-sm text-[#a8dfbf]">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-xl bg-[#9be2c5] text-sm font-semibold text-[#142019] shadow-[0_6px_18px_rgba(111,202,164,.18)] transition hover:bg-[#b0efd1] active:scale-[.99] disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-[#87958e]">
            {isSignup ? 'Already have an account?' : 'New to CoachStein?'}{' '}
            <Link to={isSignup ? '/login' : '/signup'} className="font-medium text-[#a9dfbd] hover:text-[#cff1da]">
              {isSignup ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}