import { useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils.ts';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  language?: string;
  readOnly?: boolean;
  minHeight?: string;
  height?: string;
  placeholder?: string;
  onRun?: () => void;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = 'javascript',
  readOnly = false,
  minHeight = '320px',
  height,
  placeholder = '// Write your code here...',
  onRun,
  className,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const lines = value.split('\n');
  const lineCount = Math.max(lines.length, 1);

  // Synchronize line numbers gutter scroll with textarea scroll
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Run shortcut: Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun?.();
      return;
    }

    // Handle Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      // Move cursor 2 characters forward
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-[#0B0E14] text-[#E8ECF4] overflow-hidden flex flex-col font-mono text-xs',
        className
      )}
      style={{
        height: height ?? minHeight,
      }}
    >
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#232B3B] bg-[#121723] select-none shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]/80" />
          </div>
          <span className="text-[11px] font-semibold text-[#8089A0] uppercase tracking-wider ml-2">
            {language}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyCode}
            className="p-1 rounded text-[#8089A0] hover:text-[#E8ECF4] hover:bg-[#182030] transition-colors"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Editor Body: Line numbers + Textarea with VS Code scroll */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Line numbers gutter */}
        <div
          ref={gutterRef}
          className="select-none py-3 pl-3 pr-2 text-right text-[#5F657B] bg-[#0E121A] border-r border-[#232B3B]/60 font-mono text-[11px] leading-5 shrink-0 overflow-hidden"
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="flex-1 w-full h-full p-3 font-mono text-xs leading-5 bg-transparent text-[#E8ECF4] focus:outline-none resize-none selection:bg-primary/30 overflow-y-auto overflow-x-auto whitespace-pre [scrollbar-width:thin] [scrollbar-color:#232B3B_transparent]"
          style={{ tabSize: 2 }}
        />
      </div>
    </div>
  );
}

