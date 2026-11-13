/**
 * Calls the Fin Agent API through the Fin_Agent_API named credential.
 * Fin acknowledges /fin/start and /fin/reply immediately; its answers arrive later on the webhook.
 */
public with sharing class FinAgentClient {
    public static final String API_VERSION = '2.16';
    public static final String CONVERSATION_PREFIX = 'sf-exp-';

    public class FinAgentException extends Exception {
    }

    public static String newConversationId() {
        return CONVERSATION_PREFIX + UUID.randomUUID().toString();
    }

    public static void start(String conversationId, String userId, String text) {
        Map<String, Object> payload = payload(conversationId, userId, text);
        String environment = Fin_Agent_Settings__c.getOrgDefaults()?.Environment__c;
        if (String.isNotBlank(environment)) {
            payload.put('environment', environment);
        }
        post('/fin/start', payload);
    }

    public static void reply(String conversationId, String userId, String text) {
        post('/fin/reply', payload(conversationId, userId, text));
    }

    private static Map<String, Object> payload(String conversationId, String userId, String text) {
        return new Map<String, Object>{
            'conversation_id' => conversationId,
            'user' => new Map<String, Object>{ 'id' => userId, 'name' => 'Experience site visitor' },
            'message' => new Map<String, Object>{
                'author' => 'user',
                'body' => text,
                'timestamp' => Datetime.now().formatGmt('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'')
            }
        };
    }

    private static void post(String endpoint, Map<String, Object> payload) {
        HttpRequest request = new HttpRequest();
        request.setEndpoint('callout:Fin_Agent_API' + endpoint);
        request.setMethod('POST');
        request.setHeader('Content-Type', 'application/json');
        request.setHeader('Accept', 'application/json');
        request.setHeader('Intercom-Version', API_VERSION);
        request.setTimeout(20000);
        request.setBody(JSON.serialize(payload));
        HttpResponse response;
        try {
            response = new Http().send(request);
        } catch (CalloutException e) {
            throw new FinAgentException('Fin did not acknowledge the message. Please try again.');
        }
        if (response.getStatusCode() < 200 || response.getStatusCode() >= 300) {
            throw new FinAgentException('Fin rejected the request (HTTP ' + response.getStatusCode() + ').');
        }
    }
}
