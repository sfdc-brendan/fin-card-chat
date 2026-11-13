import { Copy, PenLine, Plus, Search, Sparkles, Sprout } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { listCards, saveCard, seedCards } from '@/api/cardApi';
import { CardPreview } from '@/components/studio/CardPreview';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import {
  CARD_TYPES,
  cardSizeLabel,
  cardTypeLabel,
  duplicateDraft,
  matchScopeLabel,
  toV1,
  type CardDraft,
  type CardType,
} from '@/lib/cardModel';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'inactive';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function matchesStatus(card: CardDraft, status: StatusFilter): boolean {
  switch (status) {
    case 'all':
      return true;
    case 'active':
      return card.active;
    case 'inactive':
      return !card.active;
    default: {
      const unhandled: never = status;
      throw new Error(`Unhandled status filter: ${String(unhandled)}`);
    }
  }
}

function searchText(card: CardDraft): string {
  return [card.name, card.title, card.subtitle, card.productName ?? '', card.badge, ...card.keywords]
    .join(' ')
    .toLowerCase();
}

export default function CardLibrary() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardDraft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<CardType | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      setCards(await listCards());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    let active = true;
    listCards()
      .then(result => active && setCards(result))
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (cards ?? []).filter(
      card =>
        (type === 'all' || card.type === type) &&
        matchesStatus(card, status) &&
        (!needle || searchText(card).includes(needle))
    );
  }, [cards, query, type, status]);

  const counts = useMemo(() => {
    const all = cards ?? [];
    return { total: all.length, active: all.filter(c => c.active).length };
  }, [cards]);

  const handleSeed = async (): Promise<void> => {
    setBusy('seed');
    try {
      const created = await seedCards();
      toast.success(created ? `Added ${created} starter cards.` : 'All starter cards are already here.');
      await load();
    } catch (err: unknown) {
      toast.error('Could not add starter cards.', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  };

  const handleDuplicate = async (card: CardDraft): Promise<void> => {
    setBusy(card.id);
    try {
      const id = await saveCard(duplicateDraft(card));
      toast.success(`Copied “${card.title}” as an inactive card.`);
      navigate(`/cards/${id}`);
    } catch (err: unknown) {
      toast.error('Could not duplicate the card.', { description: err instanceof Error ? err.message : String(err) });
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-6 border-b border-ink/15 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl animate-rise">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-signal">Fin UI cards</p>
          <h1 className="mt-2 text-4xl font-semibold leading-[1.05] sm:text-5xl">
            Give Fin&apos;s answers <em className="font-normal italic text-signal">something to show.</em>
          </h1>
          <p className="mt-3 text-base text-ink-soft">
            Cards appear under Fin&apos;s reply in the Ask Fin chat when a keyword or cited source matches.
            {cards && (
              <>
                {' '}
                <strong className="font-semibold text-ink">{counts.active}</strong> of {counts.total} cards are live.
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 animate-rise [animation-delay:80ms]">
          <Button variant="outline" className="h-10 bg-card" onClick={() => void handleSeed()} disabled={busy !== null}>
            <Sprout aria-hidden />
            {busy === 'seed' ? 'Adding…' : 'Add starter cards'}
          </Button>
          <Button asChild variant="outline" className="h-10 border-signal/40 bg-signal-soft text-signal hover:bg-signal-soft/80">
            <Link to="/cards/new?ai=1">
              <Sparkles aria-hidden />
              Create with AI
            </Link>
          </Button>
          <Button asChild className="h-10 px-4">
            <Link to="/cards/new">
              <Plus aria-hidden />
              New card
            </Link>
          </Button>
        </div>
      </header>

      <div className="sticky top-16 z-10 -mx-4 flex flex-col gap-3 bg-paper/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:flex-row lg:items-center lg:px-8">
        <div className="relative lg:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search titles, products, keywords"
            aria-label="Search cards"
            className="h-10 bg-card pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
          {(['all', ...CARD_TYPES] as const).map(option => (
            <button
              key={option}
              type="button"
              aria-pressed={type === option}
              onClick={() => setType(option)}
              className={cn(
                'h-9 rounded-full border border-border bg-card px-3.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink',
                type === option && 'border-ink bg-ink text-paper hover:text-paper'
              )}
            >
              {option === 'all' ? 'All types' : cardTypeLabel(option)}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5 lg:ml-auto" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map(option => (
            <button
              key={option.value}
              type="button"
              aria-pressed={status === option.value}
              onClick={() => setStatus(option.value)}
              className={cn(
                'h-8 rounded-md px-3 text-xs font-semibold text-ink-soft',
                status === option.value && 'bg-signal-soft text-ink'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Cards didn&apos;t load</AlertTitle>
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={() => void load()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!cards && !error && (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(i => (
            <Skeleton key={i} className="h-96 rounded-2xl" />
          ))}
        </div>
      )}

      {cards && cards.length === 0 && (
        <section className="mt-10 rounded-2xl border border-dashed border-ink/25 bg-card/70 px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold">No cards yet</h2>
          <p className="mx-auto mt-2 max-w-md text-ink-soft">
            Load the optional StarGrid starter set (if sample-data/stargrid is deployed), describe a
            card and let AI draft it, or build one from scratch.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button className="h-10 px-4" onClick={() => void handleSeed()} disabled={busy !== null}>
              <Sprout aria-hidden />
              Add starter cards
            </Button>
            <Button asChild variant="outline" className="h-10 bg-card">
              <Link to="/cards/new?ai=1">
                <Sparkles aria-hidden />
                Create with AI
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-10 bg-card">
              <Link to="/cards/new">New card</Link>
            </Button>
          </div>
        </section>
      )}

      {cards && cards.length > 0 && filtered.length === 0 && (
        <p className="mt-10 text-center text-ink-soft">No cards match those filters.</p>
      )}

      {filtered.length > 0 && (
        <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((card, index) => (
            <li
              key={card.id}
              className="group flex animate-rise flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_0_rgba(29,41,64,0.06)] transition-shadow hover:shadow-[0_12px_32px_-16px_rgba(29,41,64,0.35)]"
              style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
            >
              <div className="relative bg-paper-deep/60 p-4">
                <CardPreview card={toV1(card)} size={card.size ?? undefined} className={cn(!card.active && 'opacity-60 saturate-50')} />
                {!card.active && (
                  <span className="absolute top-6 right-6 rounded-full bg-amber-soft px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-amber">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{card.name || card.title}</p>
                    <p className="font-mono text-[0.7rem] text-ink-soft">
                      {cardTypeLabel(card.type)} · priority {card.priority} · {matchScopeLabel(card.matchOn).toLowerCase()}
                      {card.size && ` · ${cardSizeLabel(card.size).toLowerCase()}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {card.keywords.slice(0, 5).map(keyword => (
                    <span key={keyword} className="rounded bg-signal-soft px-1.5 py-0.5 font-mono text-[0.68rem]">
                      {keyword}
                    </span>
                  ))}
                  {card.keywords.length > 5 && (
                    <span className="px-1 font-mono text-[0.68rem] text-ink-soft">+{card.keywords.length - 5}</span>
                  )}
                  {card.sourceUrlContains && (
                    <span className="rounded bg-moss-soft px-1.5 py-0.5 font-mono text-[0.68rem] text-moss">
                      url: {card.sourceUrlContains}
                    </span>
                  )}
                </div>
                <div className="mt-auto flex gap-2 pt-1">
                  <Button asChild variant="outline" className="h-10 flex-1 bg-card">
                    <Link to={`/cards/${card.id}`}>
                      <PenLine aria-hidden />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-10"
                    onClick={() => void handleDuplicate(card)}
                    disabled={busy !== null}
                    aria-label={`Duplicate ${card.title}`}
                  >
                    <Copy aria-hidden />
                    {busy === card.id ? 'Copying…' : 'Duplicate'}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
