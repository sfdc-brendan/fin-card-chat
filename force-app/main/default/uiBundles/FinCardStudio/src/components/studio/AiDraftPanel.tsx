import { ChevronDown, RotateCcw, Sparkles, Wand2 } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import { generateCard } from '@/api/cardApi';
import { textAreaClass } from '@/components/studio/FormRow';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/sonner';
import { Spinner } from '@/components/ui/spinner';
import { cardTypeLabel, draftContent, mergeGenerated, modelLabel, type CardDraft, type GeneratedCard } from '@/lib/cardModel';
import { cn } from '@/lib/utils';

const BRIEF_IDEAS = [
  'Holiday offer for Orbit 7 mesh, aimed at families with Wi-Fi dead zones upstairs',
  'Fiber 5 for creators who upload a lot of video',
  'Guide card for Wi-Fi that drops when moving between rooms',
  'Let a business customer escalate an office outage right from the chat',
  'GridStore 4 for small creative teams that share large files',
];

const REFINE_IDEAS = ['Make it shorter', 'Warmer, friendlier tone', 'More urgent', 'Add a follow-up question button', 'Sharper trigger keywords'];

interface AiDraftPanelProps {
  draft: CardDraft;
  defaultOpen: boolean;
  letAiChooseType: boolean;
  onApply: (next: CardDraft) => void;
}

type Busy = 'draft' | 'refine' | null;

