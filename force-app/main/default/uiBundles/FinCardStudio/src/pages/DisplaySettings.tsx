import { Check, Save } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { getDisplaySettings, listCards, saveDisplaySettings } from '@/api/cardApi';
import { CardPreview } from '@/components/studio/CardPreview';
import { FormRow } from '@/components/studio/FormRow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CARD_SIZES,
  MAX_CARDS_CEILING,
  cardSizeHint,
  cardSizeLabel,
  clampMaxCards,
  isShowcaseType,
  linkAction,
  toV1,
  type CardSize,
  type DisplaySettings as Settings,
  type V1Card,
} from '@/lib/cardModel';

const PREVIEW_ACCENT = '#2855ed';
const SHOWCASE_PREVIEW = 3;
const GRID_PREVIEW = 2;
const LINK_PREVIEW = 3;

/** Mirrors the carousel column and grid minimum finCardChat uses for each size. */
function previewWidths(size: CardSize): { carousel: string; gridMin: string } {
  switch (size) {
    case 'standard':
      return { carousel: '18rem', gridMin: '15rem' };
    case 'compact':
      return { carousel: '13.5rem', gridMin: '11.5rem' };
    default: {
      const unhandled: never = size;
      throw new Error(`Unhandled card size: ${String(unhandled)}`);
    }
  }
}

export default function DisplaySettings() {
  const [saved, setSaved] = useState<Settings | null>(null);
  const [cardSize, setCardSize] = useState<CardSize>('standard');
  const [maxCards, setMaxCards] = useState(5);
  const [cards, setCards] = useState<V1Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getDisplaySettings(), listCards()])
      .then(([settings, library]) => {
        if (cancelled) return;
        setSaved(settings);
        setCardSize(settings.cardSize);
        setMaxCards(settings.maxCards);
        setCards(library.filter(card => card.active).map(toV1));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sample = useMemo(() => {
    const showcase = cards.filter(card => isShowcaseType(card.type) && card.imageUrl).slice(0, SHOWCASE_PREVIEW);
    const others = cards.filter(card => !isShowcaseType(card.type) && !linkAction(card)).slice(0, GRID_PREVIEW);
    const links = cards.filter(card => linkAction(card)).slice(0, LINK_PREVIEW);
    return { showcase, others, links };
  }, [cards]);

  const dirty = saved !== null && (saved.cardSize !== cardSize || saved.maxCards !== maxCards);
  const widths = previewWidths(cardSize);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await saveDisplaySettings({ cardSize, maxCards });
      setSaved(result);
      setCardSize(result.cardSize);
      setMaxCards(result.maxCards);
      setJustSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="max-w-2xl animate-rise">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-signal">Display</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight">How cards look under Fin&apos;s answers</h1>
        <p className="mt-3 text-ink-soft">
          Applies to every Fin Card Chat on your Experience sites. Visitors see the change with Fin&apos;s next answer. A card can
          set its own size in the card editor, and a page can set one size for every card in Experience Builder.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <form
          onSubmit={event => void handleSubmit(event)}
          className="flex flex-col gap-5 self-start rounded-2xl border border-border bg-card p-4 sm:p-6"
        >
          <fieldset className="flex flex-col gap-2" disabled={loading}>
            <legend className="mb-2 text-sm font-medium">Card size</legend>
            {CARD_SIZES.map(size => (
              <label
                key={size}
                className="flex cursor-pointer gap-3 rounded-xl border border-border bg-paper p-3 has-[:checked]:border-signal has-[:checked]:bg-card has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-signal"
              >
                <input
                  type="radio"
                  name="cardSize"
                  value={size}
                  checked={cardSize === size}
                  onChange={() => {
                    setCardSize(size);
                    setJustSaved(false);
                  }}
                  className="mt-1 accent-[var(--color-signal,#2855ed)]"
                />
                <span>
                  <span className="block font-semibold">{cardSizeLabel(size)}</span>
                  <span className="block text-sm text-ink-soft">{cardSizeHint(size)}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <FormRow id="maxCards" label="Cards per answer" hint={`1 to ${MAX_CARDS_CEILING}. Fin shows the best matches first.`}>
            <Input
              id="maxCards"
              type="number"
              min={1}
              max={MAX_CARDS_CEILING}
              value={maxCards}
              disabled={loading}
              onChange={event => {
                setMaxCards(clampMaxCards(Number(event.target.value)));
                setJustSaved(false);
              }}
              className="h-10 w-24 bg-card font-mono"
            />
          </FormRow>

          <Button type="submit" className="h-10" disabled={loading || saving || !dirty}>
            {justSaved && !dirty ? <Check aria-hidden /> : <Save aria-hidden />}
            {saving ? 'Saving…' : justSaved && !dirty ? 'Saved' : 'Save display settings'}
          </Button>
          <p className="sr-only" aria-live="polite">
            {justSaved && !dirty ? `Saved. Cards are now ${cardSizeLabel(cardSize).toLowerCase()}.` : ''}
          </p>
        </form>

        <section aria-label={`${cardSizeLabel(cardSize)} card preview`} className="min-w-0">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Display settings could not load or save</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="rounded-2xl border border-border bg-[#fafaf7] p-4 sm:p-6">
            <p className="text-sm text-ink-soft">
              Preview at the chat&apos;s 820px column, with your active cards. Products and offers scroll in the carousel, and articles show as links. Card size applies to products, offers, and self-service cards.
            </p>
            {loading ? (
              <div className="mt-4 flex gap-3">
                <Skeleton className="h-72 w-56 rounded-xl" />
                <Skeleton className="h-72 w-56 rounded-xl" />
              </div>
            ) : (
              <div className="mt-4 flex max-w-[820px] flex-col gap-4">
                {sample.showcase.length > 0 && (
                  <ul
                    className="grid snap-x snap-mandatory auto-cols-[var(--col)] grid-flow-col gap-3 overflow-x-auto pb-2"
                    style={{ '--col': `min(${widths.carousel}, 78%)` } as CSSProperties}
                    aria-label="Carousel preview"
                  >
                    {sample.showcase.map(card => (
                      <li key={card.id} className="flex snap-start">
                        <CardPreview card={card} size={cardSize} accent={PREVIEW_ACCENT} className="flex-1" />
                      </li>
                    ))}
                  </ul>
                )}
                {sample.others.length > 0 && (
                  <ul
                    className="grid gap-3"
                    style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${widths.gridMin}, 1fr))` }}
                    aria-label="Grid preview"
                  >
                    {sample.others.map(card => (
                      <li key={card.id} className="flex">
                        <CardPreview card={card} size={cardSize} accent={PREVIEW_ACCENT} className="flex-1" />
                      </li>
                    ))}
                  </ul>
                )}
                {sample.links.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[#64728b]">Related guides</p>
                    <ul className="grid gap-1.5 sm:grid-cols-2" aria-label="Guide links preview">
                      {sample.links.map(card => (
                        <li key={card.id}>
                          <CardPreview card={card} accent={PREVIEW_ACCENT} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {sample.showcase.length === 0 && sample.others.length === 0 && sample.links.length === 0 && (
                  <p className="rounded-xl border border-dashed border-ink/20 p-6 text-center text-ink-soft">
                    Activate a card in the library to preview it here.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
