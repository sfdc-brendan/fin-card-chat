import type {
  Fin_Ui_Card__CCreateRepresentation,
  ListFinCardsQuery,
} from '@/api/graphql-operations-types';

type CardEdge = NonNullable<
  NonNullable<ListFinCardsQuery['uiapi']['query']['Fin_UI_Card__c']>['edges']
>[number];
export type CardRecord = NonNullable<NonNullable<CardEdge>['node']>;

export const CARD_TYPES = [
  'Product',
  'Self_Service',
  'Article',
  'Offer',
] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const ACTION_TYPES = [
  'Open_URL',
  'Send_Message',
  'Launch_Flow',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const MATCH_SCOPES = ['Both', 'User_Message', 'Fin_Reply'] as const;
export type MatchScope = (typeof MATCH_SCOPES)[number];

export const LIMITS = {
  name: 80,
  title: 80,
  subtitle: 120,
  body: 2000,
  priceLabel: 40,
  badge: 30,
  actionLabel: 40,
  actionValue: 255,
  sourceUrlContains: 255,
  keywords: 4000,
} as const;

export interface CardAction {
  type: ActionType | null;
  label: string;
  value: string;
}

export interface CardDraft {
  id: string | null;
  name: string;
  type: CardType;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  productId: string | null;
  productName: string | null;
  priceLabel: string;
  badge: string;
  primary: CardAction;
  secondary: CardAction;
  keywords: string[];
  matchOn: MatchScope;
  sourceUrlContains: string;
  priority: number;
  /** null follows the Card size on the Display page. */
  size: CardSize | null;
  active: boolean;
  lastModified: string | null;
}

/** What a person or the Models API writes; record bookkeeping and display size stay with the draft. */
export type CardContent = Omit<
  CardDraft,
  'id' | 'active' | 'lastModified' | 'size'
>;

/** Fin UI card schema v1 — the same JSON FinCardMatcher.toCard returns to the chat. */
export type V1CardType = 'product' | 'self_service' | 'article' | 'offer';
export type V1ActionKind = 'open_url' | 'send_message' | 'launch_flow';

export interface V1Action {
  role: 'primary' | 'secondary';
  kind: V1ActionKind;
  label: string;
  value: string;
}

export interface V1Card {
  v: 1;
  id: string;
  type: V1CardType;
  title: string;
  subtitle: string | null;
  text: string;
  bullets: string[];
  imageUrl: string | null;
  priceLabel: string | null;
  badge: string | null;
  productName: string | null;
  actions: V1Action[];
  /** Omitted or null follows the Display setting. */
  size?: CardSize | null;
}

function isMember<T extends string>(
  values: readonly T[],
  value: unknown
): value is T {
  return (
    typeof value === 'string' && (values as readonly string[]).includes(value)
  );
}

export const isCardType = (value: unknown): value is CardType =>
  isMember(CARD_TYPES, value);
export const isActionType = (value: unknown): value is ActionType =>
  isMember(ACTION_TYPES, value);
export const isMatchScope = (value: unknown): value is MatchScope =>
  isMember(MATCH_SCOPES, value);

export function cardTypeLabel(type: CardType): string {
  switch (type) {
    case 'Product':
      return 'Product';
    case 'Self_Service':
      return 'Self-service';
    case 'Article':
      return 'Article';
    case 'Offer':
      return 'Offer';
    default: {
      const unhandled: never = type;
      throw new Error(`Unhandled card type: ${String(unhandled)}`);
    }
  }
}

export function v1Type(type: CardType): V1CardType {
  switch (type) {
    case 'Product':
      return 'product';
    case 'Self_Service':
      return 'self_service';
    case 'Article':
      return 'article';
    case 'Offer':
      return 'offer';
    default: {
      const unhandled: never = type;
      throw new Error(`Unhandled card type: ${String(unhandled)}`);
    }
  }
}

/** Mirrors layoutFor in the finCardChatUtils LWC module. */
export function layoutFor(type: V1CardType): {
  media: boolean;
  price: boolean;
  label: string;
} {
  switch (type) {
    case 'product':
      return { media: true, price: true, label: 'Product' };
    case 'offer':
      return { media: true, price: true, label: 'Offer' };
    case 'article':
      return { media: false, price: false, label: 'Article' };
    case 'self_service':
      return { media: false, price: false, label: 'Self-service' };
    default: {
      const unhandled: never = type;
      throw new Error(`Unhandled Fin card type: ${String(unhandled)}`);
    }
  }
}

export function actionTypeLabel(type: ActionType): string {
  switch (type) {
    case 'Open_URL':
      return 'Open a link';
    case 'Send_Message':
      return 'Send a message to Fin';
    case 'Launch_Flow':
      return 'Launch a screen flow';
    default: {
      const unhandled: never = type;
      throw new Error(`Unhandled action type: ${String(unhandled)}`);
    }
  }
}

export function actionValueHint(type: ActionType): {
  label: string;
  placeholder: string;
} {
  switch (type) {
    case 'Open_URL':
      return { label: 'URL', placeholder: 'https://… or /s/relative-page' };
    case 'Send_Message':
      return {
        label: 'Message',
        placeholder: 'Leave blank to send the button label',
      };
    case 'Launch_Flow':
      return { label: 'Flow API name', placeholder: 'Fin_Request_Callback' };
    default: {
      const unhandled: never = type;
      throw new Error(`Unhandled action type: ${String(unhandled)}`);
    }
  }
}

export function matchScopeLabel(scope: MatchScope): string {
  switch (scope) {
    case 'Both':
      return 'Customer or Fin';
    case 'User_Message':
      return 'Customer message only';
    case 'Fin_Reply':
      return 'Fin reply only';
    default: {
      const unhandled: never = scope;
      throw new Error(`Unhandled match scope: ${String(unhandled)}`);
    }
  }
}

/** Same rule as FinCardMatcher.safeUrl: https or a site-relative path. */
export function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (
    /^https:\/\//i.test(trimmed) ||
    (trimmed.startsWith('/') && !trimmed.startsWith('//'))
  ) {
    return trimmed;
  }
  return null;
}

