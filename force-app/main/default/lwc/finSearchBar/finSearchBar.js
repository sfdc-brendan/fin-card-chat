import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import basePath from '@salesforce/community/basePath';
import { stashPrompt } from 'c/finChatHandoff';

const COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i;
const DEFAULT_ACCENT = '#2855ed';
const MAX_SUGGESTIONS = 6;

export default class FinSearchBar extends NavigationMixin(LightningElement) {
    @api placeholder = 'Ask Fin about products, plans, or your account';
    @api buttonLabel = 'Ask Fin';
    @api suggestions = 'Compare plans; Track my order; Start a return; Talk to a person';
    @api chatPagePath = 'ask-fin';
    @api accentColor = DEFAULT_ACCENT;

    draft = '';

    get rootStyle() {
        const accent = String(this.accentColor || '').trim();
        return `--fin-accent: ${COLOR.test(accent) ? accent : DEFAULT_ACCENT};`;
    }

    get submitDisabled() {
        return !this.draft.trim();
    }

    get suggestionList() {
        return String(this.suggestions || '')
            .split(/[;\n|]/)
            .map((text) => text.trim())
            .filter(Boolean)
            .slice(0, MAX_SUGGESTIONS)
            .map((text, index) => ({ key: `s${index}`, text }));
    }

    get hasSuggestions() {
        return this.suggestionList.length > 0;
    }

    handleInput(event) {
        this.draft = event.target.value;
    }

    handleKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.ask(this.draft);
        }
    }

    handleSubmit() {
        this.ask(this.draft);
    }

    handleSuggestion(event) {
        this.ask(event.currentTarget.dataset.text);
    }

    ask(raw) {
        const text = String(raw || '').trim();
        if (!text) return;
        stashPrompt(text);
        this.draft = '';
        if (this.refs?.input) this.refs.input.value = '';
        const path = String(this.chatPagePath || '').replace(/^\/+|\/+$/g, '');
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: { url: `${basePath}/${path}` }
        });
    }
}
