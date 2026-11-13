import { LightningElement, api } from 'lwc';
import sendMessage from '@salesforce/apex/FinChatController.sendMessage';
import deliver from '@salesforce/apex/FinChatController.deliver';
import getTurn from '@salesforce/apex/FinChatController.getTurn';
import { CARD_SIZES, DEFAULT_MAX_CARDS, MAX_POLL_MS, POLL_MS, cardGroups, citesGuide, errorMessage, mergeReplies, resolveCardSize, statusNotice, turnCards } from 'c/finCardChatUtils';
import { takePrompt } from 'c/finChatHandoff';

const STORAGE_KEY = 'finCardChat.v1';
const EXPIRED = 'This chat has expired. Start a new one.';
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i;
const DEFAULT_ACCENT = '#2855ed';
const MAX_SUGGESTIONS = 6;
function clamp(value, fallback, min, max) {
    return Math.min(Math.max(Number(value) || fallback, min), max);
}

export default class FinCardChat extends LightningElement {
    @api eyebrow = 'Customer Support';
    @api headline = 'A little guidance.';
    @api headlineAccent = 'A clear way forward.';
    @api welcomeMessage = 'Ask a question. Fin answers with the products, guides and next steps that fit.';
    @api placeholder = 'Ask me anything';
    @api suggestions = 'Compare plans; Track my order; Start a return; Talk to a person';
    @api agentName = 'Fin';
    @api disclaimer = 'AI responses can be inaccurate.';
    @api accentColor = DEFAULT_ACCENT;
    @api maxCards = DEFAULT_MAX_CARDS;
    @api height = 820;
    @api contentWidth = 1040;
    /** compact or standard for every card; anything else lets each card use its Studio size, then the Display setting. */
    @api cardSize = 'studio';

    studioCardSize = 'standard';
    turns = [];
    draft = '';
    busy = false;
    token;
    lastSeq = 0;
    pollTimer;
    pollStartedAt = 0;
    finalPoll = false;
    shouldScroll = false;
    carriedPrompt = '';

    connectedCallback() {
        // A question carried from c/finSearchBar starts a new enquiry rather than joining the stored chat.
        // It is sent after the first render, once the composer it clears exists.
        this.carriedPrompt = takePrompt();
        if (this.carriedPrompt) return;
        this.restore();
        const last = this.turns[this.turns.length - 1];
        if (this.token && last?.status === 'thinking') {
            this.busy = true;
            this.startPolling();
        }
    }

    disconnectedCallback() {
        this.stopPolling();
    }

    renderedCallback() {
        if (this.carriedPrompt) {
            const text = this.carriedPrompt;
            this.carriedPrompt = '';
            this.handleNewChat();
            this.send(text);
            return;
        }
        if (this.shouldScroll) {
            this.shouldScroll = false;
            const log = this.refs.transcript;
            if (log) log.scrollTop = log.scrollHeight;
        }
    }

    get rootStyle() {
        const accent = COLOR.test(String(this.accentColor || '').trim()) ? this.accentColor.trim() : DEFAULT_ACCENT;
        const width = clamp(this.contentWidth, 1040, 480, 1600);
        const height = clamp(this.height, 820, 360, 1400);
        return `--fin-accent: ${accent}; --fin-width: ${width}px; --fin-height: ${height}px;`;
    }

    get rootClass() {
        const mode = this.hasTurns ? 'fin-chat_thread' : 'fin-chat_start';
        return `fin-chat ${mode}${this.busy ? ' fin-chat_working' : ''}`;
    }

    get ariaLabel() {
        return `${this.agentName || 'Fin'} assistant`;
    }

    get agentInitial() {
        return String(this.agentName || 'Fin').trim().charAt(0).toUpperCase();
    }

    get statusText() {
        return this.busy ? 'Typing…' : 'AI agent';
    }

    get presenceClass() {
        return this.busy ? 'fin-thread__presence fin-thread__presence_busy' : 'fin-thread__presence';
    }

    get sourcesLabel() {
        return `Sources ${this.agentName || 'Fin'} used`;
    }

    get suggestionList() {
        return String(this.suggestions || '')
            .split(/[;\n|]/)
            .map((text) => text.trim())
            .filter(Boolean)
            .slice(0, MAX_SUGGESTIONS)
            .map((text, index) => ({ key: `s${index}`, text }));
    }

    get showSuggestions() {
        return !this.hasTurns && this.suggestionList.length > 0;
    }

