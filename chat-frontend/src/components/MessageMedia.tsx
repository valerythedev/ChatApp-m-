import { mediaUrlToAbsolute } from "@/services/api";
import type { ChatMessage } from "@/types/chat";

type Props = {
  message: ChatMessage;
};

export function MessageMedia({ message }: Props) {
  const url = mediaUrlToAbsolute(message.mediaUrl ?? null);
  if (!url) return null;

  const type = message.mediaType ?? "";

  if (type.startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-2 block max-w-xs">
        <img
          src={url}
          alt={message.fileName ?? "attachment"}
          className="max-h-48 border border-[var(--t-border)] object-cover"
        />
      </a>
    );
  }

  if (type.startsWith("video/")) {
    return (
      <video controls className="mt-2 max-h-56 max-w-xs border border-[var(--t-border)]" src={url}>
        <track kind="captions" />
      </video>
    );
  }

  if (type.startsWith("audio/")) {
    return <audio controls className="mt-2 w-full max-w-xs" src={url} />;
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
