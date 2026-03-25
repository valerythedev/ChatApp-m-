import { Link } from "react-router-dom";
import { SignupForm } from "../components/SignupForm";
import { ThemeToggle } from "../components/ThemeToggle";

export function Signup() {
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
        <SignupForm />
      </main>
    </div>
  );
}
