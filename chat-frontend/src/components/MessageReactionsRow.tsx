import { useMemo } from "react";
import { MESSAGE_REACTION_SYMBOLS } from "@/constants/messageReactions";
import type { ChatMessage } from "@/types/chat";

type Props = {
  message: ChatMessage;
  currentUserId: string;
  isSending: boolean;
  onPick: (symbol: string) => void;
};

export function MessageReactionsRow({ message, currentUserId, isSending, onPick }: Props) {
  const rows = message.reactions ?? [];
  const mineSymbol = useMemo(
    () => rows.find((r) => String(r.userId) === String(currentUserId))?.symbol ?? null,
    [rows, currentUserId],
  );

  const summary = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.symbol, (map.get(r.symbol) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [rows]);

  return (
    <div className="mt-2 border-t border-[var(--t-border)]/70 pt-2">
      {summary.length > 0 ? (
        <div className="mb-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] font-mono text-[var(--t-secondary)]">
          {summary.map(([sym, n]) => (
            <span key={sym}>
              <span className="text-[var(--t-primary)]">{sym}</span>
              {n > 1 ? <span className="text-[var(--t-muted)]"> ×{n}</span> : null}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1" role="group" aria-label="Text reactions">
        {MESSAGE_REACTION_SYMBOLS.map((sym) => (
          <button
            key={sym}
            type="button"
            disabled={isSending}
            onClick={() => onPick(sym)}
            className={`rounded-sm border px-1.5 py-0.5 font-mono text-[11px] leading-tight transition ${
              mineSymbol === sym
                ? "border-[var(--t-primary)] bg-[var(--t-input)] text-[var(--t-primary)]"
                : "border-[var(--t-border)] text-[var(--t-secondary)] hover:border-[var(--t-muted)]"
            } ${isSending ? "opacity-50" : ""}`}
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}
