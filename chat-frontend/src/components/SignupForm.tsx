import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginRequest, signupRequest } from "../services/api";

export function SignupForm() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signupRequest({
        username,
        password,
        confirmPassword,
        email: email.trim() || undefined,
        age: age.trim() ? Number(age) : undefined,
      });
      const data = await loginRequest(username, password);
      localStorage.setItem("token", data.token);
      navigate("/chat", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
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
              # register
            </h1>
            <p className="text-xs text-[var(--t-muted)]">
              Create an account to start chatting.
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
            minLength={2}
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="auth-field"
            placeholder="jane"
          />
        </label>

        <label className="mt-3 block text-xs text-[var(--t-secondary)]">
          email <span className="text-[var(--t-muted)]">(optional)</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-field"
            placeholder="you@example.com"
          />
        </label>

        <label className="mt-3 block text-xs text-[var(--t-secondary)]">
          password
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-field"
            placeholder="••••••••"
          />
        </label>

        <label className="mt-3 block text-xs text-[var(--t-secondary)]">
          confirm password
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="auth-field"
            placeholder="••••••••"
          />
        </label>

        <label className="mt-3 block text-xs text-[var(--t-secondary)]">
          age <span className="text-[var(--t-muted)]">(optional, 16+)</span>
          <input
            type="number"
            min={16}
            max={120}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="auth-field"
            placeholder="—"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full border border-[var(--t-border)] bg-[var(--t-input)] px-4 py-2 text-sm text-[var(--t-primary)] hover:border-[var(--t-muted)] disabled:opacity-50"
        >
          {loading ? "[ … ]" : "[ Sign up ]"}
        </button>
      </form>

      <div className="border-t border-[var(--t-border)] bg-[var(--t-bg)] px-4 py-3 text-center text-xs text-[var(--t-muted)]">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-[var(--t-secondary)] hover:text-[var(--t-primary)]"
        >
          [ Sign in ]
        </Link>
      </div>
    </div>
  );
}
