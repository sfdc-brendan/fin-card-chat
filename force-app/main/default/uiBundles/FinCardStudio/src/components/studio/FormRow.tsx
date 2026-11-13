import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormRowProps {
  id: string;
  label: string;
  hint?: string;
  warning?: string;
  error?: string;
  count?: { value: number; max: number };
  className?: string;
  children: ReactNode;
}

export function FormRow({ id, label, hint, warning, error, count, className, children }: FormRowProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-soft">
          {label}
        </Label>
        {count && (
          <span
            className={cn(
              'font-mono text-[0.7rem] tabular-nums text-ink-soft',
              count.value > count.max && 'text-destructive'
            )}
          >
            {count.value}/{count.max}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : warning ? (
        <p id={`${id}-warning`} role="status" className="text-xs font-medium text-[#8a5a00]">
          {warning}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-ink-soft">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export const textAreaClass =
  'w-full min-w-0 rounded-lg border border-input bg-card px-2.5 py-2 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive';