/** The host of an https image URL, or null for site-relative and invalid URLs. */
export function imageHost(url: string): string | null {
  const safe = safeUrl(url);
  if (!safe || safe.startsWith('/')) return null;
  try {
    return new URL(safe).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Whether a CSP Trusted URL entry lets browsers load images from host. Entries may omit the scheme
 * ("*.salesforce.com") and may start with a wildcard label, which matches subdomains only.
 */
export function trustsImageHost(
  entries: readonly string[],
  host: string
): boolean {
  return entries.some(entry => {
    const pattern = entry
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/[/:].*$/, '');
    if (!pattern) return false;
    if (pattern.startsWith('*.')) return host.endsWith(pattern.slice(1));
    return host === pattern;
  });
}

/**
 * API name for the CSP Trusted URL the studio creates for an image host. Names must start with a
 * letter, use only letters, digits and single underscores, not end in an underscore, and fit in 80 characters.
 */
export function trustedSiteName(host: string): string {
  const slug = host
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `Fin_Img_${slug}`.slice(0, 80).replace(/_+$/, '');
}

const FLOW_NAME = /^[A-Za-z][A-Za-z0-9_]{0,79}$/;

function toV1Action(
  role: V1Action['role'],
  action: CardAction
): V1Action | null {
  if (!action.type || !action.label.trim()) return null;
  const label = action.label.trim();
  const raw = action.value.trim();
  let kind: V1ActionKind;
  let value: string | null;
  switch (action.type) {
    case 'Open_URL':
      kind = 'open_url';
      value = safeUrl(raw);
      break;
    case 'Send_Message':
      kind = 'send_message';
      value = raw || label;
      break;
    case 'Launch_Flow':
      kind = 'launch_flow';
      value = FLOW_NAME.test(raw) ? raw : null;
      break;
    default: {
      const unhandled: never = action.type;
      throw new Error(`Unhandled action type: ${String(unhandled)}`);
    }
  }
  return value ? { role, kind, label, value } : null;
}

export function splitBody(body: string): { text: string; bullets: string[] } {
  const paragraphs: string[] = [];
  const bullets: string[] = [];
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
      bullets.push(trimmed.substring(1).trim());
    } else if (trimmed) {
      paragraphs.push(trimmed);
    }
  }
  return { text: paragraphs.join('\n'), bullets };
}

