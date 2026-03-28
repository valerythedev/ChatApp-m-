import { useEffect, useRef, useState, useSyncExternalStore } from "react";

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

type TypedTextProps = {
  text: string;
  speedMs?: number;
  onComplete?: () => void;
  className?: string;
  as?: "span" | "p";
};

export function TypedText({
  text,
  speedMs = 28,
  onComplete,
  className,
  as: Comp = "span",
}: TypedTextProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const [len, setLen] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
    setLen(0);
  }, [text]);

  useEffect(() => {
    if (reducedMotion) return;
    if (len >= text.length) return;
    const t = window.setTimeout(() => setLen((c) => c + 1), speedMs);
    return () => clearTimeout(t);
  }, [len, text, speedMs, reducedMotion]);

  const cap = reducedMotion ? text.length : len;
  const visible = text.slice(0, cap);
  const done = text.length === 0 || cap >= text.length;

  useEffect(() => {
    if (!done) return;
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete?.();
  }, [done, onComplete]);

  return (
    <Comp className={className}>
      {visible}
      {!done && (
        <span
          className="typed-text-caret ml-px inline-block w-[0.55ch] translate-y-px text-[var(--t-primary)]"
          aria-hidden
        >
          █
        </span>
      )}
    </Comp>
  );
}
