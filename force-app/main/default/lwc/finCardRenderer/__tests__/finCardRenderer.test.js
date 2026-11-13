import { createElement } from 'lwc';
import FinCardRenderer from 'c/finCardRenderer';

const productCard = {
    v: 1,
    id: 'a01',
    type: 'product',
    title: 'Orbit 7',
    subtitle: 'A better connection in every room.',
    text: '',
    bullets: ['Wi-Fi 7 mesh', '2 × 2.5 GbE per node'],
    imageUrl: 'https://example.com/orbit-7.jpg',
    priceLabel: '$229 / 2-pack',
    badge: 'New arrival',
    productName: 'Orbit 7',
    actions: [
        { role: 'primary', kind: 'open_url', label: 'View product', value: 'https://example.com/orbit-7' },
        { role: 'secondary', kind: 'launch_flow', label: 'Request a callback', value: 'Fin_Request_Callback' }
    ]
};

function render(card) {
    const element = createElement('c-fin-card-renderer', { is: FinCardRenderer });
    element.card = card;
    document.body.appendChild(element);
    return element;
}

const flush = () => Promise.resolve();

describe('c-fin-card-renderer', () => {
    afterEach(() => {
        while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
    });

    it('renders a product with photo, price, badge, bullets, and both actions', () => {
        const element = render(productCard);
        const root = element.shadowRoot;
        expect(root.querySelector('img').getAttribute('src')).toBe(productCard.imageUrl);
        expect(root.querySelector('img').getAttribute('alt')).toBe('Orbit 7 product photo');
        expect(root.querySelector('.fin-card__price').textContent).toBe('$229 / 2-pack');
        expect(root.querySelector('.fin-card__badge').textContent).toBe('New arrival');
        expect([...root.querySelectorAll('li')].map((li) => li.textContent)).toEqual(productCard.bullets);
        expect(root.querySelectorAll('c-fin-card-action')).toHaveLength(2);
    });

    it('hides the photo and price on article cards and uses the type label', () => {
        const element = render({ ...productCard, type: 'article', badge: null });
        const root = element.shadowRoot;
        expect(root.querySelector('img')).toBeNull();
        expect(root.querySelector('.fin-card__price')).toBeNull();
        expect(root.querySelector('.fin-card__badge').textContent).toBe('Article');
        expect(root.querySelector('article').className).toContain('fin-card_article');
    });

    it('marks compact cards so their spacing and type shrink', () => {
        expect(render(productCard).shadowRoot.querySelector('article').classList.contains('fin-card_compact')).toBe(false);
        document.body.removeChild(document.body.firstChild);
        const compact = render({ ...productCard, size: 'compact' });
        expect(compact.shadowRoot.querySelector('article').classList.contains('fin-card_compact')).toBe(true);
    });

    it('fails loudly on a card type the layout switch does not handle', () => {
        const reported = [];
        const onError = (event) => {
            event.preventDefault();
            reported.push(event.error?.message);
        };
        window.addEventListener('error', onError);
        try {
            render({ ...productCard, type: 'carousel' });
        } finally {
            window.removeEventListener('error', onError);
        }
        expect(reported).toContain('Unhandled Fin card type: carousel');
    });

    it('runs a launch_flow action inline and confirms when the flow finishes', async () => {
        const element = render(productCard);
        const root = element.shadowRoot;
        root.querySelectorAll('c-fin-card-action')[1].dispatchEvent(
            new CustomEvent('cardflow', { detail: { flowApiName: 'Fin_Request_Callback' } })
        );
        await flush();
        const flow = root.querySelector('lightning-flow');
        expect(flow.flowApiName).toBe('Fin_Request_Callback');
        expect(root.querySelector('c-fin-card-action')).toBeNull();

        flow.dispatchEvent(new CustomEvent('statuschange', { detail: { status: 'FINISHED' } }));
        await flush();
        expect(root.querySelector('lightning-flow')).toBeNull();
        expect(root.querySelector('.fin-card__done').textContent).toContain('Done');
        expect(root.querySelectorAll('c-fin-card-action')).toHaveLength(2);
    });
});
