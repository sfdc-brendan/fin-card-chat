import { ArrowLeft, Copy, Save, Trash2 } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  deleteCard,
  getCard,
  getDisplaySettings,
  listImageHosts,
  listProducts,
  saveCard,
  trustImageHost,
} from '@/api/cardApi';
import { ActionFields } from '@/components/studio/ActionFields';
import { AiDraftPanel } from '@/components/studio/AiDraftPanel';
import { FormRow, textAreaClass } from '@/components/studio/FormRow';
import { KeywordChips } from '@/components/studio/KeywordChips';
import { PreviewFrame } from '@/components/studio/PreviewFrame';
import { ProductPicker } from '@/components/studio/ProductPicker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import {
  CARD_SIZES,
  CARD_TYPES,
  LIMITS,
  MATCH_SCOPES,
  applyProduct,
  cardSizeLabel,
  cardTypeLabel,
  defaultName,
  duplicateDraft,
  emptyDraft,
  isCardType,
  layoutFor,
  matchScopeLabel,
  imageHost,
  toV1,
  trustsImageHost,
  v1Type,
  validateDraft,
  type CardDraft,
  type CardSize,
  type CardType,
  type StudioProduct,
} from '@/lib/cardModel';
import { cn } from '@/lib/utils';

type ImageTrust =
  | { host: string; status: 'working' | 'trusted' }
  | { host: string; status: 'failed'; message: string };

function imageTrustMessage(host: string, trust: ImageTrust | null): string {
  if (!trust) {
    return `${host} isn't a trusted image site yet. The studio adds it to Trusted URLs, for images only, when you leave this field or save.`;
  }
  switch (trust.status) {
    case 'working':
      return `Adding ${host} to Trusted URLs…`;
    case 'trusted':
      return `${host} is now trusted for images. Save the card and the preview reloads with the image. Your sites show it on their next page load.`;
    case 'failed':
      return `Couldn't trust ${host}: ${trust.message} Someone with Customize Application can add https://${host} in Setup > Trusted URLs with img-src checked.`;
    default: {
      const unreachable: never = trust;
      return unreachable;
    }
  }
}

function typeDescription(type: CardType): string {
  switch (type) {
    case 'Product':
      return 'Photo, price, and a link to buy or learn more.';
    case 'Self_Service':
      return 'A task the customer can finish right in the chat.';
    case 'Article':
      return 'Points to help content Fin is citing.';
    case 'Offer':
      return 'A promotion or upgrade with a photo and price.';
    default: {
      const unhandled: never = type;
      throw new Error(`Unhandled card type: ${String(unhandled)}`);
    }
  }
}

