/**
 * Receives Fin Agent API webhooks on the Experience site (guest access) and stores Fin's replies
 * for Experience Cloud chats. Events for conversations this org did not start are acknowledged and ignored.
 */
@RestResource(urlMapping='/fin/webhook')
global without sharing class FinWebhookResource {
    public static final String SIGNATURE_HEADER = 'X-Fin-Agent-API-Webhook-Signature';
    private static final Set<String> IN_FLIGHT = new Set<String>{ 'pending_start', 'pending_reply', 'thinking' };

    @TestVisible
    private static String secretOverride;

    @HttpPost
    global static void receive() {
        RestRequest request = RestContext.request;
        RestResponse response = RestContext.response;
        response.addHeader('Content-Type', 'application/json');
        Blob raw = request.requestBody == null ? Blob.valueOf('') : request.requestBody;
        if (!verify(raw, header(request, SIGNATURE_HEADER), secret())) {
            response.statusCode = 401;
            response.responseBody = Blob.valueOf('{"error":"Invalid webhook signature."}');
            return;
        }
        Map<String, Object> event;
        try {
            event = (Map<String, Object>) JSON.deserializeUntyped(raw.toString());
        } catch (Exception e) {
            response.statusCode = 400;
            response.responseBody = Blob.valueOf('{"error":"Invalid JSON."}');
            return;
        }
        apply(event, EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256', raw)));
        response.responseBody = Blob.valueOf('{"received":true}');
    }

    private static String secret() {
        if (secretOverride != null) {
            return secretOverride;
        }
        return Fin_Agent_Settings__c.getOrgDefaults()?.Webhook_Secret__c;
    }

    private static String header(RestRequest request, String name) {
        for (String key : request.headers.keySet()) {
            if (key.equalsIgnoreCase(name)) {
                return request.headers.get(key);
            }
        }
        return null;
    }

    public static Boolean verify(Blob raw, String signature, String secret) {
        if (String.isBlank(secret) || String.isBlank(signature)) {
            return false;
        }
        String actual = signature.trim().removeStartIgnoreCase('sha256=').toLowerCase();
        if (!Pattern.matches('[a-f0-9]{64}', actual)) {
            return false;
        }
        String expected = EncodingUtil.convertToHex(Crypto.generateMac('hmacSHA256', raw, Blob.valueOf(secret)));
        Integer diff = 0;
        for (Integer i = 0; i < 64; i++) {
            diff |= expected.charAt(i) ^ actual.charAt(i);
        }
        return diff == 0;
    }

    public static void apply(Map<String, Object> event, String rawHash) {
        String conversationId = (String) event.get('conversation_id');
        String name = (String) event.get('event_name');
        if (conversationId == null || !conversationId.startsWith(FinAgentClient.CONVERSATION_PREFIX)) {
            return;
        }
        if (name != 'fin_replied' && name != 'fin_status_updated') {
            return;
        }
        List<Fin_Chat_Conversation__c> found = [
            SELECT Id, Fin_Conversation_Id__c, Status__c, Last_Seq__c, Last_User_Text__c, Shown_Card_Ids__c
            FROM Fin_Chat_Conversation__c
            WHERE Fin_Conversation_Id__c = :conversationId
            WITH SYSTEM_MODE
            LIMIT 1
            FOR UPDATE
        ];
        if (found.isEmpty()) {
            return;
        }
        Fin_Chat_Conversation__c conversation = found[0];
        if (name == 'fin_replied') {
            storeReply(conversation, (Map<String, Object>) event.get('message'), rawHash);
        } else if (event.get('status') != null) {
            conversation.Status__c = String.valueOf(event.get('status')).left(40);
            Object reason = event.get('reason');
            conversation.Status_Reason__c = reason == null ? null : String.valueOf(reason).left(255);
            update as system conversation;
        }
    }

    private static void storeReply(Fin_Chat_Conversation__c conversation, Map<String, Object> message, String rawHash) {
        if (message == null) {
            return;
        }
        Object messageId = message.get('id');
        String key = conversation.Fin_Conversation_Id__c + ':' + (messageId == null ? rawHash : String.valueOf(messageId));
        key = key.left(160);
        if (![SELECT Id FROM Fin_Chat_Message__c WHERE Fin_Message_Id__c = :key WITH SYSTEM_MODE LIMIT 1].isEmpty()) {
            return;
        }
        String html = bodyHtml(message);
        List<Map<String, Object>> sources = sources(message.get('sources'));
        List<String> urls = new List<String>();
        for (Map<String, Object> source : sources) {
            urls.add((String) source.get('url'));
        }
        Set<Id> shown = idSet(conversation.Shown_Card_Ids__c);
        List<String> cardIds = new List<String>();
        for (FinCardMatcher.Match m : FinCardMatcher.match(conversation.Last_User_Text__c, html, urls, FinCardMatcher.maxCardsPerTurn(), shown)) {
            cardIds.add(m.card.Id);
            shown.add(m.card.Id);
        }
        Integer seq = Integer.valueOf(conversation.Last_Seq__c == null ? 0 : conversation.Last_Seq__c) + 1;
        try {
            insert as system new Fin_Chat_Message__c(
                Conversation__c = conversation.Id,
                Author__c = 'fin',
                Body__c = html.left(32768),
                Sources_JSON__c = JSON.serialize(sources).left(32768),
                Fin_Message_Id__c = key,
                Seq__c = seq,
                Sent_At__c = sentAt(message.get('timestamp_ms')),
                Card_Ids__c = String.join(cardIds, ',')
            );
        } catch (DmlException e) {
            if (e.getDmlType(0) == StatusCode.DUPLICATE_VALUE) {
                return;
            }
            throw e;
        }
        conversation.Last_Seq__c = seq;
        conversation.Shown_Card_Ids__c = String.join(new List<Id>(shown), ',').left(4000);
        if (IN_FLIGHT.contains(conversation.Status__c)) {
            conversation.Status__c = 'replying';
        }
        update as system conversation;
    }

    // Fin sends timestamp_ms as an ISO 8601 string or epoch milliseconds.
    public static Datetime sentAt(Object raw) {
        if (raw instanceof Long || raw instanceof Integer) {
            return Datetime.newInstance((Long) raw);
        }
        if (raw instanceof String) {
            try {
                return (Datetime) JSON.deserialize('"' + ((String) raw).replace('"', '') + '"', Datetime.class);
            } catch (Exception e) {
                return Datetime.now();
            }
        }
        return Datetime.now();
    }

    public static String bodyHtml(Map<String, Object> message) {
        String body = message.get('body') == null ? '' : String.valueOf(message.get('body'));
        if (message.get('format') == 'markdown' || !body.contains('<')) {
            return body.trim().escapeHtml4().replace('\n', '<br>');
        }
        return body.trim();
    }

    public static List<Map<String, Object>> sources(Object raw) {
        List<Map<String, Object>> result = new List<Map<String, Object>>();
        if (!(raw instanceof List<Object>)) {
            return result;
        }
        Set<String> seen = new Set<String>();
        for (Object item : (List<Object>) raw) {
            if (!(item instanceof Map<String, Object>)) {
                continue;
            }
            Map<String, Object> source = (Map<String, Object>) item;
            String url = source.get('url') == null ? '' : String.valueOf(source.get('url'));
            if (!url.startsWithIgnoreCase('https://') || seen.contains(url)) {
                continue;
            }
            seen.add(url);
            String title = source.get('title') == null ? url : String.valueOf(source.get('title'));
            result.add(new Map<String, Object>{ 'title' => title.left(200), 'url' => url });
        }
        return result;
    }

    public static Set<Id> idSet(String csv) {
        Set<Id> ids = new Set<Id>();
        if (String.isBlank(csv)) {
            return ids;
        }
        for (String part : csv.split(',')) {
            try {
                ids.add(Id.valueOf(part.trim()));
            } catch (StringException e) {
                continue;
            }
        }
        return ids;
    }
}
