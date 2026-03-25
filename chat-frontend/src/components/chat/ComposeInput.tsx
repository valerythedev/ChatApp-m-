import { useEffect, useId, useRef } from "react";

type ComposeInputProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPickFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileMultiple?: boolean;
};

export function ComposeInput({
  value,
  onChange,
  placeholder,
  disabled,
  fileInputRef,
  onPickFile,
  fileMultiple = true,
}: ComposeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileId = useId();
  const wch = Math.min(Math.max(value.length, placeholder.length, 8) + 1, 96);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.width = `${wch}ch`;
  }, [wch]);

  return (
    <div className="chat-terminal-input flex min-h-10 items-stretch border border-[var(--t-border)] bg-[var(--t-input)]">
      <input
        ref={fileInputRef}
        id={fileId}
        type="file"
        className="sr-only"
        tabIndex={-1}
        multiple={fileMultiple}
        onChange={onPickFile}
      />
      <label
        htmlFor={fileId}
        className="flex shrink-0 cursor-pointer items-center justify-center border-r border-[var(--t-border)] bg-transparent px-2.5 font-mono text-xs text-[var(--t-secondary)] hover:text-[var(--t-primary)]"
        title="Attach files"
      >
        [^]
      </label>
      <label
        className="flex min-w-0 flex-1 cursor-text items-center gap-1 px-2.5 py-2 font-mono text-sm"
        htmlFor="chat-msg-input"
      >
        <span className="shrink-0 text-[var(--t-secondary)]" aria-hidden>
          &gt;
        </span>
        <span className="inline-flex min-w-0 max-w-full items-center overflow-x-auto">
          <input
            ref={inputRef}
            id="chat-msg-input"
            type="text"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            className="min-w-0 shrink-0 border-0 bg-transparent p-0 font-mono text-[var(--t-primary)] outline-none"
            style={{ width: `${wch}ch`, caretColor: "transparent" }}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Message"
          />
          <span className="chat-terminal-caret shrink-0 font-mono text-[var(--t-primary)]" aria-hidden>
            █
          </span>
        </span>
      </label>
    </div>
  );
}
