import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ACTION_TYPES,
  LIMITS,
  actionTypeLabel,
  actionValueHint,
  isActionType,
  type CardAction,
} from '@/lib/cardModel';
import { FormRow } from './FormRow';

const NONE = 'none';

interface ActionFieldsProps {
  role: 'primary' | 'secondary';
  value: CardAction;
  error?: string;
  onChange: (next: CardAction) => void;
}

export function ActionFields({ role, value, error, onChange }: ActionFieldsProps) {
  const prefix = `${role}-action`;
  const hint = value.type ? actionValueHint(value.type) : null;

  return (
    <fieldset className="grid gap-3 rounded-lg border border-dashed border-border bg-paper/60 p-3 sm:grid-cols-[minmax(0,11rem)_1fr]">
      <legend className="px-1 font-display text-sm font-semibold capitalize">{role} button</legend>
      <FormRow id={`${prefix}-type`} label="Does">
        <Select
          value={value.type ?? NONE}
          onValueChange={next => onChange({ ...value, type: isActionType(next) ? next : null })}
        >
          <SelectTrigger id={`${prefix}-type`} className="w-full bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No button</SelectItem>
            {ACTION_TYPES.map(type => (
              <SelectItem key={type} value={type}>
                {actionTypeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>
      {value.type && hint ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <FormRow id={`${prefix}-label`} label="Label" count={{ value: value.label.length, max: LIMITS.actionLabel }}>
            <Input
              id={`${prefix}-label`}
              value={value.label}
              maxLength={LIMITS.actionLabel}
              onChange={event => onChange({ ...value, label: event.target.value })}
              placeholder={role === 'primary' ? 'View product' : 'Ask a question'}
              className="bg-card"
            />
          </FormRow>
          <FormRow id={`${prefix}-value`} label={hint.label} error={error}>
            <Input
              id={`${prefix}-value`}
              value={value.value}
              maxLength={LIMITS.actionValue}
              onChange={event => onChange({ ...value, value: event.target.value })}
              placeholder={hint.placeholder}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? `${prefix}-value-error` : undefined}
              className="bg-card font-mono text-xs"
            />
          </FormRow>
        </div>
      ) : (
        <p className="self-center text-sm text-ink-soft">This card won&apos;t show a {role} button.</p>
      )}
    </fieldset>
  );
}
