import { X } from 'lucide-react';
import { useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { parseKeywords } from '@/lib/cardModel';
import { cn } from '@/lib/utils';

interface KeywordChipsProps {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  invalid?: boolean;
  describedBy?: string;
}

export function KeywordChips({ id, value, onChange, invalid, describedBy }: KeywordChipsProps) {
  const [pending, setPending] = useState('');

  const add = (raw: string): void => {
    const merged = parseKeywords([...value, ...parseKeywords(raw)].join('\n'));
    if (merged.length !== value.length) onChange(merged);
    setPending('');
  };

  const remove = (phrase: string): void => {
    onChange(value.filter(item => item !== phrase));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
      event.preventDefault();
      add(pending);
    } else if (event.key === 'Backspace' && !pending && value.length) {
      remove(value[value.length - 1]);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>): void => {
    const text = event.clipboardData.getData('text');
    if (/[\n,;]/.test(text)) {
      event.preventDefault();
      add(text);
    }
  };

  return (
    <div
      className={cn(
        'flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
        invalid && 'border-destructive'
      )}
    >
      {value.map(phrase => (
        <span
          key={phrase}
          className="inline-flex items-center gap-1 rounded-md bg-signal-soft py-0.5 pr-1 pl-2 font-mono text-xs text-ink"
        >
          {phrase}
          <button
            type="button"
            onClick={() => remove(phrase)}
            className="grid size-5 place-items-center rounded text-ink-soft hover:bg-white hover:text-ink"
            aria-label={`Remove keyword ${phrase}`}
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={pending}
        onChange={event => setPending(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => pending.trim() && add(pending)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        placeholder={value.length ? 'Add another…' : 'Type a phrase, press Enter'}
        className="min-w-[10rem] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
