import { LightningElement, api } from 'lwc';
import { linkTarget } from 'c/finCardChatUtils';

/** A Fin article card as a single row: the whole row opens the guide or asks Fin about it. */
export default class FinCardLink extends LightningElement {
    @api card;

    get target() {
        return linkTarget(this.card);
    }

    get isUrl() {
        return this.target?.kind === 'open_url';
    }

    get href() {
        return this.target.value;
    }

    get label() {
        return this.isUrl ? `${this.card.title} (opens a new page)` : this.card.title;
    }

    get trailingIcon() {
        return this.isUrl ? 'utility:new_window' : 'utility:chat';
    }

    handleAsk() {
        this.dispatchEvent(new CustomEvent('cardsend', { detail: { text: this.target.value }, bubbles: true, composed: true }));
    }
}
