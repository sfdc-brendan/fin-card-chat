import { createElement } from 'lwc';
import FinSearchBar from 'c/finSearchBar';
import { takePrompt } from 'c/finChatHandoff';

const mockNavigate = jest.fn();

jest.mock('@salesforce/community/basePath', () => ({ __esModule: true, default: '/professional/s' }), { virtual: true });
jest.mock(
    'lightning/navigation',
    () => {
        const Navigate = Symbol('Navigate');
        const NavigationMixin = (Base) =>
            class extends Base {
                [Navigate](pageReference) {
                    mockNavigate(pageReference);
                }
            };
        NavigationMixin.Navigate = Navigate;
        return { NavigationMixin };
    },
    { virtual: true }
);

const getNavigateCalledWith = () => mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1]?.[0];

async function flushPromises() {
    for (let i = 0; i < 3; i++) await Promise.resolve();
}

function mount(props = {}) {
    const element = createElement('c-fin-search-bar', { is: FinSearchBar });
    Object.assign(element, props);
    document.body.appendChild(element);
    return element;
}

describe('c-fin-search-bar', () => {
    beforeEach(() => sessionStorage.clear());

    afterEach(() => {
        while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
        jest.clearAllMocks();
    });

    it('hands the typed question to the chat page', async () => {
        const element = mount();
        const input = element.shadowRoot.querySelector('input');
        input.value = '  Is fiber available at 94105?  ';
        input.dispatchEvent(new CustomEvent('input'));
        await flushPromises();
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        await flushPromises();

        expect(takePrompt()).toBe('Is fiber available at 94105?');
        expect(getNavigateCalledWith()).toEqual({ type: 'standard__webPage', attributes: { url: '/professional/s/ask-fin' } });
        expect(input.value).toBe('');
    });

    it('asks a suggestion when it is clicked', async () => {
        const element = mount({ suggestions: 'Wi-Fi 7 options; Start a return', chatPagePath: '/fin-help/' });
        const seeds = element.shadowRoot.querySelectorAll('.fin-search__seed');
        expect(seeds).toHaveLength(2);
        seeds[1].click();
        await flushPromises();

        expect(takePrompt()).toBe('Start a return');
        expect(getNavigateCalledWith().attributes.url).toBe('/professional/s/fin-help');
    });

    it('does nothing until there is a question', async () => {
        const element = mount({ suggestions: '' });
        expect(element.shadowRoot.querySelector('.fin-search__seeds')).toBeNull();
        const submit = element.shadowRoot.querySelector('.fin-search__submit');
        expect(submit.disabled).toBe(true);
        element.shadowRoot.querySelector('input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        await flushPromises();

        expect(getNavigateCalledWith()).toBeUndefined();
        expect(takePrompt()).toBe('');
    });
});