function Section({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/90 p-4 shadow-[0_1px_0_rgba(29,41,64,0.06)] sm:p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <span className="font-mono text-xs text-signal">{kicker}</span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export default function CardEditor() {
  const { cardId } = useParams();
  const [searchParams] = useSearchParams();
  const requested = searchParams.get('type');
  const newType: CardType = isCardType(requested) ? requested : 'Product';
  const aiFirst = searchParams.get('ai') === '1';
  return (
    <CardEditorForm
      key={cardId ?? `new-${newType}-${aiFirst ? 'ai' : 'manual'}`}
      cardId={cardId ?? null}
      newType={newType}
      aiFirst={aiFirst}
      typeChosen={isCardType(requested)}
    />
  );
}

interface CardEditorFormProps {
  cardId: string | null;
  newType: CardType;
  aiFirst: boolean;
  typeChosen: boolean;
}

function CardEditorForm({
  cardId,
  newType,
  aiFirst,
  typeChosen,
}: CardEditorFormProps) {
  const navigate = useNavigate();
  const isNew = !cardId;

  const [draft, setDraft] = useState<CardDraft | null>(() =>
    cardId ? null : emptyDraft(newType)
  );
  const [saved, setSaved] = useState<string>(() =>
    draft ? JSON.stringify(draft) : ''
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [products, setProducts] = useState<StudioProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imageHosts, setImageHosts] = useState<string[] | null>(null);
  const [trust, setTrust] = useState<ImageTrust | null>(null);
  const [displaySize, setDisplaySize] = useState<CardSize | null>(null);

  useEffect(() => {
    let active = true;
    getDisplaySettings()
      .then(settings => active && setDisplaySize(settings.cardSize))
      .catch(() => active && setDisplaySize(null));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    listImageHosts()
      .then(hosts => active && setImageHosts(hosts))
      .catch(() => active && setImageHosts(null));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    listProducts()
      .then(result => active && setProducts(result))
      .catch(
        () =>
          active &&
          toast.error(
            'Could not load products. You can still fill the card in by hand.'
          )
      )
      .finally(() => active && setProductsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!cardId) return;
    let active = true;
    getCard(cardId)
      .then(result => {
        if (!active) return;
        if (!result) {
          setLoadError(
            'This card was deleted or you no longer have access to it.'
          );
          return;
        }
        setDraft(result);
        setSaved(JSON.stringify(result));
      })
      .catch(
        (error: unknown) =>
          active &&
          setLoadError(error instanceof Error ? error.message : String(error))
      );
    return () => {
      active = false;
    };
  }, [cardId]);

  const errors = useMemo(() => (draft ? validateDraft(draft) : {}), [draft]);
  const visibleErrors = showErrors ? errors : {};
  const dirty = draft !== null && JSON.stringify(draft) !== saved;
  const previewCard = useMemo(() => (draft ? toV1(draft) : null), [draft]);

  const update = <K extends keyof CardDraft>(
    key: K,
    value: CardDraft[K]
  ): void => {
    setDraft(current => (current ? { ...current, [key]: value } : current));
  };

  const selectedProduct = products.find(p => p.id === draft?.productId) ?? null;

  const media = draft ? layoutFor(v1Type(draft.type)).media : false;
  const host = draft && media ? imageHost(draft.imageUrl) : null;
  const hostUntrusted =
    host !== null && imageHosts !== null && !trustsImageHost(imageHosts, host);
  const hostTrust = trust?.host === host ? trust : null;

  const trustHost = async (target: string): Promise<boolean> => {
    setTrust({ host: target, status: 'working' });
    try {
      await trustImageHost(target);
      setTrust({ host: target, status: 'trusted' });
      return true;
    } catch (error: unknown) {
      setTrust({
        host: target,
        status: 'failed',
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  };

  const handleImageBlur = (): void => {
    if (host && hostUntrusted && !hostTrust) void trustHost(host);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    if (!draft) return;
    if (Object.keys(errors).length) {
      setShowErrors(true);
      toast.error('Fix the highlighted fields before saving.');
      return;
    }
    setSaving(true);
    try {
      const trusted =
        host !== null &&
        hostUntrusted &&
        (hostTrust?.status === 'trusted' ||
          (hostTrust?.status !== 'working' && (await trustHost(host))));
      const id = await saveCard(draft);
      toast.success(isNew ? 'Card created.' : 'Card saved.', {
        description: draft.active
          ? 'Fin can show it in chat right away.'
          : 'It stays hidden until you mark it active.',
      });
      if (trusted) {
        // Browsers read trusted image sites only when the page loads.
        if (isNew) navigate(`/cards/${id}`, { replace: true });
        window.setTimeout(() => window.location.reload(), 600);
        return;
      }
      if (isNew) {
        navigate(`/cards/${id}`, { replace: true });
        return;
      }
      const fresh = await getCard(id);
      if (fresh) {
        setDraft(fresh);
        setSaved(JSON.stringify(fresh));
      }
    } catch (error: unknown) {
      toast.error('Salesforce did not save the card.', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (): Promise<void> => {
    if (!draft) return;
    setSaving(true);
    try {
      const id = await saveCard(duplicateDraft(draft));
      toast.success('Copy created as inactive.');
      navigate(`/cards/${id}`);
    } catch (error: unknown) {
      toast.error('Could not duplicate the card.', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!draft?.id) return;
    setSaving(true);
    try {
      await deleteCard(draft.id);
      toast.success('Card deleted.');
      navigate('/');
    } catch (error: unknown) {
      toast.error('Could not delete the card.', {
        description: error instanceof Error ? error.message : String(error),
      });
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Card unavailable</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">Back to the library</Link>
        </Button>
      </main>
    );
  }

  if (!draft || !previewCard) {
    return (
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-72" />
          <Skeleton className="h-56" />
        </div>
        <Skeleton className="h-96" />
      </main>
    );
  }

  const imageWarning =
    host && hostUntrusted ? imageTrustMessage(host, hostTrust) : undefined;

  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-28 sm:px-6 lg:px-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Card library
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-signal">
            {isNew ? 'New card' : `Editing · ${cardTypeLabel(draft.type)}`}
          </p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            {draft.title || 'Untitled card'}
          </h1>
          {draft.lastModified && (
            <p className="mt-1 text-xs text-ink-soft">
              Last saved {draft.lastModified}
            </p>
          )}
        </div>
        {dirty && (
          <span
            className="rounded-full bg-amber-soft px-3 py-1 text-xs font-semibold text-amber"
            role="status"
          >
            Unsaved changes
          </span>
        )}
      </div>

      <form
        id="card-form"
        onSubmit={event => void handleSubmit(event)}
        noValidate
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]"
      >
        <div className="flex min-w-0 flex-col gap-5">
          <AiDraftPanel
            draft={draft}
            defaultOpen={isNew}
            letAiChooseType={isNew && aiFirst && !typeChosen}
            onApply={next => {
              setDraft(next);
              setShowErrors(false);
            }}
          />
          <Section kicker="01" title="What the card says">
            <div
              role="radiogroup"
              aria-label="Card type"
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {CARD_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={draft.type === type}
                  onClick={() => update('type', type)}
                  className={cn(
                    'flex min-h-11 flex-col gap-1 rounded-lg border border-border bg-paper/50 p-3 text-left transition-colors hover:border-ink-soft',
                    draft.type === type &&
                      'border-signal bg-signal-soft shadow-[inset_0_0_0_1px_var(--color-signal)]'
                  )}
                >
                  <span className="text-sm font-semibold">
                    {cardTypeLabel(type)}
                  </span>
                  <span className="text-[0.72rem] leading-snug text-ink-soft">
                    {typeDescription(type)}
                  </span>
                </button>
              ))}
            </div>
            <FormRow
              id="title"
              label="Title"
              error={visibleErrors.title}
              count={{ value: draft.title.length, max: LIMITS.title }}
            >
              <Input
                id="title"
                value={draft.title}
                maxLength={LIMITS.title}
                onChange={event => update('title', event.target.value)}
                aria-invalid={Boolean(visibleErrors.title) || undefined}
                className="h-10 bg-card text-base"
                placeholder="Orbit 7"
              />
            </FormRow>
            <FormRow
              id="subtitle"
              label="Subtitle"
              count={{ value: draft.subtitle.length, max: LIMITS.subtitle }}
            >
              <Input
                id="subtitle"
                value={draft.subtitle}
                maxLength={LIMITS.subtitle}
                onChange={event => update('subtitle', event.target.value)}
                className="h-10 bg-card"
                placeholder="A better connection in every room."
              />
            </FormRow>
            <FormRow
              id="body"
              label="Body"
              hint="Start a line with - to make it a bullet point."
              count={{ value: draft.body.length, max: LIMITS.body }}
            >
              <textarea
                id="body"
                rows={5}
                value={draft.body}
                maxLength={LIMITS.body}
                onChange={event => update('body', event.target.value)}
                className={textAreaClass}
                placeholder={
                  '- Wi-Fi 7 mesh, up to 4,500 sq ft\n- Set up in the mobile app'
                }
              />
            </FormRow>
          </Section>

          <Section kicker="02" title="Product, image, and price">
            <FormRow
              id="product"
              label="Salesforce product"
              hint="Linking a product fills in the title, image, price, and match rules. You can still edit them."
            >
              <ProductPicker
                id="product"
                products={products}
                loading={productsLoading}
                selectedId={draft.productId}
                selectedName={draft.productName}
                onSelect={product =>
                  setDraft(current =>
                    current
                      ? applyProduct(current, product, selectedProduct)
                      : current
                  )
                }
                onClear={() =>
                  setDraft(current =>
                    current
                      ? { ...current, productId: null, productName: null }
                      : current
                  )
                }
              />
            </FormRow>
            <FormRow
              id="imageUrl"
              label="Image URL"
              error={visibleErrors.imageUrl}
              warning={imageWarning}
              hint={
                media
                  ? 'Paste any https image link. The studio trusts its site for images automatically.'
                  : `${cardTypeLabel(draft.type)} cards don't show an image.`
              }
            >
              <Input
                id="imageUrl"
                value={draft.imageUrl}
                onChange={event => update('imageUrl', event.target.value)}
                onBlur={handleImageBlur}
                aria-invalid={Boolean(visibleErrors.imageUrl) || undefined}
                className="h-10 bg-card font-mono text-xs"
                placeholder="https://…/images/products/orbit-7-640.jpg"
                disabled={!media}
              />
            </FormRow>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormRow
                id="priceLabel"
                label="Price label"
                count={{
                  value: draft.priceLabel.length,
                  max: LIMITS.priceLabel,
                }}
              >
                <Input
                  id="priceLabel"
                  value={draft.priceLabel}
                  maxLength={LIMITS.priceLabel}
                  onChange={event => update('priceLabel', event.target.value)}
                  className="h-10 bg-card"
                  placeholder="$229 / 2-pack"
                  disabled={!media}
                />
              </FormRow>
              <FormRow
                id="badge"
                label="Badge"
                hint="Replaces the type label above the title."
                count={{ value: draft.badge.length, max: LIMITS.badge }}
              >
                <Input
                  id="badge"
                  value={draft.badge}
                  maxLength={LIMITS.badge}
                  onChange={event => update('badge', event.target.value)}
                  className="h-10 bg-card"
                  placeholder="New arrival"
                />
              </FormRow>
            </div>
          </Section>

          <Section kicker="03" title="Buttons">
            <ActionFields
              role="primary"
              value={draft.primary}
              error={visibleErrors.primary}
              onChange={next => update('primary', next)}
            />
            <ActionFields
              role="secondary"
              value={draft.secondary}
              error={visibleErrors.secondary}
              onChange={next => update('secondary', next)}
            />
          </Section>

          <Section kicker="04" title="When Fin shows it">
            <FormRow
              id="keywords"
              label="Trigger keywords"
              hint="Whole words or phrases. Simple plurals match too, so “router” also matches “routers”."
              error={visibleErrors.keywords}
            >
              <KeywordChips
                id="keywords"
                value={draft.keywords}
                onChange={next => update('keywords', next)}
                invalid={Boolean(visibleErrors.keywords)}
                describedBy={
                  visibleErrors.keywords ? 'keywords-error' : 'keywords-hint'
                }
              />
            </FormRow>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-soft">
                Look for keywords in
              </legend>
              <div className="flex flex-wrap gap-2">
                {MATCH_SCOPES.map(scope => (
                  <label
                    key={scope}
                    className={cn(
                      'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm',
                      draft.matchOn === scope &&
                        'border-signal bg-signal-soft font-semibold'
                    )}
                  >
                    <input
                      type="radio"
                      name="matchOn"
                      value={scope}
                      checked={draft.matchOn === scope}
                      onChange={() => update('matchOn', scope)}
                      className="accent-[var(--color-signal)]"
                    />
                    {matchScopeLabel(scope)}
                  </label>
                ))}
              </div>
            </fieldset>
            <FormRow
              id="sourceUrlContains"
              label="Fin source URL contains"
              hint="Shows the card when Fin cites a source whose URL contains this text. Counts double toward the match."
            >
              <Input
                id="sourceUrlContains"
                value={draft.sourceUrlContains}
                maxLength={LIMITS.sourceUrlContains}
                onChange={event =>
                  update('sourceUrlContains', event.target.value)
                }
                className="h-10 bg-card font-mono text-xs"
                placeholder="product-orbit-7"
              />
            </FormRow>
            <FormRow
              id="priority"
              label="Priority"
              hint="Higher-priority cards appear first when several match."
            >
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={draft.priority}
                  onChange={event =>
                    update('priority', Number(event.target.value))
                  }
                  aria-label="Priority slider"
                  className="flex-1 accent-[var(--color-signal)]"
                />
                <Input
                  id="priority"
                  type="number"
                  min={0}
                  max={100}
                  value={draft.priority}
                  onChange={event =>
                    update(
                      'priority',
                      Math.max(
                        0,
                        Math.min(100, Number(event.target.value) || 0)
                      )
                    )
                  }
                  className="h-10 w-20 bg-card text-center font-mono"
                />
              </div>
            </FormRow>
          </Section>

          <Section kicker="05" title="Publishing">
            <FormRow
              id="name"
              label="Internal name"
              hint={`Shown only in Salesforce. Defaults to “${defaultName(draft)}”.`}
            >
              <Input
                id="name"
                value={draft.name}
                maxLength={LIMITS.name}
                onChange={event => update('name', event.target.value)}
                className="h-10 bg-card"
              />
            </FormRow>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-ink-soft">
                Size in the chat
              </legend>
              <div className="flex flex-wrap gap-2">
                {([null, ...CARD_SIZES] as const).map(size => (
                  <label
                    key={size ?? 'display'}
                    className={cn(
                      'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm',
                      draft.size === size &&
                        'border-signal bg-signal-soft font-semibold'
                    )}
                  >
                    <input
                      type="radio"
                      name="cardSize"
                      value={size ?? ''}
                      checked={draft.size === size}
                      onChange={() => update('size', size)}
                      className="accent-[var(--color-signal)]"
                    />
                    {size
                      ? cardSizeLabel(size)
                      : displaySize
                        ? `Display setting (${cardSizeLabel(displaySize)})`
                        : 'Display setting'}
                  </label>
                ))}
              </div>
              <p className="text-xs text-ink-soft">
                Compact cards have a shorter photo, smaller type and two
                bullets. A chat page whose Card size property is set to Compact
                or Standard uses that size for every card.
              </p>
            </fieldset>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-paper/50 px-3">
              <Checkbox
                checked={draft.active}
                onCheckedChange={checked => update('active', checked === true)}
              />
              <span className="text-sm">
                <span className="font-semibold">Active.</span> Fin can show this
                card on the Experience site.
              </span>
            </label>
          </Section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <PreviewFrame
            card={previewCard}
            size={draft.size ?? displaySize ?? 'standard'}
          />
        </aside>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex gap-2">
            {!isNew && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10"
                  onClick={() => void handleDuplicate()}
                  disabled={saving}
                >
                  <Copy aria-hidden />
                  Duplicate
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-10"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                >
                  <Trash2 aria-hidden />
                  Delete
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="h-10">
              <Link to="/">Cancel</Link>
            </Button>
            <Button
              type="submit"
              form="card-form"
              className="h-10 px-4"
              disabled={saving || (!dirty && !isNew)}
            >
              <Save aria-hidden />
              {saving ? 'Saving…' : isNew ? 'Create card' : 'Save card'}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete “{draft.title || 'Untitled card'}”?
            </DialogTitle>
            <DialogDescription>
              Fin stops showing it right away. Past chats keep a reference to it
              but won&apos;t render it. To hide it temporarily, clear Active
              instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep card</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={saving}
            >
              Delete card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