export function toV1(draft: CardDraft): V1Card {
  const { text, bullets } = splitBody(draft.body);
  const actions = [
    toV1Action('primary', draft.primary),
    toV1Action('secondary', draft.secondary),
  ].filter((a): a is V1Action => a !== null);
  return {
    v: 1,
    id: draft.id ?? 'preview',
    type: v1Type(draft.type),
    title: draft.title,
    subtitle: draft.subtitle || null,
    text,
    bullets,
    imageUrl: safeUrl(draft.imageUrl),
    priceLabel: draft.priceLabel || null,
    badge: draft.badge || null,
    productName: draft.productId ? draft.productName : null,
    actions,
    size: draft.size,
  };
}

export function parseKeywords(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(/[\n,;]/)) {
    const phrase = part.trim();
    const key = phrase.toLowerCase();
    if (phrase && !seen.has(key)) {
      seen.add(key);
      result.push(phrase);
    }
  }
  return result;
}

export function productSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface StudioProduct {
  id: string;
  name: string;
  code: string;
  family: string;
  description: string;
  imageUrl: string;
  unitPrice: number | null;
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function productDefaults(product: StudioProduct) {
  const firstSentence = product.description.split(/(?<=[.!?])\s/)[0] ?? '';
  return {
    name: `${product.name} product card`.slice(0, LIMITS.name),
    title: product.name.slice(0, LIMITS.title),
    subtitle: firstSentence.slice(0, LIMITS.subtitle),
    imageUrl: product.imageUrl,
    priceLabel: product.unitPrice == null ? '' : usd.format(product.unitPrice),
    sourceUrlContains: `product-${productSlug(product.name)}`,
    keyword: product.name.toLowerCase(),
  };
}

/**
 * Links a product and fills fields that are blank or still hold the previous product's defaults,
 * so switching products updates the card without overwriting copy the author wrote.
 */
export function applyProduct(
  draft: CardDraft,
  product: StudioProduct,
  previous: StudioProduct | null
): CardDraft {
  const next = productDefaults(product);
  const prev = previous ? productDefaults(previous) : null;
  const pick = (
    current: string,
    key: Exclude<keyof typeof next, 'keyword'>
  ): string =>
    !current.trim() || current === prev?.[key] ? next[key] : current;
  const keywords = draft.keywords.filter(
    k => k.toLowerCase() !== prev?.keyword
  );
  return {
    ...draft,
    productId: product.id,
    productName: product.name,
    name: pick(draft.name, 'name'),
    title: pick(draft.title, 'title'),
    subtitle: pick(draft.subtitle, 'subtitle'),
    imageUrl: pick(draft.imageUrl, 'imageUrl'),
    priceLabel: pick(draft.priceLabel, 'priceLabel'),
    sourceUrlContains: pick(draft.sourceUrlContains, 'sourceUrlContains'),
    keywords: parseKeywords([...keywords, next.keyword].join('\n')),
  };
}

const emptyAction = (): CardAction => ({ type: null, label: '', value: '' });

export function emptyDraft(type: CardType = 'Product'): CardDraft {
  return {
    id: null,
    name: '',
    type,
    title: '',
    subtitle: '',
    body: '',
    imageUrl: '',
    productId: null,
    productName: null,
    priceLabel: '',
    badge: '',
    primary: emptyAction(),
    secondary: emptyAction(),
    keywords: [],
    matchOn: 'Both',
    sourceUrlContains: '',
    priority: 50,
    size: null,
    active: true,
    lastModified: null,
  };
}

export function fromRecord(node: CardRecord): CardDraft {
  const str = (field: { value?: string | null } | null | undefined): string =>
    field?.value ?? '';
  const action = (type: string, label: string, value: string): CardAction => ({
    type: isActionType(type) ? type : null,
    label,
    value,
  });
  const type = node.Type__c?.value;
  const matchOn = node.Match_On__c?.value;
  const size = node.Card_Size__c?.value?.toLowerCase();
  return {
    id: node.Id,
    name: str(node.Name),
    type: isCardType(type) ? type : 'Product',
    title: str(node.Title__c),
    subtitle: str(node.Subtitle__c),
    body: str(node.Body__c),
    imageUrl: str(node.Image_URL__c),
    productId: node.Product__c?.value ?? null,
    productName: node.Product__r?.Name?.value ?? null,
    priceLabel: str(node.Price_Label__c),
    badge: str(node.Badge__c),
    primary: action(
      str(node.Primary_Action_Type__c),
      str(node.Primary_Action_Label__c),
      str(node.Primary_Action_Value__c)
    ),
    secondary: action(
      str(node.Secondary_Action_Type__c),
      str(node.Secondary_Action_Label__c),
      str(node.Secondary_Action_Value__c)
    ),
    keywords: parseKeywords(str(node.Trigger_Keywords__c)),
    matchOn: isMatchScope(matchOn) ? matchOn : 'Both',
    sourceUrlContains: str(node.Source_URL_Contains__c),
    priority: node.Priority__c?.value ?? 50,
    size: isCardSize(size) ? size : null,
    active: node.Active__c?.value ?? false,
    lastModified:
      node.LastModifiedDate?.displayValue ??
      node.LastModifiedDate?.value ??
      null,
  };
}

/** Blank strings become null so clearing a field in the editor clears it in Salesforce. */
export function toRecordInput(
  draft: CardDraft
): Fin_Ui_Card__CCreateRepresentation {
  const orNull = (value: string): string | null =>
    value.trim() ? value.trim() : null;
  const actionFields = (action: CardAction) => ({
    type: action.type,
    label: action.type ? orNull(action.label) : null,
    value: action.type ? orNull(action.value) : null,
  });
  const primary = actionFields(draft.primary);
  const secondary = actionFields(draft.secondary);
  return {
    Name: orNull(draft.name) ?? defaultName(draft),
    Type__c: draft.type,
    Title__c: draft.title.trim(),
    Subtitle__c: orNull(draft.subtitle),
    Body__c: orNull(draft.body),
    Image_URL__c: orNull(draft.imageUrl),
    Product__c: draft.productId,
    Price_Label__c: orNull(draft.priceLabel),
    Badge__c: orNull(draft.badge),
    Primary_Action_Type__c: primary.type,
    Primary_Action_Label__c: primary.label,
    Primary_Action_Value__c: primary.value,
    Secondary_Action_Type__c: secondary.type,
    Secondary_Action_Label__c: secondary.label,
    Secondary_Action_Value__c: secondary.value,
    Trigger_Keywords__c: draft.keywords.length
      ? draft.keywords.join('\n')
      : null,
    Match_On__c: draft.matchOn,
    Source_URL_Contains__c: orNull(draft.sourceUrlContains),
    Priority__c: draft.priority,
    Card_Size__c: draft.size ? cardSizeLabel(draft.size) : null,
    Active__c: draft.active,
  };
}

export function defaultName(draft: CardDraft): string {
  const base = draft.title.trim() || 'Untitled';
  return `${base} ${cardTypeLabel(draft.type).toLowerCase()} card`.slice(
    0,
    LIMITS.name
  );
}

export function duplicateDraft(draft: CardDraft): CardDraft {
  return {
    ...draft,
    id: null,
    name: `${draft.name || defaultName(draft)} (copy)`.slice(0, LIMITS.name),
    active: false,
    lastModified: null,
  };
}

export type DraftErrors = Partial<
  Record<'title' | 'primary' | 'secondary' | 'imageUrl' | 'keywords', string>
>;

function actionError(action: CardAction): string | undefined {
  if (!action.type) return undefined;
  if (!action.label.trim()) return 'Add a button label.';
  const value = action.value.trim();
  switch (action.type) {
    case 'Open_URL':
      return safeUrl(value)
        ? undefined
        : 'Use an https:// link or a path that starts with /.';
    case 'Send_Message':
      return undefined;
    case 'Launch_Flow':
      return FLOW_NAME.test(value)
        ? undefined
        : 'Enter a flow API name, like Fin_Request_Callback.';
    default: {
      const unhandled: never = action.type;
      throw new Error(`Unhandled action type: ${String(unhandled)}`);
    }
  }
}

export function validateDraft(draft: CardDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.title.trim()) errors.title = 'Every card needs a title.';
  if (draft.imageUrl.trim() && !safeUrl(draft.imageUrl)) {
    errors.imageUrl =
      'Images must use https:// so they load on the Experience site.';
  }
  if (!draft.keywords.length && !draft.sourceUrlContains.trim()) {
    errors.keywords =
      'Add a keyword or a source URL match, or Fin will never show this card.';
  }
  const primary = actionError(draft.primary);
  if (primary) errors.primary = primary;
  const secondary = actionError(draft.secondary);
  if (secondary) errors.secondary = secondary;
  return errors;
}

