/**
 * Chooses which Fin UI Cards to show for a conversation turn and serializes them in the v1 card schema
 * shared by the finCardChat LWC and the Fin Card Studio preview.
 */
public without sharing class FinCardMatcher {
    public static final Integer DEFAULT_MAX_CARDS = 5;
    public static final Integer CARD_CEILING = 6;
    public static final String SIZE_STANDARD = 'standard';
    public static final String SIZE_COMPACT = 'compact';
    private static final Integer SOURCE_WEIGHT = 2;
    private static List<Fin_UI_Card__c> activeCards;

    /** Cards per Fin answer from Fin Agent Settings, clamped to 1..CARD_CEILING. */
    public static Integer maxCardsPerTurn() {
        Decimal configured = Fin_Agent_Settings__c.getOrgDefaults()?.Max_Cards_Per_Turn__c;
        return clampCards(configured == null ? null : configured.intValue());
    }

    public static Integer clampCards(Integer value) {
        return value == null ? DEFAULT_MAX_CARDS : Math.min(CARD_CEILING, Math.max(1, value));
    }

    /** Card size for the chat from Fin Agent Settings: compact or standard. */
    public static String cardSize() {
        return normalizeSize(Fin_Agent_Settings__c.getOrgDefaults()?.Card_Size__c);
    }

    public static String normalizeSize(String value) {
        return SIZE_COMPACT.equalsIgnoreCase(value?.trim()) ? SIZE_COMPACT : SIZE_STANDARD;
    }

    /** A card's own size, or null when it follows the Display setting. */
    public static String cardSizeOf(Fin_UI_Card__c card) {
        return String.isBlank(card.Card_Size__c) ? null : normalizeSize(card.Card_Size__c);
    }

    public class Match implements Comparable {
        public Fin_UI_Card__c card;
        public Integer hits = 0;
        public List<String> reasons = new List<String>();

        public Integer compareTo(Object other) {
            Match that = (Match) other;
            Decimal mine = card.Priority__c == null ? 0 : card.Priority__c;
            Decimal theirs = that.card.Priority__c == null ? 0 : that.card.Priority__c;
            if (mine != theirs) {
                return mine > theirs ? -1 : 1;
            }
            if (hits != that.hits) {
                return hits > that.hits ? -1 : 1;
            }
            return card.Name.compareTo(that.card.Name);
        }
    }

    public static List<Match> match(String userText, String finText, List<String> sourceUrls, Integer maxCards, Set<Id> exclude) {
        String user = normalize(userText);
        String fin = normalize(finText);
        List<String> urls = new List<String>();
        for (String url : sourceUrls == null ? new List<String>() : sourceUrls) {
            if (String.isNotBlank(url)) {
                urls.add(url.toLowerCase());
            }
        }
        List<Match> matches = new List<Match>();
        for (Fin_UI_Card__c card : activeCards()) {
            if (exclude != null && exclude.contains(card.Id)) {
                continue;
            }
            Match result = score(card, user, fin, urls);
            if (result.hits > 0) {
                matches.add(result);
            }
        }
        matches.sort();
        Integer limitTo = maxCards == null || maxCards < 1 ? maxCardsPerTurn() : Math.min(maxCards, CARD_CEILING);
        while (matches.size() > limitTo) {
            matches.remove(matches.size() - 1);
        }
        return matches;
    }

    private static Match score(Fin_UI_Card__c card, String user, String fin, List<String> urls) {
        Match result = new Match();
        result.card = card;
        String scope = card.Match_On__c == null ? 'Both' : card.Match_On__c;
        for (String phrase : keywords(card.Trigger_Keywords__c)) {
            if ((scope == 'Both' || scope == 'User_Message') && containsPhrase(user, phrase)) {
                result.hits++;
                result.reasons.add('Visitor said "' + phrase.trim() + '"');
            } else if ((scope == 'Both' || scope == 'Fin_Reply') && containsPhrase(fin, phrase)) {
                result.hits++;
                result.reasons.add('Fin said "' + phrase.trim() + '"');
            }
        }
        String needle = card.Source_URL_Contains__c == null ? '' : card.Source_URL_Contains__c.trim().toLowerCase();
        if (needle != '') {
            for (String url : urls) {
                if (url.contains(needle)) {
                    result.hits += SOURCE_WEIGHT;
                    result.reasons.add('Fin cited ' + url);
                    break;
                }
            }
        }
        return result;
    }

    public static List<String> keywords(String raw) {
        List<String> phrases = new List<String>();
        if (String.isBlank(raw)) {
            return phrases;
        }
        for (String line : raw.split('[\\n,;]')) {
            String phrase = normalize(line).trim();
            if (phrase != '') {
                phrases.add(' ' + phrase + ' ');
            }
        }
        return phrases;
    }

    // Lowercase, punctuation to spaces, padded so phrases only match whole words.
    public static String normalize(String text) {
        if (String.isBlank(text)) {
            return ' ';
        }
        String plain = text.stripHtmlTags().toLowerCase().replaceAll('[^a-z0-9]+', ' ');
        return ' ' + plain.trim() + ' ';
    }

    private static Boolean containsPhrase(String text, String padded) {
        return text.contains(padded) || text.contains(padded.removeEnd(' ') + 's ');
    }

    public static List<Fin_UI_Card__c> activeCards() {
        if (activeCards != null) {
            return activeCards;
        }
        Cache.OrgPartition partition = orgPartition();
        if (partition != null) {
            activeCards = (List<Fin_UI_Card__c>) partition.get('active');
        }
        if (activeCards == null) {
            activeCards = [
                SELECT Id, Name, Type__c, Card_Size__c, Title__c, Subtitle__c, Body__c, Image_URL__c, Price_Label__c, Badge__c,
                    Product__c, Product__r.Name, Primary_Action_Type__c, Primary_Action_Label__c, Primary_Action_Value__c,
                    Secondary_Action_Type__c, Secondary_Action_Label__c, Secondary_Action_Value__c,
                    Trigger_Keywords__c, Match_On__c, Source_URL_Contains__c, Priority__c, Active__c
                FROM Fin_UI_Card__c
                WHERE Active__c = TRUE
                WITH SYSTEM_MODE
                ORDER BY Priority__c DESC NULLS LAST, Name
                LIMIT 500
            ];
            if (partition != null) {
                partition.put('active', activeCards, 300);
            }
        }
        return activeCards;
    }

    public static void clearCache() {
        activeCards = null;
        Cache.OrgPartition partition = orgPartition();
        if (partition != null) {
            partition.remove('active');
        }
    }

    // Platform Cache is optional: orgs without a default partition fall back to one query per transaction.
    private static Cache.OrgPartition orgPartition() {
        try {
            Cache.OrgPartition partition = Cache.Org.getPartition('local.FinCards');
            return partition.isAvailable() ? partition : null;
        } catch (Exception e) {
            return null;
        }
    }

    public static List<Map<String, Object>> toCards(List<Fin_UI_Card__c> cards) {
        List<Map<String, Object>> result = new List<Map<String, Object>>();
        for (Fin_UI_Card__c card : cards) {
            result.add(toCard(card));
        }
        return result;
    }

    public static Map<String, Object> toCard(Fin_UI_Card__c card) {
        List<String> paragraphs = new List<String>();
        List<String> bullets = new List<String>();
        if (String.isNotBlank(card.Body__c)) {
            for (String line : card.Body__c.split('\n')) {
                String trimmed = line.trim();
                if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
                    bullets.add(trimmed.substring(1).trim());
                } else if (trimmed != '') {
                    paragraphs.add(trimmed);
                }
            }
        }
        List<Map<String, Object>> actions = new List<Map<String, Object>>();
        addAction(actions, 'primary', card.Primary_Action_Type__c, card.Primary_Action_Label__c, card.Primary_Action_Value__c);
        addAction(actions, 'secondary', card.Secondary_Action_Type__c, card.Secondary_Action_Label__c, card.Secondary_Action_Value__c);
        return new Map<String, Object>{
            'v' => 1,
            'id' => card.Id,
            'type' => cardType(card.Type__c),
            'size' => cardSizeOf(card),
            'title' => card.Title__c,
            'subtitle' => card.Subtitle__c,
            'text' => String.join(paragraphs, '\n'),
            'bullets' => bullets,
            'imageUrl' => safeUrl(card.Image_URL__c),
            'priceLabel' => card.Price_Label__c,
            'badge' => card.Badge__c,
            'productName' => card.Product__c == null ? null : card.Product__r?.Name,
            'actions' => actions
        };
    }

    private static String cardType(String type) {
        switch on type {
            when 'Self_Service' {
                return 'self_service';
            }
            when 'Article' {
                return 'article';
            }
            when 'Offer' {
                return 'offer';
            }
            when else {
                return 'product';
            }
        }
    }

    private static void addAction(List<Map<String, Object>> actions, String role, String type, String label, String value) {
        if (String.isBlank(type) || String.isBlank(label)) {
            return;
        }
        String kind;
        String target = value == null ? '' : value.trim();
        switch on type {
            when 'Open_URL' {
                kind = 'open_url';
                target = safeUrl(target);
            }
            when 'Send_Message' {
                kind = 'send_message';
                target = String.isBlank(target) ? label : target;
            }
            when 'Launch_Flow' {
                kind = 'launch_flow';
                target = Pattern.matches('[A-Za-z][A-Za-z0-9_]{0,79}', target) ? target : null;
            }
        }
        if (kind == null || String.isBlank(target)) {
            return;
        }
        actions.add(new Map<String, Object>{ 'role' => role, 'kind' => kind, 'label' => label, 'value' => target });
    }

    // Only https URLs and site-relative paths reach the browser.
    public static String safeUrl(String url) {
        if (String.isBlank(url)) {
            return null;
        }
        String trimmed = url.trim();
        if (trimmed.startsWithIgnoreCase('https://') || (trimmed.startsWith('/') && !trimmed.startsWith('//'))) {
            return trimmed;
        }
        return null;
    }
}
