import {
    ACTION_KINDS,
    CARD_TYPES,
    DEFAULT_MAX_CARDS,
    actionIcon,
    cardGroups,
    citesGuide,
    errorMessage,
    isKnownCard,
    isShowcaseType,
    layoutFor,
    mergeReplies,
    resolveCardSize,
    samePage,
    statusNotice,
    turnCards
} from 'c/finCardChatUtils';

const card = (id, type = 'product') => ({ v: 1, id, type, title: id, bullets: [], actions: [] });

describe('resolveCardSize', () => {
    it('uses the page size, then the card size, then the Display setting', () => {
        expect(resolveCardSize('compact', 'standard', 'standard')).toBe('compact');
        expect(resolveCardSize('studio', 'Standard', 'compact')).toBe('standard');
        expect(resolveCardSize('studio', null, 'compact')).toBe('compact');
        expect(resolveCardSize(undefined, 'huge', undefined)).toBe('standard');
    });
});

describe('layoutFor', () => {
    it('returns a layout for every card type', () => {
        for (const type of CARD_TYPES) {
            expect(layoutFor(type).label).toEqual(expect.any(String));
        }
    });

    it('shows media and price only for products and offers', () => {
        expect(layoutFor('product')).toMatchObject({ media: true, price: true });
        expect(layoutFor('offer')).toMatchObject({ media: true, price: true });
        expect(layoutFor('article')).toMatchObject({ media: false, price: false });
        expect(layoutFor('self_service')).toMatchObject({ media: false, price: false });
    });

    it('throws on a type it does not handle', () => {
        expect(() => layoutFor('carousel')).toThrow('Unhandled Fin card type: carousel');
    });
});

describe('actionIcon', () => {
    it('maps every action kind to an icon', () => {
        for (const kind of ACTION_KINDS) {
            expect(actionIcon(kind)).toMatch(/^utility:/);
        }
    });

    it('throws on an unknown action kind', () => {
        expect(() => actionIcon('download')).toThrow('Unhandled Fin card action: download');
    });
});

describe('isKnownCard', () => {
    it('accepts only v1 cards with a known type', () => {
        expect(isKnownCard(card('a'))).toBe(true);
        expect(isKnownCard({ ...card('a'), v: 2 })).toBe(false);
        expect(isKnownCard({ ...card('a'), type: 'carousel' })).toBe(false);
        expect(isKnownCard(null)).toBe(false);
    });
});

describe('mergeReplies', () => {
    it('adds each Fin message once', () => {
        const first = [{ seq: 2, sentAt: 100, html: 'a' }];
        const merged = mergeReplies(first, [
            { seq: 2, sentAt: 100, html: 'a again' },
            { seq: 3, sentAt: 200, html: 'b' }
        ]);
        expect(merged.map((m) => m.html)).toEqual(['a', 'b']);
    });

    it('orders by when Fin sent the message, not arrival order', () => {
        const merged = mergeReplies([{ seq: 2, sentAt: 300, html: 'late' }], [{ seq: 3, sentAt: 100, html: 'early' }]);
        expect(merged.map((m) => m.html)).toEqual(['early', 'late']);
    });

    it('falls back to sequence when sent times are missing or equal', () => {
        const merged = mergeReplies([], [
            { seq: 5, html: 'c' },
            { seq: 4, sentAt: 100, html: 'b' },
            { seq: 3, sentAt: 100, html: 'a' }
        ]);
        expect(merged.map((m) => m.html)).toEqual(['a', 'b', 'c']);
    });

    it('tolerates empty input', () => {
        expect(mergeReplies([], undefined)).toEqual([]);
    });
});

describe('turnCards', () => {
    it('dedupes cards across replies and caps the count', () => {
        const replies = [{ cards: [card('a'), card('b')] }, { cards: [card('b'), card('c'), card('d')] }];
        expect(turnCards(replies, 3).map((c) => c.id)).toEqual(['a', 'b', 'c']);
    });

    it('skips cards it cannot render', () => {
        const replies = [{ cards: [{ ...card('x'), type: 'carousel' }, card('y', 'article')] }];
        expect(turnCards(replies, 3).map((c) => c.id)).toEqual(['y']);
    });

    it('defaults to five cards and never shows fewer than one', () => {
        const replies = [{ cards: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => card(id)) }];
        expect(turnCards(replies, undefined)).toHaveLength(DEFAULT_MAX_CARDS);
        expect(turnCards(replies, 0)).toHaveLength(DEFAULT_MAX_CARDS);
        expect(turnCards(replies, -2)).toHaveLength(1);
    });
});

