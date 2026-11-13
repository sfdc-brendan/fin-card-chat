import {
  BookOpen,
  ExternalLink,
  ImageOff,
  MessageCircle,
  Workflow,
} from 'lucide-react';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  layoutFor,
  linkAction,
  type CardSize,
  type V1Action,
  type V1ActionKind,
  type V1Card,
} from '@/lib/cardModel';

const SLDS_BRAND = '#0176d3';

function actionIcon(kind: V1ActionKind): ReactNode {
  switch (kind) {
    case 'open_url':
      return <ExternalLink className="size-3.5" aria-hidden />;
    case 'send_message':
      return <MessageCircle className="size-3.5" aria-hidden />;
    case 'launch_flow':
      return <Workflow className="size-3.5" aria-hidden />;
    default: {
      const unhandled: never = kind;
      throw new Error(`Unhandled Fin card action: ${String(unhandled)}`);
    }
  }
}

export function describeAction(action: V1Action): string {
  switch (action.kind) {
    case 'open_url':
      return `Opens ${action.value}`;
    case 'send_message':
      return `Sends “${action.value}” to Fin`;
    case 'launch_flow':
      return `Runs the ${action.value} screen flow inside the card`;
    default: {
      const unhandled: never = action.kind;
      throw new Error(`Unhandled Fin card action: ${String(unhandled)}`);
    }
  }
}

interface SizeClasses {
  media: string;
  body: string;
  title: string;
  text: string;
  clamp: string;
  bullets: string;
  button: string;
}

/** Mirrors the --fin-card-* values finCardChat sets for each size. */
function sizeClasses(size: CardSize): SizeClasses {
  switch (size) {
    case 'standard':
      return {
        media: 'aspect-video',
        body: 'gap-2 p-4',
        title: 'text-lg',
        text: 'text-sm',
        clamp: '',
        bullets: '',
        button: 'min-h-9 px-4 text-sm',
      };
    case 'compact':
      return {
        media: 'aspect-[2/1]',
        body: 'gap-1.5 p-3 text-[0.8125rem]',
        title: 'text-[0.9375rem]',
        text: 'text-[0.8125rem]',
        clamp: 'line-clamp-2',
        bullets: '[&>li:nth-child(n+3)]:hidden',
        button: 'min-h-7 px-3 text-xs',
      };
    default: {
      const unhandled: never = size;
      throw new Error(`Unhandled card size: ${String(unhandled)}`);
    }
  }
}

interface CardPreviewProps {
  card: V1Card;
  size?: CardSize;
  accent?: string;
  className?: string;
  onAction?: (action: V1Action) => void;
}

/** Renders a v1 card the way the finCardRenderer LWC does on the Experience site. */
interface ArticleRowProps {
  card: V1Card;
  action: V1Action;
  accent: string;
  className?: string;
  onAction?: (action: V1Action) => void;
}

/** Mirrors finCardLink: the one-line row the chat shows for article cards. */
function ArticleRow({
  card,
  action,
  accent,
  className,
  onAction,
}: ArticleRowProps) {
  const style: CSSProperties & Record<'--fin-accent', string> = {
    '--fin-accent': accent,
  };
  return (
    <button
      type="button"
      style={style}
      title={describeAction(action)}
      onClick={() => onAction?.(action)}
      className={cn(
        'group flex min-h-13 w-full items-center gap-3 rounded-xl border border-[#dfe5f1] bg-white px-3.5 py-2 text-left hover:bg-[#2855ed0d]',
        "[font-family:'Salesforce_Sans',-apple-system,'Segoe_UI',sans-serif]",
        className
      )}
    >
      <span
        className="grid size-8 flex-none place-items-center rounded-lg bg-[#eef2fe] text-[var(--fin-accent)]"
        aria-hidden
      >
        <BookOpen className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[0.9375rem] font-semibold text-[#1d2940] group-hover:text-[var(--fin-accent)]">
          {card.title || 'Untitled article'}
        </span>
        {card.subtitle && (
          <span className="truncate text-xs text-[#64728b]">
            {card.subtitle}
          </span>
        )}
      </span>
      <span className="flex-none text-[#64728b] group-hover:text-[var(--fin-accent)]">
        {actionIcon(action.kind)}
      </span>
    </button>
  );
}

export function CardPreview({
  card,
  size = 'standard',
  accent = SLDS_BRAND,
  className,
  onAction,
}: CardPreviewProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const link = linkAction(card);
  if (link)
    return (
      <ArticleRow
        card={card}
        action={link}
        accent={accent}
        className={className}
        onAction={onAction}
      />
    );
  const sized = sizeClasses(size);
  const layout = layoutFor(card.type);
  const showMedia = layout.media && Boolean(card.imageUrl);
  const showPrice = layout.price && Boolean(card.priceLabel);
  const ruled = card.type === 'article' || card.type === 'self_service';
  const style: CSSProperties & Record<'--fin-accent', string> = {
    '--fin-accent': accent,
  };

  return (
    <article
      aria-label={card.title || 'Untitled card'}
      style={style}
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-[#e5e5e5] bg-white text-left text-[#181818] shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
        "[font-family:'Salesforce_Sans',-apple-system,'Segoe_UI',sans-serif]",
        ruled && 'border-l-4 border-l-[var(--fin-accent)]',
        className
      )}
    >
      {showMedia && (
        <div className={cn(sized.media, 'bg-[#f3f3f3]')}>
          {failedImage === card.imageUrl ? (
            <div className="flex size-full flex-col items-center justify-center gap-1 p-3 text-center text-xs text-[#64728b]">
              <ImageOff className="size-5" aria-hidden />
              <span>
                The image didn&apos;t load. If its site was just trusted, save
                to refresh the preview. Otherwise check that the link opens an
                image.
              </span>
            </div>
          ) : (
            <img
              src={card.imageUrl ?? undefined}
              alt={card.productName ? `${card.productName} product photo` : ''}
              className="block size-full object-cover"
              loading="lazy"
              onError={() => setFailedImage(card.imageUrl)}
            />
          )}
        </div>
      )}
      <div className={cn('flex flex-col', sized.body)}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.04em] text-[var(--fin-accent)]">
            {card.badge || layout.label}
          </span>
          {showPrice && <span className="font-bold">{card.priceLabel}</span>}
        </div>
        <h3 className={cn('m-0 font-sans font-bold leading-snug', sized.title)}>
          {card.title || 'Untitled card'}
        </h3>
        {card.subtitle && (
          <p className={cn('m-0 text-[#444]', sized.text)}>{card.subtitle}</p>
        )}
        {card.text && (
          <p
            className={cn(
              'm-0 whitespace-pre-line text-[#444]',
              sized.text,
              sized.clamp
            )}
          >
            {card.text}
          </p>
        )}
        {card.bullets.length > 0 && (
          <ul
            className={cn(
              'm-0 list-disc pl-[1.1rem] text-[#444]',
              sized.text,
              sized.bullets
            )}
          >
            {card.bullets.map((bullet, index) => (
              <li key={`${index}-${bullet}`}>{bullet}</li>
            ))}
          </ul>
        )}
        {card.actions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {card.actions.map(action => (
              <button
                key={action.role}
                type="button"
                title={describeAction(action)}
                onClick={() => onAction?.(action)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors',
                  sized.button,
                  action.role === 'primary'
                    ? 'border-[var(--fin-accent)] bg-[var(--fin-accent)] text-white hover:brightness-110'
                    : 'border-[#c9c9c9] bg-white text-[var(--fin-accent)] hover:bg-[#f3f3f3]'
                )}
              >
                {action.label}
                {actionIcon(action.kind)}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
