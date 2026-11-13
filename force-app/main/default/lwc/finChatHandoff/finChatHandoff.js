/**
 * Carries a question from c/finSearchBar to c/finCardChat on another site page.
 *
 * sessionStorage rather than a query parameter, so the question stays out of the
 * address bar, browser history, and the site's page-view analytics.
 */

const KEY = 'finCardChat.pendingPrompt';

export function stashPrompt(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    try {
        sessionStorage.setItem(KEY, trimmed);
    } catch {
        // Storage can be unavailable (private mode); the visitor retypes on the chat page.
    }
}

/** Reads and clears the pending question, so a refresh of the chat page does not ask it again. */
export function takePrompt() {
    try {
        const value = sessionStorage.getItem(KEY);
        sessionStorage.removeItem(KEY);
        return value || '';
    } catch {
        return '';
    }
}
