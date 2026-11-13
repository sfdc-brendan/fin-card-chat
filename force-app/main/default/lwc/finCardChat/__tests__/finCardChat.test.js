import { createElement } from 'lwc';
import FinCardChat from 'c/finCardChat';
import sendMessage from '@salesforce/apex/FinChatController.sendMessage';
import deliver from '@salesforce/apex/FinChatController.deliver';
import getTurn from '@salesforce/apex/FinChatController.getTurn';
import { MAX_POLL_MS, POLL_MS } from 'c/finCardChatUtils';
import { stashPrompt } from 'c/finChatHandoff';

jest.mock('@salesforce/apex/FinChatController.sendMessage', () => ({ default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/FinChatController.deliver', () => ({ default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/FinChatController.getTurn', () => ({ default: jest.fn() }), { virtual: true });

const orbitCard = {
    v: 1,
    id: 'a01',
    type: 'product',
    title: 'Orbit 7',
    bullets: [],
    imageUrl: 'https://example.com/orbit-7.jpg',
    priceLabel: '$229',
    actions: []
};

async function flushPromises() {
    for (let i = 0; i < 5; i++) await Promise.resolve();
}

async function advance(ms) {
    jest.advanceTimersByTime(ms);
    await flushPromises();
}

function mount() {
    const element = createElement('c-fin-card-chat', { is: FinCardChat });
    document.body.appendChild(element);
    return element;
}

async function ask(element, text) {
    const input = element.shadowRoot.querySelector('textarea');
    input.value = text;
    input.dispatchEvent(new CustomEvent('input'));
    await flushPromises();
    element.shadowRoot.querySelector('button[aria-label="Send"]').click();
    await flushPromises();
}

describe('c-fin-card-chat', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        sessionStorage.clear();
        sendMessage.mockResolvedValue({ token: 'tok', seq: 1 });
        deliver.mockResolvedValue({ status: 'thinking' });
    });

    afterEach(() => {
        while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
        jest.resetAllMocks();
        jest.useRealTimers();
    });

    it('sends the message, polls for Fin, and shows the reply with its cards once', async () => {
        getTurn
            .mockResolvedValueOnce({ status: 'thinking', done: false, lastSeq: 1, messages: [] })
            .mockResolvedValueOnce({
                status: 'awaiting_user_reply',
                done: true,
                lastSeq: 2,
                messages: [{ seq: 2, sentAt: 10, html: '<p>Try Orbit 7.</p>', sources: [], cards: [orbitCard] }]
            })
            .mockResolvedValueOnce({
                status: 'awaiting_user_reply',
                done: true,
                lastSeq: 3,
                messages: [{ seq: 3, sentAt: 20, html: '<p>Anything else?</p>', sources: [], cards: [orbitCard] }]
            });

        const element = mount();
        await ask(element, 'My wifi has a dead zone');

        expect(sendMessage).toHaveBeenCalledWith({ token: undefined, text: 'My wifi has a dead zone' });
        expect(element.shadowRoot.querySelector('textarea').value).toBe('');
        expect(deliver).toHaveBeenCalledWith({ token: 'tok' });
        expect(element.shadowRoot.querySelector('.fin-turn__typing')).not.toBeNull();

        await advance(POLL_MS);
        await advance(POLL_MS);
        await advance(POLL_MS);

        expect(getTurn).toHaveBeenCalledTimes(3);
        expect(getTurn).toHaveBeenLastCalledWith({ token: 'tok', afterSeq: 2 });
        const replies = [...element.shadowRoot.querySelectorAll('lightning-formatted-rich-text')].map((r) => r.value);
        expect(replies).toEqual(['<p>Try Orbit 7.</p>', '<p>Anything else?</p>']);
        expect(element.shadowRoot.querySelectorAll('c-fin-card-renderer')).toHaveLength(1);
        expect(element.shadowRoot.querySelector('.fin-turn__typing')).toBeNull();

        await advance(POLL_MS * 3);
        expect(getTurn).toHaveBeenCalledTimes(3);
    });

    it('shows several products in a carousel, guides as links, and other cards in the grid', async () => {
        const orbitPro = { ...orbitCard, id: 'a02', title: 'Orbit Pro' };
        const guideUrl = 'https://example.com/support/wifi-guide';
        const guide = {
            v: 1,
            id: 'a03',
            type: 'article',
            title: 'Wi-Fi guide',
            bullets: ['Long text the chat no longer shows'],
            actions: [{ role: 'primary', kind: 'open_url', label: 'Read the guide', value: guideUrl }]
        };
        const callback = { v: 1, id: 'a04', type: 'self_service', title: 'Call me back', bullets: [], actions: [] };
        getTurn.mockResolvedValue({
            status: 'awaiting_user_reply',
            done: true,
            lastSeq: 2,
            messages: [
                {
                    seq: 2,
                    sentAt: 10,
                    html: '<p>Two good options.</p>',
                    sources: [
                        { title: 'Acme: Wi-Fi guide', url: 'https://org.my.salesforce.com/s/article/acme-wifi-guide' },
                        { title: 'Orbit Pro specs', url: 'https://example.com/products/orbit-pro' }
                    ],
                    cards: [orbitCard, guide, orbitPro, callback]
                }
            ]
        });
        const element = mount();
        await ask(element, 'Which router should I get?');
        await advance(POLL_MS);

        const carousel = element.shadowRoot.querySelector('c-fin-card-carousel');
        expect(carousel.cards.map((c) => c.id)).toEqual(['a01', 'a02']);
        const grid = element.shadowRoot.querySelectorAll('.fin-turn__cards c-fin-card-renderer');
        expect([...grid].map((r) => r.card.id)).toEqual(['a04']);
        const links = element.shadowRoot.querySelectorAll('.fin-turn__links c-fin-card-link');
        expect([...links].map((l) => l.card.id)).toEqual(['a03']);
        const sources = [...element.shadowRoot.querySelectorAll('.fin-turn__sources a')].map((a) => a.textContent);
        expect(sources).toEqual(['Orbit Pro specs']);
    });

    it('stops polling and tells the visitor when Fin takes too long', async () => {
        getTurn.mockResolvedValue({ status: 'thinking', done: false, lastSeq: 1, messages: [] });
        const element = mount();
        await ask(element, 'Hello?');

        const polls = Math.ceil(MAX_POLL_MS / POLL_MS) + 2;
        for (let i = 0; i < polls; i++) await advance(POLL_MS);

        const calls = getTurn.mock.calls.length;
        expect(element.shadowRoot.querySelector('.fin-turn__notice').textContent).toMatch(/longer than usual/);
        await advance(POLL_MS * 4);
        expect(getTurn.mock.calls.length).toBe(calls);
    });

    it('shows the Apex error and clears an expired session', async () => {
        sendMessage.mockRejectedValue({ body: { message: 'This chat has expired. Start a new one.' } });
        const element = mount();
        await ask(element, 'Hi');

        expect(element.shadowRoot.querySelector('.fin-turn__notice').textContent).toBe(
            'This chat has expired. Start a new one.'
        );
        expect(deliver).not.toHaveBeenCalled();
        expect(JSON.parse(sessionStorage.getItem('finCardChat.v1')).token).toBeUndefined();
    });

    it('uses the Studio card size from Salesforce unless the page sets one', async () => {
        getTurn.mockResolvedValue({
            status: 'awaiting_user_reply',
            done: true,
            cardSize: 'compact',
            lastSeq: 2,
            messages: [{ seq: 2, sentAt: 10, html: '<p>Try Orbit 7.</p>', sources: [], cards: [orbitCard] }]
        });
        const element = mount();
        await ask(element, 'Dead zone');
        const sizeOfCard = () => element.shadowRoot.querySelector('c-fin-card-renderer').card.size;

        await advance(POLL_MS);
        expect(sizeOfCard()).toBe('compact');
        expect(element.shadowRoot.querySelector('.fin-turn__card_compact')).not.toBeNull();
        expect(JSON.parse(sessionStorage.getItem('finCardChat.v1')).cardSize).toBe('compact');

        element.cardSize = 'standard';
        await flushPromises();
        expect(sizeOfCard()).toBe('standard');
        expect(element.shadowRoot.querySelector('.fin-turn__card_compact')).toBeNull();
    });

    it("sizes each card by its own Studio size over the Display setting, unless the page sets one", async () => {
        getTurn.mockResolvedValue({
            status: 'awaiting_user_reply',
            done: true,
            cardSize: 'compact',
            lastSeq: 2,
            messages: [{ seq: 2, sentAt: 10, html: '<p>Try Orbit 7.</p>', sources: [], cards: [{ ...orbitCard, size: 'standard' }] }]
        });
        const element = mount();
        await ask(element, 'Dead zone');
        await advance(POLL_MS);
        const sizeOfCard = () => element.shadowRoot.querySelector('c-fin-card-renderer').card.size;
        expect(sizeOfCard()).toBe('standard');

        element.cardSize = 'compact';
        await flushPromises();
        expect(sizeOfCard()).toBe('compact');
    });

    it('starts inline on the page with suggestions that ask Fin, and returns there on a new chat', async () => {
        getTurn.mockResolvedValue({ status: 'thinking', done: false, lastSeq: 1, messages: [] });
        const element = mount();
        element.suggestions = 'Fiber availability; ; Start a return';
        await flushPromises();

        expect(element.shadowRoot.querySelector('.fin-start__title').textContent).toContain('A clear way forward.');
        const seeds = [...element.shadowRoot.querySelectorAll('.fin-start__seed')];
        expect(seeds.map((seed) => seed.textContent.trim())).toEqual(['Fiber availability', 'Start a return']);

        seeds[1].click();
        await flushPromises();
        expect(sendMessage).toHaveBeenCalledWith({ token: undefined, text: 'Start a return' });
        expect(element.shadowRoot.querySelector('.fin-turn__question').textContent).toBe('Start a return');
        expect(element.shadowRoot.querySelector('.fin-start__seed')).toBeNull();
        expect(element.shadowRoot.querySelector('.fin-chat_working')).not.toBeNull();

        element.shadowRoot.querySelector('.fin-thread__action').click();
        await flushPromises();
        expect(element.shadowRoot.querySelector('.fin-turn')).toBeNull();
        expect(element.shadowRoot.querySelectorAll('.fin-start__seed')).toHaveLength(2);
    });

    it('asks a question carried from the search bar in a new chat, once', async () => {
        getTurn.mockResolvedValue({ status: 'thinking', done: false, lastSeq: 1, messages: [] });
        sessionStorage.setItem(
            'finCardChat.v1',
            JSON.stringify({ token: 'old', lastSeq: 4, turns: [{ id: 't1', userText: 'Earlier question', replies: [], status: 'done', notice: null }] })
        );
        stashPrompt('Is fiber available at 94105?');
        const element = mount();
        await flushPromises();

        expect(sendMessage).toHaveBeenCalledWith({ token: undefined, text: 'Is fiber available at 94105?' });
        const questions = [...element.shadowRoot.querySelectorAll('.fin-turn__question')].map((q) => q.textContent);
        expect(questions).toEqual(['Is fiber available at 94105?']);

        document.body.removeChild(element);
        sendMessage.mockClear();
        mount();
        await flushPromises();
        expect(sendMessage).not.toHaveBeenCalled();
    });
});
