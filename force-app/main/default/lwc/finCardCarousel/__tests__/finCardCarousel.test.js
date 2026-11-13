import { createElement } from 'lwc';
import FinCardCarousel from 'c/finCardCarousel';

const product = (id) => ({ v: 1, id, type: 'product', title: `Product ${id}`, bullets: [], actions: [] });

async function flushPromises() {
    for (let i = 0; i < 3; i++) await Promise.resolve();
}

function mount(cards) {
    const element = createElement('c-fin-card-carousel', { is: FinCardCarousel });
    element.cards = cards;
    document.body.appendChild(element);
    return element;
}

const activeDot = (element) =>
    [...element.shadowRoot.querySelectorAll('.fin-carousel__dot')].findIndex((dot) => dot.getAttribute('aria-current') === 'true');

describe('c-fin-card-carousel', () => {
    afterEach(() => {
        while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
    });

    it('renders each card as a labelled slide with a dot', () => {
        const element = mount([product('a'), product('b'), product('c')]);
        const slides = element.shadowRoot.querySelectorAll('.fin-carousel__slide');
        expect(slides).toHaveLength(3);
        expect(slides[1].getAttribute('aria-label')).toBe('2 of 3: Product b');
        expect(element.shadowRoot.querySelectorAll('c-fin-card-renderer')).toHaveLength(3);
        expect(element.shadowRoot.querySelectorAll('.fin-carousel__dot')).toHaveLength(3);
        expect(activeDot(element)).toBe(0);
    });

    it('gives compact cards a narrower slide', () => {
        const element = mount([product('a'), { ...product('b'), size: 'compact' }]);
        const slides = element.shadowRoot.querySelectorAll('.fin-carousel__slide');
        expect([...slides].map((slide) => slide.classList.contains('fin-carousel__slide_compact'))).toEqual([false, true]);
    });

    it('moves with the arrows, dots, and keyboard and stops at the ends', async () => {
        const element = mount([product('a'), product('b'), product('c')]);
        const [previous, next] = element.shadowRoot.querySelectorAll('.fin-carousel__arrow');
        expect(previous.disabled).toBe(true);

        next.click();
        await flushPromises();
        expect(activeDot(element)).toBe(1);
        expect(previous.disabled).toBe(false);

        element.shadowRoot.querySelectorAll('.fin-carousel__dot')[2].click();
        await flushPromises();
        expect(activeDot(element)).toBe(2);
        expect(next.disabled).toBe(true);

        const track = element.shadowRoot.querySelector('.fin-carousel__track');
        track.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
        await flushPromises();
        expect(activeDot(element)).toBe(0);
        track.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        await flushPromises();
        expect(activeDot(element)).toBe(0);
        track.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
        await flushPromises();
        expect(activeDot(element)).toBe(2);
        expect(element.shadowRoot.querySelector('[aria-live="polite"]').textContent).toBe('Card 3 of 3');
    });
});
