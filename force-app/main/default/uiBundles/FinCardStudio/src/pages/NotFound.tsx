import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-signal">404</p>
      <h1 className="mt-2 text-4xl font-semibold">That page isn&apos;t in the studio</h1>
      <p className="mt-3 text-ink-soft">The link may be out of date, or the card was deleted.</p>
      <Button asChild className="mt-6 h-10 px-4">
        <Link to="/">Back to the card library</Link>
      </Button>
    </main>
  );
}
