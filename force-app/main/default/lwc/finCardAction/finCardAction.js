import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ACTION_KINDS, actionIcon } from 'c/finCardChatUtils';

export default class FinCardAction extends NavigationMixin(LightningElement) {
    @api action;
    @api disabled = false;

    get known() {
        return ACTION_KINDS.includes(this.action?.kind);
    }

    get iconName() {
        return actionIcon(this.action.kind);
    }

    get variant() {
        return this.action.role === 'primary' ? 'brand' : 'neutral';
    }

    get title() {
        return this.action.kind === 'open_url' ? `${this.action.label} (opens a new page)` : this.action.label;
    }

    handleClick() {
        const { kind, value } = this.action;
        switch (kind) {
            case 'open_url':
                this[NavigationMixin.Navigate]({ type: 'standard__webPage', attributes: { url: value } });
                break;
            case 'send_message':
                this.dispatchEvent(new CustomEvent('cardsend', { detail: { text: value }, bubbles: true, composed: true }));
                break;
            case 'launch_flow':
                this.dispatchEvent(new CustomEvent('cardflow', { detail: { flowApiName: value } }));
                break;
            default:
                throw new Error(`Unhandled Fin card action: ${kind}`);
        }
    }
}
