import { Monitor, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { linkAction, type CardSize, type V1Card } from '@/lib/cardModel';
import { CardPreview, describeAction } from './CardPreview';

type Viewport = 'mobile' | 'desktop';

const ACCENTS = ['#0176d3', '#2855ed', '#356952', '#b86e00'] as const;

/** Mirrors .fin-turn__card and .fin-turn__card_compact in finCardChat.css. */
const SLOT_WIDTH: Record<CardSize, string> = {
  standard: 'flex-[1_1_15rem] max-w-[20rem]',
  compact: 'flex-[1_1_11.5rem] max-w-[15rem]',
};

interface PreviewFrameProps {
  card: V1Card;
  size: CardSize;
}

export function PreviewFrame({ card, size }: PreviewFrameProps) {
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [accent, setAccent] = useState<string>(ACCENTS[0]);

  return (
    <section aria-labelledby="preview-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="preview-heading" className="text-xl font-semibold">
          Live preview
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Site accent color">
            {ACCENTS.map(color => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={accent === color}
                aria-label={`Accent ${color}`}
                onClick={() => setAccent(color)}
                className={cn(
                  'size-5 rounded-full ring-offset-2 ring-offset-paper transition-shadow',
                  accent === color && 'ring-2 ring-ink'
                )}
                style={{ background: color }}
              />
            ))}
          </div>
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="radiogroup" aria-label="Viewport">
            {(['mobile', 'desktop'] as const).map(option => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={viewport === option}
                onClick={() => setViewport(option)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold capitalize text-ink-soft',
                  viewport === option && 'bg-ink text-paper'
                )}
              >
                {option === 'mobile' ? (
                  <Smartphone className="size-3.5" aria-hidden />
                ) : (
                  <Monitor className="size-3.5" aria-hidden />
                )}
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-paper-deep/70 p-4 sm:p-6">
        <div
          className={cn(
            'mx-auto flex flex-col gap-3 rounded-xl bg-[#f3f3f3] p-3 shadow-inner transition-[max-width] duration-300',
            viewport === 'mobile' ? 'max-w-[360px]' : 'max-w-full'
          )}
        >
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-sm text-[#181818] shadow-sm">
            Here&apos;s something that might help.
          </div>
          <div className="flex flex-wrap gap-3">
            <div className={cn('min-w-0', SLOT_WIDTH[size])}>
              <CardPreview
                card={card}
                size={size}
                accent={accent}
                onAction={action => toast(describeAction(action), { description: 'Preview only, nothing was sent.' })}
              />
            </div>
          </div>
        </div>
      </div>
      {linkAction(card) && (
        <p className="text-sm text-ink-soft">
          Articles show as a one-line link under Fin&apos;s answer, with the title and subtitle. The body text and bullets are
          kept on the card but not shown in the chat.
        </p>
      )}
      <p className="text-xs text-ink-soft">
        This uses the same v1 card schema and layout rules as the <code className="font-mono">finCardRenderer</code>{' '}
        component on the Experience site. The accent swatches show how the chat&apos;s accent color property changes the card.
      </p>
    </section>
  );
}
