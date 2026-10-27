
import { useEffect, useState, type FormEvent } from "react";
import TaskFlowApp from "./TaskFlowApp";
import {
  login,
  logout,
  register,
  type AuthUser,
} from "./api/auth";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>(
    {},
  );

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      setError("Your session has expired. Please log in again.");
    };

    window.addEventListener("taskflow:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener(
        "taskflow:unauthorized",
        handleUnauthorized,
      );
    };
  }, []);

  function saveSession(nextToken: string, nextUser: AuthUser) {
    console.log(nextToken, nextUser);
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
        console.log(response);
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
      // Clear the local session even if the network request fails.
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

  if (token && user) {
    return (
      <div className="min-h-screen">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div>
            <p className="font-semibold text-slate-900">TaskFlow</p>
            <p className="text-sm text-slate-500">
              Signed in as {user.name}
            </p>
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

        <TaskFlowApp />
      </div>
    );
  }

  const fieldError = (field: string) =>
    fieldErrors[field]?.[0] ?? "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            TaskFlow
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {mode === "login"
              ? "Log in to manage your tasks."
              : "Register to start managing your tasks securely."}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label
                htmlFor="auth-name"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Full name
              </label>
              <input
                id="auth-name"
                autoComplete="name"
                required
                maxLength={255}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              {fieldError("name") && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldError("name")}
                </p>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            {fieldError("email") && (
              <p className="mt-1 text-sm text-red-600">
                {fieldError("email")}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            {fieldError("password") && (
              <p className="mt-1 text-sm text-red-600">
                {fieldError("password")}
              </p>
            )}
          </div>

          {mode === "register" && (
            <div>
              <label
                htmlFor="auth-password-confirmation"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>
              <input
                id="auth-password-confirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              {fieldError("password_confirmation") && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldError("password_confirmation")}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          {mode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setFieldErrors({});
            }}
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {mode === "login" ? "Register" : "Log in"}
          </button>
        </p>
      </section>
    </main>
  );
}
