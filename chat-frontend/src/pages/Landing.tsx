import { useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TypedText } from "@/components/TypedText";

/** ms per character — landing feature lines type faster than full “slow terminal” pacing */
const FEATURE_TYPE_MS = 42;

const features = [
  "Direct messages with other users — pick someone from People or open an existing thread.",
  "Terminal-inspired UI: monospace type, read receipts (sent / read / over 24h), and a prompt-style composer.",
  "Share images, video, audio, and documents within size limits.",
  "Swipe (or drag) conversations left to archive; restore from the Archived tab.",
  "Light and dark theme — your choice is saved in the browser.",
];

function Landing() {
  const [featuresDoneCount, setFeaturesDoneCount] = useState(0);

  return (
    <div className="chat-terminal flex min-h-screen flex-col bg-[var(--t-bg)] font-mono text-[var(--t-primary)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--t-border)] px-4 py-3">
        <span className="text-xs text-[var(--t-secondary)]">tiny-chat ~ landing</span>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 md:py-14">
        <div className="border border-[var(--t-border)] bg-[var(--t-sidebar)] p-5 md:p-8">
          <p className="text-xs text-[var(--t-muted)]">$ cat ./ABOUT.md</p>
          <h1 className="mt-4 text-xl font-normal tracking-tight md:text-2xl">
            <span className="text-[var(--t-secondary)]"># </span>Tiny Chat
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--t-secondary)]">
            A small real-time chat app with a command-line aesthetic. Sign in to message people, attach
            files, and keep threads in your inbox — without leaving the terminal vibe.
          </p>
        </div>

        <section className="mt-8">
          <h2 className="mb-3 text-xs font-normal uppercase tracking-wider text-[var(--t-muted)]">
            &gt; what you can do
          </h2>
          <ul className="space-y-3 text-sm leading-relaxed text-[var(--t-secondary)]">
            {features.map((line, i) => {
              if (i > featuresDoneCount) return null;
              const isTyping = i === featuresDoneCount;
              return (
                <li
                  key={line}
                  className="flex gap-2 border-l-2 border-[var(--t-border)] pl-3"
                >
                  <span className="shrink-0 text-[var(--t-muted)]">—</span>
                  {isTyping ? (
                    <TypedText
                      as="span"
                      text={line}
                      speedMs={FEATURE_TYPE_MS}
                      onComplete={() =>
                        setFeaturesDoneCount((c) => c + 1)
                      }
                    />
                  ) : (
                    <span>{line}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-8 rounded-sm border border-dashed border-[var(--t-border)] p-4 text-xs text-[var(--t-muted)]">
          <span className="text-[var(--t-online)]">[+]</span> You need an account to use chat. New here?
          Create one in a minute.
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            to="/login"
            className="inline-flex border border-[var(--t-border)] bg-[var(--t-input)] px-4 py-2.5 text-sm text-[var(--t-primary)] transition hover:border-[var(--t-muted)]"
          >
            [ Log in ]
          </Link>
          <Link
            to="/signup"
            className="inline-flex border border-[var(--t-border)] px-4 py-2.5 text-sm text-[var(--t-primary)] transition hover:border-[var(--t-muted)]"
          >
            [ Sign up ]
          </Link>
        </div>

        <p className="mt-auto pt-12 text-center text-[11px] text-[var(--t-muted)]">
          Real-time messaging · sessions stored in your browser after sign-in
        </p>
      </main>
    </div>
  );
}

export default Landing;
