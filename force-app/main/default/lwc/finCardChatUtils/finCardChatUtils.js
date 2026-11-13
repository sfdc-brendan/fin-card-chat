// Shared by finCardChat, finCardRenderer, and Jest. Cards follow the v1 schema built by FinCardMatcher.toCard.

export const CARD_TYPES = Object.freeze(['product', 'self_service', 'article', 'offer']);
export const ACTION_KINDS = Object.freeze(['open_url', 'send_message', 'launch_flow']);
export const POLL_MS = 1500;
export const MAX_POLL_MS = 60000;
export const DEFAULT_MAX_CARDS = 5;
export const CARD_SIZES = Object.freeze(['compact', 'standard']);

// The page's Card size property wins, then the card's own size from Fin Card Studio, then the Display setting.
export function resolveCardSize(pageSize, cardSize, studioSize) {
    for (const size of [pageSize, cardSize, studioSize]) {
        const value = String(size || '').toLowerCase();
        if (CARD_SIZES.includes(value)) return value;
    }
    return 'standard';
}

export function isKnownCard(card) {
    return Boolean(card) && card.v === 1 && CARD_TYPES.includes(card.type);
}

export function layoutFor(type) {
    switch (type) {
        case 'product':
            return { media: true, price: true, label: 'Product' };
        case 'offer':
            return { media: true, price: true, label: 'Offer' };
        case 'article':
            return { media: false, price: false, label: 'Article' };
        case 'self_service':
            return { media: false, price: false, label: 'Self-service' };
        default:
            throw new Error(`Unhandled Fin card type: ${type}`);
    }
}

export function actionIcon(kind) {
    switch (kind) {
        case 'open_url':
            return 'utility:new_window';
        case 'send_message':
            return 'utility:chat';
        case 'launch_flow':
            return 'utility:flow';
        default:
            throw new Error(`Unhandled Fin card action: ${kind}`);
    }
}

// Adds Fin messages to a turn once each, ordered by when Fin sent them (webhooks can arrive out of order).
export function mergeReplies(replies, incoming) {
    const bySeq = new Map(replies.map((r) => [r.seq, r]));
    for (const message of incoming || []) {
        if (!bySeq.has(message.seq)) bySeq.set(message.seq, message);
    }
    return [...bySeq.values()].sort((a, b) => (a.sentAt ?? Infinity) - (b.sentAt ?? Infinity) || a.seq - b.seq);
}

// A turn shows its cards once, under its last reply, deduplicated and capped.
export function turnCards(replies, maxCards) {
    const seen = new Set();
    const cards = [];
    for (const reply of replies) {
        for (const card of reply.cards || []) {
            if (isKnownCard(card) && !seen.has(card.id)) {
                seen.add(card.id);
                cards.push(card);
            }
        }
    }
    return cards.slice(0, Math.max(1, maxCards || DEFAULT_MAX_CARDS));
}

// Products and offers are browsed side by side; guides and self-service cards are read one at a time.
export function isShowcaseType(type) {
    switch (type) {
        case 'product':
        case 'offer':
            return true;
        case 'article':
        case 'self_service':
            return false;
        default:
            throw new Error(`Unhandled Fin card type: ${type}`);
    }
}

// Two or more product or offer cards go in a carousel; everything else stays in the grid, in match order.
// Articles are read elsewhere, so the chat lists them as one-line links. Other actions need the full card.
export function linkTarget(card) {
    if (card.type !== 'article') return null;
    const primary = (card.actions || []).find((action) => action.role === 'primary');
    switch (primary?.kind) {
        case 'open_url':
            return /^https?:\/\//i.test(primary.value || '') ? primary : null;
        case 'send_message':
            return primary.value ? primary : null;
        case 'launch_flow':
        case undefined:
            return null;
        default:
            throw new Error(`Unhandled Fin card action: ${primary.kind}`);
    }
}

export function cardGroups(cards) {
    const links = cards.filter((card) => linkTarget(card));
    const rest = cards.filter((card) => !linkTarget(card));
    const showcase = rest.filter((card) => isShowcaseType(card.type));
    if (showcase.length < 2) {
        return { carousel: [], grid: rest, links };
    }
    return { carousel: showcase, grid: rest.filter((card) => !isShowcaseType(card.type)), links };
}

// Compares pages, not strings: ignores the scheme, query, hash, and a trailing slash.
export function samePage(a, b) {
    const page = (url) =>
        String(url || '')
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/[?#].*$/, '')
            .replace(/\/+$/, '');
    return Boolean(page(a)) && page(a) === page(b);
}

// Fin often cites Knowledge URLs (.../s/article/<prefix>-<slug>, titled "<Brand>: <title>") while guide cards link to
// the public site (.../support/<slug>), so a citation matches a guide by page, title, or trailing slug.
export function citesGuide(source, card) {
    const url = linkTarget(card)?.value;
    if (!url || !source) return false;
    if (samePage(url, source.url)) return true;
    const title = (value) =>
        String(value || '')
            .replace(/^[^:]{1,40}:\s+/, '')
            .trim()
            .toLowerCase();
    if (title(card.title) && title(card.title) === title(source.title)) return true;
    const slug = (value) =>
        String(value || '')
            .replace(/[?#].*$/, '')
            .replace(/\/+$/, '')
            .split('/')
            .pop()
            .replace(/\.html?$/i, '')
            .toLowerCase();
    const guideSlug = slug(url);
    const sourceSlug = slug(source.url);
    return guideSlug.length > 3 && (sourceSlug === guideSlug || sourceSlug.endsWith(`-${guideSlug}`));
}

export function errorMessage(error) {
    return error?.body?.message || error?.message || 'Something went wrong. Please try again.';
}

export function statusNotice(status, reason) {
    switch (status) {
        case 'escalated':
            return 'Fin has handed this conversation to our support team.';
        case 'timeout':
            return 'Fin is taking longer than usual. Try asking again.';
        case 'error':
            return reason || 'Fin could not be reached. Please try again.';
        default:
            return null;
    }
}
