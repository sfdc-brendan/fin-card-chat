@IsTest
private class FinChatTest {
    private static final String SECRET = 'test-webhook-secret';

    private class StarterSet implements Callable {
        public Object call(String action, Map<String, Object> args) {
            return action == 'seed' ? 3 : null;
        }
    }

    private class FinMock implements HttpCalloutMock {
        Integer status;
        List<HttpRequest> requests = new List<HttpRequest>();
        FinMock(Integer status) {
            this.status = status;
        }
        public HttpResponse respond(HttpRequest request) {
            requests.add(request);
            HttpResponse response = new HttpResponse();
            response.setStatusCode(status);
            response.setBody('{}');
            return response;
        }
    }

    @TestSetup
    static void setup() {
        insert as system new Fin_UI_Card__c(
            Name = 'Mesh',
            Type__c = 'Product',
            Title__c = 'Orbit 7',
            Trigger_Keywords__c = 'mesh',
            Match_On__c = 'Both',
            Primary_Action_Type__c = 'Open_URL',
            Primary_Action_Label__c = 'View',
            Primary_Action_Value__c = 'https://example.com/orbit'
        );
    }

    static Fin_Chat_Conversation__c conversation() {
        return [
            SELECT Id, Fin_Conversation_Id__c, Status__c, Status_Reason__c, Fin_Started__c, Last_Seq__c, Shown_Card_Ids__c, Turn_Started__c
            FROM Fin_Chat_Conversation__c
            WITH SYSTEM_MODE
            LIMIT 1
        ];
    }

    static void webhook(Map<String, Object> event, String signatureOverride) {
        Blob raw = Blob.valueOf(JSON.serialize(event));
        RestRequest request = new RestRequest();
        request.requestURI = '/services/apexrest/fin/webhook';
        request.httpMethod = 'POST';
        request.requestBody = raw;
        request.headers.put(
            'x-fin-agent-api-webhook-signature',
            signatureOverride != null ? signatureOverride : 'sha256=' + EncodingUtil.convertToHex(Crypto.generateMac('hmacSHA256', raw, Blob.valueOf(SECRET)))
        );
        RestContext.request = request;
        RestContext.response = new RestResponse();
        FinWebhookResource.secretOverride = SECRET;
        FinWebhookResource.receive();
    }

    static Map<String, Object> replied(String conversationId, String id, String body) {
        return new Map<String, Object>{
            'event_name' => 'fin_replied',
            'conversation_id' => conversationId,
            'status' => 'replying',
            'message' => new Map<String, Object>{
                'id' => id,
                'author' => 'fin',
                'body' => body,
                'timestamp_ms' => '2026-11-12T15:10:42.180Z',
                'sources' => new List<Object>{
                    new Map<String, Object>{ 'title' => 'Orbit 7', 'url' => 'https://kb.example/product-orbit-7.html' },
                    new Map<String, Object>{ 'title' => 'Bad', 'url' => 'javascript:alert(1)' }
                }
            }
        };
    }

    static Map<String, Object> statusEvent(String conversationId, String status) {
        return new Map<String, Object>{ 'event_name' => 'fin_status_updated', 'conversation_id' => conversationId, 'status' => status, 'reason' => 'done' };
    }

    @IsTest
    static void fullTurnStoresFinRepliesWithCards() {
        FinMock mock = new FinMock(200);
        Test.setMock(HttpCalloutMock.class, mock);
        Map<String, Object> sent = FinChatController.sendMessage(null, 'Do you sell a mesh system?');
        String token = (String) sent.get('token');
        Assert.areEqual(64, token.length());
        Assert.areEqual(1, sent.get('seq'));
        Test.startTest();
        Map<String, Object> delivered = FinChatController.deliver(token);
        Test.stopTest();

        Assert.areEqual('thinking', delivered.get('status'));
        Assert.areEqual(1, mock.requests.size());
        HttpRequest call = mock.requests[0];
        Assert.areEqual('callout:Fin_Agent_API/fin/start', call.getEndpoint());
        Assert.areEqual(FinAgentClient.API_VERSION, call.getHeader('Intercom-Version'));
        Map<String, Object> payload = (Map<String, Object>) JSON.deserializeUntyped(call.getBody());
        Fin_Chat_Conversation__c conversation = conversation();
        Assert.areEqual(conversation.Fin_Conversation_Id__c, payload.get('conversation_id'));
        Assert.isTrue(conversation.Fin_Started__c);

        Map<String, Object> turn = FinChatController.getTurn(token, 1);
        Assert.isFalse((Boolean) turn.get('done'));

        webhook(replied(conversation.Fin_Conversation_Id__c, 'm1', '<p>Yes, the <b>Orbit 7</b>.</p>'), null);
        webhook(replied(conversation.Fin_Conversation_Id__c, 'm1', '<p>duplicate</p>'), null);
        webhook(statusEvent(conversation.Fin_Conversation_Id__c, 'awaiting_user_reply'), null);
        Assert.areEqual(200, RestContext.response.statusCode == null ? 200 : RestContext.response.statusCode);

        turn = FinChatController.getTurn(token, 1);
        Assert.isTrue((Boolean) turn.get('done'));
        Assert.areEqual('awaiting_user_reply', turn.get('status'));
        Assert.areEqual(FinCardMatcher.SIZE_STANDARD, turn.get('cardSize'));
        List<Object> messages = (List<Object>) turn.get('messages');
        Assert.areEqual(1, messages.size(), 'Redelivered webhook is ignored');
        Map<String, Object> message = (Map<String, Object>) messages[0];
        Assert.areEqual(2, message.get('seq'));
        Assert.isNotNull(message.get('sentAt'));
        Assert.areEqual(1, ((List<Object>) message.get('sources')).size(), 'Non-https sources are dropped');
        List<Object> cards = (List<Object>) message.get('cards');
        Assert.areEqual(1, cards.size());
        Assert.areEqual('Orbit 7', ((Map<String, Object>) cards[0]).get('title'));
    }

