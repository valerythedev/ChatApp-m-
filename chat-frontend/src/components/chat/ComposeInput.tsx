import { Paperclip } from "lucide-react";
import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";

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
  const fileId = useId();
  const inputId = useId();
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setIsTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setIsTyping(false), 500);
  };

  const shouldBlink = isFocused && !isTyping && !disabled;
  const showCursor = isFocused && !disabled;

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

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
        className="flex shrink-0 cursor-pointer items-center justify-center border-r border-[var(--t-border)] bg-transparent px-2.5 text-[var(--t-secondary)] hover:text-[var(--t-primary)]"
        title="Attach files"
      >
        <span className="sr-only">Attach files</span>
        <Paperclip className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </label>
      <label
        htmlFor={inputId}
        className="flex min-w-0 flex-1 cursor-text items-start gap-1 px-2.5 py-2 font-mono text-sm leading-normal"
      >
        <span className="mt-0.5 shrink-0 text-[var(--t-secondary)]" aria-hidden>
          &gt;
        </span>
        <div className="terminal-compose-wrapper min-w-0 flex-1">
          <span className="terminal-compose-mirror">
            {value}
            {showCursor ? (
              <span
                className={
                  shouldBlink ? "terminal-compose-cursor" : "terminal-compose-cursor terminal-compose-cursor-no-blink"
                }
                aria-hidden
              >
                █
              </span>
            ) : null}
          </span>
          <textarea
            id={inputId}
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            className="terminal-compose-real-input"
            value={value}
            rows={1}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              setIsTyping(false);
              clearTimeout(typingTimeout.current);
            }}
            aria-label={placeholder}
          />
        </div>
      </label>
    </div>
  );
}
