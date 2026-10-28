import { useEffect, useState, type FormEvent } from "react";
import TaskFlowApp from "./TaskFlowApp";
import { login, logout, register, type AuthUser } from "./api/auth";
import { ApiError } from "./api/http";

type AuthMode = "login" | "register";

const TOKEN_KEY = "taskflow_token";
const USER_KEY = "taskflow_user";

function readStoredUser(): AuthUser | null {
  const stored = localStorage.getItem(USER_KEY);

  if (!stored) return null;

  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

const inputClass =
  "block w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10";

function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
        light ? "bg-white/15 text-white" : "bg-gradient-to-r from-[#5940F5] via-[#7866F6] to-[#9B8AFB] text-white"
      }`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-6 w-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m5 12 4 4L19 6" />
        <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
      </svg>
    </div>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className="h-5 w-5" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 7 9 7a15 15 0 0 1-3.1 3.8" />
      <path d="M6.2 6.2C4.1 7.6 3 10 3 12c0 0 3.5 7 9 7a10 10 0 0 0 3-.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className="h-5 w-5" aria-hidden="true">
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function AuthGate() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      setMode("login");
      setPassword("");
      setPasswordConfirmation("");
      setError("Your session has expired. Please log in again.");
    };

    window.addEventListener("taskflow:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("taskflow:unauthorized", handleUnauthorized);
    };
  }, []);

  function saveSession(nextToken: string, nextUser: AuthUser) {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));

    setToken(nextToken);
    setUser(nextUser);
    setError("");
    setFieldErrors({});
    setPassword("");
    setPasswordConfirmation("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});

    try {
      if (mode === "register") {
        const response = await register({
          name: name.trim(),
          email: email.trim(),
          password,
          password_confirmation: passwordConfirmation,
        });

        saveSession(response.token, response.user);
      } else {
        const response = await login({
          email: email.trim(),
          password,
        });

        saveSession(response.token, response.user);
      }
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFieldErrors(caught.errors);
      } else {
        setError("Unable to connect to the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);

    try {
      await logout();
    } catch {
      // Clear the local session even if the request fails.
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
      setPassword("");
      setPasswordConfirmation("");
      setMode("login");
      setError("");
      setFieldErrors({});
      setLoading(false);
    }
  }

  function switchMode() {
    setMode((current) => (current === "login" ? "register" : "login"));
    setError("");
    setFieldErrors({});
    setPassword("");
    setPasswordConfirmation("");
    setShowPassword(false);
    setShowConfirmation(false);
  }

  const fieldError = (field: string) => fieldErrors[field]?.[0] ?? "";

  if (token && user) {
    return (
        <div className="min-h-screen bg-slate-50">
        {!isCollapsed && (
            <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
                <BrandMark />
                <div>
                <p className="font-bold tracking-tight text-slate-900">
                    TaskFlow
                </p>
                <p className="text-sm text-slate-500">
                    Signed in as {user.name}
                </p>
                </div>
            </div>

            <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
                {loading ? "Signing out..." : "Log out"}
            </button>
            </header>
        )}

        <TaskFlowApp
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
        />
        </div>
    );
    }

  return (
    <main className="min-h-screen bg-[#F7F8FC] lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden border-r border-indigo-100/80 bg-gradient-to-br from-[#F0EEFF] via-[#F8F7FF] to-[#EAE7FF] p-10 text-slate-900 lg:flex xl:p-14">
       <div className="absolute -right-36 -top-32 h-[480px] w-[480px] rounded-full border border-indigo-200/40" />
        <div className="absolute -right-20 -top-16 h-[350px] w-[350px] rounded-full border border-indigo-200/40" />
        <div className="absolute -bottom-52 -left-36 h-[480px] w-[480px] rounded-full bg-violet-300/25 blur-3xl" />
        
        <div className="relative z-10 flex items-center gap-3">
          <BrandMark />
          <span className="text-xl font-bold tracking-tight">TaskFlow</span>
        </div>

        <div className={`relative z-10 mb-12 max-w-xl -mt-6 ${mode === "register" ? "-mt-46" : ""}`}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-indigo-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Your workspace, working for you
          </div>

            <h2 className="text-4xl font-semibold leading-[1.15] tracking-tight text-[#17213A] xl:text-5xl">
                Make space for
                <span className="mt-2 block bg-gradient-to-r from-[#5940F5] via-[#7866F6] to-[#9B8AFB] bg-clip-text text-transparent">
                    meaningful work.
                </span>
            </h2>

            <p className="mt-6 max-w-md text-base leading-7 text-slate-600">
                Organize your tasks, stay focused on your priorities, and make
                steady progress toward the things that matter.
            </p>

          <div className="mt-10 max-w-md rounded-2xl border border-indigo-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between ">
              <span className="text-sm font-semibold text-slate-600">
                Your next step
              </span>
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                Stay focused
              </span>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-400/15 text-indigo-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  className="h-5 w-5" aria-hidden="true">
                  <rect x="4" y="5" width="16" height="16" rx="2" />
                  <path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  One task at a time
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Clear priorities. Better progress.
                </p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="ml-auto h-5 w-5 text-emerald-300" aria-hidden="true">
                <path d="m5 12 4 4L19 6" />
              </svg>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} TaskFlow. Built for better workdays.
        </p>
      </aside>

      {/* Authentication panel */}
      <section className="flex min-h-screen flex-col bg-[#F7F8FC] px-5 py-6 sm:px-10 lg:bg-white lg:px-12 xl:px-20">
        <div className="flex items-center gap-3 lg:hidden">
          <BrandMark />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            TaskFlow
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="mb-8">
            <div className="mb-5 hidden lg:block">
              <BrandMark />
            </div>

            <p className="mb-3 text-sm font-semibold text-indigo-600">
              {mode === "login" ? "WELCOME BACK" : "GET STARTED"}
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {mode === "login" ? "Sign in to TaskFlow" : "Create your account"}
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              {mode === "login"
                ? "Pick up where you left off. Your tasks are waiting."
                : "Set up your workspace and start getting things done."}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "register" && (
              <div>
                <label htmlFor="auth-name" className="mb-2 block text-sm font-semibold text-slate-700">
                  Full name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  required
                  maxLength={255}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Alex Morgan"
                  aria-invalid={Boolean(fieldError("name"))}
                  aria-describedby={fieldError("name") ? "auth-name-error" : undefined}
                  className={`${inputClass} ${fieldError("name") ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : ""}`}
                />
                {fieldError("name") && (
                  <p id="auth-name-error" className="mt-2 text-sm text-red-600">
                    {fieldError("name")}
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="mb-2 block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  autoFocus={mode === "login"}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={Boolean(fieldError("email"))}
                  aria-describedby={fieldError("email") ? "auth-email-error" : undefined}
                  className={`${inputClass} pl-12 ${fieldError("email") ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : ""}`}
                />
              </div>
              {fieldError("email") && (
                <p id="auth-email-error" className="mt-2 text-sm text-red-600">
                  {fieldError("email")}
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="auth-password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                {mode === "login" && (
                  <span className="text-xs text-slate-400">
                    Keep your account secure
                  </span>
                )}
              </div>

              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true">
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
                </svg>
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  aria-invalid={Boolean(fieldError("password"))}
                  aria-describedby={fieldError("password") ? "auth-password-error" : undefined}
                  className={`${inputClass} pl-12 pr-12 ${fieldError("password") ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
              {fieldError("password") && (
                <p id="auth-password-error" className="mt-2 text-sm text-red-600">
                  {fieldError("password")}
                </p>
              )}
              {mode === "register" && !fieldError("password") && (
                <p className="mt-2 text-xs text-slate-400">
                  Use at least 8 characters.
                </p>
              )}
            </div>

            {mode === "register" && (
              <div>
                <label htmlFor="auth-password-confirmation" className="mb-2 block text-sm font-semibold text-slate-700">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="auth-password-confirmation"
                    type={showConfirmation ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={passwordConfirmation}
                    onChange={(event) => setPasswordConfirmation(event.target.value)}
                    placeholder="Enter your password again"
                    aria-invalid={Boolean(fieldError("password_confirmation"))}
                    aria-describedby={fieldError("password_confirmation") ? "auth-confirmation-error" : undefined}
                    className={`${inputClass} pr-12 ${fieldError("password_confirmation") ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmation((visible) => !visible)}
                    aria-label={showConfirmation ? "Hide confirmation password" : "Show confirmation password"}
                    aria-pressed={showConfirmation}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <EyeIcon visible={showConfirmation} />
                  </button>
                </div>
                {fieldError("password_confirmation") && (
                  <p id="auth-confirmation-error" className="mt-2 text-sm text-red-600">
                    {fieldError("password_confirmation")}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5940F5] via-[#7866F6] to-[#9B8AFB] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24"
                    fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  {mode === "login" ? "Signing you in..." : "Creating account..."}
                </>
              ) : (
                <>
                  {mode === "login" ? "Sign in to your account" : "Create your account"}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">YOUR WORKSPACE AWAITS</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <p className="text-center text-sm text-slate-500">
            {mode === "login"
              ? "New to TaskFlow?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              disabled={loading}
              className="font-semibold text-indigo-600 transition hover:text-indigo-800 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
            >
              {mode === "login" ? "Create an account" : "Sign in instead"}
            </button>
          </p>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
              className="h-4 w-4" aria-hidden="true">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Your workspace is protected with secure authentication.
          </div>
        </div>

        <footer className="py-3 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} TaskFlow · Make every task count.
        </footer>
      </section>
    </main>
  );
}