export function AiDraftPanel({ draft, defaultOpen, letAiChooseType, onApply }: AiDraftPanelProps) {
  const ids = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [brief, setBrief] = useState('');
  const [instruction, setInstruction] = useState('');
  const [chooseType, setChooseType] = useState(letAiChooseType);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedCard | null>(null);
  const [undo, setUndo] = useState<CardDraft | null>(null);

  const canRefine = draft.title.trim() !== '';

  const run = async (mode: Exclude<Busy, null>, refineWith?: string): Promise<void> => {
    const ask = (refineWith ?? instruction).trim();
    if (mode === 'draft' && !brief.trim()) {
      setError('Describe the card you want first.');
      return;
    }
    if (mode === 'refine' && !ask) {
      setError('Say what to change, for example “make it shorter”.');
      return;
    }
    setBusy(mode);
    setError(null);
    try {
      const generated = await generateCard(
        mode === 'draft'
          ? { brief: brief.trim(), type: chooseType ? undefined : draft.type, productId: draft.productId }
          : { brief: '', type: draft.type, productId: draft.productId, current: draftContent(draft), instruction: ask }
      );
      setUndo(draft);
      setResult(generated);
      onApply(mergeGenerated(draft, generated));
      if (mode === 'refine') setInstruction('');
      toast.success(mode === 'draft' ? 'Draft ready. Review it, then save.' : 'Card updated. Review it, then save.', {
        description: `Written by ${modelLabel(generated.model)}. Nothing is saved until you click save.`,
      });
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  };

  const submitOnShortcut = (mode: Exclude<Busy, null>) => (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void run(mode);
    }
  };

  const handleUndo = (): void => {
    if (!undo) return;
    onApply(undo);
    setUndo(null);
    setResult(null);
    toast('Restored the card from before the AI change.');
  };

  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="relative overflow-hidden rounded-2xl border border-signal/40 bg-card shadow-[0_1px_0_rgba(29,41,64,0.06)]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-signal via-signal/60 to-amber" />
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-controls={`${ids}-body`}
        className="flex w-full items-center gap-3 p-4 text-left sm:px-6"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-signal-soft text-signal">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-mono text-xs text-signal">00</span>
          <span id={`${ids}-title`} className="text-lg font-semibold leading-tight">
            Draft with AI
          </span>
          <span className="text-xs text-ink-soft">
            Describe the card. The Models API writes it from your products, existing cards, and site pages.
          </span>
        </span>
        <ChevronDown className={cn('size-5 shrink-0 text-ink-soft transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div id={`${ids}-body`} className="flex flex-col gap-5 border-t border-border px-4 pt-4 pb-5 sm:px-6">
          <div className="flex flex-col gap-2">
            <label htmlFor={`${ids}-brief`} className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-soft">
              {canRefine ? 'Start over from a brief' : 'What should the card do?'}
            </label>
            <textarea
              id={`${ids}-brief`}
              rows={3}
              value={brief}
              maxLength={2000}
              onChange={event => setBrief(event.target.value)}
              onKeyDown={submitOnShortcut('draft')}
              className={textAreaClass}
              placeholder="A spring offer for Fiber 2 aimed at households where streaming buffers in the evening"
            />
            {!brief && (
              <div className="flex flex-wrap gap-1.5" aria-label="Example briefs">
                {BRIEF_IDEAS.map(idea => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setBrief(idea)}
                    className="min-h-8 rounded-full border border-border bg-paper/60 px-3 text-left text-xs text-ink-soft hover:border-ink-soft hover:text-ink"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={chooseType} onCheckedChange={checked => setChooseType(checked === true)} />
                <span>
                  Let AI choose the card type
                  {!chooseType && <span className="text-ink-soft"> (using {cardTypeLabel(draft.type)})</span>}
                </span>
              </label>
              <Button type="button" className="h-10 px-4" onClick={() => void run('draft')} disabled={busy !== null}>
                {busy === 'draft' ? <Spinner /> : <Sparkles aria-hidden />}
                {busy === 'draft' ? 'Drafting…' : canRefine ? 'Replace with new draft' : 'Draft card'}
              </Button>
            </div>
            <p className="text-xs text-ink-soft">
              {draft.productName
                ? `Builds around ${draft.productName}, the product linked below.`
                : 'Tip: link a product in section 02 first and the draft uses its real price and photo.'}{' '}
              Press ⌘/Ctrl + Enter to draft.
            </p>
          </div>

          {canRefine && (
            <div className="flex flex-col gap-2 border-t border-dashed border-border pt-4">
              <label htmlFor={`${ids}-refine`} className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-soft">
                Refine this card
              </label>
              <div className="flex flex-wrap gap-1.5" aria-label="Quick refinements">
                {REFINE_IDEAS.map(idea => (
                  <button
                    key={idea}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void run('refine', idea)}
                    className="min-h-8 rounded-full border border-signal/30 bg-signal-soft/60 px-3 text-xs font-medium text-signal hover:border-signal disabled:opacity-50"
                  >
                    {idea}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <textarea
                  id={`${ids}-refine`}
                  rows={2}
                  value={instruction}
                  maxLength={2000}
                  onChange={event => setInstruction(event.target.value)}
                  onKeyDown={submitOnShortcut('refine')}
                  className={cn(textAreaClass, 'flex-1')}
                  placeholder="Mention the free installation and point the second button at the fiber comparison guide"
                />
                <Button type="button" variant="outline" className="h-10 bg-card" onClick={() => void run('refine')} disabled={busy !== null}>
                  {busy === 'refine' ? <Spinner /> : <Wand2 aria-hidden />}
                  {busy === 'refine' ? 'Refining…' : 'Refine'}
                </Button>
              </div>
            </div>
          )}

          <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
            {busy && (
              <p className="text-sm text-ink-soft">
                Writing the card from your catalog and guides. This usually takes 5 to 10 seconds.
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {result && !busy && (
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-moss-soft px-3 py-2 text-sm">
                <p className="min-w-0 flex-1">
                  <span className="font-semibold text-moss">Why this card: </span>
                  {result.rationale || 'Built from your brief and your catalog.'}
                  <span className="mt-0.5 block font-mono text-[0.7rem] text-ink-soft">{modelLabel(result.model)} · review every field before saving</span>
                </p>
                {undo && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleUndo}>
                    <RotateCcw aria-hidden />
                    Undo
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