    get turnViews() {
        return this.turns.map((turn) => {
            const replies = turn.replies.map((reply) => ({ ...reply, key: `${turn.id}-r${reply.seq}` }));
            const sized = turnCards(turn.replies, Number(this.maxCards)).map((card) => {
                const size = resolveCardSize(this.cardSize, card.size, this.studioCardSize);
                return { ...card, size, slotClass: `fin-turn__card fin-turn__card_${size}` };
            });
            const { carousel, grid, links } = cardGroups(sized);
            const sources = [];
            const seen = new Set();
            for (const reply of turn.replies) {
                for (const source of reply.sources || []) {
                    if (!seen.has(source.url) && !links.some((card) => citesGuide(source, card))) {
                        seen.add(source.url);
                        sources.push({ ...source, key: `${turn.id}-${source.url}` });
                    }
                }
            }
            return {
                ...turn,
                replies,
                sources,
                hasSources: sources.length > 0,
                carouselCards: carousel,
                hasCarousel: carousel.length > 0,
                gridCards: grid,
                hasGridCards: grid.length > 0,
                links,
                hasLinks: links.length > 0,
                hasReplies: replies.length > 0,
                isThinking: turn.status === 'thinking'
            };
        });
    }

    get sendDisabled() {
        return this.busy || !this.draft.trim();
    }

    get hasTurns() {
        return this.turns.length > 0;
    }

    handleInput(event) {
        this.draft = event.target.value;
    }

    handleKeydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.send(this.draft);
        }
    }

    handleSend() {
        this.send(this.draft);
    }

    handleSuggestion(event) {
        this.send(event.currentTarget.dataset.text);
    }

    handleCardSend(event) {
        event.stopPropagation();
        this.send(event.detail.text);
    }

    handleNewChat() {
        this.stopPolling();
        this.turns = [];
        this.token = undefined;
        this.lastSeq = 0;
        this.busy = false;
        this.clearComposer();
        this.persist();
    }

    // The textarea keeps what the visitor typed unless it is cleared on the element itself.
    clearComposer() {
        this.draft = '';
        if (this.refs?.input) this.refs.input.value = '';
    }

    async send(raw) {
        const text = String(raw || '').trim();
        if (this.busy || !text) return;
        this.busy = true;
        this.clearComposer();
        this.turns = [...this.turns, { id: `t${Date.now()}`, userText: text, replies: [], status: 'thinking', notice: null }];
        this.shouldScroll = true;
        try {
            const sent = await sendMessage({ token: this.token, text });
            this.token = sent.token;
            this.lastSeq = sent.seq;
            this.persist();
            this.startPolling();
            const delivered = await deliver({ token: this.token });
            if (delivered.status === 'error') this.finishTurn('error', delivered.reason);
        } catch (error) {
            const message = errorMessage(error);
            if (message === EXPIRED) {
                this.token = undefined;
                this.lastSeq = 0;
            }
            this.finishTurn('error', message);
        }
    }

    startPolling() {
        this.stopPolling();
        this.pollStartedAt = Date.now();
        this.finalPoll = false;
        this.schedule();
    }

    stopPolling() {
        clearTimeout(this.pollTimer);
        this.pollTimer = undefined;
    }

    schedule() {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.pollTimer = setTimeout(() => this.poll(), POLL_MS);
    }

    async poll() {
        if (!this.token) return;
        try {
            const turn = await getTurn({ token: this.token, afterSeq: this.lastSeq });
            if (CARD_SIZES.includes(turn.cardSize)) this.studioCardSize = turn.cardSize;
            this.addReplies(turn.messages);
            if (turn.done) {
                // One more poll catches replies that land just after Fin's status update.
                if (this.finalPoll) {
                    this.finishTurn(turn.status, turn.reason);
                } else {
                    this.finalPoll = true;
                    this.schedule();
                }
            } else if (Date.now() - this.pollStartedAt > MAX_POLL_MS) {
                this.finishTurn('timeout');
            } else {
                this.schedule();
            }
        } catch (error) {
            this.finishTurn('error', errorMessage(error));
        }
    }

    addReplies(messages) {
        if (!messages?.length) return;
        this.lastSeq = Math.max(this.lastSeq, ...messages.map((m) => m.seq));
        this.updateLastTurn((turn) => ({ ...turn, replies: mergeReplies(turn.replies, messages) }));
        this.shouldScroll = true;
    }

    finishTurn(status, reason) {
        this.stopPolling();
        this.busy = false;
        this.updateLastTurn((turn) => ({ ...turn, status: 'done', notice: statusNotice(status, reason) }));
        this.shouldScroll = true;
    }

    updateLastTurn(update) {
        if (!this.turns.length) return;
        const turns = [...this.turns];
        turns[turns.length - 1] = update(turns[turns.length - 1]);
        this.turns = turns;
        this.persist();
    }

    persist() {
        try {
            sessionStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ token: this.token, lastSeq: this.lastSeq, cardSize: this.studioCardSize, turns: this.turns.slice(-30) })
            );
        } catch {
            // Storage can be unavailable (private mode); the chat still works for this page view.
        }
    }

    restore() {
        try {
            const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
            if (saved && Array.isArray(saved.turns)) {
                this.token = saved.token;
                this.lastSeq = Number(saved.lastSeq) || 0;
                if (CARD_SIZES.includes(saved.cardSize)) this.studioCardSize = saved.cardSize;
                this.turns = saved.turns;
            }
        } catch {
            this.turns = [];
        }
    }
}