/** An unsaved card drafted by the Models API through /fincards/generate. */
export interface GeneratedCard {
  draft: CardContent;
  rationale: string;
  model: string;
}

export interface GenerateRequest {
  brief: string;
  type?: CardType;
  productId?: string | null;
  current?: CardContent;
  instruction?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const asText = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.slice(0, max) : '';

function asAction(value: unknown): CardAction {
  if (!isRecord(value) || !isActionType(value.type)) return emptyAction();
  return {
    type: value.type,
    label: asText(value.label, LIMITS.actionLabel),
    value: asText(value.value, LIMITS.actionValue),
  };
}

/** Reads the Apex response defensively; returns null when it is not a usable card. */
export function parseGenerated(payload: unknown): GeneratedCard | null {
  if (!isRecord(payload) || !isRecord(payload.draft)) return null;
  const raw = payload.draft;
  if (!isCardType(raw.type) || typeof raw.title !== 'string') return null;
  const priority =
    typeof raw.priority === 'number' ? Math.round(raw.priority) : 50;
  return {
    draft: {
      name: asText(raw.name, LIMITS.name),
      type: raw.type,
      title: asText(raw.title, LIMITS.title),
      subtitle: asText(raw.subtitle, LIMITS.subtitle),
      body: asText(raw.body, LIMITS.body),
      imageUrl: asText(raw.imageUrl, LIMITS.actionValue),
      productId:
        typeof raw.productId === 'string' && raw.productId
          ? raw.productId
          : null,
      productName:
        typeof raw.productName === 'string' && raw.productName
          ? raw.productName
          : null,
      priceLabel: asText(raw.priceLabel, LIMITS.priceLabel),
      badge: asText(raw.badge, LIMITS.badge),
      primary: asAction(raw.primary),
      secondary: asAction(raw.secondary),
      keywords: Array.isArray(raw.keywords)
        ? parseKeywords(
            raw.keywords.filter(k => typeof k === 'string').join('\n')
          )
        : [],
      matchOn: isMatchScope(raw.matchOn) ? raw.matchOn : 'Both',
      sourceUrlContains: asText(
        raw.sourceUrlContains,
        LIMITS.sourceUrlContains
      ),
      priority: Math.max(0, Math.min(100, priority)),
    },
    rationale: asText(payload.rationale, 400),
    model: asText(payload.model, 120),
  };
}

/** Applies a generated card onto the draft being edited, keeping its record id and publishing state. */
export function mergeGenerated(
  base: CardDraft,
  generated: GeneratedCard
): CardDraft {
  return {
    ...base,
    ...generated.draft,
    id: base.id,
    active: base.active,
    lastModified: base.lastModified,
  };
}

/** The editable content of a draft, without record bookkeeping, for refine requests. */
export function draftContent(draft: CardDraft): CardContent {
  const {
    id: _id,
    active: _active,
    lastModified: _lastModified,
    size: _size,
    ...content
  } = draft;
  return content;
}

/** "sfdc_ai__DefaultBedrockAnthropicClaude46Sonnet" -> "Claude Sonnet 4.6" for display. */
export function modelLabel(model: string): string {
  const name = model
    .replace(/^sfdc_ai__Default/, '')
    .replace(/^(Bedrock|Azure|OpenAI|VertexAI)+/, '');
  const claude = /^AnthropicClaude(\d)(\d)?(Haiku|Sonnet|Opus)$/.exec(name);
  if (claude)
    return `Claude ${claude[3]} ${claude[1]}${claude[2] ? `.${claude[2]}` : ''}`;
  return name || 'the Models API';
}

/** Mirrors finCardChatUtils.isShowcaseType: products and offers are browsed side by side. */
export function isShowcaseType(type: V1CardType): boolean {
  switch (type) {
    case 'product':
    case 'offer':
      return true;
    case 'article':
    case 'self_service':
      return false;
    default: {
      const unhandled: never = type;
      throw new Error(`Unhandled card type: ${String(unhandled)}`);
    }
  }
}

/** Mirrors finCardChatUtils.cardGroups: ids of cards the chat shows in the carousel (two or more showcase cards). */
export function carouselIds(cards: V1Card[]): Set<string> {
  const showcase = cards.filter(card => isShowcaseType(card.type));
  return new Set(showcase.length >= 2 ? showcase.map(card => card.id) : []);
}

/** Mirrors finCardChatUtils.linkTarget: article cards that open a page or ask Fin show as a one-line link. */
export function linkAction(card: V1Card): V1Action | null {
  if (card.type !== 'article') return null;
  const primary = card.actions.find(action => action.role === 'primary');
  if (!primary) return null;
  switch (primary.kind) {
    case 'open_url':
      return /^https?:\/\//i.test(primary.value) ? primary : null;
    case 'send_message':
      return primary.value ? primary : null;
    case 'launch_flow':
      return null;
    default: {
      const unhandled: never = primary.kind;
      throw new Error(`Unhandled Fin card action: ${String(unhandled)}`);
    }
  }
}

export const CARD_SIZES = ['standard', 'compact'] as const;
export type CardSize = (typeof CARD_SIZES)[number];
export const isCardSize = (value: unknown): value is CardSize =>
  isMember(CARD_SIZES, value);

export const MAX_CARDS_CEILING = 6;

export interface DisplaySettings {
  cardSize: CardSize;
  maxCards: number;
}

export function cardSizeLabel(size: CardSize): string {
  switch (size) {
    case 'standard':
      return 'Standard';
    case 'compact':
      return 'Compact';
    default: {
      const unhandled: never = size;
      throw new Error(`Unhandled card size: ${String(unhandled)}`);
    }
  }
}

export function cardSizeHint(size: CardSize): string {
  switch (size) {
    case 'standard':
      return 'Full photo, every bullet, and roomy spacing. Best when Fin shows one or two cards.';
    case 'compact':
      return 'Shorter photo, smaller type, two bullets, and narrower cards, so more fit beside Fin’s answer.';
    default: {
      const unhandled: never = size;
      throw new Error(`Unhandled card size: ${String(unhandled)}`);
    }
  }
}

export function clampMaxCards(value: number): number {
  return Math.min(MAX_CARDS_CEILING, Math.max(1, Math.round(value) || 1));
}

export function parseDisplaySettings(payload: unknown): DisplaySettings | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const { cardSize, maxCards } = payload as Record<string, unknown>;
  if (!isCardSize(cardSize) || typeof maxCards !== 'number') return null;
  return { cardSize, maxCards: clampMaxCards(maxCards) };
}
