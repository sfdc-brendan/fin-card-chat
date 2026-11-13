import { LightningElement, api } from 'lwc';

const EDGE_PX = 2;

export default class FinCardCarousel extends LightningElement {
    @api cards = [];
    @api label = 'Suggested products';

    index = 0;
    overflowing = true;
    resizeObserver;

    get slides() {
        const total = this.cards.length;
        return this.cards.map((card, i) => ({
            key: card.id,
            card,
            className: card.size === 'compact' ? 'fin-carousel__slide fin-carousel__slide_compact' : 'fin-carousel__slide',
            label: `${i + 1} of ${total}: ${card.title}`
        }));
    }

    get dots() {
        return this.cards.map((card, i) => ({
            key: `${card.id}-dot`,
            index: i,
            label: `Show card ${i + 1} of ${this.cards.length}`,
            current: i === this.index ? 'true' : 'false',
            className: i === this.index ? 'fin-carousel__dot fin-carousel__dot_active' : 'fin-carousel__dot'
        }));
    }

    get showControls() {
        return this.cards.length > 1 && this.overflowing;
    }

    get atStart() {
        return this.index <= 0;
    }

    get atEnd() {
        return this.index >= this.cards.length - 1;
    }

    get status() {
        return `Card ${this.index + 1} of ${this.cards.length}`;
    }

    renderedCallback() {
        if (!this.resizeObserver && typeof ResizeObserver === 'function' && this.refs.track) {
            this.resizeObserver = new ResizeObserver(() => this.measure());
            this.resizeObserver.observe(this.refs.track);
        }
    }

    disconnectedCallback() {
        this.resizeObserver?.disconnect();
        this.resizeObserver = undefined;
    }

    // Without layout (e.g. before first paint) scrollWidth is 0; keep the controls rather than hide them by mistake.
    measure() {
        const track = this.refs.track;
        if (!track || !track.scrollWidth) {
            return;
        }
        this.overflowing = track.scrollWidth - track.clientWidth > EDGE_PX;
    }

    handleScroll() {
        const track = this.refs.track;
        if (!track) {
            return;
        }
        const slides = [...track.querySelectorAll('.fin-carousel__slide')];
        if (!slides.length) {
            return;
        }
        if (track.scrollLeft >= track.scrollWidth - track.clientWidth - EDGE_PX) {
            this.index = slides.length - 1;
            return;
        }
        let closest = 0;
        slides.forEach((slide, i) => {
            if (Math.abs(slide.offsetLeft - track.scrollLeft) < Math.abs(slides[closest].offsetLeft - track.scrollLeft)) {
                closest = i;
            }
        });
        this.index = closest;
    }

    handlePrevious() {
        this.goTo(this.index - 1);
    }

    handleNext() {
        this.goTo(this.index + 1);
    }

    handleDot(event) {
        this.goTo(Number(event.currentTarget.dataset.index));
    }

    handleKeydown(event) {
        switch (event.key) {
            case 'ArrowLeft':
                this.goTo(this.index - 1);
                break;
            case 'ArrowRight':
                this.goTo(this.index + 1);
                break;
            case 'Home':
                this.goTo(0);
                break;
            case 'End':
                this.goTo(this.cards.length - 1);
                break;
            default:
                return;
        }
        event.preventDefault();
    }

    goTo(target) {
        const next = Math.min(Math.max(target, 0), this.cards.length - 1);
        this.index = next;
        const track = this.refs.track;
        const slide = track?.querySelectorAll('.fin-carousel__slide')[next];
        if (!slide) {
            return;
        }
        const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (typeof track.scrollTo === 'function') {
            track.scrollTo({ left: slide.offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
        } else {
            track.scrollLeft = slide.offsetLeft;
        }
    }
}
