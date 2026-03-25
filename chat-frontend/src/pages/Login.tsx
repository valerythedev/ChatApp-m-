import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginRequest } from "../services/api";
import { ThemeToggle } from "../components/ThemeToggle";

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginRequest(username, password);
      localStorage.setItem("token", data.token);
      navigate("/chat", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-terminal flex min-h-screen flex-col bg-[var(--t-bg)] font-mono text-[var(--t-primary)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--t-border)] px-4 py-3">
        <Link
          to="/"
          className="text-xs text-[var(--t-secondary)] hover:text-[var(--t-primary)]"
        >
          ← ~/home
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-md border border-[var(--t-border)] bg-[var(--t-sidebar)]">
          <div className="border-b border-[var(--t-border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <img
                src="/favicon.svg"
                alt=""
                className="h-8 w-8 shrink-0 opacity-90"
              />
              <div>
                <h1 className="text-sm font-semibold text-[var(--t-primary)]">
                  # sign-in
                </h1>
                <p className="text-xs text-[var(--t-muted)]">
                  Enter your username and password to continue.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-4 py-4">
            {error && (
              <div className="mb-4 border border-[var(--t-border)] bg-[var(--t-bg)] px-3 py-2 text-xs text-[var(--t-secondary)]">
                {error}
              </div>
            )}

            <label className="block text-xs text-[var(--t-secondary)]">
              username
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-field"
                placeholder="jane"
              />
            </label>

            <label className="mt-4 block text-xs text-[var(--t-secondary)]">
              password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-field"
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full border border-[var(--t-border)] bg-[var(--t-input)] px-4 py-2 text-sm text-[var(--t-primary)] hover:border-[var(--t-muted)] disabled:opacity-50"
            >
              {loading ? "[ … ]" : "[ Sign in ]"}
            </button>
          </form>

          <div className="border-t border-[var(--t-border)] bg-[var(--t-bg)] px-4 py-3 text-center text-xs text-[var(--t-muted)]">
            No account?{" "}
            <Link
              to="/signup"
              className="text-[var(--t-secondary)] hover:text-[var(--t-primary)]"
            >
              [ Sign up ]
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
