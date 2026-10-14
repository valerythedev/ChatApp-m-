import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MESSAGE_REACTION_SYMBOLS } from "@/constants/messageReactions";
import type { ChatMessage } from "@/types/chat";

type Anchor = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
};

type MenuProps = {
  message: ChatMessage;
  currentUserId: string;
  mine: boolean;
  anchor: Anchor;
  isSending: boolean;
  onPick: (symbol: string) => void;
  onDelete?: () => void;
  onClose: () => void;
};

function reactionSummary(message: ChatMessage): Array<[string, number]> {
  const map = new Map<string, number>();
  for (const r of message.reactions ?? []) {
    map.set(r.symbol, (map.get(r.symbol) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function MessageReactionBadges({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const summary = useMemo(() => reactionSummary(message), [message]);
  if (summary.length === 0) return null;

  return (
    <div className={`mt-1.5 flex flex-wrap gap-1 ${mine ? "justify-end" : "justify-start"}`}>
      {summary.map(([sym, n]) => (
        <span
          key={sym}
          className="rounded-full border border-[var(--t-border)] bg-[var(--t-sidebar)] px-1.5 py-0.5 font-mono text-[11px] leading-none text-[var(--t-primary)] shadow-sm"
        >
          {sym}
          {n > 1 ? <span className="text-[var(--t-muted)]"> {n}</span> : null}
        </span>
      ))}
    </div>
  );
}

export function MessageReactionMenu({
  message,
  currentUserId,
  mine,
  anchor,
  isSending,
  onPick,
  onDelete,
  onClose,
}: MenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);

  const mineSymbol = useMemo(
    () => (message.reactions ?? []).find((r) => String(r.userId) === String(currentUserId))?.symbol ?? null,
    [message.reactions, currentUserId],
  );

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const margin = 8;
    let left = mine ? anchor.right - width : anchor.left;
    left = Math.min(Math.max(margin, left), window.innerWidth - width - margin);
    let top = anchor.top - height - 8;
    if (top < margin) {
      top = Math.min(anchor.bottom + 8, window.innerHeight - height - margin);
    }
    setBox({ top, left });
  }, [anchor, mine]);

  useEffect(() => {
    const openedAt = performance.now();
    const close = () => onCloseRef.current();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: PointerEvent) => {
      if (performance.now() - openedAt < 100) return;
      if (panelRef.current?.contains(e.target as Node)) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, []);

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-label="Reactions"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        top: box?.top ?? 0,
        left: box?.left ?? 0,
        visibility: box ? "visible" : "hidden",
      }}
      className="fixed z-50 w-max overflow-hidden rounded-2xl border border-[var(--t-muted)] bg-[var(--t-input)] text-[var(--t-primary)] shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
    >
      <div className="grid grid-cols-5 gap-0.5 p-1.5" role="group" aria-label="Text reactions">
        {MESSAGE_REACTION_SYMBOLS.map((sym) => {
          const selected = mineSymbol === sym;
          return (
            <button
              key={sym}
              type="button"
              role="menuitemradio"
              aria-checked={selected}
              disabled={isSending}
              onClick={() => onPick(sym)}
              className={`flex h-10 w-11 items-center justify-center rounded-full font-mono text-[15px] leading-none transition disabled:opacity-50 ${
                selected
                  ? "bg-[var(--t-primary)] text-[var(--t-bg)]"
                  : "text-[var(--t-primary)] hover:bg-[var(--t-sidebar)]"
              }`}
            >
              {sym}
            </button>
          );
        })}
      </div>
      {onDelete ? (
        <button
          type="button"
          role="menuitem"
          className="w-full border-t border-[var(--t-muted)] px-3 py-2.5 text-left text-[13px] text-[var(--t-primary)] hover:bg-[var(--t-sidebar)]"
          onClick={onDelete}
        >
          delete
        </button>
      ) : null}
    </div>,
    document.querySelector(".chat-terminal") ?? document.body,
  );
}
