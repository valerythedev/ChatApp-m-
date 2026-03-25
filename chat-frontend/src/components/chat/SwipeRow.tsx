import { useCallback, useEffect, useRef, useState } from "react";

const SNAP = 40;

type SwipeRowProps = {
  children: React.ReactNode;
  onArchive: () => void;
  onSecondAction: () => void;
  disabled?: boolean;
  secondLabel?: string;
};

export function SwipeRow({
  children,
  onArchive,
  onSecondAction,
  disabled,
  secondLabel = "Archive",
}: SwipeRowProps) {
  const rowRef = useRef<HTMLLIElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const underRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  openRef.current = open;
  const drag = useRef({ active: false, startX: 0, startTx: 0 });

  const revealW = useCallback(() => underRef.current?.offsetWidth ?? 0, []);

  const clamp = useCallback(
    (x: number) => {
      const w = revealW();
      return Math.max(-w, Math.min(0, x));
    },
    [revealW]
  );

  const setTx = useCallback((px: number) => {
    const el = surfaceRef.current;
    if (!el) return;
    el.style.transform = `translateX(${px}px)`;
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setTx(0);
  }, [setTx]);

  const snapFromCurrent = useCallback(() => {
    const w = revealW();
    const el = surfaceRef.current;
    if (!el || w <= 0) return;
    const m = el.style.transform.match(/translateX\(([-0-9.]+)px\)/);
    const cur = m?.[1] != null ? parseFloat(m[1]) : 0;
    if (cur < -SNAP || cur <= -w * 0.45) {
      setOpen(true);
      setTx(-w);
    } else {
      close();
    }
  }, [revealW, setTx, close]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const parseTx = () => {
      const m = surface.style.transform.match(/translateX\(([-0-9.]+)px\)/);
      return m?.[1] != null ? parseFloat(m[1]) : 0;
    };

    const start = (clientX: number) => {
      drag.current.active = true;
      surface.classList.add("is-dragging");
      drag.current.startX = clientX;
      drag.current.startTx = openRef.current ? -revealW() : parseTx();
    };

    const move = (clientX: number) => {
      if (!drag.current.active) return;
      setTx(clamp(drag.current.startTx + (clientX - drag.current.startX)));
    };

    const end = () => {
      if (!drag.current.active) return;
      drag.current.active = false;
      surface.classList.remove("is-dragging");
      snapFromCurrent();
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || e.touches.length !== 1) return;
      start(t.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!drag.current.active || !t || e.touches.length !== 1) return;
      move(t.clientX);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      start(e.clientX);
      const mm = (ev: MouseEvent) => move(ev.clientX);
      const mu = () => {
        document.removeEventListener("mousemove", mm);
        document.removeEventListener("mouseup", mu);
        end();
      };
      document.addEventListener("mousemove", mm);
      document.addEventListener("mouseup", mu);
    };

    surface.addEventListener("touchstart", onTouchStart, { passive: true });
    surface.addEventListener("touchmove", onTouchMove, { passive: true });
    surface.addEventListener("touchend", end);
    surface.addEventListener("touchcancel", end);
    surface.addEventListener("mousedown", onMouseDown);

    return () => {
      surface.removeEventListener("touchstart", onTouchStart);
      surface.removeEventListener("touchmove", onTouchMove);
      surface.removeEventListener("touchend", end);
      surface.removeEventListener("touchcancel", end);
      surface.removeEventListener("mousedown", onMouseDown);
    };
  }, [clamp, revealW, setTx, snapFromCurrent]);

  useEffect(() => {
    const w = revealW();
    if (open && surfaceRef.current) setTx(-w);
  }, [open, revealW, setTx]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const hit = t?.closest?.("[data-swipe-row]");
      if (hit !== rowRef.current) close();
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [close]);

  return (
    <li ref={rowRef} data-swipe-row className="relative overflow-hidden border-b border-[var(--t-border)]" title="Swipe left for actions">
      <div
        ref={underRef}
        className={`absolute inset-0 z-0 flex justify-end ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <button
          type="button"
          className="min-w-10 shrink-0 bg-[var(--t-muted)] px-2.5 font-mono text-[11px] text-[var(--t-bg)]"
          title="Archive"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onArchive();
            close();
          }}
        >
          [A]
        </button>
        <button
          type="button"
          className="min-w-10 shrink-0 px-2.5 font-mono text-[11px] text-[var(--t-bg)]"
          style={{ background: "var(--t-danger)" }}
          title={secondLabel}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onSecondAction();
            close();
          }}
        >
          [X]
        </button>
      </div>
      <div
        ref={surfaceRef}
        className="relative z-[1] bg-[var(--t-sidebar)] transition-transform duration-200 ease-out will-change-transform [&.is-dragging]:transition-none"
      >
        {children}
      </div>
    </li>
  );
}
