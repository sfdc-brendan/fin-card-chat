import { FlaskConical, PenLine } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { matchCards, type CardMatch } from '@/api/cardApi';
import { CardPreview } from '@/components/studio/CardPreview';
import { FormRow, textAreaClass } from '@/components/studio/FormRow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { carouselIds } from '@/lib/cardModel';

interface Scenario {
  label: string;
  userText: string;
  finText: string;
  sourceUrls: string;
}

// Written for the optional StarGrid starter set; source-URL matching only uses the path, so any host works.
const SAMPLE_SITE = 'https://www.example.com';

const SCENARIOS: Scenario[] = [
  {
    label: 'Wi-Fi dead zones',
    userText: 'My wifi has a dead zone upstairs, what should I buy?',
    finText: 'A mesh system like Orbit 7 extends coverage to every room.',
    sourceUrls: '',
  },
  {
    label: 'Fiber upgrade',
    userText: 'Is there a faster plan than what I have?',
    finText:
      'You can upgrade to StarGrid Fiber 2 for symmetrical gigabit speeds.',
    sourceUrls: '',
  },
  {
    label: 'Business failover',
    userText: 'We need internet failover for our branch office.',
    finText: '',
    sourceUrls: `${SAMPLE_SITE}/products/gridedge-500#product-gridedge-500`,
  },
  {
    label: 'Talk to a person',
    userText: 'Can someone call me back about my bill?',
    finText: '',
    sourceUrls: '',
  },
  {
    label: 'Internet down',
    userText: 'My internet is not working at all since this morning.',
    finText: 'First check whether one device or the whole home is affected.',
    sourceUrls: `${SAMPLE_SITE}/support/fiber-connection-unavailable`,
  },
  {
    label: 'Office outage',
    userText: 'Our whole office is down and nobody can connect.',
    finText: 'Check the GridEdge power and uplink lights.',
    sourceUrls: `${SAMPLE_SITE}/support/restore-office-connectivity`,
  },
  {
    label: 'Compare plans',
    userText: 'Which plan should I pick for a family of five?',
    finText: 'Fiber 1 is $65, Fiber 2 is $95, and Fiber 5 is $145 per month.',
    sourceUrls: `${SAMPLE_SITE}/support/compare-stargrid-fiber-plans`,
  },
  {
    label: 'Storage warning',
    userText: 'GridStore shows a storage warning and some files are missing.',
    finText: 'Do not format a drive or start an unplanned rebuild.',
    sourceUrls: `${SAMPLE_SITE}/support/storage-warning-and-data-access`,
  },
  {
    label: 'Case status',
    userText: 'What is the status of my support case?',
    finText: 'You can follow your cases in MyStarGrid.',
    sourceUrls: '',
  },
  {
    label: 'Local AI',
    userText: 'Can GridCore run a 70B LLM for my team?',
    finText: 'It depends on model size, memory, and accelerator support.',
    sourceUrls: `${SAMPLE_SITE}/support/local-ai-workload-compatibility`,
  },
];