    @IsTest
    static void followUpUsesReplyAndCardsAppearOnce() {
        String token = (String) FinChatController.sendMessage(null, 'mesh please').get('token');
        Fin_Chat_Conversation__c started = conversation();
        started.Fin_Started__c = true;
        started.Status__c = 'thinking';
        update as system started;
        String id = started.Fin_Conversation_Id__c;
        webhook(replied(id, 'm1', 'Orbit 7 is our mesh system.'), null);
        webhook(statusEvent(id, 'awaiting_user_reply'), null);

        FinMock mock = new FinMock(200);
        Test.setMock(HttpCalloutMock.class, mock);
        Map<String, Object> sent = FinChatController.sendMessage(token, 'More about mesh?');
        Test.startTest();
        FinChatController.deliver(token);
        Test.stopTest();
        Assert.areEqual(3, sent.get('seq'));
        Assert.areEqual('callout:Fin_Agent_API/fin/reply', mock.requests[0].getEndpoint());

        webhook(replied(id, 'm2', 'Plain text mesh answer\nwith a line break'), null);
        Map<String, Object> turn = FinChatController.getTurn(token, 3);
        Map<String, Object> message = (Map<String, Object>) ((List<Object>) turn.get('messages'))[0];
        Assert.areEqual(0, ((List<Object>) message.get('cards')).size(), 'The mesh card was already shown');
        Assert.areEqual('Plain text mesh answer<br>with a line break', message.get('html'));
    }

    @IsTest
    static void rejectsBusyEmptyLongAndUnknownSessions() {
        Test.setMock(HttpCalloutMock.class, new FinMock(200));
        String token = (String) FinChatController.sendMessage(null, 'hello').get('token');
        assertFails('Fin is still answering your last message.', token, 'again');
        assertFails('Type a question first.', token, '   ');
        assertFails('Messages are limited to 2,000 characters.', token, 'x'.repeat(2001));
        assertFails('This chat has expired. Start a new one.', 'not-a-token', 'hi');
        assertFails('This chat has expired. Start a new one.', 'a'.repeat(64), 'hi');
    }

    static void assertFails(String expected, String token, String text) {
        try {
            FinChatController.sendMessage(token, text);
            Assert.fail('Expected an error');
        } catch (AuraHandledException e) {
            Assert.areEqual(expected, e.getMessage());
        }
    }

    @IsTest
    static void finFailureEndsTheTurnWithAnError() {
        Test.setMock(HttpCalloutMock.class, new FinMock(500));
        String token = (String) FinChatController.sendMessage(null, 'hello').get('token');
        Test.startTest();
        Map<String, Object> delivered = FinChatController.deliver(token);
        Test.stopTest();
        Assert.areEqual('error', delivered.get('status'));
        Assert.isFalse(conversation().Fin_Started__c);
        Map<String, Object> turn = FinChatController.getTurn(token, 0);
        Assert.isTrue((Boolean) turn.get('done'));
        Assert.areEqual('Fin rejected the request (HTTP 500).', turn.get('reason'));
        Assert.areEqual('error', FinChatController.deliver(token).get('status'), 'Nothing pending, so no second callout');
    }

