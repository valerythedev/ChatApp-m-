import { useEffect, useState } from "react";

type Mode = "dark" | "light";

function readInitialMode(): Mode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>(readInitialMode);

  useEffect(() => {
    setMode(readInitialMode());
  }, []);

  const toggle = () => {
    const next: Mode = mode === "dark" ? "light" : "dark";
    setMode(next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle theme"
      className="inline-flex min-w-[2.75rem] shrink-0 items-center justify-center border border-[var(--t-border)] bg-[var(--t-input)] px-2 py-1 font-mono text-sm text-[var(--t-primary)] hover:border-[var(--t-muted)] hover:text-[var(--t-primary)]"
      aria-label="Toggle theme"
    >
      <span className={mode === "dark" ? "inline" : "hidden"} aria-hidden>
        [*]
      </span>
      <span className={mode === "light" ? "inline" : "hidden"} aria-hidden>
        [·]
      </span>
    </button>
  );
}
