import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AudioMessageBubble } from "@/components/AudioMessageBubble";
import { mediaUrlToAbsolute } from "@/services/api";
import type { ChatMessage } from "@/types/chat";

type Props = {
  message: ChatMessage;
  fromMe?: boolean;
};

type LightboxKind = "image" | "video" | null;

function MediaLightbox({
  open,
  ariaLabel,
  onClose,
  children,
}: {
  open: boolean;
  ariaLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 font-mono"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] max-w-full flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-400">
          <span>Esc or click outside to close</span>
          <button
            type="button"
            className="border border-neutral-500 px-2 py-1 text-neutral-200 hover:bg-neutral-800/90"
            onClick={onClose}
          >
            [ close ]
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function VideoLightboxPlayer({ url }: { url: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    void el?.play().catch(() => {});
    return () => {
      ref.current?.pause();
    };
  }, [url]);
  return (
    <video
      ref={ref}
      src={url}
      controls
      playsInline
      className="max-h-[85vh] max-w-full bg-black object-contain shadow-lg outline-none ring-1 ring-white/15"
    >
      <track kind="captions" />
    </video>
  );
}

export function MessageMedia({ message, fromMe = false }: Props) {
  const [lightbox, setLightbox] = useState<LightboxKind>(null);
  const url = mediaUrlToAbsolute(message.mediaUrl ?? null);

  useEffect(() => {
    setLightbox(null);
  }, [message.id]);

  if (!url) return null;

  const type = message.mediaType ?? "";
  const close = () => setLightbox(null);

  if (type.startsWith("image/")) {
    const alt = message.fileName ?? "attachment";
    return (
      <>
        <button
          type="button"
          onClick={() => setLightbox("image")}
          className="mt-2 block max-w-xs cursor-zoom-in border-0 bg-transparent p-0 text-left"
          aria-haspopup="dialog"
          aria-expanded={lightbox === "image"}
        >
          <img
            src={url}
            alt={alt}
            className="max-h-48 border border-[var(--t-border)] object-cover"
          />
        </button>
        <MediaLightbox open={lightbox === "image"} ariaLabel="Image preview" onClose={close}>
          <img
            src={url}
            alt={alt}
            className="max-h-[85vh] max-w-full object-contain shadow-lg outline-none ring-1 ring-white/15"
            draggable={false}
          />
        </MediaLightbox>
      </>
    );
  }

  if (type.startsWith("video/")) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLightbox("video")}
          className="group relative mt-2 block max-w-xs cursor-pointer border-0 bg-transparent p-0 text-left"
          aria-haspopup="dialog"
          aria-expanded={lightbox === "video"}
        >
          <video
            src={url}
            muted
            playsInline
            preload="metadata"
            className="pointer-events-none max-h-56 w-full border border-[var(--t-border)] object-cover"
          />
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/40"
            aria-hidden
          >
            <span className="rounded-full border border-white/40 bg-white/90 px-2.5 py-1.5 text-xs text-neutral-900 shadow">
              ▶
            </span>
          </span>
        </button>
        <MediaLightbox open={lightbox === "video"} ariaLabel="Video preview" onClose={close}>
          <VideoLightboxPlayer url={url} />
        </MediaLightbox>
      </>
    );
  }

  if (type.startsWith("audio/")) {
    return (
      <AudioMessageBubble src={url} messageId={message.id || message._id} fromMe={fromMe} />
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex max-w-xs items-center gap-2 border border-[var(--t-border)] bg-[var(--t-input)] px-3 py-2 font-mono text-sm text-[var(--t-primary)]"
    >
      <span className="shrink-0 text-[var(--t-muted)]">[f]</span>
      <span className="truncate">{message.fileName ?? "Download file"}</span>
    </a>
  );
}