    @IsTest
    static void staleTurnsTimeOut() {
        Test.setMock(HttpCalloutMock.class, new FinMock(200));
        String token = (String) FinChatController.sendMessage(null, 'hello').get('token');
        Fin_Chat_Conversation__c conversation = conversation();
        conversation.Turn_Started__c = Datetime.now().addMinutes(-5);
        update as system conversation;
        Map<String, Object> turn = FinChatController.getTurn(token, 0);
        Assert.areEqual('timeout', turn.get('status'));
        Assert.isTrue((Boolean) turn.get('done'));
        Assert.areEqual(2, FinChatController.sendMessage(token, 'still there?').get('seq'), 'A timed-out turn does not block the visitor');
    }

    @IsTest
    static void webhookRejectsBadSignaturesAndJson() {
        webhook(statusEvent('sf-exp-x', 'complete'), 'sha256=' + '0'.repeat(64));
        Assert.areEqual(401, RestContext.response.statusCode);
        webhook(statusEvent('sf-exp-x', 'complete'), 'nope');
        Assert.areEqual(401, RestContext.response.statusCode);

        Blob raw = Blob.valueOf('not json');
        RestRequest request = new RestRequest();
        request.requestBody = raw;
        request.headers.put(FinWebhookResource.SIGNATURE_HEADER, EncodingUtil.convertToHex(Crypto.generateMac('hmacSHA256', raw, Blob.valueOf(SECRET))));
        RestContext.request = request;
        RestContext.response = new RestResponse();
        FinWebhookResource.receive();
        Assert.areEqual(400, RestContext.response.statusCode);
        Assert.isFalse(FinWebhookResource.verify(raw, 'sha256=abc', null));
    }

    @IsTest
    static void webhookIgnoresOtherConversations() {
        webhook(statusEvent('other-site-123', 'complete'), null);
        webhook(statusEvent('sf-exp-unknown', 'complete'), null);
        webhook(new Map<String, Object>{ 'event_name' => 'csat_requested', 'conversation_id' => 'sf-exp-unknown' }, null);
        Assert.areEqual(0, [SELECT COUNT() FROM Fin_Chat_Message__c WITH SYSTEM_MODE]);
        Assert.areEqual(1, FinWebhookResource.idSet('bad,' + UserInfo.getUserId()).size());
    }

    @IsTest
    static void parsesFinTimestamps() {
        Assert.areEqual(Datetime.newInstanceGmt(2026, 11, 12, 15, 10, 42).getTime() + 180, FinWebhookResource.sentAt('2026-11-12T15:10:42.180Z').getTime());
        Assert.areEqual(1700000000000L, FinWebhookResource.sentAt(1700000000000L).getTime());
        Assert.isNotNull(FinWebhookResource.sentAt('not a date'));
        Assert.isNotNull(FinWebhookResource.sentAt(null));
    }

    @IsTest
    static void studioMatchAndSeed() {
        RestRequest request = new RestRequest();
        request.requestURI = '/services/apexrest/fincards/match';
        request.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{ 'userText' => 'mesh', 'finText' => '', 'sourceUrls' => new List<Object>{ 'https://x' } }));
        RestContext.request = request;
        RestContext.response = new RestResponse();
        FinCardStudioResource.post();
        Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(RestContext.response.responseBody.toString());
        Assert.areEqual(1, ((List<Object>) result.get('matches')).size());

        User studioUser = new User(Id = UserInfo.getUserId());
        System.runAs(studioUser) {
            if ([SELECT COUNT() FROM PermissionSetAssignment WHERE AssigneeId = :studioUser.Id AND PermissionSet.Name = 'Fin_Card_Studio_Admin'] == 0) {
                insert new PermissionSetAssignment(
                    AssigneeId = studioUser.Id,
                    PermissionSetId = [SELECT Id FROM PermissionSet WHERE Name = 'Fin_Card_Studio_Admin'].Id
                );
            }
        }
        System.runAs(studioUser) {
            request.requestURI = '/services/apexrest/fincards/seed';
            request.requestBody = null;
            FinCardCatalog.providerName = 'No_Such_Catalog';
            FinCardStudioResource.post();
            Assert.areEqual(400, RestContext.response.statusCode, 'Seeding without a starter set explains itself');
            Assert.isTrue(RestContext.response.responseBody.toString().contains('sample-data/stargrid'));

            RestContext.response = new RestResponse();
            FinCardCatalog.providerOverride = new StarterSet();
            FinCardStudioResource.post();
            result = (Map<String, Object>) JSON.deserializeUntyped(RestContext.response.responseBody.toString());
            Assert.areEqual(3, result.get('created'), String.valueOf(result));
        }

        request.requestURI = '/services/apexrest/fincards/nope';
        FinCardStudioResource.post();
        Assert.areEqual(404, RestContext.response.statusCode);

        request.requestURI = '/services/apexrest/fincards/match';
        request.requestBody = Blob.valueOf('[1]');
        FinCardStudioResource.post();
        Assert.areEqual(400, RestContext.response.statusCode);
    }
}
