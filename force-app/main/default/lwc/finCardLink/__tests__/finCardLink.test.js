import { createElement } from 'lwc';
import FinCardLink from 'c/finCardLink';

const guide = (kind, value) => ({
    v: 1,
    id: 'a03',
    type: 'article',
    title: 'Prepare your Orbit home network',
    subtitle: 'Home networking · Acme Help Center',
    bullets: ['Not shown'],
    actions: [{ role: 'primary', kind, label: 'Read the guide', value }]
});

function render(card) {
    const element = createElement('c-fin-card-link', { is: FinCardLink });
    element.card = card;
    document.body.appendChild(element);
    return element;
}

describe('c-fin-card-link', () => {
    afterEach(() => {
        while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
    });

    it('opens the guide in a new tab from one row with its title and category', () => {
        const element = render(guide('open_url', 'https://example.com/support/orbit-setup'));
        const link = element.shadowRoot.querySelector('a.fin-link');
        expect(link.href).toBe('https://example.com/support/orbit-setup');
        expect(link.target).toBe('_blank');
        expect(link.rel).toBe('noopener noreferrer');
        expect(link.getAttribute('aria-label')).toBe('Prepare your Orbit home network (opens a new page)');
        expect(element.shadowRoot.querySelector('.fin-link__meta').textContent).toBe('Home networking · Acme Help Center');
        expect(element.shadowRoot.textContent).not.toContain('Not shown');
    });

    it('asks Fin when the guide action sends a message', () => {
        const element = render(guide('send_message', 'Walk me through Orbit setup'));
        const handler = jest.fn();
        document.body.addEventListener('cardsend', handler);
        element.shadowRoot.querySelector('button.fin-link').click();
        expect(handler.mock.calls[0][0].detail).toEqual({ text: 'Walk me through Orbit setup' });
        document.body.removeEventListener('cardsend', handler);
    });

    it('renders nothing for a card it cannot show as a link', () => {
        const element = render(guide('launch_flow', 'Fin_Request_Callback'));
        expect(element.shadowRoot.querySelector('.fin-link')).toBeNull();
    });
});
