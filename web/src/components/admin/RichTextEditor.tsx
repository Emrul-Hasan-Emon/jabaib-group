"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link2,
  Eraser,
  Heading3,
} from "lucide-react";

/** Toolbar definition — static so nothing ref-touching is built during render. */
const TOOLS: {
  label: string;
  icon: typeof Bold;
  command?: string;
  arg?: string;
  className?: string;
}[] = [
  { label: "Bold", icon: Bold, command: "bold", className: "font-bold" },
  { label: "Italic", icon: Italic, command: "italic", className: "italic" },
  { label: "Underline", icon: Underline, command: "underline" },
  { label: "Strikethrough", icon: Strikethrough, command: "strikeThrough" },
  { label: "Heading", icon: Heading3, command: "formatBlock", arg: "<h3>" },
  { label: "Bulleted list", icon: List, command: "insertUnorderedList" },
  { label: "Numbered list", icon: ListOrdered, command: "insertOrderedList" },
  { label: "Quote", icon: Quote, command: "formatBlock", arg: "<blockquote>" },
  { label: "Link", icon: Link2 },
  { label: "Clear formatting", icon: Eraser, command: "removeFormat" },
];

/**
 * Small dependency-free rich text editor for admin-authored content (the payment
 * gateway description). It stores plain HTML, which the server sanitizes against
 * an allow-list before storing — so formatting survives a round trip and
 * anything unsupported is dropped server-side rather than trusted here.
 *
 * Pastes are inserted as plain text so a pasted Word/Docs page cannot smuggle
 * styles or scripts into the stored markup.
 */
export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = "Write the payment instructions…",
  rows = 6,
}: {
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  // Adopt external changes (e.g. loading a record) without clobbering the caret.
  useEffect(() => {
    const el = ref.current;
    if (!el || focused) return;
    const next = value ?? "";
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [value, focused]);

  const emit = useCallback(() => {
    onChange(ref.current?.innerHTML ?? "");
  }, [onChange]);

  const run = (command: string, arg?: string) => {
    ref.current?.focus();
    // execCommand is deprecated but remains the only zero-dependency way to
    // apply inline formatting to a selection; the output is sanitized server-side.
    document.execCommand(command, false, arg);
    emit();
  };

  const addLink = () => {
    const url = window.prompt("Link URL (https://…)");
    if (!url) return;
    run("createLink", url);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    emit();
  };

  return (
    <div>
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1.5 overflow-hidden rounded-lg border border-input">
        <div className="flex flex-wrap gap-1 border-b border-input bg-muted/40 p-1.5">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.label}
                type="button"
                title={tool.label}
                aria-label={tool.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  tool.command ? run(tool.command, tool.arg) : addLink()
                }
                className={`flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition hover:bg-card hover:text-foreground ${tool.className ?? ""}`}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            emit();
          }}
          onPaste={onPaste}
          data-placeholder={placeholder}
          style={{ minHeight: `${rows * 1.5}rem` }}
          className="rich-editor rich-text px-3 py-2 text-sm leading-relaxed outline-none"
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Formatting is kept (headings, bold, lists, links). Anything unsupported
        is removed when the gateway is saved.
      </p>
    </div>
  );
}