export default function MatchTester() {
  const [userText, setUserText] = useState(SCENARIOS[0].userText);
  const [finText, setFinText] = useState(SCENARIOS[0].finText);
  const [sourceUrls, setSourceUrls] = useState(SCENARIOS[0].sourceUrls);
  const [maxCards, setMaxCards] = useState(5);
  const [results, setResults] = useState<CardMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const carousel = useMemo(
    () => carouselIds((results ?? []).map(match => match.card)),
    [results]
  );

  const applyScenario = (scenario: Scenario): void => {
    setUserText(scenario.userText);
    setFinText(scenario.finText);
    setSourceUrls(scenario.sourceUrls);
    setResults(null);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setRunning(true);
    setError(null);
    try {
      setResults(
        await matchCards({
          userText,
          finText,
          sourceUrls: sourceUrls
            .split('\n')
            .map(url => url.trim())
            .filter(Boolean),
          maxCards,
        })
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setResults(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="max-w-2xl animate-rise">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-signal">
          Match tester
        </p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight">
          Which cards would Fin show?
        </h1>
        <p className="mt-3 text-ink-soft">
          Runs the same matcher the Experience site chat uses, against active
          cards only. Try a customer question, Fin&apos;s answer, and the source
          URLs Fin cited.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <form
          onSubmit={event => void handleSubmit(event)}
          className="flex flex-col gap-4 self-start rounded-2xl border border-border bg-card p-4 sm:p-6"
        >
          <div
            className="flex flex-wrap gap-1.5"
            aria-label="Example conversations"
          >
            {SCENARIOS.map(scenario => (
              <button
                key={scenario.label}
                type="button"
                onClick={() => applyScenario(scenario)}
                className="h-8 rounded-full border border-border bg-paper px-3 text-xs font-medium text-ink-soft hover:border-ink-soft hover:text-ink"
              >
                {scenario.label}
              </button>
            ))}
          </div>
          <FormRow id="userText" label="Customer message">
            <textarea
              id="userText"
              rows={3}
              value={userText}
              onChange={event => setUserText(event.target.value)}
              className={textAreaClass}
            />
          </FormRow>
          <FormRow id="finText" label="Fin's reply">
            <textarea
              id="finText"
              rows={3}
              value={finText}
              onChange={event => setFinText(event.target.value)}
              className={textAreaClass}
            />
          </FormRow>
          <FormRow
            id="sourceUrls"
            label="Cited source URLs"
            hint="One per line."
          >
            <textarea
              id="sourceUrls"
              rows={2}
              value={sourceUrls}
              onChange={event => setSourceUrls(event.target.value)}
              className={`${textAreaClass} font-mono text-xs`}
            />
          </FormRow>
          <FormRow id="maxCards" label="Cards per turn">
            <Input
              id="maxCards"
              type="number"
              min={1}
              max={6}
              value={maxCards}
              onChange={event =>
                setMaxCards(
                  Math.max(1, Math.min(6, Number(event.target.value) || 1))
                )
              }
              className="h-10 w-24 bg-card font-mono"
            />
          </FormRow>
          <Button
            type="submit"
            className="h-10"
            disabled={
              running ||
              (!userText.trim() && !finText.trim() && !sourceUrls.trim())
            }
          >
            <FlaskConical aria-hidden />
            {running ? 'Matching…' : 'Run match'}
          </Button>
        </form>

        <section
          aria-live="polite"
          aria-label="Match results"
          className="min-w-0"
        >
          {error && (
            <Alert variant="destructive">
              <AlertTitle>The matcher returned an error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!results && !error && (
            <div className="grid h-full min-h-64 place-items-center rounded-2xl border border-dashed border-ink/20 p-8 text-center text-ink-soft">
              Run a match to see the ranked cards and why each one matched.
            </div>
          )}
          {results && results.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink/20 p-8 text-center">
              <h2 className="text-xl font-semibold">No cards matched</h2>
              <p className="mt-1 text-ink-soft">
                Fin would answer with text only. Add keywords to a card to
                change that.
              </p>
            </div>
          )}
          {results && results.length > 0 && (
            <p className="mb-4 text-sm text-ink-soft">
              {carousel.size > 0
                ? `In the Ask Fin chat, the ${carousel.size} products and offers appear in a swipeable carousel${results.length > carousel.size ? ', with the other cards in a grid below it' : ''}.`
                : 'In the Ask Fin chat, these cards appear in a grid under Fin’s answer.'}
            </p>
          )}
          {results && results.length > 0 && (
            <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {results.map((match, index) => (
                <li
                  key={match.card.id}
                  className="flex animate-rise flex-col gap-3"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-2xl font-semibold text-signal">
                      #{index + 1}
                    </span>
                    <span className="font-mono text-xs text-ink-soft">
                      {carousel.has(match.card.id) ? 'carousel · ' : ''}
                      {match.hits} {match.hits === 1 ? 'hit' : 'hits'}
                    </span>
                  </div>
                  <CardPreview card={match.card} />
                  <div className="flex flex-wrap gap-1">
                    {match.reasons.map((reason, reasonIndex) => (
                      <span
                        key={`${reasonIndex}-${reason}`}
                        className="rounded bg-moss-soft px-1.5 py-0.5 font-mono text-[0.68rem] text-moss"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                  <Button asChild variant="ghost" size="sm" className="w-fit">
                    <Link to={`/cards/${match.card.id}`}>
                      <PenLine aria-hidden />
                      Edit card
                    </Link>
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
