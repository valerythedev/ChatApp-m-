import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function pseudoWaveformHeights(seed: string, count: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    const t = ((h >>> 0) % 1000) / 1000;
    out.push(0.22 + t * 0.78);
  }
  return out;
}

function formatAudioClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  src: string;
  messageId: string;
  fromMe: boolean;
};

export function AudioMessageBubble({ src, messageId, fromMe }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const heights = useMemo(() => pseudoWaveformHeights(messageId, 40), [messageId]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [playing]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onMeta = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onTime = () => setCurrent(el.currentTime);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const progress = duration > 0 ? Math.min(1, current / duration) : 0;
  const activeBars = Math.ceil(progress * heights.length);

  const bubbleClass = fromMe
    ? "bg-[#1a7ffb] text-white shadow-sm"
    : "border border-[var(--t-border)] bg-[var(--t-input)] text-[var(--t-primary)]";

  const dashedClass = fromMe ? "border-white/50" : "border-[var(--t-muted)]/60";
  const barDim = fromMe ? "bg-white/35" : "bg-[var(--t-muted)]/50";
  const barBright = fromMe ? "bg-white" : "bg-[var(--t-primary)]";

  return (
    <div
      className={`mt-2 flex min-w-[min(100%,16rem)] max-w-full items-center gap-1.5 rounded-2xl rounded-br-sm px-2.5 py-2 ${bubbleClass}`}
    >
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={toggle}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
          fromMe ? "bg-white text-[#1a7ffb]" : "bg-[var(--t-primary)] text-[var(--t-bg)]"
        }`}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        {playing ? (
          <Pause className="h-4 w-4" strokeWidth={2.25} />
        ) : (
          <Play className="ml-0.5 h-4 w-4" strokeWidth={2.25} />
        )}
      </button>
      <div className={`h-0 w-5 shrink-0 self-center border-t border-dashed sm:w-6 ${dashedClass}`} aria-hidden />
      <div className="flex h-9 min-w-0 flex-1 items-center justify-center gap-[2px]">
        {heights.map((rel, i) => (
          <div
            key={i}
            className={`w-[2.5px] shrink-0 rounded-full transition-colors ${i < activeBars ? barBright : barDim}`}
            style={{ height: `${Math.round(6 + rel * 24)}px` }}
          />
        ))}
      </div>
      <div className={`h-0 w-5 shrink-0 self-center border-t border-dashed sm:w-6 ${dashedClass}`} aria-hidden />
      <span
        className={`shrink-0 pr-0.5 font-mono text-[11px] tabular-nums tracking-tight ${fromMe ? "text-white/95" : "text-[var(--t-secondary)]"}`}
      >
        {formatAudioClock(duration > 0 ? duration : 0)}
      </span>
    </div>
  );
}
