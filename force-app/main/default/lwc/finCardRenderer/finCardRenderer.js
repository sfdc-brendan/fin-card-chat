import { LightningElement, api } from 'lwc';
import { layoutFor } from 'c/finCardChatUtils';

export default class FinCardRenderer extends LightningElement {
    @api card;
    flowApiName;
    flowDone = false;

    get layout() {
        return layoutFor(this.card.type);
    }

    get cardClass() {
        const size = this.card.size === 'compact' ? ' fin-card_compact' : '';
        return `fin-card fin-card_${this.card.type.replace('_', '-')}${size}`;
    }

    get showMedia() {
        return this.layout.media && Boolean(this.card.imageUrl);
    }

    get showPrice() {
        return this.layout.price && Boolean(this.card.priceLabel);
    }

    get typeLabel() {
        return this.card.badge || this.layout.label;
    }

    get imageAlt() {
        return this.card.productName ? `${this.card.productName} product photo` : '';
    }

    get hasBullets() {
        return this.card.bullets?.length > 0;
    }

    get bulletItems() {
        return (this.card.bullets || []).map((text, index) => ({ key: `${this.card.id}-b${index}`, text }));
    }

    get actions() {
        return this.card.actions || [];
    }

    get hasActions() {
        return this.actions.length > 0 && !this.flowApiName;
    }

    handleFlow(event) {
        this.flowDone = false;
        this.flowApiName = event.detail.flowApiName;
    }

    handleFlowStatus(event) {
        if (event.detail.status === 'FINISHED' || event.detail.status === 'FINISHED_SCREEN') {
            this.flowApiName = null;
            this.flowDone = true;
        }
    }

    closeFlow() {
        this.flowApiName = null;
    }
}