describe('cardGroups', () => {
    const ids = (cards) => cards.map((c) => c.id);

    const article = (id, kind = 'open_url', value = `https://example.com/support/${id}`) => ({
        ...card(id, 'article'),
        actions: [{ role: 'primary', kind, label: 'Read the guide', value }]
    });

    it('puts two or more products and offers in the carousel, articles in links, and the rest in the grid', () => {
        const { carousel, grid, links } = cardGroups([card('p1'), article('a1'), card('o1', 'offer'), card('s1', 'self_service')]);
        expect(ids(carousel)).toEqual(['p1', 'o1']);
        expect(ids(grid)).toEqual(['s1']);
        expect(ids(links)).toEqual(['a1']);
    });

    it('keeps a single product in the grid', () => {
        const product = card('p1');
        expect(cardGroups([product, article('a1')])).toEqual({ carousel: [], grid: [product], links: [article('a1')] });
    });

    it('keeps articles that need a flow, or have no usable link, as full cards', () => {
        const { grid, links } = cardGroups([article('f1', 'launch_flow', 'Fin_Request_Callback'), article('j1', 'open_url', 'javascript:alert(1)'), card('n1', 'article'), article('m1', 'send_message', 'Help me choose')]);
        expect(ids(grid)).toEqual(['f1', 'j1', 'n1']);
        expect(ids(links)).toEqual(['m1']);
    });

    it('treats the same page with a different scheme, hash, or trailing slash as one page', () => {
        expect(samePage('https://Example.com/support/a/', 'http://example.com/support/a#top')).toBe(true);
        expect(samePage('https://example.com/support/a', 'https://example.com/support/b')).toBe(false);
        expect(samePage('', '')).toBe(false);
    });

    it('matches a Fin citation to a guide card by page, title, or slug', () => {
        const guide = article('improve-orbit-wifi-coverage');
        guide.title = 'Get more from your Orbit Wi-Fi';
        const knowledge = 'https://org.my.salesforce.com/support/s/article/acme-improve-orbit-wifi-coverage';
        expect(citesGuide({ title: 'Anything', url: knowledge }, guide)).toBe(true);
        expect(citesGuide({ title: 'Acme: Get more from your Orbit Wi-Fi', url: 'https://x.test/kb/123' }, guide)).toBe(true);
        expect(citesGuide({ title: 'Other', url: 'https://example.com/support/improve-orbit-wifi-coverage/' }, guide)).toBe(true);
        expect(citesGuide({ title: 'Acme: Orbit 7 specs', url: 'https://x.test/s/article/acme-product-orbit-7' }, guide)).toBe(false);
        expect(citesGuide({ title: 'Get more from your Orbit Wi-Fi', url: knowledge }, card('p1'))).toBe(false);
    });

    it('throws on a type it does not handle', () => {
        expect(() => isShowcaseType('carousel')).toThrow('Unhandled Fin card type: carousel');
    });
});

describe('statusNotice and errorMessage', () => {
    it('explains escalations, timeouts, and errors', () => {
        expect(statusNotice('escalated')).toMatch(/support team/);
        expect(statusNotice('timeout')).toMatch(/longer than usual/);
        expect(statusNotice('error', 'Fin rejected the request (HTTP 401).')).toBe('Fin rejected the request (HTTP 401).');
        expect(statusNotice('awaiting_user_reply')).toBeNull();
    });

    it('prefers the Apex message', () => {
        expect(errorMessage({ body: { message: 'From Apex' } })).toBe('From Apex');
        expect(errorMessage(new Error('Plain'))).toBe('Plain');
        expect(errorMessage(undefined)).toMatch(/Something went wrong/);
    });
});
