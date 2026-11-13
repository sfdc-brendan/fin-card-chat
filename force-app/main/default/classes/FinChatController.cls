/**
 * Apex entry points for the finCardChat LWC on Experience Cloud sites, including guest visitors.
 * The browser only ever holds a random session token; conversations are looked up by its SHA-256 hash,
 * and no method accepts object names, field names, or record IDs from the browser.
 */
public without sharing class FinChatController {
    public static final Integer MAX_TEXT = 2000;
    public static final Integer TURN_TIMEOUT_SECONDS = 45;
    private static final Set<String> PENDING = new Set<String>{ 'pending_start', 'pending_reply' };
    private static final Set<String> IN_FLIGHT = new Set<String>{ 'pending_start', 'pending_reply', 'thinking', 'replying' };
    private static final Set<String> TURN_ENDED = new Set<String>{ 'awaiting_user_reply', 'complete', 'escalated', 'resolved', 'error' };

    /** Records the visitor's message and opens a turn. The Fin callout happens in deliver(). */
    @AuraEnabled
    public static Map<String, Object> sendMessage(String token, String text) {
        String question = text == null ? '' : text.trim();
        if (question == '') {
            throw fail('Type a question first.');
        }
        if (question.length() > MAX_TEXT) {
            throw fail('Messages are limited to 2,000 characters.');
        }
        Fin_Chat_Conversation__c conversation;
        String sessionToken = token;
        if (String.isBlank(token)) {
            sessionToken = EncodingUtil.convertToHex(Crypto.generateAesKey(256));
            conversation = new Fin_Chat_Conversation__c(
                Fin_Conversation_Id__c = FinAgentClient.newConversationId(),
                Session_Token_Hash__c = hash(sessionToken),
                Last_Seq__c = 0,
                Fin_Started__c = false
            );
            insert as system conversation;
        } else {
            conversation = find(token, true);
            if (IN_FLIGHT.contains(conversation.Status__c) && !timedOut(conversation)) {
                throw fail('Fin is still answering your last message.');
            }
        }
        Integer seq = Integer.valueOf(conversation.Last_Seq__c == null ? 0 : conversation.Last_Seq__c) + 1;
        insert as system new Fin_Chat_Message__c(
            Conversation__c = conversation.Id,
            Author__c = 'user',
            Body__c = question.escapeHtml4(),
            Fin_Message_Id__c = conversation.Fin_Conversation_Id__c + ':user:' + seq,
            Seq__c = seq
        );
        conversation.Last_Seq__c = seq;
        conversation.Last_User_Text__c = question;
        conversation.Status__c = conversation.Fin_Started__c ? 'pending_reply' : 'pending_start';
        conversation.Status_Reason__c = null;
        conversation.Turn_Started__c = Datetime.now();
        update as system conversation;
        return new Map<String, Object>{ 'token' => sessionToken, 'seq' => seq };
    }

    /** Sends the pending message to Fin. Kept separate from sendMessage because a callout cannot follow uncommitted DML. */
    @AuraEnabled
    public static Map<String, Object> deliver(String token) {
        Fin_Chat_Conversation__c conversation = find(token, false);
        if (!PENDING.contains(conversation.Status__c)) {
            return new Map<String, Object>{ 'status' => conversation.Status__c };
        }
        Boolean starting = conversation.Status__c == 'pending_start';
        String visitorId = visitorId(conversation);
        String failure;
        try {
            if (starting) {
                FinAgentClient.start(conversation.Fin_Conversation_Id__c, visitorId, conversation.Last_User_Text__c);
            } else {
                FinAgentClient.reply(conversation.Fin_Conversation_Id__c, visitorId, conversation.Last_User_Text__c);
            }
        } catch (FinAgentClient.FinAgentException e) {
            failure = e.getMessage();
        }
        Fin_Chat_Conversation__c locked = find(token, true);
        if (failure != null) {
            locked.Status__c = 'error';
            locked.Status_Reason__c = failure.left(255);
        } else {
            locked.Fin_Started__c = true;
            if (PENDING.contains(locked.Status__c)) {
                locked.Status__c = 'thinking';
            }
        }
        update as system locked;
        return new Map<String, Object>{ 'status' => locked.Status__c, 'reason' => locked.Status_Reason__c };
    }

    /** Returns Fin messages after afterSeq, each with its matched cards, plus whether the turn has ended. */
    @AuraEnabled
    public static Map<String, Object> getTurn(String token, Integer afterSeq) {
        Fin_Chat_Conversation__c conversation = find(token, false);
        Integer after = afterSeq == null ? 0 : afterSeq;
        List<Fin_Chat_Message__c> rows = [
            SELECT Seq__c, Body__c, Sources_JSON__c, Card_Ids__c, Sent_At__c
            FROM Fin_Chat_Message__c
            WHERE Conversation__c = :conversation.Id AND Author__c = 'fin' AND Seq__c > :after
            WITH SYSTEM_MODE
            ORDER BY Seq__c
            LIMIT 50
        ];
        Set<Id> cardIds = new Set<Id>();
        for (Fin_Chat_Message__c row : rows) {
            cardIds.addAll(FinWebhookResource.idSet(row.Card_Ids__c));
        }
        Map<Id, Fin_UI_Card__c> cards = new Map<Id, Fin_UI_Card__c>(
            [
                SELECT Id, Name, Type__c, Card_Size__c, Title__c, Subtitle__c, Body__c, Image_URL__c, Price_Label__c, Badge__c,
                    Product__c, Product__r.Name, Primary_Action_Type__c, Primary_Action_Label__c, Primary_Action_Value__c,
                    Secondary_Action_Type__c, Secondary_Action_Label__c, Secondary_Action_Value__c
                FROM Fin_UI_Card__c
                WHERE Id IN :cardIds
                WITH SYSTEM_MODE
            ]
        );
        List<Map<String, Object>> messages = new List<Map<String, Object>>();
        for (Fin_Chat_Message__c row : rows) {
            List<Map<String, Object>> rowCards = new List<Map<String, Object>>();
            for (String id : String.isBlank(row.Card_Ids__c) ? new List<String>() : row.Card_Ids__c.split(',')) {
                Fin_UI_Card__c card = cards.get(id);
                if (card != null) {
                    rowCards.add(FinCardMatcher.toCard(card));
                }
            }
            messages.add(
                new Map<String, Object>{
                    'seq' => Integer.valueOf(row.Seq__c),
                    'sentAt' => row.Sent_At__c == null ? null : row.Sent_At__c.getTime(),
                    'html' => row.Body__c,
                    'sources' => String.isBlank(row.Sources_JSON__c) ? new List<Object>() : JSON.deserializeUntyped(row.Sources_JSON__c),
                    'cards' => rowCards
                }
            );
        }
        String status = conversation.Status__c;
        Boolean done = TURN_ENDED.contains(status);
        if (!done && IN_FLIGHT.contains(status) && timedOut(conversation)) {
            status = 'timeout';
            done = true;
        }
        return new Map<String, Object>{
            'cardSize' => FinCardMatcher.cardSize(),
            'status' => status,
            'reason' => conversation.Status_Reason__c,
            'done' => done,
            'lastSeq' => Integer.valueOf(conversation.Last_Seq__c == null ? 0 : conversation.Last_Seq__c),
            'messages' => messages
        };
    }

    private static Boolean timedOut(Fin_Chat_Conversation__c conversation) {
        return conversation.Turn_Started__c != null && conversation.Turn_Started__c.addSeconds(TURN_TIMEOUT_SECONDS) < Datetime.now();
    }

    private static Fin_Chat_Conversation__c find(String token, Boolean forUpdate) {
        if (String.isBlank(token) || !Pattern.matches('[a-f0-9]{64}', token)) {
            throw fail('This chat has expired. Start a new one.');
        }
        String tokenHash = hash(token);
        List<Fin_Chat_Conversation__c> found = forUpdate
            ? [
                  SELECT Id, Fin_Conversation_Id__c, Session_Token_Hash__c, Status__c, Status_Reason__c, Last_Seq__c,
                      Last_User_Text__c, Turn_Started__c, Fin_Started__c
                  FROM Fin_Chat_Conversation__c
                  WHERE Session_Token_Hash__c = :tokenHash
                  WITH SYSTEM_MODE
                  LIMIT 1
                  FOR UPDATE
              ]
            : [
                  SELECT Id, Fin_Conversation_Id__c, Session_Token_Hash__c, Status__c, Status_Reason__c, Last_Seq__c,
                      Last_User_Text__c, Turn_Started__c, Fin_Started__c
                  FROM Fin_Chat_Conversation__c
                  WHERE Session_Token_Hash__c = :tokenHash
                  WITH SYSTEM_MODE
                  LIMIT 1
              ];
        if (found.isEmpty()) {
            throw fail('This chat has expired. Start a new one.');
        }
        return found[0];
    }

    private static String visitorId(Fin_Chat_Conversation__c conversation) {
        if (UserInfo.getUserType() == 'Guest') {
            return 'sf-exp-visitor-' + conversation.Session_Token_Hash__c.left(32);
        }
        return 'sf-user-' + UserInfo.getUserId();
    }

    public static String hash(String token) {
        return EncodingUtil.convertToHex(Crypto.generateDigest('SHA-256', Blob.valueOf(token)));
    }

    private static AuraHandledException fail(String message) {
        AuraHandledException e = new AuraHandledException(message);
        e.setMessage(message);
        return e;
    }
}
